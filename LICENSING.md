# Licensing obligations — Noctis CRM

A working checklist for this specific kit: what is yours, what you owe, and what you must not
ship. The legal text is in [`LICENSE.md`](./LICENSE.md); this file is the operational version.

## Summary

| Layer | Origin | Licence | Can you rebrand it? | Must you keep a notice? |
| ----- | ------ | ------- | ------------------- | ---------------------- |
| Kit source, design tokens | Noctis original | **Commercial** | Yes | Yes — the Noctis copyright in your About page or a CREDITS file |
| `src/components/ui/*` (shadcn-derived) | shadcn/ui | MIT | Yes | Yes — MIT notice |
| SQL schema, migrations, RLS policies | Noctis original | **Commercial** | Yes | Yes |
| Tests (`src/**/*.test.ts`, `tests/sql/*`) | Noctis original | **Commercial** | Yes | Yes |
| Node dependencies | Third party | Mostly MIT/ISC | n/a | Only if redistributed as source |

---

## Obligations checklist

- [ ] Keep the `Copyright © 2026 Noctis Digital Forge. All rights reserved.` line in whatever
      page, footer or `CREDITS` file you show your own users.
- [ ] Keep the MIT notices for shadcn/ui, magic-ui and nur-ui in any copy or substantial
      portion you distribute. In practice: ship a `CREDITS.md` listing the upstream projects
      with links and their MIT licence names.
- [ ] Do **not** use Aceternity UI components. Its terms are not a standard OSS licence; the
      kit deliberately contains none. If you add one, read its terms first and register it.
- [ ] Do not rename the kit to strip attribution in a way that hides its origin from
      downstream recipients who received it as source.
- [ ] Do not publish the kit, or a recognisable derivative of it, publicly.
- [ ] Re-check the dependency tree before each release: `npx license-checker --summary`.
- [ ] Keep this file and `LICENSE.md` in the delivered archive.

## Registering new third-party code

If you copy in code from elsewhere, record it in the license register and add a row here. The
rule that matters: **MIT/Apache-2.0/BSD permit commercial reuse and modification with
attribution. "Free" is not a licence category.** A component that merely has no licence
statement is not free to use — it is all rights reserved by default.

---

© 2026 Noctis Digital Forge. All rights reserved.
