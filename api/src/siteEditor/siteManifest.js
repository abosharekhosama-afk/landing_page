import { SiteEditorValidationError, GENERIC_ELEMENT_TYPES } from "./schema.js";
import { parseSafeConnectionUrl } from "./urlPolicy.js";
import { normalizeSiteDesign } from "./siteDesignManifest.js";

export const MANIFEST_SCHEMA_VERSION = "1.0";
export const MANIFEST_CONTENT_TYPE = "application/vnd.igroup.site-manifest+json";

export const GENERIC_PAGE_TYPES = new Set(["standard", "dynamic", "system"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,159}$/i;
const SECTION_TYPE_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,79}$/i;
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const ROUTE_PATTERN = /^\/(?!\/)(?:[A-Za-z0-9._~-]+\/?)*$/;

function manifestError(message, code = "MANIFEST_INVALID", statusCode = 400) {
  return new SiteEditorValidationError(message, statusCode, code);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeToken(value, field) {
  const result = String(value ?? "").trim();
  if (!ID_PATTERN.test(result)) throw manifestError(`${field} is invalid.`);
  return result;
}

function safeLocale(value, field, { allowEmpty = false } = {}) {
  const result = String(value ?? "").trim();
  if (allowEmpty && !result) return "";
  if (!LOCALE_PATTERN.test(result)) throw manifestError(`${field} is invalid.`);
  return result;
}

function safeRoute(value, field = "route") {
  const result = String(value ?? "").trim();
  if (!ROUTE_PATTERN.test(result) || result.includes("..")) throw manifestError(`${field} is invalid.`);
  return result;
}

function safeUrl(value, field) {
  const result = String(value ?? "").trim();
  if (result.length > 2048) throw manifestError(`${field} is invalid.`);
  const url = parseSafeConnectionUrl(result);
  if (!url) throw manifestError(`${field} must be a valid HTTPS URL.`);
  return url.toString().replace(/\/+$/, "");
}

function localizedTitle(value, field = "title") {
  if (!isRecord(value)) throw manifestError(`${field} must be a localized object.`);
  const en = String(value.en ?? "").trim().slice(0, 300);
  const ar = String(value.ar ?? "").trim().slice(0, 300);
  if (!en) throw manifestError(`${field}.en is required.`);
  return { en, ar };
}

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw manifestError(`${field} must be a non-negative integer.`);
  return number;
}

function normalizeManifestElement(element, index) {
  if (!isRecord(element)) throw manifestError("Element is invalid.");
  const elementType = String(element.elementType ?? element.type ?? "");
  if (!GENERIC_ELEMENT_TYPES.has(elementType)) {
    throw manifestError(`Unsupported element type: ${elementType || "unknown"}.`, "MANIFEST_ELEMENT_TYPE_UNSUPPORTED");
  }
  const children = Array.isArray(element.children)
    ? element.children.map((child, childIndex) => normalizeManifestElement(child, childIndex))
    : [];
  const content = isRecord(element.content) ? clone(element.content) : {};
  return {
    id: safeToken(element.id, "element id"),
    elementType,
    order: element.order == null ? index : nonNegativeInteger(element.order, "element order"),
    editable: element.editable !== false,
    content,
    source: isRecord(element.source) ? clone(element.source) : null,
    styles: isRecord(element.styles) ? clone(element.styles) : {},
    responsive: isRecord(element.responsive) ? clone(element.responsive) : {},
    validation: isRecord(element.validation) ? clone(element.validation) : {},
    editableProperties: Array.isArray(element.editableProperties)
      ? element.editableProperties.map((item) => String(item)).filter(Boolean)
      : [],
    children,
  };
}

