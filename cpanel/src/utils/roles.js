const platformPageKeys = new Set(["admin-platform-companies", "admin-platform-domains", "admin-platform-overview"]);
export const adminDashboardPath = "/admin/dashboard";

export function isPlatformAdmin(role) {
  return role === "super_admin" || role === "platform_admin";
}

export function effectivePlatformRole(user) {
  if (!user || typeof user !== "object") return user;
  return user.globalRole || user.role;
}

export function isScopedPlatformSuperAdmin(user) {
  return (
    isPlatformAdmin(effectivePlatformRole(user)) &&
    user?.isCompanyScope === true &&
    Boolean(user?.activeCompany?.id)
  );
}

export function isCompanyAdmin(role) {
  return role === "admin" || role === "company_admin";
}

export function isStaffRole(role) {
  return role === "employee" || role === "staff" || role === "manager";
}

export function isTenantOperator(role) {
  return isCompanyAdmin(role) || role === "manager";
}

export function isAdminPortalRole(role) {
  return isPlatformAdmin(role) || isTenantOperator(role) || isStaffRole(role);
}

export function canUseCustomerAction(user, permission) {
  const role = roleFromUser(user);
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return permissions.includes("customers.manage") || permissions.includes(permission);
}

export function canUseInboxAction(user, permission) {
  const role = roleFromUser(user);
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return permissions.includes("inbox.manage") || permissions.includes(permission);
}

export function canUseInvoiceAction(user, permission) {
  const role = roleFromUser(user);
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  if (role === "manager") return true;
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return permissions.includes("invoices.manage") || permissions.includes(permission);
}

export function canUseReviewAction(user, permission) {
  const role = roleFromUser(user);
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  if (role === "manager") return true;
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return permissions.includes("reviews.manage") || permissions.includes(permission);
}

export function canUseProductSettingsAction(user, permission) {
  const role = roleFromUser(user);
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  if (role === "manager") return true;
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return permissions.includes("product_settings.manage") || permissions.includes(permission);
}

export function canUseDeliveryAction(user, permission) {
  const role = roleFromUser(user);
  if (isCompanyAdmin(role)) return true;
  if (role === "super_admin") return user?.isCompanyScope === true && Boolean(user?.activeCompany);
  if (role === "manager") return true;
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return permissions.includes("delivery.manage") || permissions.includes(permission);
}

export function isPlatformPage(page) {
  return platformPageKeys.has(page) || page?.startsWith("admin-platform-placeholder-");
}

export function landingPageForRole(role) {
  if (isPlatformAdmin(role)) return "admin-platform-companies";
  if (isAdminPortalRole(role)) return "admin";
  return "admin-login";
}

