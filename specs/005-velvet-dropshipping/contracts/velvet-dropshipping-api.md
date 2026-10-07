# Contract: Velvet Dropshipping API

Company context comes from the existing server company resolver. Merchant
identity on merchant routes comes from the session. Clients do not send an
authoritative `companyId` or `merchantId`. Money fields are strings with two
decimal places. Errors use `{ message }` plus a stable `code` when the
confirmation conflict needs one.

iCare routes stay at `/api/dropshipping` and `/api/admin/dropshipping`.
Velvet handlers must not call them.

## Public store

| Method | Path | Who | Behavior |
| --- | --- | --- | --- |
| GET | `/api/velvet-dropshipping/stores/:slug` | Anonymous | Store name, logo, active selections, selling price, shared available quantity, generated image or unbranded fallback. 404 when the store is missing. Inactive stores return the identity and `checkoutEnabled: false`. |
| POST | `/api/velvet-dropshipping/stores/:slug/checkout` | Anonymous | Creates `PENDING_MERCHANT_CONFIRMATION`. Header `Idempotency-Key` required. Does not change stock. 409 when the store is inactive, a line is inactive, or available quantity is already zero. Body: `customerName`, `customerPhone`, `city`, `fullAddress`, `lines: [{ merchantProductId, quantity }]`. |
| GET | `/api/velvet-dropshipping/stores/:slug/orders/:orderId/whatsapp` | Owning merchant | Returns `{ url, deliveryAmount, deliveryAmountStatus, attemptCount }`. `url` is `wa.me` to the customer phone with items, merchandise total, and delivery amount. `deliveryAmountStatus` is `set` or `not_set`. Records one attempt for that Asia/Hebron day. Does not confirm the order. |

The public page that calls these routes is `/store/:slug` on the existing
public storefront surface. It includes add to cart and checkout. It has no
banner editor and no customer dashboard.

## Merchant

