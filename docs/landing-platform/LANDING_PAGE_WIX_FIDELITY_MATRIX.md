# Landing Page — Wix Fidelity Matrix

**Baseline develop:** `2440e6833a2efacb773eb51e19d58086e290f589`
**Companion:** `LANDING_PAGE_WIX_DESIGN_SPEC.md`, `docs/design/IMKAN_PAGE_BY_PAGE_AUDIT.md`
**Fresh authenticated Wix CDP this session:** NOT_TESTED

Legend for Reference: **WD** = Wix Dashboard · **WS** = Wix Studio workspace/editor · **NONE** = IMKAN-only

---

## 1. Platform / account

| Landing screen | Reference | Evidence | Fidelity now | Notes |
|---|---|---|---|---|
| Login | WD | Prior | PARTIAL | Keep IMKAN auth |
| Platform overview | WD | Prior | NEEDS_PASS | Super Admin only |
| Companies | WD | Prior harness | MOSTLY_PASS | |
| Domains | WD | Prior | NEEDS_PASS | |
| My Sites (account) | WS Sites | Docs + prior Studio | MISSING UI | Highest new surface |
| Workspace switcher | WS | Docs | MISSING | Agency |
| Site folders/tags | WS | Docs | MISSING | Phase partner |

---

## 2. Site Dashboard (map of current CPanel)

| Landing screen | Reference | Fidelity | Functional |
|---|---|---|---|
| Home / dashboard | WD | NEEDS_PASS | AVAILABLE |
| Products / categories / brands / inventory | WD | NEEDS_PASS | AVAILABLE |
| Bundles / product settings | WD | NEEDS_PASS | AVAILABLE |
| Orders / delivery / invoices | WD | NEEDS_PASS | AVAILABLE/PARTIAL |
| Contacts / inbox / reviews | WD | NEEDS_PASS | AVAILABLE |
| Marketing (banners, offers, SMS, splash, announcements) | WD | NEEDS_PASS | AVAILABLE |
| SEO settings | WD | NEEDS_PASS | AVAILABLE |
| Analytics family | WD | NEEDS_PASS | PARTIAL |
| Settings / staff / policies / legal / security | WD | NEEDS_PASS | AVAILABLE/PARTIAL |
| Activity log | WD | NEEDS_PASS | AVAILABLE |
| Dropshipping | NONE | N/A | AVAILABLE |
| Coupons / discounts (honesty) | WD | NEEDS_PASS | AVAILABLE behind Soon |

Per-page DevTools capture checklist (when implementing): viewport, sidebar, topbar, gutters, row heights, cards, borders/radius/shadow, type, colors, icons, spacing, selected/hover/focus/disabled, badges, dropdowns/drawers/dialogs/tooltips, loading/empty/error, transitions, expanded nav, RTL, tablet/mobile.

---

## 3. Sites + Studio

| Landing screen | Reference | Fidelity | Functional |
|---|---|---|---|
| `/admin/sites` cards | WS workspace | MOSTLY_PASS | AVAILABLE |
| Create site flow | WS create | PARTIAL | AVAILABLE create |
| Site Dashboard entry | WD Select Site | PARTIAL | Via company scope today |
| Site editor | WS Editor | OUT OF SCOPE restyle | PARTIAL drafts |
| Pages panel | WS | NOT STARTED | MISSING |
| Publish bar | WS | NOT STARTED | MISSING |
| CMS collections | WD/WS | PARTIAL | PARTIAL |

---

## 4. Completion rule (from master fidelity plan)

A page is **not** fidelity-complete until EN/LTR, AR/RTL, 1440/laptop/tablet/390, states, and measured tokens are verified **inside its own phase**. Overall project complete additionally requires live staging comparison after authorized deploy.

**Do not** declare “100% pixel-perfect” without that evidence.
