# IMKAN × Wix / Wix Studio — Master Fidelity Plan

**Classification:** PLANNING ONLY — **STOP for approval before coding**  
**Revised:** 2026-09-19 (EN/AR/responsive-in-phase · route reconciliation · family estimates)  
**Branch context:** `feature/wix-dashboard-ui-fidelity` @ `262f630`  
**Develop baseline ancestry:** `a7c8191`  
**Companion docs:**
- `IMKAN_PAGE_BY_PAGE_AUDIT.md`
- `IMKAN_CURRENT_PROBLEMS.md`
- `IMKAN_FEATURE_GAP_CURRENT.md`
- `_route_classification.json` (machine classification)

**Explicitly excluded until separate approval:** Website Studio visual editor / canvas / Add / Layers / drag-drop.

---

## 1. Goal

Authenticated IMKAN CPanel must **feel and behave** like approved references while preserving IMKAN data and Digital-derived capabilities (without cloning Digital `?app=` / SQL / PHP / htaccess).

| Area | Reference |
|---|---|
| Platform + company business modules | **Wix Dashboard** |
| Sites workspace (cards / site mgmt overview) | **Wix Studio Workspace** |
| Multi-warehouse, barcode, pixels, merchandising ops | **Digital** inspiration only |

---

## 2. Fidelity completion rule (mandatory)

A page is **NOT complete** until **all** of the following are verified **inside its own implementation phase** (not deferred to Phase I):

1. Correct Wix / Wix Studio reference chosen  
2. DevTools Computed values recorded (no invented pixels)  
3. Typography · colors · spacing · dimensions · borders/radius/shadow  
4. Controls + hover / focus / active  
5. Dropdown / modal / drawer behavior (only for real actions)  
6. Loading / empty / error states  
7. **English / LTR**  
8. **Arabic / RTL** (logical CSS; no clip)  
9. **Responsive:** 1440 · laptop · tablet · **390** — no page-level horizontal overflow  
10. Tests + `build:staging` + `git diff --check` clean for touched scope  

**Overall pixel-fidelity project complete** additionally requires live staging comparison after merge/deploy (separate approval).

---

## 3. Route count reconciliation

Raw inventory must **not** drive effort. Classification of every inventory row:

| Kind | Count | Meaning |
|---|---|---|
| **UNIQUE_REAL_PAGE** | **52** | Distinct implementable screens (includes 1 editor) |
| **NESTED_DETAIL_ROUTE** | **48** | New/edit/detail/settings-child/analytics-child — **derivatives** of a family |
| **PLACEHOLDER_SOON** | **65** | Honest (or dishonest) coming-soon nav rows |
| **ROUTE_ALIAS** | **2** | e.g. `admin-employees` → `admin-staff`; `admin-products-edit` → `admin-products-new` |
| **DUPLICATE_INVENTORY_ROW** | **1** | Same path counted twice in inventory |
| **NON_PAGE_ROUTE** | **2** | Login / no-access |
| **Inventory rows (sum)** | **170** | Prior “168” was unreconciled raw dump |
| **Unique `/admin` paths** | **166** | Paths, not unique UX |

### Reference split of UNIQUE_REAL_PAGE (52)

| Reference | Count |
|---|---|
| Wix Dashboard | **50** |
| Wix Studio Workspace | **1** (`/admin/sites`) |
| OUT OF SCOPE (editor) | **1** (`/admin/site-editor`) |

### Effort base (UI)

| Base | Count | Use |
|---|---|---|
| UI primary screens (exclude editor) | **51** | Family estimation input |
| Nested derivatives | **48** | Cost as **derivatives**, not full pages |
| Placeholders (skip UI except P0 honesty flips) | **65** | No fidelity work except reclassify real ones |

**Dishonest placeholders (functional today — P0):** Coupons, Automatic Discounts, SEO & GEO.

---

## 4. Page families (effort unit — not route count)

| Family | Unique layouts | Derivative pages | Shared work | 1-dev realistic wd |
|---|---|---|---|---|
| **Dashboard shell** | 1 (shell) | Home/overview skins | tokens, typography, focus, empty/loading | 2 (close-out) |
| **Bilingual data table system** | 1 system | All table pages | EN/AR scroll, column min/max, sticky Actions, toolbar wrap, 390 | **6** (Foundation) |
| **Platform administration** | 2–3 (overview, companies*, domains) | memberships panel* | cards + tables | 3 (*mostly done) |
| **Catalog / sales / CRM tables** | 3 layouts (list table, trash, simple list) | ~12 primaries + new/edit | consume table system | 12 |
| **Discount managers** | 1 (reuse table) | coupons + automatic | P0 nav + style | 2 |
| **Forms / settings** | 2 (settings hub, stacked form) | product-settings, security, policies, staff, settings-* | form chrome | 8 |
| **Marketing / merchandising CRUD** | 1 list+form | banners, offers, SMS, media, texts, … | CRUD chrome | 7 |
| **SEO settings** | 1 form | — | P0 nav + form tokens | 1.5 |
| **Analytics suite** | 1 chrome | 8 nested analytics routes | shared analytics shell | 6 |
| **CRM thin shells** | 1 empty/partial | forms/meetings/pipelines/… | honest empty | 4 |
| **Bookings** | 2 (calendar, list) | work schedule, analytics | calendar chrome | 5 |
| **Studio Sites cards** | 1 | — | polish residuals | 2 |
| **Website CMS / automations thin** | 1 | CMS, multilingual, automations | honest PARTIAL UI | 3 |
| **Developer / ops / dropshipping** | 1–2 | dropshipping children | lower priority | 5 |
| **Modals / drawers (shared)** | 1 kit | used everywhere | Foundation | (in Foundation) |
| **Phase I regression only** | — | all touched | consistency sweep | 5 |

