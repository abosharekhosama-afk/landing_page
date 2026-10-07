export const analyticsRoutes = Object.freeze({
  "admin-analytics-highlights": "/admin/analytics/highlights",
  "admin-analytics-realtime": "/admin/analytics/realtime",
  "admin-analytics-traffic": "/admin/analytics/traffic",
  "admin-analytics-behavior": "/admin/analytics/behavior",
  "admin-analytics-marketing": "/admin/analytics/marketing",
  "admin-analytics-session-recordings": "/admin/analytics/session-recordings",
  "admin-analytics-insights": "/admin/analytics/insights",
  "admin-analytics-benchmarks": "/admin/analytics/benchmarks",
  "admin-analytics-reports": "/admin/analytics/reports",
});

export const analyticsPageKeys = Object.freeze(Object.keys(analyticsRoutes));

const legacyPathAliases = Object.freeze({
  "/admin/reports": "admin-analytics-reports",
  "/admin/coming-soon/analytics/highlights": "admin-analytics-highlights",
  "/admin/coming-soon/analytics/realtime": "admin-analytics-realtime",
  "/admin/coming-soon/analytics/traffic": "admin-analytics-traffic",
  "/admin/coming-soon/analytics/behavior": "admin-analytics-behavior",
  "/admin/coming-soon/analytics/marketing": "admin-analytics-marketing",
  "/admin/coming-soon/analytics/recordings": "admin-analytics-session-recordings",
  "/admin/analytics/recordings": "admin-analytics-session-recordings",
  "/admin/coming-soon/analytics/session-recordings": "admin-analytics-session-recordings",
  "/admin/coming-soon/analytics/insights": "admin-analytics-insights",
  "/admin/coming-soon/analytics/benchmarks": "admin-analytics-benchmarks",
  "/admin/coming-soon/analytics/reports": "admin-analytics-reports",
});

const legacyPageAliases = Object.freeze({
  "admin-reports": "admin-analytics-reports",
  "admin-tenant-placeholder-analytics-highlights": "admin-analytics-highlights",
  "admin-tenant-placeholder-analytics-realtime": "admin-analytics-realtime",
  "admin-tenant-placeholder-analytics-traffic": "admin-analytics-traffic",
  "admin-tenant-placeholder-analytics-behavior": "admin-analytics-behavior",
  "admin-tenant-placeholder-analytics-marketing": "admin-analytics-marketing",
  "admin-tenant-placeholder-analytics-recordings": "admin-analytics-session-recordings",
  "admin-tenant-placeholder-analytics-session-recordings": "admin-analytics-session-recordings",
  "admin-tenant-placeholder-analytics-insights": "admin-analytics-insights",
  "admin-tenant-placeholder-analytics-benchmarks": "admin-analytics-benchmarks",
  "admin-tenant-placeholder-analytics-reports": "admin-analytics-reports",
});

export function canonicalAnalyticsPageKey(page) {
  return legacyPageAliases[page] || page;
}

export function resolveAnalyticsPage(pathname) {
  return legacyPathAliases[pathname]
    || Object.entries(analyticsRoutes).find(([, path]) => path === pathname)?.[0]
    || null;
}

export function analyticsDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function buildVerifiedOperationalSummary({ customers = [], employees = [], orders = [], products = [] } = {}) {
  return {
    customers: Array.isArray(customers) ? customers.length : 0,
    employees: Array.isArray(employees) ? employees.length : 0,
    orders: Array.isArray(orders) ? orders.length : 0,
    products: Array.isArray(products) ? products.length : 0,
    revenue: Array.isArray(orders)
      ? orders.reduce((sum, order) => sum + Number(order?.total || 0), 0)
      : 0,
  };
}

export const reportCatalog = Object.freeze([
  ["Sales", "Review confirmed commerce records.", ["Sales over time", "Sales by product", "Orders over time", "Average order value"]],
  ["Accounting", "Financial report templates for supported records.", ["Revenue summary", "Tax summary", "Payment reconciliation"]],
  ["Traffic", "Visitor reports require a verified analytics source.", ["Traffic overview", "Traffic by source", "Traffic by location"]],
  ["Bookings", "Booking reports appear when booking data is connected.", ["Bookings over time", "Popular services"]],
  ["Subscriptions", "Subscription reports require supported plan data.", ["Subscription revenue", "Active subscriptions"]],
  ["Events", "Event reports require an enabled events source.", ["Ticket sales", "Event attendance"]],
  ["Video", "Video analytics require verified viewing events.", ["Video performance", "Viewing activity"]],
  ["Blog", "Blog analytics require verified content events.", ["Post performance", "Blog engagement"]],
  ["Behavior", "Behavior reports require consented event tracking.", ["Page engagement", "Navigation flows", "Form submissions"]],
  ["Marketing", "Marketing reports require connected campaign sources.", ["Campaign performance", "Email performance", "Ad performance"]],
  ["SEO", "Search reports require a verified search integration.", ["Search performance", "Search queries", "Landing pages"]],
  ["Mobile apps", "Mobile reports require an enabled app source.", ["App activity", "App members"]],
  ["People", "People reports use supported tenant customer records.", ["Customer growth", "Returning customers"]],
]);
