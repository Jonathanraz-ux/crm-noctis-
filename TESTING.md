# Testing — Noctis CRM

Three independent suites: **Vitest** in jsdom for client logic, **embedded Postgres** for
the SQL that actually decides who can do what, and a **Playwright browser smoke test** that
drives the built app against the live Supabase project.

```bash
npm test                      # 65 frontend tests
npm run test:sql              # 75 SQL tests (28 static + 47 behavioural)
npm run test:sql:install      # one-time: install the SQL harness dependencies
npm run test:e2e              # 55 browser checks (needs the env below, ~1 min)
```

---

## 1. Frontend tests (`npm test`)

Fast, no Supabase connection needed. 65 tests across 9 files.

| File | Covers |
| ---- | ------ |
| `src/lib/format.test.ts` | Relative time (with a pinned clock), initials, number formatting, date-input values, avatar tint stability |
| `src/lib/csv.test.ts` | RFC 4180 escaping, delimiters, BOM, filename sanitisation, download plumbing |
| `src/lib/errors.test.ts` | Database/Auth error → human sentence, including the account-enumeration rule |
| `src/lib/validation.test.ts` | Every Zod schema: sign-in/up, passwords, profile, invitation, prospect, contact, deal, task, note |
| `src/features/prospects/prospects.service.test.ts` | `safeSortColumn()` allowlist, **including SQL injection attempts** |
| `src/features/contacts/contacts.service.test.ts` | The same allowlist for contacts, with injection attempts |
| `src/features/pipeline/pipeline.service.test.ts` | The same allowlist for deals, with injection attempts |
| `src/features/tasks/tasks.service.test.ts` | The same allowlist for tasks, with injection attempts |
| `src/components/noctis-field.test.tsx` | The Adaptive Field's label wiring, message precedence, `aria-describedby`, clear button, password toggle |

`src/test/setup.ts` holds the jsdom shims the app needs and jsdom lacks: `matchMedia` and the
Blob object-URL API. Add to that file rather than to individual tests, so a test that forgets
does not fail for an unrelated reason.

Two suites are worth singling out, because they assert a *security or accessibility property*
rather than a value:

- The sort-column allowlists must fall back on a safe default, so a crafted `?sort=` cannot
  become SQL.
- `toErrorMessage` must not reveal that an address is already registered, so the sign-up form
  cannot be used to enumerate accounts.
- The Adaptive Field tests assert that an `errorMessage` alone produces a correctly linked
  `aria-describedby` and `aria-invalid`, and that the error beats the helper text. A
  validation message that competes with a hint is a validation message nobody reads.

If someone weakens any of these, a test fails.

## 2. SQL tests (`npm run test:sql`)

These run the real migrations against a real PostgreSQL, so the policies, functions and
triggers are exercised as written. `tests/sql/harness.mjs` boots an `embedded-postgres`
cluster, applies `0001`→`0008` in order, and provides a shim for the `auth.uid()` context
Supabase normally supplies.

**75 assertions:**

| Suite | Count | Asserts |
| ----- | ----- | ------- |
| `static.mjs` | 28 | Catalogue integrity: every table, column, function, view, trigger and policy the client types depend on exists, with the expected shape. Catches a renamed column before the frontend does. |
| `behavioural.mjs` | 47 | Actual behaviour: RLS allows and denies across prospects, contacts, deals, tasks and notes; escalation guards block; last-owner protection works; identity columns cannot be repointed; audit triggers fire; views inherit RLS; the demo workspace is invisible until claimed and `remove-demo-data.sql` takes its CRM and audit rows with it. |

The harness fails loudly rather than mysteriously: a database error that is not an `Error`
instance is stringified, and an occupied port is reported as a port conflict instead of a
timeout. If you see `port 54322 already in use`, a previous run is still alive.

### Why not `supabase start`?

