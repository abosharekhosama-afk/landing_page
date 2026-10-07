# IMKAN Page-by-Page Audit

**Classification:** PLANNING / AUDIT ONLY — no implementation  
**Inventory generated:** see `_inventory_snapshot.json` / `_route_classification.json`  
**Codebase basis:** `feature/wix-dashboard-ui-fidelity` @ `262f630` (includes develop `a7c8191` ancestry)  
**Sources:** `adminNavigation.js`, `CPanelApp.jsx` `pagePaths`, `roles.js`, API routers, prior Wix DevTools forensics (`WIX_DASHBOARD_UI_FORENSIC_SPEC.md`, `WIX_STUDIO_DASHBOARD_UI_FORENSIC_SPEC.md`, Companies/Sites harness CDP 2026-09-19)

## Honesty rules

- Wix/Studio used for **structure / UX / interaction patterns only**.
- IMKAN is source of truth for **data, labels, permissions, APIs**.
- Do **not** invent DevTools numbers. Unmeasured pages = `NOT_TESTED`.
- Website Studio **editor/canvas** is listed but **OUT OF SCOPE** for implementation.
- No Be Vietnam Pro in authenticated CPanel (shell lock). Legal fonts: Helvetica Neue / Inter; Arabic Tajawal / IBM Plex Sans Arabic.
- **EN/LTR + AR/RTL + 1440/laptop/tablet/390 are required inside each implementation phase** — not deferred to Phase I.

## Route count reconciliation (corrected)

| Kind | Count |
|---|---|
| Inventory rows (raw) | **170** |
| Unique `/admin` paths | **166** |
| **UNIQUE_REAL_PAGE** | **52** (50 Dashboard + 1 Studio Sites + 1 editor) |
| **NESTED_DETAIL_ROUTE** | **48** (derivatives — not full-page estimates) |
| **PLACEHOLDER_SOON** | **65** |
| **ROUTE_ALIAS** | **2** |
| **DUPLICATE_INVENTORY_ROW** | **1** |
| **NON_PAGE_ROUTE** | **2** |

**Do not estimate effort from 166/170.** Use page families in `IMKAN_WIX_MASTER_FIDELITY_PLAN.md`.

Machine source: `docs/design/_route_classification.json`.

## Summary counts (legacy raw — superseded for effort)

| Metric | Value | Note |
|---|---|---|
| Nav+routed rows | 170 | Inventory only |
| → Wix Dashboard (unique real) | **50** | Corrected |
| → Wix Studio Workspace (unique real) | **1** | `/admin/sites` |
| Editor out of scope | **1** | |
| UI primary implementable | **51** | Exclude editor |

## Shared shell tokens (measured — apply as baseline)

From Wix Dashboard CDP (1440) + IMKAN harness after shell pass:

| Token | Wix Dashboard | IMKAN shell |
|---|---|---|
| Topbar height | 48px | 48px |
| Sidebar width | 255px | 255px (Dashboard) / **228px** (Sites Studio only) |
| Sidebar bg | `#131720` | `#131720` / Sites `#FFFFFF` |
| Selected nav | `#42454C` / `#CFD0D2` | same / Sites `#A8CAFF` |
| Canvas | `#F0F4F7` | `#F0F4F7` |
| H1 | 28/700/36 `#000624` | same (Helvetica/Inter sub) |
| Gutter | 48px | 48px |
| Primary button | 36 / r18 / `#116DFF` | same |
| Compact control | 30 / r15 | same |
| Card | r8 / no shadow | same |
| Table th | `#F7F8F8` 14/400/18 | same |
| Font EN | Madefor → Helvetica/Inter | Helvetica Neue, Helvetica, Inter |
| Font AR | — | Tajawal / IBM Plex Sans Arabic |

## Interaction pattern checklist (Wix → IMKAN mapping)

Apply on every page pass (do not fake missing backend):

