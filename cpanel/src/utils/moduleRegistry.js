const routePageKeys = Object.freeze({
  "/admin/dashboard": "admin",
  "/admin/sms": "admin-sms",
  "/admin/announcements": "admin-announcements",
  "/admin/banners": "admin-banners",
  "/admin/splash-ads": "admin-splash-ads",
  "admin-policies": "commerce.policies",
  "admin-legal-information": "commerce.legal_information",
  "/admin/products": "admin-products",
  "/admin/products/trash": "admin-products",
  "/admin/products/new": "admin-products",
  "/admin/categories": "admin-categories",
  "/admin/brands": "admin-brands",
  "/admin/vlogs": "admin-vlogs",
  "/admin/store-locator": "admin-store-locator",
  "/admin/website-media": "admin-website-media",
  "/admin/homepage-offers": "admin-website-media",
  "/admin/website-texts": "admin-website-texts",
  "/admin/sites": "admin-website-texts",
  "/admin/website-content/cms": "admin-website-texts",
  "/admin/website-content/multilingual": "admin-website-texts",
  "/admin/orders": "admin-orders",
  "/admin/invoices": "admin-invoices",
  "/admin/delivery": "admin-delivery",
  "/admin/reviews": "admin-reviews",
  "/admin/inventory": "admin-inventory",
  "/admin/customers": "admin-customers",
  "/admin/staff": "admin-staff",
  "/admin/settings": "admin-settings",
  "/admin/developer-tools/logging-tools/wix-logs": "admin-settings",
  "/admin/developer-tools/logging-tools/advanced-log-tools": "admin-settings",
  "/admin/developer-tools/monitoring": "admin-settings",
  "/admin/developer-tools/secrets-manager": "admin-settings",
  "/admin/developer-tools/triggered-emails": "admin-settings",
  "/admin/product-settings": "admin-product-settings",
  "/admin/reports": "admin-reports",
  "/admin/activity-log": "admin-activity-log",
  "/admin/unit-creator": "admin-unit-creator",
  "/admin/dropshipping": "admin-dropshipping",
  "/admin/dropshipping/marketers": "admin-dropshipping-marketers",
  "/admin/dropshipping/products": "admin-dropshipping-products",
  "/admin/dropshipping/orders": "admin-dropshipping-orders",
  "/admin/dropshipping/earnings": "admin-dropshipping-earnings",
  "/admin/dropshipping/withdrawals": "admin-dropshipping-withdrawals",
  "/admin/dropshipping/reports": "admin-dropshipping-reports",
  "/admin/dropshipping/settings": "admin-dropshipping-settings",
  "/admin/velvet-dropshipping": "admin-velvet-dropshipping",
  "/admin/velvet-dropshipping/merchants": "admin-velvet-dropshipping-merchants",
  "/admin/velvet-dropshipping/catalog": "admin-velvet-dropshipping-catalog",
  "/admin/velvet-dropshipping/orders": "admin-velvet-dropshipping-orders",
  "/admin/velvet-dropshipping/fulfillment": "admin-velvet-dropshipping-fulfillment",
  "/admin/velvet-dropshipping/settlements": "admin-velvet-dropshipping-settlements",
});

const aliases = Object.freeze({
  "admin-products-new": "admin-products",
  "admin-products-trash": "admin-products",
  "admin-products-edit": "admin-products",
  "admin-coupons": "admin-products",
  "admin-automatic-discounts": "admin-products",
  "admin-homepage-offers": "admin-website-media",
  "admin-categories-new": "admin-categories",
  "admin-brands-new": "admin-brands",
  "admin-vlogs-new": "admin-vlogs",
  "admin-store-locator-new": "admin-store-locator",
  "admin-staff-new": "admin-staff",
  "admin-employees": "admin-staff",
  "admin-customers-detail": "admin-customers",
  "admin-inbox": "admin-customers",
  "admin-forms": "admin-customers",
  "admin-meetings": "admin-customers",
  "admin-pipelines": "admin-customers",
  "admin-community": "admin-customers",
  "admin-loyalty": "admin-customers",
  "admin-analytics-highlights": "admin-reports",
  "admin-analytics-realtime": "admin-reports",
  "admin-analytics-traffic": "admin-reports",
  "admin-analytics-behavior": "admin-reports",
  "admin-analytics-marketing": "admin-reports",
  "admin-analytics-session-recordings": "admin-reports",
  "admin-analytics-insights": "admin-reports",
  "admin-analytics-benchmarks": "admin-reports",
  "admin-analytics-reports": "admin-reports",
  "admin-bookings-calendar": "admin-customers",
  "admin-bookings-list": "admin-customers",
  "admin-bookings-work-schedule": "admin-customers",
  "admin-bookings-analytics": "admin-customers",
  "admin-automations": "admin-customers",
  "admin-settings-getting-paid": "admin-settings",
  "admin-settings-getting-paid-general": "admin-settings",
  "admin-settings-getting-paid-invoices": "admin-settings",
  "admin-settings-getting-paid-price-quotes": "admin-settings",
  "admin-settings-getting-paid-pay-links": "admin-settings",
  "admin-settings-getting-paid-automations": "admin-settings",
  "admin-settings-receipts": "admin-settings",
  "admin-settings-receipts-automations": "admin-settings",
  "admin-settings-tax": "admin-settings",
  "admin-settings-checkout": "admin-settings",
  "admin-settings-checkout-emails": "admin-settings",
  "admin-settings-shipping": "admin-settings",
  "admin-settings-bookings": "admin-settings",
  "admin-settings-bookings-default-hours": "admin-settings",
  "admin-settings-bookings-add-ons": "admin-settings",
  "admin-settings-bookings-staff": "admin-settings",
  "admin-settings-bookings-resources": "admin-settings",
  "admin-settings-bookings-notifications-sent": "admin-settings",
  "admin-settings-bookings-notifications-received": "admin-settings",
  "admin-settings-bookings-client-flow": "admin-settings",
  "admin-settings-bookings-forms": "admin-settings",
  "admin-settings-bookings-video-conferencing": "admin-settings",
  "admin-settings-bookings-integrations": "admin-settings",
  "admin-developer-site-logs": "admin-settings",
  "admin-developer-advanced-log-tools": "admin-settings",
  "admin-developer-monitoring": "admin-settings",
  "admin-developer-secrets-manager": "admin-settings",
  "admin-developer-triggered-emails": "admin-settings",
  "admin-website-content-cms": "admin-website-texts",
  "admin-website-content-multilingual": "admin-website-texts",
  "admin-sites": "admin-website-texts",
  "admin-seo": "admin-settings",
});

export function pageKeyForModule(module) {
  return routePageKeys[module?.route] || null;
}

export function normalizedModulePage(page) {
  return aliases[page] || page;
}

export function moduleAllowsPage(modules, page) {
  const normalized = normalizedModulePage(page);
  if (normalized === "admin-velvet-dropshipping") {
    return modules.some((module) => module.enabled !== false && String(module.module_key || "").startsWith("company_dropship."));
  }
  return modules.some((module) => module.enabled !== false && pageKeyForModule(module) === normalized);
}

export function groupCompanyModules(modules) {
  const groups = new Map();
  [...modules].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).forEach((module) => {
    const pageKey = pageKeyForModule(module);
    if (!pageKey) return;
    const key = module.group_key || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...module, pageKey });
  });
  return [...groups.entries()].map(([id, items]) => ({ id, items }));
}
