const unsafeMarkup = /<[^>]+>|javascript\s*:|\bon\w+\s*=/i;

export function documentFingerprint(document) {
  return JSON.stringify(document || null);
}

export function plainEditorText(value) {
  const text = String(value ?? "").replace(/\u0000/g, "");
  if (unsafeMarkup.test(text)) throw new Error("Editor text must be plain text without scripts or markup.");
  return text;
}

export function safeEditorLink(value) {
  const link = String(value || "").trim();
  if (!link) return "";
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  try {
    const url = new URL(link);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // handled below
  }
  throw new Error("Use a safe HTTP(S) or site-relative link.");
}

export function findEditorNode(document, nodeId) {
  if (!document || !nodeId) return null;
  const visit = (node, section) => {
    if (node.id === nodeId) return { node, section, kind: "element" };
    for (const child of node.children || []) {
      const found = visit(child, section);
      if (found) return found;
    }
    return null;
  };
  for (const section of document.sections || []) {
    if (section.id === nodeId) return { node: section, section, kind: "section" };
    for (const element of section.elements || []) {
      const found = visit(element, section);
      if (found) return found;
    }
  }
  return null;
}

function mapElement(element, nodeId, update) {
  if (element.id === nodeId) return update(element);
  const children = (element.children || []).map((child) => mapElement(child, nodeId, update));
  return children.some((child, index) => child !== element.children[index]) ? { ...element, children } : element;
}

export function updateEditorNode(document, nodeId, update) {
  let changed = false;
  const sections = (document.sections || []).map((section) => {
    if (section.id === nodeId) {
      changed = true;
      return update(section);
    }
    const elements = (section.elements || []).map((element) => {
      const next = mapElement(element, nodeId, (node) => {
        changed = true;
        return update(node);
      });
      return next;
    });
    return changed && elements.some((element, index) => element !== section.elements[index]) ? { ...section, elements } : section;
  });
  return changed ? { ...document, sections } : document;
}

export function updateEditorText(document, nodeId, value) {
  const text = plainEditorText(value);
  return updateEditorNode(document, nodeId, (node) => {
    if (node.type === "heading" || node.type === "text") return { ...node, content: { ...node.content, text } };
    if (node.type === "button") return { ...node, content: { ...node.content, label: text } };
    return node;
  });
}

export function updateEditorLink(document, nodeId, value) {
  const link = safeEditorLink(value);
  return updateEditorNode(document, nodeId, (node) => (
    ["button", "image"].includes(node.type) ? { ...node, content: { ...node.content, link } } : node
  ));
}

export function updateEditorStyle(document, nodeId, key, value, viewportMode = "desktop") {
  return updateEditorNode(document, nodeId, (node) => {
    if (viewportMode === "mobile") {
      return {
        ...node,
        responsive: { ...node.responsive, mobile: { ...(node.responsive?.mobile || {}), [key]: value } },
      };
    }
    return { ...node, styles: { ...(node.styles || {}), [key]: value } };
  });
}

export function replaceEditorImage(document, nodeId, asset, companyId) {
  const assetCompanyId = String(asset?.company_id || asset?.companyId || "");
  if (!asset?.id || assetCompanyId !== companyId || asset.isActive === false || asset.is_active === false || asset.deletedAt || asset.deleted_at) {
    throw new Error("Select active media from the current tenant.");
  }
  const src = String(asset.imageUrl || asset.image_url || asset.fallbackImageUrl || "").trim();
  if (!src) throw new Error("The selected media has no usable image URL.");
  safeEditorLink(src);
  return updateEditorNode(document, nodeId, (node) => node.type === "image" ? {
    ...node,
    content: { ...node.content, src, assetId: asset.id },
  } : node);
}

export function updateEditorImageSettings(document, nodeId, changes) {
  return updateEditorNode(document, nodeId, (node) => node.type === "image" ? {
    ...node,
    content: {
      ...node.content,
      ...(changes.alt !== undefined ? { alt: plainEditorText(changes.alt) } : {}),
      ...(changes.link !== undefined ? { link: safeEditorLink(changes.link) } : {}),
    },
  } : node);
}

export function updateEditorContentList(document, nodeId, items) {
  const safeItems = Array.isArray(items)
    ? items.map((item) => plainEditorText(item)).filter((item) => String(item).trim() !== "")
    : [];
  return updateEditorNode(document, nodeId, (node) => node.type === "list" ? {
    ...node,
    content: { ...node.content, items: safeItems },
  } : node);
}

export function moveEditorSection(document, sectionId, direction) {
  const sections = [...(document.sections || [])];
  const index = sections.findIndex((section) => section.id === sectionId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sections.length) return document;
  [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...document, sections: sections.map((section, order) => ({ ...section, order })) };
}

export function editorNodeStyles(node, viewportMode = "desktop") {
  return viewportMode === "mobile"
    ? { ...(node?.styles || {}), ...(node?.responsive?.mobile || {}) }
    : { ...(node?.styles || {}) };
}

export function sectionMoveAvailability(document, sectionId) {
  const sections = document?.sections || [];
  const index = sections.findIndex((section) => section.id === sectionId);
  return { canMoveUp: index > 0, canMoveDown: index >= 0 && index < sections.length - 1 };
}
