# IMKAN Current Problems Register

**Classification:** AUDIT ONLY — do not fix in this pass  
**Date:** 2026-09-19  
**Basis:** repo inspection on `feature/wix-dashboard-ui-fidelity` @ `262f630` + prior live audits + shell/Sites/Companies harness CDP  
**Live staging re-login / full network console sweep:** **NOT_TESTED** this planning pass (staging may still serve pre-fidelity bundle until deploy)

Severity: **BLOCKER** · **HIGH** · **MEDIUM** · **LOW**

---

## Severity totals

| Severity | Count |
|---|---|
| BLOCKER | 5 |
| HIGH | 14 |
| MEDIUM | 16 |
| LOW | 10 |
| **Total** | **45** |

---

## BLOCKER

| ID | Area | Problem | Evidence |
|---|---|---|---|
| B1 | Nav honesty | ~~Coupons + Automatic Discounts Soon~~ **DONE 2026-09-19 (P0)** — real `admin-coupons` / `admin-automatic-discounts` | Was: placeholder nav |
| B2 | Nav honesty | ~~SEO Soon~~ **DONE 2026-09-19 (P0)** — real `admin-seo` → SeoPage | Was: marketing placeholder |
| B3 | Functional | Forms & Submissions storage / submissions inbox remains incomplete vs Wix Forms | Prior gap audit; `admin-forms` thin |
| B4 | Functional | Payment capture / PSP connect not productized (Getting Paid mostly shells) | `tenantManagementRoutes` settings pages; payments placeholders |
| B5 | Foundation UI | ~~EN Products clip / need shared table~~ **DONE 2026-09-19 (Phase A)** — `.admin-data-table-*` + Products wired; **DONE 2026-09-20 (Phase C–I)** catalog/sales/CRM/growth/settings + Companies modules residual closed | Evidence: `evidence-2026-09-19-p0-phase-a/` … `evidence-2026-09-20-phase-i/` |

---

## HIGH

| ID | Area | Problem | Evidence |
|---|---|---|---|
| H1 | Visual | Page-level modules still need Wix token pass (tables/filters/drawers) beyond shell | Forensic: Home/Products partial; **catalog–Settings PASS (Phases C–G)**; **Sites workspace PASS (Phase H)**; **Phase I regression PASS 2026-09-20** — remaining = Stream B / live CDP |
| H2 | Visual | Legacy `global.css` page rules (radii 9–16, shadows, Be Vietnam on body) fight shell unless overridden | `global.css` body font; company-search 38/9; shell overrides PASS; dead `.admin-table*` CSS deferred |
| H3 | Visual | EN/AR table clip / RTL overflow risk on dense sales/catalog tables | **Catalog–Settings + Companies modules on shared system (Phases C–I)**; live CDP still NOT_TESTED |
| H4 | Product | ~~Platform nav has Sites Soon while tenant Sites is real~~ **RESOLVED 2026-09-19** — honest Soon decision kept; placeholder now explains company Sites live under tenant after opening a company + Go to Companies CTA | `AdminPlaceholderPage` `PlatformSitesHonestyContent` |
| H5 | Product | Many `existing()` CRM/analytics/developer screens are thin shells | forms/meetings/pipelines/community/loyalty/automations/CMS |
| H6 | Functional | Automations not a real engine (templates / unsupported actions) | Prior audit + `AdminAutomationsPage` |
| H7 | Functional | Order → inventory lifecycle incomplete | Prior gap audit |
| H8 | Functional | Multi-warehouse / barcode prep / tracking pixels / catalog feeds missing (Digital ops) | Velvet admin gap list |
| H9 | Functional | Site Editor Publish disabled; no publish API | Prior audit; editor **OUT OF SCOPE** but capability gap remains |
| H10 | Functional | CMS create → unsupported / weak persistence | `admin-website-content-cms` |
| H11 | UX | Analytics session recordings / benchmarks likely non-operational shells | nav existing + thin pages |
| H12 | Deploy | Fidelity branch not on staging — live pixel proof blocked | Staging still pre-branch historically |
| H13 | Interaction | Per-control hover/focus/modal timings vs Wix **NOT_TESTED** page-by-page | Planning scope |
| H14 | A11y/KB | Focus rings / keyboard for custom menus inconsistent outside AdminLayout popovers | Code review risk |

