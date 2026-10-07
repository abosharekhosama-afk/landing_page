import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("merchant routes cannot fulfill, price, or pay settlements", () => {
  const merchant = fs.readFileSync(new URL("../src/routes/velvetDropshipping.js", import.meta.url), "utf8");
  assert.equal(merchant.includes("company_dropship.fulfillment.manage"), false);
  assert.equal(merchant.includes("upsertOffer"), false);
  assert.equal(merchant.includes("paySettlement"), false);
  const admin = fs.readFileSync(new URL("../src/routes/adminVelvetDropshipping.js", import.meta.url), "utf8");
  assert.match(admin, /requirePermission\("company_dropship.catalog.manage"\)/);
  assert.match(admin, /requirePermission\("company_dropship.fulfillment.manage"\)/);
  assert.match(admin, /requirePermission\("company_dropship.settlements.manage"\)/);
});

test("admin activation uses the existing merchant activation route", () => {
  const admin = fs.readFileSync(new URL("../src/routes/adminVelvetDropshipping.js", import.meta.url), "utf8");
  assert.match(admin, /router\.post\("\/merchants\/:id\/activation"/);
  const page = fs.readFileSync(new URL("../../cpanel/src/pages/VelvetDropshipping/AdminVelvetDropshippingPage.jsx", import.meta.url), "utf8");
  assert.match(page, /merchantStatus: merchant\.status === "active" \? "inactive" : "active"/);
  assert.match(page, /storeStatus: merchant\.store_status === "active" \? "inactive" : "active"/);
});

test("admin offer list shows both prices, profit, and shared stock", () => {
  const admin = fs.readFileSync(new URL("../src/routes/adminVelvetDropshipping.js", import.meta.url), "utf8");
  assert.match(admin, /router\.get\("\/offers"/);
  assert.match(admin, /selling_unit_price\) - Number\(offer\.merchant_unit_price\)/);
  const page = fs.readFileSync(new URL("../../cpanel/src/pages/VelvetDropshipping/AdminVelvetDropshippingPage.jsx", import.meta.url), "utf8");
  assert.match(page, /listed\.selling_unit_price/);
  assert.match(page, /listed\.merchant_unit_price/);
  assert.match(page, /listed\.profit/);
  assert.match(page, /listed\.stock_qty/);
  assert.match(page, /AdminLayout/);
  assert.match(page, /dropshipping-metrics/);
  assert.match(page, /admin-data-table/);
  assert.match(page, /aria-label="merchant"/);
  assert.match(page, /aria-label="store"/);
});

test("admin order reads stay inside the company id from the server", () => {
  const orders = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  assert.match(orders, /where company_id = \$1/);
});
