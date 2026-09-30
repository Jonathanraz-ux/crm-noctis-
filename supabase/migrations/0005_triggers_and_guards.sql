-- =============================================================================
-- 0005 — Triggers and guards
-- =============================================================================
-- RLS expresses "which rows". Triggers express "which changes". Both are
-- needed: a row-level policy cannot restrict a single column, so a user allowed
-- to update *their own* profile row would otherwise also be able to rewrite the
-- columns that matter.
--
-- The rules enforced here:
--   1. Sign-up creates a profile and nothing else. A new account is never
--      silently attached to a tenant, and is never granted authority.
--   2. Pending invitations are bound to the signed-in user by email address.
--   3. You cannot change your own role, your own status, or remove yourself.
--   4. Only an owner can create or promote another owner.
--   5. An organization always keeps at least one active owner.
--   6. Tenant and creator columns are immutable after insert.
--   7. Every write is recorded in audit_logs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal context flag
-- -----------------------------------------------------------------------------
create or replace function noctis.set_flag(p_name text, p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('noctis.' || p_name, case when p_value then 'on' else 'off' end, true);
end;
$$;

create or replace function noctis.flag(p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('noctis.' || p_name, true), 'off') = 'on';
$$;

revoke all on function noctis.set_flag(text, boolean) from public, anon, authenticated;
revoke all on function noctis.flag(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. Sign-up: create a profile, and claim any invitation addressed to it
-- -----------------------------------------------------------------------------
create or replace function public.claim_pending_invites(p_user uuid, p_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed integer := 0;
begin
  if p_user is null or coalesce(p_email, '') = '' then
    return 0;
  end if;

  perform noctis.set_flag('invite_claim', true);

  update public.memberships m
  set user_id    = p_user,
      status     = 'active',
      updated_at = now()
  where m.user_id is null
    and lower(m.email) = lower(p_email)
    and m.status = 'invited';

  get diagnostics v_claimed = row_count;

  perform noctis.set_flag('invite_claim', false);
  return v_claimed;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A profile only. No membership, no role, no tenant.
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(new.raw_user_meta_data ->> 'name', '')
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  perform public.claim_pending_invites(new.id, coalesce(new.email, ''));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.claim_pending_invites(uuid, text) from public;

-- -----------------------------------------------------------------------------
-- 2. claim_invites — for an already signed-in user
-- -----------------------------------------------------------------------------
create or replace function public.claim_invites()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select lower(coalesce(email, '')) into v_email
  from public.profiles
  where id = v_user;

  if v_email is null or v_email = '' then
    raise exception 'No email address on your profile.' using errcode = '42501';
  end if;

  v_count := public.claim_pending_invites(v_user, v_email);

  return jsonb_build_object('claimed', v_count);
end;
$$;

revoke all on function public.claim_invites() from public;
grant execute on function public.claim_invites() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. create_organization — tenant bootstrap
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_org_id  uuid;
  v_slug    text;
  v_base    text;
  v_email   text;
  v_counter integer := 0;
begin
  if v_user is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Please choose a name of at least 2 characters.' using errcode = '22023';
  end if;

  -- Derive a URL-safe slug from the name, then de-duplicate it.
  v_base := regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if char_length(v_base) < 2 then
    v_base := 'workspace';
  end if;
  v_base := left(v_base, 28);

  v_slug := v_base;
  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_counter := v_counter + 1;
    v_slug := v_base || '-' || v_counter::text;
  end loop;

  select lower(coalesce(email, '')) into v_email
  from public.profiles
  where id = v_user;

  if v_email is null or v_email = '' then
    raise exception 'No email address on your profile.' using errcode = '42501';
  end if;

  perform noctis.set_flag('tenant_bootstrap', true);

  insert into public.organizations (name, slug, timezone, created_by)
  values (btrim(p_name), v_slug, coalesce(nullif(p_timezone, ''), 'UTC'), v_user)
  returning id into v_org_id;

  insert into public.memberships (organization_id, user_id, email, role_key, status, invited_by)
  values (v_org_id, v_user, v_email, 'owner', 'active', v_user);

  perform noctis.set_flag('tenant_bootstrap', false);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Guard profiles
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'A profile id cannot be changed.' using errcode = '42501';
  end if;

  if lower(new.email) <> lower(old.email) then
    raise exception 'The email address of a profile can only be changed through Supabase Auth.' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_profile_write on public.profiles;
create trigger guard_profile_write
  before update on public.profiles
  for each row execute function public.guard_profile_write();

-- -----------------------------------------------------------------------------
-- 5. Guard memberships
-- -----------------------------------------------------------------------------
create or replace function public.guard_membership_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller     uuid := auth.uid();
  v_caller_role text;
  v_bootstrap  boolean := coalesce(noctis.flag('tenant_bootstrap'), false);
  v_claim      boolean := coalesce(noctis.flag('invite_claim'), false);
begin
  ------------------------------------------------------------------ INSERT
  if tg_op = 'INSERT' then
    if not v_bootstrap then
      if new.role_key = 'owner'
         and noctis.org_role(new.organization_id) is distinct from 'owner' then
        raise exception 'Only an owner can add another owner.' using errcode = '42501';
      end if;

      if new.user_id is not null and not v_claim then
        if noctis.org_role(new.organization_id) is distinct from 'owner' then
          raise exception 'Only an owner can add an existing user directly.' using errcode = '42501';
        end if;
      end if;
    end if;

    new.updated_at := now();
    return new;
  end if;

  ------------------------------------------------------------------ DELETE
  if tg_op = 'DELETE' then
    if old.user_id is not null and old.user_id = v_caller and not v_bootstrap then
      raise exception 'You cannot remove your own membership. Ask another owner to do it.' using errcode = '42501';
    end if;

    if old.role_key = 'owner' and old.status = 'active' and not exists (
      select 1
      from public.memberships m
      where m.organization_id = old.organization_id
        and m.role_key = 'owner'
        and m.status = 'active'
        and m.id <> old.id
    ) then
      raise exception 'An organization must keep at least one active owner. Promote someone else first.' using errcode = '42501';
    end if;

    return old;
  end if;

  ------------------------------------------------------------------ UPDATE
  if new.organization_id <> old.organization_id then
    raise exception 'A membership cannot be moved to another organization.' using errcode = '42501';
  end if;

  if not (v_bootstrap or v_claim) then
    if old.user_id is not null and old.user_id = v_caller then
      raise exception 'You cannot change your own role or status. Ask an owner or administrator.' using errcode = '42501';
    end if;

    if new.role_key is distinct from old.role_key then
      v_caller_role := noctis.org_role(new.organization_id);
      if v_caller_role not in ('owner', 'admin') then
        raise exception 'Only owners and administrators can change roles.' using errcode = '42501';
      end if;
      if new.role_key = 'owner' and v_caller_role <> 'owner' then
        raise exception 'Only an owner can promote someone to owner.' using errcode = '42501';
      end if;
    end if;

    if new.user_id is distinct from old.user_id then
      if noctis.org_role(new.organization_id) <> 'owner' then
        raise exception 'Only an owner can bind or unbind a user on a membership.' using errcode = '42501';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_membership_write on public.memberships;
create trigger guard_membership_write
  before insert or update or delete on public.memberships
  for each row execute function public.guard_membership_write();

-- -----------------------------------------------------------------------------
-- 6. Guard CRM records (prospects, contacts, deals, tasks, notes)
-- -----------------------------------------------------------------------------
create or replace function public.guard_crm_record_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id then
      raise exception 'A record cannot be moved to another organization.' using errcode = '42501';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'The creator of a record cannot be changed.' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  new.created_by := auth.uid();
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := new.created_at;
  return new;
end;
$$;

drop trigger if exists guard_prospect_write on public.prospects;
create trigger guard_prospect_write
  before insert or update on public.prospects
  for each row execute function public.guard_crm_record_write();

drop trigger if exists guard_contact_write on public.contacts;
create trigger guard_contact_write
  before insert or update on public.contacts
  for each row execute function public.guard_crm_record_write();

drop trigger if exists guard_deal_write on public.deals;
create trigger guard_deal_write
  before insert or update on public.deals
  for each row execute function public.guard_crm_record_write();

drop trigger if exists guard_task_write on public.tasks;
create trigger guard_task_write
  before insert or update on public.tasks
  for each row execute function public.guard_crm_record_write();

drop trigger if exists guard_note_write on public.notes;
create trigger guard_note_write
  before insert or update on public.notes
  for each row execute function public.guard_crm_record_write();

-- -----------------------------------------------------------------------------
-- 7. Guard organizations
-- -----------------------------------------------------------------------------
create or replace function public.guard_organization_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if noctis.org_role(old.id) <> 'owner' then
      raise exception 'Only an owner can delete an organization.' using errcode = '42501';
    end if;
    return old;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_organization_write on public.organizations;
create trigger guard_organization_write
  before update or delete on public.organizations
  for each row execute function public.guard_organization_write();

create or replace function public.guard_organization_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.id         := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists guard_organization_identity on public.organizations;
create trigger guard_organization_identity
  before update on public.organizations
  for each row execute function public.guard_organization_identity();

-- -----------------------------------------------------------------------------
-- 8. Audit trail
-- -----------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new    jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_old    jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_row    jsonb := coalesce(v_new, v_old);
  v_org_id uuid;
  v_meta   jsonb;
begin
  v_org_id := nullif(v_row ->> 'organization_id', '')::uuid;
  if v_org_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if not exists (select 1 from public.organizations where id = v_org_id) then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  v_meta := jsonb_build_object('action', lower(tg_op));

  if tg_op = 'UPDATE' then
    v_meta := v_meta || jsonb_build_object(
      'changed', coalesce(
        (
          select jsonb_agg(k order by k)
          from jsonb_object_keys(v_new) as k
          where v_old -> k is distinct from v_new -> k
        ),
        '[]'::jsonb
      )
    );
  end if;

  insert into public.audit_logs
    (organization_id, actor_id, actor_email, action, entity, entity_id, metadata)
  values (
    v_org_id,
    auth.uid(),
    auth.jwt() ->> 'email',
    lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    v_meta
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists audit_organizations on public.organizations;
create trigger audit_organizations
  after insert or update or delete on public.organizations
  for each row execute function public.audit_row_change();

drop trigger if exists audit_memberships on public.memberships;
create trigger audit_memberships
  after insert or update or delete on public.memberships
  for each row execute function public.audit_row_change();

drop trigger if exists audit_prospects on public.prospects;
create trigger audit_prospects
  after insert or update or delete on public.prospects
  for each row execute function public.audit_row_change();

drop trigger if exists audit_contacts on public.contacts;
create trigger audit_contacts
  after insert or update or delete on public.contacts
  for each row execute function public.audit_row_change();

drop trigger if exists audit_deals on public.deals;
create trigger audit_deals
  after insert or update or delete on public.deals
  for each row execute function public.audit_row_change();

drop trigger if exists audit_tasks on public.tasks;
create trigger audit_tasks
  after insert or update or delete on public.tasks
  for each row execute function public.audit_row_change();

drop trigger if exists audit_notes on public.notes;
create trigger audit_notes
  after insert or update or delete on public.notes
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- 9. Grants
-- -----------------------------------------------------------------------------
revoke all on function public.guard_profile_write() from public;
revoke all on function public.guard_membership_write() from public;
revoke all on function public.guard_crm_record_write() from public;
revoke all on function public.guard_organization_write() from public;
revoke all on function public.guard_organization_identity() from public;
revoke all on function public.audit_row_change() from public;
