import React, { useRef } from "react";
import { brand } from "../data/brand.js";
import { categories } from "../data/categories.js";
import { homepageCategoryCards as defaultHomepageCategoryCards } from "../data/homeContent.js";
import { filterHomepageStoreReviews } from "../utils/reviewsUi.js";
import { filterVisibleHomeOffers } from "../utils/homeOffersUi.js";
import HomeOffersCarousel from "../components/HomeOffersCarousel.jsx";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";

const INSTAGRAM_URL = "https://www.instagram.com/eb_chemical";

function getLocalized(value, language) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.en || value.ar || "";
}

function getPromotedProducts(products) {
  const promoted = products.filter((product) => {
    const badgeText = `${getLocalized(product.badge, "en")} ${getLocalized(product.badge, "ar")}`.toLowerCase();
    return (
      product.featured ||
      product.offer ||
      product.bestSeller ||
      product.discount ||
      product.salesCount > 0 ||
      badgeText.includes("best") ||
      badgeText.includes("new") ||
      badgeText.includes("gloss") ||
      badgeText.includes("fresh") ||
      badgeText.includes("الأكثر")
    );
  });

  const seen = new Set();
  return [...promoted, ...products]
    .filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    })
    .slice(0, 10);
}

function isIsolatedProductImage(src = "") {
  return /\.svg(?:\?|$)/i.test(src) || src.includes("/images/products/");
}

function normalizeHomeProductVariants(product = {}) {
  if (!Array.isArray(product?.variants) || !product.variants.length) return [];

  return product.variants.map((variant, index) => ({
    id: variant.id || `${product.id || product.slug || "product"}-variant-${index}`,
    colorName: (variant.color_name || variant.colorName || "Default").trim(),
    colorValue: variant.color_value || variant.colorValue || "",
    size: (variant.size || product.sizes?.[0]?.size || "").trim(),
    price: Number(variant.price || product.sizes?.[0]?.price || 0),
    stock: Math.max(0, Number(variant.stock ?? variant.stockQty ?? product.stockQty ?? 24)),
    image: variant.image_url || variant.imageUrl || variant.image || "",
    sortOrder: Number(variant.sort_order ?? variant.sortOrder ?? index),
  }));
}

function normalizeText(str) {
  return (str || "").toString().trim().toLowerCase();
}

