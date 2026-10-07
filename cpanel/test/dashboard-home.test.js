import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildDashboardActivity,
  buildDashboardAnalytics,
  buildDashboardChecklist,
  dashboardDirection,
  isDashboardActionAuthorized,
  resolveDashboardDestination,
  sortDashboardActivity,
} from "../src/utils/dashboardHome.js";

const dashboardSource = fs.readFileSync(
  new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url),
  "utf8",
);
const dashboardCss = fs.readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);

const modules = [
  { enabled: true, route: "/admin/dashboard" },
  { enabled: true, route: "/admin/products" },
  { enabled: true, route: "/admin/orders" },
  { enabled: true, route: "/admin/customers" },
  { enabled: true, route: "/admin/staff" },
  { enabled: true, route: "/admin/categories" },
  { enabled: true, route: "/admin/brands" },
  { enabled: true, route: "/admin/settings" },
  { enabled: true, route: "/admin/reports" },
];

test("tenant dashboard actions resolve only to existing route keys", () => {
  assert.equal(resolveDashboardDestination("addProduct"), "admin-products-new");
  assert.equal(resolveDashboardDestination("products"), "admin-products");
  assert.equal(resolveDashboardDestination("orders"), "admin-orders");
  assert.equal(resolveDashboardDestination("categories"), "admin-categories");
  assert.equal(resolveDashboardDestination("brands"), "admin-brands");
  assert.equal(resolveDashboardDestination("employees"), "admin-staff");
  assert.equal(resolveDashboardDestination("settings"), "admin-settings");
  assert.equal(resolveDashboardDestination("analytics"), "admin-analytics-highlights");
  assert.equal(resolveDashboardDestination("editSite"), "admin-site-editor");
  assert.equal(resolveDashboardDestination("unknown"), null);
});

test("authorized dashboard actions respect page permissions and enabled modules", () => {
  const context = {
    company: { storefrontUrl: "https://example.test", settings: {} },
    currentUser: { role: "company_admin" },
    modules,
  };
  assert.equal(isDashboardActionAuthorized("viewStorefront", context), true);
  assert.equal(isDashboardActionAuthorized("addProduct", context), true);
  assert.equal(isDashboardActionAuthorized("settings", context), true);
  assert.equal(isDashboardActionAuthorized("analytics", context), true);
  assert.equal(isDashboardActionAuthorized("connectDomain", context), false);

  const withoutProducts = { ...context, modules: modules.filter((item) => item.route !== "/admin/products") };
  assert.equal(isDashboardActionAuthorized("addProduct", withoutProducts), false);
  assert.equal(isDashboardActionAuthorized("products", withoutProducts), false);
});

test("employee dashboard buttons expose only granted actions", () => {
  const context = {
    company: { storefrontUrl: "https://example.test" },
    currentUser: { role: "employee", permissions: ["dashboard.view", "products.view"] },
    modules,
  };
  assert.equal(isDashboardActionAuthorized("products", context), true);
  assert.equal(isDashboardActionAuthorized("addProduct", context), false);
  assert.equal(isDashboardActionAuthorized("orders", context), false);
  assert.equal(isDashboardActionAuthorized("employees", context), false);
  assert.equal(isDashboardActionAuthorized("settings", context), false);
});

test("dashboard analytics use real loaded array values", () => {
  const analytics = buildDashboardAnalytics({
    employees: [{ id: "e1" }, { id: "e2" }],
    orders: [
      { id: "o1", customer: { email: "one@example.test" }, status: "Pending", total: 12 },
      { id: "o2", customer: { email: "one@example.test" }, status: "Complete", total: 8 },
      { id: "o3", customer: { phone: "123" }, status: "Complete", total: 5 },
    ],
    products: [{ id: "p1", isActive: true }, { id: "p2", isActive: false }],
  });
  assert.deepEqual(analytics, {
    activeProducts: 1,
    customers: 2,
    employees: 2,
    orders: 3,
    pendingOrders: 1,
    products: 2,
    revenue: 25,
  });
});

test("growth checklist completion is derived from current company state", () => {
  const checklist = buildDashboardChecklist({
    brands: [],
    categories: [{ id: "c1" }],
    company: {
      logoUrl: "https://example.test/logo.png",
      settings: { currency: "USD", language: "en" },
      storefrontUrl: "https://example.test",
    },
    currentUser: { role: "company_admin" },
    employees: [{ id: "e1" }],
    modules,
    orders: [{ id: "o1", status: "Complete" }],
    products: [{ id: "p1" }],
  });
  assert.ok(checklist.length >= 6);
  assert.equal(checklist.find((item) => item.id === "first-product").completed, true);
  assert.equal(checklist.find((item) => item.id === "company-settings").completed, true);
  assert.equal(checklist.find((item) => item.id === "catalog-organization").completed, true);
  assert.equal(checklist.find((item) => item.id === "storefront-setup").completed, true);
  assert.match(dashboardSource, /item\.action && !item\.completed/);
  assert.match(dashboardSource, /showAllChecklist \? labels\.showLess : labels\.showMore/);
});

test("activity feed uses real records and supports Priority and Date sorting", () => {
  const items = buildDashboardActivity({
    company: { storefrontUrl: "https://example.test" },
    employees: [{ id: "e1", createdAt: "2026-01-02", isActive: true }],
    orders: [{ id: "o1", createdAt: "2026-01-03", status: "Pending" }],
    products: [{ id: "p1", createdAt: "2026-01-04", isActive: true }],
  });
  assert.equal(items.some((item) => item.type === "order" && item.record.id === "o1"), true);
  assert.equal(sortDashboardActivity(items, "priority")[0].type, "order");
  assert.equal(sortDashboardActivity(items, "date")[0].type, "product");
  assert.match(dashboardSource, /data-dashboard-empty-activity/);
});

test("activity feed never expands into the full product catalog", () => {
  const products = Array.from({ length: 20 }, (_, index) => ({
    createdAt: index < 6 ? `2026-01-${String(index + 1).padStart(2, "0")}` : null,
    id: `p${index}`,
    isActive: true,
  }));
  const items = buildDashboardActivity({
    company: { settings: { currency: "USD", language: "en" }, storefrontUrl: "https://example.test" },
    products,
  });
  assert.ok(items.length <= 8);
  assert.equal(items.filter((item) => item.type === "product").length, 2);
  assert.equal(items.some((item) => item.record?.id === "p19"), false);
});

test("dashboard proportions match compact Wix-style hierarchy", () => {
  assert.match(dashboardCss, /\.tenant-dashboard-title-row h1 \{[\s\S]*?font-size:\s*clamp\(22px, 2vw, 28px\)[\s\S]*?white-space:\s*nowrap/);
  assert.match(dashboardCss, /\.tenant-dashboard-business-strip \{[\s\S]*?min-height:\s*48px/);
  assert.match(dashboardCss, /\.tenant-dashboard-stat \{[\s\S]*?min-height:\s*64px/);
  assert.match(dashboardCss, /\.tenant-dashboard-check-row \{[\s\S]*?min-height:\s*48px/);
  assert.match(dashboardSource, /tenant-dashboard-stat-indicator/);
  assert.match(dashboardSource, /data-dashboard-date-range/);
});

test("tenant dashboard explicitly renders English LTR and Arabic RTL", () => {
  assert.equal(dashboardDirection("en"), "ltr");
  assert.equal(dashboardDirection("ar"), "rtl");
  assert.match(dashboardSource, /dir=\{direction\}/);
  assert.match(dashboardSource, /data-dashboard-direction=\{direction\}/);
});
