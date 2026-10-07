/**
 * siteEditorSectionLibrary.js — "Add Section" library helpers for the site editor.
 *
 * The library payload is the site manifest `sectionLibrary` served by the
 * platform connector (already validated and normalized by the API). Templates
 * carry configuration and default element markup only — never product or
 * catalog records. Inserting a template builds a fresh editor-document section
 * with brand-new node ids so repeated inserts never collide and template ids
 * are never reused inside a page document.
 */

const CATEGORY_COPY_KEYS = {
  welcome: "addSection.category.welcome",
  about: "addSection.category.about",
  team: "addSection.category.team",
  contact: "addSection.category.contact",
  promotion: "addSection.category.promotion",
  services: "addSection.category.services",
  subscribe: "addSection.category.subscribe",
  testimonials: "addSection.category.testimonials",
  clients: "addSection.category.clients",
  store: "addSection.category.store",
  basic: "addSection.category.basic",
  text: "addSection.category.text",
  list: "addSection.category.list",
  form: "addSection.category.form",
};

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sectionLibraryCategories(sectionLibrary) {
  const categories = Array.isArray(sectionLibrary?.categories) ? sectionLibrary.categories : [];
  return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function sectionLibraryCategoryKey(categoryId) {
  return CATEGORY_COPY_KEYS[categoryId] || null;
}

export function sectionLibraryBlank(sectionLibrary) {
  const blank = sectionLibrary?.blankSection;
  return { enabled: blank?.enabled === true, sectionType: blank?.sectionType || null };
}

export function sectionLibraryTemplates(sectionLibrary) {
  return Array.isArray(sectionLibrary?.templates) ? sectionLibrary.templates : [];
}

export function sectionTemplatesForCategory(sectionLibrary, currentPage, categoryId) {
  const pageType = currentPage?.pageType || "standard";
  return sectionLibraryTemplates(sectionLibrary).filter((template) => {
    if (template.categoryId !== categoryId) return false;
    if (!Array.isArray(template.pageTypes) || !template.pageTypes.length) return true;
    return template.pageTypes.includes(pageType);
  });
}

export function blankSectionTemplate(sectionLibrary) {
  const blank = sectionLibraryBlank(sectionLibrary);
  if (!blank.enabled) return null;
  return {
    templateId: "blank",
    categoryId: null,
    sectionType: blank.sectionType || null,
    layoutVariant: "blank",
    title: { en: "Blank Section", ar: "قسم فارغ" },
    description: null,
    thumbnail: "",
    pageTypes: [],
    capabilities: { requiresProducts: false, requiresMedia: false },
    defaultSectionDocument: null,
  };
}

export function templateLabel(template, language = "en") {
  const title = template?.title;
  return title?.[language] || title?.en || title?.ar || String(template?.templateId || template?.sectionType || "");
}

export function templateDescription(template, language = "en") {
  const description = template?.description;
  if (!description) return "";
  return description[language] || description.en || description.ar || "";
}

export function validSectionInsertPosition(position) {
  return ["after", "before", "end"].includes(position) ? position : "after";
}

function localizedContent(content, locale) {
  if (!isRecord(content)) return content || {};
  const hasEn = isRecord(content.en);
  const hasAr = isRecord(content.ar);
  if (hasEn || hasAr) {
    const selected = locale === "ar" ? content.ar : content.en;
    return isRecord(selected) ? selected : (hasEn ? content.en : {});
  }
  return content;
}

function editorElement(element, suffix, locale) {
  const source = isRecord(element.source) ? { sourceBinding: { ...element.source } } : {};
  const editableProperties = Array.isArray(element.editableProperties) && element.editableProperties.length
    ? { editableProperties: [...element.editableProperties] }
    : {};
  return {
    id: `${element.id}-${suffix}`,
    type: element.elementType,
    content: localizedContent(element.content, locale),
    editable: element.editable !== false,
    settings: { ...source, ...editableProperties },
    styles: isRecord(element.styles) ? { ...element.styles } : {},
    responsive: isRecord(element.responsive) ? { ...element.responsive } : {},
    children: (element.children || []).map((child) => editorElement(child, suffix, locale)),
  };
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function uniqueSectionId(document, base) {
  const existing = new Set((document.sections || []).map((section) => section.id));
  let id;
  do {
    id = `${base}-${randomSuffix()}`;
  } while (existing.has(id));
  return id;
}

function sectionBaseName(template) {
  if (template.templateId === "blank") return "section";
  const variantParts = [template.sectionType, template.layoutVariant].filter(Boolean);
  if (variantParts.length) return variantParts.join("-");
  return template.templateId || "section";
}

function buildSectionNode(template, document, locale) {
  const doc = template.defaultSectionDocument;
  const base = sectionBaseName(template);
  const id = uniqueSectionId(document, base);
  const suffix = id.split("-").pop();
  return {
    id,
    type: doc?.sectionType ?? template.sectionType ?? null,
    order: 0,
    editable: doc?.editable !== false,
    settings: isRecord(doc?.layout) ? { ...doc.layout } : {},
    styles: {},
    responsive: isRecord(doc?.responsive) ? { ...doc.responsive } : {},
    elements: (doc?.elements || []).map((element) => editorElement(element, suffix, locale)),
  };
}

export function insertSectionAtTarget(document, section, { position = "after", targetSectionId = null, locale = "en" } = {}) {
  if (!document) return null;
  if (!section || typeof section !== "object") return { document, sectionId: null };
  const sections = [...(document.sections || [])];
  const node = buildSectionNode(section, document, locale);
  const safePosition = validSectionInsertPosition(position);
  if (safePosition === "end" || !targetSectionId) {
    sections.push(node);
  } else {
    const index = sections.findIndex((item) => item.id === targetSectionId);
    if (index < 0) {
      sections.push(node);
    } else {
      sections.splice(safePosition === "before" ? index : index + 1, 0, node);
    }
  }
  return { document: { ...document, sections: sections.map((item, order) => ({ ...item, order })) }, sectionId: node.id };
}
