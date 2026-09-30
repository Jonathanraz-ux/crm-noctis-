# Setup — Noctis CRM

From a fresh clone to a running app. About 15 minutes, most of it waiting for Supabase.

---

## 1. Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **Node.js 20.19+** | Check with `node -v`. Vite 6 requires it. |
| **A Supabase project** | The free tier is fine. Create one at supabase.com. |
| **Supabase CLI** *(optional)* | Only for `supabase db push` / `supabase start`. You can paste SQL instead. |
| **Docker** *(optional)* | Only for a fully local Supabase stack. |

You will need two values from **Project Settings → API**: the **Project URL** and the
**anon / publishable key**.

## 2. Install

```bash
npm install
```

## 3. Configure

```bash
cp .env.example .env.local
```

Fill in two values:

```ini
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`.env.local` is gitignored. Only ever put the **anon/publishable** key here — see the warning
in `.env.example` and the "The anonymous key is not a secret" section of
[`../SECURITY.md`](../SECURITY.md). Vite inlines every `VITE_*` variable into the shipped
bundle; a `service_role` key here would be publicly readable and would end the project's
security.

`VITE_BASE_PATH` is optional and only needed if you serve the app from a sub-directory. If you
use it, set the same value in the router basename.

## 4. Apply the database migrations

The app will show a "not configured" notice and refuse to sign in until the schema exists.
This is deliberate — a clear failure beats a 400 from PostgREST.

**Option A — CLI (recommended, tracks a history)**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**Option B — dashboard**

Open **SQL Editor** and run `supabase/migrations/0001` → `0008`, **one file at a time, in
numeric order**. Each file depends on the previous ones; running them out of order or all at
once will fail partway and leave you guessing what applied.

The eight files and what they do are listed in [`../supabase/README.md`](../supabase/README.md).

> **If you script the install instead of using the SQL editor**, use a connection that can create
> extensions and schemas. The Supabase **Management API** `database/query` endpoint connects as
> `postgres`, which is enough for every file in this kit — none of them touch `storage` (the kit
> has no file feature).

## 5. Run it

```bash
npm run dev
```

Open http://localhost:5173, click **Sign up**, and create your account. Supabase sends a
confirmation email; the link returns you to the app signed in. With no workspace yet, you are
sent to onboarding, where you create your first organization. That organization makes you its
`owner`.

## 6. Optional — the demo workspace

`0008_demo_data.sql` seeds a fictional workspace (`Noctis Sales Forge`) with sample prospects,
contacts, deals, tasks and notes, so you can see populated screens instead of empty states.
Every email uses the reserved `example.com` domain, every phone number is in the fictional
555-01xx range and every record is tagged `demo`.

**Remove it before showing this to a client:**

```sql
-- SQL Editor
\i supabase/remove-demo-data.sql
```

The script deletes the demo organization and everything under it, and leaves your own
organizations untouched. If you skipped `0008`, you do not need to run it.

## 7. Optional — a fully local stack

```bash
npx supabase start
```

The CLI prints a local API URL and anon key. Paste those into `.env.local` and the kit runs
offline against a throwaway database. Requires Docker.

## 8. Verify the install

```bash
npm test            # 65 frontend tests
npm run test:sql:install   # first time only
npm run test:sql    # 75 SQL tests
npm run build
```

`npm run test:sql` runs against a real PostgreSQL, so it is a genuine check that your
migrations applied cleanly.

Optionally, once `.env.local` carries a dedicated test account (`E2E_EMAIL` / `E2E_PASSWORD`):

```bash
npm run test:e2e    # browser checks in a real browser
```

This drives the app against your project from the login screen through every protected route
and back out again. Without those two variables it reports itself as skipped rather than
failed. It needs a browser installed on the machine (`E2E_CHANNEL` picks it; `msedge` works) but
never downloads one. See [`../TESTING.md`](../TESTING.md) for all three suites.

## 9. Before you deploy

A production deployment is not `npm run build` and upload. Minimum list:

- [ ] **Auth providers** — *Authentication → Providers*. Enable only what you use.
- [ ] **Real SMTP** — the built-in email provider is rate-limited and not for production.
      Configure a provider and your own templates.
- [ ] **Redirect URLs** — *Authentication → URL Configuration*. Set your production origin in
      both Site URL and Redirect URLs, or password-reset links will bounce to localhost.
- [ ] **Content Security Policy** — set at your host or CDN. The kit sets none.
- [ ] **Error reporting** — add Sentry or equivalent; nothing is instrumented.
- [ ] **Rate limiting** — in front of `/login` and `/signup` if your host does not provide it.
- [ ] **Demo data removed** — run `remove-demo-data.sql` and confirm.
- [ ] **`docs` still present** — decide whether to ship these files to the buyer (recommended:
      yes) or strip them.

Deployment specifics are your host's problem: the build output is a static bundle in `dist/`
and works on Netlify, Vercel, Cloudflare Pages, S3/CloudFront, or any static server. Configure
`dist/` as the publish directory and rewrite unknown paths to `/index.html` — the app uses
history routing, so a deep link like `/prospects` must fall back to the entry point.

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| "Supabase is not configured" notice | `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` missing, or the dev server was not restarted after editing `.env.local`. |
| Sign-up succeeds but the user is sent to onboarding forever | A migration is missing — apply `0001`–`0005`. |
| Every query returns an empty array or 42501 | RLS is doing its job and the user has no membership. Check `memberships` for their `user_id`. |
| Password-reset email goes to localhost | Add your production URL to the Supabase redirect allow-list. |
| `npm run test:sql` reports a port conflict | A previous harness run is still alive. Close it or free the port. |
| `supabase db push` says nothing to push | Not linked, or the migrations were applied by hand. Verify in the SQL editor. |
| Demo records visible to a client | Run `remove-demo-data.sql`; the demo workspace has a pending invitation and stays invisible until claimed. |

---

© 2026 Noctis Digital Forge. All rights reserved.
