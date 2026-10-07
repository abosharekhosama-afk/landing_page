import { editorNodeStyles } from "./siteEditorDocument.js";

export function quickEditNodeEditable(node) {
  if (!node) return false;
  if (node.editable === false) return false;
  const props = node.settings?.editableProperties;
  if (Array.isArray(props)) return props.length > 0;
  return true;
}

export function quickEditPropertyEditable(node, property, readOnly = false) {
  if (readOnly) return false;
  if (!node || node.editable === false) return false;
  const props = node.settings?.editableProperties;
  if (Array.isArray(props)) return props.includes(property);
  return true;
}

function styleFields(node, viewportMode) {
  return editorNodeStyles(node, viewportMode);
}

export function quickEditSectionFields(section, { readOnly = false, viewportMode = "desktop" } = {}) {
  if (!section) return [];
  const fields = [];
  const sectionEditable = quickEditNodeEditable(section) && !readOnly;
  const styles = styleFields(section, viewportMode);
  const sectionStylesEditable = sectionEditable && quickEditPropertyEditable(section, "styles");

  fields.push({
    kind: "color",
    nodeId: section.id,
    nodeType: "section",
    labelKey: "quickEdit.sectionBackground",
    styleKey: "backgroundColor",
    value: styles.backgroundColor || "",
    editable: sectionStylesEditable,
  });

  const backgroundImage = styles.backgroundImage || section.settings?.backgroundImage;
  if (backgroundImage) {
    fields.push({
      kind: "image",
      nodeId: section.id,
      nodeType: "section",
      labelKey: "quickEdit.backgroundImage",
      value: String(backgroundImage),
      editable: false,
      readOnly: true,
    });
  }

  fields.push({
    kind: "number",
    nodeId: section.id,
    nodeType: "section",
    labelKey: "quickEdit.spacingVertical",
    styleKey: "paddingBlock",
    value: styles.paddingBlock ?? "",
    min: 0,
    max: 240,
    editable: sectionStylesEditable,
  });
  fields.push({
    kind: "number",
    nodeId: section.id,
    nodeType: "section",
    labelKey: "quickEdit.spacingHorizontal",
    styleKey: "paddingInline",
    value: styles.paddingInline ?? "",
    min: 0,
    max: 240,
    editable: sectionStylesEditable,
  });
  fields.push({
    kind: "alignment",
    nodeId: section.id,
    nodeType: "section",
    labelKey: "quickEdit.contentAlignment",
    styleKey: "contentAlignment",
    value: styles.contentAlignment || section.settings?.contentAlignment || "start",
    editable: sectionStylesEditable,
  });

  for (const element of section.elements || []) {
    pushElementFields(fields, element, sectionEditable, readOnly, viewportMode);
  }
  return fields;
}

function pushElementFields(fields, node, parentEditable, readOnly, viewportMode) {
  const type = node.type;
  const editable = parentEditable && quickEditNodeEditable(node) && !readOnly;
  const styles = styleFields(node, viewportMode);
  const field = (kind, extra) => fields.push({ nodeId: node.id, nodeType: type, kind, ...extra });

  if (type === "heading" || type === "text") {
    field("textarea", {
      labelKey: type === "heading" ? "quickEdit.title" : "quickEdit.text",
      contentKey: "text",
      value: node.content?.text || "",
      editable: editable && quickEditPropertyEditable(node, "content"),
    });
    if (quickEditPropertyEditable(node, "styles")) {
      field("alignment", {
        labelKey: "quickEdit.alignment",
        styleKey: "alignment",
        value: styles.alignment || "start",
        editable: editable && quickEditPropertyEditable(node, "styles"),
      });
    }
  } else if (type === "button" || type === "link") {
    field("text", {
      labelKey: type === "button" ? "quickEdit.button" : "quickEdit.linkLabel",
      contentKey: "label",
      value: node.content?.label || "",
      editable: editable && quickEditPropertyEditable(node, "content"),
    });
    field("link", {
      labelKey: "quickEdit.link",
      contentKey: "link",
      value: node.content?.link || "",
      editable: editable && quickEditPropertyEditable(node, "content"),
    });
    if (quickEditPropertyEditable(node, "styles")) {
      field("alignment", {
        labelKey: "quickEdit.alignment",
        styleKey: "alignment",
        value: styles.alignment || "start",
        editable: editable && quickEditPropertyEditable(node, "styles"),
      });
    }
  } else if (type === "image") {
    const contentEditable = editable && quickEditPropertyEditable(node, "content");
    field("image", {
      labelKey: "quickEdit.image",
      value: node.content?.src || "",
      editable: contentEditable,
    });
    field("text", {
      labelKey: "quickEdit.alt",
      contentKey: "alt",
      value: node.content?.alt || "",
      editable: contentEditable,
    });
    field("link", {
      labelKey: "quickEdit.link",
      contentKey: "link",
      value: node.content?.link || "",
      editable: contentEditable,
    });
  } else if (type === "container") {
    const stylesEditable = editable && quickEditPropertyEditable(node, "styles");
    field("color", {
      labelKey: "quickEdit.background",
      styleKey: "backgroundColor",
      value: styles.backgroundColor || "",
      editable: stylesEditable,
    });
    field("number", {
      labelKey: "quickEdit.width",
      styleKey: "width",
      value: styles.width ?? "",
      min: 0,
      max: 100,
      editable: stylesEditable,
    });
    field("alignment", {
      labelKey: "quickEdit.contentAlignment",
      styleKey: "contentAlignment",
      value: styles.contentAlignment || "start",
      editable: stylesEditable,
    });
    field("number", {
      labelKey: "quickEdit.spacingVertical",
      styleKey: "paddingBlock",
      value: styles.paddingBlock ?? "",
      min: 0,
      max: 240,
      editable: stylesEditable,
    });
    field("number", {
      labelKey: "quickEdit.spacingHorizontal",
      styleKey: "paddingInline",
      value: styles.paddingInline ?? "",
      min: 0,
      max: 240,
      editable: stylesEditable,
    });
  } else if (type === "productCollection" || type === "categoryCollection") {
    field("collection", {
      labelKey: type === "productCollection" ? "quickEdit.products" : "quickEdit.categories",
      source: node.content?.source || node.settings?.source || "featured",
      limit: node.content?.limit ?? node.settings?.limit,
      order: node.content?.order ?? node.settings?.order ?? node.order,
      editable: false,
    });
  } else if (type === "list") {
    field("list", {
      labelKey: "quickEdit.list",
      contentKey: "items",
      items: Array.isArray(node.content?.items) ? node.content.items.map(String) : [],
      editable: editable && quickEditPropertyEditable(node, "content"),
    });
  } else {
    field("readonly", {
      labelKey: "quickEdit.element",
      summary: type || "element",
      editable: false,
    });
  }

  for (const child of node.children || []) {
    pushElementFields(fields, child, editable, readOnly, viewportMode);
  }
}
