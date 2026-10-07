import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "src/pages/AdminDashboardPage.jsx"), "utf8");
const productsApi = fs.readFileSync(path.join(root, "src/utils/productsApi.js"), "utf8");
const permissions = fs.readFileSync(path.join(root, "src/data/permissions.js"), "utf8");
const navigation = fs.readFileSync(path.join(root, "src/data/adminNavigation.js"), "utf8");
const roles = fs.readFileSync(path.join(root, "src/utils/roles.js"), "utf8");
const app = fs.readFileSync(path.join(root, "src/CPanelApp.jsx"), "utf8");
const translations = fs.readFileSync(path.join(root, "src/data/translations.js"), "utf8");

test("Phase G Trash UI and Move to Trash wiring exist", () => {
  assert.match(dashboard, /function ProductsTrashPage/);
  assert.match(dashboard, /admin-products-trash/);
  assert.match(dashboard, /permanentDeleteAction/);
  assert.match(dashboard, /restoreAction/);
  assert.match(dashboard, /canPermanentlyDeleteProducts/);
  assert.match(dashboard, /products\.permanent_delete/);
  assert.match(productsApi, /fetchTrashedProducts/);
  assert.match(productsApi, /restoreProduct/);
  assert.match(productsApi, /permanentlyDeleteProduct/);
  assert.match(permissions, /products\.permanent_delete/);
  assert.doesNotMatch(permissions, /products\.restore/);
  assert.match(navigation, /admin-products-trash/);
  assert.match(roles, /admin-products-trash/);
  assert.match(app, /handleRestoreProduct/);
  assert.match(app, /handlePermanentlyDeleteProduct/);
  assert.match(translations, /Move this product to Trash/);
  assert.match(translations, /Permanently delete this product/);

  // Permanent Delete is wired only on Trash page, not Active list soft-delete.
  const trashPageStart = dashboard.indexOf("function ProductsTrashPage");
  const trashPage = dashboard.slice(trashPageStart, trashPageStart + 4500);
  assert.match(trashPage, /canPermanentDelete/);
  assert.match(trashPage, /onPermanentlyDeleteProduct/);
  assert.match(trashPage, /permanentDeleteAction/);

  const listPageStart = dashboard.indexOf("function ProductsListPage");
  const listPageEnd = dashboard.indexOf("function ProductsTrashPage");
  const listPage = dashboard.slice(listPageStart, listPageEnd);
  assert.doesNotMatch(listPage, /permanentDeleteAction/);
  assert.doesNotMatch(listPage, /onPermanentlyDeleteProduct/);
});
