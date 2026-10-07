const DEFAULT_EXCLUDED_PATHS = Object.freeze([
  "/checkout",
  "/payment",
  "/order-confirmation",
]);

function normalizePath(value = "/") {
  const raw = String(value || "/").trim();
  if (!raw) return "/";
  try {
    const parsed = new URL(raw, "http://storefront.local");
    const pathname = parsed.pathname || "/";
    return pathname.length > 1 ? pathname.replace(/\/$/, "") : "/";
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

export function storefrontDisplayRules(company) {
  const configured = company?.settings?.storefrontDisplayRules;
  const exclusions = Array.isArray(configured?.excludedPages)
    ? configured.excludedPages.map(normalizePath).filter(Boolean)
    : DEFAULT_EXCLUDED_PATHS;
  return {
    excludedPages: [...new Set([...DEFAULT_EXCLUDED_PATHS, ...exclusions])],
  };
}

export function isStorefrontPageExcluded(company, page = "/") {
  const normalized = normalizePath(page);
  return storefrontDisplayRules(company).excludedPages.some((rule) => {
    if (rule.endsWith("/*")) return normalized.startsWith(rule.slice(0, -1));
    return normalized === rule;
  });
}

export { normalizePath };
