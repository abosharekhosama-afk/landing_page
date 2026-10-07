# Research: Product Display Priority

**Date**: 2026-10-06
**Mode**: SPEC_ONLY inspection. No code or database changes.

## Places

Velvet’s three shopper lists map to generic catalog places:

| Shopper place | Place key | Product membership |
| --- | --- | --- |
| General shop | `shop` | Active, visible, not trashed products for the company |
| Brand shop | `shop:{brandId}` | Same, filtered by `brandId` |
| Home brand section | `home:{brandId}` | Same brand membership as the brand shop |

Home versus brand shop differs by order, not by a second product set. Curated home membership is out of scope.

`brandId` is already on the public product payload from `serializePublicProduct`.

## Ranking inputs already on the product

| Need | Existing field | Usable as |
| --- | --- | --- |
| Featured first | `featured` / `isFeatured`, column `products.is_featured` | Yes. Public serializer already exposes `featured`. |
| Manual bestseller badge | `bestseller` / `isBestseller` in product JSONB | Badge only. Not sales. |
| Company-wide order | JSONB `data.sortOrder` | Fallback and tie-break. One value per product, so it cannot be the home order and the shop order at once. |
| Best-selling | Not on the product | Must be computed from orders. |

Spec `002` Decision 1 locked ordering to global `sortOrder` and left homepage-specific order out of scope. This feature adds place-specific order beside that field. It does not replace the global reorder API.

## Admin surfaces already present

| Screen | Path | Reuse |
| --- | --- | --- |
| Products list | `/admin/products` via `AdminDashboardPage.jsx` `ProductsListPage` | Place selector, mode control, existing drag / up / down when mode is manual |
| Product editor | Same wizard, advanced merchandising flags | Keep featured and bestseller checkboxes. Do not add a second editor. |
| Product settings | `/admin/product-settings` | Leave for company behavior flags. Do not put per-brand sequences here. |

Permissions today: reorder requires `products.update`. Product list read uses product view permissions. No new permission is recommended.

## APIs already present

| API | Role today | Change |
| --- | --- | --- |
| `GET /api/storefront/content` | One `products` array, sort `sortOrder` then slug | Additive `displayPriority`. Do not reorder the existing array. |
| `PATCH /api/admin/products/reorder` | Writes global `sortOrder` for the id list | Keep. Do not overload with a place key. |
| `GET /api/products` (authenticated) | Adds `salesCount` | Leave as the admin column. Do not use it for public rank. |

Public content is already tenant-scoped by company resolution plus `X-Site-Id` and origin checks in `api/src/routes/storefront.js`.

## Sales

`api/src/products/salesCount.js` sums `quantity` on every order line for the company. It does not read order status. Using it for “verified” best-selling would count pending and cancelled orders.

`orderStatusBucket` in `api/src/analytics/dashboardInsights.js` already classifies `delivered` / `completed` / `complete` separately from cancelled, returned, and in-progress states. That bucket is the recommended verified set (Decision B).

There is no page-view counter suitable for a most-viewed mode. That mode is out of scope.

## Persistence options

1. **Approved:** rows of `(company_id, surface_key, product_id, position)` and a mode for the surface. References existing product ids. Matches the `product_relations` pattern of a small ordering table instead of arrays inside the product document.
2. **No migration:** id lists in `company_settings.settings`. The settings allow-list in `api/src/tenancy/company.js` would need a new key. Document size grows with brands times catalog size. Not recommended.
3. **Rejected:** extra `sortOrder` fields on the product document for home and each shop. A product would carry every place’s position, and brand changes would strand those fields. Still one row, but it duplicates ordering concerns onto the catalog document.

## Public contract choice

The storefront needs three orders from one payload. Sorting `products` one way cannot do that. Additive `displayPriority.orderedIds` lets the storefront sort each place without a second product feed and without publishing unit counts.

## Approved decisions

- Decision A: tables `product_display_modes` and `product_display_order`. No product copies. No company-settings JSON.
- Decision B: inspected 2026-10-06. Retail `orders.status` only. Allow `completed`, `complete`, `delivered` (case-insensitive). CPanel `ORDER_STATUSES` uses `Completed` and has no `Delivered` value; `delivered` is a legacy alias already mapped by `orderStatusBucket`. Exclude `Awaiting Employee Review`, `Confirmation 1`, `Confirmation 2`, `Awaiting Delivery`, `Returned`, `Cancelled`, and aliases `pending`, `processing`, `confirmed`, `paid`, `shipped`, `refunded`, `canceled`, `void`, `voided`. Do not use `payment_method`, invoice status, dropshipping `delivery_status`, `salesCount.js`, or `isCountableOrder`. `COMPLETED_ORDER_STATUSES` in `cpanel/src/utils/sales.js` includes `paid` and `confirmed` and must not be copied.
- Decision C: Velvet storefront integration is a separate follow-up after this API contract is implemented and verified.
