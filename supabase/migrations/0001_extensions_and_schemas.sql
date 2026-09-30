-- =============================================================================
-- 0001 — Extensions, schemas and search path hardening
-- =============================================================================
-- Runs first. Creates the private `noctis` schema that holds the Row Level
-- Security helper functions, and makes sure that schema is not reachable by
-- anonymous visitors or direct PostgREST RPC calls.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- Helper functions live here rather than in `public` so that PostgREST can
-- never expose them as an RPC endpoint.
create schema if not exists noctis;

revoke all on schema noctis from public;
grant usage on schema noctis to authenticated;

-- Lock down the default execution rights for the whole database. New functions
-- created by this kit are granted explicitly, one by one, further down.
alter default privileges in schema public
  revoke execute on functions from public;

-- Everyone may see the public schema, but table and function access are gated.
grant usage on schema public to anon, authenticated;