| Interaction | Wix pattern (observed / expected) | IMKAN mapping rule |
|---|---|---|
| Hover nav | Subtle fill change; selected stays pill/bar | Keep muted selected; no Studio blue on Dashboard |
| Primary click | Immediate navigation or create drawer/modal | Wire to real create route/API only |
| Search focus | Dark field (topbar) / in-page search | Use shell search tokens |
| Filter/select open | Native or Wix select popover | Prefer existing IMKAN selects; restyle to 30/r15 |
| Row/menu … | Overflow menu anchored to row | Keep existing menus; measure offset |
| Modal/drawer | Dim overlay + escape/outside close | Match AdminLayout popover close (Escape/outside) |
| Save success | Toast / inline success | Use existing message panels; restyle only |
| Validation error | Inline field + banner | Keep server messages; no fake success |
| API 401/403 | Session redirect / forbidden | Existing handlers; must stay |
| Empty state | Illustration + one CTA | Honest empty copy; no fake demo rows |

## EN/AR + responsive gates (in-phase — not Phase I)

Phase I is **final regression only**. Each page must already pass these in its implementation phase:

- [ ] EN/LTR — no clip on title/toolbar/table/actions
- [ ] AR/RTL — logical CSS; icons/menus correct; table scroll stays inside table region
- [ ] 1440 · laptop · tablet · **390** — no page-level horizontal overflow
- [ ] Data tables use the **shared bilingual table system** (Foundation), not one-off CSS
- [ ] DevTools Computed recorded for the page
- [ ] Hover/focus/active + dropdown/modal/drawer for real controls
- [ ] Loading/empty/error honest
- [ ] Computed fonts under shell never include Be Vietnam Pro
- [ ] Network happy path clean; relevant tests + `build:staging` + `git diff --check`

Live staging pixel comparison remains required after merge/deploy before calling the **overall** project complete.

## Full route inventory

