import { resolveApiAssetUrl } from "./api.js";

// Homepage offers carousel helpers (pure, unit-testable).
// The stored home-offers list (CPanel Engagement -> Banners) is the single
// source of truth. These helpers enforce the storefront contract:
// displayOrder sort + isActive + startAt/endAt schedule, stored data only,
// array-safe honest empty (never fake slides).

const CPANEL_STATIC_PREFIXES = ["/images/", "/products/", "/homepage-categories/"];

// Stored offer media: keep CPanel-static roots relative, rewrite /uploads/ (and
// other API assets) onto the configured API origin. Never invent a slide image.
export function resolveHomeOfferMediaUrl(value) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return "";
  if (CPANEL_STATIC_PREFIXES.some((prefix) => url.startsWith(prefix))) return url;
  return resolveApiAssetUrl(url) || url;
}

export function isHomeOfferVisible(offer, now = Date.now()) {
  if (!offer || typeof offer !== "object") return false;
  if (offer.isActive === false) return false;
  if (offer.startAt) {
    const start = new Date(offer.startAt).getTime();
    if (!Number.isFinite(start) || start > now) return false;
  }
  if (offer.endAt) {
    const end = new Date(offer.endAt).getTime();
    if (!Number.isFinite(end) || end < now) return false;
  }
  return true;
}

export function sortHomeOffersByDisplayOrder(rows) {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
}

// Visible storefront offers: scheduled-active only, sorted by displayOrder.
// Non-arrays yield [] (honest empty, never fakes).
export function filterVisibleHomeOffers(rows, now = Date.now()) {
  if (!Array.isArray(rows)) return [];
  return sortHomeOffersByDisplayOrder(rows.filter((offer) => isHomeOfferVisible(offer, now)));
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (value.trim()) return value;
  }
  return "";
}

// Stored image resolution: desktop first, then legacy image, then mobile.
// Returns "" when the offer stores no image (caller renders the broken-image
// fallback, never an invented slide image).
export function resolveHomeOfferImage(offer, { mobile = false } = {}) {
  if (!offer || typeof offer !== "object") return "";
  if (mobile) {
    return firstNonEmptyString(offer.mobileImage, offer.image, offer.desktopImage);
  }
  return firstNonEmptyString(offer.desktopImage, offer.image, offer.mobileImage);
}

function localizedField(value, language = "en") {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    return String(value[language] || value.en || value.ar || "");
  }
  return "";
}

export function homeOfferTitle(offer, language = "en") {
  return localizedField(offer?.title, language);
}

export function homeOfferDescription(offer, language = "en") {
  return localizedField(offer?.description, language);
}

export function homeOfferCtaText(offer, language = "en") {
  return localizedField(offer?.ctaText, language);
}

export function homeOfferCtaLink(offer) {
  const link = typeof offer?.ctaLink === "string" ? offer.ctaLink.trim() : "";
  return link || "products";
}

// Autoplay delay for one slide: stored transitionDurationMs clamped to the
// same 500..60000ms contract the Banners form validates. Falls back to 5000.
export function homeOfferAutoplayDelay(offer, fallbackMs = 5000) {
  const raw = Number(offer?.transitionDurationMs ?? fallbackMs);
  if (!Number.isFinite(raw)) return fallbackMs;
  return Math.min(60000, Math.max(500, Math.round(raw)));
}

export const HOME_OFFERS_COPY = {
  en: {
    sectionLabel: "Featured offers",
    loading: "Loading offers…",
    loadFailed: "Offers could not be loaded.",
    retry: "Retry",
    previous: "Previous offer",
    next: "Next offer",
    goToSlide: (index, total) => `Go to offer ${index} of ${total}`,
    slideOf: (index, total) => `Offer ${index} of ${total}`,
  },
  ar: {
    sectionLabel: "عروض مميزة",
    loading: "جارٍ تحميل العروض…",
    loadFailed: "تعذر تحميل العروض.",
    retry: "إعادة المحاولة",
    previous: "العرض السابق",
    next: "العرض التالي",
    goToSlide: (index, total) => `انتقل إلى العرض ${index} من ${total}`,
    slideOf: (index, total) => `العرض ${index} من ${total}`,
  },
};

export function homeOffersCopy(language) {
  return HOME_OFFERS_COPY[language] || HOME_OFFERS_COPY.en;
}

// Resolve a stored CTA link to an honest navigation action using only real
// destinations: external URLs open outside, absolute paths navigate in place,
// category-style values filter the real catalog (ProductsPage normalizes an
// unknown value to All), and anything else falls back to the products page
// (never a blank page, never invented content).
export function resolveHomeOfferCtaTarget(link) {
  const target = String(link || "").trim();
  if (/^https?:\/\//i.test(target)) return { kind: "external", target };
  if (target.startsWith("/")) return { kind: "path", target };
  if (target && target !== "products") return { kind: "category", target };
  return { kind: "products", target: "products" };
}
