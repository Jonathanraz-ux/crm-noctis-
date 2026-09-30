-- =============================================================================
-- 0004 — Row Level Security on the core CRM tables
-- =============================================================================
-- RLS is enabled on EVERY table in this file. A policy on a table where RLS is
-- not enabled is a no-op, which is a silent and very common mistake — so the
-- `alter table ... enable row level security` statements are deliberately
-- exhaustive rather than a summary.
--
-- No `using (true)` write policies exist anywhere in this kit.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or noctis.shares_org_with_me(id));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy organizations_select on public.organizations
  for select to authenticated
  using (noctis.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (noctis.has_perm(id, 'org.update'))
  with check (noctis.has_perm(id, 'org.update'));

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (noctis.has_perm(id, 'org.delete'));

-- -----------------------------------------------------------------------------
-- permissions / roles / role_permissions — read-only reference data
-- -----------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

create policy permissions_select on public.permissions
  for select to authenticated
  using (true);

create policy roles_select on public.roles
  for select to authenticated
  using (true);

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- memberships
-- -----------------------------------------------------------------------------
alter table public.memberships enable row level security;

create policy memberships_select on public.memberships
  for select to authenticated
  using (noctis.is_org_member(organization_id));

create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (noctis.has_perm(organization_id, 'members.invite'));

create policy memberships_update on public.memberships
  for update to authenticated
  using (noctis.has_perm(organization_id, 'members.update_role'))
  with check (noctis.has_perm(organization_id, 'members.update_role'));

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (noctis.has_perm(organization_id, 'members.remove'));

-- -----------------------------------------------------------------------------
-- prospects
-- -----------------------------------------------------------------------------
alter table public.prospects enable row level security;

create policy prospects_select on public.prospects
  for select to authenticated
  using (noctis.has_perm(organization_id, 'prospects.read'));

create policy prospects_insert on public.prospects
  for insert to authenticated
  with check (noctis.has_perm(organization_id, 'prospects.create'));

create policy prospects_update on public.prospects
  for update to authenticated
  using (noctis.has_perm(organization_id, 'prospects.update'))
  with check (noctis.has_perm(organization_id, 'prospects.update'));

create policy prospects_delete on public.prospects
  for delete to authenticated
  using (noctis.has_perm(organization_id, 'prospects.delete'));

-- -----------------------------------------------------------------------------
-- contacts
-- -----------------------------------------------------------------------------
alter table public.contacts enable row level security;

create policy contacts_select on public.contacts
  for select to authenticated
  using (noctis.has_perm(organization_id, 'contacts.read'));

create policy contacts_insert on public.contacts
  for insert to authenticated
  with check (noctis.has_perm(organization_id, 'contacts.create'));

create policy contacts_update on public.contacts
  for update to authenticated
  using (noctis.has_perm(organization_id, 'contacts.update'))
  with check (noctis.has_perm(organization_id, 'contacts.update'));

create policy contacts_delete on public.contacts
  for delete to authenticated
  using (noctis.has_perm(organization_id, 'contacts.delete'));

-- -----------------------------------------------------------------------------
-- deals
-- -----------------------------------------------------------------------------
alter table public.deals enable row level security;

create policy deals_select on public.deals
  for select to authenticated
  using (noctis.has_perm(organization_id, 'deals.read'));

create policy deals_insert on public.deals
  for insert to authenticated
  with check (noctis.has_perm(organization_id, 'deals.create'));

create policy deals_update on public.deals
  for update to authenticated
  using (noctis.has_perm(organization_id, 'deals.update'))
  with check (noctis.has_perm(organization_id, 'deals.update'));

create policy deals_delete on public.deals
  for delete to authenticated
  using (noctis.has_perm(organization_id, 'deals.delete'));

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select to authenticated
  using (noctis.has_perm(organization_id, 'tasks.read'));

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (noctis.has_perm(organization_id, 'tasks.create'));

create policy tasks_update on public.tasks
  for update to authenticated
  using (noctis.has_perm(organization_id, 'tasks.update'))
  with check (noctis.has_perm(organization_id, 'tasks.update'));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (noctis.has_perm(organization_id, 'tasks.delete'));

-- -----------------------------------------------------------------------------
-- notes
-- -----------------------------------------------------------------------------
alter table public.notes enable row level security;

create policy notes_select on public.notes
  for select to authenticated
  using (noctis.has_perm(organization_id, 'notes.read'));

create policy notes_insert on public.notes
  for insert to authenticated
  with check (noctis.has_perm(organization_id, 'notes.create'));

create policy notes_update on public.notes
  for update to authenticated
  using (noctis.has_perm(organization_id, 'notes.update'))
  with check (noctis.has_perm(organization_id, 'notes.update'));

create policy notes_delete on public.notes
  for delete to authenticated
  using (noctis.has_perm(organization_id, 'notes.delete'));

-- -----------------------------------------------------------------------------
-- audit_logs — readable by auditors, writable only by triggers
-- -----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (noctis.has_perm(organization_id, 'audit.read'));
