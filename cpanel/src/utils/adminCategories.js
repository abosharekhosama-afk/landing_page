export const adminCategoriesStorageKey = "ebAdminCategories";
export const defaultAdminCategories = [];

export function readAdminCategories() {
  return [];
}

export function getSelectableAdminCategories(categoryList, selectedCategoryId = "") {
  const source = Array.isArray(categoryList) ? categoryList : [];
  return source.filter(
    (category) => category
      && (category.isActive !== false && category.active !== false || category.id === selectedCategoryId),
  );
}

// ── Generic catalog hierarchy helpers ────────────────────────────────────────
// Main Categories are top-level categories (no parent); Subcategories are the
// child categories whose parentId points to a Main Category.

function categoryParentId(category) {
  return category?.parentId || category?.parent_id || null;
}

export function isMainCategory(category) {
  return Boolean(category) && !categoryParentId(category);
}

export function getMainCategories(categoryList) {
  const source = Array.isArray(categoryList) ? categoryList : [];
  return source.filter((category) => isMainCategory(category));
}

export function getMainCategoriesForBrand(categoryList, brandId) {
  if (!brandId) return [];
  return getMainCategories(categoryList).filter((category) => String(category.brandId || category.brand_id || "") === String(brandId));
}

export function getSubcategoriesForMain(categoryList, mainCategoryId) {
  const source = Array.isArray(categoryList) ? categoryList : [];
  if (!mainCategoryId) return [];
  return source.filter((category) => categoryParentId(category) === mainCategoryId);
}

export function isCompleteProductHierarchy(product = {}) {
  return Boolean(product?.brandId && product?.mainCategoryId && product?.subcategoryId);
}

export function validateProductHierarchySelection({ brands = [], categories = [], brandId, mainCategoryId, subcategoryId }) {
  if (!brandId) return { ok: false, field: "brandId", messageEn: "Brand is required.", messageAr: "العلامة التجارية مطلوبة." };
  if (!brands.some((brand) => String(brand.id) === String(brandId))) {
    return { ok: false, field: "brandId", messageEn: "Selected brand was not found for this company.", messageAr: "العلامة التجارية المحددة غير موجودة لهذه الشركة." };
  }
  if (!mainCategoryId) return { ok: false, field: "mainCategoryId", messageEn: "Main Category is required.", messageAr: "الفئة الرئيسية مطلوبة." };
  const main = categories.find((category) => String(category.id) === String(mainCategoryId));
  if (!main || !isMainCategory(main)) {
    return { ok: false, field: "mainCategoryId", messageEn: "Selected Main Category was not found.", messageAr: "الفئة الرئيسية المحددة غير موجودة." };
  }
  if (String(main.brandId || main.brand_id || "") !== String(brandId)) {
    return { ok: false, field: "mainCategoryId", messageEn: "Main Category does not belong to the selected Brand.", messageAr: "الفئة الرئيسية لا تنتمي إلى العلامة التجارية المحددة." };
  }
  if (!subcategoryId) return { ok: false, field: "subcategoryId", messageEn: "Subcategory is required.", messageAr: "الفئة الفرعية مطلوبة." };
  const sub = categories.find((category) => String(category.id) === String(subcategoryId));
  if (!sub) return { ok: false, field: "subcategoryId", messageEn: "Selected Subcategory was not found.", messageAr: "الفئة الفرعية المحددة غير موجودة." };
  if (categoryParentId(sub) !== mainCategoryId) {
    return { ok: false, field: "subcategoryId", messageEn: "Subcategory does not belong to the selected Main Category.", messageAr: "الفئة الفرعية لا تنتمي إلى الفئة الرئيسية المحددة." };
  }
  return { ok: true };
}

// Resolves the current Main Category for a product edit. Prefers the explicit
// mainCategoryId, otherwise derives it from the selected subcategory's parent.
export function resolveMainCategoryFor(categoryList, mainCategoryId, subcategoryId) {
  const source = Array.isArray(categoryList) ? categoryList : [];
  if (mainCategoryId) return mainCategoryId;
  const subcategory = subcategoryId && source.find((category) => category.id === subcategoryId);
  return subcategory ? categoryParentId(subcategory) || "" : "";
}
