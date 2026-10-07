/**
 * Generic Website Media slot registry.
 *
 * Shared CPanel logic never branches on tenant/company/site IDs.
 * Slot definitions come from (in order):
 *   1) company.settings.websiteContent.mediaSlots (or websiteMedia.slots)
 *   2) mediaKey references on configured Website Content text slots
 *   3) company.settings.websiteContent.mediaSlotCatalog → MEDIA_SLOT_CATALOGS[id]
 *   4) auto-attach a catalog when existing media rows already use its keys
 *   5) synthesize slots from remaining persisted website media keys
 *
 * Catalogs are metadata only. Empty sites never receive storefront defaults.
 * Brand / category / product media keys stay out of this workspace.
 */

import { resolveContentSlots } from "./websiteTextSlots.js";

function text(value) {
  return value == null ? "" : String(value);
}

function companyWebsiteContent(company) {
  return company?.settings?.websiteContent
    || company?.companySettings?.websiteContent
    || company?.websiteContent
    || {};
}

function companyWebsiteMediaConfig(company) {
  return company?.settings?.websiteMedia
    || company?.companySettings?.websiteMedia
    || company?.websiteMedia
    || {};
}

export function isCatalogOwnedMediaKey(key) {
  const normalized = text(key).trim().toLowerCase();
  return /^(brand|category|product)(\.|$)/.test(normalized);
}

/** Humanize a free-form groupKey without storefront/tenant brand names. */
export function formatMediaGroupLabel(groupKey, language = "en") {
  const key = text(groupKey).trim() || "sections";
  const generic = {
    homepage: { en: "Homepage sections", ar: "أقسام الصفحة الرئيسية" },
    homepage_categories: { en: "Homepage cards", ar: "بطاقات الصفحة الرئيسية" },
    products: { en: "Products page", ar: "صفحة المنتجات" },
    about: { en: "About sections", ar: "أقسام من نحن" },
    cleanups: { en: "Campaign sections", ar: "أقسام الحملات" },
    cleanups_gallery: { en: "Campaign gallery", ar: "معرض الحملات" },
    cleanups_tabs: { en: "Campaign tabs", ar: "تبويبات الحملات" },
    sustainability: { en: "Sustainability sections", ar: "أقسام الاستدامة" },
    how_it_works: { en: "How it works sections", ar: "أقسام كيف يعمل" },
    ads: { en: "Ads / banners", ar: "الإعلانات والبنرات" },
    header_dropdown: { en: "Header images", ar: "صور الترويسة" },
    sections: { en: "Other website images", ar: "صور موقع أخرى" },
    identity: { en: "Identity", ar: "الهوية" },
    home: { en: "Home", ar: "الرئيسية" },
    news: { en: "News", ar: "الأخبار" },
    contact: { en: "Contact", ar: "الاتصال" },
    footer: { en: "Footer", ar: "التذييل" },
    shared: { en: "Shared", ar: "مشترك" },
  };
  if (generic[key]?.[language]) return generic[key][language];
  if (generic[key]?.en) return generic[key].en;
  return key
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleFromKey(key) {
  const parts = text(key).split(".").filter(Boolean);
  if (!parts.length) return "Media";
  return parts
    .map((part) => (Number.isFinite(Number(part)) ? `#${Number(part) + 1}` : part.replaceAll("_", " ")))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

function inferPage(raw = {}, key = "") {
  return text(raw.page || raw.pageKey || raw.groupPage).trim()
    || text(raw.group).split("/")[0].trim()
    || text(raw.groupKey).trim()
    || key.split(".")[0]
    || "General";
}

function inferSection(raw = {}, key = "", page = "General") {
  const fromGroup = text(raw.group).split("/").slice(1).join(" / ").trim();
  const parts = key.split(".").filter(Boolean);
  return text(raw.section || raw.sectionKey).trim()
    || fromGroup
    || (parts.length > 2 ? parts.slice(1, -1).join(" · ") : "")
    || text(raw.groupKey).trim()
    || page
    || "General";
}

function inferKind(raw = {}, key = "") {
  const explicit = text(raw.kind || raw.mediaType || raw.type).trim().toLowerCase();
  if (explicit === "video" || explicit === "image" || explicit === "logo") return explicit;
  if (/\.video$|hero\.video|\/video$/i.test(key) || /video/i.test(key.split(".").at(-1) || "")) return "video";
  if (/\.logo$|site\.logo$/i.test(key)) return "logo";
  return "image";
}

function normalizeMediaSlot(raw = {}, index = 0) {
  const key = text(raw.key || raw.sectionKey || raw.mediaKey).trim();
  if (!key || isCatalogOwnedMediaKey(key)) return null;
  const page = inferPage(raw, key);
  const section = inferSection(raw, key, page);
  const label = text(raw.label || raw.labelEn || raw.sectionLabel || raw.name).trim() || titleFromKey(key);
  return {
    key,
    page,
    section,
    groupKey: text(raw.groupKey).trim() || page.toLowerCase().replaceAll(/\s+/g, "_"),
    label,
    labelAr: text(raw.labelAr).trim(),
    kind: inferKind(raw, key),
    acceptedTypes: Array.isArray(raw.acceptedTypes) && raw.acceptedTypes.length
      ? raw.acceptedTypes
      : (inferKind(raw, key) === "video" ? ["video", "image"] : ["image"]),
    description: text(raw.description || raw.help || raw.helpText).trim(),
    contentSlotKey: text(raw.contentSlotKey || raw.relatedTextKey).trim() || null,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    required: raw.required === true,
  };
}

export function normalizeMediaSlots(slots = []) {
  if (!Array.isArray(slots)) return [];
  const seen = new Set();
  return slots
    .map((slot, index) => normalizeMediaSlot(slot, index))
    .filter(Boolean)
    .filter((slot) => {
      if (seen.has(slot.key)) return false;
      seen.add(slot.key);
      return true;
    })
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder) || a.key.localeCompare(b.key));
}