**Do not** multiply full-page cost × 166 paths. Derivatives ≈ **0.25–0.5×** of a unique layout once the family exists.

---

## 5. Bilingual table system (Foundation requirement)

Observed: English Products clips right-side columns/actions; Arabic often fits better.

**Phase A must ship a reusable table system** (not a Products-only hack) that handles:

- EN/LTR and AR/RTL (logical properties)
- Intentional horizontal scroll **inside** the table region when needed
- Optional sticky / accessible Actions column
- Column min/max widths
- **No** accidental page-level overflow
- Responsive toolbar (wrap / collapse filters)
- Laptop / tablet / 390 behavior

**Consumers:** Products, Orders, Contacts, Inventory, Companies, Domains, Bundles, Reviews, Inbox lists, Coupons, Automatic Discounts, and other data tables.

---

## 6. Revised phase structure

**Rule change:** Every phase’s page work includes **EN + AR + 1440/laptop/tablet/390** before the page can be marked complete.

### Phase P0 — Nav honesty (first slice)

| | |
|---|---|
| Scope | Coupons, Automatic Discounts, SEO — **only if** repo confirms managers/APIs are functional (confirmed: `DiscountCouponManagers`, coupons/discounts APIs, `SeoPage` + SEO tests) |
| Work | Flip `placeholder` → `existing` (or equivalent), remove false Soon, keep incomplete modules Soon |
| EN/AR/responsive | Nav labels both locales; no layout regression |
| Effort | **0.5 / 1.5 / 3** wd |
| Out | Do not expose incomplete modules |

### Phase A — Foundation

| | |
|---|---|
| Scope | Shell token close-out + **bilingual table system** + shared form/button/empty/loading/focus + modal/drawer primitives |
| Files (typical) | `dashboard-shell.css`, shared table component/CSS, `AdminLayout` only if needed |
| EN/AR/responsive | Shell + **table demo harness** at 1440 & 390 both locales |
| Effort | **4 / 8 / 12** wd |
| Done when | Table system reusable; no Be Vietnam under shell; Products clipping reproducible and fixed **via system** |

### Phase B — Platform

| | |
|---|---|
| Scope | Overview, Domains, Companies polish (memberships residual), Platform Sites honesty decision |
| Reference | Dashboard |
| EN/AR/responsive | Per page in-phase |
| Effort | **2 / 4 / 7** wd |

### Phase C — Catalog

| | |
|---|---|
| Scope | Products, Bundles, Categories, Brands, Inventory, Product Settings, Trash, Coupons, Automatic Discounts |
| Reference | Dashboard |
| Depends | **Phase A table system** + P0 honesty |
| EN/AR/responsive | Each page in-phase (especially Products EN clip) |
| Effort | **8 / 14 / 22** wd |

### Phase D — Sales

| | |
|---|---|
| Scope | Orders, Delivery, Invoices (UI only; lifecycle/barcode = Stream B) |
| Effort | **5 / 9 / 14** wd |

### Phase E — CRM

| | |
|---|---|
| Scope | Contacts, Inbox, Reviews, Staff; Forms UI honest until Stream B storage |
| Effort | **5 / 9 / 14** wd |

### Phase F — Growth / Analytics / SEO polish

| | |
|---|---|
| Scope | Banners, announcements, splash, SMS, homepage offers, website texts/media, SEO form polish, analytics suite chrome |
| Effort | **6 / 11 / 17** wd |

### Phase G — Settings / ops

| | |
|---|---|
| Scope | Settings hub + real panels; security/policies/legal; automations honesty; developer rename; dropshipping polish optional |
| Effort | **4 / 8 / 12** wd |

### Phase H — Sites Workspace polish

| | |
|---|---|
| Scope | Studio cards residual (height/thumbs); **not** editor |
| Effort | **1 / 2 / 4** wd |

### Phase I — Final regression / consistency sweep ONLY

| | |
|---|---|
| Scope | Cross-page consistency, token drift, EN/AR edge cases, 390 spot-check matrix, staging live compare **after deploy approval** |
| **Not** | First-time bilingual/responsive implementation |
| Effort | **3 / 5 / 8** wd |

---

## 7. Time estimates (working days)

