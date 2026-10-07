import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { canSeeInventoryCost } from "../src/utils/inventoryValuation.js";

const page = fs.readFileSync(new URL("../src/pages/AdminInventoryPage.jsx", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../src/utils/inventoryApi.js", import.meta.url), "utf8");

test("valuation UI is wired to tenant endpoint with cost-status filter and currency", () => {
  assert.match(page, /fetchInventoryValuation\(/);
  assert.match(page, /fetchInventoryValuation\(\{/);
  assert.match(api, /\/admin\/inventory\/valuation/);
  assert.match(page, /costStatus/);
  assert.match(page, /HAS_COST/);
  assert.match(page, /MISSING_COST/);
  assert.match(page, /formatCompanyCurrency\(/);
  assert.match(page, /valuationEmpty/);
});

test("valuation hides every cost field without permission or setting", () => {
  const helper = fs.readFileSync(new URL("../src/utils/inventoryValuation.js", import.meta.url), "utf8");
  assert.match(page, /canSeeInventoryCost\(currentUser, company\)/);
  assert.match(page, /products\.cost_price\.manage/);
  assert.match(helper, /costPriceEnabled/);
  assert.match(helper, /products\.cost_price\.manage/);
  assert.equal(canSeeInventoryCost({ role: "company_admin" }, { settings: { costPriceEnabled: true } }), true);
  assert.equal(canSeeInventoryCost({ role: "manager" }, { settings: { costPriceEnabled: true } }), true);
  assert.equal(canSeeInventoryCost({ role: "employee", permissions: ["products.cost_price.manage"] }, { settings: { costPriceEnabled: true } }), true);
  assert.equal(canSeeInventoryCost({ role: "employee", permissions: [] }, { settings: { costPriceEnabled: true } }), false);
  assert.equal(canSeeInventoryCost({ role: "company_admin" }, { settings: { costPriceEnabled: false } }), false);
});

test("valuation table reuses admin-data-table, internal scroll, and Arabic copy", () => {
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /valuationTitle/);
  assert.match(page, /تقييم المخزون/);
  assert.match(page, /language=\{language\}/);
  assert.doesNotMatch(page, /localStorage/);
});
