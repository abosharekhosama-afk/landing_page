/**
 * Generic Website Content slot registry.
 *
 * Shared CPanel logic never branches on tenant/company/site IDs.
 * Slot definitions come from:
 *   1) company.settings.websiteContent.slots (inline config)
 *   2) company.settings.websiteContent.slotCatalog → CONTENT_SLOT_CATALOGS[id]
 *   3) auto-attach a catalog when existing tenant rows already use its keys
 *
 * Catalogs carry metadata only. Create/missing flows must not seed marketing copy.
 */

function text(value) {
  return value == null ? "" : String(value);
}

function companyWebsiteContent(company) {
  return company?.settings?.websiteContent
    || company?.companySettings?.websiteContent
    || company?.websiteContent
    || {};
}

function normalizeSlot(raw = {}, index = 0) {
  const key = text(raw.key).trim();
  if (!key) return null;
  const page = text(raw.page || raw.pageKey || raw.groupPage).trim()
    || text(raw.group).split("/")[0].trim()
    || key.split(".")[0]
    || "General";
  const section = text(raw.section || raw.sectionKey).trim()
    || text(raw.group).split("/").slice(1).join(" / ").trim()
    || text(raw.group).trim()
    || "General";
  const group = text(raw.group).trim() || (section && section !== "General" ? `${page} / ${section}` : page);
  return {
    key,
    page,
    section,
    group,
    label: text(raw.label || raw.labelEn || raw.name).trim() || key,
    labelAr: text(raw.labelAr).trim(),
    contentType: text(raw.contentType || raw.type || "text").trim() || "text",
    mediaKey: text(raw.mediaKey || raw.relatedMediaKey).trim() || null,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : index,
    required: raw.required === true,
    localization: raw.localization || "bilingual",
  };
}

export function normalizeContentSlots(slots = []) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot, index) => normalizeSlot(slot, index)).filter(Boolean)
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder) || a.key.localeCompare(b.key));
}

/** Example / reusable catalogs — selected by config id, never by companyId. */
export const CONTENT_SLOT_CATALOGS = Object.freeze({
  "storefront-copy-v1": Object.freeze(normalizeContentSlots([
    { key: "copy.footer.callout", page: "Footer", section: "Footer", label: "Callout", sortOrder: 400 },
    { key: "copy.footer.opportunities", page: "Footer", section: "Footer", label: "Opportunities link", sortOrder: 401 },
    { key: "copy.footer.tagline", page: "Footer", section: "Footer", label: "Tagline", sortOrder: 402 },
    { key: "copy.footer.explore", page: "Footer", section: "Footer", label: "Explore group", sortOrder: 403 },
    { key: "copy.footer.about", page: "Footer", section: "Footer", label: "About link", sortOrder: 404 },
    { key: "copy.footer.copyright", page: "Footer", section: "Footer", label: "Copyright", sortOrder: 405 },
    { key: "copy.footer.note", page: "Footer", section: "Footer", label: "Note", sortOrder: 406 },
    { key: "copy.news.filters", page: "News", section: "Controls", label: "Filters label", sortOrder: 420 },
    { key: "copy.news.sort", page: "News", section: "Controls", label: "Sort label", sortOrder: 421 },
    { key: "copy.news.latest", page: "News", section: "Controls", label: "Latest option", sortOrder: 422 },
    { key: "copy.news.oldest", page: "News", section: "Controls", label: "Oldest option", sortOrder: 423 },
    { key: "copy.news.az", page: "News", section: "Controls", label: "Alphabetical option", sortOrder: 424 },
    { key: "copy.news.read", page: "News", section: "Cards", label: "Read link", sortOrder: 425 },
    ...Array.from({ length: 5 }, (_, index) => ([
      { key: `news.${index}.title`, page: "News", section: "Cards", label: `Card ${index + 1} title`, mediaKey: `news.${index}.image`, sortOrder: 430 + index * 3 },
      { key: `news.${index}.category`, page: "News", section: "Cards", label: `Card ${index + 1} category`, sortOrder: 431 + index * 3 },
      { key: `news.${index}.date`, page: "News", section: "Cards", label: `Card ${index + 1} date`, sortOrder: 432 + index * 3 },
    ])).flat(),
    { key: "copy.contact.name", page: "Contact", section: "Form", label: "Name label", sortOrder: 450 },
    { key: "copy.contact.namePlaceholder", page: "Contact", section: "Form", label: "Name placeholder", sortOrder: 451 },
    { key: "copy.contact.email", page: "Contact", section: "Form", label: "Email label", sortOrder: 452 },
    { key: "copy.contact.emailPlaceholder", page: "Contact", section: "Form", label: "Email placeholder", sortOrder: 453 },
    { key: "copy.contact.subject", page: "Contact", section: "Form", label: "Subject label", sortOrder: 454 },
    { key: "copy.contact.choose", page: "Contact", section: "Form", label: "Subject placeholder", sortOrder: 455 },
    { key: "copy.contact.product", page: "Contact", section: "Form", label: "Product option", sortOrder: 456 },
    { key: "copy.contact.order", page: "Contact", section: "Form", label: "Order option", sortOrder: 457 },
    { key: "copy.contact.press", page: "Contact", section: "Form", label: "Press option", sortOrder: 458 },
    { key: "copy.contact.general", page: "Contact", section: "Form", label: "General option", sortOrder: 459 },
    { key: "copy.contact.message", page: "Contact", section: "Form", label: "Message label", sortOrder: 460 },
    { key: "copy.contact.messagePlaceholder", page: "Contact", section: "Form", label: "Message placeholder", sortOrder: 461 },
    { key: "copy.contact.submit", page: "Contact", section: "Form", label: "Submit", sortOrder: 462 },
    { key: "copy.contact.success", page: "Contact", section: "Form", label: "Success", sortOrder: 463 },
  ])),
});

