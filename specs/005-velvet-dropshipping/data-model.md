# Data Model: Velvet Dropshipping

Storage owner: PostgreSQL tables prefixed `velvet_dropship_`. The API is the
only writer. `company_id` is taken from the server-resolved company. Merchant
identity on merchant routes is taken from the session, not from a client
merchant id.

No foreign keys to `dropshipper_profiles`, `dropshipping_orders`,
`dropshipper_wallets`, or `withdrawal_requests`.

Catalog product content and shared available quantity stay on the existing
catalog. Velvet stores offers, selections, snapshots, and stock movements.
Selling price and merchant price are not new columns on the shared product
table.

## velvet_dropship_merchants

| Field | Rules |
| --- | --- |
| id | UUID. Unique with company_id. |
| company_id, user_id | Text. These are the platform company id and user id, not a separate UUID type. One merchant per user per company. |
| status | `active` or `inactive`. Default `active`. |
| payout_method | `bank`, `wallet`, or `direct_handover`. Nullable until the merchant saves it. |
| payout_details | JSON object. Bank: account name, bank name, account number. Wallet: label and identifier. Handover: contact note. |
| created_at, updated_at | Timestamps. |

Registration creates an active merchant. There is no pending approval state.

## velvet_dropship_stores

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, merchant_id | Exactly one store per merchant. |
| name | Required. |
| slug | Unique per company. Stable after create. Public path `/store/{slug}`. |
| logo_url | Required for a complete store. |
| status | `active` or `inactive`. Default `active`. Checkout requires `active`. |
| created_at, updated_at | Timestamps. |

## velvet_dropship_offers

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, product_id, variant_id | Variant null when the product has no variants. Unique (company, product, variant). |
| selling_unit_price | Numeric(14,2) >= 0. Set by admin. |
| merchant_unit_price | Numeric(14,2) >= 0. Set by admin. Must be <= selling price. |
| clean_image_url | Admin-designated unbranded source. Null until designated. |
| active | Boolean. Inactive offers cannot be newly added to a store. |
| created_at, updated_at | Timestamps. |

Per-unit profit = selling_unit_price − merchant_unit_price. No fee and no discount.

## velvet_dropship_merchant_products

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, merchant_id, offer_id | Unique combination. |
| generated_image_url | Null when generation has not succeeded. |
| image_status | `ready`, `generation_failed`, or `fallback`. |
| active | Boolean. |
| added_at | Timestamp. |

Adding the row succeeds even when image generation fails. Shop display uses
`generated_image_url` when `ready`; otherwise the neutral unbranded fallback.
It never uses a Velvet-branded catalog image. Logo or name edits do not change
existing rows' images.

## velvet_dropship_orders

| Field | Rules |
| --- | --- |
| id | UUID. Unique with company_id. |
| company_id, store_id, merchant_id | Required. |
| customer_name, customer_phone, city, full_address | Required. |
| merchandise_total, delivery_amount, profit_total | Numeric(14,2). Delivery is null when the city has no delivery price. Profit excludes delivery. |
| status | One of the states in `spec.md`. |
| fulfillment_status_before_resolution | Nullable. Restored when a missing-item order still has a shippable line. |
| cancel_reason | Default for unconfirmed cancel: customer was not confirmed. |
| idempotency_key | Unique per company when present. |
| whatsapp_attempt_count, whatsapp_attempt_day | Count of recorded WhatsApp opens, and the Asia/Hebron date of those attempts. Unconfirmed cancel requires a count of at least 2 on the current attempt day. |
| confirmed_at, payment_collected_at | Set on confirm and on delivered-and-collected. |
| created_at, updated_at | Timestamps. |

## velvet_dropship_order_lines

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, order_id, product_id, variant_id | Required product. Variant when applicable. |
| quantity | Integer >= 1. |
| selling_unit_price, merchant_unit_price, profit_unit_amount | Snapshots. Profit is per unit. |
| line_status | `active`, `missing_in_warehouse`, `removed`, `replaced`. |
| replaced_by_line_id | Set on the old line when a substitute line is created. |
| product_snapshot | Name at the time of the line. JSON object. Does not store a branded image URL for shop use. |
| created_at | Timestamp. |

Line money snapshots are immutable except the missing-item transitions:
`removed` sets profit_unit_amount to 0; `replaced` keeps the old line at profit 0
and inserts a new line.

## velvet_dropship_inventory_movements

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, product_id, variant_id | Required product. |
| order_id, order_line_id | Nullable for corrections that still name an order. |
| qty_delta | Integer. Negative deducts or records a shortage. Positive reverses a prior order deduction. |
| reason | `confirm`, `confirm_replay`, `operational_cancel`, `warehouse_miss_reversal`, `physical_discrepancy`, `replacement`. |
| idempotency_key | Unique per company. Confirmation uses a key that makes a replay insert nothing. |
| created_at | Timestamp. |

Available catalog quantity changes by `qty_delta` in the same transaction as the order change. Sellable quantity ignores a `physical_discrepancy` as available stock: that entry removes the units from sale.

A warehouse miss for one line inserts, once, a `warehouse_miss_reversal` equal to the opposite of that line's confirm deduction and a `physical_discrepancy` of the same quantity negative. Net sellable quantity does not increase. The same idempotency key pair makes a repeat insert nothing.

Removal does not insert a movement. Replacement inserts one `replacement` deduction after the substitute quantity is verified. Operational cancel reverses confirm deductions only for lines that still have an unreverted confirm movement.

## velvet_dropship_settlements

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, merchant_id | Required. |
| period_start, period_end | The Thursday close in Asia/Hebron. `period_end` is that Thursday. |
| status | `draft` or `paid`. |
| total_amount | Sum of settlement line profit. Numeric(14,2) >= 0. |
| payout_method | Copied from the merchant at pay time. |
| payout_reference | Optional note or reference. |
| paid_at | Required when status becomes `paid`. |
| created_at | Timestamp. |
| unique (company_id, merchant_id, period_end) | Re-running the same Thursday returns this row. |

Eligible orders are not limited to the calendar week. Any `DELIVERED_COLLECTED`
order not already on a settlement line is eligible. The unique key stops a
second statement for the same merchant on the same Thursday.

## velvet_dropship_settlement_lines

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, settlement_id, order_id | An order appears on at most one line in the company. |
| profit_amount | Sum over shippable lines of profit_unit_amount × quantity. |
| created_at | Timestamp. |

## velvet_dropship_notifications

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, recipient_user_id | Required. |
| type, entity_id | Example type: `missing_item`. |
| read_at | Nullable. Set when the recipient marks the notification read. |
| created_at | Timestamp. |

## velvet_dropship_audit_events

| Field | Rules |
| --- | --- |
| id | UUID. |
| company_id, actor_user_id | Actor nullable for system rows. |
| entity_type, entity_id, action | Price, stock, status, resolution, and payment actions. |
| payload | JSON object. Before and after values for money and status. |
| created_at | Timestamp. |

## Concurrency

- Store slug uniqueness is per company.
- Confirmation locks the order row, checks every active line against catalog
  quantity, deducts all lines, writes movements, then sets `CONFIRMED`. Any
  failure rolls the transaction back and then marks only the short line for
  resolution without a deduction.
- Movement idempotency stops a second confirm from deducting again.
- Settlement line uniqueness stops the same order joining two statements.