function HomeCommunityGallery({ galleryImages = [] }) {
  const images = galleryImages.filter(Boolean).slice(0, 4);

  if (!images.length) return null;

  return (
    <section className="home-community-section" aria-labelledby="home-community-title">
      <div className="home-community-inner">
        <div className="home-community-heading">
          <h2 id="home-community-title">Welcome to our community</h2>
          <p>So nice to have you here - tag us @ebchemical</p>
        </div>

        <div className="home-community-gallery" aria-label="EB Chemical community gallery">
          {images.map((image, index) => (
            <a
              aria-label="EB Chemical on Instagram"
              className={`home-community-card home-community-card-${index + 1}`}
              href={INSTAGRAM_URL}
              key={`${image}-${index}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <img
                alt="EB Chemical community"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = "/images/products/product-placeholder.svg";
                }}
                src={image}
              />
              <span className="home-community-card-meta">
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                  <rect height="18" rx="5" width="18" x="3" y="3" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1.4" />
                </svg>
                <span>@eb_chemical</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductShowcaseSlider({ language, onViewProduct, products, title, variant = "primary" }) {
  const trackRef = useRef(null);
  const isArabic = language === "ar";
  const [progress, setProgress] = React.useState(0);
  const badgeLabels = isArabic
    ? ["إصدار محدود", "عرض خاص", "الأكثر مبيعًا", "جديد"]
    : ["Limited Edition", "Subscribe & Save 50%", "Best seller", "New arrival"];

  function updateProgress() {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    const currentScroll = Math.abs(track.scrollLeft);
    setProgress(maxScroll > 0 ? Math.min(1, Math.max(0, currentScroll / maxScroll)) : 1);
  }

  function scrollSlider(direction) {
    const track = trackRef.current;
    if (!track) return;

    const card = track.querySelector(".home-product-slide-card");
    const distance = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * 0.85;
    track.scrollBy({
      left: (isArabic ? -direction : direction) * distance,
      behavior: "smooth",
    });
  }

  if (!products.length) return null;

  return (
    <section className={`home-product-showcase home-product-showcase-${variant} storefront-wide-section`}>
      <div className="home-product-showcase-head">
        <h2>{title}</h2>
        <div className="home-product-slider-controls" aria-label={isArabic ? "التحكم بالمنتجات" : "Product slider controls"}>
          <button
            aria-label={isArabic ? "السابق" : "Previous"}
            onClick={() => scrollSlider(-1)}
            type="button"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            aria-label={isArabic ? "التالي" : "Next"}
            onClick={() => scrollSlider(1)}
            type="button"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      <div className="home-product-slider-track" onScroll={updateProgress} ref={trackRef}>
        {products.map((product, index) => {
          const firstSize = product.sizes?.[0] || { size: "", price: 0 };
          const category = categories.find((item) => item.id === product.categoryId);
          const mainImage = product.image || product.fallbackImage || "/images/products/product-placeholder.svg";
          const hoverImage =
            product.hoverImage ||
            product.secondaryImage ||
            product.gallery?.[1] ||
            product.images?.[1] ||
            mainImage;
          const hasHoverImage = hoverImage && hoverImage !== mainImage;
          const label = getLocalized(product.badge, language) || badgeLabels[index % badgeLabels.length];
          const details =
            getLocalized(product.shortDescription, language) ||
            getLocalized(category?.name, language) ||
            (isArabic ? "حل عملي للعناية اليومية." : "A practical daily-care solution.");

          return (
            <article
              className="home-product-slide-card"
              key={product.id}
              style={{ "--stagger": `${index * 70}ms` }}
            >
              <button
                className="home-product-image-wrap"
                onClick={() => onViewProduct(product.slug)}
                type="button"
              >
                <span className="home-product-badge">{label}</span>
                <img
                  className={`home-product-image-main ${
                    isIsolatedProductImage(mainImage) ? "home-product-image-isolated" : "home-product-image-scene"
                  }`}
                  alt={getLocalized(product.name, language)}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = product.fallbackImage || "/images/products/product-placeholder.svg";
                  }}
                  src={mainImage}
                />
                {hasHoverImage && (
                  <img
                    aria-hidden="true"
                    alt=""
                    className={`home-product-image-hover ${
                      isIsolatedProductImage(hoverImage) ? "home-product-image-isolated" : "home-product-image-scene"
                    }`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    src={hoverImage}
                  />
                )}
              </button>
              <button className="home-product-slide-copy" onClick={() => onViewProduct(product.slug)} type="button">
                <strong>{getLocalized(product.name, language)}</strong>
                <span>{details}</span>
                <b>
                  {isArabic ? "من" : "From"} {firstSize.price} {isArabic ? "شيكل" : "ILS"}
                </b>
              </button>
            </article>
          );
        })}
      </div>

      <div className="home-product-slider-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(progress, 0.18)})` }} />
      </div>
    </section>
  );
}

function HowItWorksSplit({ image, language, onNavigate }) {
  const isArabic = language === "ar";
  const steps = isArabic
    ? [
        {
          title: "اختر المنتج المناسب",
          text: "حدد المنتج حسب نوع الاستخدام: المنزل، السيارة، المعطرات، أو ماء الرديتر.",
        },
        {
          title: "استخدمه بطريقة عملية",
          text: "منتجات EB Chemical مصممة لتكون سهلة الاستخدام وتناسب الاستخدام اليومي.",
        },
        {
          title: "احصل على نتيجة أفضل",
          text: "استمتع بنظافة واضحة، رائحة منعشة، وتجربة عناية أكثر ترتيبًا.",
        },
      ]
    : [
        {
          title: "Choose the right product",
          text: "Select the product for your use case: home, car care, fragrances, or radiator water.",
        },
        {
          title: "Use it with ease",
          text: "EB Chemical products are designed to be practical, clear, and suitable for daily use.",
        },
        {
          title: "Get a better result",
          text: "Enjoy visible cleanliness, a fresh scent, and a more organized care routine.",
        },
      ];

  return (
    <section className="how-it-works-section storefront-wide-section">
      <div className="how-it-works-inner">
        {/* Single background image covering the entire section */}
        {image && (
          <img
            alt=""
            className="how-it-works-bg"
            src={image}
            loading="lazy"
          />
        )}

        {/* Glass panel on the right - like Kinfill's frosted glass card */}
        {image && (
          <div className="how-it-works-glass-panel" aria-hidden="true" />
        )}

        {/* Left-side gradient for steps readability */}
        <div className="how-it-works-overlay" aria-hidden="true" />

        {/* Content overlaid on background */}
        <div className="how-it-works-grid">
          {/* Steps - left side */}
          <div className="how-it-works-steps">
            {steps.map((step, index) => (
              <article key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Title + button - right side */}
          <div className="how-it-works-card">
            <p className="eyebrow">{isArabic ? "طريقة الاستخدام" : "How it works"}</p>
            <h2>{isArabic ? "تنظيف أسهل بخطوات بسيطة" : "Easier cleaning in simple steps"}</h2>
            <button className="primary-action large" onClick={() => onNavigate("products")} type="button">
              {isArabic ? "ابدأ التسوق" : "Start shopping"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const fallbackSystemCards = [
  {
    key: "home",
    image: "/homepage-categories/home-care.jpg",
    label: { en: "Home care", ar: "العناية بالمنزل" },
    title: { en: "Daily cleaning made easier", ar: "تنظيف يومي أسهل" },
  },
  {
    key: "car",
    image: "/homepage-categories/car-care.jpg",
    label: { en: "Car care", ar: "العناية بالسيارة" },
    title: { en: "Fresh finish for every ride", ar: "لمسة نظيفة لكل رحلة" },
  },
  {
    key: "kitchen",
    image: "/homepage-categories/kitchen-new.jpg",
    label: { en: "Kitchen", ar: "المطبخ" },
    title: { en: "Cuts grease with less effort", ar: "إزالة الدهون بجهد أقل" },
  },
  {
    key: "bathroom",
    image: "/homepage-categories/kitchen.jpg",
    label: { en: "Bathroom", ar: "الحمام" },
    title: { en: "Shine for sinks and tiles", ar: "لمعان للأحواض والبلاط" },
  },
  {
    key: "laundry",
    image: "/homepage-categories/laundry.jpg",
    label: { en: "Laundry", ar: "الغسيل" },
    title: { en: "Care for fabrics every day", ar: "عناية يومية بالأقمشة" },
  },
];

function CleaningSystemShowcase({ categoryCards = fallbackSystemCards, language }) {
  const isArabic = language === "ar";
  const trackRef = useRef(null);
  const words = isArabic
    ? ["العناية بالمنزل", "العناية بالسيارة", "المطبخ", "الحمام", "الغسيل"]
    : ["home care", "car care", "kitchen", "bathroom", "laundry"];
  const [wordIndex, setWordIndex] = React.useState(0);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % words.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [words.length]);

  function scrollCards(direction) {
    const track = trackRef.current;
    if (!track) return;

    const card = track.querySelector(".cleaning-system-card");
    const distance = card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
    track.scrollBy({
      left: (isArabic ? -direction : direction) * distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="cleaning-system-section storefront-wide-section">
      <div className="cleaning-system-heading-row">
        <h2 className="cleaning-system-title">
          <span className="system-title-fixed">
            {isArabic ? "نظام تنظيف لـ" : "A cleaning system for"}
          </span>
          <span className="system-word-window" aria-live="polite">
            <span className="system-word" key={words[wordIndex]}>
              {words[wordIndex]}
            </span>
          </span>
        </h2>
        <div className="cleaning-system-controls" aria-label={isArabic ? "التحكم بالبطاقات" : "Card controls"}>
          <button
            aria-label={isArabic ? "السابق" : "Previous"}
            onClick={() => scrollCards(-1)}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label={isArabic ? "التالي" : "Next"}
            onClick={() => scrollCards(1)}
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      <div className="cleaning-system-track" ref={trackRef}>
        {categoryCards.map((card) => (
          <article className="cleaning-system-card" key={card.key}>
            <img
              alt={card.title[language]}
              loading="lazy"
              src={card.image}
            />
            <div className="cleaning-system-card-copy">
              <small>{card.label[language]}</small>
              <strong>{card.title[language]}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PurchaseExperienceShowcase({ language, onAddToCart, onViewProduct, product }) {
  const isArabic = language === "ar";
  const options = (product?.sizes || []).slice(0, 3);
  const productVariants = React.useMemo(() => normalizeHomeProductVariants(product), [product]);
  const colorOptions = React.useMemo(() => {
    const colorMap = new Map();
    productVariants
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((variant) => {
        const key = normalizeText(variant.colorName || "Default");
        if (!colorMap.has(key)) colorMap.set(key, variant);
      });
    return Array.from(colorMap.values());
  }, [productVariants]);
  const [selectedSize, setSelectedSize] = React.useState(options[0]?.size || "");
  const [selectedColor, setSelectedColor] = React.useState(colorOptions[0]?.colorName || "Default");
  const [purchaseType, setPurchaseType] = React.useState("once");

  React.useEffect(() => {
    setSelectedSize(options[0]?.size || "");
  }, [product?.id]);

  React.useEffect(() => {
    setSelectedColor((currentColor) =>
      colorOptions.some((option) => normalizeText(option.colorName) === normalizeText(currentColor))
        ? currentColor
        : colorOptions[0]?.colorName || "Default"
    );
  }, [colorOptions]);

  const selectedOption = options.find((option) => option.size === selectedSize) || options[0];
  const selectedColorOption =
    colorOptions.find((option) => normalizeText(option.colorName) === normalizeText(selectedColor)) || colorOptions[0] || null;
  const selectedVariantForCart =
    productVariants.find((variant) => normalizeText(variant.colorName) === normalizeText(selectedColor) && normalizeText(variant.size) === normalizeText(selectedSize)) || null;
  const selectedSizeVariant = productVariants.find((variant) => normalizeText(variant.size) === normalizeText(selectedSize)) || null;
  const selectedColorImage = selectedColorOption?.image || "";
  const image =
    selectedVariantForCart?.image ||
    selectedSizeVariant?.image ||
    selectedColorImage ||
    product?.hoverImage ||
    product?.secondaryImage ||
    product?.images?.[1] ||
    product?.galleryImages?.[1] ||
    product?.image ||
    "/images/products/multi-surface-cleaner.svg";
  const name =
    getLocalized(product?.name, language) ||
    (isArabic ? "منظف متعدد الاستخدامات" : "Every Surface Cleaner");
  const description =
    getLocalized(product?.shortDescription, language) ||
    (isArabic
      ? "منظف عملي للعناية اليومية بالمنزل والسيارة."
      : "A practical cleaner for daily home and car care.");
  const sellingPoints = isArabic
    ? ["مناسب لعدة أسطح", "رائحة نظيفة ومنعشة", "عناية يومية سهلة"]
    : ["Multi-surface use", "Fresh clean scent", "Easy daily care"];

  function handleAddToCart() {
    if (product && onAddToCart) {
      onAddToCart(product, selectedOption?.size || product.sizes?.[0]?.size, selectedVariantForCart);
      return;
    }
    if (product?.slug) onViewProduct(product.slug);
  }

  return (
    <section className="purchase-showcase-section storefront-wide-section">
      <div className="purchase-showcase-copy">
        <div className="product-detail-info-panel home-product-info-preview">
          <div className="pi-section-header">
            <p className="pi-eyebrow">{isArabic ? "تجربة شراء سهلة" : "Purchase experience"}</p>
            <h2>{name}</h2>
            <p className="pi-desc">{description}</p>
          </div>

          {colorOptions.length > 0 && (
            <div className="pi-color-field">
              <p className="pi-label">{isArabic ? "\u0627\u0644\u0644\u0648\u0646" : "Color"}</p>
              <div className="pi-color-card">
                <img
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = "/images/products/product-placeholder.svg";
                  }}
                  src={image}
                />
                <div>
                  <p>{isArabic ? "\u0627\u062e\u062a\u0631 \u0627\u0644\u0644\u0648\u0646" : "Choose your Color"}</p>
                  <div className="pi-color-swatches" role="radiogroup" aria-label={isArabic ? "\u0627\u0644\u0644\u0648\u0646" : "Color"}>
                    {colorOptions.map((option) => (
                      <button
                        aria-checked={selectedColor === option.colorName}
                        aria-label={option.colorName}
                        className={selectedColor === option.colorName ? "pi-color-swatch active" : "pi-color-swatch"}
                        key={option.colorName}
                        onClick={() => setSelectedColor(option.colorName)}
                        role="radio"
                        style={{ background: option.colorValue || "#1db7d8" }}
                        title={option.colorName}
                        type="button"
                      />
                    ))}
                  </div>
                  <span className="pi-color-name">{selectedColor}</span>
                </div>
              </div>
            </div>
          )}

          {options.length > 0 && (
            <div className="pi-card-field">
              <p className="pi-label">{isArabic ? "الأحجام" : "Options"}</p>
              <div className="pi-card-grid two-col">
                {options.map((option) => (
                  <button
                    className={option.size === selectedSize ? "pi-card active" : "pi-card"}
                    key={option.size}
                    onClick={() => setSelectedSize(option.size)}
                    type="button"
                  >
                    <span className="pi-card-value">{option.size}</span>
                    <span className="pi-card-sublabel">
                      {option.price} {isArabic ? "شيكل" : "ILS"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pi-segmented">
            <button
              className={purchaseType === "once" ? "pi-segment active" : "pi-segment"}
              onClick={() => setPurchaseType("once")}
              type="button"
            >
              {isArabic ? "شراء مرة واحدة" : "One-time purchase"}
            </button>
            <button
              className={purchaseType === "bundle" ? "pi-segment active" : "pi-segment"}
              onClick={() => setPurchaseType("bundle")}
              type="button"
            >
              {isArabic ? "وفّر مع العرض" : "Save with bundle"}
            </button>
          </div>

          <div className="pi-cta-bar">
            <span className="pi-price">
              {selectedOption?.price || 0} {isArabic ? "شيكل" : "ILS"}
            </span>
            <button className="pi-add-btn" onClick={handleAddToCart} type="button">
              {isArabic ? "أضف إلى السلة" : "Add to cart"}
            </button>
          </div>

          <ul className="pi-feature-list">
            {sellingPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="purchase-showcase-image" aria-label={name}>
        <img
          alt={name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = "/images/products/product-placeholder.svg";
          }}
          src={image}
        />
      </div>
    </section>
  );
}

function WidePromoBanner({ language, onNavigate, image }) {
  const isArabic = language === "ar";

  return (
    <section className="home-feature-banner-section wide-promo-banner storefront-wide-section">
      <img
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = "/images/products/product-placeholder.svg";
        }}
        src={image || "/images/products/car-shampoo-gloss.svg"}
      />
      <div className="wide-promo-copy">
        <h2>{isArabic ? "عناية منعشة لكل مساحة" : "Fresh care for every space"}</h2>
        <p>{isArabic ? "حلول تنظيف فعّالة للمنزل والسيارة." : "Powerful cleaning solutions for your home and car."}</p>
        <button className="primary-action large" onClick={() => onNavigate("products")} type="button">
          {isArabic ? "تسوق الآن" : "Shop now"}
        </button>
      </div>
    </section>
  );
}

function SplitCategoryBanner({ language, onCategorySelect, products, websiteMedia }) {
  const isArabic = language === "ar";
  const panels = [
    {
      id: "home-cleaning",
      title: isArabic ? "العناية بالمنزل" : "Home Care",
      image:
        getWebsiteMediaImage(
          websiteMedia,
          "homepage_split_home",
          products.find((product) => product.categoryId === "home-cleaning")?.image ||
            "/images/products/multi-surface-cleaner.svg",
        ),
    },
    {
      id: "car-care",
      title: isArabic ? "العناية بالسيارة" : "Car Care",
      image:
        getWebsiteMediaImage(
          websiteMedia,
          "homepage_split_car",
          products.find((product) => product.categoryId === "car-care")?.image ||
            "/images/products/car-interior-cleaner.svg",
        ),
    },
  ];

  return (
    <section className="home-category-cards-section split-category-banner storefront-wide-section">
      {panels.map((panel) => (
        <button
          className="split-category-panel"
          key={panel.id}
          onClick={() => onCategorySelect(panel.id)}
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = "/images/products/product-placeholder.svg";
            }}
            src={panel.image}
          />
          <span>
            <strong>{panel.title}</strong>
            <em>{isArabic ? "اكتشف" : "Discover"}</em>
          </span>
        </button>
      ))}
    </section>
  );
}

function HomePage({
  homepageCategoryCards = defaultHomepageCategoryCards,
  homepageOffers = [],
  homepageOffersStatus = "ready",
  language,
  onAddToCart,
  onCategorySelect,
  onNavigate,
  onRetryOffers,
  onViewProduct,
  products,
  reviews = [],
  t,
  websiteMedia = [],
}) {
  const isArabic = language === "ar";
  const starterProducts = getPromotedProducts(products);
  const essentialsProducts =
    products
      .filter((product) => ["home-cleaning", "car-care"].includes(product.categoryId))
      .slice(0, 10) || products.slice(0, 10);
  const showcaseProduct =
    products.find((product) => product.categoryId === "home-cleaning") ||
    products[0];
  const activeOffers = filterVisibleHomeOffers(homepageOffers);
  const promoImage = getWebsiteMediaImage(
    websiteMedia,
    "homepage_promo_banner",
    activeOffers[0]?.image ||
      products.find((product) => product.categoryId === "car-care")?.image ||
      products[0]?.image,
  );
  const resolvedHomepageCategoryCards = homepageCategoryCards.length
    ? homepageCategoryCards
    : defaultHomepageCategoryCards;
  const mediaCategoryCards = resolvedHomepageCategoryCards.map((card) => ({
    ...card,
    image: getWebsiteMediaImage(websiteMedia, `homepage_category_${card.key}`, card.image),
  }));
  const heroLeftImage = getWebsiteMediaImage(
    websiteMedia,
    "homepage_hero_left",
    "/products/limescale-remover-hover.jpg",
  );
  const heroRightImage = getWebsiteMediaImage(
    websiteMedia,
    "homepage_hero_right",
    "/products/limescale-remover-main.jpg",
  );
  const howItWorksImage = getWebsiteMediaImage(
    websiteMedia,
    "homepage_how_it_works_image",
    "/homepage-categories/home-care.jpg",
  );
  const communityGalleryImages = [
    getWebsiteMediaImage(websiteMedia, "homepage_community_gallery_1", "/homepage-categories/home-care.jpg"),
    getWebsiteMediaImage(websiteMedia, "homepage_community_gallery_2", "/homepage-categories/car-care.jpg"),
    getWebsiteMediaImage(websiteMedia, "homepage_community_gallery_3", "/homepage-categories/kitchen-new.jpg"),
    getWebsiteMediaImage(websiteMedia, "homepage_community_gallery_4", "/homepage-categories/laundry.jpg"),
    getWebsiteMediaImage(websiteMedia, "homepage_community_gallery_5", "/products/limescale-remover-hover.jpg"),
  ];
  const siteReviews = filterHomepageStoreReviews(reviews).filter(
    (review) =>
      review.isActive !== false &&
      review.isApproved !== false &&
      (review.status || "approved") === "approved",
  );

  const avgRating = siteReviews.length
    ? (siteReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / siteReviews.length).toFixed(2)
    : "0.00";
  const reviewCount = siteReviews.length;

  return (
    <div className="storefront-home">
      <section className="hero-section hero-editorial" data-header-theme="light">
        <div className="hero-bg">
          <img src={heroLeftImage} alt={brand.name} className="hero-bg-image" />
        </div>
        <div className="hero-content">
          <p className="eyebrow">{brand.name}</p>
          <h1>{t("home.heroHeadline")}</h1>
          <p>{t("home.heroSubheadline")}</p>
          <div className="hero-actions">
            <button className="primary-action large" onClick={() => onNavigate("products")} type="button">
              {t("home.shopProducts")}
            </button>
            <button className="secondary-action large" onClick={() => onNavigate("products")} type="button">
              {t("home.exploreCategories")}
            </button>
          </div>
        </div>
      </section>

      <HomeOffersCarousel
        language={language}
        offers={homepageOffers}
        onCategorySelect={onCategorySelect}
        onNavigate={onNavigate}
        onRetry={onRetryOffers}
        status={homepageOffersStatus}
      />

      <CleaningSystemShowcase categoryCards={mediaCategoryCards} language={language} />

      <ProductShowcaseSlider
        language={language}
        onViewProduct={onViewProduct}
        products={starterProducts}
        title={language === "ar" ? "مجموعات التنظيف الأساسية" : "Cleaning starter kits"}
        variant="starter"
      />

      <ProductShowcaseSlider
        language={language}
        onViewProduct={onViewProduct}
        products={essentialsProducts.length ? essentialsProducts : products.slice(0, 10)}
        title={language === "ar" ? "أساسيات العناية بالمنزل والسيارة" : "Home & car care essentials"}
        variant="essentials"
      />

      <HowItWorksSplit image={howItWorksImage} language={language} onNavigate={onNavigate} />

      {siteReviews.length > 0 && (
        <section className="reviews-section storefront-section">
          <div className="reviews-heading">
            <h2>{t("reviews.title")}</h2>
            <div className="reviews-summary">
              <span className="reviews-summary-number">{avgRating}</span>
              <span className="reviews-summary-stars" aria-label={`${avgRating} ${isArabic ? "من 5 نجوم" : "out of 5 stars"}`}>
                {"★★★★★"}
              </span>
              <span className="reviews-summary-count">| {reviewCount} {isArabic ? "تقييم" : "reviews"}</span>
            </div>
          </div>
          <div className="reviews-track">
            {siteReviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-stars" aria-label={`${review.rating} stars`}>
                  {"\u2605".repeat(Number(review.rating || 0))}
                </div>
                <p>{getLocalized(review.comment, language)}</p>
                <div>
                  <strong>{review.customerName}</strong>
                  {review.relatedProductName && <span>{review.relatedProductName}</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <PurchaseExperienceShowcase
        language={language}
        onAddToCart={onAddToCart}
        onViewProduct={onViewProduct}
        product={showcaseProduct}
      />

      <WidePromoBanner
        image={promoImage}
        language={language}
        onNavigate={onNavigate}
      />

      <SplitCategoryBanner
        language={language}
        onCategorySelect={onCategorySelect}
        products={products}
        websiteMedia={websiteMedia}
      />

      {false && siteReviews.length > 0 && (
        <section className="reviews-section storefront-section">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">{t("reviews.storeReview")}</p>
              <h2>{t("reviews.title")}</h2>
              <p>{t("reviews.subtitle")}</p>
            </div>
          </div>
          <div className="reviews-track">
            {siteReviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-stars" aria-label={`${review.rating} stars`}>
                  {"★".repeat(Number(review.rating || 0))}
                </div>
                <p>{getLocalized(review.comment, language)}</p>
                <div>
                  <strong>{review.customerName}</strong>
                  {review.relatedProductName && <span>{review.relatedProductName}</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <HomeCommunityGallery galleryImages={communityGalleryImages} />

      <section className="newsletter-band storefront-section">
        <div>
          <p className="eyebrow">{t("nav.social")}</p>
          <h2>{t("home.socialTitle")}</h2>
          <p>{t("home.socialText")}</p>
        </div>
        <button className="primary-action large" onClick={() => onNavigate("follow-us")} type="button">
          {t("home.socialCta")}
        </button>
      </section>
    </div>
  );
}

export default HomePage;
