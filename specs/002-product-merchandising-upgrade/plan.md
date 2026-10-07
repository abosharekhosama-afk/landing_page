# Product & Merchandising Upgrade — Final Implementation Plan

**Status:** Final implementation-ready plan — all open decisions CLOSED. Do not start DB migrations or breaking API behavior before phase work is approved. **Current execution scope: Phase A + D ONLY** (do not start implementation until the Phase A + D Implementation/Audit Scope is approved).

**Phase A + D scope document:** `specs/002-product-merchandising-upgrade/phase-a-d-scope.md`

**Stack:** React/Vite cpanel (`cpanel/`), Express API (`api/`), PostgreSQL via SQL migrations (`api/supabase/migrations/`). **No Prisma.** Persistence: `api/src/data/store.js` → `api/src/data/postgresStore.js`.

**Primary surfaces:**

- Admin product editor/list: `cpanel/src/pages/AdminDashboardPage.jsx` (`ProductWizard`, `ProductsListPage`)
- Product schema settings: `cpanel/src/pages/AdminProductSettingsPage.jsx`
- Inventory: `cpanel/src/pages/AdminInventoryPage.jsx`
- Coupon/discount placeholders: `cpanel/src/pages/AdminCatalogPage.jsx`
- Storefront product detail: `cpanel/src/pages/ProductDetailsPage.jsx`
- Checkout: `cpanel/src/pages/CheckoutPage.jsx` (cart: `CartPage.jsx`)
- Storefront API serializer: `api/src/storefront/publicContent.js` (`serializePublicProduct`)
- Product API: `api/src/routes/products.js`

**Delivery rules (all phases):**

1. Do not implement all phases in one PR; break into small reviewable PRs.
2. Maintain tenant isolation everywhere; never hardcode a company/tenant.
3. Public storefront contract changes must be additive whenever possible.
4. Cost Price and internal data must never appear in the Public Serializer; Cost Price requires `products.cost_price.manage` (not `products.update`).
5. Database migrations are PostgreSQL migrations under `api/supabase/migrations`. Do not run migrations unless a phase genuinely requires one; any required migration must be surfaced for review before being applied to any environment. Production must not be touched.
6. Lifecycle changes (Trash / Restore / Permanent Delete) and important mutations require Activity Logs.
7. Every new endpoint requires permission checks and tenant scoping.
8. Backend is authoritative for pricing, permissions, purchase quantities (min/max), discounts, coupons, sales count, and tenant isolation. Frontend validation is UX only.
9. Do not perform broad CPanel refactors.

---

## Executive Summary

This upgrade extends the existing Products & Merchandising system; it does not rebuild it.

**What changes:** Product editor UX and attributes placement; richer product list (search, filters, quick actions, sales count, duplicate); global drag/up-down ordering via batch reorder; soft-delete Trash lifecycle; company-level product settings (including shared low-stock threshold); Related Products and Frequently Bought Together via a typed `product_relations` table; storefront exposure of merchandising flags; optional Product Condition; backend-authoritative bulk discounts and coupons with a defined retail pricing precedence; barcode and variant-level cost price (admin-only).

**What is reused:** Existing product JSONB document + variants; `sortOrder`; featured / newArrival / bestseller flags; filter attributes and tenant product fields; `company_settings.settings`; `homepage_offers` + `promotions-discounts` collection (instead of a new Limited Offers concept); activity log patterns; invoice-style `deleted_at` soft-delete pattern; existing CPanel visual language and inline primitives (`Toolbar`, `AdminTable`, `SearchField`, etc.).

**Architectural approach:** Minimum change — extend existing models/APIs/UI; introduce new tables/endpoints only where finalized decisions require them (`product_relations`, soft-delete column, reorder/duplicate/trash endpoints, discounts/coupons). Limited shared UI extraction only: `ProductPicker`, `AdminTable`, `Toolbar`.

**Implementation strategy:** Ordered phases `A+D → B → C → G → H → E+F → J → I → K+L`, each as one or more small PRs, with verification per phase before proceeding.

---

## Final Architecture Decisions

These decisions are the architecture baseline (**all resolved / FINAL**; not open questions).

| # | Decision |
|---|----------|
| 1 | **Global ordering only** via `product.sortOrder`. Category-specific and homepage-specific ordering are out of scope. |
| 2 | Dedicated batch reorder: `PATCH /api/admin/products/reorder` — tenant-scoped, permission-protected, transaction-safe, **one** audit log entry. |
| 3 | Soft delete via `deleted_at`. Normal `DELETE` → Trash (not permanent). |
| 4 | `products.delete` = Trash. `products.permanent_delete` = permanent delete (not implied by normal delete). |
| 5 | Product settings live in existing `company_settings.settings` with clear API validation. No new settings table. |
| 6 | **Low Stock Threshold** is a single company-level setting, shared by Product List, Inventory, and Dashboard Insights. No hardcoded per-screen values. |
| 7 | Product Condition is optional, disabled by default (`productConditionEnabled`). Values: New / Refurbished / Used. |
| 8 | **No** new `limitedOffer` boolean. Reuse `homepage_offers` and `promotions-discounts` collection. |
| 9 | Add additive `newArrival` and `bestseller` to the Public Storefront Product Serializer. |
| 10 | Related + FBT use typed junction `product_relations` (`source_product_id`, `target_product_id`, `type`, `sort_order`). Types: `related`, `fbt`. Not JSON arrays in `product.data`. |
| 11 | FBT fallback: manual first; else same subcategory, then same category; max 8; exclude current, inactive, trashed. No other recommendation logic. |
| 12 | Product List **Sales Count** from **backend aggregation** (not frontend order scanning). |
| 13 | Duplicate via `POST /api/products/:id/duplicate` — backend owns slug/SKU uniqueness, variants, media, tenant safety. **Media strategy: reference existing media URLs; do not deep-copy assets** (Decision 21). |
| 14 | **Barcode** is an optional product-level field (not required for every tenant). |
| 15 | **Variant-aware Sale Price:** when active sale exists, `price` = sale price, `originalPrice` = regular price; storefront uses selected variant; CPanel and storefront stay consistent. |
| 16 | **Cost Price** is variant-level, admin/internal only, gated by `costPriceEnabled` **and** dedicated permission `products.cost_price.manage` (Decision 23). **Never** use `products.update` for Cost Price access. **Excluded** from Public Serializer and all public/storefront responses. Server-side authorization required. Distinct from `wholesale_price`. |
| 17 | Retail precedence: Base → Sale → Automatic Discount → Coupon → Points. Wholesale is a separate path. All final prices backend-authoritative. |
| 18 | Coupons backend-authoritative; permission `coupons.manage`; server validates expiry, usage limits, min order, active status; company setting show/hide coupon box at checkout. Extend rather than parallelize. |
| 19 | Limited UI extraction only: `ProductPicker`, `AdminTable`, `Toolbar`. No broad CPanel / `AdminDashboardPage.jsx` refactor. |
| 20 | **Restore permission (FINAL):** `POST /api/products/:id/restore` uses existing `products.update`. Do **not** introduce `products.restore`. |
| 21 | **Duplicate media (FINAL):** Reference existing media URLs only. Do not deep-copy images or create new media assets on duplicate. Shared-URL safety is mandatory (see Decision 21 constraints below). |
| 22 | **Min/max purchase quantity (FINAL):** Validate in **both** frontend (UX) and Order API (authoritative). `Frontend validation = UX`. `Backend validation = authoritative enforcement`. Never rely on frontend alone for security/correctness. |
| 23 | **Cost Price permission (FINAL):** Dedicated `products.cost_price.manage`. Visible/editable only when `costPriceEnabled === true` **AND** user has `products.cost_price.manage`. |

