import {
  canAccessAdminPage,
  filterAccessiblePages,
  isAdminPortalRole,
  isPlatformAdmin,
  isScopedPlatformSuperAdmin,
  landingPageForRole,
  resolveAdminPage,
} from "./roles.js";
import { moduleAllowsPage, pageKeyForModule } from "./moduleRegistry.js";
import { placeholderPagePaths } from "../data/adminNavigation.js";
import {
  analyticsRoutes,
  canonicalAnalyticsPageKey,
  resolveAnalyticsPage,
} from "./analytics.js";
import {
  bookingRoutes,
  canonicalBookingPageKey,
  resolveBookingPage,
} from "./bookings.js";
import {
  canonicalTenantManagementPageKey,
  resolveTenantManagementPage,
  tenantManagementRoutes,
} from "./tenantManagement.js";
import {
  canonicalWebsiteContentPageKey,
  resolveWebsiteContentPage,
  websiteContentRoutes,
} from "./websiteContent.js";
import {
  canonicalDeveloperToolsPageKey,
  developerToolsRoutes,
  resolveDeveloperToolsPage,
} from "./developerTools.js";
import {
  customModulePageKey,
  isCustomModulePage,
  parseCustomModuleKeyFromPath,
} from "./customModulesUi.js";

export function isValidCpanelUser(user) {
  if (!user) return false;
  if (!isAdminPortalRole(user.role)) return false;
  if (user.isActive === false) return false;
  if (isPlatformAdmin(user.role)) return true;
  if (!user.activeCompany) return false;
  if (user.activeCompany.status === "inactive") return false;
  if (user.companyId && user.activeCompany.id !== user.companyId) return false;

  if ((user.globalRole === "super_admin" || user.globalRole === "platform_admin") && user.isCompanyScope === true) {
    return true;
  }

  const membership = user.activeMembership;
  if (!membership) return false;
  if (membership.status !== "active") return false;
  if (membership.companyId !== user.activeCompany.id) return false;
  return true;
}

export function landingPage(user, overrideModules) {
  if (!user) return landingPageForRole();
  const role = user.role;
  if (isPlatformAdmin(role)) return "admin-platform-companies";
  if (["company_admin", "admin"].includes(role)) return "admin";
  if (role === "manager") return "admin";
  const moduleList =
    overrideModules && overrideModules.length ? overrideModules : user.activeCompany?.modules || [];
  if (moduleList.length) {
    const accessible = filterAccessiblePages(
      user,
      moduleList.map((m) => pageKeyForModule(m)).filter(Boolean),
    );
    if (accessible.length) return accessible[0];
  }
  return "admin-no-access";
}

export function moduleAllowsPageForUser(user, modules, page) {
  if (!modules?.length) return true;
  if (isScopedPlatformSuperAdmin(user)) return true;
  return moduleAllowsPage(modules, page);
}

const customerLeadPaths = Object.freeze({
  "admin-customers": "/admin/customers",
  "admin-inbox": "/admin/inbox",
  "admin-forms": "/admin/forms",
  "admin-meetings": "/admin/meetings",
  "admin-pipelines": "/admin/pipelines",
  "admin-community": "/admin/community",
  "admin-loyalty": "/admin/loyalty",
});

const legacyCustomerLeadPaths = Object.freeze({
  "/admin/coming-soon/inbox": "admin-inbox",
  "/admin/coming-soon/customers": "admin-customers",
  "/admin/coming-soon/customers-leads": "admin-customers",
  "/admin/coming-soon/customers/forms": "admin-forms",
  "/admin/coming-soon/customers/meetings": "admin-meetings",
  "/admin/coming-soon/customers/pipelines": "admin-pipelines",
  "/admin/coming-soon/customers/community": "admin-community",
  "/admin/coming-soon/customers/loyalty": "admin-loyalty",
  "/admin/coming-soon/customers-leads/forms": "admin-forms",
  "/admin/coming-soon/customers-leads/meetings": "admin-meetings",
  "/admin/coming-soon/customers-leads/pipelines": "admin-pipelines",
  "/admin/coming-soon/customers-leads/community": "admin-community",
  "/admin/coming-soon/customers-leads/loyalty": "admin-loyalty",
});

