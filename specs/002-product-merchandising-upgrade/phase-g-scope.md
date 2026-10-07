# Phase G — Product Trash — Implementation / Audit Scope

**Status:** Implemented (G1–G4). Migration file created but **not applied to Production**.  
**Parent plan:** `specs/002-product-merchandising-upgrade\plan.md`  
**Execution scope:** **Phase G ONLY**  
**Prior completed phases:** A, B, C, D  
**Next after G:** H → E + F → J → I → K + L  

**Do not:** start H / E / F / J / I / K / L; invent `products.restore`; apply migration to Production; broadly refactor CPanel.

---

## 1. Current delete lifecycle

### Backend (hard delete today)

| Path | Behavior |
|------|----------|
| `DELETE /api/products/:id` | `requirePermission("products.delete")` → `deleteProductWithTenantCatalogLock(companyId, id)` |
| Postgres | `DELETE FROM public.products WHERE company_id = $1 AND id = $2` (`deleteProductWithTenantCatalogLockInSupabase`) — cascades variants/gallery/field values |
| File store | `productRepository.deleteForCompany` + `persistCompanyStore({ pruneMissing: true })` |
| Activity | `product.deleted` via `recordActivityLog` |

**No `deleted_at` on products.** Soft-delete exists for invoices (`company_invoices.deleted_at`) and delivery zones (`company_delivery_zones.deleted_at`) — list helpers filter `!deleted_at`.

### Frontend (Phase B)

| Surface | Behavior |
|---------|----------|
| `ProductsListPage` Delete button | `onDeleteProduct(product.id)` when `products.delete` / `products.manage` / company admin |
| `CPanelApp.handleDeleteProduct` | `window.confirm(t("admin.deleteConfirm"))` → `deleteProductApi` → `refreshProducts` → `admin.productDeleted` |
| Copy | "Delete this product?" / "Product deleted successfully" (permanent semantics) |
| API helper | `cpanel/src/utils/productsApi.js` → `DELETE /products/:id` |

### Media on delete today

Hard product delete does **not** clean storage objects. Media DELETE (`DELETE /uploads/products/:productId`) already uses Decision 21 helper `mediaUrlStillReferenced` (`api/src/products/mediaReferences.js`). Permanent product cleanup must reuse that pattern.

---

## 2. Soft-delete insertion points

| Layer | Change |
|-------|--------|
| Migration `023_…` | `products.deleted_at timestamptz NULL` + index `(company_id, deleted_at)` |
| `productRow` / `mergeProduct` | Persist and hydrate `deletedAt` / `deleted_at` |
| File-store product docs | `deletedAt` field on in-memory/JSON products |
| `DELETE /api/products/:id` | Set `deleted_at = now()` (Trash); do not remove row |
| Default reads | Exclude `deleted_at IS NOT NULL` / `deletedAt` |
| `PUT /api/products/:id` | Reject trashed products (404) — no implicit restore |
| Restore | Explicit `POST /api/products/:id/restore` clears `deleted_at` |
| Permanent | `DELETE /api/products/:id/permanent` hard-removes + safe media cleanup |

Optional `deleted_by` is **out** for Phase G (plan allows optional; not required).

---

## 3. Product read-path audit

| Path | File | Required Phase G behavior |
|------|------|---------------------------|
| `GET /api/products` (auth) | `products.js` | Exclude trashed by default; `?trash=true` returns **only** trashed (`products.view`) |
| `GET /api/products` (unauth) | `products.js` | Active+visible **and** not trashed |
| `GET /api/products/:id/details` | `products.js` | 404 if trashed (admin + public) |
| `POST /api/products/:id/duplicate` | `products.js` | 404 if source trashed |
| `PUT /api/products/:id` | `products.js` | 404 if target trashed |
| `GET /api/storefront/content` | `storefront.js` | Exclude trashed before serialize |
| `GET /api/storefront/products/:slug` | `storefront.js` | 404 via `publicProducts` filter |
| Analytics product search count | `analyticsPublic.js` | Exclude trashed |
| Inventory list | `inventory.js` | Exclude trashed |
| Dashboard insights / admin counts / reports / orders product lookups / dropshipping catalog | various | Exclude trashed from catalog-facing lists; orders keep historical line data as-is |
| `serializePublicProduct` | `publicContent.js` | No change required if callers filter first |

Helper: shared `isProductTrashed(product)` used at query/filter sites (backend authoritative).

---

## 4. Media cleanup audit (Decision 21)

**Existing:** `collectProductMediaUrls` + `mediaUrlStillReferenced` cover primary, hover, gallery, detail images, variants, usage video/poster.

**Permanent delete must:**

1. Collect media URLs from the product being purged.
2. Check other **same-tenant** products (including trashed products still in DB — they may still reference URLs).
3. Physically delete storage only when no other in-tenant product references the URL.
4. Never use `productId` folder alone as proof of exclusivity.
5. Never inspect/delete another tenant’s storage paths.

Trash (soft delete) does **not** delete media.

---

