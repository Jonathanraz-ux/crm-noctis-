-- =============================================================================
-- Remove demo data from Noctis CRM
-- =============================================================================
-- Deletes the demo workspace ('11111111-1111-4111-8111-111111111111') and all
-- of its prospects, contacts, deals, tasks, notes, memberships and audit entries
-- via CASCADE.
--
-- Your own organizations and real CRM data remain untouched.
-- =============================================================================

delete from public.organizations
where id = '11111111-1111-4111-8111-111111111111';