All routes require the session merchant. A client-supplied merchant id is ignored.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/velvet-dropshipping/register` | Creates the user when needed, an active merchant, and one active store. Body: `fullName`, `email`, `phone`, `password`, `storeName`, `logoUrl`. 409 on duplicate email, phone, or slug in the company. |
| GET | `/api/velvet-dropshipping/me` | Merchant, store, overview counts, week profit since Thursday 00:00 Asia/Hebron, and unsettled amount due. |
| PATCH | `/api/velvet-dropshipping/store` | Updates `storeName` and `logoUrl` only. Slug is unchanged. Does not regenerate existing images. |
| PUT | `/api/velvet-dropshipping/payout` | Body `method` of `bank`, `wallet`, or `direct_handover`, plus `details`. |
| GET | `/api/velvet-dropshipping/catalog` | Every active offer with stock, selling price, merchant price, and expected unit profit. |
| POST | `/api/velvet-dropshipping/merchant-products` | Body `offerId`. Adds the selection even if image generation fails. Response includes `imageStatus`. |
| POST | `/api/velvet-dropshipping/merchant-products/:id/retry-image` | Retries generation. Failure keeps the fallback. |
| GET | `/api/velvet-dropshipping/merchant-products` | Own selections and image status. |
| GET | `/api/velvet-dropshipping/orders` | Own orders with customer name, phone, city, full address, lines, totals, and status. |
| POST | `/api/velvet-dropshipping/orders/:id/confirm` | Allowed only from `PENDING_MERCHANT_CONFIRMATION`. Atomic verify, deduct, movements, then `CONFIRMED`. Replay returns the confirmed order and deducts nothing. Conflict code `STOCK_CONFLICT` when any line is short: no deduction, that line is `missing_in_warehouse`, order becomes `NEEDS_ITEM_RESOLUTION`. |
| POST | `/api/velvet-dropshipping/orders/:id/cancel` | Allowed only from `PENDING_MERCHANT_CONFIRMATION` after two recorded WhatsApp attempts on the same Asia/Hebron day. Sets `CANCELLED_UNCONFIRMED`. Default reason: customer was not confirmed. 409 before the second attempt. |
| POST | `/api/velvet-dropshipping/orders/:id/lines/:lineId/resolve` | Allowed while the order is `NEEDS_ITEM_RESOLUTION`. Body `action` of `remove` or `replace`. Replace body includes `offerId`. |
| GET | `/api/velvet-dropshipping/earnings` | Own orders with order number, selling total, merchant price, profit, payment state, and whether the order is on a Thursday settlement. |
| GET | `/api/velvet-dropshipping/settlements` | Own statements with date, total, payout method, and included orders. Read-only. |
| POST | `/api/velvet-dropshipping/notifications/:id/read` | Marks the session merchant's notification read. |

Inactive merchants receive 403 on mutations. History reads stay allowed.

## Admin

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/admin/velvet-dropshipping/merchants` | `velvet_dropship.merchants.read` |
| POST | `/api/admin/velvet-dropshipping/merchants/:id/activation` | `velvet_dropship.merchants.manage` |
| GET | `/api/admin/velvet-dropshipping/stores` | `velvet_dropship.stores.read` |
| POST | `/api/admin/velvet-dropshipping/stores/:id/activation` | `velvet_dropship.stores.manage` |
| GET, PUT | `/api/admin/velvet-dropshipping/offers` | read / `velvet_dropship.catalog.manage` |
| PUT body | `sellingUnitPrice`, `merchantUnitPrice`, `cleanImageUrl`, `active` | Reject when merchant price exceeds selling price. |
| GET | `/api/admin/velvet-dropshipping/orders` | `velvet_dropship.orders.read` |
| POST | `/api/admin/velvet-dropshipping/orders/:id/fulfillment` | `velvet_dropship.fulfillment.manage` |
| POST | `/api/admin/velvet-dropshipping/orders/:id/cancel-operational` | `velvet_dropship.fulfillment.manage` |
| POST | `/api/admin/velvet-dropshipping/orders/:id/lines/:lineId/missing` | `velvet_dropship.fulfillment.manage` |
| GET | `/api/admin/velvet-dropshipping/inventory` | `velvet_dropship.inventory.read` |
| POST | `/api/admin/velvet-dropshipping/settlements/close` | `velvet_dropship.settlements.manage` |
| POST | `/api/admin/velvet-dropshipping/settlements/:id/pay` | `velvet_dropship.settlements.manage` |
| GET | `/api/admin/velvet-dropshipping/settlements` | `velvet_dropship.settlements.read` |

Fulfillment body: `{ "to": "PROCESSING" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED_COLLECTED" }`.
The transition must follow the order in `spec.md`. `DELIVERED_COLLECTED` sets
`payment_collected_at`. A return transition is not available.

Close body: `{ "thursday": "YYYY-MM-DD" }`. The date must be a Thursday in
Asia/Hebron. The response lists statements created or already present. Eligible
orders are all `DELIVERED_COLLECTED` orders with no settlement line.

Pay body: `{ "reference": "optional" }`. `payout_method` is copied from the
merchant. 409 when the merchant has no payout method.

## Image generation

Generation runs after a merchant product row is stored. Input is
`clean_image_url`, store name, and logo. Output is stored on
`generated_image_url` with `image_status = ready`. Any failure sets
`generation_failed` behavior as `image_status = generation_failed` and the shop
uses the unbranded fallback. A missing `clean_image_url` does not read a
branded catalog image; it sets `fallback`.

## Isolation checks

Velvet SQL and imports must not reference:

- `dropshipping_settings`
- `dropshipper_profiles`
- `dropshipping_products`
- `dropshipping_orders`
- `dropshipper_wallets`
- `withdrawal_requests`
- `dropshipper_transactions`

Catalog stock updates go through `api/src/velvetDropshipping/stock.js` and
must not modify Product Display Priority files.
