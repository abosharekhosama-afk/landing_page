import React from "react";
import { placeholderImage } from "../data/products.js";
import { categories } from "../data/categories.js";

function ProductCard({ language, product, onAddToCart, onViewProduct, t }) {
  const firstSize = product.sizes[0];
  const category = categories.find((item) => item.id === product.categoryId);
  const description =
    product.shortDescription?.[language] ||
    (language === "ar"
      ? "منتج عملي مصمم لتجربة تنظيف أسهل ونتيجة أفضل."
      : "A practical product designed for easier cleaning and a better result.");

  const mainImage = product.image || placeholderImage;
  const hoverImage =
    product.hoverImage ||
    product.gallery?.[1] ||
    product.images?.[1] ||
    mainImage;
  const hasDistinctHover = hoverImage && hoverImage !== mainImage;

  return (
    <article className="product-card">
      <button
        className="product-image-button product-card-image"
        onClick={() => onViewProduct(product.slug)}
        type="button"
      >
        {product.badge && <span className="product-badge">{product.badge[language]}</span>}
        <img
          alt={product.name[language]}
          className="primary-image"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = product.fallbackImage || placeholderImage;
          }}
          src={mainImage}
        />
        {hasDistinctHover && (
          <img
            aria-hidden="true"
            alt=""
            className="hover-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src={hoverImage}
          />
        )}
      </button>

      <div className="product-card-body">
        <div className="product-meta-row">
          <span>{category?.name[language]}</span>
          <strong>{firstSize.size}</strong>
        </div>
        <h3>{product.name[language]}</h3>
        <p>{description}</p>
        <div className="product-price-row">
          <span>{t("common.from")}</span>
          <strong>
            {firstSize.price} {t("common.ils")}
          </strong>
        </div>
      </div>

      <div className="product-card-footer">
        <button
          className="secondary-action"
          onClick={() => onViewProduct(product.slug)}
          type="button"
        >
          {t("common.details")}
        </button>
        <button
          className="primary-action"
          onClick={() => onAddToCart(product, firstSize.size)}
          type="button"
        >
          {t("common.add")}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
