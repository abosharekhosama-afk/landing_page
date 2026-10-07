import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertThursdayDate, settlementProfit } from "../src/velvetDropshipping/domain.js";
import { groupStatementRows } from "../src/velvetDropshipping/settlements.js";

test("Thursday close is idempotent per merchant and excludes delivery from profit", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/settlements.js", import.meta.url), "utf8");
  assert.match(source, /on conflict \(company_id, merchant_id, thursday\) do nothing/);
  assert.match(source, /status = 'DELIVERED_COLLECTED'/);
  assert.equal(source.includes("delivery_amount"), false);
  assert.equal(settlementProfit([
    { profitUnitAmount: "20.00", quantity: 2, lineStatus: "active" },
    { profitUnitAmount: "10.00", quantity: 1, lineStatus: "removed" },
  ]), "40.00");
  assert.equal(assertThursdayDate("2026-10-08"), "2026-10-08");
});

test("merchant statements keep the stored payout method and included orders", () => {
  const source = fs.readFileSync(new URL("../src/velvetDropshipping/settlements.js", import.meta.url), "utf8");
  const route = fs.readFileSync(new URL("../src/routes/velvetDropshipping.js", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../../cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(source, /s\.payout_method/);
  assert.match(source, /velvet_dropship_settlement_lines sl/);
  assert.match(source, /velvet_dropship_orders o/);
  assert.match(route, /merchantStatements\(companyId\(req\), profile\.id\)/);
  assert.match(page, /statement\.payoutMethod/);
  assert.match(page, /statement\.orders\.map/);
  const [statement] = groupStatementRows([
    {
      id: "statement-1",
      thursday: "2026-10-08",
      total_profit: "20.00",
      payout_method: "bank",
      paid_at: "2026-10-08T12:00:00.000Z",
      order_id: "order-1",
      merchandise_total: "100.00",
      merchant_profit_total: "20.00",
      profit_amount: "20.00",
    },
    {
      id: "statement-1",
      thursday: "2026-10-08",
      total_profit: "20.00",
      payout_method: "bank",
      paid_at: "2026-10-08T12:00:00.000Z",
      order_id: null,
      merchandise_total: null,
      merchant_profit_total: null,
      profit_amount: null,
    },
  ]);
  assert.equal(statement.payoutMethod, "bank");
  assert.equal(statement.paymentStatus, "paid");
  assert.equal(statement.total, "20.00");
  assert.deepEqual(statement.orders, [{
    orderId: "order-1",
    sellingTotal: "100.00",
    merchantPrice: "80.00",
    profit: "20.00",
  }]);
  const [unpaid] = groupStatementRows([{
    id: "statement-2",
    thursday: "2026-10-08",
    total_profit: "0.00",
    payout_method: null,
    paid_at: null,
    order_id: null,
  }]);
  assert.equal(unpaid.payoutMethod, null);
  assert.equal(unpaid.paymentStatus, "unpaid");
  assert.deepEqual(unpaid.orders, []);
});
