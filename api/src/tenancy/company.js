export const DEFAULT_COMPANY_ID = "eb-chemical";
export const DEFAULT_COMPANY_DOMAIN = "ebchemi.com";
export const COMPANY_STATUSES = Object.freeze(["draft", "inactive", "active"]);
export const ADMIN_MODULE_KEYS = Object.freeze([
  "dashboard",
  "products",
  "product_settings",
  "categories",
  "orders",
  "customers",
  "employees",
  "website_media",
  "website_texts",
  "homepage_content",
  "settings",
  "custom_modules",
  "reports",
  "activity_log",
  "invoices",
  "delivery",
]);

const adminModuleKeys = new Set(ADMIN_MODULE_KEYS);
export const THEME_TOKEN_KEYS = Object.freeze([
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "text",
]);
const themeTokenKeys = new Set(THEME_TOKEN_KEYS);
const safeThemeValue = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const socialLinkKeys = new Set([
  "facebook", "instagram", "linkedin", "tiktok", "whatsapp", "x", "youtube",
]);

const publicSettingKeys = new Set([
  "currency",
  "adminModules",
  "direction",
  "faviconUrl",
  "language",
  "locale",
  "logoUrl",
  "socialLinks",
  "supportEmail",
  "supportPhone",
  "theme",
  // SEO Site Settings — surfaced to storefront for <head> meta tags
  "siteTitle",
  "metaDescription",
  "metaKeywords",
  // Technical SEO — crawler indexing policy (robots meta + robots.txt)
  "robotsIndexing",
  // Phase H / L — storefront may read coupon-box visibility (no coupon engine in H)
  "showCouponBoxAtCheckout",
]);

/** Admin-only settings — never leaked via resolve-storefront. */
const adminSettingKeys = new Set([
  "lowStockThreshold",
  "costPriceEnabled",
  "productConditionEnabled",
  "showCouponBoxAtCheckout",
  "ebPointsEnabled",
]);

const privateContextKeys = new Set([
  "accesstoken",
  "apikey",
  "company_id",
  "companyid",
  "databasepassword",
  "databaseurl",
  "memberships",
  "password",
  "permissions",
  "privatekey",
  "refreshtoken",
  "secret",
  "servicekey",
  "service_role_key",
  "servicerolekey",
  "tenant_id",
  "tenantid",
  "token",
  "users",
]);

export const defaultCompany = Object.freeze({
  id: DEFAULT_COMPANY_ID,
  slug: DEFAULT_COMPANY_ID,
  name: "EB Chemical",
  status: "active",
  isDefault: true,
  domain: DEFAULT_COMPANY_DOMAIN,
  publicSettings: Object.freeze({}),
});

export function normalizeCompanyId(companyId) {
  return typeof companyId === "string" && companyId.trim()
    ? companyId.trim()
    : DEFAULT_COMPANY_ID;
}

export function normalizeCompanySlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export function isSafeCompanySlug(value) {
  const input = String(value || "").trim();
  return input === input.toLowerCase() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input);
}

