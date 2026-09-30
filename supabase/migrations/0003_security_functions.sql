-- =============================================================================
-- 0003 — RLS helper functions
-- =============================================================================
-- Every function below is SECURITY DEFINER on purpose. RLS policies that read
-- `memberships` from inside a `memberships` policy would recurse infinitely;
-- the standard solution is to read the membership through a definer function
-- owned by `postgres`, which bypasses RLS.
--
-- Hardening rules applied to all of them:
--   * `set search_path = ''`  — no search-path hijacking, every reference is
--     schema-qualified.
--   * `revoke execute ... from public` and an explicit `grant ... to
--     authenticated` — the helpers are not available to anonymous visitors.
--   * `stable` — the planner may call them once per statement.
--
-- The functions live in the `noctis` schema, which PostgREST does not expose,
-- so none of them is reachable as an HTTP RPC endpoint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- current_user_id
-- -----------------------------------------------------------------------------
create or replace function noctis.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

comment on function noctis.current_user_id() is
  'The signed-in user id, or null for anonymous requests.';

-- -----------------------------------------------------------------------------
-- is_org_member — does the caller hold an ACTIVE membership here?
-- -----------------------------------------------------------------------------
create or replace function noctis.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- -----------------------------------------------------------------------------
-- org_role — the caller's role key in this organization, or null
-- -----------------------------------------------------------------------------
create or replace function noctis.org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role_key
  from public.memberships m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- has_perm — permission check resolved through role_permissions
-- -----------------------------------------------------------------------------
create or replace function noctis.has_perm(p_org_id uuid, p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = (select r.id from public.roles r where r.key = m.role_key)
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and rp.permission_code = p_code
  );
$$;

comment on function noctis.has_perm(uuid, text) is
  'True when the caller holds an active membership in the organization whose role grants p_code.';

-- -----------------------------------------------------------------------------
-- shares_org_with_me — used to decide whose profile rows are readable
-- -----------------------------------------------------------------------------
create or replace function noctis.shares_org_with_me(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = p_user_id
      and theirs.status = 'active'
  );
$$;

-- -----------------------------------------------------------------------------
-- member_user_ids — the set of user ids in an organization
-- -----------------------------------------------------------------------------
create or replace function noctis.member_user_ids(p_org_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id
  from public.memberships m
  where m.organization_id = p_org_id
    and m.user_id is not null
    and m.status = 'active';
$$;

-- -----------------------------------------------------------------------------
-- touch_updated_at — generic updated_at stamp
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Explicit grants
-- -----------------------------------------------------------------------------
revoke all on function noctis.current_user_id() from public;
revoke all on function noctis.is_org_member(uuid) from public;
revoke all on function noctis.org_role(uuid) from public;
revoke all on function noctis.has_perm(uuid, text) from public;
revoke all on function noctis.shares_org_with_me(uuid) from public;
revoke all on function noctis.member_user_ids(uuid) from public;
revoke all on function public.touch_updated_at() from public;

grant execute on function noctis.current_user_id() to authenticated;
grant execute on function noctis.is_org_member(uuid) to authenticated;
grant execute on function noctis.org_role(uuid) to authenticated;
grant execute on function noctis.has_perm(uuid, text) to authenticated;
grant execute on function noctis.shares_org_with_me(uuid) to authenticated;
grant execute on function noctis.member_user_ids(uuid) to authenticated;
grant execute on function public.touch_updated_at() to authenticated;

grant all on all tables in schema public to postgres;
grant all on all functions in schema public to postgres;
