import { apiBaseUrl } from "./api.js";
import { storefrontTenantHeaders } from "./storefrontContentApi.js";

const sessionKeyStorageKey = "epStorefrontAnalyticsSessionKey";

let memorySessionKey = "";

function createSessionKey() {
  try {
    return globalThis.crypto?.randomUUID?.() || "";
  } catch {
    return "";
  }
}

/**
 * Opaque client-generated session identifier for storefront funnel events.
 * It carries no personal data; when the browser cannot generate one, tracking
 * is skipped instead of fabricating a value.
 */
export function getStorefrontSessionKey() {
  if (typeof localStorage !== "undefined") {
    try {
      const existing = localStorage.getItem(sessionKeyStorageKey);
      if (existing) return existing;
      const generated = createSessionKey();
      if (generated) localStorage.setItem(sessionKeyStorageKey, generated);
      return generated;
    } catch {
      // Storage can be unavailable (private mode); fall through to memory.
    }
  }
  if (!memorySessionKey) memorySessionKey = createSessionKey();
  return memorySessionKey;
}

export const FUNNEL_CLIENT_EVENT_TYPES = Object.freeze([
  "add_to_cart",
  "remove_from_cart",
  "initiate_checkout",
]);

/** Standard campaign URL parameters captured on storefront entry. */
export const ATTRIBUTION_CLIENT_FIELDS = Object.freeze([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const attributionStorageKey = "epStorefrontAttribution";
const attributionValueLimit = 200;

let memoryAttribution = null;

function referrerHostname() {
  const raw = typeof document !== "undefined" ? String(document.referrer || "") : "";
  if (!raw) return "";
  try {
    return String(new URL(raw).hostname || "")
      .toLowerCase()
      .slice(0, 300);
  } catch {
    return "";
  }
}

function captureFromLocation() {
  if (typeof window === "undefined" || !window.location) return {};
  let params;
  try {
    params = new URLSearchParams(String(window.location.search || ""));
  } catch {
    return {};
  }
  const captured = {};
  for (const field of ATTRIBUTION_CLIENT_FIELDS) {
    const value = String(params.get(field) || "")
      .trim()
      .slice(0, attributionValueLimit);
    if (value) captured[field] = value;
  }
  const host = referrerHostname();
  if (host) captured.referrer = host;
  return captured;
}

function readStoredAttribution() {
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(attributionStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      }
    } catch {
      // Storage unavailable (private mode) or corrupt value: fall through.
    }
  }
  return memoryAttribution || {};
}

function writeStoredAttribution(attribution) {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(attributionStorageKey, JSON.stringify(attribution));
      return;
    } catch {
      // Fall through to memory when storage is unavailable.
    }
  }
  memoryAttribution = attribution;
}

/**
 * First-touch campaign attribution for this browser: values captured on entry
 * win, later UTM parameters only fill fields that were still empty. Carries no
 * personal data — campaign labels and the referrer hostname only.
 */
export function getStorefrontAttribution() {
  const stored = readStoredAttribution();
  const merged = { ...captureFromLocation(), ...stored };
  if (JSON.stringify(merged) !== JSON.stringify(stored)) writeStoredAttribution(merged);
  return merged;
}

/**
 * Fire-and-forget ingestion of a storefront funnel event through the existing
 * public analytics endpoint. `purchase` is intentionally not accepted here:
 * the order API records it only after a successful order creation.
 */
export function trackStorefrontEvent(eventType, { path = "", productId = "" } = {}) {
  if (!eventType || eventType === "purchase") return null;
  if (!FUNNEL_CLIENT_EVENT_TYPES.includes(eventType)) return null;
  if (typeof fetch !== "function") return null;

  const sessionKey = getStorefrontSessionKey();
  if (!sessionKey) return null;

  const currentPath = typeof window !== "undefined" ? String(window.location?.pathname || "") : "";
  const resolvedPath = String(path || currentPath || "");

  return fetch(`${apiBaseUrl}/storefront/analytics/visitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...storefrontTenantHeaders() },
    body: JSON.stringify({
      sessionKey,
      eventType,
      path: resolvedPath,
      productId: String(productId || ""),
      attribution: getStorefrontAttribution(),
    }),
    keepalive: true,
  }).catch(() => {});
}
