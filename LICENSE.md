# Licence — Noctis CRM

> This file records the licensing *position* of every component and the attributions you are
> obliged to keep. The commercial terms granted to the buyer are in §1 below. The upstream
> licence obligations — which survive any commercial grant — are in §2 and are not ours to
> waive. See [`DELIVERY.md`](./DELIVERY.md) for what has and has not been verified.

---

## 1. This kit

Noctis CRM — a React 19 + Supabase CRM starter, plus its design tokens and
original components.

**Copyright © 2026 Noctis Digital Forge. All rights reserved.**

These files are **not open source** and are not covered by an OSI or FSF licence. The source
is provided under the commercial licence granted to you as the buyer. Absent that grant:

- you may not copy, modify, sublicense, resell, or redistribute the source or any substantial
  part of it, in original or modified form;
- you may not publish it, in whole or in part, as a template, starter, tutorial or open-source
  project;
- you may not use it to build a competing product that is distributed to third parties.

### Commercial grant

On payment, Noctis Digital Forge grants the purchasing **organisation** — not an individual —
a non-exclusive, perpetual, worldwide licence to use, copy and modify this kit's source in
order to build and run applications for that organisation and for its own clients.

**What is granted**

- **Seats: unlimited.** Everyone employed or contracted by the purchasing organisation may
  access and modify the source. No per-seat counting, no per-developer fee.
- **Projects: unlimited.** The organisation may build, deploy and operate any number of
  applications from the kit, including applications it is paid to build for its clients.
- **Modification: permitted.** The organisation may change any part of the source, add to it
  and drop what it does not need. Modified source remains under this licence.

**What is not granted**

- The organisation may not resell, sublicense, share or otherwise distribute this kit's
  source, or any recognisable part of it, to a third party — except as compiled, running
  applications delivered to its own clients.
- The organisation may not publish this kit or a recognisable derivative of it, publicly or
  in confidence, as a template, starter, boilerplate, tutorial or open-source project.
- The organisation may not use this kit as the basis of a competing product distributed to
  third parties.
- This licence is not transferable to another legal entity without written consent.

**Service terms.** Updates released within **12 months** of purchase are included; after that
period no further updates are promised. Installation and set-up questions are answered by
email for **90 days** from purchase. Custom development, feature work and hosting are not
included. Refund terms are those stated at the point of sale.

Nothing above limits §4 (no warranty) or the obligations in §2, which come from the upstream
authors and survive this grant.

---

## 2. What you must keep

Even under a commercial licence, these obligations survive, because they belong to the
upstream authors:

| Component | Licence | Obligation |
| --------- | ------- | ---------- |
| shadcn/ui | MIT | Retain copyright + permission notice in copies/substantial portions |
| magic-ui | MIT | Retain copyright + permission notice |
| nur-ui | MIT | Retain copyright + permission notice |
| Aceternity UI | **Custom commercial terms** | **Not used.** Do not copy its components without reading its terms |

The upstream licence texts are kept in the Noctis Foundry license register
(`Noctis-Foundry/99-LICENSES/`) and the originating projects are the authoritative source.
The components in `src/components/ui/` are shadcn/ui-derived and remain under shadcn/ui's MIT
licence regardless of this kit's commercial terms.

`src/styles/index.css` encodes design tokens that are Noctis originals and fall under §1.

---

## 3. Dependencies

Runtime and build dependencies are declared in `package.json` with pinned version ranges, and
their licence metadata is available there. As of this delivery the tree is dominated by MIT
and ISC licensed packages (React, Vite, TypeScript, Supabase, TanStack Query, Zod, Radix UI,
date-fns, Tailwind CSS, Vitest).

Run `npx license-checker --summary` to regenerate the authoritative list before each release,
and review any new dependency that is not MIT, ISC, Apache-2.0 or BSD.

---

## 4. No warranty

The kit is provided "as is", without warranty of any kind, express or implied, including the
implied warranties of merchantability, fitness for a particular purpose and non-infringement.
The buyer is responsible for testing, hardening and operating the deployed application.

---

## 5. Trademarks

"Noctis", "Noctis Digital Forge" and related marks are the property of Noctis Digital Forge.
This licence grants no trademark rights. Do not use the names in your product's name, domain
or marketing in a way that suggests endorsement.

---

© 2026 Noctis Digital Forge. All rights reserved.
