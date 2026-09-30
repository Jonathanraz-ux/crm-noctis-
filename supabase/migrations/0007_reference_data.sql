-- =============================================================================
-- 0007 — Reference data (permissions, roles, role matrix)
-- =============================================================================
-- Global catalogues for authorization. The client reads these catalogues at
-- runtime, and RLS policies resolve permissions through `role_permissions`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------
insert into public.permissions (code, label, category, description) values
  ('org.read',          'View organization',        'Organization', 'See the organization details and workspace members.'),
  ('org.update',        'Edit organization',        'Organization', 'Rename the organization and change its settings.'),
  ('org.delete',        'Delete organization',      'Organization', 'Permanently delete the organization and all its data.'),
  ('members.read',      'View members',             'Members',      'See the member list and each member''s role.'),
  ('members.invite',    'Invite members',           'Members',      'Invite new team members by email address.'),
  ('members.update_role','Change member roles',     'Members',      'Promote or demote a team member.'),
  ('members.remove',    'Remove members',           'Members',      'Remove a member from the organization.'),
  ('roles.read',        'View roles',               'Roles',        'See the role catalogue and permission matrix.'),
  ('prospects.read',    'View prospects',           'Prospects',    'Read the prospects and leads directory.'),
  ('prospects.create',  'Create prospects',         'Prospects',    'Add new prospects and leads.'),
  ('prospects.update',  'Edit prospects',           'Prospects',    'Update existing prospects.'),
  ('prospects.delete',  'Delete prospects',         'Prospects',    'Delete prospects.'),
  ('prospects.export',  'Export prospects',         'Prospects',    'Download prospect lists as CSV.'),
  ('contacts.read',     'View contacts',            'Contacts',     'Read the contacts directory.'),
  ('contacts.create',   'Create contacts',          'Contacts',     'Add new contacts.'),
  ('contacts.update',   'Edit contacts',            'Contacts',     'Update contact details.'),
  ('contacts.delete',   'Delete contacts',          'Contacts',     'Delete contacts.'),
  ('contacts.export',   'Export contacts',          'Contacts',     'Download contact lists as CSV.'),
  ('deals.read',        'View deals',               'Pipeline',     'See pipeline deals and opportunity stages.'),
  ('deals.create',      'Create deals',             'Pipeline',     'Create opportunities in the pipeline.'),
  ('deals.update',      'Edit deals',               'Pipeline',     'Update deal details, values and stages.'),
  ('deals.delete',      'Delete deals',             'Pipeline',     'Delete deals.'),
  ('deals.export',      'Export deals',             'Pipeline',     'Download pipeline deals as CSV.'),
  ('tasks.read',        'View tasks',               'Tasks',        'View tasks and follow-up to-dos.'),
  ('tasks.create',      'Create tasks',             'Tasks',        'Add tasks and action items.'),
  ('tasks.update',      'Edit tasks',               'Tasks',        'Update, complete, or reassign tasks.'),
  ('tasks.delete',      'Delete tasks',             'Tasks',        'Delete tasks.'),
  ('notes.read',        'View notes',               'Notes',        'Read activity notes and comments.'),
  ('notes.create',      'Create notes',             'Notes',        'Add notes to prospects, contacts, or deals.'),
  ('notes.update',      'Edit notes',               'Notes',        'Edit existing notes.'),
  ('notes.delete',      'Delete notes',             'Notes',        'Delete notes.'),
  ('audit.read',        'View audit log',           'Audit',        'Read the append-only activity log.')
on conflict (code) do update
  set label       = excluded.label,
      category    = excluded.category,
      description = excluded.description;

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
insert into public.roles (key, name, description, rank, is_system) values
  ('owner',   'Owner',         'Full control over organization, billing, deletion, and role assignment.', 100, true),
  ('admin',   'Administrator', 'Manages members, settings, and all CRM entities. Cannot delete the organization.', 80, true),
  ('manager', 'Manager',       'Runs day-to-day sales: prospects, contacts, deals, tasks, notes, and CSV exports.', 60, true),
  ('member',  'Member',        'Sales contributor: creates and manages prospects, contacts, deals, and tasks.', 40, true),
  ('viewer',  'Viewer',        'Read-only access to CRM records and the member directory.', 20, true)
on conflict (key) do update
  set name        = excluded.name,
      description = excluded.description,
      rank        = excluded.rank;

-- -----------------------------------------------------------------------------
-- Role Matrix
-- -----------------------------------------------------------------------------
-- Owner: everything
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.key = 'owner'
on conflict do nothing;

-- Admin: all except org.delete
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.key = 'admin'
  and p.code not in ('org.delete')
on conflict do nothing;

-- Manager: day-to-day CRM CRUD + exports + audit
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.key = 'manager'
  and p.code in (
    'org.read', 'members.read',
    'prospects.read', 'prospects.create', 'prospects.update', 'prospects.delete', 'prospects.export',
    'contacts.read', 'contacts.create', 'contacts.update', 'contacts.delete', 'contacts.export',
    'deals.read', 'deals.create', 'deals.update', 'deals.delete', 'deals.export',
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
    'notes.read', 'notes.create', 'notes.update', 'notes.delete',
    'audit.read'
  )
on conflict do nothing;

-- Member: contributor access (no deletes)
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.key = 'member'
  and p.code in (
    'org.read',
    'prospects.read', 'prospects.create', 'prospects.update', 'prospects.export',
    'contacts.read', 'contacts.create', 'contacts.update', 'contacts.export',
    'deals.read', 'deals.create', 'deals.update', 'deals.export',
    'tasks.read', 'tasks.create', 'tasks.update',
    'notes.read', 'notes.create', 'notes.update'
  )
on conflict do nothing;

-- Viewer: read-only access. No `audit.read`: the log names who changed what,
-- and the reference kit treats that as above a read-only role.
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.key = 'viewer'
  and p.code in (
    'org.read', 'members.read', 'roles.read',
    'prospects.read', 'contacts.read', 'deals.read',
    'tasks.read', 'notes.read'
  )
on conflict do nothing;
