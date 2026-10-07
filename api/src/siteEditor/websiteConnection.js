import { SiteEditorValidationError } from "./schema.js";
import { MANIFEST_SCHEMA_VERSION, MANIFEST_CONTENT_TYPE, validateSiteManifest } from "./siteManifest.js";
import { parseSafeConnectionUrl } from "./urlPolicy.js";

export const CONNECTION_STATUSES = Object.freeze([
  "not-configured",
  "connected",
  "error",
]);

function connectionError(message, code = "CONNECTION_ERROR", statusCode = 400) {
  return new SiteEditorValidationError(message, statusCode, code);
}

export function websiteConnectionSettings(company) {
  if (!company || typeof company !== "object") return null;
  return company.settings?.websiteConnection && typeof company.settings.websiteConnection === "object"
    ? company.settings.websiteConnection
    : null;
}

export function websiteConnectionDefaults(company) {
  const id = String(company?.id || "");
  return {
    storefrontBaseUrl: "",
    siteManifestUrl: "",
    siteId: id ? `${id}-storefront` : "",
    routePrefix: "",
    defaultLocale: "en",
    supportedLocales: ["en"],
    connectionStatus: "not-configured",
    lastManifestSyncAt: null,
    manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
    connectionError: "",
  };
}

export function normalizeWebsiteConnectionPatch(patch = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw connectionError("Website connection settings must be an object.");
  }
  const allowed = new Set([
    "storefrontBaseUrl",
    "siteManifestUrl",
    "siteId",
    "routePrefix",
    "defaultLocale",
    "supportedLocales",
  ]);
  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) throw connectionError(`Unknown website connection field: ${key}.`, "CONNECTION_FIELD_UNSUPPORTED");
  }
  const normalized = {};
  if (Object.hasOwn(patch, "storefrontBaseUrl")) {
    normalized.storefrontBaseUrl = validateConnectionUrl(patch.storefrontBaseUrl, "storefrontBaseUrl", { allowEmpty: true });
  }
  if (Object.hasOwn(patch, "siteManifestUrl")) {
    normalized.siteManifestUrl = validateConnectionUrl(patch.siteManifestUrl, "siteManifestUrl", { allowEmpty: true });
  }
  if (Object.hasOwn(patch, "siteId")) {
    const siteId = String(patch.siteId ?? "").trim();
    if (!/^[a-z0-9][a-z0-9:_-]{0,159}$/i.test(siteId)) {
      throw connectionError("siteId is invalid.", "CONNECTION_FIELD_UNSUPPORTED");
    }
    normalized.siteId = siteId;
  }
  if (Object.hasOwn(patch, "routePrefix")) {
    const routePrefix = String(patch.routePrefix ?? "").trim();
    if (routePrefix && !/^\/(?!\/)(?:[A-Za-z0-9._~-]+\/?)*$/.test(routePrefix)) {
      throw connectionError("routePrefix is invalid.", "CONNECTION_FIELD_UNSUPPORTED");
    }
    normalized.routePrefix = routePrefix.length > 1 ? routePrefix.replace(/\/+$/, "") : routePrefix;
  }
  if (Object.hasOwn(patch, "defaultLocale")) {
    const locale = String(patch.defaultLocale ?? "").trim();
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) {
      throw connectionError("defaultLocale is invalid.", "CONNECTION_FIELD_UNSUPPORTED");
    }
    normalized.defaultLocale = locale;
  }
  if (Object.hasOwn(patch, "supportedLocales")) {
    if (!Array.isArray(patch.supportedLocales) || !patch.supportedLocales.length) {
      throw connectionError("supportedLocales must be a non-empty array.", "CONNECTION_FIELD_UNSUPPORTED");
    }
    const locales = [...new Set(patch.supportedLocales.map((entry) => String(entry).trim()))];
    if (locales.some((locale) => !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale))) {
      throw connectionError("supportedLocales contains an invalid locale.", "CONNECTION_FIELD_UNSUPPORTED");
    }
    normalized.supportedLocales = locales.slice(0, 20);
  }
  return normalized;
}

export function validateConnectionUrl(value, field, { allowEmpty = true } = {}) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return allowEmpty ? "" : (() => { throw connectionError(`${field} is required.`); })();
  if (candidate.length > 2048) throw connectionError(`${field} is too long.`);
  const url = parseSafeConnectionUrl(candidate);
  if (!url) throw connectionError(`${field} must be a valid HTTPS URL.`);
  const normalized = url.toString();
  return normalized.endsWith("/") && url.pathname === "/" ? normalized.slice(0, -1) : normalized;
}

export async function fetchSiteManifest(url, { timeoutMs = 8000, headers = {} } = {}) {
  const manifestUrl = validateConnectionUrl(url, "siteManifestUrl");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetch(manifestUrl, {
        headers: {
          Accept: `${MANIFEST_CONTENT_TYPE}, application/json`,
          ...headers,
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (fetchError) {
      const timedOut = fetchError?.name === "AbortError";
      throw connectionError(
        timedOut ? "The site manifest fetch timed out." : "The site manifest could not be reached.",
        "MANIFEST_FETCH_FAILED",
        502,
      );
    }
    if (!response.ok) {
      throw connectionError(
        `The site manifest endpoint returned HTTP ${response.status}.`,
        "MANIFEST_FETCH_FAILED",
        response.status,
      );
    }
    let raw;
    try {
      raw = await response.json();
    } catch {
      throw connectionError("The site manifest endpoint did not return valid JSON.", "MANIFEST_INVALID_JSON");
    }
    return validateSiteManifest(raw);
  } finally {
    clearTimeout(timer);
  }
}

export function assertManifestMatchesCompany(manifest, company) {
  if (!company || !company.id) {
    throw connectionError("A trusted company is required to verify the manifest.", "CONNECTION_IDENTITY_MISMATCH", 403);
  }
  if (manifest.companyId && String(manifest.companyId) !== String(company.id)) {
    throw connectionError(
      `The site manifest belongs to company "${manifest.companyId}", not "${company.id}".`,
      "CONNECTION_IDENTITY_MISMATCH",
      403,
    );
  }
  const connection = websiteConnectionSettings(company) || websiteConnectionDefaults(company);
  if (connection?.siteId && manifest.siteId && String(manifest.siteId) !== String(connection.siteId)) {
    throw connectionError(
      `The site manifest siteId "${manifest.siteId}" does not match the configured site "${connection.siteId}".`,
      "CONNECTION_IDENTITY_MISMATCH",
      403,
    );
  }
  return true;
}

export function connectionSummary(company) {
  const connection = websiteConnectionSettings(company) || websiteConnectionDefaults(company);
  return {
    storefrontBaseUrl: connection.storefrontBaseUrl || "",
    siteManifestUrl: connection.siteManifestUrl || "",
    siteId: connection.siteId || "",
    routePrefix: connection.routePrefix || "",
    defaultLocale: connection.defaultLocale || "en",
    supportedLocales: Array.isArray(connection.supportedLocales) && connection.supportedLocales.length
      ? connection.supportedLocales
      : ["en"],
    connectionStatus: CONNECTION_STATUSES.includes(connection.connectionStatus)
      ? connection.connectionStatus
      : "error",
    lastManifestSyncAt: connection.lastManifestSyncAt || null,
    manifestSchemaVersion: connection.manifestSchemaVersion || MANIFEST_SCHEMA_VERSION,
    connectionError: connection.connectionError || "",
    hasManifest: Boolean(connection.lastManifest),
  };
}
