-- =============================================================================
-- 0008 — Fictional demo data  ⚠️  OPTIONAL
-- =============================================================================
-- This migration inserts a fictional workspace so a buyer can see a populated
-- CRM pipeline, prospects, contacts, deals, tasks, and metrics immediately.
--
-- How to tell it apart from real data:
--   * every email address uses the RFC 2606 reserved domain `example.com`;
--   * every phone number uses the 555-01xx range reserved for fiction;
--   * every record is tagged `demo`;
--   * the workspace carries a pending invitation for demo.owner@example.com,
--     so the data stays invisible until claimed.
--
-- To remove the demo at any time run `supabase/remove-demo-data.sql`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The demo workspace
-- -----------------------------------------------------------------------------
insert into public.organizations (id, name, slug, timezone, created_by)
values (
  '11111111-1111-4111-8111-111111111111'::uuid,
  'Noctis Sales Forge',
  'noctis-sales-forge',
  'UTC',
  null
)
on conflict (slug) do nothing;

select noctis.set_flag('tenant_bootstrap', true);

insert into public.memberships (organization_id, user_id, email, role_key, status)
values (
  '11111111-1111-4111-8111-111111111111',
  null,
  'demo.owner@example.com',
  'owner',
  'invited'
)
on conflict do nothing;

select noctis.set_flag('tenant_bootstrap', false);

-- -----------------------------------------------------------------------------
-- Demo prospects
-- -----------------------------------------------------------------------------
insert into public.prospects
  (id, organization_id, name, company, email, phone, source, status, tags, notes, created_at)
