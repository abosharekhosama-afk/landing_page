# Landing Page — Current Capability Matrix

**Baseline:** `manager/develop` @ `2440e6833a2efacb773eb51e19d58086e290f589`
**Primary status source:** `docs/design/IMKAN_FEATURE_GAP_CURRENT.md` (2026-09-19) + forensic refresh 2026-09-22
**Route inventory:** `docs/design/IMKAN_PAGE_BY_PAGE_AUDIT.md` / `_route_classification.json`

Statuses: **AVAILABLE** | **PARTIAL** | **MISSING** | **PLACEHOLDER** | **LEGACY** | **BLOCKED**

---

## 1. Counts (capability rows, N ≈ 72 business capabilities)

| Status | Count | Notes |
|---|---:|---|
| AVAILABLE | **34** | Core commerce, CRM, sites foundation, SEO, bundles, offers/banners, SMS, etc. |
| PARTIAL | **14** | Analytics depth, forms storage, automations, multilingual/CMS shells, order ops extras |
| MISSING | **16** | Multi-warehouse, PSP capture, publish/pages tree, pixels, wishlist, etc. |
| PLACEHOLDER / Soon nav | **65** nav rows | Many are honest Soon; coupons/SEO are **dishonest** (real behind Soon) |
| PLANNED (Studio epic) | **5** | Pages, canvas, breakpoints, CMS dynamic, publish history |
| SKIP / N/A | **3** | POS clone, Digital SQL/PHP tools, wholesale portal (unless tenant needs) |

### Route shape (not the same as capability counts)

| Kind | Count |
|---|---:|
| Unique `/admin` paths | ~166 |
| UNIQUE_REAL_PAGE | 52 |
| NESTED_DETAIL_ROUTE | 48 |
| PLACEHOLDER_SOON | 65 |
| PLATFORM available | 3 (overview, companies, domains) |
| SITE primary | 1 (`/admin/sites`) |
| EDITOR | 1 (`/admin/site-editor` — drafts only) |

---

## 2. Platform

| Capability | Class | Status |
|---|---|---|
| Platform overview | PLATFORM | AVAILABLE |
| Companies + memberships | PLATFORM | AVAILABLE |
| Domains | PLATFORM | AVAILABLE |
| Platform Sites / apps / team / templates | PLATFORM | PLACEHOLDER |
| Workspace / My Sites (account-level) | PLATFORM | MISSING |
| Subscriptions / plans UI | PLATFORM | MISSING |

---

## 3. Site Dashboard (tenant)

| Area | Status summary |
|---|---|
| Catalog (products, categories, brands, trash, bundles, product settings) | AVAILABLE |
| Inventory | AVAILABLE (ops PARTIAL vs multi-warehouse) |
| Orders / delivery / invoices / reviews | AVAILABLE / PARTIAL |
| Coupons / automatic discounts | AVAILABLE API+UI; PLACEHOLDER nav honesty |
| Contacts / inbox | AVAILABLE |
| Forms / meetings / pipelines / loyalty | PARTIAL |
| Marketing (banners, offers, splash, announcements, SMS) | AVAILABLE |
| SEO site + technical SEO | AVAILABLE; nav honesty issue |
| Analytics family | PARTIAL |
| Settings / policies / legal / security / activity | AVAILABLE / PARTIAL (payments stubs) |
| Dropshipping suite | AVAILABLE (IMKAN-specific) |
| Automations | PARTIAL (not real engine) |
| Getting Paid / tax / checkout settings | PARTIAL–PLACEHOLDER |

---

## 4. Website / Studio

| Capability | Status |
|---|---|
| Sites workspace (`/admin/sites`) | AVAILABLE |
| Edit Site entry | AVAILABLE |
| Site editor drafts | PARTIAL |
| Publish / unpublish / rollback | MISSING |
| Pages tree / versions | MISSING / PLANNED |
| Canvas builder / breakpoints | PARTIAL shell / PLANNED |
| CMS collections | PARTIAL |
| Multilingual | PARTIAL |
| Domain ↔ site binding | MISSING (domains are company-scoped) |
| Menu/navigation editor | MISSING / PLANNED |

---

## 5. Dishonest placeholders (P0 honesty)

| Nav label | Reality |
|---|---|
| Coupons | Real manager exists |
| Automatic discounts | Real manager exists |
| SEO & GEO | Real SEO settings exist |

---

## 6. Highest blockers for Landing Page Platform

1. No account-level **My Sites / Workspace** entry (login still company/platform oriented).
2. **Publish** and page SoT missing.
3. **Domains ≠ sites**.
4. Dual site identity (`websiteConnection.siteId` vs `company_sites.id`).
5. Company-scoped content with multi-site ambition.
6. Subscription architecture absent (acceptable if designed now, built later).
