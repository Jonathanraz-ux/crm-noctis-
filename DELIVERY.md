# Delivery record — Noctis CRM

What was actually verified before this kit was handed over, and what was not. Written so you
can tell your client the truth instead of guessing from a green build.

**Version 1.0.0 · delivered 2026-09-29**

---

## Verified

| Check | Command | Result |
| ----- | ------- | ------ |
| Typecheck, app | `tsc -p tsconfig.app.json --noEmit` | pass, 0 errors |
| Typecheck, tooling | `tsc -p tsconfig.node.json --noEmit` | pass, 0 errors |
| Production build | `npm run build` | pass, ~22s, largest chunk 394 kB |
| Lint | `npm run lint` | **0 errors**, 4 warnings (see below) |
| Frontend unit tests | `npm test` | **65 passed**, 0 failed, 9 files |
| SQL catalogue audit | `npm run test:sql:static` | **28 passed**, 0 failed |
| SQL behaviour suite | `npm run test:sql:behavioural` | **47 passed**, 0 failed |
| Full SQL suite | `npm run test:sql` | **75 passed**, 0 failed |
| Browser smoke test | `npm run test:e2e` | **55 passed**, 0 failed (see below) |
| Live install + network probe | Management API + PostgREST | **20 passed**, 0 failed (see below) |
| Secret / placeholder scan | manual | no secrets, no absolute paths, no local references |
| Dependency audit | `npm audit` | 2 moderate advisories, both in the `vitest` dev tree |

The 4 lint warnings are all `react-refresh/only-export-components`, on modules that export a
component and a hook or context together (`AuthProvider`, `ThemeProvider`, `ToastProvider`,
`button.tsx`). This is a deliberate trade-off: splitting each provider into two files to
silence a fast-refresh warning would cost readability for no runtime benefit. They are
warnings, not errors, and the build is unaffected.

The SQL suites run the real `0001`–`0008` migrations against a real PostgreSQL instance, so the
RLS policies, trigger guards and audit triggers were exercised as written — not inspected by eye.

## Live install — verified 2026-09-29

The 75 SQL tests prove the rules hold *as SQL*. They do not prove that GoTrue, PostgREST and
RLS agree. That was closed against a **brand-new, empty Supabase project**
(`wkttylhlmkxuxztcjwcg`, eu-north-1).

| Step | Result |
| ---- | ------ |
| Migrations `0001`→`0007` applied whole-file through the Management API | **7/7 OK, no statement skipped** |
| `0008_demo_data.sql` | deliberately not applied to the verification project (covered by the SQL suite) |
| Test account created through GoTrue admin API | pass |
| Workspace seeded as `owner` | pass |
| Second account created with no workspace, then `create_organization` over PostgREST | pass — returns a uuid, creator becomes active `owner` |
| Prospect insert through PostgREST | pass — `created_by` stamped server-side, not taken from the client |
| Audit rows written for `memberships` and `prospects` | pass |

**Tenant isolation, evaluated by PostgREST and not by inspection (20/20 checks):**

| Attempt | Result |
| ------- | ------ |
| A lists its own prospects | sees only its own organization |
| B fetches A's prospect by primary key | 0 rows |
| B lists prospects | only its own organization |
| B reads organizations | A's organization absent |
| B reads A's membership list | 0 rows |
| B inserts a membership into A's organization | `403` |
| B renames A's organization | no rows; A's name unchanged |
| Anonymous key reads prospects | 0 rows |
| A (owner) reads its audit trail | rows present, including the prospect insert |
| B reads audit rows | its own organization only, A's organization 0 rows |

### One installation trap, found here

The membership guard (`guard_membership_write`) blocks **any** direct insert of the first
`owner` — by design, "Only an owner can add another owner." That is correct for the product,
but it means **a scripted install cannot seed the first owner with a plain `insert`**. The kit
ships the intended bypass: `noctis.set_flag('tenant_bootstrap', true)` around the seed
statement (the flag is revoked from `anon`/`authenticated`, so a signed-in user cannot raise
it). The application path is `public.create_organization`, which sets it internally and was
verified over the network.

The two personal access tokens used for this verification (project creation, migrations,
GoTrue admin, `database/query`) were **revoked on 2026-09-29** and confirmed dead — both now
answer `401`. Nothing in this kit needs a privileged token: a buyer configures their own
`.env.local` with a project URL and the publishable anon key, and the setup steps in
`docs/SETUP.md` are dashboard actions, not API calls.

