function parentIdOf(category) {
  return category?.parentId || category?.parent_id || null;
}

function brandIdOf(category) {
  return category?.brandId || category?.brand_id || null;
}

function searchableName(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return Object.values(value).filter(Boolean).join(" ");
}

export function visibleCategoriesForTenant(categories, companyId) {
  const source = Array.isArray(categories) ? categories : [];
  if (companyId !== "kids-velvet") return source;
  return source.filter((category) => parentIdOf(category) || brandIdOf(category));
}

export function buildCategoryHierarchy(brands, categories) {
  const source = visibleCategoriesForTenant(categories, "kids-velvet");
  const mainCategories = source.filter((category) => !parentIdOf(category) && brandIdOf(category));
  const childrenByParent = new Map();

  source.filter((category) => parentIdOf(category)).forEach((category) => {
    const parentId = parentIdOf(category);
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) || []), category]);
  });

  return (Array.isArray(brands) ? brands : []).map((brand) => ({
    brand,
    mainCategories: mainCategories
      .filter((category) => String(brandIdOf(category)) === String(brand.id))
      .map((category) => ({ category, subcategories: childrenByParent.get(category.id) || [] })),
  }));
}

export function filterCategoryHierarchy(hierarchy, searchTerm) {
  const term = String(searchTerm || "").trim().toLocaleLowerCase();
  if (!term) return hierarchy;

  return hierarchy.flatMap((brandGroup) => {
    const brandMatches = searchableName(brandGroup.brand?.name).toLocaleLowerCase().includes(term);
    const mainCategories = brandGroup.mainCategories.flatMap((mainGroup) => {
      const mainMatches = searchableName(mainGroup.category?.name).toLocaleLowerCase().includes(term);
      const matchingSubcategories = mainGroup.subcategories.filter((subcategory) =>
        searchableName(subcategory?.name).toLocaleLowerCase().includes(term),
      );
      if (!brandMatches && !mainMatches && matchingSubcategories.length === 0) return [];
      return [{
        ...mainGroup,
        subcategories: brandMatches || mainMatches ? mainGroup.subcategories : matchingSubcategories,
      }];
    });
    if (!brandMatches && mainCategories.length === 0) return [];
    return [{ ...brandGroup, mainCategories: brandMatches ? brandGroup.mainCategories : mainCategories }];
  });
}

export function expandedPathsForSearch(hierarchy, searchTerm) {
  if (!String(searchTerm || "").trim()) return { brandIds: [], mainCategoryIds: [] };
  return {
    brandIds: hierarchy.map((group) => String(group.brand.id)),
    mainCategoryIds: hierarchy.flatMap((group) => group.mainCategories.map((main) => String(main.category.id))),
  };
}
