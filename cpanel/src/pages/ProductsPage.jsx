import React from "react";
import { categories } from "../data/categories.js";
import { placeholderImage } from "../data/products.js";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";
import { fetchProductListRatings } from "../utils/homeContentApi.js";
import { formatProductListingRating, productListingStarsFilled } from "../utils/reviewsUi.js";

function getLocalized(value, language) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.en || value.ar || "";
}

function getCategoryName(categoryId, language) {
  const category = categories.find((item) => item.id === categoryId);
  return getLocalized(category?.name, language);
}

const SHOP_CATEGORY_ALIASES = {
  all: "All",
  "shop-all": "All",
  cleaning: "home-cleaning",
  "cleaning-products": "home-cleaning",
  "home-care": "home-cleaning",
  "home-cleaners": "home-cleaning",
  "bathroom-cleaners": "bathroom-cleaning",
  fragrance: "fragrances",
  scents: "fragrances",
  "air-fresheners": "fragrances",
  "limited-edition-scent": "fragrances",
  bundles: "bundles-sets",
  sets: "bundles-sets",
  starter: "starter-kits",
  "starter-kit": "starter-kits",
  refills: "refills",
  refill: "refills",
};

function normalizeShopCategoryKey(value) {
  const key = String(value || "All").trim();
  return SHOP_CATEGORY_ALIASES[key] || SHOP_CATEGORY_ALIASES[key.toLowerCase()] || key;
}

