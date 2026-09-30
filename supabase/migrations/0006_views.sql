-- =============================================================================
-- 0006 — Views
-- =============================================================================
-- Dashboard aggregates are computed in SQL, not in JavaScript and not from
-- hard-coded numbers. `security_invoker = true` makes the view inherit the RLS
-- policies of the tables underneath it, so a user only ever sees the figures
-- for organizations they actually belong to.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- v_org_stats — headline numbers for the CRM dashboard
-- -----------------------------------------------------------------------------
create or replace view public.v_org_stats
with (security_invoker = true)
as
select
  o.id as organization_id,
  coalesce(p.total, 0)::int             as total_prospects,
  coalesce(p.active, 0)::int            as active_prospects,
  coalesce(c.total, 0)::int             as total_contacts,
  coalesce(d.total, 0)::int             as total_deals,
  coalesce(d.pipeline_value, 0)::numeric as total_pipeline_value,
  coalesce(d.won_count, 0)::int         as won_deals,
  coalesce(d.won_value, 0)::numeric     as won_pipeline_value,
  coalesce(t.pending, 0)::int           as pending_tasks,
  coalesce(m.total, 0)::int             as members_total,
  coalesce(m.active, 0)::int            as members_active
from public.organizations o
left join (
  select
    organization_id,
    count(*)                                                    as total,
    count(*) filter (where status in ('new', 'contacted', 'qualified')) as active
  from public.prospects
  group by organization_id
) p on p.organization_id = o.id
left join (
  select
    organization_id,
    count(*) as total
  from public.contacts
  group by organization_id
) c on c.organization_id = o.id
left join (
  select
    organization_id,
    count(*)                                                              as total,
    coalesce(sum(value) filter (where stage in ('lead', 'discovery', 'proposal', 'negotiation')), 0) as pipeline_value,
    count(*) filter (where stage = 'won')                                as won_count,
    coalesce(sum(value) filter (where stage = 'won'), 0)                 as won_value
  from public.deals
  group by organization_id
) d on d.organization_id = o.id
left join (
  select
    organization_id,
    count(*) filter (where status in ('pending', 'in_progress')) as pending
  from public.tasks
  group by organization_id
) t on t.organization_id = o.id
left join (
  select
    organization_id,
    count(*)                                 as total,
    count(*) filter (where status = 'active') as active
  from public.memberships
  group by organization_id
) m on m.organization_id = o.id;

comment on view public.v_org_stats is
  'Per-organization CRM metrics. RLS-inherited, so each row is only visible to that organization''s members.';

-- -----------------------------------------------------------------------------
-- v_deals_by_stage — stage distribution for pipeline funnel
-- -----------------------------------------------------------------------------
create or replace view public.v_deals_by_stage
with (security_invoker = true)
as
select
  organization_id,
  stage,
  count(*)::int                   as count,
  coalesce(sum(value), 0)::numeric as total_value
from public.deals
group by organization_id, stage;

-- -----------------------------------------------------------------------------
-- v_deals_by_month — 12-month performance series
-- -----------------------------------------------------------------------------
create or replace view public.v_deals_by_month
with (security_invoker = true)
as
select
  organization_id,
  to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
  count(*) filter (where stage = 'won')::int          as won_count,
  coalesce(sum(value) filter (where stage = 'won'), 0)::numeric as won_value,
  count(*)::int                                       as total_count,
  coalesce(sum(value), 0)::numeric                    as total_value
from public.deals
where created_at >= date_trunc('month', now()) - interval '11 months'
group by 1, 2;

-- -----------------------------------------------------------------------------
-- v_members — member list joined with profile
-- -----------------------------------------------------------------------------
create or replace view public.v_members
with (security_invoker = true)
as
select
  m.id,
  m.organization_id,
  m.user_id,
  m.email,
  m.role_key,
  m.status,
  m.invited_by,
  m.created_at,
  p.full_name,
  p.avatar_url,
  (p.id is not null) as has_account
from public.memberships m
left join public.profiles p on p.id = m.user_id;

grant select on public.v_org_stats to authenticated;
grant select on public.v_deals_by_stage to authenticated;
grant select on public.v_deals_by_month to authenticated;
grant select on public.v_members to authenticated;
