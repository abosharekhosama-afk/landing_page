const PAGE_TYPES = new Set(["standard", "dynamic", "system"]);
export const GENERIC_ELEMENT_TYPES = new Set([
  "heading", "text", "richText", "image", "button", "link",
  "container", "section", "list", "productCollection", "categoryCollection", "spacer",
]);
const SECTION_TYPE_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,79}$/i;
const STYLE_KEYS = new Set([
  "alignment", "backgroundColor", "borderRadius", "color", "contentAlignment",
  "fontSize", "fontWeight", "heightMode", "lineHeight", "objectFit", "padding",
  "paddingBlock", "paddingInline", "width",
]);
const SAFE_FITS = new Set(["contain", "cover", "fill", "none", "scale-down"]);
const SAFE_ALIGNMENTS = new Set(["start", "center", "end", "left", "right"]);
const SAFE_HEIGHT_MODES = new Set(["auto", "fixed", "cover"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,159}$/i;
const COLOR_PATTERN = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent|currentColor)$/i;
const UNSAFE_MARKUP = /<\s*\/?\s*(?:script|iframe|object|embed|style|link|meta)|\bon\w+\s*=|javascript\s*:|data\s*:\s*text\/html/i;

export class SiteEditorValidationError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_DOCUMENT") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function assert(condition, message) {
  if (!condition) throw new SiteEditorValidationError(message);
}

function safeId(value, field) {
  const result = String(value || "").trim();
  assert(ID_PATTERN.test(result), `${field} is invalid.`);
  return result;
}

function plainText(value, field, maximum = 5000) {
  const result = String(value ?? "").replace(/\u0000/g, "").slice(0, maximum);
  assert(!UNSAFE_MARKUP.test(result) && !/<[^>]+>/.test(result), `${field} must contain plain text only.`);
  return result;
}

export function isSafeEditorUrl(value, { allowEmpty = true } = {}) {
  const candidate = String(value || "").trim();
  if (!candidate) return allowEmpty;
  if (UNSAFE_MARKUP.test(candidate) || /[\u0000-\u001f]/.test(candidate)) return false;
  if (candidate.startsWith("/")) return !candidate.startsWith("//");
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeStyleValue(key, value) {
  if (["fontSize", "lineHeight", "padding", "paddingBlock", "paddingInline", "width", "borderRadius"].includes(key)) {
    const number = Number(value);
    assert(Number.isFinite(number) && number >= 0 && number <= 2000, `${key} is out of range.`);
    return number;
  }
  if (key === "fontWeight") {
    const number = Number(value);
    assert(Number.isFinite(number) && number >= 100 && number <= 900, "fontWeight is out of range.");
    return number;
  }
  if (["color", "backgroundColor"].includes(key)) {
    const color = String(value || "").trim();
    assert(COLOR_PATTERN.test(color), `${key} is invalid.`);
    return color;
  }
  if (key === "objectFit") {
    assert(SAFE_FITS.has(value), "objectFit is invalid.");
    return value;
  }
  if (key === "heightMode") {
    assert(SAFE_HEIGHT_MODES.has(value), "heightMode is invalid.");
    return value;
  }
  if (["alignment", "contentAlignment"].includes(key)) {
    assert(SAFE_ALIGNMENTS.has(value), `${key} is invalid.`);
    return value;
  }
  return plainText(value, key, 100);
}

function normalizeStyles(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => STYLE_KEYS.has(key)).map(
    ([key, entry]) => [key, normalizeStyleValue(key, entry)],
  ));
}

function normalizeSettings(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = {};
  for (const [key, entry] of Object.entries(value).slice(0, 40)) {
    if (!ID_PATTERN.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof entry)) {
      normalized[key] = typeof entry === "string" ? plainText(entry, `setting ${key}`, 500) : entry;
    } else if (key === "sourceBinding" && entry && typeof entry === "object" && !Array.isArray(entry)) {
      const source = {};
      for (const [sourceKey, sourceValue] of Object.entries(entry).slice(0, 20)) {
        if (!ID_PATTERN.test(sourceKey)) continue;
        source[sourceKey] = plainText(sourceValue, `setting ${key}.${sourceKey}`, 500);
      }
      if (Object.keys(source).length) normalized[key] = source;
    } else if (key === "editableProperties" && Array.isArray(entry)) {
      const allowed = entry.map((item) => plainText(item, "setting editableProperties", 100))
        .filter((item) => GENERIC_ELEMENT_TYPES.has(item) || ["content", "styles", "responsive", "source"].includes(item));
      normalized[key] = allowed.slice(0, 20);
    }
  }
  return normalized;
}

function sanitizeRichText(value) {
  const result = String(value ?? "").replace(/\u0000/g, "").slice(0, 20000);
  assert(!UNSAFE_MARKUP.test(result), "richText contains unsafe markup.");
  return result;
}

