import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Security tables use shared admin-data-table system", () => {
  const page = read("src/pages/AdminSecurityPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table-actions/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.doesNotMatch(page, /admin-table-wrap/);
  assert.doesNotMatch(page, /className="admin-table"/);
});

test("Policies table uses shared admin-data-table system", () => {
  const page = read("src/pages/AdminPoliciesPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table-actions/);
  assert.doesNotMatch(page, /className="admin-table"/);
});

test("SMS providers section uses shared admin-data-table system", () => {
  const page = read("src/components/SmsProvidersSection.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.doesNotMatch(page, /className="admin-table"/);
});

test("Dropshipping tables use shared admin-data-table system", () => {
  const page = read("src/pages/AdminDropshippingPage.jsx");
  assert.match(page, /admin-data-table-wrap/);
  assert.match(page, /className="admin-data-table dropshipping-table"/);
  assert.match(page, /admin-data-table-actions/);
  assert.match(page, /admin-data-table-cell-clip/);
});

test("Developer Tools renames Wix Logs to Site Logs in nav and page chrome", () => {
  const nav = read("src/data/adminNavigation.js");
  assert.match(nav, /existing\("admin-developer-site-logs", "Site Logs"/);
  assert.doesNotMatch(nav, /existing\("admin-developer-site-logs", "Wix Logs"/);
  const page = read("src/pages/AdminSiteLogsPage.jsx");
  assert.match(page, /Site Logs/);
  assert.doesNotMatch(page, /Wix Logs/);
  // Keep legacy URL path for compatibility
  const routes = read("src/utils/developerTools.js");
  assert.match(routes, /logging-tools\/wix-logs/);
});

test("Automations keeps template honesty and unavailable create controls", () => {
  const page = read("src/pages/AdminAutomationsPage.jsx");
  assert.match(page, /TEMPLATE · UNAVAILABLE|قالب · غير متاح/);
  assert.match(page, /No verified automation data source/);
  assert.match(page, /UnsupportedDialog/);
  assert.doesNotMatch(page, /apiRequest|localStorage|fake automation/i);
});

test("Settings hub keeps unavailable rows honest", () => {
  const page = read("src/pages/AdminSettingsPage.jsx");
  assert.match(page, /tenant-settings-hub-page/);
  assert.match(page, /settings-hub-section/);
  assert.match(page, /not available|not connected|unavailable/i);
  assert.match(page, /HonestNotice/);
});

test("dashboard-shell.css carries tenant Settings\/Ops Phase G overrides", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /Phase G - Settings \/ Ops chrome/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.tenant-settings-hub-page \.settings-hub-section[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.automation-table-card[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.activity-log-page \.activity-log-list[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.developer-tools-page \.developer-logs-card[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.dropshipping-table-wrap\.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?tenant-settings-hub-page[\s\S]*?overflow-x:\s*hidden/);
});