export function normalizeCompanyHost(value) {
  const firstValue = Array.isArray(value) ? value[0] : String(value || "").split(",")[0];
  const input = String(firstValue || "").trim().slice(0, 2048);
  if (!input) return "";

  let hostname = "";
  try {
    const url = new URL(input.includes("://") ? input : `http://${input}`);
    hostname = url.hostname;
  } catch {
    hostname = input
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .split(/[/?#]/, 1)[0]
      .replace(/^\[|\]$/g, "")
      .replace(/:\d+$/, "");
  }

  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export function normalizeCompanyStorefrontUrl(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeCompanyStorefrontPath(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 2048) return "";
  const path = value.trim();
  if (!/^\/(?!\/)(?:[A-Za-z0-9._~-]+\/?)*$/.test(path)) return "";
  if (path.split("/").some((segment) => segment === "." || segment === "..")) return "";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function normalizedRequestPath(value) {
  const input = String(value || "/").trim();
  try {
    const path = new URL(input, "https://storefront.invalid").pathname;
    return path.length > 1 ? path.replace(/\/+$/, "") : "/";
  } catch {
    return "";
  }
}

function pathMatchesStorefront(requestPath, storefrontPath) {
  return requestPath === storefrontPath || requestPath.startsWith(`${storefrontPath}/`);
}

export function isSharedStorefrontHost(companies = [], host) {
  const requestHost = normalizeCompanyHost(host);
  if (!requestHost) return false;
  return (Array.isArray(companies) ? companies : []).some((company) => {
    if (company?.status !== "active") return false;
    const storefrontUrl = normalizeCompanyStorefrontUrl(
      company.storefrontUrl ?? company.settings?.storefrontUrl,
    );
    return storefrontUrl && normalizeCompanyHost(new URL(storefrontUrl).hostname) === requestHost;
  });
}

export function hasResolvableStorefront(company) {
  if (!company || company.status !== "active") return false;
  const domains = selectPreferredCompanyDomains([
    ...(Array.isArray(company.domains) ? company.domains : []),
    company.domain,
  ]);
  if (domains.length) return true;

  const storefrontUrl = normalizeCompanyStorefrontUrl(
    company.storefrontUrl ?? company.settings?.storefrontUrl,
  );
  const storefrontPath = normalizeCompanyStorefrontPath(
    company.storefrontPath ?? company.settings?.storefrontPath,
  );
  if (!storefrontUrl || !storefrontPath) return false;
  const url = new URL(storefrontUrl);
  return resolveStorefrontCompany([company], {
    host: url.hostname,
    path: storefrontPath,
  })?.id === company.id;
}

export function resolveStorefrontCompany(companies = [], { host, path = "/" } = {}) {
  const requestHost = normalizeCompanyHost(host);
  const requestPath = normalizedRequestPath(path);
  if (!requestHost || !requestPath) return null;

  const activeCompanies = (Array.isArray(companies) ? companies : [])
    .filter((company) => company?.status === "active");

  const dedicatedMatch = activeCompanies.find((company) => {
    const domains = selectPreferredCompanyDomains([
      ...(Array.isArray(company.domains) ? company.domains : []),
      company.domain,
    ]);
    return domains.some((entry) => normalizeCompanyHost(entry.domain) === requestHost);
  });
  if (dedicatedMatch) return dedicatedMatch;

  const sharedMatches = activeCompanies
    .map((company) => {
      const storefrontUrl = normalizeCompanyStorefrontUrl(
        company.storefrontUrl ?? company.settings?.storefrontUrl,
      );
      const storefrontPath = normalizeCompanyStorefrontPath(
        company.storefrontPath ?? company.settings?.storefrontPath,
      );
      if (!storefrontUrl || !storefrontPath) return null;
      const url = new URL(storefrontUrl);
      const configuredUrlPath = normalizedRequestPath(url.pathname);
      const storefrontSlug = storefrontPath.split("/").filter(Boolean)[0] || "";
      if (
        normalizeCompanyHost(url.hostname) !== requestHost
        || configuredUrlPath !== storefrontPath
        || storefrontSlug !== company.slug
        || !pathMatchesStorefront(requestPath, storefrontPath)
      ) {
        return null;
      }
      return { company, storefrontPath };
    })
    .filter(Boolean)
    .sort((left, right) => right.storefrontPath.length - left.storefrontPath.length);

  return sharedMatches[0]?.company || null;
}

export function isProductSettingsModuleEnabled(company) {
  const configured = company?.settings?.adminModules?.product_settings;
  if (typeof configured === "boolean") return configured;
  return normalizeCompanyId(company?.id) === DEFAULT_COMPANY_ID;
}

function normalizeDisplayDomain(value) {
  const firstValue = Array.isArray(value) ? value[0] : String(value || "").split(",")[0];
  const input = String(firstValue || "").trim().slice(0, 2048);
  if (!input) return "";

  try {
    return new URL(input.includes("://") ? input : `http://${input}`).hostname
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return input
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .split(/[/?#]/, 1)[0]
      .replace(/:\d+$/, "")
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");
  }
}

function domainPreference(entry) {
  const domain = normalizeDisplayDomain(typeof entry === "string" ? entry : entry?.domain);
  let score = 20;
  if (domain === "ebchemi.com") score = 0;
  else if (domain === "www.ebchemi.com") score = 1;
  else if (domain.startsWith("www.")) score = 21;
  else if (domain.startsWith("api.")) score = 80;
  else if (domain.endsWith(".vercel.app")) score = 100;

  score *= 100;
  if (typeof entry === "object" && entry?.is_active === false) score += 100000;
  if (typeof entry === "object" && entry?.is_primary === true) score -= 2;
  return score;
}

export function selectPreferredCompanyDomains(entries = []) {
  const unique = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const domain = normalizeDisplayDomain(typeof entry === "string" ? entry : entry?.domain);
    if (!domain || unique.has(domain)) continue;
    unique.set(domain, typeof entry === "string" ? { domain } : { ...entry, domain });
  }
  return [...unique.values()].sort((a, b) => domainPreference(a) - domainPreference(b));
}

function clonePublicValue(value) {
  if (Array.isArray(value)) return value.map(clonePublicValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !privateContextKeys.has(key.toLowerCase()))
      .map(([key, entry]) => [key, clonePublicValue(entry)]),
  );
}

function publicSettingsFor(company) {
  const source = company?.settings || company?.publicSettings;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => publicSettingKeys.has(key))
      .map(([key, value]) => [key, sanitizePublicSetting(key, value)]),
  );
}

function adminSettingsFor(company) {
  const source = company?.settings || company?.publicSettings;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => adminSettingKeys.has(key))
      .map(([key, value]) => [key, sanitizePublicSetting(key, value)]),
  );
}

