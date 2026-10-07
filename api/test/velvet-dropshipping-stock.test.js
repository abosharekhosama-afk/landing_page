import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertFulfillmentAdvance, netSellableDelta, warehouseMissMovements } from "../src/velvetDropshipping/domain.js";

test("warehouse miss writes a reversal and a discrepancy with no sellable increase", () => {
  const stock = fs.readFileSync(new URL("../src/velvetDropshipping/stock.js", import.meta.url), "utf8");
  assert.match(stock, /warehouseMissMovements/);
  assert.match(stock, /on conflict \(company_id, idempotency_key\) do nothing/);
  const movements = warehouseMissMovements(2);
  assert.deepEqual(movements.map((movement) => movement.reason), ["warehouse_miss_reversal", "physical_discrepancy"]);
  assert.equal(netSellableDelta(movements), 0);
});

test("removal zeros profit and fulfillment cannot return after delivery", () => {
  const orders = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  assert.match(orders, /line_status = 'removed', profit_unit_amount = 0/);
  assert.throws(() => assertFulfillmentAdvance("DELIVERED_COLLECTED", "CANCELLED_OPERATIONAL"));
  assert.doesNotThrow(() => assertFulfillmentAdvance("OUT_FOR_DELIVERY", "DELIVERED_COLLECTED"));
});
