import React from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { buildCategoryHierarchy, expandedPathsForSearch, filterCategoryHierarchy } from "../utils/categoryHierarchy.js";

function label(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || value?.ar || "—";
}

export default function CategoriesHierarchy({
  brands,
  canCreate,
  canDelete,
  canUpdate,
  categories,
  language,
  onAddGeneric,
  onAddMain,
  onAddSubcategory,
  onDelete,
  onEdit,
}) {
  const [search, setSearch] = React.useState("");
  const [expandedBrands, setExpandedBrands] = React.useState(() => new Set());
  const [expandedMain, setExpandedMain] = React.useState(() => new Set());
  const hierarchy = React.useMemo(() => buildCategoryHierarchy(brands, categories), [brands, categories]);
  const filtered = React.useMemo(() => filterCategoryHierarchy(hierarchy, search), [hierarchy, search]);
  const searchPaths = React.useMemo(() => expandedPathsForSearch(filtered, search), [filtered, search]);
  const searching = Boolean(search.trim());

  const toggle = (setter, id) => setter((current) => {
    const next = new Set(current);
    if (next.has(String(id))) next.delete(String(id)); else next.add(String(id));
    return next;
  });

  return (
    <section className="admin-panel-card kv-category-manager" data-testid="kids-velvet-category-hierarchy">
      <div className="kv-category-toolbar">
        <label className="admin-search-field">
          <Search size={15} />
          <input aria-label="Search category hierarchy" placeholder={language === "ar" ? "ابحث في العلامات والفئات..." : "Search brands and categories..."} value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {canCreate && <button className="admin-primary-button" onClick={onAddGeneric} type="button">{language === "ar" ? "إضافة فئة" : "Add Category"}</button>}
      </div>

      <div className="kv-category-summary">{hierarchy.length} {language === "ar" ? "علامة تجارية" : "brands"} · {hierarchy.reduce((sum, group) => sum + group.mainCategories.length, 0)} {language === "ar" ? "فئة رئيسية" : "main categories"}</div>

      <div className="kv-category-tree">
        {filtered.map(({ brand, mainCategories }) => {
          const brandOpen = searching ? searchPaths.brandIds.includes(String(brand.id)) : expandedBrands.has(String(brand.id));
          return (
            <section className="kv-category-brand" key={brand.id}>
              <div className="kv-category-brand-row">
                <button aria-expanded={brandOpen} className="kv-category-toggle" onClick={() => toggle(setExpandedBrands, brand.id)} type="button">
                  {brandOpen ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
                  <span>{label(brand.name, language)}</span>
                  <small>{mainCategories.length} {language === "ar" ? "فئة رئيسية" : "main categories"}</small>
                </button>
                {canCreate && <button className="kv-category-add" onClick={() => onAddMain(brand.id)} type="button"><Plus size={15} />{language === "ar" ? "فئة رئيسية" : "Main Category"}</button>}
              </div>
              {brandOpen && <div className="kv-category-main-list">
                {mainCategories.map(({ category, subcategories }) => {
                  const mainOpen = searching ? searchPaths.mainCategoryIds.includes(String(category.id)) : expandedMain.has(String(category.id));
                  return <div className="kv-category-main" key={category.id}>
                    <div className="kv-category-main-row">
                      <button aria-expanded={mainOpen} className="kv-category-toggle" onClick={() => toggle(setExpandedMain, category.id)} type="button">
                        {mainOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <span>{label(category.name, language)}</span>
                        <small>{subcategories.length} {language === "ar" ? "فئة فرعية" : "subcategories"}</small>
                      </button>
                      <div className="row-actions">
                        {canUpdate && <button className="text-action" onClick={() => onEdit(category)} type="button">{language === "ar" ? "تعديل" : "Edit"}</button>}
                        {canCreate && <button className="text-action" onClick={() => onAddSubcategory(category.id)} type="button">{language === "ar" ? "إضافة فرعية" : "Add Subcategory"}</button>}
                        {canDelete && <button className="text-action danger" onClick={() => onDelete(category.id)} type="button">{language === "ar" ? "حذف" : "Delete"}</button>}
                      </div>
                    </div>
                    {mainOpen && <div className="kv-category-sub-list">{subcategories.map((subcategory) => <div className="kv-category-sub-row" key={subcategory.id}>
                      <div><strong>{label(subcategory.name, language)}</strong><small>{language === "ar" ? "الفئة الرئيسية: " : "Parent: "}{label(category.name, language)}</small></div>
                      <div className="row-actions">
                        {canUpdate && <button className="text-action" onClick={() => onEdit(subcategory)} type="button">{language === "ar" ? "تعديل" : "Edit"}</button>}
                        {canDelete && <button className="text-action danger" onClick={() => onDelete(subcategory.id)} type="button">{language === "ar" ? "حذف" : "Delete"}</button>}
                      </div>
                    </div>)}</div>}
                  </div>;
                })}
              </div>}
            </section>
          );
        })}
        {!filtered.length && <div className="kv-category-empty">{language === "ar" ? "لا توجد نتائج مطابقة." : "No matching categories."}</div>}
      </div>
    </section>
  );
}
