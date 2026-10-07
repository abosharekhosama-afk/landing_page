import {
  resolveHomeOfferCtaTarget,
  resolveHomeOfferImage,
  resolveHomeOfferMediaUrl,
} from "./homeOffersUi.js";

// Homepage banner campaign controls (CPanel Engagement -> Banners).
// Pure, unit-testable helpers over the stored home-offers list, which stays
// the single source of truth. The storefront carousel contract
// (filterVisibleHomeOffers + displayOrder sort + anonymous tenant fetch) is
// untouched; these helpers only drive the admin campaign UI.

// Campaign status of one banner. Precedence: explicit opt-out first, then an
// elapsed end date (expired is never "scheduled"), then a future start date.
export function bannerStatusOf(item, now = Date.now()) {
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

export const BANNER_STATUS_COPY = {
  en: { active: "Active", scheduled: "Scheduled", expired: "Expired", disabled: "Disabled" },
  ar: { active: "نشط", scheduled: "مجدول", expired: "منتهي", disabled: "معطّل" },
};

// Localized campaign status label (en + ar, no invented-language gaps).
export function bannerStatusLabel(status, language = "en") {
  const copy = BANNER_STATUS_COPY[language] || BANNER_STATUS_COPY.en;
  return copy[status] || copy.active;
}

// True when a CTA link is safe to store and render as an href. Empty means
// "no link" (renderers fall back to the products page). Anything carrying a
// scheme must be http(s) with a real hostname, which rules out javascript:,
// data:, vbscript: and every other non-web scheme with a single check.
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

// CTA label text regardless of stored shape (localized object or string).
export function bannerCtaLabelText(ctaText) {
  if (typeof ctaText === "string") return ctaText.trim();
  if (ctaText && typeof ctaText === "object" && !Array.isArray(ctaText)) {
    return String(ctaText.en || ctaText.ar || "").trim();
  }
  return "";
}

export const BANNERS_FORM_COPY = {
  en: {
    titleRequired: "Banner title is required.",
    ctaLabelRequired: "CTA label is required when a link is set.",
    ctaLinkUnsafe: "CTA link is not a safe URL.",
    displayOrderInvalid: "Display order must be a non-negative integer.",
    durationInvalid: "Transition duration must be between 500 and 60000 milliseconds.",
    startInvalid: "Invalid start date.",
    endInvalid: "Invalid end date.",
    endBeforeStart: "End date must be after start date.",
  },
  ar: {
    titleRequired: "عنوان اللافتة مطلوب.",
    ctaLabelRequired: "اسم الزر مطلوب عند وجود رابط.",
    ctaLinkUnsafe: "رابط الزر غير آمن.",
    displayOrderInvalid: "ترتيب العرض يجب أن يكون رقماً صحيحاً غير سالب.",
    durationInvalid: "مدة الانتقال يجب أن تكون بين 500 و 60000 مللي ثانية.",
    startInvalid: "تاريخ البدء غير صالح.",
    endInvalid: "تاريخ الانتهاء غير صالح.",
    endBeforeStart: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.",
  },
};

// Client-side mirror of the server validateOffer() contract: returns a map of
// field name -> localized message ({} when the form is valid). Lets the admin
// form show instant field errors without a round trip; the API re-checks the
// merged document on create/update, so the two can never drift silently.
export function validateBannerForm(editing = {}, language = "en") {
  const copy = BANNERS_FORM_COPY[language] || BANNERS_FORM_COPY.en;
  const errors = {};
  const title = editing.title || {};
  if (!String(title.en || title.ar || "").trim()) errors.title = copy.titleRequired;
  const displayOrder = Number(editing.displayOrder ?? 0);
  if (!Number.isInteger(displayOrder) || displayOrder < 0) errors.displayOrder = copy.displayOrderInvalid;
  const duration = Number(editing.transitionDurationMs ?? 5000);
  if (!Number.isInteger(duration) || duration < 500 || duration > 60000) {
    errors.transitionDurationMs = copy.durationInvalid;
  }
  if (editing.startAt && !Number.isFinite(new Date(editing.startAt).getTime())) {
    errors.startAt = copy.startInvalid;
  }
  if (editing.endAt && !Number.isFinite(new Date(editing.endAt).getTime())) {
    errors.endAt = copy.endInvalid;
  }
  if (
    editing.startAt &&
    editing.endAt &&
    Number.isFinite(new Date(editing.startAt).getTime()) &&
    Number.isFinite(new Date(editing.endAt).getTime()) &&
    new Date(editing.startAt) > new Date(editing.endAt)
  ) {
    errors.endAt = copy.endBeforeStart;
  }
  const ctaLink = editing.ctaLink == null ? "" : String(editing.ctaLink).trim();
  if (ctaLink) {
    if (!bannerCtaLabelText(editing.ctaText)) errors.ctaText = copy.ctaLabelRequired;
    if (!isSafeBannerUrl(ctaLink)) errors.ctaLink = copy.ctaLinkUnsafe;
  }
  return errors;
}

// Default state for the banner create form (mirrors the stored offer shape).
export function emptyBannerForm() {
  return {
    title: { en: "", ar: "" },
    description: { en: "", ar: "" },
    image: "",
    desktopImage: "",
    mobileImage: "",
    ctaText: { en: "Shop now", ar: "تسوق الآن" },
    ctaLink: "products",
    displayOrder: 0,
    isActive: true,
    autoplay: true,
    transitionDurationMs: 5000,
    startAt: null,
    endAt: null,
  };
}

// Map a stored banner onto the edit form without dropping localized fields.
export function bannerFormFromItem(item) {
  return {
    ...item,
    title: { en: "", ar: "", ...(item?.title || {}) },
    description: { en: "", ar: "", ...(item?.description || {}) },
    ctaText: { en: "Shop now", ar: "تسوق الآن", ...(item?.ctaText || {}) },
  };
}

// Build the create/update payload from form state. Mirrors the stored offer
// shape and keeps the legacy image fallback so banners without dedicated
// desktop/mobile art still render through the existing carousel.
export function bannerSavePayload(editing = {}) {
  return {
    ...editing,
    image: editing.desktopImage || editing.mobileImage || editing.image || "",
    startAt: editing.startAt || null,
    endAt: editing.endAt || null,
  };
}

// Preview model straight from the live form state: the admin preview renders
// exactly what the storefront carousel resolves (same image precedence, same
// CTA target mapping), so what the admin sees is what shoppers will get.
export function bannerPreviewModel(editing = {}, language = "en") {
  const text = (field) => {
    const value = editing?.[field];
    if (typeof value === "string") return value;
    if (value && typeof value === "object") return String(value[language] || value.en || value.ar || "");
    return "";
  };
  const ctaLink = typeof editing?.ctaLink === "string" && editing.ctaLink.trim()
    ? editing.ctaLink.trim()
    : "products";
  return {
    title: text("title"),
    description: text("description"),
    ctaText: text("ctaText"),
    ctaTarget: resolveHomeOfferCtaTarget(ctaLink),
    desktopImage: resolveHomeOfferMediaUrl(resolveHomeOfferImage(editing, { mobile: false })),
    mobileImage: resolveHomeOfferMediaUrl(resolveHomeOfferImage(editing, { mobile: true })),
    status: bannerStatusOf(editing),
  };
}

// Reorder helper for the Up/Down display-order controls: moves the banner one
// visual step and then resequences the whole list to 0..n-1. Resequencing is
// the point: swapping raw displayOrder values alone cannot persist a move when
// two banners share the same value (0 <-> 0 stays 0 and the reload restores the
// old order), so every row gets a distinct order and the persisted list reloads
// in the new visual order. Never mutates the input; out-of-range moves are
// no-ops so the buttons can stay mounted at the list edges.
export function moveBanner(items, id, direction) {
  const list = Array.isArray(items) ? [...items] : [];
  const sorted = [...list].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
  const index = sorted.findIndex((item) => String(item?.id) === String(id));
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) return { items: sorted, moved: false };
  const [relocated] = sorted.splice(index, 1);
  sorted.splice(target, 0, relocated);
  const resequenced = sorted.map((item, order) => ({ ...item, displayOrder: order }));
  return { items: resequenced, moved: true };
}
