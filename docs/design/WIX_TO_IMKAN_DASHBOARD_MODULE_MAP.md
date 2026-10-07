# Wix → IMKAN CPanel module map

Maps authenticated **Wix Dashboard** and **Wix Studio workspace** items onto current IMKAN CPanel (`AdminLayout` + `cpanel/src/data/adminNavigation.js` + pages). No duplicate APIs. Placeholders stay honest (`placeholder: true` / under-development).

Legend: **EXISTS** · **EXISTS BUT NAVIGATION WEAK** · **EXISTS BUT UI WEAK** · **PARTIAL** · **MISSING** · **OUT OF SCOPE**

---

## Wix Dashboard → IMKAN

| Wix | IMKAN | Status | Notes |
|---|---|---|---|
| Home | `admin` / `AdminDashboardPage` | EXISTS BUT UI WEAK | Working insights; shell/cards not measured-Wix |
| Sales / Orders | `admin-orders` | EXISTS BUT UI WEAK | |
| Gift Card Sales | `admin-tenant-placeholder-sales-gift-card-sales` | MISSING | Placeholder only — do not present as working |
| Payments & Finances | Getting Paid group + invoices | PARTIAL | `admin-invoices` exists; All Payments / Receipts placeholders |
| Abandoned Carts | placeholder | MISSING | |
| Products | `admin-products` / `AdminCatalogPage` | EXISTS BUT UI WEAK | |
| Inventory | `admin-inventory` | EXISTS BUT UI WEAK | |
| Categories | `admin-categories` | EXISTS BUT UI WEAK | |
| Brands | `admin-brands` | EXISTS | Wix has no 1:1 Brands row; keep IMKAN Brands under Catalog |
| Product Settings | `admin-product-settings` | EXISTS | |
| Trash | `admin-products-trash` | EXISTS | |
| Coupons / Automatic Discounts | `admin-tenant-placeholder-catalog-discounts-*` | MISSING | Placeholder — do not fake |
| Contacts | `admin-customers` | EXISTS BUT UI WEAK | |
| Forms & Submissions | `admin-forms` | EXISTS | |
| Inbox | `admin-inbox` | EXISTS BUT UI WEAK | |
| Reviews | `admin-reviews` | EXISTS | Under Customers & Leads |
| Marketing | `AdminMarketingPage` + placeholders (SEO, ads, email) | PARTIAL | Real marketing page exists; many Wix channels are placeholders |
| Analytics | `admin-analytics-*` | EXISTS BUT UI WEAK | |
| Settings | `admin-settings` | EXISTS BUT UI WEAK | |
| Site & Mobile / Website | mix of placeholders + `admin-store-locator` | PARTIAL / NAVIGATION WEAK | Real Sites live under Website Content, not this group |
| CMS | `admin-website-content-cms` | EXISTS BUT NAVIGATION WEAK | Nested under Website Content |
| Automations | `admin-automations` | EXISTS | |
| Developer Tools / Logs | `admin-developer-*` | EXISTS | Keep; do not Wix-brand “Wix Logs” label in UI copy if retitled |
| Edit Site | `admin-site-editor` | EXISTS | Keep destination; may restyle **entry** only |
| Blog / Apps / POS / Sales channels | placeholders or unused | OUT OF SCOPE / MISSING | No fake modules |
| AI Agents | placeholders | MISSING | Do not present as working |

---

## Wix Studio workspace → IMKAN

| Wix Studio | IMKAN | Status | Notes |
|---|---|---|---|
| Discover | none as marketing hub | OUT OF SCOPE | Do not clone Studio Academy / sandbox promo |
| Sites (project cards) | `admin-sites` / `AdminSitesPage` | EXISTS BUT UI WEAK | Today a table + create form; target is Studio-style cards |
| Site card actions (Edit Site) | `openEditor(site)` → `/admin/site-editor?siteId=` | EXISTS | **Do not redesign editor** |
| Create New Site | `createSite` on AdminSitesPage | EXISTS BUT UI WEAK | Keep API; restyle control |
| Domains | `admin-domains` (platform) / tenant domain UI | PARTIAL | Platform list exists; per-site domain on card is weak |
| Team / roles | `admin-staff` | EXISTS | Studio Team is workspace-level; IMKAN is company staff |
| Workspace Settings | `admin-settings` + platform settings | PARTIAL | |
| Templates / Custom Apps / Client Kits | placeholders on **platform** nav | MISSING / OUT OF SCOPE | Honest placeholders only |
| CMS entry | `admin-website-content-cms` | EXISTS BUT NAVIGATION WEAK | |

---

## Proposed IMKAN Company Dashboard groups

Only show a child if it **exists** or is an honest placeholder. Do not add new fake products.

**HOME**
- Overview (`admin`)

**STORE**
- Products, Inventory, Categories, Brands, Product Settings, Trash

**SALES**
- Orders, Delivery (`admin-delivery` if routed), Invoices
- Coupons: only if kept as explicit placeholder, not as a live module

