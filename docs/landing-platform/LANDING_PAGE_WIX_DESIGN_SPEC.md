# Landing Page — Wix Design Spec (Authenticated Surfaces)

**Classification:** DESIGN TOKENS / BEHAVIOR SPEC — PLANNING
**Date:** 2026-09-22
**Scope:** Authenticated Landing Page / CPanel (Wix Dashboard + Wix Studio workspace analogues)
**Not in scope:** Public Wix marketing site; storefront landing fidelity (`specs/003-landing-wix-fidelity`)

### Measurement policy

- Prefer **recorded DevTools / CDP** values.
- Prior measured shell tokens: `docs/design/IMKAN_PAGE_BY_PAGE_AUDIT.md` (Wix Dashboard CDP @ 1440 + IMKAN harness).
- **This planning session did not re-open authenticated Wix** → new screens without prior measure = `NOT_TESTED`.
- Do **not** claim 100% pixel-perfect without live evidence.
- **Fonts:** Do not redistribute proprietary Wix Madefor. Use Helvetica Neue / Helvetica / Inter (EN) and Tajawal / IBM Plex Sans Arabic (AR).

---

## 1. Shell tokens (measured baseline)

| Token | Wix Dashboard (recorded) | Landing Page target | Status |
|---|---|---|---|
| Topbar height | 48px | 48px | LOCK |
| Sidebar width (Dashboard) | 255px | 255px | LOCK |
| Sidebar width (Sites / Studio workspace) | ~228px (IMKAN Sites) | 228–240px Studio white shell | LOCK family |
| Sidebar bg (Dashboard) | `#131720` | `#131720` | LOCK |
| Sidebar bg (Sites) | white | `#FFFFFF` | LOCK |
| Canvas bg | `#F0F4F7` | `#F0F4F7` | LOCK |
| Content gutter | 48px | 48px | LOCK |
| H1 | 28 / 700 / LH 36 `#000624` | same metrics; legal font | LOCK |
| Primary button | H 36, radius 18, `#116DFF` | same | LOCK |
| Compact control | H 30, radius 15 | same | LOCK |
| Card | radius 8, no heavy shadow | same | LOCK |
| Table th | `#F7F8F8`, 14/400/18 | same | LOCK |
| Nav row height | 36px | 36px (sidebar v-align 2026-09-22) | LOCK |
| Nav padding-inline | 18px | 18px | LOCK |
| Nav icon | 18×18 centered | 18×18 | LOCK |
| Nav label line-height | 18px | 18px | LOCK |
| Selected nav (Dashboard) | `#42454C` / `#CFD0D2` | same | LOCK |
| Selected nav (Sites) | blue tint `#A8CAFF` | Studio-only | LOCK |

---

## 2. Interaction states (required on every fidelity pass)

| State | Rule |
|---|---|
| Hover | Subtle fill; do not steal selected style |
| Selected / active | Persistent pill/bar; vertically centered |
| Focus | Visible keyboard focus ring; Escape closes overlays |
| Disabled | Reduced opacity; no click; honest reason when needed |
| Loading | Skeleton / spinner; no fake rows |
| Empty | Illustration optional + one real CTA |
| Error | Inline + banner; server message preserved |
| Dropdown / drawer / dialog | Overlay dim; outside/Escape close; focus trap |
| RTL | Logical properties only; no clip; mirror chevrons |
| Responsive | 1440 · laptop · tablet · 390; no page-level horizontal overflow |

---

## 3. Screen families (token application)

| Family | Reference | Notes |
|---|---|---|
| Dashboard shell | Wix Dashboard | Dark sidebar |
| My Sites / Sites cards | Wix Studio Sites workspace | Light shell; card grid/list |
| Data tables | Wix list managers | Sticky actions, bilingual columns |
| Stacked forms / settings | Wix settings forms | Prefer `.admin-stack-form` patterns |
| Marketing CRUD | Wix marketing | List + editor |
| Analytics | Wix analytics | Shared chrome; honest empty if no data |
| Site editor / Studio | Wix Studio Editor | **Later phases**; do not restyle canvas until approved |

---

## 4. Proprietary asset policy

| Wix asset | Policy |
|---|---|
| Madefor / Wix brand icons packs | Do not copy binary fonts/assets |
| Exact Wix illustrations | Recreate with licensed/own art or abstract empty states |
| Wix copy trademarks in UI | Do not ship “Wix” branding in product chrome |

---

## 5. Evidence gaps to close before fidelity “complete”

1. Re-measure authenticated My Sites / Workspace with CDP after My Sites UI exists.
2. Capture transfer / invite collaborator dialogs (NOT_TESTED this session).
3. Tablet/mobile shell breakpoints refresh on staging after IA change.
4. AR/RTL pass on My Sites + Site switcher (must be in-phase, not deferred).