## 5. Permission matrix

| Action | Permission |
|--------|------------|
| Normal product update | `products.update` |
| Move to Trash | `products.delete` |
| Restore | `products.update` |
| Permanent Delete | `products.permanent_delete` |
| List trash (`?trash=true`) | `products.view` (same list gate as `requireProductListPermission`) |

**No `products.restore`.**

Add `products.permanent_delete` to:

- `api/src/data/store.js` → `allPermissions`
- `cpanel/src/data/permissions.js` (+ translation keys)

Semantics: `products.delete` = Move to Trash only.

---

## 6. API changes

| Endpoint | Change | Permission |
|----------|--------|------------|
| `DELETE /api/products/:id` | Soft-delete (`deleted_at=now()`); idempotent if already trashed; activity `product.trashed`; response `204` | `products.delete` |
| `POST /api/products/:id/restore` | Clear `deleted_at`; reject if slug/SKU conflicts with another **active** product; activity `product.restored` | `products.update` |
| `DELETE /api/products/:id/permanent` | Hard delete + cascade + safe media cleanup; activity `product.permanently_deleted` | `products.permanent_delete` |
| `GET /api/products?trash=true` | Trashed only, tenant-scoped | list view gate (`products.view` for staff) |
| `GET /api/products` (default) | Active catalog only (not trashed) | unchanged gates |

Tenant scoping: all ops use `req.companyId` + `findByCompany` / SQL `company_id = $1`. Cross-tenant IDs → `404 Product not found.` (existing convention).

Register `/:id/restore` and `/:id/permanent` **before** generic `/:id` handlers where needed.

---

## 7. Database changes

**File:** `api/supabase/migrations/023_products_deleted_at.sql` (after develop `021`/`022` brand media migrations)

```sql
alter table public.products
  add column if not exists deleted_at timestamptz;

create index if not exists idx_products_company_deleted_at
  on public.products (company_id, deleted_at);
```

- Nullable `deleted_at`
- Non-destructive
- **Do not apply to Production** as part of this phase
- Sync `schema.sql` documentation only if repo convention updates baseline schema for new columns (optional; migrations are authoritative)

No `product_relations` table yet — permanent delete documents future E/F cascade cleanup; no premature relation architecture.

---

## 8. Frontend changes

| Item | Detail |
|------|--------|
| Nav | `admin-products-trash` under Catalog (“Trash” / “المحذوفات”) — same products module |
| Path | `/admin/products/trash` |
| Access | `PAGE_PERMISSIONS`: `products.view`; module maps to `admin-products` |
| Trash UI | Reuse `AdminTable`, `Toolbar`, `SearchField`, `Badge`, `window.confirm`, message panel |
| Restore | Requires `products.update`; calls restore API |
| Permanent Delete | Requires `products.permanent_delete`; strong confirm copy; distinct from Trash |
| Active list Delete | Label/confirm → Move to Trash; success copy updated |
| API helpers | `fetchTrashedProducts`, `restoreProduct`, `permanentlyDeleteProduct` |

No broad CPanel refactor; Trash page lives alongside `ProductsListPage` in `AdminDashboardPage.jsx`.

---

## 9. Tests — verification matrix

| Area | Cases |
|------|-------|
| Trash | success; 403 without `products.delete`; tenant isolation; `deleted_at` set; row remains; `product.trashed` log |
| Default list | active returned; trashed excluded; tenant isolation |
| Trash list | `trash=true` only trashed; active excluded; tenant isolation; view permission |
| Restore | success; clears `deleted_at`; visible again; needs `products.update`; no `products.restore`; tenant isolation; `product.restored`; slug/SKU conflict → clear error |
| Permanent | needs `products.permanent_delete`; delete-only / update-only insufficient; row gone; tenant isolation; `product.permanently_deleted` |
| Media | shared URL survives; unreferenced deleted; gallery/variants counted; other-tenant refs irrelevant |
| Storefront | absent from content; slug 404; inactive filter still works |
| Regression | `auth-membership`, `storefront-content`, product B/C suites (update Phase B/C “no trash UI” assertions) |
| Build | `cd cpanel && npm run build` |

---

## 10. PR-sized units

| Unit | Contents |
|------|----------|
| **G1** | Migration + `deleted_at` mapping + trash/restore + default filters + permission + activity logs |
| **G2** | Permanent delete endpoint + media-safe cleanup + tests |
| **G3** | Admin Trash UI + Move-to-Trash wording + nav/access |
| **G4** | Storefront/analytics/inventory exclusion hardening + regression |

---

## 11. Explicit non-goals

Phase H settings, barcode, cost price, condition, E/F relations, J merchandising, K/L discounts/coupons, recommendation engine, broad CPanel refactor, new attributes architecture, pricing/ordering changes, production migration apply.

---

## 12. Slug / SKU note

No DB unique constraint on product slug/SKU today. Application: on restore, if another non-trashed product in the same tenant shares the same slug or non-empty SKU, reject restore with `409` and a clear message. No automatic slug mutation.
