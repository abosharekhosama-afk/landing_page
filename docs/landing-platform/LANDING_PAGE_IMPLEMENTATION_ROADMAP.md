# Landing Page — Implementation Roadmap

**Derived from evidence** (not a blind copy of the prompt’s phase list).
**Baseline:** `2440e6833a2efacb773eb51e19d58086e290f589`

---

## Phase overview

| Phase | Name | Outcome | Depends on |
|---|---|---|---|
| **0** | Architecture lock + honesty | Ratified hierarchy; nav honesty (coupons/SEO); compatibility rules in constitution/spec | — |
| **1** | Account → My Sites foundation | Post-login My Sites; site cards; open dashboard/edit; no break to company entry | 0 |
| **2** | Site context + Site Dashboard formalization | Persistent site context in shell; modules IA cleanup; site switcher | 1 |
| **3** | Collaborators + permissions UX | Invite flows; role mapping UI; site seats (additive) | 2 |
| **4** | Partner / Workspace | Workspaces, folders/tags, client handoff prep | 1–2 |
| **5** | Subscription-ready entitlements | Plan/entitlement schema; Super Admin stub; grandfather existing | 0–2 |
| **6** | Pages + publishing foundation | `company_pages` / versions; preview; publish **gated**; no canvas rewrite | 2 |
| **7** | Website Studio builder foundation | Canvas/sections/breakpoints incremental | 6 |
| **8** | CMS / dynamic content | Collections + dynamic pages | 6–7 |
| **9** | Commerce/site integration | Product blocks; optional site assortment **only if required** | 2, 6 |
| **10** | Velvet Digital parity closure | Warehouses/pixels/merch SF/ops extras per inventory | 2+ |
| **11** | Wix fidelity closure | Measured page-family passes EN/AR/responsive | Parallel from 2 |

---

## Recommended first implementation phase

**Phase 0 → Phase 1 (My Sites foundation)** after architecture ratification.

**Do not** start Studio canvas or domain cutover first.

---

## First branch / task

| Item | Value |
|---|---|
| Branch | `feature/landing-page-phase0-architecture-lock` then `feature/landing-page-phase1-my-sites` |
| From | Latest `manager/develop` |
| Spec Kit | Smallest feature: “Account My Sites + site context entry” |
| Worker | OpenCode `imkan-coder` for implementation after approval |
| Explicitly out of scope for first ship | Publish engine, workspace agencies, billing, canvas redesign |

---

## Parallelism (safe)

| Track | Can parallel after Phase 0 |
|---|---|
| Nav honesty + fidelity shell polish | Yes (frontend) |
| Entitlement schema design docs/API stubs | Yes (backend) — no paywall |
| Velvet SF merchandising | Yes (storefront repo) if isolated |
| Studio pages model spike | Design-only until Phase 6 |
| Domain site_id design | Design-only; no cutover |

Avoid two owners on `AdminLayout.jsx` / `adminNavigation.js` / `moduleRegistry.js` simultaneously.

---

## Effort bands (order-of-magnitude)

Assumes mid-level engineers familiar with repo; calendar time includes review/QA, not pure coding hours.

| Scope | 1 developer | 3 developers | 5 developers |
|---|---|---|---|
| Phase 0–1 My Sites | 6–10 weeks | 3–5 weeks | 2–4 weeks |
| Through Phase 2–3 (site context + collaborators) | 4–6 months | 2–3 months | 6–10 weeks |
| Through Phase 5 entitlements (no billing) | +4–8 weeks | +2–4 weeks | +2–3 weeks |
| Pages + publish foundation (Phase 6) | 2–3 months | 5–8 weeks | 4–6 weeks |
| Studio builder usable (Phase 7) | 6–12 months | 4–7 months | 3–5 months |
| Full DoD (Studio+CMS+Velvet+fidelity+billing-ready) | 18–30 months | 10–16 months | 8–12 months |

**Confidence:** MEDIUM — Studio and payments dominate variance.
