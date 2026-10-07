import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminProductListPageSql,
  buildAdminProductListWhere,
  productEffectiveStockSql,
  productSortOrderSql,
} from "../src/products/productListSql.js";
import {
  filterProductsForAdminList,
  paginateProducts,
  parseProductListQuery,
  sortProductsBySortOrder,
} from "../src/products/productListQuery.js";

test("SQL where always scopes by company_id and excludes deleted by default", () => {
  const built = buildAdminProductListWhere({ companyId: "icare" });
  assert.match(built.whereSql, /p\.company_id = \$1/);
  assert.match(built.whereSql, /p\.deleted_at IS NULL/);
  assert.deepEqual(built.params, ["icare"]);
});

test("SQL where encodes search brand category status stock merchandising", () => {
  const built = buildAdminProductListWhere({
    companyId: "icare",
    q: "soap",
    brand: "b1",
    category: "c1",
    status: "active",
    stock: "low",
    lowStockThreshold: 5,
    merchandising: "featured",
  });
  assert.match(built.whereSql, /LIKE \$2/);
  assert.match(built.whereSql, /brand_id = \$/);
  assert.match(built.whereSql, /category_id = \$/);
  assert.match(built.whereSql, /is_active IS DISTINCT FROM FALSE/);
  assert.match(built.whereSql, /is_featured = TRUE/);
  assert.match(built.whereSql, /product_variants/);
  assert.ok(built.params.includes("icare"));
  assert.ok(built.params.includes("%soap%"));
  assert.ok(built.params.includes("b1"));
  assert.ok(built.params.includes("c1"));
  assert.ok(built.params.includes(5));
});

test("SQL page builder emits COUNT and LIMIT/OFFSET with clamped params", () => {
  const built = buildAdminProductListPageSql({
    companyId: "icare",
    page: 2,
    limit: 25,
    q: "alpha",
  });
  assert.match(built.countSql, /SELECT COUNT\(\*\)::integer AS count/i);
  assert.match(built.countSql, /FROM public\.products p/);
  assert.match(built.pageSql, /LIMIT \$/);
  assert.match(built.pageSql, /OFFSET \$/);
  assert.match(built.pageSql, /ORDER BY/);
  assert.equal(built.limit, 25);
  assert.equal(built.offset, 25);
  assert.equal(built.pageParams.at(-2), 25);
  assert.equal(built.pageParams.at(-1), 25);
  assert.match(productEffectiveStockSql("p"), /product_variants/);
  assert.match(productSortOrderSql("p"), /sortOrder/);
});

test("memory filter+paginate still supports page/filter totals for test fallback", () => {
  const sample = [
    { id: "p1", companyId: "icare", name: { en: "Alpha" }, sku: "A", brandId: "b1", categoryId: "c1", isActive: true, stockQty: 10, sortOrder: 2 },
    { id: "p2", companyId: "icare", name: { en: "Beta" }, sku: "B", brandId: "b1", categoryId: "c1", isActive: true, stockQty: 0, sortOrder: 1 },
    { id: "p3", companyId: "other", name: { en: "Other" }, sku: "O", brandId: "b9", categoryId: "c9", isActive: true, stockQty: 8, sortOrder: 1 },
  ];
  const icare = sample.filter((row) => row.companyId === "icare");
  const filtered = filterProductsForAdminList(icare, parseProductListQuery({ brand: "b1", stock: "out" }));
  assert.deepEqual(filtered.map((row) => row.id), ["p2"]);
  const page = paginateProducts(sortProductsBySortOrder(icare), 99, 1);
  assert.equal(page.page, 2);
  assert.equal(page.total, 2);
  assert.deepEqual(page.items.map((row) => row.id), ["p1"]);
});