Assumptions: vibe-coding + shared families; mid/senior familiar with repo; includes in-phase EN/AR/responsive; excludes PSP vendor wait and Studio builder; high-risk includes RTL table debt and staging churn.

### A. UI / UX fidelity only (P0 + A–I)

| | 1 developer | 3 developers (calendar) | 4 developers (calendar) |
|---|---|---|---|
| Optimistic | **38** | **16** | **13** |
| **Realistic** | **58** | **26** | **21** |
| High-risk | **90** | **40** | **32** |

Roll-up (1-dev realistic): P0 1.5 + A 8 + B 4 + C 14 + D 9 + E 9 + F 11 + G 8 + H 2 + I 5 ≈ **71.5** then family-reuse efficiency → **~58**.

### B. UI + functional product gaps (still excluding Studio builder)

| | 1 developer | 3 developers | 4 developers |
|---|---|---|---|
| Optimistic | **120** | **55** | **45** |
| **Realistic** | **200** | **90** | **75** |
| High-risk | **320** | **145** | **120** |

### C. Including Website Studio (informational only)

| | 1 developer |
|---|---|
| Realistic | **340+** |
| High-risk | **520+** |

---

## 8. Recommended team parallelization (no overlapping files)

After **P0** (single owner) and **Phase A** (single owner — table system is choke point):

| Dev | Owns (phases) | Primary files (avoid overlap) |
|---|---|---|
| **Dev 1** | A (done) → C Products/Inventory/Trash → D Orders | `dashboard-shell.css` / table system · catalog products/inventory · orders |
| **Dev 2** | C Bundles/Categories/Brands/Discounts → F marketing | bundles/categories/brands · discount managers · banners/offers/SMS |
| **Dev 3** | B Platform → E CRM → H Sites polish | platform pages · contacts/inbox/reviews · `AdminSitesPage` / sites CSS |
| **Dev 4** (if 4) | F Analytics/SEO polish → G Settings/ops | analytics pages · settings · security/policies · developer tools |

**Serialize:** Phase A table system before any table page.  
**Serialize:** P0 nav edits in `adminNavigation.js` (one owner).  
**Avoid:** two people editing `global.css` or `dashboard-shell.css` same day without partition (tokens vs page blocks).

---

## 9. Exact scopes for next slices

### P0 — Nav honesty

- Files: `cpanel/src/data/adminNavigation.js` (+ tests asserting no Soon on real modules)
- Coupons + Automatic Discounts + SEO → `existing()` / real paths; bilingual labels unchanged in meaning
- Do **not** flip incomplete placeholders

### Phase A — Foundation

- Shell leak close-out
- **Reusable bilingual table system** (EN clip fix for Products via system)
- Shared control/empty/loading/focus/modal primitives
- Harness or tests proving EN+AR+390 table behavior

### Phase C — Catalog

- Products, Bundles, Categories, Brands, Inventory, Product Settings, Trash
- Coupons + Automatic Discounts UI on table system
- Each page: full completion rule including EN/AR/responsive

---

## 10. Remaining blockers (planning)

1. **Phase A table system** is the critical path for Catalog/Sales/CRM  
2. Staging live pixel proof blocked until **deploy approval** (not assumed)  
3. Dishonest Soon on coupons/SEO until P0  
4. Studio editor remains out of scope (Publish etc. stay functional gaps, not this UI epic)  
5. Many CRM/analytics screens are PARTIAL shells — fidelity must stay honest (no fake data)

---

## 11. Approval gate

**STOP.** No coding until approval of:

- EN/AR/responsive-in-every-phase rule  
- Reconciled route counts (effort on **families**, not 166 paths)  
- Foundation bilingual table system  
- Realistic **58 wd** (1-dev UI) / **26 wd** calendar (3-dev) / **21 wd** (4-dev)  
- First slices: **P0 → A → C**

---

## DONE — P0 + Phase A (2026-09-19)
- **P0 Navigation Honesty:** Coupons (`admin-coupons`), Automatic Discounts (`admin-automatic-discounts`), SEO (`admin-seo`) are real nav destinations with managers/APIs/permissions; Soon/placeholder removed for these only. Legacy placeholder keys canonicalize via `cpanelAccess`.
- **Phase A Foundation:** shared `.admin-data-table-*` tokens (wrap scroll, sticky `inset-inline-end` Actions, cell clip, toolbar/empty/loading/error, 720/390 breakpoints); Products table rewired to shared system (no Products-only hack); EN/LTR + AR/RTL via logical properties.
- **Sites card height (DevTools):** at 246px grid min → **211.38px** (reference **211.8**, Δ **−0.43px**; prior ~229). Initials placeholder only when no preview URL. Evidence: `docs/design/evidence-2026-09-19-p0-phase-a/`.
### Remaining mismatches
- Coupons / Automatic Discounts still render on legacy `catalog-table` chrome (shared `admin-data-table` adoption deferred to later catalog fidelity phase)
- SEO page previews/assistant keep bespoke marketing layout (not table-based by design)
- Wider Sites cards scale with 16/9 thumb (height grows with card width; 211.38 is at 246px min column)
- Live authenticated Products page EN clip regression on staging not re-checked in this pass (CSS fixture + unit tests PASS; live EN/AR E2E = NOT_TESTED without staging deploy)
### Next phase
- **Phase B — Platform** per this master plan (Companies polish family next after Foundation)

