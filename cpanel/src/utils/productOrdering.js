/**
 * Global product ordering helpers (Phase C).
 * sortOrder is the source of truth; ties break on slug then id.
 */

export function compareProductsBySortOrder(a, b) {
  const orderDiff = Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0);
  if (orderDiff !== 0) return orderDiff;
  const slugDiff = String(a?.slug || "").localeCompare(String(b?.slug || ""));
  if (slugDiff !== 0) return slugDiff;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

export function sortProductsBySortOrder(products = []) {
  return [...products].sort(compareProductsBySortOrder);
}

export function productIdsInSortOrder(products = []) {
  return sortProductsBySortOrder(products).map((product) => product.id).filter(Boolean);
}

/**
 * Move an item within a filtered view while preserving positions of
 * products that are not in the filtered id set.
 */
export function moveProductInFilteredOrder(fullOrderedIds, filteredIds, fromIndex, toIndex) {
  const full = Array.isArray(fullOrderedIds) ? [...fullOrderedIds] : [];
  const filtered = Array.isArray(filteredIds) ? [...filteredIds] : [];
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= filtered.length
    || toIndex >= filtered.length
    || fromIndex === toIndex
  ) {
    return full;
  }

  const nextFiltered = [...filtered];
  const [moved] = nextFiltered.splice(fromIndex, 1);
  nextFiltered.splice(toIndex, 0, moved);

  const filteredSet = new Set(filtered);
  let cursor = 0;
  return full.map((id) => {
    if (!filteredSet.has(id)) return id;
    return nextFiltered[cursor++];
  });
}

export function canMoveProductUp(index) {
  return Number(index) > 0;
}

export function canMoveProductDown(index, length) {
  return Number(index) >= 0 && Number(index) < Number(length) - 1;
}