/** Optional reusable catalogs — selected by config id, never by companyId. */
export const MEDIA_SLOT_CATALOGS = Object.freeze({
  "storefront-media-v1": Object.freeze(normalizeMediaSlots([
    { key: "site.logo", page: "Shared", section: "Identity", label: "Site logo", kind: "logo", sortOrder: 10 },
    { key: "home.hero.video", page: "Home", section: "Hero", label: "Hero video", kind: "video", sortOrder: 20 },
    { key: "home.hero.poster", page: "Home", section: "Hero", label: "Hero poster", kind: "image", sortOrder: 21 },
    { key: "about.hero.video", page: "About", section: "Hero", label: "Hero video", kind: "video", sortOrder: 30 },
    { key: "about.hero.poster", page: "About", section: "Hero", label: "Hero poster", kind: "image", sortOrder: 31 },
    ...Array.from({ length: 4 }, (_, index) => ({
      key: `about.${index}.image`,
      page: "About",
      section: "Sections",
      label: `Section image ${index + 1}`,
      kind: "image",
      sortOrder: 40 + index,
    })),
    { key: "contact.hero.poster", page: "Contact", section: "Hero", label: "Hero poster", kind: "image", sortOrder: 50 },
    { key: "news.banner", page: "News", section: "Hero", label: "News Banner", kind: "video", sortOrder: 55 },
    ...Array.from({ length: 5 }, (_, index) => ({
      key: `news.${index}.image`,
      page: "News",
      section: "Cards",
      label: `Card ${index + 1} image`,
      kind: "image",
      contentSlotKey: `news.${index}.title`,
      sortOrder: 60 + index,
    })),
  ])),
});

function catalogMatchesExistingRows(slots, existingItems = []) {
  const keys = new Set((existingItems || []).map((item) => text(item.sectionKey)));
  if (!keys.size) return false;
  return slots.some((slot) => keys.has(slot.key));
}

function slotsFromContentMediaKeys(company, existingTextRows = []) {
  const contentSlots = resolveContentSlots(company, existingTextRows);
  return normalizeMediaSlots(
    contentSlots
      .filter((slot) => slot.mediaKey)
      .map((slot, index) => ({
        key: slot.mediaKey,
        page: slot.page,
        section: slot.section,
        label: `${slot.label} media`,
        kind: inferKind({}, slot.mediaKey),
        contentSlotKey: slot.key,
        sortOrder: 1000 + (slot.sortOrder || index),
      })),
  );
}

function slotsFromExistingItems(existingItems = []) {
  return normalizeMediaSlots(
    (existingItems || [])
      .filter((item) => item?.sectionKey && !isCatalogOwnedMediaKey(item.sectionKey))
      .map((item, index) => ({
        key: item.sectionKey,
        page: item.groupKey || item.sectionKey.split(".")[0] || "General",
        section: item.sectionLabel || item.groupKey || "Media",
        label: item.sectionLabel || titleFromKey(item.sectionKey),
        kind: item.mediaType || (item.videoUrl ? "video" : "image"),
        groupKey: item.groupKey,
        sortOrder: Number(item.sortOrder || index),
      })),
  );
}

