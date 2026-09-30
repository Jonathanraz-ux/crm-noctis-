-- =============================================================================
-- 0002 — Core CRM tables
-- =============================================================================
-- Tenancy model:
--   auth.users (Supabase managed)
--     └── profiles (1:1, created by trigger on signup, NO role)
--           └── memberships (authority lives here)
--                 ├── roles
--                 └── role_permissions -> permissions
--
-- CRM Entities (all scoped to organizations):
--   organizations (tenant root)
--     ├── prospects (sales leads and prospects)
--     ├── contacts (linked to prospects/accounts)
--     ├── deals (sales pipeline stages, deal value, expected close)
--     ├── tasks (to-dos and action items linked to CRM entities)
--     ├── notes (activity notes and comments)
--     └── audit_logs (append-only change log written by triggers)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — one row per authenticated user
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Created automatically on sign-up. Intentionally has no role column — see memberships.';

-- -----------------------------------------------------------------------------
-- organizations — the tenant root
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  slug        text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  timezone    text not null default 'UTC',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists organizations_slug_key on public.organizations (slug);

-- -----------------------------------------------------------------------------
-- permissions — global, read-only catalogue
-- -----------------------------------------------------------------------------
create table if not exists public.permissions (
  code        text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
  label       text not null,
  category    text not null,
  description text
);

-- -----------------------------------------------------------------------------
-- roles — global, read-only catalogue
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z_]{2,32}$'),
  name        text not null,
  description text,
  rank        integer not null default 0,
  is_system   boolean not null default true
);

-- -----------------------------------------------------------------------------
-- role_permissions — which permissions a role grants
-- -----------------------------------------------------------------------------
create table if not exists public.role_permissions (
  role_id          uuid not null references public.roles (id) on delete cascade,
  permission_code  text not null references public.permissions (code) on delete cascade,
  primary key (role_id, permission_code)
);

-- -----------------------------------------------------------------------------
-- memberships — user <-> organization authority link
-- -----------------------------------------------------------------------------
create table if not exists public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid references public.profiles (id) on delete cascade,
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role_key         text not null references public.roles (key) on update cascade,
  status           text not null default 'active'
                     check (status in ('invited', 'active', 'suspended')),
  invited_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists memberships_org_email_key
  on public.memberships (organization_id, lower(email));

create unique index if not exists memberships_org_user_key
  on public.memberships (organization_id, user_id)
  where user_id is not null;

create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_org_status_idx on public.memberships (organization_id, status);

-- -----------------------------------------------------------------------------
-- prospects — CRM prospects and leads
-- -----------------------------------------------------------------------------
create table if not exists public.prospects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 160),
  company          text,
  email            text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone            text,
  source           text not null default 'website'
                     check (source in ('website', 'referral', 'outreach', 'event', 'inbound', 'partner', 'other')),
  status           text not null default 'new'
                     check (status in ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  tags             text[] not null default '{}',
  notes            text,
  owner_id         uuid references public.profiles (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists prospects_org_created_idx on public.prospects (organization_id, created_at desc);
create index if not exists prospects_org_status_idx on public.prospects (organization_id, status);
create index if not exists prospects_org_owner_idx on public.prospects (organization_id, owner_id);
create index if not exists prospects_org_name_idx on public.prospects (organization_id, lower(name));
create index if not exists prospects_tags_idx on public.prospects using gin (tags);

-- -----------------------------------------------------------------------------
-- contacts — individual people / stakeholders linked to accounts
-- -----------------------------------------------------------------------------
create table if not exists public.contacts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 160),
  email            text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone            text,
  job_title        text,
  company          text,
  prospect_id      uuid references public.prospects (id) on delete set null,
  tags             text[] not null default '{}',
  notes            text,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists contacts_org_created_idx on public.contacts (organization_id, created_at desc);
create index if not exists contacts_org_prospect_idx on public.contacts (organization_id, prospect_id);
create index if not exists contacts_org_name_idx on public.contacts (organization_id, lower(name));
create index if not exists contacts_tags_idx on public.contacts using gin (tags);

-- -----------------------------------------------------------------------------
-- deals — sales pipeline opportunities
-- -----------------------------------------------------------------------------
create table if not exists public.deals (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  title               text not null check (char_length(btrim(title)) between 1 and 200),
  value               numeric(14, 2) not null default 0 check (value >= 0),
  stage               text not null default 'lead'
                        check (stage in ('lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost')),
  expected_close_date date,
  prospect_id         uuid references public.prospects (id) on delete set null,
  contact_id          uuid references public.contacts (id) on delete set null,
  owner_id            uuid references public.profiles (id) on delete set null,
  tags                text[] not null default '{}',
  notes               text,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists deals_org_created_idx on public.deals (organization_id, created_at desc);
create index if not exists deals_org_stage_idx on public.deals (organization_id, stage);
create index if not exists deals_org_owner_idx on public.deals (organization_id, owner_id);
create index if not exists deals_org_prospect_idx on public.deals (organization_id, prospect_id);
create index if not exists deals_tags_idx on public.deals using gin (tags);

-- -----------------------------------------------------------------------------
-- tasks — action items, follow-ups, and tasks
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  title            text not null check (char_length(btrim(title)) between 1 and 200),
  description      text,
  due_date         timestamptz,
  status           text not null default 'pending'
                     check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority         text not null default 'medium'
                     check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id      uuid references public.profiles (id) on delete set null,
  prospect_id      uuid references public.prospects (id) on delete cascade,
  contact_id       uuid references public.contacts (id) on delete cascade,
  deal_id          uuid references public.deals (id) on delete cascade,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists tasks_org_created_idx on public.tasks (organization_id, created_at desc);
create index if not exists tasks_org_status_idx on public.tasks (organization_id, status);
create index if not exists tasks_org_assignee_idx on public.tasks (organization_id, assignee_id);
create index if not exists tasks_org_due_date_idx on public.tasks (organization_id, due_date);
create index if not exists tasks_org_deal_idx on public.tasks (organization_id, deal_id);
create index if not exists tasks_org_prospect_idx on public.tasks (organization_id, prospect_id);

-- -----------------------------------------------------------------------------
-- notes — activity notes and comments on prospects, contacts, or deals
-- -----------------------------------------------------------------------------
create table if not exists public.notes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  body             text not null check (char_length(btrim(body)) >= 1),
  prospect_id      uuid references public.prospects (id) on delete cascade,
  contact_id       uuid references public.contacts (id) on delete cascade,
  deal_id          uuid references public.deals (id) on delete cascade,
  author_id        uuid references public.profiles (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists notes_org_created_idx on public.notes (organization_id, created_at desc);
create index if not exists notes_org_prospect_idx on public.notes (organization_id, prospect_id);
create index if not exists notes_org_contact_idx on public.notes (organization_id, contact_id);
create index if not exists notes_org_deal_idx on public.notes (organization_id, deal_id);

-- -----------------------------------------------------------------------------
-- audit_logs — append-only, written exclusively by database triggers
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id               bigint generated always as identity primary key,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  actor_id         uuid,
  actor_email      text,
  action           text not null check (action in ('insert', 'update', 'delete')),
  entity           text not null,
  entity_id        text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);
