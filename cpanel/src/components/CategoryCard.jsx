import React from "react";

function CategoryCard({ category, language, productCount, onSelect, t }) {
  return (
    <button
      className="category-card"
      onClick={() => onSelect(category.id)}
      type="button"
    >
      <span>{category.accent[language]}</span>
      <h3>{category.name[language]}</h3>
      <p>{category.description[language]}</p>
      <strong>
        {productCount} {t("nav.products")}
      </strong>
    </button>
  );
}

export default CategoryCard;
