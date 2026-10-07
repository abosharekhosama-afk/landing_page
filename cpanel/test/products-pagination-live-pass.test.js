import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("productsApi builds paginated queries and unwraps envelopes", () => {
  const api = read("src/utils/productsApi.js");
  assert.match(api, /DEFAULT_PRODUCTS_PAGE_SIZE = 25/);
  assert.match(api, /buildProductsQuery/);
  assert.match(api, /unwrapProductsResponse/);
  assert.match(api, /fetchProductSortIds/);
  assert.match(api, /view:\s*"ids"/);
  assert.match(api, /wantsEnvelope/);
});

test("ProductsListPage fetches server pages instead of client-slicing the full catalog", () => {
  const page = read("src/pages/AdminDashboardPage.jsx");
  const listStart = page.indexOf("function ProductsListPage({");
  const listEnd = page.indexOf("function ProductsTrashPage({");
  const list = page.slice(listStart, listEnd);
  assert.match(list, /fetchProducts\(\{/);
  assert.match(list, /page,/);
  assert.match(list, /limit:\s*pageSize/);
  assert.match(list, /data-products-pagination/);
  assert.match(list, /setPage\(1\)/);
  assert.match(list, /fetchProductSortIds/);
  assert.doesNotMatch(list, /orderedProducts\.filter/);
  assert.doesNotMatch(list, /products\.filter\(\(product\)/);
});

test("API Products pagination uses repository DB COUNT/LIMIT path", () => {
  const route = read("../api/src/routes/products.js");
  const store = read("../api/src/data/store.js");
  const sql = read("../api/src/products/productListSql.js");
  const pg = read("../api/src/data/postgresStore.js");
  assert.match(route, /listProductsPageForCompany/);
  assert.match(route, /listProductSortIdsForCompany/);
  assert.match(store, /listProductsPageFromSupabase/);
  assert.match(store, /listProductSortIdsFromSupabase/);
  assert.match(sql, /LIMIT/);
  assert.match(sql, /OFFSET/);
  assert.match(sql, /COUNT\(\*\)/);
  assert.match(pg, /listProductsPageFromSupabase/);
  assert.match(pg, /source:\s*"postgres"/);
  assert.doesNotMatch(route, /paginateProducts\(withSales/);
});

test("CPanelApp does not fully hydrate catalog just to open Products list", () => {
  const app = read("src/CPanelApp.jsx");
  const needs = app.slice(app.indexOf("const needsProducts ="), app.indexOf("const needsTrash"));
  assert.doesNotMatch(needs, /"admin-products"/);
  assert.match(needs, /"admin-product-bundles"/);
});

test("Bundles and Product Settings use a single shell header", () => {
  const bundles = read("src/pages/AdminProductBundlesPage.jsx");
  const settings = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(bundles, /hideHeader/);
  assert.match(settings, /hideHeader/);
  assert.match(bundles, /<h1>/);
  assert.match(settings, /<h1>/);
  assert.doesNotMatch(bundles, /title=\{ar \? "الحزم"/);
  assert.doesNotMatch(settings, /title=\{copy\.title\} subtitle=\{copy\.subtitle\}/);
});
