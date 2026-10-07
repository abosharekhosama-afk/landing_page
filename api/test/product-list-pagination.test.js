import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PRODUCT_PAGE_LIMIT,
  filterProductsForAdminList,
  paginateProducts,
  parseProductListQuery,
  productSearchHaystack,
  sortProductsBySortOrder,
  stockFilterBucket,
} from "../src/products/productListQuery.js";

const sample = [
  { id: "p1", name: { en: "Alpha Soap" }, sku: "A-1", slug: "alpha", brandId: "b1", categoryId: "c1", isActive: true, stockQty: 12, sortOrder: 2, featured: true },
  { id: "p2", name: { en: "Beta Wax" }, sku: "B-2", slug: "beta", brandId: "b2", categoryId: "c1", isActive: false, stockQty: 0, sortOrder: 1, barcode: "999" },
  { id: "p3", name: { en: "Gamma Clean" }, sku: "G-3", slug: "gamma", brandId: "b1", categoryId: "c2", isActive: true, stockQty: 3, sortOrder: 3, newArrival: true },
];

test("parseProductListQuery defaults page/limit and detects pagination intent", () => {
  const none = parseProductListQuery({});
  assert.equal(none.wantsPagination, false);
  assert.equal(none.page, 1);
  assert.equal(none.limit, DEFAULT_PRODUCT_PAGE_LIMIT);

  const paged = parseProductListQuery({ page: "2", limit: "50", q: "soap", brand: "b1" });
  assert.equal(paged.wantsPagination, true);
  assert.equal(paged.page, 2);
  assert.equal(paged.limit, 50);
  assert.equal(paged.q, "soap");
  assert.equal(paged.brand, "b1");
});

test("filterProductsForAdminList supports search brand category status stock merchandising", () => {
  assert.equal(filterProductsForAdminList(sample, { q: "alpha" }).map((p) => p.id).join(","), "p1");
  assert.equal(filterProductsForAdminList(sample, { q: "999" }).map((p) => p.id).join(","), "p2");
  assert.equal(filterProductsForAdminList(sample, { brand: "b1" }).length, 2);
  assert.equal(filterProductsForAdminList(sample, { category: "c2" }).map((p) => p.id).join(","), "p3");
  assert.equal(filterProductsForAdminList(sample, { status: "inactive" }).map((p) => p.id).join(","), "p2");
  assert.equal(filterProductsForAdminList(sample, { stock: "out" }).map((p) => p.id).join(","), "p2");
  assert.equal(filterProductsForAdminList(sample, { stock: "low", lowStockThreshold: 5 }).map((p) => p.id).join(","), "p3");
  assert.equal(filterProductsForAdminList(sample, { merchandising: "featured" }).map((p) => p.id).join(","), "p1");
});

test("paginateProducts returns only the requested page and filtered total", () => {
  const ordered = sortProductsBySortOrder(sample);
  const page1 = paginateProducts(ordered, 1, 2);
  assert.equal(page1.total, 3);
  assert.equal(page1.page, 1);
  assert.equal(page1.limit, 2);
  assert.deepEqual(page1.items.map((p) => p.id), ["p2", "p1"]);

  const page2 = paginateProducts(ordered, 2, 2);
  assert.deepEqual(page2.items.map((p) => p.id), ["p3"]);

  const clamped = paginateProducts(ordered, 99, 2);
  assert.equal(clamped.page, 2);
  assert.equal(clamped.items.length, 1);
});

test("stockFilterBucket and search haystack stay deterministic", () => {
  assert.equal(stockFilterBucket(0), "out");
  assert.equal(stockFilterBucket(3, 5), "low");
  assert.equal(stockFilterBucket(12, 5), "in");
  assert.match(productSearchHaystack(sample[0]), /alpha soap/);
});