---

## MEDIUM

| ID | Area | Problem | Evidence |
|---|---|---|---|
| M1 | Visual | ~~Sites card ~229 vs 211.8~~ **DONE 2026-09-19 / Phase H 2026-09-20** — fixed thumb 138.375 → **211.375px** (Δ −0.425); wider columns no longer inflate height | `evidence-2026-09-20-phase-h/MEASUREMENTS.json` |
| M2 | Visual | ~~Memberships residual global.css spacers possible on rare widgets~~ **DONE 2026-09-19** — memberships overrides strengthened with `!important` under `.admin-studio-shell.admin-platform`; table migrated to shared admin-data-table | `dashboard-shell.css` Phase B |
| M3 | Visual | Inconsistent card shadows still appear in some page CSS | global.css company-card hover legacy |
| M4 | Nav | Duplicate / overlapping Website vs Site & Mobile groups | `tenantNavigation` |
| M5 | Nav | ~~“Wix Logs” labeling under Developer Tools~~ **DONE 2026-09-20 (Phase G)** — nav/title/breadcrumb = Site Logs; legacy `/wix-logs` URL kept | `admin-developer-site-logs` |
| M6 | Product | Settings Getting Paid / Tax / Checkout / Shipping mostly stub sections | `tenantManagementRoutes` |
| M7 | Product | Booking module present but fidelity + completeness uneven | bookings routes |
| M8 | Product | Dropshipping suite exists but outside Wix map (IMKAN-specific) | dropshipping routes |
| M9 | Responsive | IDE Emulation stuck (~980) — 390 evidence relies on CSS/iframe | Harness session |
| M10 | i18n | Arabic label length may wrap toolbars on 390 | Risk; NOT_TESTED live |
| M11 | API | Some pages `permissions: null` → role-only gate (homepage offers, settings) | `roles.js` |
| M12 | UX | Empty states inconsistent (illustration vs plain text) | Multiple Admin* pages |
| M13 | UX | Loading skeletons rare; many pages use plain text busy | Pattern review |
| M14 | Visual | Topbar search vs in-page search styling drift on unported pages | Companies fixed; others pending |
| M15 | Product | Multilingual page thin vs Wix multilingual | `admin-website-content-multilingual` |
| M16 | Docs | Old feature-gap counts (25/10/33) stale vs develop | This audit supersedes |

---

## LOW

| ID | Area | Problem | Evidence |
|---|---|---|---|
| L1 | Product | AI Agents / App Market / Gift cards / POS placeholders | Honest Soon — keep |
| L2 | Product | Platform Templates / Client Kits placeholders | Keep honest |
| L3 | Copy | Placeholder “Soon” bilingual OK but overused for real modules (see B1/B2) | Nav |
| L4 | Visual | Icon size 18 vs occasional 16/21 in Quick Actions | AdminLayout |
| L5 | Visual | Dark mode admin theme not Wix-referenced | `admin-dark` |
| L6 | Perf | Large `global.css` / bundle size warnings on staging build | vite chunk warning |
| L7 | DX | Temporary measure HTML harnesses must not ship | deleted / not committed |
| L8 | Nav | Utility Upgrade/AI/Help placeholders | utilityNavigation |
| L9 | Product | Video live stream / channels placeholders | tenant-video |
| L10 | Product | Abandoned carts / subscriptions placeholders | sales group |

---

## Console / API error hunting (status)

| Check | Status |
|---|---|
| Authenticated staging network waterfall for all routes | **NOT_TESTED** this pass |
| Known historical coupon/site-editor API behavior | Coupons API real; site-editor drafts real; Publish missing |
| Repo route ↔ API mount consistency for catalog/sales/sites/SEO | **Inspected** — aligned for AVAILABLE modules |

---

## What this register is not

- Not a commit to fix anything
- Not a claim that every HIGH is reproducible on staging today
- Not permission to touch Production or the Website Studio editor
