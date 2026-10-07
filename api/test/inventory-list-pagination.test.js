import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import {
  DEFAULT_INVENTORY_PAGE_LIMIT,
  buildInventoryListPageSql,
  parseInventoryListQuery,
} from "../src/products/inventoryListSql.js";

test("parseInventoryListQuery defaults and detects pagination intent", () => {
  const none = parseInventoryListQuery({});
  assert.equal(none.wantsPagination, false);
  assert.equal(none.page, 1);
  assert.equal(none.limit, DEFAULT_INVENTORY_PAGE_LIMIT);

  const paged = parseInventoryListQuery({ page: "2", limit: "50", q: "soap", brand: "b1", stock: "low" });
  assert.equal(paged.wantsPagination, true);
  assert.equal(paged.page, 2);
  assert.equal(paged.limit, 50);
  assert.equal(paged.q, "soap");
  assert.equal(paged.brand, "b1");
  assert.equal(paged.stock, "low");
});

test("buildInventoryListPageSql uses COUNT LIMIT OFFSET and separate KPI summary", () => {
  const built = buildInventoryListPageSql({
    companyId: "kids-velvet",
    page: 2,
    limit: 25,
    q: "toy",
    brand: "all",
    mainCategory: "all",
    stock: "in",
    lowStockThreshold: 5,
  });
  assert.match(built.countSql, /COUNT\(\*\)/i);
  assert.match(built.pageSql, /LIMIT \$/i);
  assert.match(built.pageSql, /OFFSET \$/i);
  assert.doesNotMatch(built.pageSql, /select \* from public\.products(?!.*LIMIT)/i);
  assert.match(built.summarySql, /in_stock/i);
  assert.match(built.summarySql, /low_stock/i);
  assert.match(built.summarySql, /out_stock/i);
  assert.equal(built.page, 2);
  assert.equal(built.limit, 25);
  assert.equal(built.offset, 25);
});

test("inventory route paginated envelope is tenant scoped with page/limit/summary", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "inv-api-page-"));
  const password = "Inventory-page-123!";
  const passwordHash = await hashPassword(password);
  const products = Array.from({ length: 40 }, (_, index) => ({
    id: `p-${index + 1}`,
    company_id: "kids-velvet",
    name: { en: `Product ${index + 1}` },
    sku: `P-${index + 1}`,
    brandId: "",
    mainCategoryId: "main-a",
    isActive: true,
    stockQty: index % 11 === 0 ? 0 : index + 1,
    sortOrder: index + 1,
  }));
  fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
    version: 2,
    companies: [
      { id: "kids-velvet", slug: "kids-velvet", name: "KV", status: "active", settings: { language: "en", currency: "USD", lowStockThreshold: 5 } },
      { id: "other-co", slug: "other-co", name: "Other", status: "active", settings: { language: "en", currency: "USD" } },
    ],
    users: [
      { id: "velvet-admin", email: "velvet-admin@test.local", password: passwordHash, role: "company_admin", company_id: "kids-velvet", permissions: [], isActive: true },
      { id: "other-admin", email: "other-admin@test.local", password: passwordHash, role: "company_admin", company_id: "other-co", permissions: [], isActive: true },
    ],
    memberships: [
      { id: "kv-membership", companyId: "kids-velvet", userId: "velvet-admin", role: "company_admin", status: "active", permissions: [] },
      { id: "other-membership", companyId: "other-co", userId: "other-admin", role: "company_admin", status: "active", permissions: [] },
    ],
    products: [...products, { id: "other-only", company_id: "other-co", name: { en: "Other" }, sku: "X-1", isActive: true, stockQty: 9, sortOrder: 1 }],
  }));
  process.env.DATA_STORE_DIR = dataDir;
  process.env.DATABASE_URL = "";
  process.env.POSTGRES_URL = "";
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "inventory-page-api-secret";
  process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

  const { app } = await import(`../src/server.js?inventory-page=${Date.now()}`);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const loginPost = async (email) => {
    const response = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    return body.token;
  };
  const request = async (url, token) => {
    const response = await fetch(`${base}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };

  const velvetToken = await loginPost("velvet-admin@test.local");
  const otherToken = await loginPost("other-admin@test.local");
  assert.ok(velvetToken, "velvet token required");
  assert.ok(otherToken, "other token required");

  const page1 = await request("/admin/inventory?page=1&limit=25", velvetToken);
  if (page1.status !== 200) {
    assert.fail(`inventory page1 unexpected ${page1.status}: ${JSON.stringify(page1.body)}`);
  }
  assert.equal(page1.body.items.length, 25);
  assert.equal(page1.body.total, 40);
  assert.equal(page1.body.page, 1);
  assert.equal(page1.body.limit, 25);
  assert.equal(page1.body.summary.total, 40);
  assert.ok(Number(page1.body.summary.in) + Number(page1.body.summary.low) + Number(page1.body.summary.out) === 40);

  const page2 = await request("/admin/inventory?page=2&limit=25", velvetToken);
  assert.equal(page2.body.items.length, 15);
  assert.equal(page2.body.page, 2);

  const search = await request("/admin/inventory?page=1&limit=25&q=Product%201", velvetToken);
  assert.ok(search.body.total >= 1);
  assert.ok(search.body.total < 40);

  const brand = await request("/admin/inventory?page=1&limit=25&mainCategory=main-a", velvetToken);
  assert.equal(brand.body.summary.total, 40);
  assert.ok(brand.body.total <= 40);

  const stock = await request("/admin/inventory?page=1&limit=25&stock=out", velvetToken);
  assert.ok(stock.body.total >= 1);
  assert.ok(stock.body.items.every((item) => Number(item.stock) <= 0));

  const outOfRange = await request("/admin/inventory?page=99&limit=25", velvetToken);
  assert.equal(outOfRange.body.page, 2);
  assert.ok(outOfRange.body.items.length > 0);

  const cross = await request("/admin/inventory?page=1&limit=25", otherToken);
  assert.equal(cross.status, 200);
  assert.equal(cross.body.total, 1);
  assert.equal(cross.body.items[0].id, "other-only");
  assert.ok(!cross.body.items.some((item) => String(item.id).startsWith("p-")));

  const targetId = page1.body.items[0]?.id;
  assert.ok(targetId, "page1 should include a product id");
  const patch = await fetch(`${base}/admin/inventory/${encodeURIComponent(targetId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${velvetToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ stock: 42 }),
  });
  const patchBody = await patch.json().catch(() => null);
  assert.equal(patch.status, 200, `patch failed: ${JSON.stringify(patchBody)}`);
  assert.equal(Number(patchBody.stock), 42);

  const refreshed = await request(`/admin/inventory?page=1&limit=25&q=${encodeURIComponent("Product")}`, velvetToken);
  const updated = refreshed.body.items.find((item) => item.id === targetId);
  assert.ok(updated);
  assert.equal(Number(updated.stock), 42);
});
