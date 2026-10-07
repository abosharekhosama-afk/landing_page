import { apiBaseUrl } from "./api.js";

// Single source of truth for the public storefront tenant context.
// Prefers VITE_STOREFRONT_COMPANY_ID / VITE_STOREFRONT_SITE_ID and never reads
// CPanel localStorage: a public visitor (or Incognito) may have no
// cpanelActiveCompany, and a stale CPanel value must not hijack the storefront
// tenant. An explicit envOverride exists only so node --test can inject env.
function readStorefrontEnv(envOverride) {
  if (envOverride && typeof envOverride === "object") return envOverride;
  const metaEnv = import.meta.env;
  if (metaEnv && typeof metaEnv === "object") return metaEnv;
  if (typeof process !== "undefined" && process.env && typeof process.env === "object") {
    return process.env;
  }
  return {};
}

export function resolveStorefrontTenant(envOverride) {
  const env = readStorefrontEnv(envOverride);
  const companyId = String(env.VITE_STOREFRONT_COMPANY_ID ?? "").trim().toLowerCase();
  const siteId = String(env.VITE_STOREFRONT_SITE_ID ?? "").trim();
  return { companyId: companyId || "", siteId: siteId || "" };
}

export function storefrontTenantHeaders(envOverride) {
  const { companyId, siteId } = resolveStorefrontTenant(envOverride);
  const headers = {};
  if (companyId) headers["x-company-id"] = companyId;
  if (siteId) headers["x-site-id"] = siteId;
  return headers;
}

export async function fetchPublicStorefrontContent({ page = "/", locale = "en" } = {}) {
  const url = new URL(`${apiBaseUrl}/storefront/content`);
  url.searchParams.set("page", page);
  url.searchParams.set("locale", locale);
  const headers = { Accept: "application/json", ...storefrontTenantHeaders() };
  const response = await fetch(url, { headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Unable to load storefront content.");
  return data;
}

export async function trackSplashAd(id, type, page = "/") {
  if (!id) return;
  const url = new URL(`${apiBaseUrl}/storefront/splash-ads/${encodeURIComponent(id)}/${type}`);
  url.searchParams.set("page", page);
  const headers = { "Content-Type": "application/json", ...storefrontTenantHeaders() };
  await fetch(url, { method: "POST", headers, body: "{}", keepalive: true }).catch(() => {});
}