## Browser smoke test — verified 2026-09-29

The app was driven in a real browser (Edge via Playwright) against the live Supabase project,
starting from the login screen. **55 of 55 checks passed**, with zero console errors, zero
uncaught page errors and zero failed API calls.

**The suite ships with this kit** as `npm run test:e2e` (`tests/e2e/smoke.mjs`). It starts its
own Vite server, reads `E2E_EMAIL` / `E2E_PASSWORD` from `.env.local`, and prints a
skipped-but-green result when those are absent, so a fresh checkout never fails for want of
credentials. `playwright-core` (no browser bundle) is a devDependency and **no browser is
downloaded on `npm install`** — the suite launches `E2E_CHANNEL`, which is `msedge` on this
machine. All `E2E_*` variables are deliberately not `VITE_`, so nothing reaches `dist/`.
See `TESTING.md` for the full contract.

| Stage | Checked |
| ----- | ------- |
| Boot | App renders; the "Supabase is not configured yet" notice is **absent** with a real `.env.local` |
| Sign-in form | Email input, password input, submit button all present and visible |
| Adaptive Field | Password reveal toggle flips `type="password"` → `type="text"` |
| Sign-in | Real GoTrue session; leaves `/login`, lands on `/` |
| 9 protected routes | `/`, `/prospects`, `/contacts`, `/pipeline`, `/tasks`, `/members`, `/roles`, `/audit`, `/settings` — each renders, none bounces to `/login`, none hits the ErrorBoundary |
| Responsive | Same signed-in session re-checked at 390×844: app renders, no bounce to `/login`, no stuck onboarding |
| Sign-out | Account menu opens, `Sign out` menu item works, lands back on `/login` |
| Error scans | 0 console errors, 0 uncaught page errors, 0 failed API calls |

### One real bug this found — fixed

`/roles` failed its first run: the permission matrix wrapped each category in
`<tr className="contents">` containing the category row and its permission rows, so a `<tr>`
was nested inside a `<tr>`. React logged *"In HTML, `<tr>` cannot be a child of `<tr>` … This
will cause a hydration error"* on every visit to the screen.

It was invisible to `npm test`, `npm run lint` and `npm run build`, which is the point: a
passing green run cannot catch invalid DOM structure. **Fixed:** the wrapper is now a
`<Fragment>`, so the category header and its permission rows are siblings inside `<tbody>`.

## What a passing test run does and does not prove

The SQL suites prove the security rules hold in the database: cross-tenant reads are refused,
escalation guards block, the last owner cannot be removed, the audit trail fires. That is the
part worth having automated.

They do **not** on their own prove the React app works. Typechecking, linting and unit tests catch
type and logic errors — not rendering errors, not routing mistakes, and not the class of bug where
a screen loads and shows a spinner forever because a query name is wrong.

**Treat "it builds and the tests pass" as necessary, not sufficient.**

This kit closes that gap from both ends: the *backend* has been exercised over the network with
two real accounts (onboarding, isolation, escalation, audit — 20/20), and the *frontend* has been
driven in a real browser through sign-in, nine routes, responsive widths and sign-out (55/55).
That run found one defect every other suite missed. What remains unproven is anything the smoke
test does not reach: form submission flows, invitations, password reset, the email confirmation
round trip, and tablet width.

**Treat the green suites as proof of the parts they cover, and the smoke test as proof of the
parts it walks — nothing more.**

---

## Not verified

None of the following was done, and none of it can be done in this environment:

| Gap | Consequence | Do this before a client sees it |
| --- | ------------ | ------------------------------- |
| **No email confirmation flow** | Both verification accounts were created confirmed, so the real confirm-email → click → session round trip has never been run. | Configure SMTP, then re-enable confirmation and walk sign-up, confirm and reset end to end |
| **Invitations not exercised** | `members.invite`, `claim_pending_invites` and the demo workspace's pending invitation are covered by SQL tests only. No invitation was ever sent or claimed through the UI. | Invite a member, claim it, confirm the role |
| **No screen-level tests** | No page was rendered in jsdom. Only the Adaptive Field is tested at the component level; the other 45 tests are pure logic. | Add React Testing Library tests for the forms |
| **No `supabase start`** | Docker was unavailable. The local-stack path is documented but untested. | Run it locally once |
| **No accessibility audit** | Radix gives reasonable defaults; no axe pass was run. | Run axe in a browser |
| **No performance / load test** | — | Only if the client asks for volume numbers |
| **No tablet width / visual baseline** | The browser pass covers 1440×900 and 390×844 only. | Add a tablet width and screenshot diffs |
| **`npm audit`** | 2 moderate advisories in `@vitest/mocker` / `vitest` (dev-only). Not triaged, not fixed. | Run `npm audit` and triage; do not `--force` without checking for breaking changes |