### Decision 21 — Duplicate media reference integrity (implementation constraints)

**Current media model (inspected):** Product media is stored as URL strings on the product document / gallery / variants. Uploads live under a **product-scoped storage path** (`api/src/routes/uploads.js`: `/uploads/.../products/:productId/...`). Media delete today deletes the storage object for a path belonging to that product id and does **not** check whether other products still reference the same URL.

**Final strategy:** On `POST /api/products/:id/duplicate`, copy media URL strings onto the new product (primary image, hover, gallery, variant images, etc.). Do **not** upload new files or clone storage objects.

**Required safety constraints (document for Phase B duplicate implementation — do not implement yet):**

1. Multiple products may legally share the same media URL after duplication.
2. Deleting a media asset (upload delete, gallery remove, or permanent product cleanup that removes storage objects) **must not** break another product that still references the same URL.
3. Before deleting an underlying storage object, implementation must verify no other in-tenant product (including variants/gallery fields) still references that URL; if shared, remove the reference from the current product only and **leave the file in place**.
4. Permanent product delete media cleanup must follow the same shared-reference check.
5. Clearing a URL field on one product must not imply storage deletion when the URL remains referenced elsewhere.

---

## Implementation Order

```
A + D → B → C → G → H → E + F → J → I → K + L
```

| Step | Why |
|------|-----|
| **A + D** | Editor UX and Attributes share `ProductWizard`; attributes must surface with daily fields. |
| **B** | Product List + shared list infrastructure (`AdminTable` / `Toolbar` extraction). |
| **C** | Ordering UI builds on list patterns; persists global `sortOrder` via batch API. |
| **G** | Trash/`deleted_at` before relations and storefront exclusions depend on it. |
| **H** | Company product settings (low stock, barcode display, cost price gate, condition gate precursors). |
| **E + F** | Shared `product_relations` + `ProductPicker`. |
| **J** | Merchandising flags + additive serializer fields; Limited Offers via existing systems. |
| **I** | Condition field gated by Phase H setting `productConditionEnabled`. |
| **K + L** | Pricing engine + coupons after retail precedence is fixed; share order-total application path. |

Repository check: this order is technically feasible. No dependency was found that makes it impossible or unsafe. Note: barcode **search** in Phase B cannot fully land until the barcode field exists (Phase H); Phase B ships id/slug search and other list work first, with barcode search completing after H (same list surface, small follow-up PR).

---

## Phase A — Add/Edit Product UX

### Objective

Reorganize `ProductWizard` so daily-use fields appear first; move SEO/marketing/long content into Advanced Settings—without rebuilding the form.

### Current State

- `ProductWizard` in `cpanel/src/pages/AdminDashboardPage.jsx` (also used by `EmployeeDashboardPage.jsx`).
- Tabs: `basic`, `pricing`, `variants`, `media`, `details`, `marketing`, `preview`.
- Sale price exists on variants (`sale_price` / `salePrice`), not prominent on basic.
- Advanced collapse (`advancedOpen`) holds slug, SKU, descriptions, filter attributes, featured flags.
- Save: `CPanelApp.jsx` → `handleSaveProduct` → `cpanel/src/utils/productsApi.js` → `POST/PUT /api/products`.
- Reusable inline primitives in same file: `Toolbar`, `SearchField`, `AdminTable`, `Badge`, collapsible sections, tabs, buttons.

### Scope

**In:** Field re-layout; promote daily fields; Advanced Settings group; preserve save/validation/upload/permissions.

**Out:** New product data model; replacing `TenantProductFields`; changing product schema API; implementing Cost Price / Barcode / Condition fields (those land in H / I); storefront sale-price serializer work (coordinated with pricing consistency—see API note and Phase J/K verification).

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `cpanel/src/pages/AdminDashboardPage.jsx`, `cpanel/src/components/TenantProductFields.jsx`, `cpanel/src/utils/productFilterAttributes.js`, `cpanel/src/data/translations.js` |
| Backend | None required for layout-only UX |
| Tests | `cpanel/test/product-save-flow.test.js`, `cpanel/test/product-filter-attributes.test.js` |

### Implementation Tasks

1. Map each priority field to current form state and tab location.
2. Restructure basic tab order: Name → Price → Sale price (primary variant summary) → Stock → Image + link to media → Category/Brand → Attributes (with Phase D) → Status.
3. Extend existing `advancedOpen` into **Advanced Settings** (slug, SKU, long descriptions, SEO, marketing flags, tenant custom fields).
4. Keep variants/media tabs; retain cross-links (“Manage variants”, “Open media”).
5. Preserve `readOnly`, `canManageContent`, `canManageMedia` gates.
6. Localize new labels via `getText()` / `translations.js`.

### Dependencies

- **Phase D** (attributes placement)—deliver together, separate PR boundaries if needed.
- Cost price / barcode / condition fields appear later (H, I); leave placeholders only if unavoidable—prefer not to add fields early.

### Data Model Changes

None for layout-only work.

### API Changes

None for layout-only work.

**Pricing consistency note (Decision 15):** Variant `sale_price` is already edited in cpanel but `serializePublicProduct()` does not yet apply variant-aware sale pricing. Storefront sale-price behavior is implemented when serializer/pricing work lands (track under storefront pricing tasks tied to Decisions 15/17—do not leave CPanel and storefront permanently divergent). Prefer shipping serializer variant-aware sale mapping in the earliest PR that touches `publicContent.js` for this initiative (often Phase J or a small dedicated pricing PR before K), while Phase A only surfaces the field in UX.

### Frontend Changes

- Extend `ProductWizard` layout only; reuse existing form controls, tabs, collapsible sections.
- No new shared components in Phase A.

### Verification

- Manual create/edit: field order and Advanced collapse.
- `node --test cpanel/test/product-save-flow.test.js`
- `node --test cpanel/test/product-filter-attributes.test.js`
- `cd cpanel && npm run build`

---

## Phase B — Product Management List

### Objective

Improve `ProductsListPage` with clearer columns, search, filters, and quick actions backed by real APIs; introduce limited shared list infrastructure.

### Current State

- `ProductsListPage` in `AdminDashboardPage.jsx`.
- Columns: Image, Name (+ SKU), Category, Brand, Variants, Price, Stock, Status, Created, Updated, Actions.
- Client search: name + SKU; filters: category, brand, active/inactive.
- Actions: Edit (`products.update`), Delete (`products.delete` → currently hard delete until G).
- `GET /api/products` returns full catalog for authenticated users.
- No sales aggregation; no duplicate endpoint; no barcode field yet.
- Low stock hardcoded as `5` in inventory UI and dashboard insights today.

