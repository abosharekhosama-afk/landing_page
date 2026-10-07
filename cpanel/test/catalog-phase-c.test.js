import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("AdminTable renders the shared admin-data-table system", () => {
  const table = read("src/components/AdminTable.jsx");
  assert.match(table, /className="admin-data-table-wrap"/);
  assert.match(table, /className="admin-data-table"/);
  assert.doesNotMatch(table, /admin-table-wrap/);
  assert.doesNotMatch(table, /className="admin-table"/);
});

test("DiscountCouponManagers renders coupons and discounts on the shared table system", () => {
  const source = read("src/components/DiscountCouponManagers.jsx");
  assert.match(source, /className="admin-data-table-wrap"/);
  assert.match(source, /className="admin-data-table"/);
  assert.match(source, /admin-data-table-actions/);
  assert.match(source, /admin-data-table-cell-clip/);
  assert.doesNotMatch(source, /catalog-table-wrap/);
  assert.doesNotMatch(source, /className="catalog-table"/);
});

test("Inventory page uses the shared admin-data-table system with sticky actions", () => {
  const page = read("src/pages/AdminInventoryPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.doesNotMatch(page, /inventory-table-wrap/);
  assert.doesNotMatch(page, /className="inventory-table"/);
});

test("Bundles page uses the shared admin-data-table system with sticky actions", () => {
  const page = read("src/pages/AdminProductBundlesPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.doesNotMatch(page, /product-schema-table-wrap/);
  assert.doesNotMatch(page, /className="product-schema-table"/);
});

test("ProductsListPage actions use the shared admin-data-table system", () => {
  const dashboard = read("src/pages/AdminDashboardPage.jsx");
  assert.match(dashboard, /import AdminTable from "\.\.\/components\/AdminTable\.jsx"/);
  assert.match(dashboard, /className="admin-data-table-actions"/);
  assert.match(dashboard, /admin-data-table-cell-clip/);
});

test("Product Settings uses the shared admin-data-table system including the nested variant", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table--nested/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.doesNotMatch(page, /product-schema-table-wrap/);
  assert.doesNotMatch(page, /className="product-schema-table"/);
});

test("dashboard-shell.css carries tenant catalog admin-data-table overrides", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-data-table th[\s\S]*?#F7F8F8/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-data-table-actions[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-data-table--nested \{[\s\S]*?min-width:\s*560px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.catalog-data-card \.admin-data-table-wrap[\s\S]*?overflow-x:\s*auto/);
});