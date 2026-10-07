import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Orders table renders on the shared admin-data-table system", () => {
  const source = read("src/components/AdminOrdersTable.jsx");
  assert.match(source, /className="admin-data-table-wrap"/);
  assert.match(source, /className="admin-data-table"/);
  assert.match(source, /className="admin-data-table-actions"/);
  assert.match(source, /admin-data-table-cell-clip/);
  assert.match(source, /aria-label=\{t\("admin\.delete"\)\}/);
  assert.doesNotMatch(source, /admin-table-wrap/);
  assert.doesNotMatch(source, /className="admin-table"/);
});

test("Delivery zones table renders on the shared admin-data-table system", () => {
  const source = read("src/components/DeliveryZonesWorkspace.jsx");
  assert.match(source, /className="admin-data-table-wrap"/);
  assert.match(source, /className="admin-data-table"/);
  assert.match(source, /className="admin-data-table-actions"/);
  assert.match(source, /admin-data-table-cell-clip/);
  assert.match(source, /aria-label=\{copy\.edit\}/);
  assert.match(source, /aria-label=\{copy\.delete\}/);
  assert.doesNotMatch(source, /delivery-zones-table-wrap/);
  assert.doesNotMatch(source, /className="delivery-zones-table"/);
});

test("Invoices render on the shared admin-data-table system", () => {
  const page = read("src/pages/AdminGettingPaidPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /className="admin-data-table-actions"/);
  assert.doesNotMatch(page, /getting-paid-table-wrap/);
  assert.doesNotMatch(page, /getting-paid-invoice-list-head/);
  assert.doesNotMatch(page, /getting-paid-invoice-row/);
});

test("Sales Overview AnalyticsPage chrome is scoped for Dashboard tokens", () => {
  const page = read("src/pages/AdminSalesPage.jsx");
  assert.match(page, /sales-analytics-page/);
  assert.match(page, /sales-kpi-grid four sales-overview-kpis sales-overview-primary/);
  assert.match(page, /sales-overview-secondary/);
  assert.match(page, /sales-secondary-metrics/);
  assert.match(page, /buildSalesAnalytics\(orders, products, language, company\)/);
  assert.match(page, /buildCostProfitSummary/);
  assert.match(page, /data\.metrics\.sales/);
  assert.match(page, /data\.metrics\.cancelledOrders/);
});

test("dashboard-shell.css carries tenant sales/delivery/invoice admin-data-table overrides", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.tenant-sales-page \.admin-data-table[\s\S]*?min-width:\s*1180px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.tenant-sales-page \.sales-analytics-page \.sales-kpi-card[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.delivery-zones-page \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.getting-paid-invoice-list \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.getting-paid-invoice-form \.admin-data-table[\s\S]*?min-width:\s*0/);
});