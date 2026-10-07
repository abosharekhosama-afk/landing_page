import { resolveApiAssetUrl } from "./api.js";

const companyStorageKey = "cpanelActiveCompany";
const tenantCachePrefixes = [
  "ebAdmin",
  "cpanelTenant:",
  "websiteMedia",
  "website_media",
  "epWebsiteMedia",
  "epChemicalWebsiteMedia",
];

function safeUrl(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\/(?!\/)/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function realHttpUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.length > 2048) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function sanitizeCompanyContext(company) {
  if (!company || typeof company !== "object") return null;
  const settings = company.settings && typeof company.settings === "object"
    ? company.settings
    : {};
  const id = String(company.id || "").trim().toLowerCase();
  const slug = String(company.slug || "").trim().toLowerCase();
  if (!id || !slug) return null;

  const modules = Array.isArray(company.modules)
    ? company.modules.filter((module) => module && typeof module === "object" && module.enabled !== false).map((module) => ({
      module_key: String(module.module_key || ""),
      group_key: String(module.group_key || ""),
      label_en: String(module.label_en || ""),
      label_ar: String(module.label_ar || ""),
      description_en: String(module.description_en || ""),
      description_ar: String(module.description_ar || ""),
      icon_key: String(module.icon_key || ""),
      route: String(module.route || ""),
      sort_order: Number(module.sort_order || 0),
      enabled: true,
      configuration: module.configuration && typeof module.configuration === "object"
        ? module.configuration
        : {},
    })).filter((module) => module.module_key && module.route)
    : [];

  return {
    id,
    slug,
    name: String(company.name || slug).trim(),
    isDefault: company.isDefault === true,
    logoUrl: resolveApiAssetUrl(safeUrl(company.logoUrl ?? settings.logoUrl)),
    faviconUrl: resolveApiAssetUrl(safeUrl(company.faviconUrl ?? settings.faviconUrl)),
    storefrontUrl: safeUrl(company.storefrontUrl ?? settings.storefrontUrl),
    storefrontPath: String(company.storefrontPath ?? settings.storefrontPath ?? ""),
    modules,
    settings: {
      currency: typeof settings.currency === "string" ? settings.currency : null,
      direction: ["ltr", "rtl"].includes(settings.direction) ? settings.direction : null,
      language: typeof settings.language === "string" ? settings.language : null,
      locale: typeof settings.locale === "string" ? settings.locale : null,
      theme: settings.theme && typeof settings.theme === "object" ? settings.theme : {},
      // Phase H — product merchandising (admin context)
      lowStockThreshold: Number.isInteger(settings.lowStockThreshold)
        ? settings.lowStockThreshold
        : (Number.isInteger(Number(settings.lowStockThreshold)) ? Number(settings.lowStockThreshold) : 5),
      costPriceEnabled: settings.costPriceEnabled === true,
      productConditionEnabled: settings.productConditionEnabled === true,
      showCouponBoxAtCheckout: settings.showCouponBoxAtCheckout === true,
      ...(typeof settings.ebPointsEnabled === "boolean"
        ? { ebPointsEnabled: settings.ebPointsEnabled }
        : {}),
      // SEO Site Settings
      siteTitle: typeof settings.siteTitle === "string" ? settings.siteTitle : null,
      metaDescription: typeof settings.metaDescription === "string" ? settings.metaDescription : null,
      metaKeywords: typeof settings.metaKeywords === "string" ? settings.metaKeywords : null,
      // Technical SEO — crawler indexing policy (robots meta + robots.txt)
      robotsIndexing: ["index,follow", "noindex,nofollow"].includes(settings.robotsIndexing)
        ? settings.robotsIndexing
        : "index,follow",
      // Landing Page Platform — feature flags (Phase 0 lock; default off).
      // Preserved so CPanel can gate My Sites branding via the same flag
      // system the API uses (company settings are the browser-side SoT).
      landingPlatformFlags:
        settings.landingPlatformFlags
        && typeof settings.landingPlatformFlags === "object"
        && !Array.isArray(settings.landingPlatformFlags)
          ? settings.landingPlatformFlags
          : {},
    },
  };
}

export function getStoredCompanyContext() {
  try {
    return sanitizeCompanyContext(JSON.parse(localStorage.getItem(companyStorageKey) || "null"));
  } catch {
    return null;
  }
}

export function setStoredCompanyContext(company) {
  const safeCompany = sanitizeCompanyContext(company);
  if (safeCompany) {
    localStorage.setItem(companyStorageKey, JSON.stringify(safeCompany));
  } else {
    localStorage.removeItem(companyStorageKey);
  }
  return safeCompany;
}

