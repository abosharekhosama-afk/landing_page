import { getNavigationItem } from "../data/adminNavigation.js";
import { moduleAllowsPage } from "./moduleRegistry.js";
import { canAccessAdminPage, isPlatformAdmin, isTenantOperator } from "./roles.js";

export const marketingPageKeys = Object.freeze([
  "admin-seo",
  "admin-tenant-placeholder-marketing-seo-geo",
  "admin-tenant-placeholder-marketing-google-ads",
  "admin-tenant-placeholder-marketing-meta-ads",
  "admin-tenant-placeholder-marketing-email",
  "admin-tenant-placeholder-marketing-social",
  "admin-tenant-placeholder-marketing-referrals",
  "admin-tenant-placeholder-marketing-google-business",
]);

const destinations = Object.freeze({
  companySettings: "admin-settings",
  siteOverview: "admin-tenant-placeholder-site-overview",
  websiteContent: "admin-website-media",
});

const moduleDestinations = new Set(["admin-settings", "admin-website-media"]);

export function isMarketingPage(pageKey) {
  return marketingPageKeys.includes(pageKey);
}

export function marketingDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function canViewMarketing(currentUser, company) {
  const companyId = company?.id || currentUser?.activeCompany?.id || currentUser?.active_company?.id;
  return Boolean(companyId) && (
    isTenantOperator(currentUser?.role) || isPlatformAdmin(currentUser?.role)
  );
}

export function resolveMarketingDestination(action, { currentUser, modules = [] } = {}) {
  const page = destinations[action] || null;
  if (!page || !getNavigationItem(page) || !canAccessAdminPage(currentUser, page)) return null;
  if (moduleDestinations.has(page) && !moduleAllowsPage(modules, page)) return null;
  return page;
}

export function confirmedMarketingContext(company) {
  const settings = company?.settings && typeof company.settings === "object"
    ? company.settings
    : {};
  return {
    campaigns: [],
    companyName: company?.name || null,
    connectedAccounts: [],
    domain: company?.domain || null,
    integrations: [],
    locale: settings.locale || null,
    logoUrl: company?.logoUrl || settings.logoUrl || null,
    referralProgram: null,
    socialPosts: [],
    storefrontUrl: company?.storefrontUrl || settings.storefrontUrl || null,
  };
}

export function metaSalesAvailable() {
  return false;
}
