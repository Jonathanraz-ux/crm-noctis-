# Customization — Noctis CRM

Where to change things, in the order you will need them.

---

## 1. Rebrand — `src/config/product.ts`

One file, plain data, no component edits:

```ts
export const product = {
  name: 'Acme CRM',
  shortName: 'Acme',
  tagline: 'Sales for Acme',
  description: 'The Acme sales team pipeline.',
  supportUrl: 'https://acme.example.com/support',   // ← replace the example.com placeholders
  docsUrl: 'https://acme.example.com/docs',
} as const;

export const defaults = {
  locale: 'en-GB',
  currency: 'EUR',
  timezone: 'Europe/Paris',
} as const;
```

`locale` and `currency` drive every `format*` helper in `src/lib/format.ts`. Changing them
here changes the whole app.

The same file also holds the **CRM domains** — prospect sources and statuses, deal stages,
task statuses and priorities — each with a label map next to it. Renaming a stage label or
adding a source is a data edit here, not a component edit. `ROLE_KEYS`, `ROLE_LABELS` and
`ORG_ADMIN_ROLES` live here too.

Also update:

| Where | What |
| ----- | ---- |
| `index.html` | `<title>`, meta description, favicon |
| `src/providers/ThemeProvider.tsx` | theme name as it appears in the switcher, if not generic |
| `public/` | `favicon.svg`, `og-image.png` |
| `src/config/product.ts` → `storageKeys` | change the `noctis-crm.` prefix **only** if you will run several Noctis kits on one domain; leave it alone otherwise |

## 2. Theme and design tokens — `src/styles/index.css`

The palette is defined as CSS custom properties at the top of the file, in two blocks
(`:root` and `.dark`). Change a token and every button, badge, border and chart in the app
follows.

```css
:root {
  --color-primary: oklch(0.55 0.20 265);
  --color-success: oklch(0.65 0.17 150);
  /* … */
}
```

Utilities like `bg-primary-soft` are derived from the same tokens, so you get a consistent
hover and muted state for free. **Do not hard-code a hex value in a component** — that is how
a rebrand turns into a hunt through 60 files.

Dark mode is class-based, driven by `ThemeProvider` and persisted to `localStorage`.

## 3. The Noctis Adaptive Field

`src/components/noctis-field.tsx` is a self-contained input: it owns its label, validation
message, character counter, clear button and password toggle, and wires up
`aria-describedby` / `aria-invalid` for you. Reach for it instead of a bare `Input` on any
form a human has to fill in.

```tsx
<NoctisField
  label="Company name"
  required
  fullWidth
  showCharacterCount
  maxLength={120}
  clearable
  value={value}
  onChange={(next) => setValue(next)}
  errorMessage={error}
  helperText="As it appears on invoices."
/>
```

**Message precedence is error > success > helper.** A field that is both valid and under a
character minimum shows neither the minimum nor the tick — it shows the error. That is
intentional; a hint that competes with a complaint gets ignored.

Two integration notes, both learned the hard way:

- The field is **controlled** (`value` + `onChange`), so with React Hook Form you need
  `Controller`, not `register`. See `SignInPage.tsx` for the pattern. `register` hands out a
  DOM ref and an event-based `onChange`; the two contracts are not interchangeable.
- `onChange` receives the **raw value first**, then the native event, which is omitted when the
  field is cleared (a button click has no change event). That ordering exists so a caller can
  never accidentally read the previous value out of a pooled event.

`Input`, `Select` and `Textarea` in `src/components/ui/input.tsx` remain the right choice for a
search box inside a toolbar or a field inside a dialog, where a visible label would be noise.

## 4. Change the data model

`prospects` is the most complete worked example — a tenant table with an owner, statuses,
CSV export, list/detail/form screens and tests. To add or reshape an entity:

1. **SQL** — create your table with an `organization_id`, then add RLS policies modelled on
   `0004_rls_core.sql`. Every tenant table needs them, or it is a cross-tenant leak. Add the
   audit trigger from `0005_triggers_and_guards.sql` if changes should be logged.
2. **Types** — mirror the table in `src/lib/types/database.ts`. That file is hand-written, so
   nothing updates it for you. A mismatch shows up as a type error, which is the point.
3. **Service** — `src/features/prospects/prospects.service.ts` is the data access layer. Keep
   queries there, never in a component. The sort-column allowlist lives in the same file.
4. **Hooks** — `prospects.hooks.ts` wraps the service in TanStack Query. Copy the pattern; do
   not call the service directly from a component.
5. **Screens** — the list page, detail drawer and form dialog, plus the generic
   `components/data-table.tsx`.
6. **Schema** — `src/lib/validation.ts`.
7. **Export** — `src/lib/csv.ts` (`toCsv` / `downloadTable`) if the entity should export.
8. **Tests** — update the unit tests and add a static + behavioural SQL test for the new
   table's RLS.

`data-table.tsx` is generic over `T extends { id: string } & Record<string, unknown>`. If your
entity has the same shape of fields, you can reuse it unchanged.

## 5. Add a permission or role

Permissions are data, not code, so the client picks them up automatically.

1. Add the permission code to the `permissions` insert in `0007_reference_data.sql`
   (`'deals.approve'` — `<domain>.<action>`).
2. Grant it to the relevant roles in the same file.
3. Read it in the client:

```tsx
const { can } = useAuth();
{can('deals.approve') && <Button>Approve</Button>}
```

4. **Enforce it in SQL too.** A permission that only hides a button is not a permission. Add
   the RLS policy or the guard trigger that makes it real, and add a behavioural test.

`ORG_ADMIN_ROLES` in `src/config/product.ts` gates the Members and Roles screens. Roles added
in the database appear in the role matrix screen without a code change.

## 6. Add a screen

1. `src/app/pages/YourPage.tsx` — export the page as a **named** export, not default.
2. `src/app/App.tsx` — `lazy(() => import('./pages/YourPage').then((m) => ({ default: m.YourPage })))`
   and add a `<Route>`. Lazy-load it; the bundle is already split per screen.
3. Navigation entry in the `NAV_ITEMS` list in `src/app/AppLayout.tsx`.

## 7. Replace the demo auth screens

The auth pages are ordinary forms built on React Hook Form and Zod. To change copy, edit
`src/app/pages/SignInPage.tsx` and friends. To change behaviour, the calls are in
`providers/AuthProvider.tsx` (`signIn`, `signUp`, `signOut`, `resetPassword`). For OAuth or
magic links, add the provider in Supabase and call `supabase.auth.signInWithOAuth` from there.

## 8. Remove something

| To remove | Do this |
| --------- | ------- |
| Demo workspace | Skip `0008_demo_data.sql`, or run `supabase/remove-demo-data.sql` |
| The Pipeline feature | Delete `src/features/pipeline`, the route in `App.tsx`, the nav entry, and the `deals.*` permissions from `0007` |
| Demo data but keep the app working | Leave the table, remove the seed |

## 9. Deploying under a sub-path

Set `VITE_BASE_PATH=/crm` and give the router the same `basename`. Both must match or
assets 404 and routes resolve wrongly.

---

## Conventions worth keeping

These are not arbitrary; each one exists because breaking it caused a bug.

- **Feature folders own their data access.** Components never call Supabase directly.
- **Named exports from pages**, because the lazy import maps them to `default`.
- **Database types are hand-written.** If you change the schema, change that file.
- **No hard-coded colours or locale strings** in components — use the tokens and helpers.
- **Every RLS policy needs a behavioural test.** That is the regression guard.
- **Never `console.log` a user or session object**; it ends up in your error reporter.

---

© 2026 Noctis Digital Forge. All rights reserved.