function getProductLookupText(product) {
  return [
    product.categoryId,
    product.categoryKey,
    product.slug,
    getLocalized(product.name, "en"),
    getLocalized(product.name, "ar"),
    product.badge && getLocalized(product.badge, "en"),
    product.badge && getLocalized(product.badge, "ar"),
    ...(Array.isArray(product.tags) ? product.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasProductType(product, typeId) {
  return product.detailOptions?.productTypes?.some((type) => type.id === typeId);
}

function hasBulkOrRefillSize(product) {
  return product.sizes?.some((size) => {
    const sizeText = String(size.size || "").toLowerCase();
    return sizeText.includes("5l") || sizeText.includes("18l");
  });
}

function matchesShopCategory(product, categoryConfig) {
  if (!categoryConfig || categoryConfig.productCategoryKeys.includes("all")) {
    return true;
  }

  if (categoryConfig.productCategoryKeys.includes(product.categoryId)) {
    return true;
  }

  if (categoryConfig.matcher?.(product)) {
    return true;
  }

  const lookup = getProductLookupText(product);
  return categoryConfig.productCategoryKeys.some((key) => lookup.includes(String(key).toLowerCase()));
}

function createShopCategoryConfig(allHeroImage, websiteMedia = []) {
  function heroImage(key, fallback) {
    return getWebsiteMediaImage(websiteMedia, `products_hero_${key}`, fallback);
  }
  return {
    All: {
      key: "All",
      label: { en: "All products", ar: "كل المنتجات" },
      title: { en: "A better system for everyday essentials", ar: "نظام أفضل لاحتياجاتك اليومية" },
      subtitle: { en: null, ar: null },
      image: allHeroImage,
      productCategoryKeys: ["all"],
      heroLayout: "shop-all",
    },
    "home-cleaning": {
      key: "home-cleaning",
      label: { en: "Home Cleaners", ar: "منظفات المنزل" },
      title: { en: "Home Cleaners", ar: "منظفات المنزل" },
      subtitle: {
        en: "Practical cleaning products for everyday home care.",
        ar: "منتجات تنظيف عملية للعناية اليومية بالمنزل.",
      },
      image: heroImage("home_cleaning", "/homepage-categories/home-care.jpg"),
      productCategoryKeys: ["home-cleaning", "home-cleaners", "cleaning-products"],
      heroLayout: "home-care",
    },
    "bathroom-cleaning": {
      key: "bathroom-cleaning",
      label: { en: "Bathroom Cleaners", ar: "منظفات الحمام" },
      title: { en: "Bathroom Cleaners", ar: "منظفات الحمام" },
      subtitle: {
        en: "Care for sinks, showers, tiles, and limescale-prone surfaces.",
        ar: "عناية بالمغاسل والدش والبلاط والأسطح المعرضة للتكلسات.",
      },
      image: heroImage("bathroom_cleaning", "/homepage-categories/bathroom.jpg"),
      productCategoryKeys: ["bathroom-cleaning", "bathroom-cleaners"],
      heroLayout: "shop-all",
    },
    "car-care": {
      key: "car-care",
      label: { en: "Car Care", ar: "العناية بالسيارة" },
      title: { en: "Car Care", ar: "العناية بالسيارة" },
      subtitle: {
        en: "Clean, polish, and refresh your car inside and out.",
        ar: "نظّف ولمّع وأنعش سيارتك من الداخل والخارج.",
      },
      image: heroImage("car_care", "/homepage-categories/car-care.jpg"),
      productCategoryKeys: ["car-care"],
      heroLayout: "shop-all",
    },
    accessories: {
      key: "accessories",
      label: { en: "Accessories", ar: "الإكسسوارات" },
      title: { en: "Accessories", ar: "الإكسسوارات" },
      subtitle: {
        en: "Useful add-ons for simpler cleaning routines.",
        ar: "إضافات عملية تجعل روتين التنظيف أسهل.",
      },
      image: heroImage("accessories", "/homepage-categories/kitchen-new.jpg"),
      productCategoryKeys: ["accessories", "accessory"],
      heroLayout: "shop-all",
    },
    "hand-body": {
      key: "hand-body",
      label: { en: "Hand & Body", ar: "العناية بالجسم واليدين" },
      title: { en: "Hand & Body", ar: "العناية بالجسم واليدين" },
      subtitle: {
        en: "Care essentials for hands, body, and daily routines.",
        ar: "أساسيات عناية لليدين والجسم والروتين اليومي.",
      },
      image: heroImage("hand_body", "/homepage-categories/home-care.jpg"),
      productCategoryKeys: ["hand-body", "hand-and-body", "body-care", "hand-care"],
      heroLayout: "shop-all",
    },
    refills: {
      key: "refills",
      label: { en: "Refills", ar: "إعادة التعبئة" },
      title: { en: "Refills", ar: "إعادة التعبئة" },
      subtitle: {
        en: "Larger practical sizes for products you use often.",
        ar: "أحجام عملية أكبر للمنتجات التي تستخدمها باستمرار.",
      },
      image: heroImage("refills", "/products/limescale-remover-hover.jpg"),
      productCategoryKeys: ["refills", "refill"],
      matcher: (product) => hasProductType(product, "refill") || hasBulkOrRefillSize(product),
      heroLayout: "shop-all",
    },
    "bundles-sets": {
      key: "bundles-sets",
      label: { en: "Bundles/Sets", ar: "المجموعات" },
      title: { en: "Bundles/Sets", ar: "المجموعات" },
      subtitle: {
        en: "Grouped essentials for home, car, and everyday care.",
        ar: "أساسيات مجمعة للمنزل والسيارة والعناية اليومية.",
      },
      image: heroImage("bundles_sets", "/homepage-categories/home-care.jpg"),
      productCategoryKeys: ["bundles-sets", "bundles", "sets", "set"],
      matcher: (product) => product.offer || product.discount || getProductLookupText(product).includes("set"),
      heroLayout: "shop-all",
    },
    "starter-kits": {
      key: "starter-kits",
      label: { en: "Starter Kits", ar: "مجموعات البداية" },
      title: { en: "Starter Kits", ar: "مجموعات البداية" },
      subtitle: {
        en: "Everything you need to start a cleaner routine.",
        ar: "كل ما تحتاجه لبدء روتين تنظيف أسهل.",
      },
      image: heroImage("starter_kits", "/products/limescale-remover-main.jpg"),
      productCategoryKeys: ["starter-kits", "starter-kit", "kit"],
      matcher: (product) => {
        const lookup = getProductLookupText(product);
        return hasProductType(product, "starter") || lookup.includes("starter") || lookup.includes("kit");
      },
      heroLayout: "shop-all",
    },
    fragrances: {
      key: "fragrances",
      label: { en: "Fragrances", ar: "المعطرات" },
      title: { en: "Fragrances", ar: "المعطرات" },
      subtitle: {
        en: "Fresh scents made for everyday spaces.",
        ar: "روائح منعشة مصممة للمساحات اليومية.",
      },
      image: heroImage("fragrances", "/images/products/ocean-breeze-home-car-fragrance.svg"),
      productCategoryKeys: ["fragrances", "air-fresheners", "scents"],
      heroLayout: "shop-all",
    },
    "radiator-water": {
      key: "radiator-water",
      label: { en: "Radiator Water", ar: "ماء الرديتر" },
      title: { en: "Radiator Water", ar: "ماء الرديتر" },
      subtitle: {
        en: "Practical radiator water products for daily vehicle care.",
        ar: "منتجات ماء رديتر عملية للعناية اليومية بالسيارة.",
      },
      image: heroImage("radiator_water", "/images/products/green-radiator-water.svg"),
      productCategoryKeys: ["radiator-water"],
      heroLayout: "shop-all",
    },
  };
}

function ShopProductCard({ language, listingRating, onAddToCart, onViewProduct, product, t }) {
  const isArabic = language === "ar";
  const firstSize = product.sizes?.[0] || { size: "", price: 0 };
  const mainImage =
    product.productsPageImage ||
    product.image ||
    product.fallbackImage ||
    placeholderImage;
  const hoverImage =
    product.productsPageHoverImage ||
    product.hoverImage ||
    product.secondaryImage ||
    product.gallery?.[1] ||
    product.images?.[1] ||
    mainImage;
  const hasHoverImage = hoverImage && hoverImage !== mainImage;
  const name = getLocalized(product.name, language);
  const description =
    getLocalized(product.shortDescription, language) ||
    (isArabic
      ? "حل عملي للعناية اليومية والتنظيف."
      : "A practical solution for daily cleaning and care.");
  const badge =
    getLocalized(product.badge, language) ||
    getLocalized(product.tag, language) ||
    getLocalized(product.label, language) ||
    getLocalized(product.categoryLabel, language);
  // Honest rating: derived ONLY from this product's real approved reviews
  // (loaded by the parent via fetchProductListRatings). No stored, default,
  // or fallback rating is ever used — a product without reviews must not
  // look rated. `listingRating === undefined` means still loading.
  const reviewCount = Number(listingRating?.count || 0);
  const averageRating = Number(listingRating?.average || 0);
  const filledStars = productListingStarsFilled(averageRating, reviewCount);
  const ratingSummary =
    listingRating === undefined
      ? ""
      : formatProductListingRating(reviewCount, averageRating, language);
  const ratingLoadingText = isArabic ? "جارٍ تحميل التقييم…" : "Loading rating…";
  const oldPrice = product.oldPrice || product.compareAtPrice || product.wasPrice;

  return (
    <article className={hasHoverImage ? "shop-product-card has-hover-image" : "shop-product-card"}>
      <button
        className="shop-product-image-wrap"
        onClick={() => onViewProduct(product.slug)}
        type="button"
      >
        {badge && <span className="shop-product-badge">{badge}</span>}
        <img
          alt={name}
          className="shop-product-image-main"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = product.fallbackImage || placeholderImage;
          }}
          src={mainImage}
        />
        {hasHoverImage && (
          <img
            aria-hidden="true"
            alt=""
            className="shop-product-image-hover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src={hoverImage}
          />
        )}
      </button>

      <div className="shop-product-info">
        <small>{getCategoryName(product.categoryId, language)}</small>
        <h2>{name}</h2>
        <p>{description}</p>
        <div
          className="shop-product-rating"
          aria-label={listingRating === undefined ? ratingLoadingText : ratingSummary}
        >
          {listingRating === undefined ? (
            <span className="shop-product-review-count">{ratingLoadingText}</span>
          ) : reviewCount > 0 ? (
            <React.Fragment>
              <span className="shop-product-stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg
                    key={index}
                    viewBox="0 0 16 16"
                    focusable="false"
                    style={index < filledStars ? undefined : { color: "#d8d5cd" }}
                  >
                    <path d="M8 1L10.0636 5.75252L15 6.34753L11.339 9.87976L12.3263 15L8 12.4305L3.67376 15L4.661 9.87976L1 6.34753L5.93638 5.75252L8 1Z" />
                  </svg>
                ))}
              </span>
              <span className="shop-product-review-count">({reviewCount})</span>
            </React.Fragment>
          ) : (
            <span className="shop-product-review-count">{ratingSummary}</span>
          )}
        </div>
        <div className="shop-product-price-row">
          <strong>
            {firstSize.price} {t("common.ils")}
          </strong>
          {oldPrice && (
            <del>
              {oldPrice} {t("common.ils")}
            </del>
          )}
        </div>
        <div className="shop-product-actions">
          <button className="secondary-action" onClick={() => onViewProduct(product.slug)} type="button">
            {isArabic ? "تفاصيل أكثر" : "Learn more"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductsPage({
  activeCategory,
  language,
  onAddToCart,
  onCategoryChange,
  onViewProduct,
  products,
  t,
  websiteMedia = [],
}) {
  const isArabic = language === "ar";
  const heroFallbackImage =
    products.find((product) => product.categoryId === "home-cleaning")?.image ||
    products[0]?.image ||
    placeholderImage;
  const allHeroImage = getWebsiteMediaImage(websiteMedia, "products_hero_image", heroFallbackImage);
  const shopCategoryConfig = React.useMemo(
    () => createShopCategoryConfig(allHeroImage, websiteMedia),
    [allHeroImage, websiteMedia]
  );
  const activeCategoryKey = normalizeShopCategoryKey(activeCategory);
  const heroEntry = shopCategoryConfig[activeCategoryKey] || shopCategoryConfig["All"];
  const heroImage = heroEntry.image;
  const heroTitle = isArabic ? heroEntry.title.ar : heroEntry.title.en;
  const heroSubtitle = isArabic ? heroEntry.subtitle.ar : heroEntry.subtitle.en;
  const visibleProducts = products.filter((product) =>
    matchesShopCategory(product, heroEntry)
  );
  // Honest listing ratings: real approved reviews per visible product, loaded
  // anonymously with the shared storefront tenant context. `null` means still
  // loading; a missing entry after load means that product's fetch failed, so
  // its card renders the honest empty state (never a fake rating).
  const [listingRatings, setListingRatings] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    setListingRatings(null);
    const ids = visibleProducts
      .map((product) => String(product?.id || "").trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setListingRatings({});
      return undefined;
    }
    fetchProductListRatings(ids)
      .then((ratings) => {
        if (!cancelled) setListingRatings(ratings);
      })
      .catch(() => {
        if (!cancelled) setListingRatings({});
      });
    return () => {
      cancelled = true;
    };
  }, [products, activeCategoryKey]);
  const filterRows = [
    ["All", "home-cleaning", "hand-body", "car-care", "accessories"],
    ["starter-kits", "refills", "bundles-sets"],
  ].map((row) =>
    row.map((key) => ({
      id: key,
      label: getLocalized(shopCategoryConfig[key].label, language),
    })),
  );

  return (
    <section className="page-shell products-page shop-page">
      {activeCategoryKey === "home-cleaning" && heroEntry.heroLayout === "home-care" ? (
        <section className="collection-hero--home-care">
          <div className="collection-hero--home-care__bg">
            <img className="collection-hero--home-care__image" src={heroImage} alt="" loading="lazy" />
          </div>
          <div className="collection-hero--home-care__overlay" />
          <div className="collection-hero--home-care__content">
            <h1 className="collection-hero--home-care__title">{heroTitle}</h1>
            {heroSubtitle && (
              <div className="collection-hero--home-care__subtitle">
                <p>{heroSubtitle}</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className={`shop-hero-banner${heroEntry.heroLayout === "shop-all" ? " shop-hero-banner--shop-all shop-hero-banner--shop-all-fix" : ""}`}>
          <img
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = placeholderImage;
            }}
            src={heroImage}
          />
          <div className="shop-hero-banner-content">
            <h1>{heroTitle}</h1>
            {heroSubtitle && <p>{heroSubtitle}</p>}
          </div>
        </div>
      )}

      {activeCategoryKey === "home-cleaning" && (
        <section className="homecare-feature-section">
          <div className="homecare-feature-grid">
            <div className="homecare-feature-card">
              <div className="homecare-feature-card__image-col">
                <div className="homecare-feature-card__image-wrap">
                  <img
                    src={getWebsiteMediaImage(websiteMedia, "products_feature_dishsoap", "/products/limescale-remover-main.jpg")}
                    alt="The Dish Soap"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="homecare-feature-card__text-col">
                <h2 className="homecare-feature-card__title">
                  {isArabic ? "سائل غسيل الصحون" : "The Dish Soap"}
                </h2>
                <div className="homecare-feature-card__desc">
                  <p>
                    {isArabic
                      ? "فعّال جدًا ضد الدهون، ولطيف على البشرة. تنظيف عملي وناعم برائحة خفيفة."
                      : "Highly effective against grease, while gentle on your skin. It's an effective, skin-friendly clean with a subtle scent."}
                  </p>
                </div>
                <div className="homecare-feature-card__price">
                  {isArabic ? "18 شيكل" : "₪18"}
                </div>
                <div className="homecare-feature-card__button-row">
                  <button
                    className="homecare-feature-card__btn"
                    type="button"
                    onClick={() => onViewProduct?.("fabric-cleaner")}
                  >
                    {isArabic ? "اعرف المزيد" : "Learn more"}
                  </button>
                </div>
                <div className="homecare-feature-card__colours">
                  <span className="homecare-feature-card__swatch" style={{ background: "#fffff7" }} />
                  <span className="homecare-feature-card__colours-text">
                    {isArabic ? "5 ألوان" : "5 colours"}
                  </span>
                </div>
              </div>
            </div>
            <div className="homecare-feature-side">
              <div className="homecare-feature-side__image-wrap">
                <img
                  className="homecare-feature-side__image"
                  src={getWebsiteMediaImage(websiteMedia, "products_feature_side", "/products/limescale-remover-hover.jpg")}
                  alt=""
                  loading="lazy"
                />
                <div className="homecare-feature-side__note">
                  <p
                    className="homecare-feature-side__note-text"
                    dangerouslySetInnerHTML={{
                      __html: isArabic
                        ? 'أعد التعبئة كل شهر ولا تنفد منتجاتك. اقرأ المزيد عن نظام إعادة التعبئة <a href="/refills">هنا</a>.'
                        : 'Refill every month and never get out of stock. Read more about our refill system <a href="/refills">here</a>.',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="shop-filter-panel" aria-label={t("products.eyebrow")}>
        {filterRows.map((row, rowIndex) => (
          <div
            className={rowIndex === 0 ? "shop-filter-row main" : "shop-filter-row secondary"}
            key={`filter-row-${rowIndex}`}
          >
            {row.map((filter) => (
              <button
                className={activeCategoryKey === filter.id ? "shop-filter-chip active" : "shop-filter-chip"}
                key={filter.id}
                onClick={() => onCategoryChange(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="shop-product-grid">
        {visibleProducts.map((product) => (
          <ShopProductCard
            key={product.id}
            language={language}
            listingRating={
              listingRatings === null
                ? undefined
                : listingRatings[product.id] || { count: 0, average: 0 }
            }
            onAddToCart={onAddToCart}
            onViewProduct={onViewProduct}
            product={product}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

export default ProductsPage;

