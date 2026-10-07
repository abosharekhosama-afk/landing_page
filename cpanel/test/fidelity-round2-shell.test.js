import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("AdminLayout no longer switches Sites to a special sidebar workspace class", () => {
  const layout = read("src/components/AdminLayout.jsx");
  assert.doesNotMatch(layout, /admin-sites-workspace/);
});

test("Sites content styles remain usable under the tenant shell", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.sites-page/);
  assert.match(css, /pointer-events:\s*auto/);
});

test("Bundles, Inbox, and Contacts keep AdminLayout shell wrappers", () => {
  for (const file of [
    "src/pages/AdminProductBundlesPage.jsx",
    "src/pages/AdminInboxPage.jsx",
    "src/pages/AdminContactsPage.jsx",
  ]) {
    const source = read(file);
    assert.match(source, /AdminLayout/);
    assert.match(source, /hideHeader/);
  }
});

test("Product Bundles is excluded from AdminDashboardPage catch-all (single shell)", () => {
  const app = read("src/CPanelApp.jsx");
  assert.match(app, /activePage !== "admin-product-bundles"/);
  assert.match(app, /activePage === "admin-product-bundles"/);
  assert.match(app, /AdminProductBundlesPage/);
});

test("inventory page requests paginated inventory envelope", () => {
  const page = read("src/pages/AdminInventoryPage.jsx");
  const api = read("src/utils/inventoryApi.js");
  assert.match(page, /page:/);
  assert.match(page, /limit:/);
  assert.match(api, /buildInventoryQuery/);
  assert.match(api, /unwrapInventoryResponse/);
});

test("product settings hides Save\/Discard when schema is forbidden", () => {
  const page = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(page, /canManage && !forbidden/);
  assert.match(page, /product-schema-forbidden/);
});
