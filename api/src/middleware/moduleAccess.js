import { getSessionUser } from "./auth.js";
import { companyModuleEnabledForCompany } from "../moduleRegistry.js";

const rules = [
  [/^\/api\/admin\/dropshipping\/products(?:\/|$)/, "dropshipping.products"],
  [/^\/api\/admin\/dropshipping\/orders(?:\/|$)/, "dropshipping.orders"],
  [/^\/api\/admin\/dropshipping\/marketers(?:\/|$)/, "dropshipping.marketers"],
  [/^\/api\/admin\/dropshipping\/earnings(?:\/|$)/, "dropshipping.earnings"],
  [/^\/api\/admin\/dropshipping\/withdrawals(?:\/|$)/, "dropshipping.withdrawals"],
  [/^\/api\/admin\/dropshipping\/reports(?:\/|$)/, "dropshipping.reports"],
  [/^\/api\/admin\/dropshipping\/settings(?:\/|$)/, "dropshipping.settings"],
  [/^\/api\/admin\/dropshipping(?:\/|$)/, "dropshipping.overview"],
  [/^\/api\/admin\/velvet-dropshipping\/merchants(?:\/|$)/, "company_dropship.merchants"],
  [/^\/api\/admin\/velvet-dropshipping\/offers(?:\/|$)/, "company_dropship.catalog"],
  [/^\/api\/admin\/velvet-dropshipping\/orders(?:\/|$)/, "company_dropship.orders"],
  [/^\/api\/admin\/velvet-dropshipping\/settlements(?:\/|$)/, "company_dropship.settlements"],
  [/^\/api\/products(?:\/|$)/, "catalog.products"],
  [/^\/api\/uploads\/products(?:\/|$)/, "catalog.products"],
  [/^\/api\/admin\/product-schema(?:\/|$)/, "settings.product_settings"],
  [/^\/api\/admin\/product-field-definitions(?:\/|$)/, "catalog.products"],
  [/^\/api\/admin\/inventory(?:\/|$)/, "operations.inventory"],
  [/^\/api\/admin\/products\/reorder(?:\/|$)/, "catalog.products"],
  [/^\/api\/admin\/products\/[^/]+\/field-values(?:\/|$)/, "catalog.products"],
  [/^\/api\/admin\/custom-modules(?:\/|$)/, "settings.unit_creator"],
  [/^\/api\/categories(?:\/|$)/, "catalog.categories"],
  [/^\/api\/brands(?:\/|$)/, "catalog.brands"],
  [/^\/api\/orders(?:\/|$)/, "operations.orders"],
  [/^\/api\/admin\/invoices(?:\/|$)/, "operations.invoices"],
  [/^\/api\/admin\/delivery-zones(?:\/|$)/, "operations.delivery"],
  [/^\/api\/reviews(?:\/|$)/, "operations.reviews"],
  [/^\/api\/(?:employees|employee|work-sessions)(?:\/|$)/, "people.employees"],
  [/^\/api\/website-media(?:\/|$)/, "storefront.website_media"],
  [/^\/api\/admin\/website-texts(?:\/|$)/, "storefront.website_texts"],
  [/^\/api\/admin\/sites(?:\/|$)/, "storefront.website_texts"],
  [/^\/api\/admin\/activity-log(?:\/|$)/, "settings.activity_log"],
  [/^\/api\/admin\/reports(?:\/|$)/, "settings.reports"],
  [/^\/api\/admin\/analytics(?:\/|$)/, "settings.reports"],
  [/^\/api\/admin\/export-store(?:\/|$)/, "settings.reports"],
  [/^\/api\/admin\/inbox(?:\/|$)/, "people.customers"],
  [/^\/api\/admin\/(?:customers|users)(?:\/|$)/, "people.customers"],
  [/^\/api\/admin\/summary(?:\/|$)/, "dashboard"],
  [/^\/api\/admin\/dashboard(?:\/|$)/, "dashboard"],
];

function moduleForRequest(req) {
  const path = String(req.originalUrl || req.url || "").split("?", 1)[0];
  return rules.find(([pattern]) => pattern.test(path))?.[1] || null;
}

export async function enforceCompanyModuleAccess(req, res, next) {
  const moduleKey = moduleForRequest(req);
  if (!moduleKey || !req.headers.authorization) return next();

  const user = req.user || await getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Invalid or expired authentication token." });
  const tenantRole = user.globalRole === "super_admin" || user.role === "super_admin"
    ? "super_admin"
    : user.globalRole === "platform_admin" || user.role === "platform_admin"
      ? "company_admin"
      : user.role;
  if (!["super_admin", "company_admin", "admin", "manager", "employee", "staff"].includes(tenantRole)) {
    return next();
  }
  if (moduleKey === "operations.reviews" && req.method === "POST") return next();
  const selfSessionMatch = moduleKey === "people.employees" && ["employee", "staff"].includes(tenantRole) && req.method === "GET" && String(req.originalUrl || req.url || "").match(/^\/api\/work-sessions\/employees\/([^/]+)\/?$/);
  if (selfSessionMatch && selfSessionMatch[1] === user.id) return next();
  if (!req.companyId) return res.status(403).json({ message: "An active company scope is required." });
  if (req.method === "GET" && ["catalog.categories", "catalog.brands"].includes(moduleKey) && user?.permissions?.some((p) => ["products.create", "products.update", "products.manage"].includes(p))) {
    const productsEnabled = await companyModuleEnabledForCompany(req.companyId, "catalog.products", user);
    if (productsEnabled) return next();
  }
  if (!await companyModuleEnabledForCompany(req.companyId, moduleKey, user)) {
    return res.status(403).json({ message: "This module is disabled for the active company.", moduleKey });
  }
  return next();
}

export { moduleForRequest };
