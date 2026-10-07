import productPlaceholderUrl from "../assets/product-placeholder.svg";
import { resolveApiAssetUrl } from "./api.js";
import { adminPreviewUrlFor, isUploadsAssetUrl } from "./adminPreviewUrl.js";

const legacyPlaceholderPattern = /\/images\/products\/product-placeholder/i;

export function resolveProductImageUrl(value) {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source || legacyPlaceholderPattern.test(source)) return productPlaceholderUrl;
  return resolveApiAssetUrl(source) || productPlaceholderUrl;
}

/**
 * Admin list thumbs: prefer the `*.admin-preview.webp` sibling derived from the
 * main URL. `/uploads/` assets resolve to the preview sibling or the lightweight
 * placeholder — NEVER the full-resolution main asset. External/CDN non-uploads
 * URLs pass through the main resolver unchanged.
 * Storefront / product cards / details MUST keep using main optimized URLs.
 */
export function resolveAdminPreviewUrl(value) {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source || legacyPlaceholderPattern.test(source)) return productPlaceholderUrl;
  if (isUploadsAssetUrl(source)) {
    const previewPath = adminPreviewUrlFor(source);
    return resolveApiAssetUrl(previewPath) || productPlaceholderUrl;
  }
  return resolveProductImageUrl(source);
}

export function useProductImagePlaceholder(event) {
  if (!event?.currentTarget || event.currentTarget.src === productPlaceholderUrl) return;
  event.currentTarget.onerror = null;
  event.currentTarget.src = productPlaceholderUrl;
}

export { productPlaceholderUrl };