### Scope

**In:** Column clarity; search (id, slug; barcode after H); stock filters; quick actions (Edit, Stock, Deactivate, Duplicate via dedicated API, Delete→Trash after G); Sales Count from backend; extract/reuse `AdminTable` + `Toolbar`.

**Out:** Category/homepage ordering; frontend order aggregation; client-side duplicate via generic `POST /api/products`.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `AdminDashboardPage.jsx`, shared extraction targets under `cpanel/src/components/` (e.g. `AdminTable`, `Toolbar`), `CPanelApp.jsx`, `cpanel/src/utils/productsApi.js`, `inventoryApi.js`, `productStock.js`, `translations.js` |
| Backend | `api/src/routes/products.js`, `postgresStore.js` / order aggregation helpers; optional thin sales helper near `api/src/routes/orders.js` data |
| Tests | `cpanel/test/products-brand-label.test.js`, `api/test/auth-membership.test.js`, new sales-count / duplicate tests |

### Implementation Tasks

1. **Extract** `AdminTable` and `Toolbar` from `AdminDashboardPage.jsx` into shared components; rewire existing call sites in-file with minimal diff (Decision 19).
2. Clarify columns (include sale price when present on primary/selected variant summary).
3. Extend client search to `product.id` and `product.slug`; wire barcode search after Phase H adds the field.
4. Stock filters: in / out / low — consume company `lowStockThreshold` when H is available; until then keep a single temporary constant **only if** H has not shipped, then remove it (Decision 6).
5. Quick action Edit — keep.
6. Quick action Stock — navigate to `admin-inventory` with product filter or open existing stock update pattern (`AdminInventoryPage.jsx` / inventory API).
7. Quick action Deactivate — `PUT` with `isActive: false`; confirm + `message-panel`.
8. Quick action Duplicate — call `POST /api/products/:id/duplicate` (Decision 13); do not clone in the client.
9. Delete — after Phase G: Trash; until G, keep current behavior or hide permanent-feeling copy.
10. **Sales Count** — backend aggregation (Decision 12): least-disruptive approach = include `salesCount` on authenticated `GET /api/products` (and/or details) by aggregating order `items[].productId` server-side. Do not aggregate in the frontend.
11. Empty state — reuse existing `EmptyState`.

### Dependencies

- Phase G for Trash semantics on Delete.
- Phase H for barcode field + shared low-stock threshold.
- Phase C may reuse extracted `AdminTable` / `Toolbar`.
- Duplicate endpoint is part of this phase’s backend work (or a tiny PR immediately before list UI wiring).

### Data Model Changes

None required for list UX beyond what duplicate/sales read from existing orders/products.

### API Changes

| Change | Detail |
|--------|--------|
| Reuse | `GET /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` (Trash after G), `PATCH /api/admin/inventory/:id` |
| Extend | Authenticated product list/detail responses with `salesCount` (integer, tenant-scoped aggregation) |
| New | `POST /api/products/:id/duplicate` — permission `products.create` (or create+update per existing patterns); tenant-scoped; backend generates unique slug/SKU; duplicates variants; **media = reference existing URLs only** (Decision 21; no deep-copy; shared-URL delete safety required); activity `product.duplicated` |

### Frontend Changes

- `ProductsListPage` uses shared `AdminTable` / `Toolbar`.
- Wire duplicate and sales column to new/extended APIs.
- Reuse `SearchField`, `Badge`, `row-actions`, confirm dialogs, `message-panel`.

### Verification

- Permission matrix: `products.update`, `products.delete`, `products.create` (duplicate).
- Tenant isolation on duplicate and salesCount.
- `api/test/auth-membership.test.js` + new API tests for duplicate and salesCount.
- Manual list search/filters/actions.
- Storefront unchanged except where other phases touch serializer.

---

## Phase C — Product Ordering

### Objective

Global product ordering UI (drag-and-drop and up/down) persisted via dedicated batch reorder API on `product.sortOrder`.

### Current State

- Product-level `sortOrder` in product JSONB `data`; storefront sorts via `serializePublicProduct` / content builder (`sortOrder` then slug).
- No dedicated reorder API — only per-product `PUT`.
- Categories/brands already have validated `sortOrder` PATCH patterns (`api/test/catalog-settings.test.js`).
- No category-specific product order table (and none will be added — Decision 1).

### Scope

**In:** Global ordering UI + `PATCH /api/admin/products/reorder` (Decision 2).

**Out:** Category-specific ordering; homepage-specific ordering.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | Ordering UI in/near products admin (`AdminDashboardPage.jsx` or small dedicated section + `adminNavigation.js` / `cpanelAccess.js` / `moduleRegistry.js` only if a separate route is required), shared `AdminTable` / `Toolbar`, `productsApi.js` |
| Backend | `api/src/routes/products.js` (or admin products route module), `postgresStore.js`, activity log |
| Storefront | Confirm existing sort by `sortOrder` in `publicContent.js` / storefront consumers |
| Tests | New reorder API test alongside catalog-settings style tests |

### Implementation Tasks

1. Confirm storefront already honors `sortOrder` (it does in content payload sorting).
2. Implement `PATCH /api/admin/products/reorder`:
   - Body: ordered product IDs (or id + sortOrder pairs).
   - Tenant-scoped; reject IDs outside company.
   - Permission: `products.update` (or `products.manage` if that is the existing manage gate—align with route norms in `products.js`).
   - Single DB transaction updating all `sortOrder` values.
   - **One** activity log entry for the batch (e.g. `product.reordered`).
3. Build ordering UI: drag (reuse gallery drag patterns in `ProductWizard`) and up/down; reuse `AdminTable` / `Toolbar`.
4. Persist on explicit save or on drop—show loading/error via `message-panel`.
5. Do not implement multi-PUT client loops.

### Dependencies

- Phase B shared list components.
- Does **not** depend on Phase J for homepage order (homepage order out of scope).

### Data Model Changes

None new — reuse `sortOrder` on product document / denormalized fields as today. No junction table.

### API Changes

| Endpoint | Method | Notes |
|----------|--------|--------|
| `/api/admin/products/reorder` | `PATCH` | **New.** Tenant + permission + transaction + one audit log. |
| Do not use | Multiple `PUT /api/products/:id` for reorder | Explicitly out. |

### Frontend Changes

- Ordering view reusing `AdminTable` / `Toolbar`; existing admin panel card styling.
- No broad dashboard restructure.

### Verification

- API test: reorder persistence, tenant rejection, permission denial, single audit row.
- Storefront `/api/storefront/content` reflects new order.
- Manual drag / up-down smoke test.

---

## Phase D — Attributes

### Objective

Improve existing attributes UX (filter groups + variant attributes + tenant fields) without replacing systems.

### Current State

