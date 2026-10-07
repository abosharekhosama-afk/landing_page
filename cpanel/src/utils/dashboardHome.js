import { getNavigationItem } from "../data/adminNavigation.js";
import { moduleAllowsPage } from "./moduleRegistry.js";
import { canAccessAdminPage, isCompanyAdmin } from "./roles.js";

const destinations = Object.freeze({
  addProduct: "admin-products-new",
  analytics: "admin-analytics-highlights",
  brands: "admin-brands",
  categories: "admin-categories",
  connectDomain: "admin-platform-domains",
  customers: "admin-customers",
  editSite: "admin-site-editor",
  employees: "admin-staff",
  orders: "admin-orders",
  products: "admin-products",
  settings: "admin-settings",
});

const moduleDestinations = new Set([
  "admin-products-new",
  "admin-products",
  "admin-orders",
  "admin-customers",
  "admin-staff",
  "admin-categories",
  "admin-brands",
  "admin-settings",
  "admin-analytics-highlights",
]);

export function resolveDashboardDestination(action) {
  const page = destinations[action] || null;
  if (!page) return null;
  if (["admin-products-new"].includes(page)) return page;
  return getNavigationItem(page)?.pageKey || null;
}

export function dashboardDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function isDashboardActionAuthorized(action, { company, currentUser, modules = [] }) {
  if (action === "viewStorefront") return Boolean(company?.storefrontUrl);
  const page = resolveDashboardDestination(action);
  if (!page) return false;
  if (action === "settings" && !isCompanyAdmin(currentUser?.role)) return false;
  if (!canAccessAdminPage(currentUser, page)) return false;
  return !moduleDestinations.has(page) || moduleAllowsPage(modules, page);
}

function customerKey(order) {
  return order?.customer?.email || order?.customer?.phone || order?.customer?.name || order?.id;
}

export function buildDashboardAnalytics({ employees = [], orders = [], products = [] } = {}) {
  const customerKeys = new Set(orders.map(customerKey).filter(Boolean));
  const activeProducts = products.filter(
    (product) => product?.isActive !== false && product?.status !== "Inactive",
  ).length;
  const pendingOrders = orders.filter((order) => /pending/i.test(order?.status || "")).length;
  const revenue = orders.reduce((sum, order) => sum + Number(order?.total || 0), 0);
  return {
    activeProducts,
    customers: customerKeys.size,
    employees: employees.length,
    orders: orders.length,
    pendingOrders,
    products: products.length,
    revenue,
  };
}

export function buildDashboardChecklist({
  brands = [],
  categories = [],
  company,
  currentUser,
  employees = [],
  modules = [],
  orders = [],
  products = [],
} = {}) {
  const context = { company, currentUser, modules };
  const settingsComplete = Boolean(company?.settings?.currency && company?.settings?.language);
  const storefrontComplete = Boolean(company?.storefrontUrl);
  const storefrontPresentationComplete = Boolean(
    company?.storefrontUrl && (company?.logoUrl || company?.settings?.logoUrl),
  );
  const catalogAction = isDashboardActionAuthorized("categories", context)
    ? "categories"
    : isDashboardActionAuthorized("brands", context)
      ? "brands"
      : null;
  const domainAction = isDashboardActionAuthorized("connectDomain", context)
    ? "connectDomain"
    : isDashboardActionAuthorized("settings", context)
      ? "settings"
      : null;

  return [
    {
      action: isDashboardActionAuthorized("addProduct", context) ? "addProduct" : null,
      completed: products.length > 0,
      id: "first-product",
    },
    {
      action: domainAction,
      completed: storefrontComplete,
      id: "storefront-domain",
    },
    {
      action: isDashboardActionAuthorized("employees", context) ? "employees" : null,
      completed: employees.length > 0,
      id: "first-employee",
    },
    {
      action: isDashboardActionAuthorized("settings", context) ? "settings" : null,
      completed: settingsComplete,
      id: "company-settings",
    },
    {
      action: isDashboardActionAuthorized("orders", context) ? "orders" : null,
      completed: orders.length > 0 && !orders.some((order) => /pending/i.test(order?.status || "")),
      id: "review-orders",
    },
    {
      action: catalogAction,
      completed: categories.length > 0 || brands.length > 0,
      id: "catalog-organization",
    },
    {
      action: isDashboardActionAuthorized("editSite", context) ? "editSite" : null,
      completed: storefrontPresentationComplete,
      id: "storefront-setup",
    },
  ].filter((item) => item.completed || item.action);
}

function activityMeta(value, fallback = "") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function recordDate(record) {
  return record?.updatedAt || record?.createdAt || record?.date || null;
}

function recentRecords(records, limit, { requireDate = false } = {}) {
  return records
    .map((record, index) => ({ date: recordDate(record), index, record }))
    .filter((entry) => !requireDate || entry.date)
    .sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return bDate - aDate || a.index - b.index;
    })
    .slice(0, limit)
    .map((entry) => entry.record);
}

export function buildDashboardActivity({ company, employees = [], orders = [], products = [] } = {}) {
  const activities = [];

  for (const order of recentRecords(orders, 2)) {
    activities.push({
      action: "orders",
      date: recordDate(order),
      id: `order-${order.id}`,
      meta: activityMeta(order.status),
      priority: /pending|failed|cancel/i.test(order.status || "") ? 3 : 2,
      record: order,
      type: "order",
    });
  }
  for (const product of recentRecords(products, 2, { requireDate: true })) {
    activities.push({
      action: "products",
      date: recordDate(product),
      id: `product-${product.id}`,
      meta: activityMeta(product.status, product.isActive === false ? "Inactive" : "Active"),
      priority: product.isActive === false || product.status === "Inactive" ? 2 : 1,
      record: product,
      type: "product",
    });
  }
  for (const employee of recentRecords(employees, 2, { requireDate: true })) {
    activities.push({
      action: "employees",
      date: recordDate(employee),
      id: `employee-${employee.id}`,
      meta: activityMeta(employee.status, employee.isActive === false ? "Inactive" : "Active"),
      priority: employee.isActive === false ? 2 : 1,
      record: employee,
      type: "employee",
    });
  }
  if (!company?.storefrontUrl) {
    activities.push({ action: "settings", date: null, id: "warning-storefront", meta: "", priority: 3, type: "storefront-warning" });
  }
  if (!company?.settings?.currency || !company?.settings?.language) {
    activities.push({ action: "settings", date: null, id: "warning-settings", meta: "", priority: 2, type: "settings-warning" });
  }
  return activities.slice(0, 8);
}

export function sortDashboardActivity(items, sortBy = "priority") {
  const copy = [...items];
  if (sortBy === "date") {
    return copy.sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return bDate - aDate || b.priority - a.priority;
    });
  }
  return copy.sort((a, b) => b.priority - a.priority || (
    (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)
  ));
}
