import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const phaseAHSources = [
  "src/components/AdminTable.jsx",
  "src/components/AdminProductTable.jsx",
  "src/components/EmployeeTable.jsx",
  "src/components/AdminEmployeeTable.jsx",
  "src/components/AdminOrdersTable.jsx",
  "src/components/BrandsCatalogTable.jsx",
  "src/components/CompanyMembershipsPanel.jsx",
  "src/components/DiscountCouponManagers.jsx",
  "src/components/DeliveryZonesWorkspace.jsx",
  "src/components/SearchAnalyticsPanel.jsx",
  "src/components/SmsProvidersSection.jsx",
  "src/pages/AdminCompaniesPage.jsx",
  "src/pages/AdminDomainsPage.jsx",
  "src/pages/AdminInventoryPage.jsx",
  "src/pages/AdminProductBundlesPage.jsx",
  "src/pages/AdminProductSettingsPage.jsx",
  "src/pages/AdminContactsPage.jsx",
  "src/pages/AdminReviewsPage.jsx",
  "src/pages/AdminBannersPage.jsx",
  "src/pages/AdminAnnouncementsPage.jsx",
  "src/pages/AdminSplashAdsPage.jsx",
  "src/pages/AdminSmsPage.jsx",
  "src/pages/AdminSecurityPage.jsx",
  "src/pages/AdminPoliciesPage.jsx",
  "src/pages/AdminDropshippingPage.jsx",
  "src/pages/AdminAnalyticsPage.jsx",
  "src/pages/AdminGettingPaidPage.jsx",
  "src/pages/AdminSitesPage.jsx",
  "src/pages/AdminEmployeesPage.jsx",
];

test("Phase I: no Phase A–H JSX still mounts legacy admin-table chrome", () => {
  for (const file of phaseAHSources) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /className=["']admin-table["']/,
      `${file} still uses className="admin-table"`,
    );
    assert.doesNotMatch(
      source,
      /className=["']admin-table-wrap["']/,
      `${file} still uses className="admin-table-wrap"`,
    );
  }
});

test("Phase I: shared table tokens use dashboard vars (no --admin-surface drift)", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-data-table th[\s\S]*?background:\s*var\(--dashboard-bg-card/);
  assert.match(css, /\.admin-data-empty[\s\S]*?color:\s*var\(--dashboard-text-secondary/);
  assert.doesNotMatch(css, /--admin-surface/);
  assert.doesNotMatch(css, /--admin-muted/);
});

test("Phase I: sticky Actions remain logical + RTL shadow", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-data-table-actions\s*\{[\s\S]*?inset-inline-end:\s*0/);
  assert.match(css, /\[dir=rtl\]\s*\.admin-data-table-actions\s*\{[\s\S]*?box-shadow:\s*4px/);
});

test("Phase I: authenticated shell blocks Be Vietnam Pro inheritance", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /never inherits Be Vietnam Pro/);
  assert.match(css, /\.admin-studio-shell\s*\{[\s\S]*?font-family:\s*var\(--dashboard-font-family\)\s*!important/);
  assert.doesNotMatch(css, /font-family:\s*["']?Be Vietnam/);
});

test("Phase I: Sites card geometry remains ~211.8 (211.375) with fixed thumb", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /height:\s*138\.375px/);
  assert.match(css, /211\.375px/);
  assert.match(css, /≈ ref 211\.8/);
});

test("Phase I: Products English table remains on shared admin-data-table", () => {
  const table = read("src/components/AdminTable.jsx");
  const productTable = read("src/components/AdminProductTable.jsx");
  const dashboard = read("src/pages/AdminDashboardPage.jsx");
  assert.match(table, /className="admin-data-table-wrap"/);
  assert.match(table, /className="admin-data-table"/);
  assert.match(productTable, /admin-data-table-cell-clip/);
  assert.match(productTable, /admin-data-table-actions/);
  assert.match(dashboard, /admin-data-table-actions/);
});

test("Phase I: Employees All/Active/Disabled filter remains intact", () => {
  const page = read("src/pages/AdminEmployeesPage.jsx");
  const table = read("src/components/EmployeeTable.jsx");
  assert.match(page, /statusFilter/);
  assert.match(page, /"all"/);
  assert.match(page, /"active"/);
  assert.match(page, /"disabled"/);
  assert.match(page, /admin-segmented/);
  assert.match(table, /admin-data-table/);
  assert.match(table, /admin\.disabled/);
  assert.match(table, /admin\.enable/);
});

test("Phase I: Companies modules panel migrated off legacy admin-table", () => {
  const page = read("src/pages/AdminCompaniesPage.jsx");
  assert.match(page, /admin-data-table-wrap/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.doesNotMatch(page, /className="admin-table"/);
});

test("Phase I: Website Studio editor/canvas sources untouched by sweep markers", () => {
  const editorCandidates = [
    "src/pages/SiteEditorPage.jsx",
    "src/components/site-editor/SiteEditorCanvas.jsx",
    "src/components/site-editor/EditablePageCanvas.jsx",
    "src/utils/siteEditor.js",
  ].filter((file) => fs.existsSync(path.join(root, file)));
  assert.ok(editorCandidates.length >= 2, "expected site-editor sources");
  for (const file of editorCandidates) {
    const source = read(file);
    assert.doesNotMatch(source, /Phase I/);
    assert.doesNotMatch(source, /admin-data-table-wrap/);
  }
});
