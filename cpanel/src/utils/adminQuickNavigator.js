function localizedLabel(value, language) {
  return String(value?.[language] || value?.en || value?.ar || "").trim();
}

export function flattenNavigationDestinations(items = [], ancestors = []) {
  return (Array.isArray(items) ? items : []).flatMap((item) => {
    if (!item) return [];
    if (Array.isArray(item.children) && item.children.length) {
      return flattenNavigationDestinations(item.children, [...ancestors, item.label]);
    }
    if (!item.pageKey) return [];
    return [{ ...item, ancestors }];
  });
}

export function normalizeNavigationSearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[\u0640\u064b-\u065f\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function navigationDestinationSearchText(destination) {
  const labels = [destination?.label, ...(destination?.ancestors || [])];
  return normalizeNavigationSearch(
    labels.flatMap((entry) => [localizedLabel(entry, "en"), localizedLabel(entry, "ar")]).join(" "),
  );
}

export function filterNavigationDestinations(destinations, query) {
  const terms = normalizeNavigationSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return Array.isArray(destinations) ? destinations : [];
  return (Array.isArray(destinations) ? destinations : []).filter((destination) => {
    const searchable = navigationDestinationSearchText(destination);
    return terms.every((term) => searchable.includes(term));
  });
}

export function moveNavigatorSelection(currentIndex, direction, resultCount) {
  if (!resultCount) return -1;
  const current = Number.isInteger(currentIndex) && currentIndex >= 0 ? currentIndex : 0;
  const delta = direction === "up" ? -1 : 1;
  return (current + delta + resultCount) % resultCount;
}

export function isEditableNavigationTarget(target) {
  if (!target || typeof target !== "object") return false;
  if (target.dataset?.adminQuickNavigator != null) return false;
  const tagName = String(target.tagName || "").toLowerCase();
  return target.isContentEditable || ["input", "textarea", "select"].includes(tagName);
}

export function isQuickNavigatorShortcut(event) {
  return Boolean(
    event &&
    (event.ctrlKey || event.metaKey) &&
    String(event.key || "").toLowerCase() === "k" &&
    !isEditableNavigationTarget(event.target),
  );
}

export function navigationAncestorLabel(destination, language) {
  return (destination?.ancestors || [])
    .map((entry) => localizedLabel(entry, language))
    .filter(Boolean)
    .join(" › ");
}

export function navigationLabel(destination, language) {
  return localizedLabel(destination?.label, language);
}
