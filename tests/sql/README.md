# SQL Testing Harness — Noctis CRM

Embedded PostgreSQL test suites for validating schema correctness, Row Level Security policies, trigger guards, and data isolation rules.

---

## Running the Suites

```bash
# One-time setup: install embedded postgres and pg client
npm run test:sql:install

# Run both static and behavioural suites
npm run test:sql

# Run static catalogue audit only
npm run test:sql:static

# Run behavioural security & RLS assertions only
npm run test:sql:behavioural
```

---

## Test Suites

1. **`static.mjs`**:
   - Asserts all migrations apply in sequence.
   - Audits PostgreSQL catalog: ensures RLS is active on every table.
   - Verifies no write policies are unconditional (`using (true)` or `with check (true)`).
   - Validates SECURITY DEFINER functions pin `search_path = ''` and revoke execution from `public`.
   - Confirms all views enforce `security_invoker = true`.

2. **`behavioural.mjs`**:
   - Executes multi-tenant scenarios with realistic `auth.uid()` and JWT claims.
   - Enforces cross-tenant read/write isolation (0 rows returned / 42501 error).
   - Validates anti-escalation guards (manager cannot self-promote, admin cannot create owner).
   - Checks immutable identity properties (`created_by`, `organization_id`).
   - Verifies audit log triggers fire automatically and record column diffs.
   - Confirms demo data isolation and idempotent removal.
