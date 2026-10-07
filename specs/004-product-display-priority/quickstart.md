# Quickstart: Product Display Priority

**Date**: 2026-10-06
**Status**: Verification outline for a later implementation. Nothing here is executed in SPEC_ONLY.

## Prerequisites

- Decisions A, B, and C answered.
- Local disposable database only. No Staging or Production migration in the implementation PR.
- Two companies in fixtures, one of them with two brands and several products.
- Orders in delivered, cancelled, and in-progress statuses.

## Checks

1. Unset place: public `displayPriority` uses `appliedMode: catalog` and matches today’s `sortOrder` then slug. `products` array order is unchanged.
2. Featured first on the general shop does not change either brand shop or a home section.
3. Manual order on `home:{brand}` does not change `shop:{brand}` or `shop`.
4. Manual save rejects another company’s product id and duplicate ids.
5. Best-selling save returns `409` when the only orders are cancelled or in progress.
6. A delivered order increases rank by its line quantity. A later cancelled or returned order does not.
7. Equal units tie-break by `sortOrder` then slug.
8. After best-selling was saved, removing all verified units makes `salesVerified` false and `appliedMode` the fallback. Shoppers still receive a full `orderedIds` list.
9. Public JSON has no unit counts.
10. User with `products.view` only receives `403` on PUT. Other company receives no rows from this company.
11. One activity log row per successful PUT.
12. Existing `PATCH /api/admin/products/reorder` still changes only global `sortOrder` and does not delete a place sequence.
13. Arabic and English labels render on the existing Products screen; RTL direction follows the admin language.

## Commands (when implementation exists)

```text
node --test api/test/product-display-priority.test.js api/test/storefront-content.test.js
```

CPanel ordering helper tests next to `cpanel` product ordering tests.

Browser check of the Products place selector waits for explicit consent under the project browser rule.