1. Catalog filter attributes — `shared/catalog/productFilterAttributes.js`, `api/src/catalog/productFilterAttributes.js`, cpanel mirror. Stored on product JSONB; normalized in catalog hierarchy.
2. Variant attributes — color/size on variants; schema defaults in `api/src/productSchema/schema.js`.
3. Tenant custom fields — `product_field_definitions` / `product_field_values`; `TenantProductFields.jsx`, `AdminProductSettingsPage.jsx`.

Filter attributes currently live mainly in Advanced collapse.

### Scope

**In:** Promote filter attributes into a first-class Attributes block; clearer labels; validation feedback.

**Out:** New global attribute master tables; new attributes platform.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `AdminDashboardPage.jsx`, `TenantProductFields.jsx`, `AdminProductSettingsPage.jsx`, `productFilterAttributes.js`, `productSchemaUi.js`, `translations.js` |
| Backend | `api/src/routes/catalogHierarchy.js`, `api/src/catalog/productFilterAttributes.js`, `api/src/routes/products.js` |
| Tests | `cpanel/test/product-filter-attributes.test.js`, `api/test/product-filter-attributes.test.js` |

### Implementation Tasks

1. Map Color/Size → variants; Age/Material/Gender/etc. → filter groups; iCare-specific → tenant fields.
2. Promote filter attributes into Attributes block on basic (with Phase A).
3. Reuse existing checkbox multi-select patterns; import options from `shared/catalog/productFilterAttributes.js` only.
4. Surface `validateCatalogHierarchySelection` / filter errors inline.
5. Do not duplicate option lists.

### Dependencies

- Phase A for editor placement.

### Data Model Changes

None — reuse existing product PUT + filter normalization.

### API Changes

Reuse existing product create/update and filter normalization. No new endpoints.

### Frontend Changes

- Attributes block in `ProductWizard`; keep `TenantProductFields` as-is for custom fields.

### Verification

- Existing filter attribute tests (api + cpanel).
- Save product; confirm `filterAttributes` in `serializePublicProduct()`.

---

## Phase E — Related Products

### Objective

Admin selects related products; persist in `product_relations` (`type = related`); storefront displays them (additive contract).

### Current State

- No related-product tables/routes.
- `ProductDetailsPage.jsx` `getRelatedProducts()` — client same-category fallback, max 8; not persisted.
- No admin related-products UI.

### Scope

**In:** Manual related products end-to-end via shared relation infrastructure (Decision 10).

**Out:** ML recommendations; FBT-specific fallback (Phase F); JSON arrays in `product.data`.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `ProductWizard` in `AdminDashboardPage.jsx`, `ProductDetailsPage.jsx`, `cpanel/src/components/ProductPicker.jsx` (new), `cpanel/src/utils/relatedProductsApi.js` (or products relations util) |
| Backend | New route helpers under `api/src/routes/` (products relations), `postgresStore.js`, migration under `api/supabase/migrations/` |
| Storefront | `publicContent.js` and/or storefront product detail — additive related summaries |
| Tests | New API + cpanel tests |

### Implementation Tasks

1. Migration: `product_relations` (see Data Model).
2. API: get/replace related targets for a source product (`type=related`), permission `products.update`, tenant-scoped.
3. Extract/create **`ProductPicker`** (Decision 19): search + multi-select; reuse `SearchField` / list patterns; exclude self; exclude trashed/inactive as needed.
4. Activity log on relation replace (e.g. `product.relations_updated`).
5. Storefront: additive `relatedProducts` (or ids + summaries) on public product payload; respect visibility (active, not trashed).
6. `ProductDetailsPage`: prefer manual relations when present.

### Dependencies

- Phase G — exclude trashed products.
- Phase F — same table and `ProductPicker`.
- Shared components from B.

### Data Model Changes

**New table `product_relations`:**

| Column | Notes |
|--------|--------|
| `id` | PK |
| `company_id` | Tenant isolation (required) |
| `source_product_id` | FK → `products(id)` |
| `target_product_id` | FK → `products(id)` |
| `type` | text/enum: `related` \| `fbt` |
| `sort_order` | int, ordering support |
| timestamps | created_at / updated_at as per repo norms |

**Constraints / indexes:**

- Unique `(company_id, source_product_id, target_product_id, type)`.
- Check `source_product_id <> target_product_id`.
- Indexes on `(company_id, source_product_id, type, sort_order)` and FKs.
- On permanent delete of a product: delete relations where source or target matches (Phase G).

Do **not** store relations in `products.data` JSON.

### API Changes

- New tenant-scoped endpoints, e.g. `GET/PUT /api/products/:id/relations?type=related` (or dedicated related path). Prefer extending product routes consistently with existing `/api/products/:id/...` patterns.
- Permission: `products.update` for mutations; `products.view` for admin reads.
- Public read via storefront serializer/detail only (additive).

### Frontend Changes

- Related section in `ProductWizard` using `ProductPicker`.
- Storefront detail section uses API data when present.

### Verification

- CRUD/replace relations; uniqueness; tenant isolation; self-link rejected.
- Storefront shows selected related products; trashed/inactive excluded.
- Activity log present.

---

## Phase F — Frequently Bought Together

### Objective

Manual FBT selection with Decision 11 fallback when manual list is empty; share `product_relations` + `ProductPicker`.

### Current State

- Missing entirely (no backend, admin UI, or storefront section).

### Scope

**In:** Manual FBT (`type = fbt`) + fallback: same subcategory → same category; max 8; exclude current, inactive, trashed.

**Out:** Extra recommendation logic; cart auto-add (display only unless later scoped).

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `ProductWizard` FBT section; `ProductDetailsPage.jsx` FBT block; `ProductPicker` |
| Backend | Same relations module as Phase E; storefront resolver for FBT |
| Tests | FBT precedence + fallback tests |

### Implementation Tasks

1. Reuse `product_relations` with `type = fbt`.
2. Admin UI: same `ProductPicker` as E (do not duplicate).
3. API: get/replace FBT IDs (`type=fbt`).
4. Storefront resolver:
   - If manual FBT non-empty → use manual order (cap 8).
   - Else → same `subcategoryId`, then fill from same `categoryId`; max 8; exclude current, inactive, trashed.
5. Display section on product detail only (unless product later expands cart).

### Dependencies

- Phase E (table, picker, API patterns).
- Phase G (trash exclusion).

### Data Model Changes

None beyond Phase E table (`type` already supports `fbt`).

### API Changes

Same relations API with `type=fbt`, or parallel subpath. Public additive FBT field on storefront product detail/content.

### Frontend Changes

- FBT block in editor + storefront; reuse `ProductPicker`.

### Verification

- Manual list overrides fallback.
- Empty manual → subcategory then category; max 8; exclusions enforced.
- Tenant isolation.

---

## Phase G — Product Trash

### Objective

Soft delete with Trash, Restore, and Permanent Delete; dedicated permanent-delete permission; audit logs; trashed products hidden from storefront and relation pickers.

### Current State

- `DELETE /api/products/:id` hard-deletes (`deleteProductWithTenantCatalogLock`).
- Audit: `product.deleted` via `recordActivityLog` → `company_activity_logs`.
- Permissions: `products.delete` only; no `products.permanent_delete`.
- Soft-delete precedent: invoices / delivery zones (`deleted_at`).
- `products` table has no `deleted_at` (`api/supabase/schema.sql`).

