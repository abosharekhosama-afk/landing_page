const adminPreviewSuffix = ".admin-preview.webp";

/**
 * Pure helpers for admin-preview sibling URLs. Kept free of asset imports so
 * Node tests can import this module directly.
 */

/**
 * Derives the admin-preview sibling path from a main asset URL:
 * `/uploads/co/foo.jpg` → `/uploads/co/foo.admin-preview.webp`.
 * Already-preview URLs pass through unchanged.
 */
export function adminPreviewUrlFor(value) {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source) return "";
  if (source.endsWith(adminPreviewSuffix)) return source;
  const pathname = source.startsWith("http")
    ? (() => {
        try {
          return new URL(source).pathname;
        } catch {
          return source;
        }
      })()
    : source;
  const extIndex = pathname.lastIndexOf(".");
  const stem = extIndex > 0 ? pathname.slice(0, extIndex) : pathname;
  return `${stem}${adminPreviewSuffix}`;
}

/**
 * True when the value points at a platform `/uploads/` asset (relative path or
 * absolute URL whose pathname starts with `/uploads/`). Only these assets get
 * an admin-preview sibling; external/CDN URLs fall back to the main URL.
 */
export function isUploadsAssetUrl(value) {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source) return false;
  const pathname = source.startsWith("http")
    ? (() => {
        try {
          return new URL(source).pathname;
        } catch {
          return source;
        }
      })()
    : source;
  return pathname.startsWith("/uploads/");
}