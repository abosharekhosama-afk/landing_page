import React from "react";
import { placeholderImage } from "../data/products.js";

function getProductImages(products) {
  const seen = new Set();
  return (products || [])
    .flatMap((product) => [
      product?.hoverImage,
      product?.secondaryImage,
      product?.image,
      product?.galleryImages?.[0],
      product?.gallery?.[0],
    ])
    .filter(Boolean)
    .filter((image) => {
      if (seen.has(image)) return false;
      seen.add(image);
      return true;
    });
}

function FloatingProductCollage({ galleryImages = [], language, products = [] }) {
  const isArabic = language === "ar";
  const fallbackImages = getProductImages(products);
  const images = [...galleryImages, ...fallbackImages, placeholderImage]
    .filter(Boolean)
    .slice(0, 4);

  if (images.length === 0) return null;

  return (
    <section className="community-gallery-section" aria-labelledby="community-gallery-title">
      <div className="community-gallery-heading">
        <h2 id="community-gallery-title">
          {isArabic ? "أهلًا بك في مجتمعنا" : "Welcome to our community"}
        </h2>
        <p>
          {isArabic
            ? "يسعدنا وجودك هنا - شاركنا تجربتك @ebchemical"
            : "So nice to have you here - tag us @ebchemical"}
        </p>
      </div>

      <div
        className="community-gallery-grid"
        aria-label={isArabic ? "صور من مجتمع EB Chemical" : "EB Chemical community gallery"}
      >
        {images.map((image, index) => (
          <figure className={`community-gallery-item community-gallery-item-${index + 1}`} key={`${image}-${index}`}>
            <img
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = placeholderImage;
              }}
              src={image}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}

export default FloatingProductCollage;
