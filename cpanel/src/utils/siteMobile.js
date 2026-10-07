import { getNavigationItem } from "../data/adminNavigation.js";
import { moduleAllowsPage } from "./moduleRegistry.js";
import {
  canAccessAdminPage,
  isPlatformAdmin,
  isTenantOperator,
} from "./roles.js";

export const siteMobilePageKeys = Object.freeze([
  "admin-tenant-placeholder-site-overview",
  "admin-tenant-placeholder-site-website",
  "admin-tenant-placeholder-site-speed",
  "admin-tenant-placeholder-site-security",
  "admin-tenant-placeholder-site-mobile-app",
  "admin-tenant-placeholder-site-logo-brand",
  "admin-tenant-placeholder-site-link-in-bio",
]);

const destinationPages = Object.freeze({
  editSite: "admin-site-editor",
  linkBio: "admin-tenant-placeholder-site-link-in-bio",
  logoBrand: "admin-tenant-placeholder-site-logo-brand",
  mobileApp: "admin-tenant-placeholder-site-mobile-app",
  overview: "admin-tenant-placeholder-site-overview",
  security: "admin-tenant-placeholder-site-security",
  settings: "admin-settings",
  siteSpeed: "admin-tenant-placeholder-site-speed",
  website: "admin-tenant-placeholder-site-website",
  websiteContent: "admin-website-media",
});

const moduleDestinations = new Set(["admin-settings", "admin-website-media"]);

export function isSiteMobilePage(pageKey) {
  return siteMobilePageKeys.includes(pageKey);
}

export function siteMobileDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

function scopedCompanyId(currentUser, company) {
  return company?.id || currentUser?.activeCompany?.id || currentUser?.active_company?.id || null;
}

export function canViewSiteMobile(currentUser, company) {
  return Boolean(scopedCompanyId(currentUser, company)) && (
    isTenantOperator(currentUser?.role) || isPlatformAdmin(currentUser?.role)
  );
}

export function resolveSiteMobileDestination(action, context = {}) {
  const { currentUser, modules = [] } = context;
  if (action === "connectDomain") {
    if (canAccessAdminPage(currentUser, "admin-platform-domains")) {
      return "admin-platform-domains";
    }
    return canAccessAdminPage(currentUser, "admin-settings") &&
      moduleAllowsPage(modules, "admin-settings")
      ? "admin-settings"
      : null;
  }

  const page = destinationPages[action] || null;
  if (!page || !getNavigationItem(page)) return null;
  if (!canAccessAdminPage(currentUser, page)) return null;
  if (moduleDestinations.has(page) && !moduleAllowsPage(modules, page)) return null;
  return page;
}

export function confirmedSiteFacts(company) {
  const settings = company?.settings && typeof company.settings === "object"
    ? company.settings
    : {};
  return {
    companyName: company?.name || null,
    direction: settings.direction || null,
    domain: company?.domain || null,
    faviconUrl: company?.faviconUrl || settings.faviconUrl || null,
    language: settings.language || null,
    locale: settings.locale || null,
    logoUrl: company?.logoUrl || settings.logoUrl || null,
    slug: company?.slug || null,
    storefrontUrl: company?.storefrontUrl || settings.storefrontUrl || null,
  };
}

export function suggestedLinkSlug(company) {
  const value = String(company?.slug || "").trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null;
}
