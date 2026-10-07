export const developerToolsRoutes = Object.freeze({
  "admin-developer-site-logs": "/admin/developer-tools/logging-tools/wix-logs",
  "admin-developer-advanced-log-tools": "/admin/developer-tools/logging-tools/advanced-log-tools",
  "admin-developer-monitoring": "/admin/developer-tools/monitoring",
  "admin-developer-secrets-manager": "/admin/developer-tools/secrets-manager",
  "admin-developer-triggered-emails": "/admin/developer-tools/triggered-emails",
});

export const developerToolsPageKeys = Object.freeze(Object.keys(developerToolsRoutes));

const developerToolsAliases = Object.freeze({
  "/admin/developer-tools": "admin-developer-site-logs",
  "/admin/developer-tools/logging-tools": "admin-developer-site-logs",
  "/admin/developer-tools/wix-logs": "admin-developer-site-logs",
  "/admin/developer-tools/advanced-log-tools": "admin-developer-advanced-log-tools",
});

const pageAliases = Object.freeze({
  "admin-developer-tools": "admin-developer-site-logs",
  "admin-developer-logging-tools": "admin-developer-site-logs",
  "admin-developer-wix-logs": "admin-developer-site-logs",
  "admin-developer-advanced-logs": "admin-developer-advanced-log-tools",
});

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return pathname || "/";
  return pathname.replace(/\/+$/, "");
}

export function resolveDeveloperToolsPage(pathname) {
  const normalized = normalizePathname(pathname);
  return developerToolsAliases[normalized]
    || Object.entries(developerToolsRoutes).find(([, path]) => path === normalized)?.[0]
    || null;
}

export function canonicalDeveloperToolsPageKey(page) {
  return pageAliases[page] || page;
}

export function developerToolsDirection(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function getCompanyStorefrontUrl(company) {
  const candidate = company?.storefrontUrl
    || company?.storefront_url
    || company?.websiteUrl
    || company?.website_url
    || company?.domain
    || company?.customDomain;
  if (!candidate || typeof candidate !== "string") return "";
  const value = candidate.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(value)) return `https://${value}`;
  return "";
}
