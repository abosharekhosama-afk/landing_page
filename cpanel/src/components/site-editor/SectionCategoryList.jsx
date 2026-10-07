import React from "react";
import { siteEditorText } from "../../utils/siteEditor.js";
import {
  sectionLibraryBlank,
  sectionLibraryCategories,
  sectionLibraryCategoryKey,
} from "../../utils/siteEditorSectionLibrary.js";

export default function SectionCategoryList({ activeCategoryId, language, onInsertBlank, onSelectCategory, readOnly, sectionLibrary }) {
  const categories = sectionLibraryCategories(sectionLibrary);
  const blank = sectionLibraryBlank(sectionLibrary);
  const insertDisabled = !blank.enabled || readOnly;
  return <div className="site-editor-section-categories">
    {categories.length ? <div className="site-editor-section-category-chips" role="tablist">
      {categories.map((category) => {
        const categoryKey = sectionLibraryCategoryKey(category.id);
        const title = category.title?.[language] || category.title?.en || (categoryKey ? siteEditorText(categoryKey, language) : category.id);
        return <button
          aria-selected={activeCategoryId === category.id}
          className={activeCategoryId === category.id ? "site-editor-category-chip active" : "site-editor-category-chip"}
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          role="tab"
          type="button"
        >{title}</button>;
      })}
    </div> : null}
    <section className="site-editor-section-category">
      <h3>{siteEditorText("addSection.blankSection", language)}</h3>
      <button
        aria-label={siteEditorText("addSection.blankSection", language)}
        className={insertDisabled ? "site-editor-blank-section-card disabled" : "site-editor-blank-section-card"}
        onClick={insertDisabled ? undefined : onInsertBlank}
        type="button"
      >
        <span aria-hidden="true" className="site-editor-blank-section-icon">+</span>
        <span className="site-editor-blank-section-copy">
          <strong>{siteEditorText("addSection.blankSection", language)}</strong>
          <small>{insertDisabled ? siteEditorText("addSection.blankSectionUnavailable", language) : siteEditorText("addSection.blankSectionHint", language)}</small>
        </span>
      </button>
    </section>
  </div>;
}
