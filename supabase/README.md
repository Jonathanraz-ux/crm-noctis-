# Supabase Migrations — Noctis CRM

Apply these migrations in ascending numerical order (`0001` through `0008`) to set up the database schema, RLS policies, trigger guards, views, and reference permissions.

---

## Migration Index

| File | Purpose |
| ---- | ------- |
| [`0001_extensions_and_schemas.sql`](./migrations/0001_extensions_and_schemas.sql) | Enables `pgcrypto`, creates the private `noctis` schema, and locks down public function execution. |
| [`0002_core_tables.sql`](./migrations/0002_core_tables.sql) | Creates core CRM tables: `profiles`, `organizations`, `permissions`, `roles`, `role_permissions`, `memberships`, `prospects`, `contacts`, `deals`, `tasks`, `notes`, and `audit_logs`. |
| [`0003_security_functions.sql`](./migrations/0003_security_functions.sql) | SECURITY DEFINER helper functions in `noctis` schema for tenant checks, role resolution, and permissions. |
| [`0004_rls_core.sql`](./migrations/0004_rls_core.sql) | Enables Row Level Security on all tables and applies granular tenant-isolation policies. |
| [`0005_triggers_and_guards.sql`](./migrations/0005_triggers_and_guards.sql) | Anti-escalation guards, last-owner protection, author stamping, tenant immutability, and automatic audit logging triggers. |
| [`0006_views.sql`](./migrations/0006_views.sql) | `security_invoker = true` views: `v_org_stats`, `v_deals_by_stage`, `v_deals_by_month`, `v_members`. |
| [`0007_reference_data.sql`](./migrations/0007_reference_data.sql) | 32 CRM permission codes, 5 roles (`owner`, `admin`, `manager`, `member`, `viewer`), and the role-permission matrix. |
| [`0008_demo_data.sql`](./migrations/0008_demo_data.sql) | *(Optional)* Fictional CRM workspace (`Noctis Sales Forge`) with sample prospects, contacts, deals, tasks, and notes for evaluation. |

---

## Removing Demo Data

To clear out the demo workspace at any time, run:

```sql
\i supabase/remove-demo-data.sql
```

or execute the contents of [`remove-demo-data.sql`](./remove-demo-data.sql) in the Supabase SQL Editor.