---

## DONE — Phase B Platform (2026-09-20)
- **Overview** (`AdminPlatformOverview.jsx`): bilingual loading / access-denied / empty copy; inline logo style replaced with `.platform-recent-logo` class; Space key added to recent-item keyboard activation; `totalMembers` stays honest `-` (no invented administrator count). CSS moved under `.admin-studio-shell.admin-platform` in `dashboard-shell.css` with Dashboard tokens (card radius 8, no heavy shadows, `#131720`/`#42454C`/`#F0F4F7`/accent `#116DFF`), metric cards 3-col → 2-col → 1-col at 390, hover/focus-visible on recent items + quick actions.
- **Domains** (`AdminDomainsPage.jsx`): full EN/AR labels (title, subtitle, form fields, table headers, buttons, empty, loading, errors, access denied); duplicate `admin-page-header` H1 removed — AdminLayout `title`/`subtitle` now render the header and the Add domain button lives in an `admin-data-toolbar` row; table migrated to shared `.admin-data-table-wrap` / `.admin-data-table` / `.admin-data-table-actions` with `.admin-data-table-cell-clip` on long domains; `aria-label`s on Edit/Delete; empty/loading rows bilingual.
- **Companies + Memberships polish**: company-card footer forced to Dashboard look under `.admin-studio-shell.admin-platform` (62px, `#e4e6eb` border-top, radius 8, no shadow on hover/focus-within); memberships table migrated to `admin-data-table-*` with `aria-label`s on row actions; memberships overrides strengthened with `!important` so unscoped `global.css` (h38 selects, beige edit form, r10 radii) cannot win under the platform shell.
- **Platform Sites honesty decision kept**: `admin-platform-placeholder-sites` remains an honest Soon placeholder. `AdminPlaceholderPage.jsx` now renders `PlatformSitesHonestyContent` for that page key with bilingual copy explaining company Sites are managed after opening a company (tenant Sites), plus a “Go to Companies” CTA → `admin-platform-companies`. No fake platform Sites API was invented.
### Remaining mismatches
- Overview metric cards are a clean Dashboard aggregate but not pixel-measured against a live Wix reference (no staging deploy this pass); CSS fixture evidence at `docs/design/evidence-2026-09-20-phase-b/`
- Domains form/table follow shell tokens; live authenticated EN/AR E2E at 390 = NOT_TESTED without staging
- Memberships create/edit forms keep dashboard tokens but are not pixel-measured live
- Platform Templates / Team / Settings / Mobile Apps / Custom Apps placeholders remain honest Soon (unchanged)
### Next phase
- **Phase C — Catalog** (Products, Bundles, Categories, Brands, Inventory, Product Settings, Trash; Coupons + Automatic Discounts UI on the shared table system)

---

## DONE — Phase C Catalog (2026-09-20)
- **Shared table system adoption complete for Catalog:** `AdminTable.jsx` renders `.admin-data-table-wrap` / `.admin-data-table`; Products list + Trash (`AdminDashboardPage.jsx`), Brands (`BrandsCatalogTable.jsx`), Categories (AdminTable), Coupons + Automatic Discounts (`DiscountCouponManagers.jsx`) all use `.admin-data-table-*` with sticky `.admin-data-table-actions` columns, `.admin-data-table-cell-clip` on long names, and `aria-label`s on row actions.
- **Inventory** (`AdminInventoryPage.jsx`): migrated from `inventory-table-wrap`/`inventory-table` to the shared system; Actions th/td use `admin-data-table-actions`; product names clipped via `admin-data-table-cell-clip` + `title`; `aria-label`s on expand and Save controls.
- **Bundles** (`AdminProductBundlesPage.jsx`) + **Product Settings** (`AdminProductSettingsPage.jsx`): `product-schema-table-wrap`/`product-schema-table` replaced with `admin-data-table-wrap`/`admin-data-table`; nested showcase fields table uses `admin-data-table--nested`; Actions columns sticky where they exist.
- **`dashboard-shell.css` tenant catalog support:** `.admin-studio-shell.admin-tenant .admin-data-table-*` overrides (th `#F7F8F8`, Dashboard text tokens, solid `--dashboard-bg-card` background for sticky Actions cells, cell clip, compact action buttons), `.admin-data-table--nested` styles, and `.catalog-data-card .admin-data-table-wrap` overflow guard. Catalog card chrome kept; tables scroll inside the shared wrap.
- **Tests:** `catalog-pages.test.js` retargeted from literal `.catalog-table-wrap` CSS to `DiscountCouponManagers` source + shared `admin-data-table-wrap` overflow rule; `inventory-page.test.js` / `product-schema-pages.test.js` gained shared-system class assertions; new `catalog-phase-c.test.js` asserts AdminTable, DiscountCouponManagers, Inventory, Bundles, ProductsListPage actions, and Product Settings all use `admin-data-table*`.
### Remaining mismatches
- Live authenticated EN/AR E2E at 390 for catalog pages = NOT_TESTED without staging deploy; CSS fixture evidence at `docs/design/evidence-2026-09-20-phase-c/` (CDP: overflow-x auto, sticky Actions, clip 220px)
- Legacy `catalog-table` / `inventory-table` / `product-schema-table` CSS blocks remain in `global.css` (unused by migrated pages; removal deferred to avoid unrelated churn)
- Sales/CRM dense tables (Orders, Contacts, Inbox, Reviews) still on legacy chrome — Phase D/E
- Product create/edit wizard forms are form chrome, not list-table fidelity (out of Phase C table migration scope)
### Next phase
- **Phase D — Sales** (Orders, Delivery, Invoices UI; lifecycle/barcode = Stream B)

