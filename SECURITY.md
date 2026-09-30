# Security Model — Noctis CRM

The security contract of Noctis CRM: how tenant isolation works, where authority
is enforced, and what the kit does and does not protect you from.

---

## 1. Core Principles

### Hiding a button is not authorization
The user interface hides controls a user's role cannot use to provide a clean experience,
but the actual decision is strictly enforced server-side:
- **Row Level Security (RLS)** is enabled on **EVERY table** in the schema.
- **Database Trigger Guards** prevent privilege escalation, self-promotion, self-demotion,
  removing the last active owner, and unauthorized identity mutations.
- A user manipulating client requests in DevTools receives a database-level rejection
  (`42501 permission denied` / `0 rows affected`), never unauthorized access.

### The anonymous key is not a secret
The `VITE_SUPABASE_ANON_KEY` is embedded in the public frontend bundle.
Anyone visiting the site can inspect it.
**Never introduce a `service_role` key anywhere in frontend code, environment configs,
tests, or client-facing scripts.** The `service_role` key bypasses RLS and must only ever
be used in trusted server environments.

---

## 2. Multi-Tenancy & Authorization Model

```
auth.users (Managed by Supabase Auth)
  └── public.profiles (1:1 with auth user, created via trigger, carries NO role)
        └── public.memberships (1 row per user per organization - authority lives here)
              └── public.roles (5 system roles: owner, admin, manager, member, viewer)
                    └── public.role_permissions
                          └── public.permissions (Granular permission codes)
```

### Roles and Authority

| Role | Role Rank | Capabilities |
| ---- | --------- | ------------ |
| `owner` | 100 | Full authority over organization, billing, settings, deletion, and role assignment. |
| `admin` | 80 | Full management of members, roles, prospects, contacts, deals, tasks, notes. Cannot delete organization. |
| `manager` | 60 | Day-to-day management: CRUD on prospects, contacts, deals, tasks, notes; CSV exports. Cannot manage members or delete org. |
| `member` | 40 | Contributor: Read/create/edit prospects, contacts, deals, tasks, notes. Cannot delete records. |
| `viewer` | 20 | Read-only access to CRM data, audit log, and members list. |

---

## 3. Server-Side Guards

1. **Self-Escalation Prevention**:
   A user cannot alter their own `role_key` or `status` on `memberships`. Only another owner/admin can promote or demote.
2. **Owner Hierarchy Guard**:
   Only an existing `owner` can grant or assign the `owner` role.
3. **Last-Owner Protection**:
   An organization must always retain at least one active `owner`. Deleting or suspending the last owner is refused by triggers.
4. **Tenant Immutability**:
   `organization_id` on all CRM tables (`prospects`, `contacts`, `deals`, `tasks`, `notes`, `memberships`) is immutable after insertion. Rows cannot be transferred across tenants.
5. **Author & Creator Stamping**:
   `created_by` is stamped server-side via `auth.uid()` during inserts, preventing author spoofing or backdating.
6. **Append-Only Audit Logging**:
   `audit_logs` is writable only by database triggers. Direct inserts, updates, and deletes from client roles are blocked.

---

## 4. What this kit does NOT protect against

- **Compromised credentials**: If an owner account is hijacked, the attacker holds owner authority.
- **Client-side denial of service**: Rate limiting must be configured at the CDN/reverse proxy level.
- **Phishing**: Ensure email confirmation and custom SMTP templates are configured in production.

---

© 2026 Noctis Digital Forge. All rights reserved.