function catalogMatchesExistingRows(slots, existingRows = []) {
  const keys = new Set((existingRows || []).map((row) => text(row.key)));
  if (!keys.size) return false;
  return slots.some((slot) => keys.has(slot.key));
}

export function resolveContentSlots(company, existingRows = [], catalogs = CONTENT_SLOT_CATALOGS) {
  const config = companyWebsiteContent(company);
  if (Array.isArray(config.slots) && config.slots.length) {
    return normalizeContentSlots(config.slots);
  }
  const catalogId = text(config.slotCatalog).trim();
  if (catalogId && Array.isArray(catalogs[catalogId])) {
    return normalizeContentSlots(catalogs[catalogId]);
  }
  for (const slots of Object.values(catalogs || {})) {
    const normalized = normalizeContentSlots(slots);
    if (catalogMatchesExistingRows(normalized, existingRows)) return normalized;
  }
  return [];
}

export function missingContentSlots(registeredSlots = [], existingRows = []) {
  const present = new Set((existingRows || []).map((row) => text(row.key)));
  return normalizeContentSlots(registeredSlots).filter((slot) => !present.has(slot.key));
}

export function contentSlotCreatePayload(slot) {
  const normalized = normalizeSlot(slot);
  if (!normalized) {
    throw new Error("Content slot key is required.");
  }
  return {
    key: normalized.key,
    group: normalized.group,
    label: normalized.label,
    valueEn: "",
    valueAr: "",
    sortOrder: normalized.sortOrder,
    isActive: true,
  };
}

export function groupContentSlotsByPage(slots = []) {
  const pages = new Map();
  normalizeContentSlots(slots).forEach((slot) => {
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

export function websiteTextLocation(row = {}, slotMeta = null) {
  if (slotMeta) {
    return {
      page: slotMeta.page,
      section: slotMeta.section,
      field: slotMeta.label || text(row.label) || text(row.key).split(".").at(-1) || "—",
    };
  }
  const parts = text(row.key).split(".").filter(Boolean);
  const groupParts = text(row.group).split("/").map((part) => part.trim()).filter(Boolean);
  return {
    page: groupParts[0] || parts[0] || "—",
    section: groupParts.slice(1).join(" · ") || (parts.length > 2 ? parts.slice(1, -1).join(" · ") : groupParts[0] || parts[1] || "—"),
    field: text(row.label) || parts.at(-1) || "—",
  };
}

export function buildWebsiteContentWorkspace(company, existingRows = [], catalogs = CONTENT_SLOT_CATALOGS) {
  const registered = resolveContentSlots(company, existingRows, catalogs);
  const byKey = new Map(registered.map((slot) => [slot.key, slot]));
  const existing = (existingRows || []).map((row) => ({
    ...row,
    status: "existing",
    meta: byKey.get(text(row.key)) || null,
    location: websiteTextLocation(row, byKey.get(text(row.key)) || null),
  }));
  const missing = missingContentSlots(registered, existingRows).map((slot) => ({
    ...slot,
    status: "missing",
    id: null,
    valueEn: "",
    valueAr: "",
    meta: slot,
    location: { page: slot.page, section: slot.section, field: slot.label },
  }));
  const pages = new Set([
    ...existing.map((row) => row.location.page),
    ...missing.map((row) => row.location.page),
  ]);
  return {
    registered,
    existing,
    missing,
    pages: [...pages].filter((page) => page && page !== "—").sort((a, b) => a.localeCompare(b)),
    missingCount: missing.length,
  };
}

/** @deprecated Prefer resolveContentSlots / missingContentSlots with company config. */
export function storefrontTextSlots() {
  return CONTENT_SLOT_CATALOGS["storefront-copy-v1"].map((slot) => ({
    key: slot.key,
    group: slot.group,
    label: slot.label,
    valueEn: "",
    valueAr: "",
    sortOrder: slot.sortOrder,
    isActive: true,
  }));
}

/** @deprecated Prefer missingContentSlots(resolveContentSlots(...), rows). */
export function missingStorefrontTextSlots(existingRows = []) {
  return missingContentSlots(CONTENT_SLOT_CATALOGS["storefront-copy-v1"], existingRows).map((slot) => contentSlotCreatePayload(slot));
}
