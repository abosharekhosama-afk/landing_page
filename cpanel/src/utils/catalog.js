import { hasPermission } from "../data/permissions.js";
import { canAccessAdminPage, isTenantOperator } from "./roles.js";

export const catalogPlaceholderPageKeys = Object.freeze([
  "admin-tenant-placeholder-catalog-booking-services",
  "admin-tenant-placeholder-catalog-gift-cards",
  "admin-tenant-placeholder-catalog-booking-channels-integrations",
  "admin-tenant-placeholder-catalog-booking-channels-links",
]);

export const catalogDiscountPageKeys = Object.freeze([
  "admin-coupons",
  "admin-automatic-discounts",
  "admin-tenant-placeholder-catalog-discounts-coupons",
  "admin-tenant-placeholder-catalog-discounts-automatic",
]);

export function isCatalogPlaceholderPage(pageKey) {
  return catalogPlaceholderPageKeys.includes(pageKey);
}

export function isCatalogDiscountPage(pageKey) {
  return catalogDiscountPageKeys.includes(pageKey);
}

export function catalogDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function canUseCatalogAction(currentUser, action = "view") {
  if (!canAccessAdminPage(currentUser, "admin-products")) return false;
  if (isTenantOperator(currentUser?.role)) return true;
  if (action === "view") return hasPermission(currentUser, "products.view");
  return ["products.create", "products.update", "products.manage"].some((permission) =>
    hasPermission(currentUser, permission),
  );
}

export function hasShareLinkConfiguration(company = {}) {
  return Boolean(
    company.storefrontUrl
    || company.primaryDomain
    || company.domain
    || company.settings?.storefrontUrl
    || company.settings?.domain,
  );
}
