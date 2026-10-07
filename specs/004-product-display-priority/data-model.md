# Data Model: Product Display Priority

**Date**: 2026-10-06
**Status**: Decision A approved. Tables are specified. The migration file is an implementation task. Do not apply it to Staging or Production in that task.

## Existing entities (unchanged ownership)

### Product

One row per product in `products`, document in `data`.

Relevant existing attributes:

- `brandId` — which brand shop and home section include the product
- `featured` / `isFeatured` and column `is_featured` — featured-first
- `bestseller` / `isBestseller` — badge only
- `sortOrder` inside `data` — company-wide order
- `isActive`, `visible`, `deleted_at` — shopper eligibility

This feature does not add a second product row or copy name, price, media, or stock.

### Order and order line

Verified units are `sum(quantity)` grouped by product id. Include a retail order only when `orders.status` is `completed`, `complete`, or `delivered` (case-insensitive). Exclude every other status, including in-progress, cancelled, and returned. Ignore payment method, invoice status, and dropshipping delivery status. No new sales table.

## New concept

### Display place

Identity: `(company_id, surface, brand_id)`

`surface` is `home` or `shop`. `brand_id` null is the global configuration. A brand id is an override. A missing override inherits the global row for the same surface. Home does not inherit shop.

Selection rules reference existing flags, filter option ids, or category ids. They are not a second taxonomy. Ordering is one key: `catalog`, `featured`, `newArrival`, `bestseller`, `verifiedSales`, or `manual`.

### Physical shape (Decision A approved)

- `product_display_modes (company_id, surface_key, mode, updated_at)` unique on `(company_id, surface_key)`
- `product_display_order (company_id, surface_key, product_id, position)` unique on `(company_id, surface_key, product_id)` and on `(company_id, surface_key, position)`

`mode` is `featured`, `best_selling`, or `manual`. Manual rows exist only for `manual`. Indexes start with `company_id`. Product foreign keys use `(company_id, product_id)` the same way `product_relations` does. Brand checks happen in the write transaction. Position rows store ids and positions only.

Company-settings JSON is not used.

## Computed shopper order

Not stored, except the manual sequence.

Eligibility: not trashed, active, visible, and in the place membership.

| Mode | Order |
| --- | --- |
| unset | `sortOrder`, then slug |
| `featured` | featured first, then `sortOrder`, then slug |
| `best_selling` with verified units | units descending, then `sortOrder`, then slug |
| `best_selling` with zero verified units | fallback: featured first if any member is featured, otherwise `sortOrder`, then slug |
| `manual` | saved positions, then members missing from the sequence by `sortOrder`, then slug |

Public output is the ordered id list plus mode flags. Unit counts stay on the server.