---

## DONE — Phase D Sales (2026-09-20)
- **Orders** (`AdminOrdersTable.jsx`): migrated from `admin-table-wrap`/`admin-table` to the shared `.admin-data-table-wrap` / `.admin-data-table`; Actions th/td use `.admin-data-table-actions` (sticky); long line-item summaries clipped via `.admin-data-table-cell-clip` + `title`; Delete button gets `aria-label`. All props/handlers (`onAssignEmployee`, `onDeleteOrder`, `onStatusChange`, `onViewOrder`, `canAssign/canDelete/canUpdateStatus`) preserved exactly — no order status/assign/create/delete handler or API changes.
- **Delivery** (`DeliveryZonesWorkspace.jsx`): `delivery-zones-table-wrap`/`delivery-zones-table` replaced with `admin-data-table-wrap`/`admin-data-table`; Actions column sticky via `admin-data-table-actions`; long city names clipped via `admin-data-table-cell-clip` + `title`; Edit/Enable/Disable/Delete buttons get `aria-label`s. `deliveryZonesApi` CRUD calls, `deliveryZonesUi` helpers, bilingual copy, and permission gates untouched.
- **Invoices** (`AdminGettingPaidPage.jsx`): invoice list migrated from `getting-paid-invoice-list-head`/`getting-paid-invoice-row` row-cards to a real `admin-data-table` with sticky `.admin-data-table-actions`; detail + form line-item tables migrated from `getting-paid-table-wrap` to `admin-data-table-wrap`/`admin-data-table`. `invoiceEditable` flow, mark-paid/cancel/void handlers, and `invoices.manage` gating unchanged.
- **Sales Overview AnalyticsPage** (`AdminSalesPage.jsx`): content wrapped in `.sales-analytics-page` scope; KPI/chart/insight cards token-polished under `.admin-studio-shell.admin-tenant` (radius 8, `--dashboard-shadow-card: none`, Dashboard text tokens, `#F0F4F7` icon chips). Metrics stay order-derived via `buildSalesAnalytics` — no invented analytics. Nav placeholder honesty intact.
- **`dashboard-shell.css` tenant sales support:** `.admin-studio-shell.admin-tenant` overrides for `.tenant-sales-page .admin-data-table` (min-width 1180px, denser padding, wider cell clip), `.sales-analytics-page` card chrome, `.delivery-zones-page .admin-data-table` (row borders, disabled-row opacity, city-key code), and `.getting-paid-invoice-list` / `.getting-paid-invoice-form` / `.getting-paid-invoice-detail` tables (row borders, fluid line-item editor with input widths, 720px compact inputs). Legacy `global.css` blocks for the old classes remain unused (removal deferred to avoid unrelated churn).
- **Tests:** `sales-pages.test.js` / `delivery-zones-pages.test.js` / `invoices-pages.test.js` gained shared-system class assertions; new `sales-phase-d.test.js` asserts Orders/Delivery/Invoices use `admin-data-table*` (wrap/table/actions/cell-clip/aria-labels) and that `dashboard-shell.css` carries the tenant sales/delivery/invoice overrides. Focused suite 49/49 PASS; `build:staging` PASS.
### Remaining mismatches
- Live authenticated EN/AR E2E at 390 for sales/delivery/invoices = NOT_TESTED without staging deploy; CSS fixture evidence at `docs/design/evidence-2026-09-20-phase-d/`
- Legacy `admin-table` / `delivery-zones-table` / `getting-paid-table-wrap` / `getting-paid-invoice-row` CSS blocks remain in `global.css` (unused by migrated pages; removal deferred)
- Sales Overview nav remains an honest Soon placeholder (AnalyticsPage chrome polished only); lifecycle/barcode = Stream B
- CRM dense tables (Contacts, Inbox, Reviews) still on legacy chrome — Phase E
- Active Orders/Delivery feature branches untouched (UI class/CSS only on this fidelity branch)
### Next phase
- **Phase E — CRM** (Contacts, Inbox, Reviews, Staff; Forms UI honest until Stream B storage)

