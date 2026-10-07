import assert from "node:assert/strict";
import test from "node:test";
import {
  buildValuationRows,
  effectiveRetailPrice,
  emptyValuationSummary,
  filterProductsForValuation,
  filterRowsByCostStatus,
  paginateValuationRows,
  parseValuationQuery,
  stripCostFromValuation,
  summarizeValuation,
  trustworthyCostPrice,
  withCostVisibility,
} from "../src/products/inventoryValuation.js";

test("trustworthy cost accepts zero, rejects missing and negative, never fakes zero", () => {
  assert.equal(trustworthyCostPrice(10), 10);
  assert.equal(trustworthyCostPrice(0), 0);
  assert.equal(trustworthyCostPrice("7.5"), 7.5);
  assert.equal(trustworthyCostPrice(null), null);
  assert.equal(trustworthyCostPrice(undefined), null);
  assert.equal(trustworthyCostPrice(""), null);
  assert.equal(trustworthyCostPrice(-1), null);
  assert.equal(trustworthyCostPrice("abc"), null);
});

test("effective retail prefers active sale below regular, rejects missing retail", () => {
  assert.equal(effectiveRetailPrice({ price: 20, salePrice: 15 }), 15);
  assert.equal(effectiveRetailPrice({ price: 20, salePrice: 25 }), 20);
  assert.equal(effectiveRetailPrice({ price: 20 }), 20);
  assert.equal(effectiveRetailPrice({}), null);
  assert.equal(effectiveRetailPrice({ price: -5 }), null);
});

test("plain product aggregates product-level stock, cost, and retail", () => {
  const rows = buildValuationRows([{
    id: "plain", slug: "plain", sku: "PLAIN-1", name: { en: "Plain" },
    brandId: "b1", stockQty: 4, price: 15, costPrice: 10,
  }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity, 4);
  assert.equal(rows[0].costPerUnit, 10);
  assert.equal(rows[0].retailPerUnit, 15);
  assert.equal(rows[0].costValue, 40);
  assert.equal(rows[0].retailValue, 60);
  assert.equal(rows[0].potentialMargin, 20);
  assert.equal(rows[0].costStatus, "HAS_COST");
});

test("variant products aggregate from variants only and never double count parent", () => {
  const rows = buildValuationRows([{
    id: "parent", slug: "parent", sku: "PARENT", name: { en: "Parent" },
    brandId: "b1", stockQty: 999, price: 999, costPrice: 999,
    variants: [
      { id: "v1", sku: "V-1", colorName: "Red", size: "S", price: 20, stock: 3, costPrice: 5 },
      { id: "v2", sku: "V-2", colorName: "Blue", size: "M", price: 30, stock: 2 },
    ],
  }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].costValue, 15);
  assert.equal(rows[0].retailValue, 60);
  assert.equal(rows[0].potentialMargin, 45);
  assert.equal(rows[1].costStatus, "MISSING_COST");
  assert.equal(rows[1].costValue, null);
  assert.equal(rows[1].potentialMargin, null);
  const summary = summarizeValuation(rows, { currency: "ils" });
  assert.equal(summary.totalQuantity, 5);
  assert.equal(summary.productsWithStock, 1);
  assert.equal(summary.costValue, 15);
  assert.equal(summary.retailValue, 120);
  // Margin excludes the missing-cost variant (never treat missing cost as 0).
  assert.equal(summary.potentialMargin, 45);
  assert.equal(summary.missingCostCount, 1);
  assert.equal(summary.valuationComplete, false);
  assert.equal(summary.currency, "ILS");
});

test("zero stock is out, negative stock is clamped and flagged, inactive is kept", () => {
  const rows = buildValuationRows([
    { id: "zero", slug: "zero", stockQty: 0, price: 10, costPrice: 4 },
    { id: "neg", slug: "neg", stockQty: -3, price: 10, costPrice: 4 },
    { id: "off", slug: "off", isActive: false, stockQty: 2, price: 10, costPrice: 4 },
  ]);
  assert.equal(rows[0].stockStatus, "out");
  assert.equal(rows[1].quantity, 0);
  assert.equal(rows[1].hasDataIssue, true);
  assert.equal(rows[2].isActive, false);
  assert.equal(rows[2].costValue, 8);
  const summary = summarizeValuation(rows);
  assert.equal(summary.missingCostCount, 0);
  assert.equal(summary.productsWithStock, 1);
});

test("cost-status filter, tenant-agnostic memory filter, and pagination", () => {
  const rows = buildValuationRows([
    { id: "a", slug: "a", brandId: "b1", stockQty: 2, price: 10, costPrice: 4 },
    { id: "b", slug: "b", brandId: "b2", stockQty: 3, price: 10 },
  ]);
  assert.equal(filterRowsByCostStatus(rows, "HAS_COST").length, 1);
  assert.equal(filterRowsByCostStatus(rows, "MISSING_COST").length, 1);
  assert.equal(filterRowsByCostStatus(rows, "bogus").length, 2);
  const filtered = filterProductsForValuation(
    [{ id: "a", name: { en: "Alpha" }, sku: "A-1", brandId: "b1", stockQty: 7, variants: [] }],
    parseValuationQuery({ brand: "b1", q: "alpha", stock: "in", lowStockThreshold: 5 }),
  );
  assert.equal(filtered.length, 1);
  const page = paginateValuationRows(rows, 2, 1);
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 2);
  assert.equal(page.page, 2);
  assert.equal(page.totalPages, 2);
  assert.deepEqual(emptyValuationSummary({ currency: "USD" }).currency, "USD");
});

test("cost masking nulls every cost-derived field and keeps retail", () => {
  const payload = {
    summary: summarizeValuation(buildValuationRows([
      { id: "a", slug: "a", stockQty: 2, price: 10, costPrice: 4 },
    ])),
    items: buildValuationRows([{ id: "a", slug: "a", stockQty: 2, price: 10, costPrice: 4 }]),
  };
  const masked = stripCostFromValuation(payload);
  assert.equal(masked.summary.costValue, null);
  assert.equal(masked.summary.potentialMargin, null);
  assert.equal(masked.summary.missingCostCount, null);
  assert.equal(masked.summary.valuationComplete, null);
  assert.equal(masked.summary.costVisible, false);
  assert.equal(masked.summary.retailValue, 20);
  assert.equal(masked.items[0].costPerUnit, null);
  assert.equal(masked.items[0].costStatus, null);
  assert.equal(masked.items[0].retailValue, 20);
  assert.equal(withCostVisibility(payload, true).summary.costVisible, true);
  assert.equal(withCostVisibility(payload, false).summary.costVisible, false);
});