values
  ('20000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Elena Rostova', 'AeroPulse Dynamics', 'elena.rostova@example.com', '+1-555-0101', 'inbound', 'qualified', '{demo,enterprise}', 'Evaluating high-throughput telemetry platform.', now() - interval '60 days'),
  ('20000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Marcus Vance', 'Vance Logistics', 'marcus.vance@example.com', '+1-555-0102', 'outreach', 'contacted', '{demo,logistics}', 'Initial call completed. Looking to streamline dispatch.', now() - interval '45 days'),
  ('20000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Sora Takahashi', 'Kestrel Robotics', 'sora.takahashi@example.com', '+1-555-0103', 'website', 'converted', '{demo,robotics}', 'Signed pilot contract. Handed over to deal stage.', now() - interval '90 days'),
  ('20000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Nadia Kassam', 'Meridian BioWorks', 'nadia.kassam@example.com', '+1-555-0104', 'referral', 'qualified', '{demo,health}', 'Referred by Dr. Chen. High interest in enterprise license.', now() - interval '30 days'),
  ('20000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Thorne Sterling', 'Sterling & Cross', 'thorne.sterling@example.com', '+1-555-0105', 'event', 'new', '{demo,fintech}', 'Met at FinTech Summit 2026.', now() - interval '10 days'),
  ('20000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Amara Diallo', 'Sahara Solar Power', 'amara.diallo@example.com', '+1-555-0106', 'website', 'contacted', '{demo,energy}', 'Requested pricing on 50 seats.', now() - interval '20 days'),
  ('20000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'Lucas Meyer', 'Bavaria Tooling GmbH', 'lucas.meyer@example.com', '+1-555-0107', 'outreach', 'unqualified', '{demo,manufacturing}', 'Budget not aligned for this quarter.', now() - interval '75 days'),
  ('20000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'Chloe Dupont', 'Lumiere Studios', 'chloe.dupont@example.com', '+1-555-0108', 'inbound', 'new', '{demo,media}', 'Inbound form submission for creative team.', now() - interval '4 days')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Demo contacts
-- -----------------------------------------------------------------------------
insert into public.contacts
  (id, organization_id, name, email, phone, job_title, company, prospect_id, tags, notes, created_at)
values
  ('30000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Elena Rostova', 'elena.rostova@example.com', '+1-555-0101', 'VP of Engineering', 'AeroPulse Dynamics', '20000000-0000-4000-8000-000000000001', '{demo,decision-maker}', 'Primary technical sponsor.', now() - interval '60 days'),
  ('30000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Vikram Patel', 'vikram.patel@example.com', '+1-555-0122', 'Lead Architect', 'AeroPulse Dynamics', '20000000-0000-4000-8000-000000000001', '{demo,evaluator}', 'Conducted architecture review.', now() - interval '50 days'),
  ('30000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Marcus Vance', 'marcus.vance@example.com', '+1-555-0102', 'Managing Director', 'Vance Logistics', '20000000-0000-4000-8000-000000000002', '{demo,decision-maker}', 'Key stakeholder for contract.', now() - interval '45 days'),
  ('30000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Sora Takahashi', 'sora.takahashi@example.com', '+1-555-0103', 'Chief Robotics Officer', 'Kestrel Robotics', '20000000-0000-4000-8000-000000000003', '{demo,executive}', 'Champion for automated toolchain.', now() - interval '90 days'),
  ('30000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Nadia Kassam', 'nadia.kassam@example.com', '+1-555-0104', 'Director of Informatics', 'Meridian BioWorks', '20000000-0000-4000-8000-000000000004', '{demo,champion}', 'Wants implementation by Q3.', now() - interval '30 days'),
  ('30000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Amara Diallo', 'amara.diallo@example.com', '+1-555-0106', 'Chief Operating Officer', 'Sahara Solar Power', '20000000-0000-4000-8000-000000000006', '{demo,decision-maker}', 'Driving procurement review.', now() - interval '20 days')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Demo deals
-- -----------------------------------------------------------------------------
insert into public.deals
  (id, organization_id, title, value, stage, expected_close_date, prospect_id, contact_id, tags, notes, created_at)
values
  ('40000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'AeroPulse Enterprise Rollout', 85000.00, 'negotiation', (current_date + interval '21 days')::date, '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '{demo,tier-1}', 'Security review passed. Final terms being agreed.', now() - interval '40 days'),
  ('40000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Kestrel Autonomous Fleet License', 120000.00, 'won', (current_date - interval '14 days')::date, '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', '{demo,annual}', 'Contract signed and closed successfully.', now() - interval '70 days'),
  ('40000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Meridian Research Cluster', 48000.00, 'proposal', (current_date + interval '35 days')::date, '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000005', '{demo,pilot}', 'Sent comprehensive proposal and SLA terms.', now() - interval '25 days'),
  ('40000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Vance Dispatch Automation', 32000.00, 'discovery', (current_date + interval '45 days')::date, '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', '{demo}', 'Discovery workshop scheduled with engineering.', now() - interval '18 days'),
  ('40000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Sahara Grid Integration', 64000.00, 'lead', (current_date + interval '60 days')::date, '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', '{demo}', 'Scoping technical requirements for grid monitoring.', now() - interval '12 days'),
  ('40000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Bavaria Tooling Legacy Migration', 25000.00, 'lost', (current_date - interval '30 days')::date, '20000000-0000-4000-8000-000000000007', null, '{demo}', 'Lost to internal building initiative.', now() - interval '65 days')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Demo tasks
-- -----------------------------------------------------------------------------
insert into public.tasks
  (id, organization_id, title, description, due_date, status, priority, prospect_id, deal_id, created_at)
values
  ('50000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Review MSA redlines with legal', 'Check confidentiality clause in AeroPulse contract.', now() + interval '2 days', 'pending', 'urgent', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() - interval '5 days'),
  ('50000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Prepare Meridian technical benchmark', 'Demonstrate sub-second response times on genomics datasets.', now() + interval '7 days', 'in_progress', 'high', '20000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', now() - interval '10 days'),
  ('50000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Schedule discovery follow-up with Marcus Vance', 'Coordinate calendar invite with logistics dispatch team.', now() + interval '4 days', 'pending', 'medium', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', now() - interval '3 days'),
  ('50000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Send Kestrel onboarding welcome packet', 'Share API documentation and invite engineers.', now() - interval '10 days', 'completed', 'medium', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', now() - interval '14 days')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Demo notes
-- -----------------------------------------------------------------------------
insert into public.notes
  (id, organization_id, body, prospect_id, deal_id, created_at)
values
  ('60000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Elena confirmed that the executive committee approved the budget allocation.', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() - interval '10 days'),
  ('60000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Kestrel contract fully executed. Invoiced for Year 1 license.', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', now() - interval '14 days'),
  ('60000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Initial phone screening went well. Focused on dispatch routing efficiency.', '20000000-0000-4000-8000-000000000002', null, now() - interval '20 days')
on conflict do nothing;