function safePublicUrl(value, allowRelative = true) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return null;
  const normalized = value.trim();
  if (allowRelative && /^\/(?!\/)[^\s]*$/.test(normalized)) return normalized;
  try {
    const url = new URL(normalized);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sanitizePublicSetting(key, value) {
  if (key === "adminModules") {
    return Object.fromEntries(
      Object.entries(value && typeof value === "object" && !Array.isArray(value) ? value : {})
        .filter(([moduleKey, enabled]) => adminModuleKeys.has(moduleKey) && typeof enabled === "boolean"),
    );
  }
  if (key === "theme") {
    return Object.fromEntries(
      Object.entries(value && typeof value === "object" && !Array.isArray(value) ? value : {})
        .filter(([token, tokenValue]) =>
          themeTokenKeys.has(token)
          && typeof tokenValue === "string"
          && safeThemeValue.test(tokenValue.trim()),
        )
        .map(([token, tokenValue]) => [token, tokenValue.trim()]),
    );
  }
  if (key === "socialLinks") {
    return Object.fromEntries(
      Object.entries(value && typeof value === "object" && !Array.isArray(value) ? value : {})
        .filter(([socialKey]) => socialLinkKeys.has(socialKey))
        .map(([socialKey, url]) => [socialKey, safePublicUrl(url, false)])
        .filter(([, url]) => Boolean(url)),
    );
  }
  if (["logoUrl", "faviconUrl"].includes(key)) return safePublicUrl(value);
  if (key === "direction") return ["ltr", "rtl"].includes(value) ? value : null;
  if (key === "currency") return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;
  if (key === "language") {
    return typeof value === "string" && /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value) ? value : null;
  }
  if (key === "locale") {
    return typeof value === "string" && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value) ? value : null;
  }
  if (key === "supportEmail") {
    return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? value
      : null;
  }
  if (key === "supportPhone") {
    return typeof value === "string" && value.length <= 40 && /^[+\d][\d\s().-]*$/.test(value)
      ? value
      : null;
  }
  if (key === "lowStockThreshold") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
  }
  if (["costPriceEnabled", "productConditionEnabled", "showCouponBoxAtCheckout", "ebPointsEnabled"].includes(key)) {
    return value === true;
  }
  if (["siteTitle", "metaDescription", "metaKeywords"].includes(key)) {
    return typeof value === "string" ? value.trim() : (value === null ? null : "");
  }
  if (key === "robotsIndexing") {
    return ["index,follow", "noindex,nofollow"].includes(value) ? value : null;
  }
  return clonePublicValue(value);
}