---

## DONE — Phase E CRM (2026-09-20)
- **Contacts** (`AdminContactsPage.jsx`): table migrated from `admin-contacts-table`/`admin-contacts-table-scroll` to the shared `.admin-data-table-wrap` / `.admin-data-table`; Actions th/td use `.admin-data-table-actions` (sticky); long names/emails clipped via `.admin-data-table-cell-clip` + `title`. All handlers (`openContact`, `refresh`, archive/restore, segment/import/export flows) and the `customersApi` calls preserved exactly — no handler or API changes.
- **Contact detail** (`AdminContactDetailPage.jsx`): nested Invoices and Orders tables migrated from the plain `contact-records-scroll table` to `admin-data-table-wrap`/`admin-data-table`; identity card + overview/timeline/profile/inbox/pipelines/notes/subscriptions/bookings/records cards token-polished under `.admin-studio-shell.admin-tenant` (radius 8, `--dashboard-shadow-card: none`, Dashboard text tokens). `invoicesForContact`/`ordersForContact` filtering, notes save flow, and permission gates untouched.
- **Reviews** (`AdminReviewsPage.jsx`): table migrated from `reviews-list-head`/`reviews-list-row` grid rows to the shared `admin-data-table` system with sticky `.admin-data-table-actions`; comment/product cells clipped via `admin-data-table-cell-clip`. `filterReviews`, moderation handlers, product/employee pickers, and `reviews.manage` gating unchanged.
- **Staff** (`EmployeeTable.jsx`): migrated from `admin-table-wrap`/`admin-table` to `admin-data-table-wrap`/`admin-data-table` with sticky `.admin-data-table-actions`; `AdminEmployeesPage.jsx` section gained an inert `admin-employees-page` scope class for Dashboard token overrides (min-width 900px). Employee CRUD handlers and sessions logic untouched.
- **Inbox (E3 CSS-only chrome)** (`AdminInboxPage.jsx`): workspace/cards token-polished under `.admin-studio-shell.admin-tenant` (radius 8, `--dashboard-shadow-card: none`, `#F0F4F7` hover/active, `#e4e6eb` dividers); 820px workspace stack + 390px page overflow guard. No JSX/handler changes — Meta connect stays deferred, conversations stay API-driven.
- **Forms (E6 CSS-only chrome)** (`AdminFormsPage.jsx`): `forms-workspace-panel` + `forms-plan-strip` token-polished under `.admin-studio-shell.admin-tenant`; plan-unavailable strip and honest empty workspace kept (no fabricated quotas; storage = Stream B).
- **`dashboard-shell.css` tenant CRM support:** `.admin-studio-shell.admin-tenant` overrides for `.admin-contacts-table-card .admin-data-table-wrap` (max-height `calc(100vh - 420px)`, overflow auto, scrollbar-gutter stable, sticky first column), `.reviews-page .admin-data-table` (min-width 960px, `#e4e6eb` row borders), `.admin-employees-page .admin-data-table` (min-width 900px), `.admin-inbox-page .admin-inbox-workspace` chrome + 820/390 media, `.admin-contact-detail` cards, and `.customer-forms-page` panels. Legacy `global.css` blocks for the old classes remain unused (removal deferred to avoid unrelated churn).
- **Tests:** `inbox-contacts-pages.test.js` retargeted from `admin-contacts-table-scroll`/`admin-contacts-table` markers to `admin-data-table-wrap`/`admin-data-table` and dashboard-shell.css sticky/max-height asserts; new `crm-phase-e.test.js` asserts Contacts/Reviews/EmployeeTable/Contact-detail use `admin-data-table*`, Inbox keeps Meta/UnderDevelopment honesty, Forms keeps plan-unavailable + empty + UnderDevelopment, and `dashboard-shell.css` carries the tenant CRM overrides. Focused suite 118/118 PASS; `build:staging` PASS.
### Remaining mismatches
- Live authenticated EN/AR E2E at 390 for CRM pages = NOT_TESTED without staging deploy; CSS fixture evidence at `docs/design/evidence-2026-09-20-phase-e/`
- Legacy `admin-contacts-table` / `reviews-list-head` / `reviews-list-row` / `admin-table` CSS blocks remain in `global.css` (unused by migrated pages; removal deferred)
- Inbox Meta connect remains deferred (external integration); internal conversations stay API-driven
- Forms storage remains Stream B — plan-unavailable strip and honest empty workspace kept
- Meetings / Pipelines / Community / Loyalty remain honest thin shells (unchanged)
- Live authenticated EN/AR E2E at 390 for sales/delivery/invoices = NOT_TESTED without staging deploy (Phase D note)
### Next phase
- **Phase F — Growth / Analytics / SEO polish** (Banners, announcements, splash, SMS, homepage offers, website texts/media, SEO form polish, analytics suite chrome)

---