function normalizeContent(type, value = {}) {
  const content = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (type === "heading" || type === "text") return { text: plainText(content.text, `${type} text`) };
  if (type === "richText") return { text: sanitizeRichText(content.text) };
  if (type === "button" || type === "link") {
    assert(isSafeEditorUrl(content.link || ""), `${type} link is unsafe.`);
    return { label: plainText(content.label, `${type} label`, 300), link: String(content.link || "").trim() };
  }
  if (type === "image") {
    assert(isSafeEditorUrl(content.src || "", { allowEmpty: false }), "Image URL is unsafe.");
    assert(isSafeEditorUrl(content.link || ""), "Image link is unsafe.");
    return {
      src: String(content.src || "").trim(),
      alt: plainText(content.alt, "image alt text", 500),
      link: String(content.link || "").trim(),
      assetId: content.assetId ? safeId(content.assetId, "image assetId") : "",
    };
  }
  if (type === "productCollection" || type === "categoryCollection") {
    const normalized = {};
    const source = plainText(content.source, `${type} source`, 100);
    if (source) normalized.source = source;
    const categoryId = plainText(content.categoryId, `${type} categoryId`, 200);
    if (categoryId) normalized.categoryId = categoryId;
    const collectionId = plainText(content.collectionId, `${type} collectionId`, 200);
    if (collectionId) normalized.collectionId = collectionId;
    const limit = Number(content.limit);
    if (Number.isInteger(limit) && limit >= 0) normalized.limit = Math.min(limit, 200);
    const sort = plainText(content.sort, `${type} sort`, 100);
    if (sort) normalized.sort = sort;
    if (content.order === "asc" || content.order === "desc") normalized.order = content.order;
    const layoutVariant = plainText(content.layoutVariant, `${type} layoutVariant`, 100);
    if (layoutVariant) normalized.layoutVariant = layoutVariant;
    if (typeof content.showPrice === "boolean") normalized.showPrice = content.showPrice;
    if (typeof content.showBadge === "boolean") normalized.showBadge = content.showBadge;
    const columns = Number(content.columns);
    if (Number.isInteger(columns) && columns > 0) normalized.columns = Math.min(columns, 12);
    return normalized;
  }
  return {};
}

function normalizeElement(element, depth = 0) {
  assert(depth <= 5, "Element nesting is too deep.");
  assert(element && typeof element === "object" && !Array.isArray(element), "Element is invalid.");
  const type = String(element.type || "");
  assert(GENERIC_ELEMENT_TYPES.has(type), `Unsupported element type: ${type || "unknown"}.`);
  const children = Array.isArray(element.children) ? element.children : [];
  assert(children.length <= 80, "An element has too many children.");
  return {
    id: safeId(element.id, "element id"),
    type,
    editable: element.editable !== false,
    content: normalizeContent(type, element.content),
    settings: normalizeSettings(element.settings),
    styles: normalizeStyles(element.styles),
    responsive: {
      mobile: normalizeStyles(element.responsive?.mobile),
    },
    children: children.map((child) => normalizeElement(child, depth + 1)),
  };
}

function normalizeSection(section, index) {
  assert(section && typeof section === "object" && !Array.isArray(section), "Section is invalid.");
  const type = String(section.type || "");
  assert(SECTION_TYPE_PATTERN.test(type), `Unsupported section type: ${type || "unknown"}.`);
  const elements = Array.isArray(section.elements) ? section.elements : [];
  assert(elements.length <= 100, "A section has too many elements.");
  return {
    id: safeId(section.id, "section id"),
    type,
    order: index,
    editable: section.editable !== false,
    settings: normalizeSettings(section.settings),
    styles: normalizeStyles(section.styles),
    responsive: { mobile: normalizeStyles(section.responsive?.mobile) },
    elements: elements.map((element) => normalizeElement(element)),
  };
}

export function validatePageDocument(input, { companyId, pageId, previewPath = "/icare", routePattern = "/icare" } = {}) {
  assert(input && typeof input === "object" && !Array.isArray(input), "Page document is required.");
  const sections = Array.isArray(input.sections) ? input.sections : [];
  assert(sections.length > 0 && sections.length <= 40, "Page document must contain between 1 and 40 sections.");
  const normalizedCompanyId = safeId(companyId, "company scope");
  const normalizedPageId = safeId(pageId || input.pageId, "page id");
  assert(String(input.pageId || normalizedPageId) === normalizedPageId, "Page identity does not match the requested page.");
  assert(PAGE_TYPES.has(input.pageType || "standard"), "Page type is invalid.");
  assert(input.previewPath === previewPath && input.routePattern === routePattern, "Page route does not match the trusted site manifest.");
  const revision = Number(input.revision || 0);
  assert(Number.isInteger(revision) && revision >= 0, "Document revision is invalid.");

  const normalized = {
    id: safeId(input.id || `${normalizedPageId}:draft`, "document id"),
    companyId: normalizedCompanyId,
    siteId: safeId(input.siteId || `${normalizedCompanyId}:storefront`, "site id"),
    pageId: normalizedPageId,
    pageType: input.pageType || "standard",
    title: plainText(input.title, "page title", 300),
    slug: plainText(input.slug, "page slug", 160),
    routePattern,
    previewPath,
    locale: input.locale === "ar" ? "ar" : "en",
    status: "draft",
    revision,
    sections: sections.map(normalizeSection),
  };

  normalized.sections.forEach((section) => {
    const sectionEditable = section.editable !== false;
    const gate = (node) => {
      node.editable = sectionEditable && node.editable !== false;
      node.children.forEach(gate);
    };
    section.elements.forEach(gate);
  });

  const seen = new Set();
  const register = (id) => {
    assert(!seen.has(id), `Duplicate node id: ${id}.`);
    seen.add(id);
  };
  const visit = (element) => {
    register(element.id);
    element.children.forEach(visit);
  };
  normalized.sections.forEach((section) => {
    register(section.id);
    section.elements.forEach(visit);
  });
  return normalized;
}

export function assertDraftPayloadSize(document, maximumBytes = 512 * 1024) {
  const size = Buffer.byteLength(JSON.stringify(document || {}), "utf8");
  assert(size <= maximumBytes, "Page document exceeds the draft size limit.");
  return size;
}