| Route | Name (EN) | pageKey | Reference | Feature | Permissions | Data/API hint | UI fidelity | Forensic depth |
|---|---|---|---|---|---|---|---|---|
| `/admin/platform/overview` | Overview | `admin-platform-overview` | Wix Dashboard | AVAILABLE | `inherit/default` | dashboard/platform overview aggregates | **PASS (Phase B)** — bilingual loading/access-denied/empty; Dashboard metric cards + recent list + quick actions; honest `-` totalMembers | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/platform/companies` | Companies | `admin-platform-companies` | Wix Dashboard | AVAILABLE | `inherit/default` | GET/POST platform companies + memberships APIs | **PASS (Phase B)** — card footer forced Dashboard (62px, r8, no hover shadow); memberships table on shared admin-data-table | MEASURED_HARNESS_2026-09-19 + Phase B polish |
| `/admin/platform/domains` | Domains | `admin-platform-domains` | Wix Dashboard | AVAILABLE | `inherit/default` | platform domains API | **PASS (Phase B)** — bilingual; shared admin-data-table; aria-labels; shell title/subtitle | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/platform/coming-soon/sites` | Sites | `admin-platform-placeholder-sites` | Wix Dashboard | PLACEHOLDER | `inherit/default` | honest Soon kept; bilingual copy + Go to Companies CTA | N/A | N/A_PLACEHOLDER_HONESTY_PASS |
| `/admin/platform/coming-soon/mobile-apps` | Mobile Apps | `admin-platform-placeholder-mobile-apps` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/templates/studio-editor` | Studio Editor Templates | `admin-platform-placeholder-templates-studio-editor` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/templates/wix-editor` | Website Editor Templates | `admin-platform-placeholder-templates-wix-editor` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/templates/yours` | Your Templates | `admin-platform-placeholder-templates-yours` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/custom-apps` | Custom Apps | `admin-platform-placeholder-custom-apps` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/client-experience/feedback` | Client Feedback | `admin-platform-placeholder-client-experience-feedback` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/client-experience/kits` | Client Kits | `admin-platform-placeholder-client-experience-kits` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/client-experience/reports` | Client Reports | `admin-platform-placeholder-client-experience-reports` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/client-experience/crm-billing` | CRM & Client Billing | `admin-platform-placeholder-client-experience-crm-billing` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/customer-care-tickets` | Customer Care Tickets | `admin-platform-placeholder-customer-care-tickets` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/team` | Team | `admin-platform-placeholder-team` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/settings/workspace` | Workspace Settings | `admin-platform-placeholder-settings-workspace` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/settings/business-info` | Business Info | `admin-platform-placeholder-settings-business-info` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/settings/notifications` | Notifications Preferences | `admin-platform-placeholder-settings-notifications` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/settings/webhooks` | Webhooks | `admin-platform-placeholder-settings-webhooks` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `—` | Home | `admin` | Wix Dashboard | AVAILABLE | `inherit/default` | see page component + matching /api route | NEEDS_PAGE_PASS | WIX_SHELL_PLUS_PARTIAL_PAGE_FORENSIC |
| `/admin/products` | Products | `admin-products` | Wix Dashboard | AVAILABLE | `["products.view"]` | GET/POST/PUT /api/products (+ admin products) | **PASS (Phase C)** — shared admin-data-table; sticky Actions; cell clip | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/product-bundles` | Bundles | `admin-product-bundles` | Wix Dashboard | AVAILABLE | `["products.view"]` | GET/POST/PATCH/DELETE /api/admin/bundles | **PASS (Phase C)** — shared admin-data-table; sticky Actions | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/inventory` | Inventory | `admin-inventory` | Wix Dashboard | AVAILABLE | `["inventory.view", "inventory.manage", "products.view", "products.manage"]` | /api/admin/inventory | **PASS (Phase C)** — shared admin-data-table; sticky Actions; aria-labels; name clip | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/categories` | Categories | `admin-categories` | Wix Dashboard | AVAILABLE | `["categories.view"]` | categories API | **PASS (Phase C)** — shared admin-data-table; sticky Actions | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/brands` | Brands | `admin-brands` | Wix Dashboard | AVAILABLE | `["brands.view"]` | brands API | **PASS (Phase C)** — shared admin-data-table; sticky Actions; name clip | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/product-settings` | Product Settings | `admin-product-settings` | Wix Dashboard | AVAILABLE | `["product_settings.view"]` | see page component + matching /api route | **PASS (Phase C)** — shared admin-data-table incl nested variant; sticky Actions | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/products/trash` | Trash | `admin-products-trash` | Wix Dashboard | AVAILABLE | `["products.view"]` | see page component + matching /api route | **PASS (Phase C)** — shared admin-data-table; sticky Actions | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/catalog/booking-services` | Booking Services | `admin-tenant-placeholder-catalog-booking-services` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/catalog/gift-cards` | Gift Cards | `admin-tenant-placeholder-catalog-gift-cards` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/catalog/discounts/coupons` | Coupons | `admin-tenant-placeholder-catalog-discounts-coupons` | Wix Dashboard | PARTIAL | `inherit/default` | GET/POST /api/admin/coupons (real manager behind Soon nav) | **PASS (Phase C)** — shared admin-data-table; sticky Actions; aria-labels | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/catalog/discounts/automatic` | Automatic Discounts | `admin-tenant-placeholder-catalog-discounts-automatic` | Wix Dashboard | PARTIAL | `inherit/default` | GET/POST /api/admin/discounts (real manager behind Soon nav) | **PASS (Phase C)** — shared admin-data-table; sticky Actions; aria-labels | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/catalog/booking-channels/integrations` | Booking Integrations | `admin-tenant-placeholder-catalog-booking-channels-integrations` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/catalog/booking-channels/links` | Shareable Links | `admin-tenant-placeholder-catalog-booking-channels-links` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/orders` | Orders | `admin-orders` | Wix Dashboard | AVAILABLE | `["orders.view"]` | /api/orders | **PASS (Phase D)** — shared admin-data-table; sticky Actions; items clip; aria-labels | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/delivery` | Delivery | `admin-delivery` | Wix Dashboard | AVAILABLE | `["delivery.view"]` | /api/admin/delivery-zones | **PASS (Phase D)** — shared admin-data-table; sticky Actions; city clip; aria-labels | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/sales/subscriptions` | Subscriptions | `admin-tenant-placeholder-sales-subscriptions` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/sales/gift-card-sales` | Gift Card Sales | `admin-tenant-placeholder-sales-gift-card-sales` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/sales/payments/all` | All Payments | `admin-tenant-placeholder-sales-payments-all` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/sales/payments/receipts` | Receipts | `admin-tenant-placeholder-sales-payments-receipts` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/sales/analytics/overview` | Sales Overview | `admin-tenant-placeholder-sales-analytics-overview` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/sales/analytics/subscriptions` | Subscriptions | `admin-tenant-placeholder-sales-analytics-subscriptions` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/sales/abandoned-carts` | Abandoned Carts | `admin-tenant-placeholder-sales-abandoned-carts` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/bookings/calendar` | Calendar | `admin-bookings-calendar` | Wix Dashboard | AVAILABLE | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/bookings/list` | Booking List | `admin-bookings-list` | Wix Dashboard | AVAILABLE | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/bookings/work-schedule` | Work Schedule | `admin-bookings-work-schedule` | Wix Dashboard | AVAILABLE | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/bookings/analytics` | Bookings Analytics | `admin-bookings-analytics` | Wix Dashboard | AVAILABLE | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/customers` | Contacts | `admin-customers` | Wix Dashboard | AVAILABLE | `["customers.view"]` | customers/contacts API | **PASS (Phase E)** — shared admin-data-table; sticky Actions; name/email clip; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/reviews` | Reviews | `admin-reviews` | Wix Dashboard | AVAILABLE | `["reviews.view"]` | reviews /all | **PASS (Phase E)** — shared admin-data-table; sticky Actions; comment/product clip | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/inbox` | Inbox | `admin-inbox` | Wix Dashboard | AVAILABLE | `["inbox.view"]` | /api/admin/inbox | **PASS (Phase E)** — workspace chrome on Dashboard tokens; Meta connect deferred; API-driven conversations | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/forms` | Forms & Submissions | `admin-forms` | Wix Dashboard | PARTIAL | `["customers.view"]` | see page component + matching /api route | **PASS (Phase E)** — workspace/plan-strip chrome on Dashboard tokens; honest empty until Stream B storage | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/meetings` | Meetings | `admin-meetings` | Wix Dashboard | PARTIAL | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/pipelines` | Pipelines | `admin-pipelines` | Wix Dashboard | PARTIAL | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/community` | Community | `admin-community` | Wix Dashboard | PARTIAL | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/loyalty` | Loyalty Program | `admin-loyalty` | Wix Dashboard | PARTIAL | `["customers.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/staff` | Employees | `admin-staff` | Wix Dashboard | AVAILABLE | `["employees.view"]` | see page component + matching /api route | **PASS (Phase E)** — shared admin-data-table; sticky Actions; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/banners` | Banners | `admin-banners` | Wix Dashboard | AVAILABLE | `["banners.view", "banners.manage"]` | banners API | **PASS (Phase F)** — shared admin-data-table; sticky Actions; title clip; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/announcements` | Announcements | `admin-announcements` | Wix Dashboard | AVAILABLE | `["announcements.view", "announcements.manage"]` | /api/admin/announcements | **PASS (Phase F)** — shared admin-data-table; sticky Actions; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/splash-ads` | Splash Ads | `admin-splash-ads` | Wix Dashboard | AVAILABLE | `["splash_ads.view", "splash_ads.manage"]` | /api/admin/splash-ads | **PASS (Phase F)** — shared admin-data-table; sticky Actions; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/sms` | SMS | `admin-sms` | Wix Dashboard | AVAILABLE | `["sms.view", "sms.send", "sms.manage", "sms.logs.view"]` | /api/admin/sms | **PASS (Phase F)** — shared admin-data-table (incl. logs); sticky Actions; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/marketing/seo-geo` | SEO & GEO | `admin-tenant-placeholder-marketing-seo-geo` | Wix Dashboard | PARTIAL | `inherit/default` | company settings SEO fields + storefront seoContent (real SeoPage behind placeholder key) | **PASS (Phase F)** — SeoPage form/preview chrome on Dashboard tokens; Search Console notConnected honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/marketing/google-ads` | Google Ads | `admin-tenant-placeholder-marketing-google-ads` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/marketing/meta-ads` | Facebook & Instagram Ads | `admin-tenant-placeholder-marketing-meta-ads` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/marketing/email` | Email Marketing | `admin-tenant-placeholder-marketing-email` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/marketing/social` | Social Media Marketing | `admin-tenant-placeholder-marketing-social` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/marketing/referrals` | Referral Program | `admin-tenant-placeholder-marketing-referrals` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/marketing/google-business` | Google Business Profile | `admin-tenant-placeholder-marketing-google-business` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/analytics/highlights` | Highlights | `admin-analytics-highlights` | Wix Dashboard | AVAILABLE | `["reports.view"]` | /api/admin/analytics + reports | **PASS (Phase F)** — metric/panel chrome + nested admin-data-table; empty/unavailable honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/realtime` | Real-time | `admin-analytics-realtime` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — chrome polish; map/source honesty when unverified | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/traffic` | Traffic | `admin-analytics-traffic` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — chrome + shared tables; no invented series | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/behavior` | Behavior | `admin-analytics-behavior` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — chrome + shared tables; engagement honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/marketing` | Marketing | `admin-analytics-marketing` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — chrome polish; Search Console notConnected honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/session-recordings` | Session Recordings | `admin-analytics-session-recordings` | Wix Dashboard | PARTIAL | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — decorative preview honesty retained; chrome tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/insights` | Insights | `admin-analytics-insights` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — nested admin-data-table; API-driven empty honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/benchmarks` | Benchmarks | `admin-analytics-benchmarks` | Wix Dashboard | PARTIAL | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — chrome polish; unavailable honesty retained | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/analytics/reports` | All Reports | `admin-analytics-reports` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | **PASS (Phase F)** — reports workspace chrome under tenant analytics shell | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/sites` | Sites | `admin-sites` | Wix Studio Workspace | AVAILABLE | `["sites.manage", "site_editor.access"]` | GET/POST /api/admin/sites | **PASS (Phase H)** — Studio card grid; fixed thumb 138.375 → card **211.375** (ref 211.8, Δ −0.425); initials when no preview URL; **Phase I regression PASS** | MEASURED_FIXTURE_2026-09-20 — live CDP NOT_TESTED |
| `/admin/website-texts` | Page Text | `admin-website-texts` | Wix Dashboard | AVAILABLE | `["website_texts.manage"]` | /api/admin/website-texts | **PASS (Phase F)** — feature table path on shared admin-data-table; texts panel handlers unchanged | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/website-media` | Media | `admin-website-media` | Wix Dashboard | AVAILABLE | `["website_media.manage"]` | website media API | **PASS (Phase F)** — media card/slot chrome on Dashboard tokens; upload/save/delete unchanged | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/homepage-offers` | Homepage Offers | `admin-homepage-offers` | Wix Dashboard | AVAILABLE | `null` | home-offers + category-cards | **PASS (Phase F)** — offer/card chrome on Dashboard tokens; offer API unchanged | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/website-content/cms` | CMS | `admin-website-content-cms` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/website-content/multilingual` | Multilingual | `admin-website-content-multilingual` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/coming-soon/site/overview` | Website Overview | `admin-tenant-placeholder-site-overview` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/site/website` | Website | `admin-tenant-placeholder-site-website` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/site/speed` | Site Speed | `admin-tenant-placeholder-site-speed` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/site/security` | Uptime & Security | `admin-tenant-placeholder-site-security` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/site/mobile-app` | Mobile App | `admin-tenant-placeholder-site-mobile-app` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/site/logo-brand` | Logo & Brand | `admin-tenant-placeholder-site-logo-brand` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/site/link-in-bio` | Link in Bio | `admin-tenant-placeholder-site-link-in-bio` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/store-locator` | Store Locator | `admin-store-locator` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings` | Settings | `admin-settings` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — hub/detail chrome on Dashboard tokens; unavailable rows honest | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/security` | Login History & IP Protection | `admin-security` | Wix Dashboard | AVAILABLE | `["security.login_history.view", "security.ip_blocks.view", "security.ip_blocks.manage", "security.settings.manage"]` | /api/admin/security | **PASS (Phase G)** — shared admin-data-table; Action sticky; clip | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/policies` | Store Policies | `admin-policies` | Wix Dashboard | AVAILABLE | `["policies.view", "policies.manage"]` | /api/admin/policies | **PASS (Phase G)** — shared admin-data-table; sticky Actions | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/legal-information` | Legal Information | `admin-legal-information` | Wix Dashboard | AVAILABLE | `["legal_information.view", "legal_information.manage"]` | /api/admin/legal-information | **PASS (Phase G)** — form card chrome on Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/getting-paid/setup` | Connect & Setup | `admin-tenant-placeholder-getting-paid-setup` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/getting-paid/pay-links` | Pay Links | `admin-tenant-placeholder-getting-paid-pay-links` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/invoices` | Invoices | `admin-invoices` | Wix Dashboard | AVAILABLE | `["invoices.view"]` | /api/admin/invoices | **PASS (Phase D)** — shared admin-data-table; sticky Actions; line-item tables on shared system | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/coming-soon/getting-paid/quotes` | Price Quotes | `admin-tenant-placeholder-getting-paid-quotes` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/getting-paid/proposals` | Proposals | `admin-tenant-placeholder-getting-paid-proposals` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/getting-paid/pos` | POS Checkout | `admin-tenant-placeholder-getting-paid-pos` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/automations` | Automations | `admin-automations` | Wix Dashboard | PARTIAL | `["customers.manage"]` | see page component + matching /api route | **PASS (Phase G)** — chrome polish; template/unavailable honesty retained | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/developer-tools/logging-tools/wix-logs` | Site Logs | `admin-developer-site-logs` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | **PASS (Phase G)** — renamed from Wix Logs; chrome + unavailable honesty; legacy URL kept | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/developer-tools/logging-tools/advanced-log-tools` | Advanced Log Tools | `admin-developer-advanced-log-tools` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | **PASS (Phase G)** — developer card chrome; unavailable honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/developer-tools/monitoring` | Monitoring | `admin-developer-monitoring` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | **PASS (Phase G)** — chrome polish; no fabricated metrics | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/developer-tools/secrets-manager` | Secrets Manager | `admin-developer-secrets-manager` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | **PASS (Phase G)** — chrome polish; not connected honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/developer-tools/triggered-emails` | Triggered Emails | `admin-developer-triggered-emails` | Wix Dashboard | PARTIAL | `null` | see page component + matching /api route | **PASS (Phase G)** — chrome polish; unavailable honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/vlogs` | Videos | `admin-vlogs` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/coming-soon/video/live-stream` | Live Stream | `admin-tenant-placeholder-video-live-stream` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/video/channels` | Channels | `admin-tenant-placeholder-video-channels` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/apps/manage` | Manage Apps | `admin-tenant-placeholder-apps-manage` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/apps/market` | App Market | `admin-tenant-placeholder-apps-market` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/ai-agents/personal-assistant` | Personal Assistant | `admin-tenant-placeholder-ai-agents-personal-assistant` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/ai-agents/marketing` | Marketing Agent | `admin-tenant-placeholder-ai-agents-marketing` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/ai-agents/design` | Design Agent | `admin-tenant-placeholder-ai-agents-design` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/ai-agents/front-desk` | Front Desk Agent | `admin-tenant-placeholder-ai-agents-front-desk` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/ai-agents/smart-chat` | Smart Chat | `admin-tenant-placeholder-ai-agents-smart-chat` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/site-editor` | Edit Site | `admin-site-editor` | OUT OF SCOPE (Studio editor) | AVAILABLE | `["site_editor.access"]` | GET/PUT site-editor drafts (Publish disabled) — OUT OF SCOPE | OUT OF SCOPE | OUT_OF_SCOPE |
| `/admin/website-media` | Media | `admin-website-media` | Wix Dashboard | AVAILABLE | `["website_media.manage"]` | website media API | **PASS (Phase F)** — media card/slot chrome on Dashboard tokens; upload/save/delete unchanged | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/activity-log` | Activity Log | `admin-activity-log` | Wix Dashboard | AVAILABLE | `["activity_log.view"]` | see page component + matching /api route | **PASS (Phase G)** — filters/list/dialog chrome on Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/unit-creator` | Unit Creator | `admin-unit-creator` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/coming-soon/upgrade` | Upgrade | `admin-tenant-placeholder-upgrade` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/ai` | AI | `admin-tenant-placeholder-ai` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/help/chat` | Support Chat | `admin-tenant-placeholder-help-chat` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/news/all` | All Updates | `admin-tenant-placeholder-news-all` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/coming-soon/news/roadmap` | Product Roadmap | `admin-tenant-placeholder-news-roadmap` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/help/chat` | Support Chat | `admin-platform-placeholder-help-chat` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/news/all` | All Updates | `admin-platform-placeholder-news-all` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/platform/coming-soon/news/roadmap` | Product Roadmap | `admin-platform-placeholder-news-roadmap` | Wix Dashboard | PLACEHOLDER | `inherit/default` | coming-soon shell only | N/A | N/A_PLACEHOLDER |
| `/admin/products/new` | admin-products-new | `admin-products-new` | Wix Dashboard | AVAILABLE | `["products.create", "products.manage"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/products/new` | admin-products-edit | `admin-products-edit` | Wix Dashboard | AVAILABLE | `["products.update", "products.manage"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/categories/new` | admin-categories-new | `admin-categories-new` | Wix Dashboard | AVAILABLE | `["categories.create", "categories.update", "categories.manage"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/brands/new` | admin-brands-new | `admin-brands-new` | Wix Dashboard | AVAILABLE | `["brands.create", "brands.update", "brands.manage"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/vlogs/new` | admin-vlogs-new | `admin-vlogs-new` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/store-locator/new` | admin-store-locator-new | `admin-store-locator-new` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/customers/contact` | admin-customers-detail | `admin-customers-detail` | Wix Dashboard | AVAILABLE | `["customers.view"]` | see page component + matching /api route | **PASS (Phase E)** — nested invoices/orders on shared admin-data-table; identity/overview cards on Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/staff/new` | admin-staff-new | `admin-staff-new` | Wix Dashboard | AVAILABLE | `["employees.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/staff` | admin-employees | `admin-employees` | Wix Dashboard | AVAILABLE | `["employees.view"]` | see page component + matching /api route | **PASS (Phase E)** — shared admin-data-table; sticky Actions; Dashboard tokens | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/reports` | admin-reports | `admin-reports` | Wix Dashboard | AVAILABLE | `["reports.view"]` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/dropshipping` | admin-dropshipping | `admin-dropshipping` | Wix Dashboard | AVAILABLE | `["dropshipping.reports.read"]` | see page component + matching /api route | **PASS (Phase G)** — shared admin-data-table + metrics chrome | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/marketers` | admin-dropshipping-marketers | `admin-dropshipping-marketers` | Wix Dashboard | AVAILABLE | `["dropshipping.marketers.read"]` | see page component + matching /api route | **PASS (Phase G)** — shared admin-data-table | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/products` | admin-dropshipping-products | `admin-dropshipping-products` | Wix Dashboard | AVAILABLE | `["dropshipping.products.read"]` | see page component + matching /api route | **PASS (Phase G)** — shared admin-data-table | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/orders` | admin-dropshipping-orders | `admin-dropshipping-orders` | Wix Dashboard | AVAILABLE | `["dropshipping.orders.read"]` | see page component + matching /api route | **PASS (Phase G)** — shared admin-data-table | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/earnings` | admin-dropshipping-earnings | `admin-dropshipping-earnings` | Wix Dashboard | AVAILABLE | `["dropshipping.earnings.read"]` | see page component + matching /api route | **PASS (Phase G)** — shared admin-data-table | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/withdrawals` | admin-dropshipping-withdrawals | `admin-dropshipping-withdrawals` | Wix Dashboard | AVAILABLE | `["dropshipping.withdrawals.read"]` | see page component + matching /api route | **PASS (Phase G)** — shared admin-data-table | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/reports` | admin-dropshipping-reports | `admin-dropshipping-reports` | Wix Dashboard | AVAILABLE | `["dropshipping.reports.read"]` | see page component + matching /api route | **PASS (Phase G)** — export control chrome; API unchanged | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/dropshipping/settings` | admin-dropshipping-settings | `admin-dropshipping-settings` | Wix Dashboard | AVAILABLE | `["dropshipping.settings.manage"]` | see page component + matching /api route | **PASS (Phase G)** — settings card chrome | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/getting-paid` | admin-settings-getting-paid | `admin-settings-getting-paid` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — hero/banner chrome; incomplete payment flows honest | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/getting-paid/general` | admin-settings-getting-paid-general | `admin-settings-getting-paid-general` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — detail card chrome; not-connected tax honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/getting-paid/invoices` | admin-settings-getting-paid-invoices | `admin-settings-getting-paid-invoices` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase D+G)** — shared admin-data-table + residual chrome | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/getting-paid/price-quotes` | admin-settings-getting-paid-price-quotes | `admin-settings-getting-paid-price-quotes` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — onboarding hero chrome; unsupported honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/getting-paid/pay-links` | admin-settings-getting-paid-pay-links | `admin-settings-getting-paid-pay-links` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — hero chrome; notConnected honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/getting-paid/automations` | admin-settings-getting-paid-automations | `admin-settings-getting-paid-automations` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — settings chrome; unavailable honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/receipts` | admin-settings-receipts | `admin-settings-receipts` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — preview-only HonestNotice retained | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/receipts/automations` | admin-settings-receipts-automations | `admin-settings-receipts-automations` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — unavailable honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/tax` | admin-settings-tax | `admin-settings-tax` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — not-connected tax honesty + chrome | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/checkout` | admin-settings-checkout | `admin-settings-checkout` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — read-only HonestNotice; no fake save | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/checkout/emails` | admin-settings-checkout-emails | `admin-settings-checkout-emails` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | **PASS (Phase G)** — email automation unavailable honesty | SHELL_TOKENS_PASS — live Wix DevTools NOT_TESTED (no staging deploy) |
| `/admin/settings/shipping` | admin-settings-shipping | `admin-settings-shipping` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings` | admin-settings-bookings | `admin-settings-bookings` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/default-hours` | admin-settings-bookings-default-hours | `admin-settings-bookings-default-hours` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/add-ons` | admin-settings-bookings-add-ons | `admin-settings-bookings-add-ons` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/staff` | admin-settings-bookings-staff | `admin-settings-bookings-staff` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/resources` | admin-settings-bookings-resources | `admin-settings-bookings-resources` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/notifications-sent` | admin-settings-bookings-notifications-sent | `admin-settings-bookings-notifications-sent` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/notifications-received` | admin-settings-bookings-notifications-received | `admin-settings-bookings-notifications-received` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/client-flow` | admin-settings-bookings-client-flow | `admin-settings-bookings-client-flow` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/forms` | admin-settings-bookings-forms | `admin-settings-bookings-forms` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/video-conferencing` | admin-settings-bookings-video-conferencing | `admin-settings-bookings-video-conferencing` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |
| `/admin/settings/bookings/integrations` | admin-settings-bookings-integrations | `admin-settings-bookings-integrations` | Wix Dashboard | AVAILABLE | `null` | see page component + matching /api route | NEEDS_PAGE_PASS | INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass |

## Notes on dishonest / special routes

1. **Coupons / Automatic Discounts** — nav `placeholder: true` + Soon badge, but `AdminCatalogPage` mounts real `CouponsManager` / `AutomaticDiscountsManager` against live APIs. Treat as **PARTIAL (nav honesty)** until reclassified to `existing()`.
2. **SEO & GEO** — placeholder key, but `SeoPage` persists company SEO + Technical SEO v2 storefront fields. Treat as **PARTIAL (nav honesty)** / capability **AVAILABLE**.
3. **Platform → Sites** — still platform placeholder Soon; **tenant** `/admin/sites` is real Sites Foundation.
4. **Edit Site** — real route; **editor/canvas out of current fidelity scope**.

## Per-page DevTools status this planning pass

| Area | Status |
|---|---|
| Global Dashboard shell | MEASURED (Wix + IMKAN) |
| Studio Sites workspace shell + cards | MEASURED (forensic + harness) |
| Platform Companies + Memberships | MEASURED (harness CDP) |
| Products table (Wix) | PARTIAL forensic (title/button/table) |
| All other Dashboard modules | **NOT_TESTED** live page-vs-page this pass — schedule in Phase C–G |
| EN+AR live for every route | **NOT_TESTED** this pass |
| 390 native Emulation in IDE browser | Unreliable; use CSS breakpoints + device/iframe evidence |
