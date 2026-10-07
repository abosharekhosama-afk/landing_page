# Product Settings — Velvet Digital vs IMKAN inventory

Source of truth for IMKAN product settings: `company.settings` JSON via
`api/src/products/productSettings.js` (`PRODUCT_ADMIN_SETTING_KEYS`).

## Velvet Digital / IMKAN functional overlap (repo evidence)

| Setting | Velvet reference in repo | IMKAN present | Notes |
|---------|--------------------------|---------------|-------|
| lowStockThreshold | Used across inventory/products | Yes | Persisted in company.settings |
| costPriceEnabled | Phase H merchandising | Yes | Requires products.cost_price.manage to edit costs |
| productConditionEnabled | Phase H | Yes | New / Refurbished / Used |
| showCouponBoxAtCheckout | Checkout visibility | Yes | Server still validates coupons |

## Missing settings reviewed

Searched seeds, product-phase tests, Velvet workbook scripts, and company settings
usage. No additional product-settings keys were found in-repo for Velvet Digital that
are absent from IMKAN and safe to add without inventing behavior.

## Migration-blocked items

None identified for product settings in this pass. (Settings live in existing
`company.settings` JSON — no table migration required for the keys above.)

## UI work this branch

- Coherent Product Settings + Schema layout under one Admin shell
- Hide Save/Discard/Reload when schema is forbidden
- Permission-denied state for merchandising panel when user lacks company_settings.view