function normalizeManifestSection(section, index) {
  if (!isRecord(section)) throw manifestError("Section is invalid.");
  const sectionType = String(section.sectionType ?? section.type ?? "");
  if (!SECTION_TYPE_PATTERN.test(sectionType)) {
    throw manifestError(`Unsupported section type: ${sectionType || "unknown"}.`, "MANIFEST_SECTION_TYPE_UNSUPPORTED");
  }
  const elements = Array.isArray(section.elements)
    ? section.elements.map((element, elementIndex) => normalizeManifestElement(element, elementIndex))
    : [];
  if (elements.length > 100) throw manifestError("A section has too many elements.");
  return {
    id: safeToken(section.id, "section id"),
    sectionType,
    order: section.order == null ? index : nonNegativeInteger(section.order, "section order"),
    editable: section.editable !== false,
    layout: isRecord(section.layout) ? clone(section.layout) : {},
    responsive: isRecord(section.responsive) ? clone(section.responsive) : {},
    elements,
  };
}

function normalizeManifestPage(page, index) {
  if (!isRecord(page)) throw manifestError("Page is invalid.");
  const pageType = String(page.pageType ?? "standard");
  if (!GENERIC_PAGE_TYPES.has(pageType)) throw manifestError(`Unsupported page type: ${pageType || "unknown"}.`);
  const route = safeRoute(page.route ?? page.routePattern ?? "/");
  const sections = Array.isArray(page.sections)
    ? page.sections.map((section, sectionIndex) => normalizeManifestSection(section, sectionIndex))
    : [];
  if (sections.length > 40) throw manifestError("A page has too many sections.");
  const id = safeToken(page.id, "page id");
  const normalized = {
    id,
    route,
    pageType,
    title: localizedTitle(page.title, "page title"),
    navigationVisible: page.navigationVisible !== false && page.navVisible !== false,
    parentId: page.parentId ? safeToken(page.parentId, "page parentId") : null,
    order: page.order == null ? index : nonNegativeInteger(page.order, "page order"),
    editable: page.editable !== false,
    isSystem: page.isSystem === true,
    isDynamic: page.isDynamic === true,
    sections,
    slug: page.slug ? String(page.slug).trim().slice(0, 160) : String(route.split("/").filter(Boolean).pop() || "home"),
    routePattern: route,
    previewPath: route,
  };
  if (normalized.parentId && normalized.parentId === id) {
    throw manifestError("A page cannot be its own parent.");
  }
  return normalized;
}