## Open items for you

Ordered by how much they matter.

1. ~~**Confirm the three service lines in `LICENSE.md` §1.**~~ — **confirmed 2026-09-29.**
   The commercial grant and the three service defaults it carried (**12 months** of updates,
   **90 days** of installation support, refunds per the point of sale) are now yours as
   written. Nothing in the licence is outstanding.
2. **Remove the two URL placeholders** in `src/config/product.ts` (`supportUrl`, `docsUrl`) if
   you want them branded, or leave them — `example.com` is the IANA-reserved documentation
   domain and reads unmistakably as a placeholder.
3. **Run the remaining flows against a real Supabase project:** create a prospect through the
   form, move a deal across stages, invite a member, password reset. Sign-in, the routes,
   sign-out and `create_organization` are done; those four are not. Budget half a day.
4. ~~**Triage the 2 moderate npm advisories.**~~ — **triaged 2026-09-29: accepted.** Both are
   `@vitest/mocker` (transitively `vitest`), a path-traversal in Vitest's *mock redirect* helper.
   Test-runner only, never present in `dist/`, and the only fix is a breaking major
   (`vitest@5`). Revisit when Vitest 5 is adopted; do not `audit fix --force` on a live kit.
5. ~~**Decide whether `docs/` ships to the buyer.**~~ — **yes, ships** (2026-09-29). `README.md`,
   `TESTING.md`, `SECURITY.md`, `LICENSING.md`, `LICENSE.md`, `DELIVERY.md` and `docs/SETUP.md` +
   `docs/CUSTOMIZATION.md` are part of the product.
6. **Point the browser suite at the remaining flows.** It now ships (`npm run test:e2e`) and
   covers the happy path only. The four flows in item 3 are the natural next steps to script
   into `tests/e2e/smoke.mjs`.

## What is deliberately not included

Not oversights — each would need a decision or a service the kit cannot provide alone.

- **File storage.** The kit has no Files feature; nothing to verify. Add it if the client needs
  documents against a prospect.
- **Email templates and SMTP config.** Supabase's built-in email is rate-limited and not for
  production.
- **CSP headers.** Static output; set them at the host.
- **Error reporting, logging, analytics.** Nothing is instrumented.
- **MFA / passkeys UI.** Available in Supabase Auth, not built into the kit.
- **GDPR account deletion and data export.** Needs a scheduled job.
- **i18n.** English only, with the locale centralised in `src/config/product.ts`.

## Included in this kit

- **Multi-tenant CRM schema** — 12 tables, 32 permission codes, 5 roles, RLS on every table,
  trigger guards against escalation, self-removal and identity rewriting, and an append-only
  audit log written by triggers.
- **Noctis Adaptive Field** (`src/components/noctis-field.tsx`) — label, validation message,
  character counter, clear button and password toggle with `aria-describedby` wired for you.
  20 tests cover it.
- **Vitest suite** — 65 tests, of which four independently assert that a crafted `?sort=` cannot
  become SQL, and one asserts that the sign-up error does not reveal that an address exists.
- **SQL suite** — 75 assertions running the real migrations, doubling as executable documentation
  of the security rules.
- **Browser smoke test** (`tests/e2e/smoke.mjs`, `npm run test:e2e`) — 55 checks against the live
  Supabase project, shipped in the package, and the suite that found the nested-`<tr>` bug above.
- **Docs** — `README.md`, `TESTING.md`, `SECURITY.md`, `LICENSING.md`, `LICENSE.md`, and
  `docs/SETUP.md` + `docs/CUSTOMIZATION.md`.

## Supportability

The kit is documented for its own reader, not just its buyer: heavy comments on the
non-obvious decisions, a `docs/` set, and 75 SQL tests that double as executable
documentation of the security rules. Anyone picking this up can follow the reasoning, which
matters more for a product you resell than raw feature count.

---

© 2026 Noctis Digital Forge. All rights reserved.