**CUSTOMERS**
- Contacts, Reviews, Inbox, Forms, Employees

**GROWTH**
- Banners, Announcements, Splash Ads, Marketing, SEO placeholder, Analytics

**WEBSITE**
- Sites (`admin-sites`)
- Page Text, Media, Homepage Offers, CMS, Multilingual
- Open Studio / Edit Site → existing editor
- Domains where real

**SETTINGS**
- Company settings, Security, Legal, Policies
- Billing: only where real (Getting Paid / invoices) — no fake billing home

---

## Proposed IMKAN Website / Sites dashboard

Match **Wix Studio Sites** (cards), not the public template.

User should see:

- site/project cards (name, slug/domain, status, locale)
- quick actions: Manage, **Edit Site** (existing editor route), Settings if real
- members/permissions only where `admin-staff` / site permissions already exist
- empty/error from `fetchSites` — no fake sites

Keep `AdminSitesPage` data bindings (`fetchSites`, `createSite`, `openEditor`).

---

## Shared dashboard tokens (proposed)

Map Wix observed → IMKAN CSS variables (implementation **after** this audit):

| Token | Wix observed | Usage |
|---|---|---|
| `--dashboard-font-family` | Madefor → Helvetica Neue / Inter | Shell + pages |
| `--dashboard-font-size-title` | 28px / 36px / 700 | Page H1 |
| `--dashboard-font-size-body` | 14px / 18px / 400–500 | Nav, table, buttons |
| `--dashboard-text-primary` | `#000624` | Titles |
| `--dashboard-text-secondary` | `#333853` | Subtitle, table body |
| `--dashboard-text-muted` | `#CFD0D2` (dark nav) | Dark sidebar labels |
| `--dashboard-bg-app` | `#F0F4F7` | Canvas |
| `--dashboard-bg-sidebar` | `#131720` | Company dashboard sidebar |
| `--dashboard-bg-sidebar-studio` | `#FFFFFF` | Optional Sites-workspace treatment |
| `--dashboard-bg-card` | `#FFFFFF` | Cards, tables |
| `--dashboard-border` | `#F7F8F8` header / `#DFE5EB` chrome | Dividers |
| `--dashboard-sidebar-width` | 255px (Dashboard) / 228px (Studio Sites) | Company shell uses **255** |
| `--dashboard-topbar-height` | 48px | Already `--admin-topnav-h: 48px` |
| `--dashboard-content-gutter` | 48px | Page padding |
| `--dashboard-card-radius` | 8px | Cards, tables |
| `--dashboard-control-radius` | 18px primary / 15px compact | Buttons |
| `--dashboard-button-height` | 36px primary / 30px compact | Buttons |
| `--dashboard-input-height` | ~28–36px | Search / fields |
| `--dashboard-table-row-height` | 42px header / 82px image rows | Tables |
| `--dashboard-shadow-card` | `none` | Cards |
| `--dashboard-shadow-popover` | **NOT_TESTED** | Menus |
| `--dashboard-accent` | `#116DFF` | Primary buttons / selected Studio nav `#A8CAFF` |
| `--dashboard-nav-selected` | `#42454C` | Dark sidebar selected |

Current IMKAN (`global.css` `.admin-studio-shell`): `--admin-topnav-h: 48px` (match), `--studio-sidebar-width: 240px` (vs 255), `--studio-navy: #111827` (vs `#131720`), `--studio-blue: #3b82f6` (vs `#116DFF`).

---

## Files planned for later implementation (not this stop)

**Will change (shell / Sites / tokens / representative CSS):**

- `cpanel/src/styles/global.css` — `.admin-studio-shell` tokens only, scoped; **no** `.storefront-shell` leakage
- `cpanel/src/components/AdminLayout.jsx` — density, grouping labels if needed
- `cpanel/src/data/adminNavigation.js` — regroup **existing** items only
- `cpanel/src/pages/AdminSitesPage.jsx` — card layout, keep APIs
- `cpanel/src/pages/AdminDashboardPage.jsx` — hub spacing/cards, keep data
- Representative CSS for Products / Orders / Contacts / Analytics / Settings pages **without** rewriting business logic

**Protected — do not modify in this feature:**

- `cpanel/src/components/Header.jsx` (storefront)
- `cpanel/src/pages/HomePage.jsx`
- `cpanel/src/components/Footer.jsx`
- `cpanel/src/App.jsx` public storefront tree
- `cpanel/src/components/site-editor/**`
- `cpanel/src/pages/SiteEditorPage.jsx`
- `cpanel/src/utils/siteEditor*.js`
- API, migrations, Production, deploy

---

## Implementation order (after audit sign-off)

1. Global management shell (sidebar 255, topbar 48, gutter 48, colors, type)
2. Company Dashboard hub
3. Website / Sites cards
4. Shared cards / buttons / inputs / tables / badges
5. Products, Orders, Contacts, Analytics, Settings density only

Measure Wix → measure IMKAN → modify → side-by-side → next surface.
