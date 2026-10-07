/**
 * Shared media URL reference helpers (Decision 21).
 * Duplicate copies URL strings only; delete must not remove storage still referenced elsewhere.
 */

const MEDIA_STRING_KEYS = [
  "image",
  "primaryImage",
  "primary_image",
  "hoverImage",
  "secondaryImage",
  "secondary_image",
  "productsPageImage",
  "productsPageHoverImage",
  "usageVideo",
  "usage_video",
  "usageVideoPoster",
  "usage_video_poster",
  "fallbackImage",
];

function normalizeMediaUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).pathname || trimmed;
    }
  } catch {
    /* keep raw */
  }
  return trimmed;
}

function addUrl(set, value) {
  const normalized = normalizeMediaUrl(value);
  if (normalized) set.add(normalized);
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw) set.add(raw);
}

export function collectProductMediaUrls(product = {}) {
  const urls = new Set();
  for (const key of MEDIA_STRING_KEYS) {
    addUrl(urls, product[key]);
  }

  const gallery = product.gallery_images || product.galleryImages || [];
  for (const entry of gallery) {
    if (typeof entry === "string") addUrl(urls, entry);
    else addUrl(urls, entry?.image_url || entry?.image || entry?.url);
  }

  const detailImages = product.detailSectionImages || product.detail_section_images || {};
  if (detailImages && typeof detailImages === "object") {
    for (const value of Object.values(detailImages)) addUrl(urls, value);
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  for (const variant of variants) {
    addUrl(urls, variant?.image_url || variant?.imageUrl || variant?.image);
  }

  return urls;
}

function urlsMatch(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  const a = normalizeMediaUrl(left);
  const b = normalizeMediaUrl(right);
  return Boolean(a && b && a === b);
}

export function mediaUrlStillReferenced(products = [], mediaUrl, { excludeProductId = null } = {}) {
  const raw = typeof mediaUrl === "string" ? mediaUrl.trim() : "";
  if (!raw) return false;

  for (const product of products) {
    if (excludeProductId && String(product.id) === String(excludeProductId)) continue;
    for (const url of collectProductMediaUrls(product)) {
      if (urlsMatch(url, raw)) return true;
    }
  }
  return false;
}
