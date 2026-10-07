import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildDashboardQuickActions,
  dashboardInsightsCopy,
  orderBucketLabel,
} from "../src/utils/dashboardInsights.js";

const modules = [
  { enabled: true, route: "/admin/dashboard" },
  { enabled: true, route: "/admin/products" },
  { enabled: true, route: "/admin/products/new" },
  { enabled: true, route: "/admin/orders" },
  { enabled: true, route: "/admin/inventory" },
  { enabled: true, route: "/admin/categories" },
];

test("dashboard insights copy includes EN and AR labels", () => {
  assert.match(dashboardInsightsCopy("en").title, /insights/i);
  assert.match(dashboardInsightsCopy("ar").title, /رؤى/);
});

test("quick actions stay permission and module aware", () => {
  const actions = buildDashboardQuickActions({
    company: { settings: {} },
    currentUser: { role: "company_admin" },
    modules,
  });
  assert.ok(actions.some((action) => action.pageKey === "admin-products-new"));
  assert.ok(actions.some((action) => action.pageKey === "admin-inventory"));
  const limited = buildDashboardQuickActions({
    company: { settings: {} },
    currentUser: { role: "employee", permissions: ["dashboard.view"] },
    modules,
  });
  assert.equal(limited.length, 0);
});

test("dashboard home never renders raw localized objects in activity descriptions", () => {
  const dashboardSource = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(dashboardSource, /getText\(item\.record\?\.customer\?\.name, language\)/);
  assert.match(dashboardSource, /getText\(item\.meta, language\)/);
  assert.doesNotMatch(dashboardSource, /description: customerName \|\| item\.meta/);
});

test("dashboard insights panel is wired into the existing home page", () => {
  const dashboardSource = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
  const panelSource = fs.readFileSync(new URL("../src/components/DashboardInsightsPanel.jsx", import.meta.url), "utf8");
  assert.match(dashboardSource, /DashboardInsightsPanel/);
  assert.match(panelSource, /tenant-dashboard-insights/);
});

test("dashboard insights panel guards alert timestamps and localized values", () => {
  const panelSource = fs.readFileSync(new URL("../src/components/DashboardInsightsPanel.jsx", import.meta.url), "utf8");
  assert.match(panelSource, /function getDisplayText/);
  assert.match(panelSource, /if \(typeof value === "object"\) return "—"/);
  assert.match(panelSource, /getDisplayText\(alert\.message, language\)/);
});

test("search analytics panel is wired into behavior analytics page", () => {
  const analyticsSource = fs.readFileSync(new URL("../src/pages/AdminAnalyticsPage.jsx", import.meta.url), "utf8");
  assert.match(analyticsSource, /SearchAnalyticsPanel/);
  assert.match(analyticsSource, /admin-analytics-behavior/);
});

test("order bucket labels localize", () => {
  assert.equal(orderBucketLabel("confirmed", "en"), "Confirmed");
  assert.equal(orderBucketLabel("confirmed", "ar"), "مؤكدة");
});