### Scope

**In:** `deleted_at` soft delete (Decision 3); DELETE → Trash; restore; permanent delete with `products.permanent_delete` (Decision 4); admin trash view; storefront exclusion.

**Out:** Using `products.delete` for permanent delete; status-flag-only trash without `deleted_at`; introducing `products.restore` (Restore uses `products.update` — Decision 20).

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `ProductsListPage`, Trash view, `CPanelApp.jsx`, `adminNavigation.js`, shared `AdminTable` / `Toolbar`, `productsApi.js` |
| Backend | `api/src/routes/products.js`, `postgresStore.js`, migration, `publicContent.js`, storefront queries, permissions in `api/src/data/store.js` + `cpanel/src/data/permissions.js` |
| Tests | `api/test/auth-membership.test.js`, new trash tests |

### Implementation Tasks

1. Migration: add `deleted_at timestamptz null` (and optionally `deleted_by`) to `products`; index `(company_id, deleted_at)`.
2. Change `DELETE /api/products/:id` to set `deleted_at` (Trash); permission `products.delete`; activity `product.trashed` (replace or supersede hard `product.deleted` semantics).
3. Restore endpoint: `POST /api/products/:id/restore` — clear `deleted_at`; activity `product.restored`; permission **`products.update`** (Decision 20). Do **not** add `products.restore`.
4. Permanent delete: e.g. `DELETE /api/products/:id/permanent` (or `POST .../permanent-delete`) — permission **`products.permanent_delete` only**; purge row + cascade/cleanup `product_relations`; activity `product.permanently_deleted`.
5. Add `products.permanent_delete` to `allPermissions` and cpanel permissions UI.
6. `GET /api/products` excludes trashed by default; `?trash=true` for admin trash list (view permission gated).
7. Storefront: exclude `deleted_at IS NOT NULL` everywhere products are listed or serialized.
8. Admin Trash UI: reuse `AdminTable` / `Toolbar`; restore + permanent actions with confirm.

### Dependencies

- Phase B delete action becomes “Move to Trash”.
- Phases E/F permanent-delete cleanup of relations.
- Shared list components.

### Data Model Changes

- Extend `products` with `deleted_at` (and optional `deleted_by`).
- Update store queries to filter soft-deleted by default.

### API Changes

| Endpoint | Behavior | Permission |
|----------|----------|------------|
| `DELETE /api/products/:id` | Trash (`deleted_at=now()`) | `products.delete` |
| `POST /api/products/:id/restore` | Clear trash | `products.update` (Decision 20; no `products.restore`) |
| Permanent delete endpoint | Hard remove | `products.permanent_delete` |
| `GET /api/products?trash=true` | List trashed | `products.view` (+ delete/permanent as needed for actions) |

### Frontend Changes

- List Delete → Trash; new Trash view; no broad dashboard rewrite.

### Verification

- Trashed absent from `/api/storefront/content` and product slug routes.
- Restore returns to catalog; requires `products.update`; no `products.restore` permission exists.
- Permanent delete denied without `products.permanent_delete`.
- Activity log entries for trash/restore/permanent.
- Tenant isolation tests.

---

## Phase H — Product Settings

### Objective

Company-level product display/behavior settings in `company_settings.settings`; barcode field; variant-level cost price (`products.cost_price.manage` + `costPriceEnabled`); single low-stock threshold used everywhere; min/max purchase qty with dual-layer validation (Decision 22).

### Current State

- `AdminProductSettingsPage.jsx` = product **form schema** editor (`/api/admin/product-schema`), not merchandising toggles.
- `GET/PATCH /api/company/settings` — validated keys only (name, logo, theme, currency, etc.) in `api/src/routes/company.js`.
- Low stock hardcoded `5` in `api/src/analytics/dashboardInsights.js` and `AdminInventoryPage.jsx`.
- No barcode / cost price fields.

### Scope

**In:** Settings keys in `company_settings.settings` (Decision 5); company-level `lowStockThreshold` (Decision 6); optional barcode product field (Decision 14); variant-level cost price excluded from public serializer (Decision 16); gates for condition feature setting used by Phase I.

**Out:** New settings table; replacing schema editor; conflating cost price with `wholesale_price`.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | Merchandising settings UI (extend `AdminProductSettingsPage.jsx` or adjacent section—not a new settings system), `ProductWizard`, `AdminInventoryPage.jsx`, `DashboardInsightsPanel.jsx`, `ProductsListPage`, `companyApi.js` |
| Backend | `api/src/routes/company.js` (`validateSettingsPatch`), `api/src/tenancy/company.js`, `products.js`, `dashboardInsights.js`, `publicContent.js` |
| Tests | Settings validation tests; serializer exclusion tests for cost price |

### Implementation Tasks

1. Extend `validateSettingsPatch` / allowed settings with product merchandising keys, including at minimum:
   - `lowStockThreshold` (number, validated range)
   - Display toggles as required by original Phase H intent: e.g. sort newest, show SKU / barcode / product id / stock, min/max purchase qty
   - `costPriceEnabled` (feature gate only — not sufficient alone for Cost Price access)
   - `productConditionEnabled` (for Phase I; default false)
   - `showCouponBoxAtCheckout` (for Phase L; may land with L but key belongs in settings)
2. Admin UI for these toggles/fields; reuse existing settings/form control patterns.
3. **Barcode:** optional product-level field on product document; editor under Advanced; list search completes Phase B barcode filter.
4. **Cost price (Decision 16 + 23):** variant-level field in variants editor; visible/editable **only** when `costPriceEnabled === true` **AND** user has `products.cost_price.manage`. Do **not** gate Cost Price with `products.update`. Enforce permission server-side on read/write of cost fields; **strip from** `serializePublicProduct` and any public variant mapping; frontend hide is not sufficient; do not confuse with `wholesale_price`.
5. **Min/max purchase quantity (Decision 22):** store company settings; frontend enforces UX limits with user feedback; Order API must validate and reject out-of-range quantities. `Frontend validation = UX`. `Backend validation = authoritative enforcement`.
6. Replace hardcoded `5` in:
   - `api/src/analytics/dashboardInsights.js`
   - `cpanel/src/pages/AdminInventoryPage.jsx`
   - Product List low-stock filter
   with the company setting (Decision 6).
7. Ensure public settings exposure does not leak internal-only admin keys if a public settings subset exists—follow existing `publicSettingKeys` patterns.
8. Add `products.cost_price.manage` to `allPermissions` (`api/src/data/store.js`) and `cpanel/src/data/permissions.js`.

### Dependencies

- Phase B (columns/filters/search).
- Phase I (reads `productConditionEnabled`).
- Phase L (coupon box setting).

### Data Model Changes

- No new table.
- Product JSONB: optional `barcode`.
- Variant JSONB (and/or column if repo prefers consistency with `wholesale_price`): `cost_price` / `costPrice` — admin only.

### API Changes

