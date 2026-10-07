import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assertThursdayDate,
  latestThursdayStart,
  canCancelUnconfirmed,
  lineProfit,
  netSellableDelta,
  resolveMerchantImage,
  unitProfit,
  warehouseMissMovements,
} from "../src/velvetDropshipping/domain.js";
import { deliveryQuote, nextAttempt } from "../src/velvetDropshipping/whatsapp.js";
import { generateMerchantImage } from "../src/velvetDropshipping/images.js";

test("merchant profit is selling price minus merchant price", () => {
  assert.equal(unitProfit("100.00", "80.00"), "20.00");
  assert.equal(lineProfit("20.00", 2), "40.00");
  assert.throws(() => unitProfit("80.00", "100.00"), /cannot exceed/);
});

test("warehouse miss reversal and discrepancy do not increase sellable stock", () => {
  const movements = warehouseMissMovements(3);
  assert.deepEqual(movements.map((movement) => movement.reason), ["warehouse_miss_reversal", "physical_discrepancy"]);
  assert.equal(netSellableDelta(movements), 0);
});

test("unconfirmed cancel requires two WhatsApp attempts", () => {
  assert.equal(canCancelUnconfirmed(1), false);
  assert.equal(canCancelUnconfirmed(2), true);
});

test("WhatsApp attempts reset on a new Asia/Hebron day", () => {
  const first = nextAttempt({ whatsapp_attempt_count: 1, whatsapp_attempt_day: "2026-10-01" }, new Date("2026-10-08T12:00:00Z"));
  assert.equal(first.whatsappAttemptCount, 1);
  const second = nextAttempt({ whatsapp_attempt_count: first.whatsappAttemptCount, whatsapp_attempt_day: first.whatsappAttemptDay }, new Date("2026-10-08T15:00:00Z"));
  assert.equal(second.whatsappAttemptCount, 2);
});

test("week profit starts at the latest Thursday midnight in Asia/Hebron", () => {
  assert.equal(latestThursdayStart(new Date("2026-10-08T12:00:00Z")).toISOString(), "2026-10-07T21:00:00.000Z");
  assert.equal(latestThursdayStart(new Date("2026-10-07T12:00:00Z")).toISOString(), "2026-09-30T21:00:00.000Z");
});

test("Thursday settlement date is validated in Asia/Hebron", () => {
  assert.equal(assertThursdayDate("2026-10-08"), "2026-10-08");
  assert.throws(() => assertThursdayDate("2026-10-07"), /Thursday/);
});

test("a missing city delivery price is not invented", () => {
  assert.deepEqual(deliveryQuote([{ city_name: "Nablus", delivery_price: 15, enabled: true }], "Ramallah"), {
    deliveryAmount: null,
    deliveryAmountStatus: "not_set",
  });
  assert.equal(deliveryQuote([{ city_name: "Ramallah", delivery_price: 20, enabled: true }], "Ramallah").deliveryAmount, "20.00");
});

test("missing or failed merchant images use the unbranded fallback", async () => {
  assert.equal(resolveMerchantImage({ cleanImageUrl: null }).imageStatus, "fallback");
  assert.equal(resolveMerchantImage({ cleanImageUrl: "clean", generationSucceeded: false }).imageStatus, "generation_failed");
  const generated = await generateMerchantImage({ cleanImage: null, storeName: "Shop" });
  assert.equal(generated.imageStatus, "fallback");
  assert.equal(generated.buffer, null);
});

test("Velvet SQL does not reference iCare dropshipping tables", () => {
  const files = [
    "../src/velvetDropshipping/orders.js",
    "../src/velvetDropshipping/stock.js",
    "../src/velvetDropshipping/merchants.js",
    "../src/velvetDropshipping/catalog.js",
    "../src/velvetDropshipping/settlements.js",
    "../src/routes/velvetDropshipping.js",
    "../src/routes/adminVelvetDropshipping.js",
    "../supabase/migrations/041_velvet_dropshipping.sql",
  ];
  const forbidden = ["dropshipper_profiles", "dropshipping_orders", "dropshipper_wallets", "withdrawal_requests", "dropshipping_products"];
  for (const file of files) {
    const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    for (const name of forbidden) assert.equal(source.includes(name), false, `${file} mentions ${name}`);
  }
});