function brandingSettingsWithDefaults(settings) {
  return {
    ...settings,
    language: settings.language ?? null,
    locale: settings.locale ?? null,
    direction: settings.direction ?? null,
    currency: settings.currency ?? null,
    logoUrl: settings.logoUrl ?? null,
    theme: Object.fromEntries(THEME_TOKEN_KEYS.map((key) => [key, settings.theme?.[key] ?? null])),
    adminModules: settings.adminModules || {},
    siteTitle: settings.siteTitle ?? null,
    metaDescription: settings.metaDescription ?? null,
    metaKeywords: settings.metaKeywords ?? null,
    robotsIndexing: settings.robotsIndexing === "noindex,nofollow" ? "noindex,nofollow" : "index,follow",
    lowStockThreshold: Number.isInteger(settings.lowStockThreshold) ? settings.lowStockThreshold : 5,
    costPriceEnabled: settings.costPriceEnabled === true,
    productConditionEnabled: settings.productConditionEnabled === true,
    showCouponBoxAtCheckout: settings.showCouponBoxAtCheckout === true,
  };
}

export function createPublicCompanyContext(company = defaultCompany, options = {}) {
  const source = company && typeof company === "object" ? company : defaultCompany;
  const requestHost = normalizeCompanyHost(options.host);
  const isDefault = source.id === DEFAULT_COMPANY_ID || source.isDefault === true;
  let settings = publicSettingsFor(source);
  if (options.includeAdminSettings) {
    settings = { ...settings, ...adminSettingsFor(source) };
  }
  return {
    id: String(source.id || (isDefault ? DEFAULT_COMPANY_ID : "")),
    slug: String(source.slug || (isDefault ? DEFAULT_COMPANY_ID : "")),
    name: String(source.name || (isDefault ? defaultCompany.name : "")),
    status: String(source.status || defaultCompany.status),
    isDefault,
    domain: requestHost || normalizeCompanyHost(source.domain) || (isDefault ? DEFAULT_COMPANY_DOMAIN : null),
    settings: options.includeBrandingDefaults ? brandingSettingsWithDefaults(settings) : settings,
  };
}

export function createPlatformCompanySummary(company = defaultCompany) {
  const source = company && typeof company === "object" ? company : defaultCompany;
  const context = createPublicCompanyContext(source);
  const preferredDomains = selectPreferredCompanyDomains([
    ...(Array.isArray(source.domains) ? source.domains : []),
    source.domain,
  ]);
  const storefrontUrl = normalizeCompanyStorefrontUrl(
    source.storefrontUrl ?? source.settings?.storefrontUrl,
  );
  const storefrontPath = normalizeCompanyStorefrontPath(
    source.storefrontPath ?? source.settings?.storefrontPath,
  );
  return {
    ...context,
    isDefault: source.id === DEFAULT_COMPANY_ID || source.isDefault === true,
    domain: preferredDomains[0]?.domain || normalizeCompanyHost(source.domain),
    domains: preferredDomains.map((entry) => entry.domain),
    storefrontUrl,
    storefrontPath,
    settings: publicSettingsFor(source),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };
}

export function sanitizePublicCompanySettings(settings) {
  return publicSettingsFor({ settings });
}

export function companyStorageSegment(companyId) {
  const normalized = normalizeCompanyId(companyId).toLowerCase();
  const segment = normalized
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return segment || DEFAULT_COMPANY_ID;
}

export function companyStoragePath(companyId, ...parts) {
  return [companyStorageSegment(companyId), ...parts.filter(Boolean)].join("/");
}