- Extend `PATCH /api/company/settings` validation.
- Extend product/variant write validation for barcode and cost price.
- Cost price read/write on admin product APIs requires `products.cost_price.manage` (and feature enabled); omit/strip cost fields for callers without that permission.
- Public serializer: never emit cost price.
- Order create (`orders.js`): enforce min/max purchase quantity server-side (Decision 22).

### Frontend Changes

- Settings section + wizard fields; inventory/list/insights read one threshold.

### Verification

- Settings round-trip + validation errors.
- Grep/tests: `costPrice` / `cost_price` absent from public serializer output.
- Cost price visible/editable only with `costPriceEnabled` + `products.cost_price.manage`; denied without the dedicated permission even if user has `products.update`.
- List, Inventory, Insights all use the same threshold value.
- Barcode optional; tenants without it unaffected.
- Min/max: frontend UX blocks invalid qty; Order API rejects invalid qty when frontend is bypassed.

---

## Phase I — Product Condition

### Objective

Optional product condition (New / Refurbished / Used), gated by `productConditionEnabled` (default disabled).

### Current State

- No condition field in schema, DB, API, or storefront.

### Scope

**In:** Optional field + company gate (Decision 7).

**Out:** Shipping UI when setting disabled; conflating with filter attribute groups.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `ProductWizard` Advanced, settings (H), optional `ProductDetailsPage.jsx` display |
| Backend | `products.js` validation, `publicContent.js` (additive `condition` only when enabled / present) |
| Tests | Enable/disable behavior tests |

### Implementation Tasks

1. Store `condition` on product document: `new` \| `refurbished` \| `used` (API enum aligned to New/Refurbished/Used labels).
2. Show admin control only when `productConditionEnabled` is true.
3. Storefront: additive field when enabled and set; omit when disabled.
4. Do not mix with material/productType filter groups.

### Dependencies

- Phase H for `productConditionEnabled`.

### Data Model Changes

- Product JSONB field `condition` (optional). No mandatory migration column unless preferred for indexing—JSONB is consistent with existing document model.

### API Changes

- Validate enum on write when present; ignore/hide when company setting disabled.

### Frontend Changes

- Conditional select in Advanced Settings; optional storefront display.

### Verification

- Disabled: hidden in admin; not required; public payload omits or ignores.
- Enabled: save/display works; additive only.

---

## Phase J — Featured / New Arrivals / Limited Offers

### Objective

Clear management for Featured / New Arrivals / Bestsellers using existing flags; Limited Offers via existing `homepage_offers` + `promotions-discounts`—no new `limitedOffer` boolean.

### Current State

- Flags: `featured`, `newArrival`, `bestseller` in wizard + schema; DB `is_featured`.
- Serializer exposes **`featured` only** — not `newArrival` / `bestseller`.
- Collection filter includes `promotions-discounts`, `new-arrivals`.
- `homepage_offers` table + `api/src/routes/homeOffers.js`; `HomeContentManager.jsx` exists but is poorly wired.

### Scope

**In:** Manage existing flags; additive serializer fields (Decision 9); reuse homepage offers + promotions collection (Decision 8).

**Out:** New `limitedOffer` flag/system; homepage-specific product ordering (Decision 1).

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `ProductWizard` marketing flags, optional list filters/badges, `HomeContentManager.jsx` / home offers wiring if needed for Limited Offers ops |
| Backend | `publicContent.js`, `products.js` flag normalization |
| Storefront | `ProductsPage.jsx`, site editor `productCollection` sources |
| Tests | `api/test/storefront-content.test.js` |

### Implementation Tasks

1. Map Featured → `featured`/`is_featured`; New Arrivals → `newArrival` + collection `new-arrivals`; Limited Offers → `homepage_offers` and/or `collection: promotions-discounts`.
2. Add **`newArrival`** and **`bestseller`** to `serializePublicProduct()` as additive booleans (Decision 9).
3. Optional admin filters/badges on product list for these flags (reuse list infrastructure).
4. Ensure Limited Offers operators use existing offers/promotions paths—not a parallel product boolean.
5. Align variant-aware sale price in serializer if not already shipped (Decision 15): for each variant and product summary, when sale price active → `price` = sale, `originalPrice` = regular; selected variant drives storefront display.

### Dependencies

- Phase C does not require homepage order.
- Pricing consistency with Decision 15.

### Data Model Changes

None new for flags. No `limitedOffer` column/flag.

### API Changes

- Additive public fields: `newArrival`, `bestseller`.
- Additive/adjusted pricing fields behavior for sale price (variant-aware)—backward compatible shapes (`price`, `originalPrice`).

### Frontend Changes

- Flag management remains in marketing/advanced; list filters optional; home offers reuse.

### Verification

- Toggle flags → storefront `/content` reflects additive fields.
- `api/test/storefront-content.test.js`
- Site editor collections still resolve.
- No `limitedOffer` introduced.

---

## Phase K — Bulk Discounts

### Objective

Implement automatic/bulk discounts (product / category / brand targets) with backend-authoritative application under Decision 17 precedence. Replace `AutomaticDiscountsPage` placeholder.

### Current State

- `AutomaticDiscountsPage` in `AdminCatalogPage.jsx` — placeholder (`onUnsupported`).
- No discount tables/routes; orders only support `discount_from_points`.
- Wholesale path separate (`008_wholesale_trader.sql`).

### Scope

**In:** Discount CRUD; targets; % or fixed; schedule; optional rounding; apply in backend retail pricing pipeline after Sale Price, before Coupon/Points.

**Out:** Wholesale automatically stacking with retail promos; frontend as source of truth; inventing extra precedence tiers.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `AdminCatalogPage.jsx` (`AutomaticDiscountsPage`), `adminNavigation.js`, `cpanelAccess.js` / `moduleRegistry.js` as needed to promote placeholder route |
| Backend | New discounts module (routes + store), migration, pricing helper used by `orders.js` and storefront price resolution |
| Tests | New discount suite; order pricing regression; wholesale untouched |

### Implementation Tasks

1. Migration: `automatic_discounts` (company-scoped) with targets (product IDs and/or category_id / brand_id), type (`percentage`|`fixed`), value, start/end, `round_final_price`, active/draft status.
2. Admin CRUD under e.g. `/api/admin/discounts` — tenant-scoped; permission aligned to catalog/products manage norms (document exact key in PR; do not invent a parallel unauthorized surface).
3. Replace placeholder UI using existing catalog table/toolbar/empty patterns in `AdminCatalogPage.jsx` (prefer those patterns; shared `AdminTable`/`Toolbar` where they fit without broad refactor).
4. Backend pricing helper implementing retail chain:
   `Base → Sale Price → Automatic Discount → Coupon → Points`
5. Wire into order create path so submitted retail line prices are enforced server-side (extend beyond today’s trader-only `enforceItemPrices`).
6. Wholesale remains separate path (Decision 17).
7. Activity logs for discount create/update/activate as appropriate.

### Dependencies

- Phase L shares order-total pipeline and precedence.
- Decision 15 sale price must be visible to the pricing helper.

### Data Model Changes

**New** `automatic_discounts` (+ optional target junction or jsonb targets with validation)—company_id required; indexes for active window queries.

### API Changes

