import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "src/pages/AdminDashboardPage.jsx"), "utf8");
const adminTable = fs.readFileSync(path.join(root, "src/components/AdminTable.jsx"), "utf8");
const toolbar = fs.readFileSync(path.join(root, "src/components/Toolbar.jsx"), "utf8");
const productsApi = fs.readFileSync(path.join(root, "src/utils/productsApi.js"), "utf8");
const lowStock = fs.readFileSync(path.join(root, "src/utils/lowStockThreshold.js"), "utf8");
const app = fs.readFileSync(path.join(root, "src/CPanelApp.jsx"), "utf8");

test("AdminTable and Toolbar are extracted shared components", () => {
  assert.match(adminTable, /export default function AdminTable/);
  assert.match(toolbar, /export default function Toolbar/);
  assert.match(dashboard, /import AdminTable from "\.\.\/components\/AdminTable\.jsx"/);
  assert.match(dashboard, /import Toolbar from "\.\.\/components\/Toolbar\.jsx"/);
  assert.doesNotMatch(dashboard, /function AdminTable\(/);
  assert.doesNotMatch(dashboard, /function Toolbar\(/);
});

test("ProductsListPage search covers name, SKU, id, slug, and barcode via server q", () => {
  assert.match(dashboard, /q:\s*filters\.search/);
  assert.match(dashboard, /fetchProducts\(\{/);
  const listQuery = fs.readFileSync(path.join(root, "../api/src/products/productListQuery.js"), "utf8");
  assert.match(listQuery, /product\.sku/);
  assert.match(listQuery, /product\.slug/);
  assert.match(listQuery, /product\.barcode/);
  assert.match(listQuery, /product\.id/);
});

test("ProductsListPage includes stock filters and sales count column", () => {
  const translations = fs.readFileSync(path.join(root, "src/data/translations.js"), "utf8");
  assert.match(dashboard, /filters\.stock/);
  assert.match(dashboard, /t\("admin\.inStock"\)/);
  assert.match(dashboard, /t\("admin\.outOfStock"\)/);
  assert.match(dashboard, /t\("admin\.lowStock"\)/);
  assert.match(dashboard, /t\("admin\.columnSalesCount"\)/);
  assert.match(translations, /inStock: "In Stock"/);
  assert.match(translations, /outOfStock: "Out of Stock"/);
  assert.match(translations, /lowStock: "Low Stock"/);
  assert.match(translations, /columnSalesCount: "Sales Count"/);
  assert.match(dashboard, /product\.salesCount/);
  assert.match(lowStock, /DEFAULT_LOW_STOCK_THRESHOLD = 5/);
  assert.match(lowStock, /TEMPORARY_LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD/);
  assert.match(lowStock, /Phase H/);
});

test("ProductsListPage quick actions wire edit, stock, deactivate, duplicate", () => {
  assert.match(dashboard, /onDeactivateProduct/);
  assert.match(dashboard, /onDuplicateProduct/);
  assert.match(dashboard, /onStock/);
  assert.match(dashboard, /admin-inventory/);
  assert.match(productsApi, /duplicateProduct/);
  assert.match(productsApi, /deactivateProduct/);
  assert.match(productsApi, /\/products\/\$\{encodeURIComponent\(productId\)\}\/duplicate/);
  assert.match(app, /handleDeactivateProduct/);
  assert.match(app, /handleDuplicateProduct/);
  assert.match(app, /duplicateProductApi/);
});

test("Phase B list API remains free of barcode/cost price fields (form may include them)", () => {
  // List client API must not send barcode/costPrice; product form may manage them.
  assert.doesNotMatch(productsApi, /barcode|costPrice/);
});