function normalizeSectionLibrary(input) {
  if (input == null) return null;
  if (!isRecord(input)) throw manifestError("sectionLibrary must be a JSON object.");
  const version = String(input.version ?? "").trim();
  if (!version) throw manifestError("sectionLibrary.version is required.");
  if (version.length > 40) throw manifestError("sectionLibrary.version is invalid.");
  const categories = Array.isArray(input.categories) ? input.categories : [];
  const templates = Array.isArray(input.templates) ? input.templates : [];
  if (categories.length > 100) throw manifestError("sectionLibrary declares too many categories.");
  if (templates.length > 300) throw manifestError("sectionLibrary declares too many templates.");

  let blankSection = { enabled: false };
  if (input.blankSection != null) {
    if (!isRecord(input.blankSection)) throw manifestError("sectionLibrary.blankSection must be an object.");
    blankSection = {
      enabled: input.blankSection.enabled === true,
      ...(input.blankSection.sectionType
        ? { sectionType: safeToken(input.blankSection.sectionType, "blankSection sectionType") }
        : {}),
    };
  }

  const normalizedCategories = categories.map((category, index) => {
    if (!isRecord(category)) throw manifestError("sectionLibrary category is invalid.");
    return {
      id: safeToken(category.id, "category id"),
      title: localizedTitle(category.title, "category title"),
      icon: category.icon ? String(category.icon).trim().slice(0, 40) : "",
      order: category.order == null ? index : nonNegativeInteger(category.order, "category order"),
    };
  });
  const categoryIds = new Set(normalizedCategories.map((category) => category.id));

  const normalizedTemplates = templates.map((template) => {
    if (!isRecord(template)) throw manifestError("sectionLibrary template is invalid.");
    const templateId = safeToken(template.templateId, "templateId");
    const categoryId = safeToken(template.categoryId, "template categoryId");
    if (!categoryIds.has(categoryId)) throw manifestError(`Template references an unknown category: ${categoryId}.`);
    const sectionType = String(template.sectionType ?? "");
    if (!SECTION_TYPE_PATTERN.test(sectionType)) {
      throw manifestError(`Unsupported template section type: ${sectionType || "unknown"}.`);
    }
    const layoutVariant = template.layoutVariant ? safeToken(template.layoutVariant, "template layoutVariant") : "";
    const pageTypes = Array.isArray(template.pageTypes) && template.pageTypes.length
      ? [...new Set(template.pageTypes.map((pageType) => String(pageType)))].filter((pageType) => GENERIC_PAGE_TYPES.has(pageType)).slice(0, 10)
      : [...GENERIC_PAGE_TYPES];
    if (!pageTypes.length) throw manifestError(`Template ${templateId} declares no supported page types.`);
    const capabilities = isRecord(template.capabilities)
      ? {
        requiresProducts: template.capabilities.requiresProducts === true,
        requiresMedia: template.capabilities.requiresMedia === true,
      }
      : { requiresProducts: false, requiresMedia: false };
    if (!isRecord(template.defaultSectionDocument)) {
      throw manifestError(`Template ${templateId} must declare a defaultSectionDocument.`);
    }
    const defaultSectionDocument = normalizeManifestSection(template.defaultSectionDocument, 0);
    if (defaultSectionDocument.sectionType !== sectionType) {
      throw manifestError(`Template ${templateId} section type must match its defaultSectionDocument.`);
    }
    return {
      templateId,
      categoryId,
      sectionType,
      layoutVariant,
      title: localizedTitle(template.title, "template title"),
      description: template.description != null ? localizedTitle(template.description, "template description") : null,
      thumbnail: template.thumbnail != null && String(template.thumbnail).trim()
        ? safeUrl(template.thumbnail, "template thumbnail")
        : "",
      pageTypes,
      capabilities,
      defaultSectionDocument,
    };
  });

  return {
    version,
    blankSection,
    categories: normalizedCategories,
    templates: normalizedTemplates,
  };
}

export function validateSiteManifest(input) {
  if (!isRecord(input)) throw manifestError("Site manifest must be a JSON object.");
  const schemaVersion = String(input.schemaVersion ?? "");
  if (!schemaVersion) throw manifestError("schemaVersion is required.");
  const supported = new Set([MANIFEST_SCHEMA_VERSION]);
  if (!supported.has(schemaVersion)) {
    throw manifestError(`Unsupported manifest schemaVersion: ${schemaVersion}.`, "MANIFEST_SCHEMA_VERSION_UNSUPPORTED");
  }
  const pages = Array.isArray(input.pages) ? input.pages : [];
  if (!pages.length) throw manifestError("Site manifest must declare at least one page.");
  if (pages.length > 500) throw manifestError("Site manifest declares too many pages.");

  const normalized = {
    schemaVersion,
    companyId: safeToken(input.companyId, "companyId"),
    siteId: safeToken(input.siteId, "siteId"),
    siteName: String(input.siteName ?? "").trim().slice(0, 200) || safeToken(input.siteId, "siteId"),
    baseUrl: safeUrl(input.baseUrl ?? "", "baseUrl"),
    routePrefix: safeRoute(input.routePrefix ?? "/", "routePrefix"),
    defaultLocale: safeLocale(input.defaultLocale ?? "en", "defaultLocale"),
    supportedLocales: Array.isArray(input.supportedLocales)
      ? [...new Set(input.supportedLocales.map((locale) => safeLocale(locale, "supportedLocales")))].slice(0, 20)
      : ["en"],
    generatedAt: input.generatedAt ? String(input.generatedAt).slice(0, 64) : new Date().toISOString(),
    pages: pages.map(normalizeManifestPage),
    sectionLibrary: normalizeSectionLibrary(input.sectionLibrary),
    siteDesign: normalizeSiteDesign(input.siteDesign),
  };

  const seenPageIds = new Set();
  for (const page of normalized.pages) {
    if (seenPageIds.has(page.id)) throw manifestError(`Duplicate page id: ${page.id}.`);
    seenPageIds.add(page.id);
    const seenNodeIds = new Set();
    const register = (node) => {
      if (seenNodeIds.has(node.id)) throw manifestError(`Duplicate node id: ${node.id}.`);
      seenNodeIds.add(node.id);
    };
    for (const section of page.sections) {
      register(section);
      const visit = (element) => {
        register(element);
        element.children.forEach(visit);
      };
      section.elements.forEach(visit);
    }
  }

  return normalized;
}

