import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const connectionString = process.env.VELVET_LOCAL_DATABASE_URL || "";
const localHost = (() => {
  try { return new URL(connectionString).hostname; } catch { return ""; }
})();

test("Velvet local database journey", async (t) => {
  if (!connectionString || !["127.0.0.1", "localhost"].includes(localHost)) {
    t.skip("Set VELVET_LOCAL_DATABASE_URL to a disposable database on 127.0.0.1.");
    return;
  }
  process.env.VELVET_DATABASE_URL = connectionString;
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;

  const { velvetQuery, withVelvetTransaction } = await import("../src/velvetDropshipping/database.js");
  const { createMerchantAndStore, updatePayout } = await import("../src/velvetDropshipping/merchants.js");
  const { addSelection, upsertOffer } = await import("../src/velvetDropshipping/catalog.js");
  const {
    advanceFulfillment,
    confirmOrder,
    createOrder,
    operationalCancel,
  } = await import("../src/velvetDropshipping/orders.js");
  const { closeThursday, paySettlement } = await import("../src/velvetDropshipping/settlements.js");
  const { unitProfit } = await import("../src/velvetDropshipping/domain.js");

  const migration = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/migrations/041_velvet_dropshipping.sql"),
    "utf8",
  );
  await velvetQuery("drop table if exists public.product_variants");
  await velvetQuery("drop table if exists public.products");
  await velvetQuery(`
    create table public.products (
      id text primary key,
      company_id text not null,
      name text not null,
      category text not null default '',
      image_url text not null default '',
      stock_qty numeric not null default 0,
      updated_at timestamptz not null default now()
    );
    create table public.product_variants (
      id text primary key,
      company_id text not null,
      product_id text not null,
      stock numeric not null default 0
    );
  `);
  await velvetQuery(migration);
  await velvetQuery("delete from public.velvet_dropship_settlement_lines");
  await velvetQuery("delete from public.velvet_dropship_settlements");
  await velvetQuery("delete from public.velvet_dropship_notifications");
  await velvetQuery("delete from public.velvet_dropship_inventory_movements");
  await velvetQuery("delete from public.velvet_dropship_order_lines");
  await velvetQuery("delete from public.velvet_dropship_orders");
  await velvetQuery("delete from public.velvet_dropship_merchant_products");
  await velvetQuery("delete from public.velvet_dropship_offers");
  await velvetQuery("delete from public.velvet_dropship_stores");
  await velvetQuery("delete from public.velvet_dropship_merchants");
  await velvetQuery("delete from public.products");

  const companyId = "eb-chemical";
  await velvetQuery(
    `insert into public.products (id, company_id, name, category, image_url, stock_qty)
     values ('soap', $1, 'Soap', 'Home', '/catalog/branded.jpg', 5)`,
    [companyId],
  );

  const created = await withVelvetTransaction((client) => createMerchantAndStore(client, {
    companyId,
    userId: "merchant-user",
    storeName: "Local Shop",
  }));
  await updatePayout(companyId, created.merchant.id, {
    payoutMethod: "bank",
    payoutDetails: { accountName: "Local", bankName: "Bank", accountNumber: "1" },
  });
  assert.throws(() => unitProfit("80", "100"), /cannot exceed/);
  const offer = await upsertOffer(companyId, {
    productId: "soap",
    sellingUnitPrice: "100.00",
    merchantUnitPrice: "80.00",
    cleanImageUrl: null,
    catalogImageUrl: "/catalog/branded.jpg",
  });
  assert.equal(offer.selling_unit_price, "100.00");
  const selection = await addSelection(companyId, created.merchant.id, offer.id, "Local Shop");
  assert.equal(selection.image_status, "fallback");
  assert.equal(selection.displayUrl, "/velvet-dropshipping/unbranded-fallback.svg");
  assert.notEqual(selection.displayUrl, "/catalog/branded.jpg");

  const store = { ...created.store, merchant_status: "active", merchant_id: created.merchant.id };
  const order = await withVelvetTransaction((client) => createOrder(client, {
    companyId,
    store,
    items: [{ offerId: offer.id, quantity: 1 }],
    customer: { name: "Buyer", phone: "0599000000", city: "Ramallah", address: "Main street" },
    delivery: { deliveryAmount: "15.00", deliveryAmountStatus: "set" },
    idempotencyKey: "checkout-1",
  }));
  const replay = await withVelvetTransaction((client) => createOrder(client, {
    companyId,
    store,
    items: [{ offerId: offer.id, quantity: 1 }],
    customer: { name: "Buyer", phone: "0599000000", city: "Ramallah", address: "Main street" },
    delivery: { deliveryAmount: "15.00", deliveryAmountStatus: "set" },
    idempotencyKey: "checkout-1",
  }));
  assert.equal(replay.id, order.id);
  const before = await velvetQuery("select stock_qty from public.products where id = 'soap'");
  assert.equal(Number(before.rows[0].stock_qty), 5);

  const confirmed = await confirmOrder(companyId, created.merchant.id, order.id);
  assert.equal(confirmed.status, "CONFIRMED");
  const after = await velvetQuery("select stock_qty from public.products where id = 'soap'");
  assert.equal(Number(after.rows[0].stock_qty), 4);
  const again = await confirmOrder(companyId, created.merchant.id, order.id);
  assert.equal(again.status, "CONFIRMED");
  const afterReplay = await velvetQuery("select stock_qty from public.products where id = 'soap'");
  assert.equal(Number(afterReplay.rows[0].stock_qty), 4);

  const short = await withVelvetTransaction((client) => createOrder(client, {
    companyId,
    store,
    items: [{ offerId: offer.id, quantity: 10 }],
    customer: { name: "Buyer", phone: "0599000000", city: "Ramallah", address: "Main street" },
    delivery: { deliveryAmount: null, deliveryAmountStatus: "not_set" },
    idempotencyKey: "checkout-short",
  }));
  const conflict = await confirmOrder(companyId, created.merchant.id, short.id);
  assert.equal(conflict.conflict, true);
  const afterConflict = await velvetQuery("select stock_qty from public.products where id = 'soap'");
  assert.equal(Number(afterConflict.rows[0].stock_qty), 4);
  const shortStatus = await velvetQuery("select status from public.velvet_dropship_orders where id = $1", [short.id]);
  assert.equal(shortStatus.rows[0].status, "NEEDS_ITEM_RESOLUTION");

  let current = confirmed;
  for (const status of ["PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED_COLLECTED"]) {
    current = await advanceFulfillment(companyId, order.id, status);
  }
  assert.equal(current.status, "DELIVERED_COLLECTED");
  await assert.rejects(() => operationalCancel(companyId, order.id), /cannot be cancelled/);

  const firstClose = await closeThursday(companyId, "2026-10-08");
  const secondClose = await closeThursday(companyId, "2026-10-08");
  assert.equal(firstClose.length, 1);
  assert.equal(secondClose.length, 1);
  assert.equal(firstClose[0].id, secondClose[0].id);
  assert.equal(Number(firstClose[0].total_profit), 20);
  assert.equal(Number(secondClose[0].total_profit), 20);
  const lines = await velvetQuery("select order_id from public.velvet_dropship_settlement_lines");
  assert.deepEqual(lines.rows.map((row) => row.order_id), [order.id]);
  const paid = await paySettlement(companyId, firstClose[0].id, "local-ref");
  assert.equal(paid.payout_method, "bank");
  assert.ok(paid.paid_at);
  const icare = await velvetQuery("select to_regclass('public.dropshipping_orders') as orders, to_regclass('public.withdrawal_requests') as withdrawals");
  assert.equal(icare.rows[0].orders, null);
  assert.equal(icare.rows[0].withdrawals, null);
});
