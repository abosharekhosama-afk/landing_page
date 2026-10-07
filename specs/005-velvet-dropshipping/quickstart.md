# Quickstart: Velvet Dropshipping

Validation guide for after implementation is approved. Do not run against
Staging or Production. Do not apply a migration until that approval is recorded.

## Prerequisites

- Repository root is this project.
- Local API tests use the disposable database already used by `api` tests.
- Product Display Priority files and iCare dropshipping files listed in [plan.md](./plan.md) are untouched.
- One local company has a delivery price for a known city and no price for another city.
- One catalog product has an admin-designated clean image. Another has none.

## Run commands

From `api/`:

```text
node --test test/velvet-dropshipping-domain.test.js test/velvet-dropshipping-merchants.test.js test/velvet-dropshipping-catalog.test.js test/velvet-dropshipping-pricing.test.js test/velvet-dropshipping-orders.test.js test/velvet-dropshipping-stock.test.js test/velvet-dropshipping-settlements.test.js test/velvet-dropshipping-admin.test.js test/velvet-dropshipping-isolation.test.js
```

From `cpanel/`, after UI tasks:

```text
npm run build
```

## Fixture

Do not seed sample merchants, orders, or paid settlements. Tests create their own rows. Prices used in assertions are selling price 100 and merchant price 80.

## User journey

1. Register a merchant and store. The dashboard opens without an approval step.
2. Set selling price 100 and merchant price 80. A merchant price edit is refused. Profit preview is 20.
3. Add the product with a clean image. The store shows a generated image. Add the product with no clean image. The store shows the unbranded fallback and not a Velvet-branded image.
4. Open `/store/{slug}` and check out. The order is pending on both dashboards. Available quantity is unchanged.
5. Open WhatsApp. The link addresses the customer phone and includes the city delivery amount. Status is still pending.
6. Confirm the order. Quantity drops once. Confirm again. Quantity does not drop again.
7. Mark one confirmed line missing. The ledger has one reversal and one physical discrepancy, sellable quantity does not rise, and a second mark changes nothing. Remove the line. Its profit is 0 and the other lines stay active. Replace a line only when the substitute has stock.
8. Advance a collected order to delivered and collected. Refuse a return.
9. Close the same Asia/Hebron Thursday twice. One statement contains only collected unsettled orders, and its profit excludes delivery.
10. Mark it paid with the merchant payout method. iCare dropshipping orders and withdrawal balances are unchanged.

## Expected result

- Merchant A cannot read merchant B.
- Company A cannot read company B.
- A short confirm deducts nothing.
- No Velvet test writes `dropshipper_profiles`, `dropshipping_orders`, or `withdrawal_requests`.

## Known limitations

- The program does not send WhatsApp messages and does not transfer payouts.
- Browser verification waits for explicit consent in the implementation conversation.
- This quickstart does not approve implementation.