## DONE — Phase F Growth / Analytics / SEO (2026-09-20)
- **Banners / Announcements / Splash / SMS** (`AdminBannersPage.jsx`, `AdminAnnouncementsPage.jsx`, `AdminSplashAdsPage.jsx`, `AdminSmsPage.jsx`): list/log tables migrated from `admin-table-wrap`/`admin-table` to shared `.admin-data-table-wrap` / `.admin-data-table`; Actions th/td use `.admin-data-table-actions`; long title cells clipped via `.admin-data-table-cell-clip`. CRUD / animation / SMS send+logs handlers and APIs unchanged.
- **Website texts table path** (`AdminFeaturePage.jsx`): non-text feature table path on shared `admin-data-table*`; WebsiteTextsPanel handlers untouched.
- **Analytics suite** (`AdminAnalyticsPage.jsx` + `SearchAnalyticsPanel.jsx`): nested series/top-pages/insights/search tables on shared `admin-data-table*`; MetricCard / DataPanel / EmptyChart chrome token-polished under `.admin-studio-shell.admin-tenant .tenant-analytics-page` (radius 8, `--dashboard-shadow-card: none`, `#F0F4F7` chips). Unavailable / notConnected / decorative session-recordings honesty preserved — no invented metrics or chart series.
- **SEO** (`AdminMarketingPage.jsx` SeoPage): settings/preview/assistant/Search Console cards token-polished under `.tenant-marketing-page`; save/load + robots/preview logic unchanged; Search Console / GEO tools stay notConnected / available honesty.
- **Homepage offers + Website media/CMS** (`HomeContentManager`, `WebsiteMediaManager` / `MediaSlotsManager`, `AdminWebsiteContentPage`): card/grid chrome on Dashboard tokens; upload/save/delete handlers unchanged; CMS/Multilingual UnderDevelopment honesty kept.
- **`dashboard-shell.css` tenant Phase F support:** `.admin-panel-card .admin-data-table*`, `.tenant-analytics-page` metrics/panels/empty charts, `.tenant-marketing-page` SEO/marketing shells, `.home-content-manager` / `.website-media-manager` / `.website-content-page` cards; `@media` 820/390 overflow + grid guards.
- **Tests:** new `growth-phase-f.test.js` asserts migrated Growth tables use `admin-data-table*`, analytics/SEO honesty markers, and dashboard-shell Phase F overrides. Focused Phase F suite + `build:staging` PASS.
### Remaining mismatches
- Live authenticated EN/AR E2E at 390/820/1440 for Growth/Analytics/SEO = NOT_TESTED without staging deploy; CSS fixture evidence at `docs/design/evidence-2026-09-20-phase-f/`
- Meta / Social / Referral / Google Ads stay honest notConnected shells (Stream B connections)
- Session recordings / benchmarks remain decorative honesty (no product recording source)
- Legacy `admin-table` CSS blocks remain in `global.css` (unused by migrated pages; removal deferred)
### Next phase
- **Phase G — Settings / Finishing** (per master plan; do not start until Phase F is accepted)

---

## DONE — Phase G Settings / Ops (2026-09-20)
- **Security** (`AdminSecurityPage.jsx`): login history + IP block tables migrated to shared `.admin-data-table-wrap` / `.admin-data-table`; Action th/td use `.admin-data-table-actions`; long user/reason cells clipped. Settings form + unblock handlers/APIs unchanged.
- **Policies** (`AdminPoliciesPage.jsx`): table migrated to shared `admin-data-table*` with sticky Actions. CRUD handlers unchanged.
- **Legal** (`AdminLegalInformationPage.jsx`): form card inputs token-polished under `.admin-studio-shell.admin-tenant` (radius 8, `#e4e6eb` borders). Save/delete API unchanged.
- **Settings hub + finance/detail panels** (`AdminSettingsPage.jsx`): hub/detail cards, search, tabs chrome on Dashboard tokens via `.tenant-settings-hub-page` / `.tenant-settings-detail-page`. Unavailable rows and HonestNotice previews kept — no fake save/tax/checkout persistence.
- **Automations** (`AdminAutomationsPage.jsx`): CSS-only chrome; template · unavailable honesty and UnsupportedDialog create controls preserved.
- **Developer Tools rename**: nav + Site Logs breadcrumb/title use **Site Logs** (not “Wix Logs”); legacy URL `/admin/developer-tools/logging-tools/wix-logs` kept for compatibility. Developer cards chrome polished; unavailable honesty unchanged.
- **Activity log** (`ActivityLogWorkspace.jsx`): filters/list/dialog chrome on Dashboard tokens; row click → detail dialog and API fetch unchanged (list kept as interactive rows, not forced into a table).
- **Getting Paid residual**: setup/paylinks/quotes/POS heroes + banners token-polished; invoice tables already on shared system from Phase D.
- **Dropshipping** (`AdminDropshippingPage.jsx`): custom table migrated onto shared `admin-data-table*` (+ clip); metrics/settings cards chrome polished. Action handlers unchanged.
- **SMS providers leftover** (`SmsProvidersSection.jsx`): providers table migrated to shared `admin-data-table*` (Growth residual).
- **`dashboard-shell.css` Phase G overrides:** settings hub/detail, automations, activity log, developer tools, getting-paid heroes, dropshipping; `@media` 820/390 guards.
- **Legacy CSS cleanup:** deferred — `.admin-table*` still referenced by platform Companies and unused `AdminEmployeeTable.jsx`; removal would risk regressions. No unsafe global.css deletes.
- **Tests:** new `settings-phase-g.test.js`; focused Settings/Ops + regression suite PASS; `build:staging` PASS.
### Remaining mismatches
- Live authenticated EN/AR E2E at 390/820/1440 for Settings/Ops = NOT_TESTED without staging deploy; evidence at `docs/design/evidence-2026-09-20-phase-g/`
- Automations engine / tax / checkout save / developer logging backends remain Stream B / honest unavailable
- Legacy `/wix-logs` path retained intentionally; platform Companies still on older table classes
- Unused `AdminEmployeeTable.jsx` + legacy `admin-table` CSS blocks left in place (safe deferral)
### Next phase
- **Phase H — Sites Workspace polish** (Studio card height/thumbs residual; **not** editor/canvas)