The official CLI gives you GoTrue, PostgREST and Storage as well — worth doing when you can.
It needs Docker, which the delivery environment did not have, so the kit ships against embedded
Postgres and documents the gap. **These tests do not cover GoTrue, PostgREST, or network-level
RLS.** See the limitations below.

## 3. Browser smoke test (`npm run test:e2e`)

It runs the real app in a real browser against the live Supabase project — **55 checks**.

`tests/e2e/smoke.mjs` starts its own Vite server on port 3000, signs in with the real GoTrue,
walks all nine protected routes (dashboard, prospects, contacts, pipeline, tasks, members,
roles, audit, settings), checks each for a login bounce, an `ErrorBoundary` fallback and the
"not configured" notice, exercises the password reveal toggle, does a 390 × 844 pass, signs out
through the account menu, and asserts zero console errors, zero uncaught page errors and zero
failed API calls. Screenshots land in `test-results/screenshots/`.

**Prerequisites** — all read from the environment, none of them prefixed `VITE_`:

| Variable | Meaning | Default |
| -------- | ------- | ------- |
| `E2E_EMAIL` / `E2E_PASSWORD` | A dedicated test account. Never a real user's. | — (suite skips) |
| `E2E_BASE_URL` | Server to test. | `http://localhost:3000` |
| `E2E_PORT` | Port the suite's own Vite server binds. | `3000` |
| `E2E_CHANNEL` | Playwright browser channel. | `chromium` |
| `E2E_HEADLESS` | `0` to watch it run. | `1` |

```bash
cp .env.example .env.local   # then fill in E2E_EMAIL / E2E_PASSWORD
npm run test:e2e
```

Behaviour worth knowing:

- **It skips, loudly and successfully, when the credentials are absent** — so a buyer who just
  unzipped the kit and runs `npm test && npm run test:sql && npm run test:e2e` gets a green
  run instead of a red herring. The skip is printed, not silent.
- **No browser is ever downloaded at install time.** `playwright-core` (no browser bundle) is
  the only dependency added; the suite launches whatever `E2E_CHANNEL` points at. On the
  delivery machine that was Edge (`E2E_CHANNEL=msedge`), because no Chromium existed there.
- **`E2E_*` is never bundled into the frontend.** The names are deliberately not `VITE_`, so
  `npm run build` cannot leak them into `dist/`. The credentials live in `.env.local`, which
  is gitignored.
- It is a **smoke test, not a test suite**: one happy path, asserted honestly. It does not
  cover sign-up, invitations, role changes, stage moves, or error states.

This is the only suite here that exercises the real GoTrue, the real PostgREST and the real
RLS together.

## What is *not* covered

Being explicit about this is more useful than a green tick that implies more than it does.

- **No screen-level or integration tests** — only the Adaptive Field is rendered in jsdom, the
  pages are not. The other suites are pure logic. The browser suite below covers the pages, but
  as a single happy path rather than per-screen assertions.
- **The browser suite is a smoke test, not coverage.** It walks nine routes and one sign-in.
  It does not create a record, invite a member, change a role, move a deal, or exercise a
  single failure path.
- No live Supabase project in CI: no real email confirmation.
- No tablet-width pass, no visual-regression baseline, no axe/accessibility audit.
- No load or performance testing.

Run all three before any release. `npm run build` runs the typechecker but not the tests.

## Adding tests

**Client logic** — put `*.test.ts` beside the source. Assert behaviour a user depends on,
not implementation detail.

**SQL** — add to `static.mjs` when you add a table, function or policy; add to `behavioural.mjs`
when you add a rule about *who can do what*. A new RLS policy without a behavioural test is the
main way a security regression would slip through.

**Browser** — `tests/e2e/smoke.mjs` is a linear script of `step()`/`check()` pairs; append a
step rather than restructuring it. Keep every credential and identifier in the environment.

Run all three suites before any release.

---

© 2026 Noctis Digital Forge. All rights reserved.