- New admin CRUD endpoints; no public mutation.
- Storefront/order reads effective prices via backend helpers only.

### Frontend Changes

- Wire `AutomaticDiscountsPage` to real API; reuse catalog UI patterns.

### Verification

- CRUD + permission + tenant tests.
- Pricing cases: base only; with sale; with automatic discount; ensure order total matches backend.
- Wholesale/trader tests still pass unchanged.
- Frontend cannot bypass discount rules by posting arbitrary prices.

---

## Phase L — Coupons

### Objective

Implement coupons (replace placeholder) as backend-authoritative discounts with `coupons.manage`, checkout coupon box company setting, and server-side validation.

### Current State

- No coupons tables/routes.
- `CouponsPage` in `AdminCatalogPage.jsx` — empty shell.
- Nav placeholder: `admin-tenant-placeholder-catalog-discounts-coupons`.
- `CheckoutPage.jsx` / `CartPage.jsx` — no coupon box today.
- Points discount exists on orders; not coupons.

### Scope

**In:** Full coupon CRUD; fields (code, type, value, usage limit, min order, schedule, active, admin note); `coupons.manage`; checkout show/hide setting; apply on order total server-side (Decision 18).

**Out:** Parallel coupon system; frontend-validated-only coupons; “suggest coupon” unless already trivial UI.

### Affected Files / Areas

| Layer | Paths |
|--------|--------|
| Frontend | `AdminCatalogPage.jsx`, `couponsApi.js`, `CheckoutPage.jsx`, company settings UI for coupon box visibility |
| Backend | New `coupons` table + routes, `orders.js` application, `company.js` setting `showCouponBoxAtCheckout`, permissions lists |
| Tests | Coupon validation matrix; order total tests; permission tests |

### Implementation Tasks

1. Migration: `coupons` table (company_id, code unique per tenant, type, value, usage_limit, used_count, min_order, starts_at, ends_at, active, admin_note, …).
2. Admin API `/api/admin/coupons` — permission **`coupons.manage`**; tenant-scoped.
3. Add `coupons.manage` to `api/src/data/store.js` `allPermissions` and `cpanel/src/data/permissions.js`.
4. Wire `CouponsPage` to real data; create/edit UI reusing catalog modal/form patterns.
5. Company setting: show/hide coupon box at checkout (Decision 18) via `company_settings.settings`.
6. Checkout: render coupon box when setting enabled; submit code with order; **server** validates expiry, usage limits, min order, active status; apply after automatic discounts per Decision 17; reject invalid codes.
7. Activity logs for coupon manage + redemption as appropriate.
8. Promote placeholder nav to real module keys if required by `cpanelAccess.js` / `moduleRegistry.js`.

### Dependencies

- Phase K pricing precedence / shared order pricing helper.
- Phase H settings storage pattern (same `company_settings.settings`).

### Data Model Changes

**New** `coupons` (+ optional `coupon_redemptions` if needed for usage integrity).

### API Changes

| Area | Detail |
|------|--------|
| Admin CRUD | `/api/admin/coupons` + `coupons.manage` |
| Order create | Accept coupon code; server applies; never trust client discount amount |
| Settings | `showCouponBoxAtCheckout` boolean |

### Frontend Changes

- Real Coupons admin page; conditional checkout coupon box.
- Frontend never treated as source of truth for validity or discount amount.

### Verification

- Valid / expired / usage exceeded / min order / inactive cases.
- Order total reflects server-applied coupon.
- Setting hides/shows checkout box.
- Permission denied without `coupons.manage`.
- Tenant isolation on codes.

---

## Cross-Phase Dependencies

| Dependency | Phases |
|------------|--------|
| Attributes placement in editor | A ↔ D |
| `AdminTable` / `Toolbar` extraction | B → C, G (and catalog pages where reused) |
| `ProductPicker` | E → F |
| Trash / `deleted_at` exclusions | G → B (delete UX), E, F, storefront, relations |
| Low-stock threshold setting | H → B, Inventory, Dashboard Insights |
| Barcode field then list search | H → B (barcode search completion) |
| `productConditionEnabled` | H → I |
| `product_relations` shared model | E + F |
| Sale price + retail precedence | J/pricing helper → K → L → orders |
| Coupons after automatic discounts in chain | K → L |
| Permanent delete cleans relations | G → E/F data |

---

## Shared Components

Limited extraction only (Decision 19). **Do not** broadly refactor `AdminDashboardPage.jsx` or CPanel.

| Component | Origin | Reuse |
|-----------|--------|--------|
| **`Toolbar`** | Today inline in `AdminDashboardPage.jsx` | Extract; use in B, C, E/F toolbars, G trash list |
| **`AdminTable`** | Today inline in `AdminDashboardPage.jsx` | Extract; use in B, C, G, and relation pickers where a table fits |
| **`ProductPicker`** | **Does not exist today** — new shared component | Why new: no existing multi-select product chooser; building it once avoids duplicating search+select in E and F. Reuse `SearchField`, list row patterns, badges—not a new design system. |

All other UI (buttons, modals, confirms, empty states, badges, tabs, inventory patterns, catalog table patterns) should reuse existing in-place components/classes. Prefer `AdminCatalogPage.jsx` patterns for K/L rather than inventing new chrome.

---

## Database / Migration Summary

All migrations: `api/supabase/migrations/` (next numbers after `020_...`).

### Existing structures reused

- `products` / `product_variants` / gallery; JSONB `data`
- `product.sortOrder`, flags (`featured`, `newArrival`, `bestseller`)
- `company_settings.settings`
- `homepage_offers`
- `company_activity_logs`
- Filter attributes / tenant field tables
- `product_variants.wholesale_price` (unchanged meaning)

### Existing structures extended

- `products.deleted_at` (soft delete)
- `company_settings.settings` keys (product merchandising, low stock, condition gate, coupon box, etc.)
- Product JSONB: `barcode`, optional `condition`
- Variant data: `costPrice` / `cost_price`; existing `sale_price` becomes pricing-authoritative with Decision 15
- Permissions lists: `products.permanent_delete`, `products.cost_price.manage`, `coupons.manage`

### New structures required

- `product_relations` (Decision 10)
- `automatic_discounts` (+ targets as designed in K)
- `coupons` (+ redemptions if needed)

### Not created

- Product settings table
- `limitedOffer` flag/table
- Category/homepage product order tables
- Generic recommendation engine tables

---

## API Change Summary

### New endpoints

| Endpoint | Purpose | Permission |
|----------|---------|------------|
| `PATCH /api/admin/products/reorder` | Batch global sort | `products.update` (align with products route norms) |
| `POST /api/products/:id/duplicate` | Server-side duplicate; media URLs referenced (Decision 21) | `products.create` (align with create semantics) |
| `POST /api/products/:id/restore` | Restore from trash | `products.update` (Decision 20; no `products.restore`) |
| Permanent delete path on product | Hard delete | `products.permanent_delete` |
| Product relations get/put | Related + FBT | `products.update` / view |
| `/api/admin/discounts` CRUD | Automatic discounts | Catalog/products manage (document in PR) |
| `/api/admin/coupons` CRUD | Coupons | `coupons.manage` |