const legacyCustomerLeadPageKeys = Object.freeze({
  "admin-tenant-placeholder-inbox": "admin-inbox",
  "admin-tenant-placeholder-customers": "admin-customers",
  "admin-tenant-placeholder-customers-leads": "admin-customers",
  "admin-tenant-placeholder-customers-forms": "admin-forms",
  "admin-tenant-placeholder-customers-meetings": "admin-meetings",
  "admin-tenant-placeholder-customers-pipelines": "admin-pipelines",
  "admin-tenant-placeholder-customers-community": "admin-community",
  "admin-tenant-placeholder-customers-loyalty": "admin-loyalty",
  "admin-tenant-placeholder-customers-leads-forms": "admin-forms",
  "admin-tenant-placeholder-customers-leads-meetings": "admin-meetings",
  "admin-tenant-placeholder-customers-leads-pipelines": "admin-pipelines",
  "admin-tenant-placeholder-customers-leads-community": "admin-community",
  "admin-tenant-placeholder-customers-leads-loyalty": "admin-loyalty",
});

const legacyDiscountSeoPageKeys = Object.freeze({
  "admin-tenant-placeholder-catalog-discounts-coupons": "admin-coupons",
  "admin-tenant-placeholder-catalog-discounts-automatic": "admin-automatic-discounts",
  "admin-tenant-placeholder-marketing-seo-geo": "admin-seo",
});

function normalizedPathname(pathname) {
  if (!pathname || pathname === "/") return pathname || "/";
  return pathname.replace(/\/+$/, "");
}

function unauthorizedPage(user) {
  return isAdminPortalRole(user?.role) ? "admin-no-access" : landingPageForRole(user?.role);
}

function canOpenCustomerLeadPage(user, page, navigationModules) {
  if (!canAccessAdminPage(user, page)) return false;
  const modules = navigationModules?.length
    ? navigationModules
    : user?.activeCompany?.modules || [];
  return moduleAllowsPageForUser(user, modules, page);
}

export function canonicalAdminPageKey(page) {
  if (isCustomModulePage(page)) return page;
  return canonicalDeveloperToolsPageKey(
    canonicalWebsiteContentPageKey(
      canonicalTenantManagementPageKey(
        canonicalBookingPageKey(canonicalAnalyticsPageKey(legacyCustomerLeadPageKeys[page] || legacyDiscountSeoPageKeys[page] || page)),
      ),
    ),
  );
}

export function resolvePage(pathname, user, navigationModules) {
  const normalizedPath = normalizedPathname(pathname);
  if (normalizedPath === "/velvet" || /^\/store\/[^/]+$/.test(normalizedPath)) {
    return "velvet-public";
  }
  if (normalizedPath === "/admin/site-editor") {
    return canAccessAdminPage(user, "admin-site-editor")
      ? "admin-site-editor"
      : unauthorizedPage(user);
  }
  const customModuleKey = parseCustomModuleKeyFromPath(normalizedPath);
  if (customModuleKey) {
    const page = customModulePageKey(customModuleKey);
    return canAccessAdminPage(user, page) ? page : unauthorizedPage(user);
  }
  if (/^\/admin\/products\/[^/]+\/edit$/.test(normalizedPath)) {
    return canAccessAdminPage(user, "admin-products-edit")
      ? "admin-products-edit"
      : landingPage(user, navigationModules);
  }
  if (/^\/admin\/customers\/[^/]+$/.test(normalizedPath)) {
    return canOpenCustomerLeadPage(user, "admin-customers-detail", navigationModules)
      ? "admin-customers-detail"
      : unauthorizedPage(user);
  }
  const customerLeadPage = legacyCustomerLeadPaths[normalizedPath]
    || Object.entries(customerLeadPaths).find(([, path]) => path === normalizedPath)?.[0];
  if (customerLeadPage) {
    return canOpenCustomerLeadPage(user, customerLeadPage, navigationModules)
      ? customerLeadPage
      : unauthorizedPage(user);
  }
  const analyticsPage = resolveAnalyticsPage(normalizedPath);
  if (analyticsPage) {
    return canOpenCustomerLeadPage(user, analyticsPage, navigationModules)
      ? analyticsPage
      : unauthorizedPage(user);
  }
  const bookingPage = resolveBookingPage(normalizedPath);
  if (bookingPage) {
    return canOpenCustomerLeadPage(user, bookingPage, navigationModules)
      ? bookingPage
      : unauthorizedPage(user);
  }
  const managementPage = resolveTenantManagementPage(normalizedPath);
  if (managementPage) {
    return canOpenCustomerLeadPage(user, managementPage, navigationModules)
      ? managementPage
      : unauthorizedPage(user);
  }
  const websiteContentPage = resolveWebsiteContentPage(normalizedPath);
  if (websiteContentPage) {
    return canOpenCustomerLeadPage(user, websiteContentPage, navigationModules)
      ? websiteContentPage
      : unauthorizedPage(user);
  }
  const developerToolsPage = resolveDeveloperToolsPage(normalizedPath);
  if (developerToolsPage) {
    return canOpenCustomerLeadPage(user, developerToolsPage, navigationModules)
      ? developerToolsPage
      : unauthorizedPage(user);
  }
  const resolved = resolveAdminPage(normalizedPath, user, pagePaths);
  if (resolved === "admin" && !["company_admin", "admin"].includes(user?.role)) {
    return landingPage(user, navigationModules);
  }
  if (resolved === "admin" && user?.role === "manager") return resolved;
  return resolved;
}

