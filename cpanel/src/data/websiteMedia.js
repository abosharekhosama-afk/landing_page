/**
 * Website media helpers for CPanel.
 *
 * Shared admin Website Media does NOT seed storefront-specific defaults here.
 * Slot discovery is config/persisted-data driven via mediaSlots.js.
 *
 * Storefront preview pages may still pass their own page-local fallback URLs
 * into getWebsiteMediaImage(..., fallback). Those live next to those pages —
 * not as shared tenant defaults.
 *
 * API-side seed rows for the platform default company remain in
 * api/src/data/seeds/websiteMedia.js and are scoped to that company only.
 */

/** @deprecated Empty by design — do not reintroduce tenant storefront defaults. */
export const defaultWebsiteMedia = Object.freeze([]);

export function withWebsiteMediaVersion(imageUrl, version) {
  if (!imageUrl || !version) return imageUrl || "";
  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}v=${encodeURIComponent(version)}`;
}

export function getWebsiteMediaImage(items, sectionKey, fallback = "") {
  const uploadedItem = (items || [])
    .filter((entry) => entry.sectionKey === sectionKey && entry.isActive !== false)
    .filter((entry) => typeof entry.imageUrl === "string" && entry.imageUrl.trim())
    .sort((a, b) => {
      const updatedComparison = new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      return updatedComparison || Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    })[0];

  if (!uploadedItem?.imageUrl) {
    return fallback;
  }

  return withWebsiteMediaVersion(uploadedItem.imageUrl, uploadedItem.updatedAt || uploadedItem.id);
}
