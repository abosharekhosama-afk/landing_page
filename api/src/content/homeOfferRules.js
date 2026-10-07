// Campaign status of one homepage banner, derived from the stored schedule.
// Precedence is deliberate: an explicit opt-out always wins, then an elapsed
// end date (expired is never "scheduled"), then a future start date.
export function getOfferStatus(item, now = Date.now()) {
  if (item?.isActive === false) return "disabled";
  const nowMs = Number(now);
  if (item?.endAt) {
    const end = new Date(item.endAt).getTime();
    if (!Number.isFinite(end) || end < nowMs) return "expired";
  }
  if (item?.startAt) {
    const start = new Date(item.startAt).getTime();
    if (!Number.isFinite(start) || start > nowMs) return "scheduled";
  }
  return "active";
}
// True when a banner CTA link is safe to store and render as an href.
// Empty means "no link" (renderers fall back to the products page).
// Anything with a scheme must be http(s) with a real hostname; bare slugs,
// absolute paths and fragments carry no scheme and are always safe.
export function isSafeBannerUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return true;
  if (/[\s\x00-\x1f\x7f]/.test(raw)) return false;
  if (/[<>"`\\]/.test(raw)) return false;
  if (/^(javascript|data|vbscript|file|blob):/i.test(raw)) return false;
  const colon = raw.indexOf(":");
  if (colon !== -1) {
    const scheme = raw.slice(0, colon).toLowerCase();
    if (scheme !== "http" && scheme !== "https") return false;
    try {
      const url = new URL(raw);
      if (!url.hostname || url.username || url.password) return false;
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  return true;
}
// CTA label text regardless of stored shape (localized object or plain string).
export function bannerCtaLabelText(ctaText) {
  if (typeof ctaText === "string") return ctaText.trim();
  if (ctaText && typeof ctaText === "object" && !Array.isArray(ctaText)) {
    return String(ctaText.en || ctaText.ar || "").trim();
  }
  return "";
}
export function isScheduledActive(item, now = Date.now()) {
  if (item?.isActive === false) return false;
  if (item?.startAt) {
    const start = new Date(item.startAt).getTime();
    if (!Number.isFinite(start) || start > now) return false;
  }
  if (item?.endAt) {
    const end = new Date(item.endAt).getTime();
    if (!Number.isFinite(end) || end < now) return false;
  }
  return true;
}
export function validateOffer(value = {}) {
  const title = value.title || {};
  if (!String(title.en || title.ar || "").trim()) return "Banner title is required.";
  const displayOrder = Number(value.displayOrder ?? 0);
  if (!Number.isInteger(displayOrder) || displayOrder < 0) return "Display order must be a non-negative integer.";
  const duration = Number(value.transitionDurationMs ?? 5000);
  if (!Number.isInteger(duration) || duration < 500 || duration > 60000) return "Transition duration must be between 500 and 60000 milliseconds.";
  if (value.startAt && !Number.isFinite(new Date(value.startAt).getTime())) return "Invalid start date.";
  if (value.endAt && !Number.isFinite(new Date(value.endAt).getTime())) return "Invalid end date.";
  if (value.startAt && value.endAt && new Date(value.startAt) > new Date(value.endAt)) return "End date must be after start date.";
  for (const field of ["desktopImage", "mobileImage", "image"]) if (value[field] && typeof value[field] !== "string") return `${field} must be a string.`;
  const ctaLink = value.ctaLink == null ? "" : String(value.ctaLink).trim();
  if (ctaLink) {
    if (!bannerCtaLabelText(value.ctaText)) return "CTA label is required when a link is set.";
    if (!isSafeBannerUrl(ctaLink)) return "CTA link is not a safe URL.";
  }
  return null;
}
