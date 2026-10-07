import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canCancelUnconfirmed, whatsAppUrl } from "../src/velvetDropshipping/domain.js";
import { buyerWhatsAppLink } from "../src/velvetDropshipping/whatsapp.js";

test("checkout does not deduct catalog stock and confirm is idempotent in SQL", () => {
  const orders = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  const create = orders.slice(orders.indexOf("export async function createOrder"), orders.indexOf("export async function confirmOrder"));
  assert.match(create, /Number\(row\.stock_qty\) <= 0/);
  assert.equal(create.includes("update public.products"), false);
  assert.equal(create.includes("deductForConfirm"), false);
  assert.match(orders, /status === "CONFIRMED"/);
  assert.match(orders, /STOCK_CONFLICT/);
});

test("merchant orders include their lines and admin orders can be filtered", () => {
  const orders = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  const merchantList = orders.slice(orders.indexOf("export async function listMerchantOrders"), orders.indexOf("export async function listCompanyOrders"));
  const companyList = orders.slice(orders.indexOf("export async function listCompanyOrders"));
  assert.match(merchantList, /velvet_dropship_order_lines/);
  assert.match(merchantList, /o\.company_id = \$1 and o\.merchant_id = \$2/);
  assert.match(companyList, /merchant_id = \$2/);
  assert.match(companyList, /store_id = \$3/);
  const page = fs.readFileSync(new URL("../../cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(page, /line\.productName/);
  assert.match(page, /action: "remove"/);
  assert.match(page, /action: "replace"/);
  assert.match(page, /velvetApi\.readNotification/);
});

test("a short confirm marks the failed line missing without a stock movement", () => {
  const orders = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  const confirm = orders.slice(orders.indexOf("export async function confirmOrder"), orders.indexOf("export async function recordWhatsAppAttempt"));
  const conflict = confirm.slice(confirm.indexOf("stock_qty"), confirm.indexOf("deductForConfirm"));
  assert.match(conflict, /line_status = 'missing_in_warehouse'/);
  assert.match(conflict, /NEEDS_ITEM_RESOLUTION/);
  assert.match(conflict, /STOCK_CONFLICT/);
  assert.equal(conflict.includes("recordWarehouseMiss"), false);
  assert.equal(conflict.includes("update public.products"), false);
  assert.equal(conflict.includes("held_fulfillment_status"), false);
});

test("audit events reuse velvet_dropship_audit_events and the acting user", () => {
  const database = fs.readFileSync(new URL("../src/velvetDropshipping/database.js", import.meta.url), "utf8");
  const orders = fs.readFileSync(new URL("../src/velvetDropshipping/orders.js", import.meta.url), "utf8");
  const catalog = fs.readFileSync(new URL("../src/velvetDropshipping/catalog.js", import.meta.url), "utf8");
  const settlements = fs.readFileSync(new URL("../src/velvetDropshipping/settlements.js", import.meta.url), "utf8");
  const stock = fs.readFileSync(new URL("../src/velvetDropshipping/stock.js", import.meta.url), "utf8");
  const merchant = fs.readFileSync(new URL("../src/routes/velvetDropshipping.js", import.meta.url), "utf8");
  const admin = fs.readFileSync(new URL("../src/routes/adminVelvetDropshipping.js", import.meta.url), "utf8");
  assert.match(database, /velvet_dropship_audit_events/);
  assert.match(database, /actor_user_id/);
  assert.match(orders, /action: "order_status"/);
  assert.match(orders, /action: "missing_item_remove"/);
  assert.match(orders, /action: "missing_item_replace"/);
  assert.match(catalog, /action: "price_change"/);
  assert.match(settlements, /action: "settlement_payment"/);
  assert.match(stock, /action: "inventory"/);
  assert.match(stock, /inserted\.rowCount/);
  assert.match(merchant, /confirmOrder\(companyId\(req\), profile\.id, req\.params\.id, req\.user\.id\)/);
  assert.match(admin, /paySettlement\(companyId\(req\), req\.params\.id, req\.body\.reference \|\| null, req\.user\.id\)/);
});

test("WhatsApp opens the customer phone and cancel waits for two attempts", () => {
  const url = buyerWhatsAppLink({
    phone: "+970599000000",
    items: [{ quantity: 1, name: "Soap" }],
    merchandiseTotal: "100.00",
    deliveryAmount: null,
  });
  assert.match(url, /^https:\/\/wa\.me\/970599000000/);
  assert.match(whatsAppUrl("0599000000", "hello"), /wa\.me\/0599000000/);
  assert.equal(canCancelUnconfirmed(1), false);
  const route = fs.readFileSync(new URL("../src/routes/velvetDropshipping.js", import.meta.url), "utf8");
  assert.match(route, /stockDeducted: false/);
  assert.match(route, /orders\/:id\/cancel/);
});
