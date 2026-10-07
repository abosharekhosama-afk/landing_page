import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function assertForwardsShellIdentity(source, pageKey) {
  assert.match(
    source,
    new RegExp(
      `activePage="${pageKey}"[\\s\\S]{0,220}company=\\{company\\}[\\s\\S]{0,120}currentUser=\\{currentUser\\}`,
    ),
    `${pageKey} must forward company + currentUser into AdminLayout`,
  );
}

test("Products Dashboard path forwards company/currentUser into AdminLayout", () => {
  const dashboard = read("src/pages/AdminDashboardPage.jsx");
  assert.match(dashboard, /company=\{company\}/);
  assert.match(dashboard, /currentUser=\{currentUser\}/);
  assert.match(dashboard, /activePage=\{activePage\}/);
});

test("Bundles forwards company/currentUser into AdminLayout (tenant sidebar)", () => {
  const page = read("src/pages/AdminProductBundlesPage.jsx");
  const app = read("src/CPanelApp.jsx");
  assertForwardsShellIdentity(page, "admin-product-bundles");
  assert.equal((page.match(/<AdminLayout/g) || []).length, 2);
  assert.match(app, /activePage !== "admin-product-bundles"/);
  assert.match(app, /activePage === "admin-product-bundles"/);
  assert.match(app, /AdminProductBundlesPage/);
  assert.doesNotMatch(
    page,
    /<AdminLayout[\s\S]{0,80}hideHeader[\s\S]{0,40}\{\.\.\.layoutProps\}/,
  );
});

test("Product Settings / Inbox / Contacts forward shell identity like Inventory/Sites", () => {
  assertForwardsShellIdentity(read("src/pages/AdminProductSettingsPage.jsx"), "admin-product-settings");
  assertForwardsShellIdentity(read("src/pages/AdminInboxPage.jsx"), "admin-inbox");
  assertForwardsShellIdentity(read("src/pages/AdminContactsPage.jsx"), "admin-customers");
  assertForwardsShellIdentity(read("src/pages/AdminInventoryPage.jsx"), "admin-inventory");
  assertForwardsShellIdentity(read("src/pages/AdminSitesPage.jsx"), "admin-sites");
});

test("Bundles keeps single-shell + stack-form layout contract", () => {
  const page = read("src/pages/AdminProductBundlesPage.jsx");
  assert.match(page, /admin-form admin-stack-form product-bundle-form/);
  assert.match(page, /product-bundle-item-row/);
});
