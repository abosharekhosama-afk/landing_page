const DEFAULT_EXCLUDED_PATHS = ["/checkout", "/payment", "/order-confirmation"];

export function normalizeStorefrontPath(value = "/") {
  const raw = String(value || "/").trim();
  if (!raw) return "/";
  try {
    const pathname = new URL(raw, window.location.origin).pathname || "/";
    return pathname.length > 1 ? pathname.replace(/\/$/, "") : "/";
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

export function isStorefrontDisplayExcluded(rules, page = "/") {
  const path = normalizeStorefrontPath(page);
  const configured = Array.isArray(rules?.excludedPages) ? rules.excludedPages : [];
  return [...new Set([...DEFAULT_EXCLUDED_PATHS, ...configured])].some((item) => {
    const rule = normalizeStorefrontPath(item);
    return rule.endsWith("/*") ? path.startsWith(rule.slice(0, -1)) : path === rule;
  });
}