---

## DONE — Phase H Sites Workspace polish (2026-09-20)
- **Sites cards** (`AdminSitesPage.jsx` + `dashboard-shell.css` under `.admin-sites-workspace`): thumb height fixed at **138.375px** (replacing `aspect-ratio: 16/9` growth) so card height stays **211.375px** at any grid column width (reference **211.8**, Δ **−0.425**). Footer pad 8/7, status `align-self: start`, name/slug ellipsis + `title`.
- **Thumbs honesty:** `sitePreviewUrl()` renders a real `http(s)` preview from `site.previewUrl` / `settings.previewUrl|thumbnail*` when present; otherwise initials only — no fabricated thumbnail URLs.
- **Responsive:** retained 246→220→2-col→1-col grid; added 820 gap tighten + **390** `overflow-x: hidden` on `.sites-page`.
- **APIs/permissions:** `fetchSites` / `createSite` / `sites.manage` / Edit Site → `/admin/site-editor?siteId=` unchanged. Editor/canvas not touched.
- **Tests:** `sites-phase-h.test.js` + updated `dashboard-shell-tokens.test.js` thumb asserts; Sites + shell regressions PASS; `build:staging` PASS.
- **Evidence:** `docs/design/evidence-2026-09-20-phase-h/`.
### Remaining mismatches
- Live authenticated EN/AR CDP at 1440/820/390 = NOT_TESTED without staging deploy
- Card height formula Δ −0.425px vs 211.8 (within 0.5px; subpixel/font metric variance may shift ±1px in real browsers)
- No site preview image field on API serialize today — initials path is the common case until a real preview URL exists in settings
### Next phase
- **Phase I — Final regression / consistency sweep ONLY** (token drift, EN/AR edge cases, 390 matrix; staging live compare only after deploy approval)

---

## DONE — Phase I Final regression / consistency sweep (2026-09-20)
- **Legacy table residual closed:** unused `AdminEmployeeTable.jsx` and Companies **Manage Modules** panel migrated from `admin-table` / `admin-table-wrap` → shared `admin-data-table*` (+ cell clip / sticky Actions where applicable). No remaining Phase A–H JSX mounts legacy `className="admin-table"`.
- **Shared token drift:** `.admin-data-table th` background and empty/loading/error text now use `--dashboard-bg-card` / `--dashboard-text-secondary` (removed `--admin-surface` / `--admin-muted` drift).
- **Regression gates verified:** Products EN shared table intact; Employees All/Active/Disabled intact; Sites card **211.375** (ref **211.8**); sticky Actions logical + RTL shadow; authenticated shell blocks Be Vietnam Pro; Website Studio editor/canvas untouched.
- **EN/AR + responsive:** CSS/unit matrix for 1440 / laptop / 820 / 390 across A–H families (see `docs/design/evidence-2026-09-20-phase-i/MATRIX.md`). Live authenticated CDP = NOT_TESTED without staging deploy.
- **Tests:** new `regression-phase-i.test.js`; broad A–H + related suite **147 PASS**; `build:staging` PASS; `git diff --check` PASS.
- **Not started:** Stream B functional gaps; Production; merge; deploy.
### Remaining mismatches
- Live authenticated EN/AR CDP at 1440/820/390 across A–H = NOT_TESTED without staging deploy approval
- Legacy `.admin-table*` CSS blocks remain in `global.css` (unused by A–H JSX; removal deferred)
- Stream B product gaps unchanged (Forms, PSP connect, Automations engine, Site Editor publish, etc.)
- Sites card formula Δ −0.425px vs 211.8 (within 0.5px)
### Next
- **READY FOR FINAL MERGE REVIEW** (UI fidelity Stream A complete). Do not merge/deploy until explicit approval.
