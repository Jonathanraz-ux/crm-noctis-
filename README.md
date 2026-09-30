# Noctis CRM

A production-ready **React 19 + Supabase CRM** starter. Authentication, organizations,
roles, Row Level Security, a prospect/contact pipeline with tasks and notes, CSV export and
an audited activity log — wired end to end, not sketched.

This is a **commercial kit from Noctis Digital Forge**. See [`LICENSE.md`](./LICENSE.md)
and [`LICENSING.md`](./LICENSING.md) before you ship it.

---

## What you get

| Area | Included |
| ---- | -------- |
| **Authentication** | Sign in, sign up, email confirmation, forgot/reset password, session persistence, sign out |
| **Multi-tenancy** | Organizations, membership, active-workspace switcher, onboarding for a user with no workspace |
| **Authorization** | 5 roles, 32 permission codes, a role matrix, RLS policies, anti-escalation trigger guards |
| **Prospects** | Directory with stages, sources, owners, filters, create/detail/edit/delete forms |
| **Contacts** | Contact directory linked to prospects, filters, CRUD forms |
| **Pipeline** | Deal board by stage, values and probabilities, stage moves, deal details |
| **Tasks** | Follow-ups with status, priority and due dates, linked to prospects and deals |
| **Notes** | Activity notes on prospects, contacts and deals |
| **Export** | CSV export of prospects, contacts and deals, scoped to the permission matrix |
| **Dashboard** | Pipeline metrics, open tasks and recent activity for the active workspace |
| **Audit** | Append-only audit log written by database triggers, filterable screen |
| **UI** | Light/dark theme, responsive layout, accessible primitives (Radix), design-token-driven Tailwind 4, Noctis Adaptive Field |
| **Quality** | Strict TypeScript, ESLint, Prettier, 65 frontend tests, 75 SQL tests |

### Roles and permissions

| Role | Intended for | Notable permissions |
| ---- | ------------ | -------------------- |
| `owner` | The person who bought the product | Everything, including `org.delete` |
| `admin` | Trusted operators | Manage members and roles, no org deletion |
| `manager` | Day-to-day sales leads | Full CRM CRUD, CSV exports, `audit.read` |
| `member` | Individual contributors | Create and edit CRM records, no deletes |
| `viewer` | Clients, read-only reviewers | Read records, members and roles — no audit log |

The full matrix lives in [`supabase/migrations/0007_reference_data.sql`](./supabase/migrations/0007_reference_data.sql)
and is editable in-app on the **Roles** screen.

> **Hiding a button is not authorization.** The UI hides controls a role cannot use, but the
> decision is enforced by Row Level Security policies and trigger guards in the database.
> A user who edits a request in devtools gets an RLS error, not access.

---

## Requirements

- **Node.js 20.19+** (`npm install` will warn below this)
- A **Supabase project** — free tier is enough to run the kit
- A Supabase CLI is optional; you can paste the migrations into the SQL editor instead

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then paste your Project URL and anon key
npm run dev
```

Then open http://localhost:5173 and create your account.

**You must apply the database migrations** — the app will render a setup notice and refuse to
sign in until the schema exists. Either run:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste the eight files from [`supabase/migrations/`](./supabase/migrations) into the Supabase
SQL editor, in filename order. Full walkthrough, including how to load the demo data and then
delete it, is in **[`docs/SETUP.md`](./docs/SETUP.md)**.

---

## Commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` for app and tooling configs |
| `npm run lint` | ESLint (`lint:fix` to autofix) |
| `npm run format` | Prettier write (`format:check` to verify) |
| `npm test` | Vitest unit tests |
| `npm run test:sql` | Full SQL suite (static catalogue + behavioural) |
| `npm run test:sql:static` | Catalogue assertions only, fast |
| `npm run test:sql:behavioural` | RLS, trigger and guard behaviour |
| `npm run test:sql:install` | One-time install of the SQL test dependencies |
| `npm run test:e2e` | Browser smoke test against a live Supabase project (see `TESTING.md`) |

---

## Project layout

```
src/
  app/            Routes, layouts, guards, error boundary, pages
  components/     Shared UI (data table, confirm dialog) and ui/ primitives
  config/         product.ts — rebrand here, not in components
  features/       One folder per domain: prospects, contacts, pipeline, tasks, audit…
  lib/            supabase client, formatting, CSV, errors, validation, DB types
  providers/      Auth, Theme, Toast, React Query
  styles/         Tailwind entry point and design tokens
supabase/
  migrations/     0001 → 0008, apply in order
  remove-demo-data.sql
  README.md       What each migration does
docs/
  SETUP.md        Installation, migrations, demo data, first deploy
tests/e2e/        Browser smoke test
tests/sql/        Embedded-Postgres test harness
```

`src/lib/types/database.ts` is hand-written and mirrors the SQL schema. If you add a table,
add it there too — that file is what gives you type-safe queries.

---

## Documentation

| Document | Covers |
| -------- | ------ |
| [`docs/SETUP.md`](./docs/SETUP.md) | Install, migrations, demo data, deployment |
| [`docs/CUSTOMIZATION.md`](./docs/CUSTOMIZATION.md) | Rebrand, retheme, add features and roles |
| [`SECURITY.md`](./SECURITY.md) | The security model, and what the kit does *not* protect you from |
| [`TESTING.md`](./TESTING.md) | The test suites and how to extend them |
| [`LICENSING.md`](./LICENSING.md) | Licence of this kit and of every dependency |
| [`DELIVERY.md`](./DELIVERY.md) | What was verified before delivery, and what was not |

---

## A note on what "production-ready" means

The kit is built to be correct by construction: tenant isolation is enforced in the database,
privilege escalation is blocked by triggers, and the security-relevant code paths are covered by
tests. What it has **not** had is email confirmation, an accessibility audit or a load test — see
[`DELIVERY.md`](./DELIVERY.md) for the exact list of what was and was not verified. Read that file
before you promise anything to a client.

---

© 2026 Noctis Digital Forge. All rights reserved.
