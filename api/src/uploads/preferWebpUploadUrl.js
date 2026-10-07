import fs from "node:fs";
import path from "node:path";

const UPLOADS_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const ADMIN_PREVIEW_SUFFIX = ".admin-preview.webp";
export const DISPLAY_WEBP_SUFFIX = ".display.webp";
const CACHE_LIMIT = 5000;

// Small in-memory positive/negative caches keyed by the resolved uploads dir +
// relative uploads path of the chosen WebP candidate. Positive = sibling exists
// on disk; negative = neither full `.webp` nor `.display.webp` exists. Bounded
// to avoid unbounded growth on a long-running API process.
const positiveCache = new Map();
const negativeCache = new Map();

function cacheSet(cache, key) {
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, true);
}

/**
 * Relative uploads path for a `/uploads/...` reference (absolute or relative),
 * or null when the value is not a platform uploads path.
 */
function uploadsRelativePath(value) {
  let pathname = String(value || "").trim();
  if (!pathname) return null;
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }
  const queryIndex = pathname.indexOf("?");
  if (queryIndex >= 0) pathname = pathname.slice(0, queryIndex);
  if (!pathname.startsWith("/uploads/")) return null;
  return pathname.slice("/uploads/".length);
}

/**
 * Replace the final extension with `suffix` (e.g. `.webp` or `.display.webp`),
 * preserving any absolute origin and query string.
 */
function withSuffix(value, suffix) {
  const queryIndex = value.indexOf("?");
  const query = queryIndex >= 0 ? value.slice(queryIndex) : "";
  const base = queryIndex >= 0 ? value.slice(0, queryIndex) : value;
  const extIndex = base.lastIndexOf(".");
  const stem = extIndex > 0 ? base.slice(0, extIndex) : base;
  return `${stem}${suffix}${query}`;
}

/**
 * Prefer an existing optimized WebP sibling for `/uploads/...` image URLs.
 *
 * Preference order (existence-checked on UPLOADS_DIR):
 *   1. Full same-stem `.webp` (original dimensions)
 *   2. Storefront `.display.webp` derivative (for assets that exceed the WebP
 *      dimension limit of 16383px and therefore cannot keep a full-size WebP)
 *
 * Only rewrites `/uploads/` paths ending in `.png|.jpg|.jpeg`
 * (case-insensitive). Missing siblings, non-uploads paths, external CDN URLs,
 * already-`.webp` URLs, `.admin-preview.webp`, and `.display.webp` inputs are
 * returned unchanged — never a broken image.
 *
 * `uploadsDir` defaults to `process.env.UPLOADS_DIR` when not injected.
 * `existsSync` defaults to `fs.existsSync` (tests inject a mock).
 */
export function preferWebpUploadUrl(url, { uploadsDir = null, existsSync = fs.existsSync } = {}) {
  const value = String(url || "").trim();
  if (!value) return "";

  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      pathname = new URL(value).pathname;
    } catch {
      return value;
    }
  }
  if (!pathname.startsWith("/uploads/")) return value;

  const queryIndex = pathname.indexOf("?");
  const cleanPath = queryIndex >= 0 ? pathname.slice(0, queryIndex) : pathname;
  const ext = cleanPath.slice(cleanPath.lastIndexOf(".")).toLowerCase();
  if (!UPLOADS_IMAGE_EXTENSIONS.has(ext)) return value;
  if (cleanPath.endsWith(ADMIN_PREVIEW_SUFFIX)) return value;
  if (cleanPath.endsWith(DISPLAY_WEBP_SUFFIX)) return value;

  const relative = uploadsRelativePath(value);
  if (!relative) return value;

  const resolvedUploadsDir = uploadsDir || (process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : null);
  if (!resolvedUploadsDir) return value;

  const extIndex = relative.lastIndexOf(".");
  const stem = extIndex > 0 ? relative.slice(0, extIndex) : relative;
  const fullRelative = `${stem}.webp`;
  const displayRelative = `${stem}${DISPLAY_WEBP_SUFFIX}`;
  const fullKey = `${resolvedUploadsDir}\u0000${fullRelative}`;
  const displayKey = `${resolvedUploadsDir}\u0000${displayRelative}`;
  const noneKey = `${resolvedUploadsDir}\u0000${stem}\u0000none`;

  if (positiveCache.has(fullKey)) return withSuffix(value, ".webp");
  if (positiveCache.has(displayKey)) return withSuffix(value, DISPLAY_WEBP_SUFFIX);
  if (negativeCache.has(noneKey)) return value;

  if (existsSync(path.join(resolvedUploadsDir, fullRelative))) {
    cacheSet(positiveCache, fullKey);
    return withSuffix(value, ".webp");
  }
  if (existsSync(path.join(resolvedUploadsDir, displayRelative))) {
    cacheSet(positiveCache, displayKey);
    return withSuffix(value, DISPLAY_WEBP_SUFFIX);
  }
  cacheSet(negativeCache, noneKey);
  return value;
}