export function resolveMediaSlots(company, existingItems = [], options = {}) {
  const catalogs = options.catalogs || MEDIA_SLOT_CATALOGS;
  const contentConfig = companyWebsiteContent(company);
  const mediaConfig = companyWebsiteMediaConfig(company);

  if (Array.isArray(contentConfig.mediaSlots) && contentConfig.mediaSlots.length) {
    return normalizeMediaSlots(contentConfig.mediaSlots);
  }
  if (Array.isArray(mediaConfig.slots) && mediaConfig.slots.length) {
    return normalizeMediaSlots(mediaConfig.slots);
  }

  const fromContentKeys = slotsFromContentMediaKeys(company, options.existingTextRows || []);
  const catalogId = text(contentConfig.mediaSlotCatalog || mediaConfig.slotCatalog).trim();
  let fromCatalog = [];
  if (catalogId && Array.isArray(catalogs[catalogId])) {
    fromCatalog = normalizeMediaSlots(catalogs[catalogId]);
  } else {
    for (const slots of Object.values(catalogs || {})) {
      const normalized = normalizeMediaSlots(slots);
      if (catalogMatchesExistingRows(normalized, existingItems)) {
        fromCatalog = normalized;
        break;
      }
    }
  }

  const combined = normalizeMediaSlots([...fromCatalog, ...fromContentKeys]);
  if (combined.length) {
    const known = new Set(combined.map((slot) => slot.key));
    const extras = slotsFromExistingItems(existingItems).filter((slot) => !known.has(slot.key));
    return normalizeMediaSlots([...combined, ...extras]);
  }

  return slotsFromExistingItems(existingItems);
}

export function resolveMediaSlot(items, sectionKey) {
  const item = (items || [])
    .filter((entry) => entry.sectionKey === sectionKey)
    .sort((a, b) => {
      const updatedComparison =
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      return updatedComparison || Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    })[0];
  return item || null;
}

export function groupMediaSlotsByPage(slots = []) {
  const pages = new Map();
  normalizeMediaSlots(slots).forEach((slot) => {
    if (!pages.has(slot.page)) pages.set(slot.page, new Map());
    const sections = pages.get(slot.page);
    if (!sections.has(slot.section)) sections.set(slot.section, []);
    sections.get(slot.section).push(slot);
  });
  return [...pages.entries()].map(([page, sections]) => ({
    page,
    sections: [...sections.entries()].map(([section, items]) => ({ section, slots: items })),
  }));
}

export function mediaSlotDraft(slot) {
  const normalized = normalizeMediaSlot(slot);
  if (!normalized) {
    throw new Error("Media slot key is required.");
  }
  return {
    id: "",
    sectionKey: normalized.key,
    sectionLabel: normalized.label,
    groupKey: normalized.groupKey,
    imageUrl: "",
    videoUrl: "",
    mediaType: normalized.kind === "video" ? "video" : "image",
    title: "",
    subtitle: "",
    linkUrl: "",
    sortOrder: normalized.sortOrder,
    isActive: true,
  };
}

export function buildWebsiteMediaWorkspace(company, existingItems = [], options = {}) {
  const registered = resolveMediaSlots(company, existingItems, options);
  const byKey = new Map();
  (existingItems || []).forEach((item) => {
    if (!item?.sectionKey || isCatalogOwnedMediaKey(item.sectionKey)) return;
    const current = byKey.get(item.sectionKey);
    if (!current || new Date(item.updatedAt || 0).getTime() >= new Date(current.updatedAt || 0).getTime()) {
      byKey.set(item.sectionKey, item);
    }
  });

  const items = registered.map((slot) => {
    const record = byKey.get(slot.key) || null;
    const hasAsset = Boolean(record?.imageUrl || record?.videoUrl);
    return {
      ...slot,
      status: hasAsset ? "existing" : "missing",
      record,
      draft: record || mediaSlotDraft(slot),
    };
  });

  const pages = [...new Set(items.map((item) => item.page).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  return {
    registered,
    items,
    pages,
    missingCount: items.filter((item) => item.status === "missing").length,
    existingCount: items.filter((item) => item.status === "existing").length,
    empty: items.length === 0,
  };
}

/** @deprecated Prefer MEDIA_SLOT_CATALOGS / resolveMediaSlots. Kept for key continuity only. */
export const SITE_LOGO_SLOT = MEDIA_SLOT_CATALOGS["storefront-media-v1"].find((slot) => slot.key === "site.logo");

/** @deprecated Prefer resolveMediaSlots(company, items). */
export function siteMediaSlotKeys() {
  return MEDIA_SLOT_CATALOGS["storefront-media-v1"]
    .filter((slot) => ["home.hero.video", "home.hero.poster", "about.hero.video", "about.hero.poster", "contact.hero.poster"].includes(slot.key))
    .map((slot) => slot.key);
}

/** @deprecated */
export function siteLogoSlotKey() {
  return "site.logo";
}

/** @deprecated */
export function aboutImageSlotKeys() {
  return MEDIA_SLOT_CATALOGS["storefront-media-v1"]
    .filter((slot) => /^about\.\d+\.image$/.test(slot.key))
    .map((slot) => slot.key);
}

/** @deprecated */
export function newsImageSlotKeys() {
  return MEDIA_SLOT_CATALOGS["storefront-media-v1"]
    .filter((slot) => /^news\.\d+\.image$/.test(slot.key))
    .map((slot) => slot.key);
}