const pagePaths = {
  "admin-login": "/admin/login",
  admin: "/admin/dashboard",
  "admin-platform-overview": "/admin/platform/overview",
  "admin-platform-companies": "/admin/platform/companies",
  "admin-platform-domains": "/admin/platform/domains",
  "admin-products": "/admin/products",
  "admin-product-bundles": "/admin/product-bundles",
  "admin-products-trash": "/admin/products/trash",
  "admin-products-new": "/admin/products/new",
  "admin-products-edit": "/admin/products/new",
  "admin-coupons": "/admin/coupons",
  "admin-automatic-discounts": "/admin/automatic-discounts",
  "admin-categories": "/admin/categories",
  "admin-categories-new": "/admin/categories/new",
  "admin-brands": "/admin/brands",
  "admin-brands-new": "/admin/brands/new",
  "admin-vlogs": "/admin/vlogs",
  "admin-vlogs-new": "/admin/vlogs/new",
  "admin-store-locator": "/admin/store-locator",
  "admin-store-locator-new": "/admin/store-locator/new",
  "admin-website-media": "/admin/website-media",
  "admin-homepage-offers": "/admin/homepage-offers",
  "admin-website-texts": "/admin/website-texts",
  "admin-sms": "/admin/sms",
  "admin-announcements": "/admin/announcements",
  "admin-banners": "/admin/banners",
  "admin-splash-ads": "/admin/splash-ads",
  "admin-sites": "/admin/sites",
  "admin-seo": "/admin/marketing/seo",
  "admin-site-editor": "/admin/site-editor",
  "admin-orders": "/admin/orders",
  "admin-reviews": "/admin/reviews",
  "admin-inventory": "/admin/inventory",
  "admin-customers": "/admin/customers",
  "admin-inbox": "/admin/inbox",
  "admin-forms": "/admin/forms",
  "admin-meetings": "/admin/meetings",
  "admin-pipelines": "/admin/pipelines",
  "admin-community": "/admin/community",
  "admin-loyalty": "/admin/loyalty",
  ...analyticsRoutes,
  ...bookingRoutes,
  ...tenantManagementRoutes,
  ...websiteContentRoutes,
  ...developerToolsRoutes,
  "admin-staff": "/admin/staff",
  "admin-staff-new": "/admin/staff/new",
  "admin-employees": "/admin/staff",
  "admin-product-settings": "/admin/product-settings",
  "admin-invoices": "/admin/invoices",
  "admin-delivery": "/admin/delivery",
  "admin-reports": "/admin/reports",
  "admin-activity-log": "/admin/activity-log",
  "admin-unit-creator": "/admin/unit-creator",
  "admin-dropshipping": "/admin/dropshipping",
  "admin-dropshipping-marketers": "/admin/dropshipping/marketers",
  "admin-dropshipping-products": "/admin/dropshipping/products",
  "admin-dropshipping-orders": "/admin/dropshipping/orders",
  "admin-dropshipping-earnings": "/admin/dropshipping/earnings",
  "admin-dropshipping-withdrawals": "/admin/dropshipping/withdrawals",
  "admin-dropshipping-reports": "/admin/dropshipping/reports",
  "admin-dropshipping-settings": "/admin/dropshipping/settings",
  "admin-velvet-dropshipping": "/admin/velvet-dropshipping",
  "admin-velvet-dropshipping-merchants": "/admin/velvet-dropshipping/merchants",
  "admin-velvet-dropshipping-catalog": "/admin/velvet-dropshipping/catalog",
  "admin-velvet-dropshipping-orders": "/admin/velvet-dropshipping/orders",
  "admin-velvet-dropshipping-fulfillment": "/admin/velvet-dropshipping/fulfillment",
  "admin-velvet-dropshipping-settlements": "/admin/velvet-dropshipping/settlements",
  "admin-no-access": "/admin/no-access",
  ...placeholderPagePaths,
};