const PAGE_PERMISSIONS = {
  admin: ["dashboard.view"],
  "admin-sms": ["sms.view", "sms.send", "sms.manage", "sms.logs.view"],
  "admin-announcements": ["announcements.view", "announcements.manage"],
  "admin-policies": ["policies.view", "policies.manage"],
  "admin-legal-information": ["legal_information.view", "legal_information.manage"],
  "admin-security": ["security.login_history.view", "security.ip_blocks.view", "security.ip_blocks.manage", "security.settings.manage"],
  "admin-banners": ["banners.view", "banners.manage"],
  "admin-splash-ads": ["splash_ads.view", "splash_ads.manage"],
  "admin-products": ["products.view"],
  "admin-product-bundles": ["products.view"],
  "admin-products-trash": ["products.view"],
  "admin-products-new": ["products.create", "products.manage"],
  "admin-products-edit": ["products.update", "products.manage"],
  "admin-coupons": ["products.view", "products.manage"],
  "admin-automatic-discounts": ["products.view", "products.manage"],
  "admin-tenant-placeholder-catalog-discounts-coupons": ["products.view", "products.manage"],
  "admin-tenant-placeholder-catalog-discounts-automatic": ["products.view", "products.manage"],
  "admin-categories": ["categories.view"],
  "admin-categories-new": ["categories.create", "categories.update", "categories.manage"],
  "admin-brands": ["brands.view"],
  "admin-brands-new": ["brands.create", "brands.update", "brands.manage"],
  "admin-vlogs": null,
  "admin-vlogs-new": null,
  "admin-store-locator": null,
  "admin-store-locator-new": null,
  "admin-website-media": ["website_media.manage"],
  "admin-homepage-offers": null,
  "admin-website-texts": ["website_texts.manage"],
  "admin-sites": ["sites.manage", "site_editor.access"],
  "admin-website-content-cms": null,
  "admin-website-content-multilingual": null,
  "admin-site-editor": ["site_editor.access"],
  "admin-orders": ["orders.view"],
  "admin-reviews": ["reviews.view"],
  "admin-inventory": ["inventory.view", "inventory.manage", "products.view", "products.manage"],
  "admin-customers": ["customers.view"],
  "admin-customers-detail": ["customers.view"],
  "admin-inbox": ["inbox.view"],
  "admin-forms": ["customers.view"],
  "admin-meetings": ["customers.view"],
  "admin-pipelines": ["customers.view"],
  "admin-community": ["customers.view"],
  "admin-loyalty": ["customers.view"],
  "admin-staff": ["employees.view"],
  "admin-staff-new": ["employees.view"],
  "admin-employees": ["employees.view"],
  "admin-settings": null,
  "admin-seo": null,
  "admin-tenant-placeholder-marketing-seo-geo": null,
  "admin-developer-site-logs": null,
  "admin-developer-advanced-log-tools": null,
  "admin-developer-monitoring": null,
  "admin-developer-secrets-manager": null,
  "admin-developer-triggered-emails": null,
  "admin-automations": ["customers.manage"],
  "admin-settings-getting-paid": null,
  "admin-settings-getting-paid-general": null,
  "admin-settings-getting-paid-invoices": null,
  "admin-settings-getting-paid-price-quotes": null,
  "admin-settings-getting-paid-pay-links": null,
  "admin-settings-getting-paid-automations": null,
  "admin-settings-receipts": null,
  "admin-settings-receipts-automations": null,
  "admin-settings-tax": null,
  "admin-settings-checkout": null,
  "admin-settings-checkout-emails": null,
  "admin-settings-shipping": null,
  "admin-settings-bookings": null,
  "admin-settings-bookings-default-hours": null,
  "admin-settings-bookings-add-ons": null,
  "admin-settings-bookings-staff": null,
  "admin-settings-bookings-resources": null,
  "admin-settings-bookings-notifications-sent": null,
  "admin-settings-bookings-notifications-received": null,
  "admin-settings-bookings-client-flow": null,
  "admin-settings-bookings-forms": null,
  "admin-settings-bookings-video-conferencing": null,
  "admin-settings-bookings-integrations": null,
  "admin-product-settings": ["product_settings.view"],
  "admin-invoices": ["invoices.view"],
  "admin-delivery": ["delivery.view"],
  "admin-reports": ["reports.view"],
  "admin-analytics-highlights": ["reports.view"],
  "admin-analytics-realtime": ["reports.view"],
  "admin-analytics-traffic": ["reports.view"],
  "admin-analytics-behavior": ["reports.view"],
  "admin-analytics-marketing": ["reports.view"],
  "admin-analytics-session-recordings": ["reports.view"],
  "admin-analytics-insights": ["reports.view"],
  "admin-analytics-benchmarks": ["reports.view"],
  "admin-analytics-reports": ["reports.view"],
  "admin-bookings-calendar": ["customers.view"],
  "admin-bookings-list": ["customers.view"],
  "admin-bookings-work-schedule": ["customers.view"],
  "admin-bookings-analytics": ["customers.view"],
  "admin-activity-log": ["activity_log.view"],
  "admin-unit-creator": null,
  "admin-dropshipping": ["dropshipping.reports.read"],
  "admin-dropshipping-marketers": ["dropshipping.marketers.read"],
  "admin-dropshipping-products": ["dropshipping.products.read"],
  "admin-dropshipping-orders": ["dropshipping.orders.read"],
  "admin-dropshipping-earnings": ["dropshipping.earnings.read"],
  "admin-dropshipping-withdrawals": ["dropshipping.withdrawals.read"],
  "admin-dropshipping-reports": ["dropshipping.reports.read"],
  "admin-dropshipping-settings": ["dropshipping.settings.manage"],
  "admin-velvet-dropshipping": ["company_dropship.orders.read"],
  "admin-velvet-dropshipping-merchants": ["company_dropship.orders.read"],
  "admin-velvet-dropshipping-catalog": ["company_dropship.orders.read"],
  "admin-velvet-dropshipping-orders": ["company_dropship.orders.read"],
  "admin-velvet-dropshipping-fulfillment": ["company_dropship.orders.read"],
  "admin-velvet-dropshipping-settlements": ["company_dropship.orders.read"],
};