### Extended endpoints

| Endpoint | Change |
|----------|--------|
| `DELETE /api/products/:id` | Soft delete (Trash) |
| `GET /api/products` | Exclude trashed by default; `?trash=true`; authenticated `salesCount` |
| `POST/PUT /api/products` | barcode, condition, cost price on variants (cost price gated by `products.cost_price.manage`), sale price semantics unchanged at rest |
| `GET/PATCH /api/company/settings` | New validated merchandising keys |
| `POST` order create (`orders.js`) | Enforce retail pricing chain; apply coupon server-side; **enforce min/max purchase quantity** (Decision 22) |
| Storefront content/product | Additive fields; variant-aware sale; relations/FBT; exclude trashed |

### Contract / safety

- Tenant scope on every query/mutation.
- Public changes additive.
- Cost price never public; Cost Price access requires `products.cost_price.manage` (not `products.update`).
- Coupons/discounts/salesCount/purchase quantities backend-authoritative.
- Shared media URLs after product duplicate must survive media delete of one referencing product (Decision 21).

---

## Storefront Contract Changes

### Additive (safe)

- `newArrival`, `bestseller` booleans
- Related products / FBT payloads (summaries)
- Optional `condition` when feature enabled
- Pricing: `price` / `originalPrice` reflecting active sale (variant-aware); shape already exists

### Protected / never expose

- `costPrice` / `cost_price`
- Internal wholesale admin fields beyond existing public stripping rules
- Trashed products (`deleted_at` set)
- Inactive products where existing filters already exclude them

### Behavior

- Variant-aware sale price consistent with CPanel (Decision 15)
- FBT/related respect active + not trashed
- Limited Offers via existing offers/promotions—not a new product boolean

---

## Permission & Audit Summary

### Permissions

| Permission | Use |
|------------|-----|
| `products.delete` | Move to Trash only |
| `products.permanent_delete` | **New.** Permanent delete only |
| `products.update` | Existing product updates **and Restore from Trash** (Decision 20). Do **not** introduce `products.restore`. Does **not** grant Cost Price access. |
| `products.cost_price.manage` | **New (Decision 23).** View/edit variant Cost Price when `costPriceEnabled === true`. Server-enforced; never implied by `products.update`. |
| `coupons.manage` | **New.** Coupon admin CRUD / manage |
| `products.create` / `products.view` | Existing; duplicate / list as specified |
| `company_settings.update` | Product merchandising settings keys |

### Activity log (minimum)

| Action | When |
|--------|------|
| `product.trashed` | Soft delete |
| `product.restored` | Restore |
| `product.permanently_deleted` | Permanent delete |
| `product.reordered` | Batch reorder (**one** entry) |
| `product.duplicated` | Duplicate |
| Relations / merchandising / discount / coupon mutations | Follow existing `recordActivityLog` patterns |

Use `api/src/activityLog/logger.js` → `company_activity_logs`.

---

## Verification Strategy

### Backend

- `node --test` on touched `api/test/*.test.js` (products, auth-membership, storefront-content, catalog-settings, new trash/relations/reorder/duplicate/discounts/coupons/pricing tests).

### Frontend

- `node --test` on `cpanel/test/product-*.test.js`, catalog/roles tests as touched.
- `cd cpanel && npm run build`.

### Database

- Migration up on clean DB; soft-delete column; relation constraints; coupon/discount uniqueness per tenant.

### Permissions & tenant isolation

- Matrix for delete vs permanent_delete vs restore (`products.update`) vs `products.cost_price.manage` vs `coupons.manage`.
- Cross-tenant ID rejection on reorder, relations, duplicate, discounts, coupons.
- Cost Price omitted from responses for users without `products.cost_price.manage`.

### Storefront

- Trashed/inactive exclusions; additive fields; no cost price leakage; variant sale consistency; FBT fallback rules.

### Pricing

- Precedence cases Base → Sale → Auto → Coupon → Points; wholesale path isolated; client-submitted prices cannot undercut server rules.
- Min/max purchase quantity: Order API rejects invalid quantities even if frontend is bypassed (Decision 22).

### Regression

- Existing wholesale/trader tests; product save/filter tests; activity log list; module navigation gates.

---

## Remaining Decisions Required — CLOSED / RESOLVED

**Status: CLOSED.** There are no remaining open product/architecture decisions for this plan.

All four previously open items are **FINAL** (also recorded as Decisions 20–23 in Final Architecture Decisions):

| # | Topic | Final decision |
|---|--------|----------------|
| 1 | Restore permission | Use existing **`products.update`**. Do **not** introduce `products.restore`. |
| 2 | Duplicate media strategy | **Reference** existing media URLs. Do **not** deep-copy images or create new media assets. Shared-URL integrity is mandatory: deleting a media asset must not break other products that still reference the same URL (see Decision 21 constraints). |
| 3 | Min/max purchase quantity | Validate in **both** layers. Frontend = UX validation and feedback. Backend Order API = **authoritative** enforcement and rejection. Do not rely on frontend for security/correctness. |
| 4 | Cost Price permission | Dedicated **`products.cost_price.manage`**. Do **not** use `products.update` for Cost Price. Editable/visible only when `costPriceEnabled === true` **AND** user has `products.cost_price.manage`. Never expose in Public Storefront Serializer or public APIs; enforce server-side. |

**None.** (No further decisions required before implementation planning for Phase A + D.)

---

## Out of Scope

- Category-specific product ordering
- Homepage-specific product ordering
- New `limitedOffer` boolean or parallel Limited Offers system
- Broad CPanel refactor or restructuring `AdminDashboardPage.jsx` beyond direct needs
- New product settings table / new settings system
- New attributes platform
- Generic recommendation / merchandising engine beyond Decision 11 FBT fallback
- Frontend aggregation of sales from orders
- Frontend-driven product duplication via generic create
- Multiple PUTs for reorder
- Deep-copy / re-upload of media on product duplicate
- New `products.restore` permission
- Cost Price access via `products.update`
- Cost price on Public Serializer
- Wholesale automatically interacting with retail promotions
- Unrelated product architecture rewrites
- Implementing Phase A + D (or any phase) before an approved Implementation/Audit Scope for that phase
- Touching production; applying migrations without phase-specific review

---

## Risks / Constraints (carry-forward)

1. `AdminDashboardPage.jsx` is large — limit diffs; extract only the three shared components.
2. DELETE semantics change in Phase G — communicate Trash vs permanent.
3. Storefront serializer consumers assume additive evolution.
4. Phases K/L are the largest greenfield backend surfaces.
5. Placeholder coupon/discount nav keys may need promotion to real module routes.
6. Postgres migrations must update `postgresStore.js` / `store.js` together with SQL; surface any migration for review before applying to any environment; never touch production from this plan alone.
7. Shared media URLs after duplicate (Decision 21) require reference-aware delete checks in upload/product cleanup paths — today’s product-scoped media delete in `api/src/routes/uploads.js` does not yet perform cross-product URL reference checks.
8. Backend remains authoritative for pricing, permissions, purchase quantities, discounts, and tenant isolation.)
