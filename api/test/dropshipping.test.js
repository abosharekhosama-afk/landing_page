import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assertTransition, calculateLine, csvCell, deliveryTransitions, money } from "../src/dropshipping/domain.js";
import { upsertDropshippingProductConfiguration } from "../src/dropshipping/adminProducts.js";
import {
  dropshippingProductUpdatePath,
  normalizeDropshippingProduct,
  normalizeDropshippingProducts,
} from "../../cpanel/src/utils/dropshippingProducts.js";

const migration = fs.readFileSync(new URL("../supabase/migrations/010_icare_dropshipping.sql", import.meta.url), "utf8");
const portal = fs.readFileSync(new URL("../src/routes/dropshipping.js", import.meta.url), "utf8");
const admin = fs.readFileSync(new URL("../src/routes/adminDropshipping.js", import.meta.url), "utf8");
const adminProducts = fs.readFileSync(new URL("../src/dropshipping/adminProducts.js", import.meta.url), "utf8");

test("pending marketer access is guarded by approved profile",()=>assert.match(portal,/profileFor\(req, \{ approved: true \}\)/));
test("products query only returns enabled products",()=>assert.match(portal,/enabled=true/));
test("own orders are scoped by dropshipper derived from the profile",()=>assert.match(portal,/dropshipper_id=\$2/));
test("tenant is sourced from req.companyId",()=>{assert.doesNotMatch(portal,/req\.body\.company/);assert.match(portal,/req\.companyId/)});
test("Super Admin company scope is authorized through its effective tenant role",()=>{assert.match(admin,/effectiveTenantRole\(req\)/);assert.match(admin,/"super_admin"/)});
test("browser profit is not accepted",()=>{assert.doesNotMatch(portal,/req\.body\.(profit|marketerProfit)/);assert.match(portal,/calculateLine/)});
test("selling price bounds are server enforced",()=>assert.match(portal,/customerPrice < minimum \|\| customerPrice > maximum/));
test("stock is locked and validated",()=>{assert.match(portal,/for update/);assert.match(portal,/exceeds available stock/)});
test("valid order transitions are explicit",()=>{assert.doesNotThrow(()=>assertTransition("new","confirmed"));assert.doesNotThrow(()=>assertTransition("delivered","returned"))});
test("invalid order transitions are rejected",()=>assert.throws(()=>assertTransition("new","delivered"),/Invalid order transition/));
test("cancelled and returned statuses are terminal",()=>{assert.deepEqual(deliveryTransitions.cancelled,[]);assert.deepEqual(deliveryTransitions.returned,[])});
test("profit calculation includes fixed and percentage fees",()=>assert.deepEqual(calculateLine({quantity:2,customerUnitPrice:"100.00",dropshippingUnitPrice:"60.00",fixedFee:"5.00",percentageFee:10}),{sellingTotal:"200.00",costTotal:"120.00",fees:"25.00",profit:"55.00"}));
test("money rejects floating point and excess precision inputs",()=>{assert.equal(money("12.30"),"12.30");assert.throws(()=>money("1.234"));assert.throws(()=>money(-1))});
test("wallet mutations use transactions and row locks",()=>{assert.match(portal,/withDropshippingTransaction/);assert.match(admin,/for update/)});
test("ledger entries have immutable idempotency keys",()=>{assert.match(migration,/unique\(company_id,idempotency_key\)/);assert.match(admin,/order:\$\{order\.id\}:approved/)});
test("only one active withdrawal is allowed",()=>assert.match(migration,/uq_withdrawal_active[\s\S]*status in \('pending','approved'\)/));
test("withdrawal overspending is guarded under wallet lock",()=>{assert.match(portal,/Insufficient available balance/);assert.match(portal,/select \* from public\.dropshipper_wallets[\s\S]*for update/)});
test("CSV export neutralizes spreadsheet formulas",()=>{assert.equal(csvCell("=2+2"),"\"'=2+2\"");assert.equal(csvCell("safe"),'"safe"')});
test("all financial tables carry tenant scope",()=>{for(const table of ["dropshipping_orders","dropshipping_order_items","dropshipper_wallets","dropshipper_transactions","withdrawal_requests"])assert.match(migration,new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?company_id text not null`))});
test("status history and activity auditing are append-only inserts",()=>{assert.match(admin,/insert into public\.dropshipping_order_status_history/);assert.match(admin,/insert into public\.company_activity_logs/)});

test("unconfigured catalog products keep the catalog product ID and default disabled", () => {
  assert.match(admin, /p\.id as product_id/);
  assert.match(admin, /dp\.id as id/);
  assert.match(admin, /coalesce\(dp\.enabled, false\) as enabled/);
  assert.doesNotMatch(admin, /p\.id product_id[^;]*dp\.\*/);
  assert.deepEqual(
    normalizeDropshippingProduct({
      product_id: "icare-product-1",
      id: null,
      company_id: null,
      enabled: false,
      dropshipping_price: null,
      name: "iCare product",
      slug: "icare-product",
      stock_qty: 8,
      is_active: true,
    }),
    {
      product_id: "icare-product-1",
      id: null,
      company_id: null,
      enabled: false,
      dropshipping_price: null,
      suggested_selling_price: null,
      minimum_selling_price: null,
      maximum_selling_price: null,
      marketer_fee: null,
      fixed_fee: null,
      percentage_fee: null,
      available_stock: null,
      name: "iCare product",
      slug: "icare-product",
      stock_qty: 8,
      is_active: true,
    },
  );
});

test("configured products expose catalog and configuration identities separately", () => {
  const row = normalizeDropshippingProduct({
    product_id: "catalog-1",
    id: "configuration-1",
    company_id: "icare",
    enabled: true,
    dropshipping_price: "12.00",
  });
  assert.equal(row.product_id, "catalog-1");
  assert.equal(row.id, "configuration-1");
  assert.equal(row.company_id, "icare");
  assert.equal(row.enabled, true);
  assert.equal(row.dropshipping_price, "12.00");
});

test("snake_case product API responses are normalized", () => {
  const [row] = normalizeDropshippingProducts({
    data: [
      {
        product_id: "catalog-snake",
        stock_qty: 4,
        is_active: true,
        suggested_selling_price: "19.00",
      },
    ],
  });
  assert.equal(row.product_id, "catalog-snake");
  assert.equal(row.stock_qty, 4);
  assert.equal(row.is_active, true);
  assert.equal(row.suggested_selling_price, "19.00");
  assert.equal(row.enabled, false);
});

test("nested product API responses are normalized without treating product id as config id", () => {
  const row = normalizeDropshippingProduct({
    product: {
      id: "nested-catalog",
      name: "Nested product",
      stockQuantity: 6,
      active: true,
    },
    configuration: null,
  });
  assert.equal(row.product_id, "nested-catalog");
  assert.equal(row.id, null);
  assert.equal(row.enabled, false);
  assert.equal(row.stock_qty, 6);
});

test("enable action uses the catalog product ID rather than configuration ID", () => {
  assert.equal(
    dropshippingProductUpdatePath({
      product_id: "catalog/real",
      id: "configuration-wrong",
    }),
    "/products/catalog%2Freal",
  );
});

test("product configuration upsert is idempotent", () => {
  assert.match(migration, /unique\(company_id,product_id\)/);
  assert.match(adminProducts, /on conflict\(company_id,product_id\) do update/);
  assert.doesNotMatch(adminProducts, /insert into public\.products/);
});

test("admin product reads and writes reject cross-tenant catalog access", () => {
  assert.match(admin, /where p\.company_id=\$1/);
  assert.match(
    adminProducts,
    /select id from public\.products where company_id=\$1 and id=\$2 for share/,
  );
  assert.match(admin, /req\.companyId,[\s\S]*req\.params\.productId/);
  assert.doesNotMatch(admin, /EB Chemical/i);
});

function productConfigurationClient(ownedProducts) {
  const configurations = new Map();
  let inserts = 0;
  return {
    configurations,
    get inserts() {
      return inserts;
    },
    async query(sql, values) {
      const [companyId, productId] = values;
      if (sql.startsWith("select id from public.products")) {
        return {
          rows: ownedProducts.has(`${companyId}:${productId}`)
            ? [{ id: productId }]
            : [],
        };
      }
      if (sql.startsWith("insert into public.dropshipping_products")) {
        inserts += 1;
        const key = `${companyId}:${productId}`;
        const current = configurations.get(key);
        const saved = {
          id: current?.id ?? `configuration-${configurations.size + 1}`,
          company_id: companyId,
          product_id: productId,
          enabled: values[2],
          dropshipping_price: values[3],
        };
        configurations.set(key, saved);
        return { rows: [saved] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test("enable then repeated update creates one tenant configuration", async () => {
  const client = productConfigurationClient(new Set(["icare:catalog-1"]));
  const first = await upsertDropshippingProductConfiguration(
    client,
    "icare",
    "catalog-1",
    { enabled: true, dropshippingPrice: "10.00" },
  );
  const second = await upsertDropshippingProductConfiguration(
    client,
    "icare",
    "catalog-1",
    { enabled: true, dropshippingPrice: "11.00" },
  );
  assert.equal(client.inserts, 2);
  assert.equal(client.configurations.size, 1);
  assert.equal(first.id, second.id);
  assert.equal(second.dropshipping_price, "11.00");
});

test("another tenant cannot create or modify the product configuration", async () => {
  const client = productConfigurationClient(new Set(["icare:catalog-1"]));
  await assert.rejects(
    upsertDropshippingProductConfiguration(
      client,
      "eb-chemical",
      "catalog-1",
      { enabled: true, dropshippingPrice: "10.00" },
    ),
    (error) => error.statusCode === 404 && error.message === "Product not found.",
  );
  assert.equal(client.inserts, 0);
  assert.equal(client.configurations.size, 0);
});