function roleFromUser(user) {
  return user && typeof user === "object" ? user.role : user;
}

function permissionsFromUser(user) {
  return user && typeof user === "object" ? user.permissions || [] : [];
}

function userHasPagePermission(user, page) {
  const role = roleFromUser(user);
  if (page === "admin-unit-creator") {
    if (role === "super_admin") {
      return user?.isCompanyScope === true && Boolean(user?.activeCompany);
    }
    return isCompanyAdmin(role);
  }
  if (typeof page === "string" && (page === "admin-custom-module" || page.startsWith("admin-custom-module:"))) {
    if (role === "super_admin") {
      return user?.isCompanyScope === true && Boolean(user?.activeCompany);
    }
    if (isCompanyAdmin(role)) return true;
    return isStaffRole(role);
  }
  if (page === "admin-site-editor") {
    if (role === "super_admin") {
      return user?.isCompanyScope === true && Boolean(user?.activeCompany);
    }
    if (isCompanyAdmin(role)) return true;
    return isStaffRole(role) && permissionsFromUser(user).includes("site_editor.access");
  }
  if (isTenantOperator(role)) return true;
  if (!isStaffRole(role)) return false;
  const required = PAGE_PERMISSIONS[page];
  if (!required) return false;
  const perms = permissionsFromUser(user);
  return required.some((p) => perms.includes(p));
}

export function canAccessAdminPage(user, page) {
  const role = roleFromUser(user);
  if (page === "admin-login") return !isAdminPortalRole(role);
  if (page === "admin-no-access") return isAdminPortalRole(role);
  if (isPlatformPage(page)) return isPlatformAdmin(role);
  return userHasPagePermission(user, page);
}

export function resolveAdminPage(pathname, user, pagePaths) {
  const role = roleFromUser(user);
  if (pathname === "/" || pathname === "/admin" || pathname === adminDashboardPath) {
    return landingPageForRole(role);
  }

  const match = Object.entries(pagePaths).find(([, path]) => path === pathname);
  if (!match) return landingPageForRole(role);
  if (match[0] === "admin-login") {
    return isAdminPortalRole(role) ? landingPageForRole(role) : match[0];
  }

  return canAccessAdminPage(user, match[0]) ? match[0] : landingPageForRole(role);
}

export function filterAccessiblePages(user, pageKeys) {
  return pageKeys.filter((page) => canAccessAdminPage(user, page));
}

export function tenantAccessNotice(roleOrUser) {
  const role = typeof roleOrUser === "string" || roleOrUser == null
    ? roleOrUser
    : roleFromUser(roleOrUser);
  const permissions = typeof roleOrUser === "object" && roleOrUser
    ? permissionsFromUser(roleOrUser)
    : [];
  if (isPlatformAdmin(role)) return null;
  if (isCompanyAdmin(role)) return null;
  if (role === "manager") {
    return "Manager access: content, catalog, orders, customers, and reviews can be managed. Staff and settings are restricted.";
  }
  if (["employee", "staff"].includes(role)) {
    const hasAssignedWrite = permissions.some((permission) =>
      /(^|\.)(create|update|delete|manage)$/.test(String(permission || "")),
    );
    if (hasAssignedWrite) {
      return "Employee access: actions are limited to your assigned permissions.";
    }
    return "Employee access: admin sections are available in view-only mode.";
  }
  return "Employee access: admin sections are available in view-only mode.";
}

export function canReadCatalogFormOptions(user) {
  if (!user || !["employee", "staff"].includes(user.role)) return false;
  return user.permissions?.some((p) =>
    ["products.create", "products.update", "products.manage"].includes(p),
  );
}

export function canManageProductMedia(user) {
  const role = user?.role;
  if (isCompanyAdmin(role) || role === "manager") return true;
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return ["product_media.manage", "products.manage", "products.update"].some((permission) =>
    permissions.includes(permission),
  );
}

export function canUpdateProducts(user) {
  const role = user?.role;
  if (isCompanyAdmin(role) || role === "manager") return true;
  if (!isStaffRole(role)) return false;
  const permissions = permissionsFromUser(user);
  return ["products.update", "products.manage"].some((permission) => permissions.includes(permission));
}