function localizedContent(element, locale) {
  const content = element.content;
  if (!isRecord(content)) return {};
  if (isRecord(content.en) || isRecord(content.ar)) {
    const selected = content[locale] ?? content.en ?? {};
    return isRecord(selected) ? selected : {};
  }
  return content;
}

export function manifestElementToEditorElement(element, locale, depth = 0, parentEditable = true) {
  if (depth > 5) throw manifestError("Element nesting is too deep.");
  const editable = parentEditable && element.editable !== false;
  const children = Array.isArray(element.children)
    ? element.children.map((child) => manifestElementToEditorElement(child, locale, depth + 1, editable))
    : [];
  return {
    id: element.id,
    type: element.elementType,
    content: localizedContent(element, locale),
    editable,
    settings: {
      ...(isRecord(element.source) ? { sourceBinding: clone(element.source) } : {}),
      ...(Array.isArray(element.editableProperties) ? { editableProperties: [...element.editableProperties] } : {}),
    },
    styles: isRecord(element.styles) ? clone(element.styles) : {},
    responsive: isRecord(element.responsive) ? clone(element.responsive) : {},
    children,
  };
}

export function manifestSectionToEditorSection(section, locale, order) {
  const editable = section.editable !== false;
  return {
    id: section.id,
    type: section.sectionType,
    order,
    editable,
    settings: isRecord(section.layout) ? clone(section.layout) : {},
    styles: {},
    responsive: isRecord(section.responsive) ? clone(section.responsive) : {},
    elements: section.elements.map((element) => manifestElementToEditorElement(element, locale, 0, editable)),
  };
}

export function manifestPageToDocument(page, manifest, { companyId, locale = "en" } = {}) {
  const normalizedLocale = locale === "ar" ? "ar" : "en";
  return {
    id: `${page.id}:draft`,
    companyId: String(companyId || manifest.companyId),
    siteId: manifest.siteId,
    pageId: page.id,
    pageType: page.pageType,
    title: page.title[normalizedLocale] || page.title.en,
    slug: page.slug,
    routePattern: page.route,
    previewPath: page.route,
    locale: normalizedLocale,
    status: "draft",
    revision: 0,
    sections: page.sections.map((section, sectionIndex) => manifestSectionToEditorSection(section, normalizedLocale, sectionIndex)),
  };
}

export function buildEditorPageDescriptor(page, manifest, { companyId, locale = "en", draftStatus = "published-source" } = {}) {
  const normalizedLocale = locale === "ar" ? "ar" : "en";
  return {
    id: page.id,
    tenantId: String(companyId || manifest.companyId),
    title: page.title.en,
    localizedTitle: { en: page.title.en, ar: page.title.ar },
    slug: page.slug,
    routePattern: page.route,
    previewPath: page.route,
    pageType: page.pageType,
    parentId: page.parentId,
    order: page.order,
    menuVisibility: page.navigationVisible ? "main" : "hidden",
    status: "published-source",
    draftStatus,
    isSystem: page.isSystem === true,
    isDynamic: page.isDynamic === true,
    isEditable: page.editable === true,
    editableCapabilities: page.editable === true
      ? ["sections", "elements", "text", "richText", "media", "design"]
      : [],
    locale: normalizedLocale,
  };
}

export { isRecord };