export function clearTenantCaches() {
  if (typeof localStorage === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (tenantCachePrefixes.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
  if (typeof sessionStorage !== "undefined") {
    for (const key of Object.keys(sessionStorage)) {
      if (tenantCachePrefixes.some((prefix) => key.startsWith(prefix))) {
        sessionStorage.removeItem(key);
      }
    }
  }
}

export function tenantStorageKey(companyId, key) {
  const safeCompanyId = String(companyId || "").trim().toLowerCase();
  return safeCompanyId ? `cpanelTenant:${safeCompanyId}:${key}` : "";
}

export function applyCompanyDocumentBranding(company) {
  if (typeof document === "undefined") return;
  const safeCompany = sanitizeCompanyContext(company);
  document.title = safeCompany?.name
    ? `${safeCompany.name} CPanel`
    : "Company CPanel";
  const description = safeCompany?.name
    ? `${safeCompany.name} administration portal.`
    : "Company administration portal.";
  let descriptionMeta = document.querySelector('meta[name="description"]');
  if (!descriptionMeta) {
    descriptionMeta = document.createElement("meta");
    descriptionMeta.name = "description";
    document.head.appendChild(descriptionMeta);
  }
  descriptionMeta.content = description;

  let favicon = document.querySelector('link[data-cpanel-favicon="true"]');
  if (!safeCompany?.faviconUrl) {
    favicon?.remove();
    return;
  }
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.dataset.cpanelFavicon = "true";
    document.head.appendChild(favicon);
  }
  favicon.href = safeCompany.faviconUrl;
}

const CPANEL_TITLE_RE = /cpanel/i;
const CPANEL_DESCRIPTION_RE = /administration portal/i;

function storefrontFallbackTitle() {
  if (typeof window !== "undefined") {
    const host = String(window.location?.hostname || "").trim();
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  }
  return "Storefront";
}

const storefrontCanonicalPaths = new Set([
  "/",
  "/products",
  "/about",
  "/sustainability",
  "/how-it-works",
  "/cleanups",
  "/eb-points",
  "/follow-us",
  "/business-information",
]);
const storefrontPolicyPath = /^\/policies\/[^/]+$/;

function isRealStorefrontPath(pathname) {
  return storefrontCanonicalPaths.has(pathname) || storefrontPolicyPath.test(pathname);
}

function upsertMeta(propertyOrName, attribute, value) {
  const selector = attribute === "property"
    ? `meta[property="${propertyOrName}"]`
    : `meta[name="${propertyOrName}"]`;
  let meta = document.querySelector(selector);
  if (value) {
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attribute, propertyOrName);
      document.head.appendChild(meta);
    }
    meta.content = value;
    return meta;
  }
  meta?.remove();
  return null;
}

export function applyStorefrontSeoMeta(siteContent) {
  if (typeof document === "undefined") return;
  const site = siteContent?.site;

  const title = String(site?.siteTitle || site?.name || "").trim();
  if (title) {
    document.title = title;
  } else if (CPANEL_TITLE_RE.test(document.title || "")) {
    document.title = storefrontFallbackTitle();
  }

  const description = String(site?.metaDescription || "").trim();
  let descriptionMeta = document.querySelector('meta[name="description"]');
  if (!descriptionMeta) {
    descriptionMeta = document.createElement("meta");
    descriptionMeta.name = "description";
    document.head.appendChild(descriptionMeta);
  }
  if (description) {
    descriptionMeta.content = description;
  } else if (CPANEL_DESCRIPTION_RE.test(descriptionMeta.content || "")) {
    descriptionMeta.content = "";
  }

  const resolvedTitle = title || document.title || "";
  const resolvedDescription = descriptionMeta.content || "";
  upsertMeta("og:title", "property", resolvedTitle);
  upsertMeta("og:description", "property", resolvedDescription);
  upsertMeta("og:type", "property", "website");

  const siteName = String(site?.name || "").trim();
  if (siteName) upsertMeta("og:site_name", "property", siteName);

  // Canonical + og:url are only emitted when a real storefront URL exists.
  const siteUrl = realHttpUrl(String(site?.siteUrl || ""));
  const pathname = typeof window !== "undefined" ? String(window.location.pathname || "") : "";
  let canonical = document.querySelector('link[rel="canonical"]');
  if (siteUrl && pathname && isRealStorefrontPath(pathname)) {
    const canonicalUrl = `${siteUrl.replace(/\/+$/, "")}${pathname === "/" ? "/" : pathname}`;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    upsertMeta("og:url", "property", canonicalUrl);
  } else {
    canonical?.remove();
    upsertMeta("og:url", "property", "");
  }

  // Open Graph default image — real logo only (absolute http/https URL).
  const ogImage = realHttpUrl(site?.logo ? resolveApiAssetUrl(site.logo) : "");
  if (ogImage) upsertMeta("og:image", "property", ogImage);
  else upsertMeta("og:image", "property", "");

  // Robots crawling policy (index/follow or noindex/nofollow).
  if (["index,follow", "noindex,nofollow"].includes(site?.robotsIndexing)) {
    upsertMeta("robots", "name", site.robotsIndexing);
  } else {
    upsertMeta("robots", "name", "");
  }

  const keywords = typeof site?.metaKeywords === "string" ? site.metaKeywords : "";
  let keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywords) {
    if (!keywordsMeta) {
      keywordsMeta = document.createElement("meta");
      keywordsMeta.name = "keywords";
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.content = keywords;
  } else if (keywordsMeta) {
    keywordsMeta.remove();
  }
}
