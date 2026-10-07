import {
  normalizeCompanyStorefrontUrl,
  selectPreferredCompanyDomains,
} from "../tenancy/company.js";

export const SEO_ROBOTS_INDEX = "index,follow";
export const SEO_ROBOTS_NOINDEX = "noindex,nofollow";
export const SEO_ROBOTS_VALUES = Object.freeze([SEO_ROBOTS_INDEX, SEO_ROBOTS_NOINDEX]);

/**
 * Real public storefront page routes for the tenant storefront SPA.
 * These mirror the marketing/content pages actually routed by the storefront
 * app (cpanel/src/App.jsx pagePaths). Utility/admin pages (login, cart,
 * checkout, account, admin, employee) are intentionally excluded from the
 * sitemap because they are not indexable storefront content.
 */
export const STOREFRONT_PUBLIC_PATHS = Object.freeze([
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

export function isSeoRobotsValue(value) {
  return SEO_ROBOTS_VALUES.includes(value);
}

export function normalizeSeoRobotsValue(value, fallback = SEO_ROBOTS_INDEX) {
  return isSeoRobotsValue(value) ? value : fallback;
}

/**
 * Real HTTPS storefront base URL for a tenant.
 * Prefers an explicit storefrontUrl, then the preferred verified domain,
 * then the connected website storefront base URL. Empty when the tenant has
 * no real storefront URL — in that case no canonical or sitemap is generated.
 */
export function storefrontSiteUrl(company, connection = null) {
  if (!company || typeof company !== "object") return "";
  const storefrontUrl = normalizeCompanyStorefrontUrl(
    company.storefrontUrl ?? company.settings?.storefrontUrl,
  );
  if (storefrontUrl) return storefrontUrl.replace(/\/+$/, "");
  const domains = selectPreferredCompanyDomains([
    ...(Array.isArray(company.domains) ? company.domains : []),
    company.domain,
  ]);
  if (domains[0]?.domain) return `https://${domains[0].domain}`;
  const connected = normalizeCompanyStorefrontUrl(connection?.storefrontBaseUrl);
  if (connected) return connected.replace(/\/+$/, "");
  return "";
}

export function storefrontPageUrl(siteUrl, pathValue = "/") {
  const base = String(siteUrl || "").replace(/\/+$/, "");
  if (!base) return "";
  const path = String(pathValue || "/").trim();
  const normalizedPath = path.length > 1
    ? path.replace(/^\/+/, "").replace(/\/+$/, "")
    : "";
  return normalizedPath ? `${base}/${normalizedPath}` : `${base}/`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Tenant-specific robots.txt.
 * The Sitemap directive is only emitted when a real storefront site URL and a
 * crawlable index policy are both available, so no invented URLs are exposed.
 */
export function buildRobotsTxt({ siteUrl = "", robotsIndexing = SEO_ROBOTS_INDEX } = {}) {
  const noindex = normalizeSeoRobotsValue(robotsIndexing) === SEO_ROBOTS_NOINDEX;
  const lines = ["User-agent: *", noindex ? "Disallow: /" : "Allow: /"];
  if (!noindex && siteUrl) {
    lines.push("", `Sitemap: ${escapeXml(`${siteUrl}/api/storefront/sitemap.xml`)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function buildSitemapXml(urls = [], lastmod = null) {
  const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  const entries = [...new Set(urls.filter(Boolean))]
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmodTag}\n  </url>`)
    .join("\n");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + `${entries}\n`
    + `</urlset>\n`;
}