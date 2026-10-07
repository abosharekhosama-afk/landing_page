# Contract: Product Display Priority

**Date**: 2026-10-06
**Status**: D1–D5 approved 2026-10-06. Not implemented.

Company id comes from the server session or the existing storefront resolver.

## Permissions

| Action | Permission |
| --- | --- |
| Read | Same helper as the product list (`products.view`, and company admin as today) |
| Save | `products.update` |
| Public read | Existing storefront content access |

## Configuration record

```json
{
  "surface": "shop",
  "brandId": "brand-1",
  "selection": {
    "match": "and",
    "rules": [
      { "source": "filter", "group": "age", "id": "3-6y" },
      { "source": "collection", "id": "promotions-discounts" },
      { "source": "flag", "id": "featured" },
      { "source": "category", "id": "existing-category-id" }
    ]
  },
  "orderingKey": "newest",
  "productIds": []
}
```

- `surface` is `home` or `shop`.
- `brandId` null is the global configuration. A brand id stores only the fields that brand overrides.
- `selection` null on a brand means inherit global selection for that surface. `orderingKey` null means inherit global ordering for that surface. Home never inherits shop.
- `selection.match` is `and` or `or`. Omitted match means `and`. Empty `rules` means all eligible products in the boundary.
- Rule sources are `flag` (`featured`, `newArrival`, `bestseller`), `filter` (group and id from `PRODUCT_FILTER_ATTRIBUTE_OPTIONS`), `collection` (an existing collection id, including promotional collections), or `category` (an existing category id). `quickShop` is rejected.
- `orderingKey` is `catalog`, `featured`, `newArrival`, `bestseller`, `verifiedSales`, `manual`, `newest`, `oldest`, `priceAsc`, `priceDesc`, or `name`. `productIds` is required only for `manual`, and only ids in the selected set are valid.
- `bestseller` orders by the existing flag. `verifiedSales` orders by completed or delivered units and is refused with `409` when the selected set has none.
- `mostViewed` and `random` are rejected.
- Unknown flags, filter ids, collection ids, categories, or brands return `400`.

## Admin

### `GET /api/admin/product-display-priority?surface=home|shop&brandId=`

`brandId` omitted returns the global row. A brand response includes stored overrides and, for any null field, the inherited global value together with `inheritedSelection` and `inheritedOrdering`.

### `PUT /api/admin/product-display-priority`

Body omits inheritance flags. A null `selection` or null `orderingKey` on a brand clears that override and restores inheritance. It does not copy the global value into the brand row.

### `DELETE /api/admin/product-display-priority?surface=&brandId=`

Removes a brand override so the next read inherits again. Deleting the global row is allowed and restores catalog behavior for brands that do not have an override.

`PATCH /api/admin/products/reorder` still updates only company-wide `sortOrder`.

## Public

### `GET /api/storefront/content`

Existing `products` stay in catalog order. Add:

```json
{
  "displayPriority": {
    "home": { "orderingKey": "catalog", "orderedIds": [] },
    "shop": { "orderingKey": "featured", "orderedIds": [] },
    "brands": {
      "brand-1": {
        "home": {
          "inheritedSelection": true,
          "inheritedOrdering": false,
          "orderingKey": "manual",
          "orderedIds": ["p2", "p1"]
        },
        "shop": {
          "inheritedSelection": false,
          "inheritedOrdering": true,
          "orderingKey": "newest",
          "orderedIds": ["p3", "p1"]
        }
      }
    }
  }
}
```

`orderedIds` is the resolved selected set after the brand boundary. `inheritedSelection` and `inheritedOrdering` say which fields came from the global surface. No unit counts.

The storefront, in a later task, may narrow `orderedIds` with the customer's current filters and may reorder that visit when the customer picks a sort. Those actions must not be written back.

## Failures

- Unknown selection id, foreign brand, or duplicate manual id: `400`, no partial write.
- `verifiedSales` with no verified units in the selected set: `409`, previous row kept.
- Last successful save wins. One activity entry per save.
