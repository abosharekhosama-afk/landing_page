import React, { useRef } from "react";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";
import { categories } from "../data/categories.js";

const fallbackImages = {
  hero: "/homepage-categories/bathroom.jpg",
  intro: "/homepage-categories/home-care.jpg",
  why: "/homepage-categories/home-care.jpg",
  feature: "/homepage-categories/bathroom.jpg",
  bcorp: "/homepage-categories/bathroom.jpg",
  safe: "/homepage-categories/home-care.jpg",
  performance: "/products/limescale-remover-main.jpg",
  impact: "/homepage-categories/car-care.jpg",
  stat1: "/products/limescale-remover-hover.jpg",
  stat2: "/images/products/fabric-cleaner.svg",
  stat3: "/images/products/grease-oil-remover.svg",
  products: "/products/limescale-remover-main.jpg",
  accordion: "/products/limescale-remover-main.jpg",
  cta: "/homepage-categories/laundry.jpg",
  product: "/homepage-categories/bathroom.jpg",
};

const copy = {
  en: {
    heroTitle: "Refills That Revolutionise",
    heroSubtitle: "Smarter cleaning starts here",
    review: "Over 500+ orders from happy customers",
    intro:
      "Sustainability starts with practical choices. We create reliable cleaning products that help customers use the right solution, reduce waste, and keep spaces fresh with less effort.",
    featureCards: {
      heading: "Sustainability made practical",
      cards: [
        { title: "Smarter choices", text: "Practical cleaning products designed for everyday use." },
        { title: "Less waste", text: "Refill-focused options that help reduce unnecessary packaging." },
        { title: "Fresh spaces", text: "Simple routines that help keep homes, cars, and daily spaces clean." },
      ],
    },
    whyLabel: "Why Choose EB Chemical?",
    designTitle: "Practical products made to last",
    designText:
      "Our cleaning and care products are made for everyday use. They deliver reliable results while reducing waste and keeping routines simple.",
    refillableTitle: "Refillable design to last a lifetime",
    refillableText:
      "Our refillable system is built to reduce waste while keeping performance reliable. Each bottle is designed for repeated use, making it easy to maintain a cleaner routine at home and in the car.",
    fullscreenTitle: "Reliable care for everyday spaces",
    fullscreenText:
      "We focus on practical solutions that keep homes, cars, and daily spaces fresh, clean, and easy to maintain.",
    bCorpTitle: "Committed to quality and care",
    bCorpText:
      "We take responsibility seriously. Every product is formulated with care, using ingredients that are effective yet mindful of the spaces you live and work in.",
    safeTitle: "Safe solutions for daily use",
    safeText:
      "We focus on practical cleaning products that are easy to use and suitable for everyday care.",
    performanceTitle: "Performance you can trust",
    performanceText:
      "Our formulas deliver reliable cleaning results for homes, cars, and everyday spaces. Routines stay simple and practical.",
    impactTitle: "The impact",
    impactText: "Better cleaning should be practical, reliable, and easy to maintain. These numbers reflect our commitment to improving everyday routines.",
    impactMeta1: "Making everyday routines count",
    impactMeta2: "Since we started",
    stat1Value: "243k",
    stat1Label: "CLEANING ROUTINES SUPPORTED",
    stat2Value: "123kg",
    stat2Label: "PRODUCT WASTE REDUCED",
    stat3Value: "123kg",
    stat3Label: "EVERYDAY CARE IMPROVED",
    accordionTitle: "Our products",
    accordionText:
      "EB Chemical creates practical cleaning products that deliver reliable results for homes, cars, and everyday routines.",
    accordion1Title: "Formulated with purpose",
    accordion1Text:
      "Our formulas support effective everyday cleaning. Practical solutions keep spaces fresh, clean, and easy to maintain.",
    accordion2Title: "Practical by design",
    accordion2Text:
      "Our products are simple to use, easy to store, and built for daily cleaning and care.",
    accordion3Title: "Built for everyday use",
    accordion3Text:
      "From home surfaces to car care, EB Chemical products perform reliably across everyday spaces.",
    ctaTitle: "Ready to make the switch?",
    ctaText: "Discover products designed for practical, sustainable living.",
    ctaButton: "Discover products",
    goodbyeTitle: "Goodbye, waste. Hello, refills.",
    goodbyeText: "Discover products with purpose.",
    joinTitle: "Join us in making cleaning simpler",
    joinText:
      "Discover practical EB Chemical products designed to make everyday cleaning easier, cleaner, and more reliable.",
    joinButton: "Discover more",
  },
  ar: {
    heroTitle: "عبوات تعيد تعريف التنظيف",
    heroSubtitle: "تنظيف أذكى يبدأ من هنا",
    review: "أكثر من 500 طلب من عملاء سعداء",
    intro:
      "الاستدامة تبدأ من اختيارات عملية. نقدّم منتجات تنظيف موثوقة تساعد العملاء على استخدام الحل المناسب، وتقليل الهدر، والحفاظ على المساحات منعشة بجهد أقل.",
    featureCards: {
      heading: "الاستدامة بشكل عملي",
      cards: [
        { title: "خيارات أذكى", text: "منتجات تنظيف موثوقة مصممة للاستخدام اليومي." },
        { title: "هدر أقل", text: "حلول قابلة لإعادة التعبئة تساعد في تقليل التغليف غير الضروري." },
        { title: "مساحات منعشة", text: "روتين عناية بسيط للمنازل والسيارات والمساحات اليومية." },
      ],
    },
    whyLabel: "لماذا تختار EB Chemical؟",
    designTitle: "منتجات عملية تدوم أكثر",
    designText:
      "صُممت منتجاتنا للاستخدام اليومي. تمنحك نتائج موثوقة مع تقليل الهدر والحفاظ على روتين بسيط.",
    refillableTitle: "تصميم قابل لإعادة الاستخدام ليدوم مدى الحياة",
    refillableText:
      "نظام إعادة التعبئة لدينا مصمم لتقليل الهدر مع الحفاظ على أداء موثوق. كل عبوة مصممة للاستخدام المتكرر، مما يسهل الحفاظ على روتين نظيف في المنزل والسيارة.",
    fullscreenTitle: "عناية موثوقة للمساحات اليومية",
    fullscreenText:
      "نركّز على حلول عملية تحافظ على المنازل والسيارات والمساحات اليومية نظيفة ومنعشة وسهلة العناية.",
    bCorpTitle: "ملتزمون بالجودة والرعاية",
    bCorpText:
      "نحن نأخذ المسؤولية على محمل الجد. كل منتج يتم تركيبه بعناية، باستخدام مكونات فعالة ومراعية للمساحات التي تعيش وتعمل فيها.",
    safeTitle: "حلول آمنة للاستخدام اليومي",
    safeText:
      "نركّز على منتجات تنظيف عملية وسهلة الاستخدام ومناسبة للعناية اليومية.",
    performanceTitle: "أداء يمكنك الوثوق به",
    performanceText:
      "تقدم تركيباتنا نتائج تنظيف موثوقة للمنازل والسيارات والمساحات اليومية. روتينك يبقى بسيطاً وعملياً.",
    impactTitle: "الأثر",
    impactText: "التنظيف الأفضل يجب أن يكون عملياً وموثوقاً وأسهل في الاستمرار. تعكس هذه الأرقام التزامنا بتحسين الروتين اليومي.",
    impactMeta1: "نجعل الروتين اليومي أكثر قيمة",
    impactMeta2: "منذ أن بدأنا",
    stat1Value: "243 ألف",
    stat1Label: "روتين تنظيف مدعوم",
    stat2Value: "123 كجم",
    stat2Label: "تقليل هدر المنتجات",
    stat3Value: "123 كجم",
    stat3Label: "تحسين العناية اليومية",
    accordionTitle: "منتجاتنا",
    accordionText:
      "نقدّم في EB Chemical منتجات تنظيف عملية تمنح نتائج موثوقة للمنازل والسيارات والروتين اليومي.",
    accordion1Title: "تركيبات هادفة",
    accordion1Text:
      "تركيباتنا تدعم التنظيف اليومي الفعّال. حلول عملية تحافظ على المساحات نظيفة ومنعشة وسهلة العناية.",
    accordion2Title: "تصميم عملي",
    accordion2Text:
      "منتجاتنا سهلة الاستخدام، بسيطة التخزين، ومصممة للعناية اليومية.",
    accordion3Title: "مصممة للاستخدام اليومي",
    accordion3Text:
      "من أسطح المنزل إلى العناية بالسيارة، منتجات EB Chemical تؤدي بموثوقية في كل المساحات اليومية.",
    ctaTitle: "مستعد للتبديل؟",
    ctaText: "اكتشف منتجات مصممة لحياة عملية ومستدامة.",
    ctaButton: "اكتشف المنتجات",
    goodbyeTitle: "وداعًا للهدر. مرحبًا بإعادة التعبئة.",
    goodbyeText: "اكتشف منتجات ذات هدف.",
    joinTitle: "انضم إلينا لجعل التنظيف أسهل",
    joinText:
      "اكتشف منتجات EB Chemical العملية المصممة لجعل التنظيف اليومي أسهل وأنظف وأكثر موثوقية.",
    joinButton: "اكتشف المزيد",
  },
};

function SustainabilityAccordion({ items }) {
  const [active, setActive] = React.useState(0);

  return (
    <div className="sustainability-accordion">
      {items.map(([title, text], index) => (
        <article key={title} className={active === index ? "is-open" : ""}>
          <button type="button" onClick={() => setActive(active === index ? -1 : index)}>
            <span>{title}</span>
            <span>{active === index ? "−" : "+"}</span>
          </button>
          <div className="sustainability-accordion-content" style={{ maxHeight: active === index ? "200px" : "0", overflow: "hidden", transition: "max-height 0.3s ease" }}>
            <p>{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductsAccordion({ items }) {
  const [active, setActive] = React.useState(0);

  return (
    <div className="sustainability-products-section-accordion">
      {items.map(([title, text], index) => (
        <div key={title} className={`sustainability-products-section-row ${active === index ? "active" : ""}`}>
          <button type="button" className="sustainability-products-section-trigger" onClick={() => setActive(active === index ? -1 : index)}>
            <span>{title}</span>
            <span className="sustainability-products-section-icon">
              <svg className="sustainability-products-section-icon-svg" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V14" stroke="currentColor" strokeWidth="1"/>
                <path d="M14 8L2 8" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </span>
          </button>
          <div className="sustainability-products-section-panel">
            <p>{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getLocalized(value, language) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.en || value.ar || "";
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
                  className="home-product-image-main"
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
                    className="home-product-image-hover"
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

function SustainabilityPage({ language = "en", onNavigate, onViewProduct, products = [], websiteMedia = [] }) {
  const isArabic = language === "ar";
  const t = copy[isArabic ? "ar" : "en"];

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

  const starterProducts = getPromotedProducts(products);

  const image = React.useCallback(
    (key) => getWebsiteMediaImage(websiteMedia, `sustainability_${key}`, fallbackImages[key]) || fallbackImages[key],
    [websiteMedia]
  );

  const accordionItems = [
    [t.accordion1Title, t.accordion1Text],
    [t.accordion2Title, t.accordion2Text],
    [t.accordion3Title, t.accordion3Text],
  ];

  const impactStats = [
    { value: t.stat1Value, label: t.stat1Label, img: image("stat1") },
    { value: t.stat2Value, label: t.stat2Label, img: image("stat2") },
    { value: t.stat3Value, label: t.stat3Label, img: image("stat3") },
  ];

  const featuredProduct = products?.[0] || null;

  return (
    <>
      <main className="sustainability-page" dir={isArabic ? "rtl" : "ltr"}>
        <section className="sustainability-hero" data-header-theme="light">
          <picture>
            <img className="sustainability-media" src={image("hero")} alt="" aria-hidden="true" />
          </picture>
          <div className="sustainability-hero-content">
            <h1 className="sustainability-hero-title">{t.heroTitle}</h1>
            <p className="sustainability-hero-subtitle">{t.heroSubtitle}</p>
            <div className="hero-rating-badge">
              <span className="hero-rating-text">{t.review}</span>
              <span className="hero-rating-pill">
                <span>4.85</span>
                <span className="hero-rating-star">★</span>
              </span>
            </div>
          </div>
        </section>

        <section className="sustainability-statement">
          <div className="sustainability-feature-cards">
            <h2 className="sustainability-feature-heading">{t.featureCards.heading}</h2>
            {t.featureCards.cards.map((card, i) => (
              <div key={i} className="sustainability-feature-card">
                <h3 className="sustainability-feature-card-title">{card.title}</h3>
                <p className="sustainability-feature-card-text">{card.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sustainability-why">
          <div className="sustainability-why-card">
            <div className="sustainability-why-content">
              <h2 className="sustainability-why-title">{t.whyLabel}</h2>
            </div>
            <img className="sustainability-why-image" src={image("intro")} alt="" aria-hidden="true" loading="lazy" />
          </div>
        </section>

        <section className="sustainability-design">
          <h2 className="sustainability-design-title">{t.designTitle}</h2>
          <p className="sustainability-design-text">{t.designText}</p>
        </section>
      </main>

      <section className="sustainability-fullscreen" dir={isArabic ? "rtl" : "ltr"}>
        <img className="sustainability-fullscreen-image" src={image("feature")} alt="" aria-hidden="true" />
        <div className="sustainability-fullscreen-content">
          <h2 className="sustainability-fullscreen-title">{t.fullscreenTitle}</h2>
          <p className="sustainability-fullscreen-text">{t.fullscreenText}</p>
        </div>
      </section>

      <main className="sustainability-page" dir={isArabic ? "rtl" : "ltr"}>
        <div className="sustainability-connected-sections">

          <section className="sustainability-safe">
            <img className="sustainability-safe-image" src={image("safe")} alt="" aria-hidden="true" />
            <div className="sustainability-safe-overlay" />
            <div className="sustainability-safe-copy">
              <h2 className="sustainability-safe-title">{t.safeTitle}</h2>
              <p className="sustainability-safe-text">{t.safeText}</p>
            </div>
          </section>

          <section className="sustainability-performance">
            <div className="sustainability-performance-inner">
              <div className="sustainability-performance-media">
                <img src={image("performance")} alt="" aria-hidden="true" />
              </div>
              <div className="sustainability-performance-copy">
                <h2 className="sustainability-performance-title">{t.performanceTitle}</h2>
                <p className="sustainability-performance-text">{t.performanceText}</p>
              </div>
            </div>
          </section>

          <div className="sustainability-mission-section">
          <section className="mission-section-9-inner">
            <div className="mission-9-header">
              <h2 className="mission-9-title">{t.impactTitle}</h2>
              <div className="mission-9-copy">
                <p>{t.impactText}</p>
              </div>
            </div>
            <div className="mission-9-meta">
              <span>{t.impactMeta1}</span>
              <span>{t.impactMeta2}</span>
            </div>
            <div className="mission-9-visual">
              <img className="mission-9-bg" src={image("impact")} alt="" aria-hidden="true" />
              <div className="mission-9-overlay" />
              <div className="mission-9-stats">
                {impactStats.map((stat, i) => (
                  <div className={`mission-9-stat-row mission-9-stat-pos-${i}`} key={stat.label}>
                    <div className="mission-9-stat-card">
                      <img className="mission-9-stat-icon" src={stat.img} alt="" aria-hidden="true" />
                      <div className="mission-9-stat-body">
                        <span className="mission-9-stat-number">{stat.value}</span>
                        <span className="mission-9-stat-label">{stat.label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

          <ProductShowcaseSlider
            language={language}
            onViewProduct={onViewProduct}
            products={starterProducts}
            title={isArabic ? "مجموعات التنظيف الأساسية" : "Cleaning starter kits"}
            variant="starter"
          />

        </div>

          <section className="sustainability-products-section">
            <div className="sustainability-products-section-inner">
              <div className="sustainability-products-section-content">
                <h2 className="sustainability-products-section-title">{t.accordionTitle}</h2>
                <p className="sustainability-products-section-text">{t.accordionText}</p>
                <ProductsAccordion items={accordionItems} />
              </div>
              <div className="sustainability-products-section-media">
                <div className="sustainability-products-section-image-wrap">
                  <img className="sustainability-products-section-img" src={image("products")} alt="" aria-hidden="true" loading="lazy" />
                </div>
              </div>
            </div>
          </section>

          <section className="sustainability-discover-cta">
            <div className="sustainability-discover-cta-inner">
              <div className="sustainability-discover-cta-content">
                <button
                  className="sustainability-discover-cta-btn"
                  type="button"
                  onClick={() => onNavigate("products")}
                >
                  {isArabic ? "اكتشف المنتجات" : "Discover products"}
                </button>
              </div>
              <img
                className="sustainability-discover-cta-img"
                src={image("cta")}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
              <div className="sustainability-discover-cta-overlay" />
            </div>
          </section>

          <section className="sustainability-split-product-cta">
            <div className="sustainability-split-product-cta-inner">
              <a
                className="sustainability-split-product-cta-right"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (featuredProduct?.slug) onViewProduct(featuredProduct.slug);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (featuredProduct?.slug) onViewProduct(featuredProduct.slug);
                  }
                }}
              >
                <div className="sustainability-split-product-cta-image-wrap">
                  <img
                    className="sustainability-split-product-cta-image"
                    src={image("product")}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                  />
                </div>
                <div className="sustainability-split-product-cta-callout">
                  <div className="sustainability-split-product-cta-callout-dot" />
                  <div className="sustainability-split-product-cta-callout-line" />
                  <div className="sustainability-split-product-cta-callout-card">
                    <img
                      className="sustainability-split-product-cta-callout-thumb"
                      src={featuredProduct?.image || "/images/products/product-placeholder.svg"}
                      alt=""
                      loading="lazy"
                    />
                    <div className="sustainability-split-product-cta-callout-info">
                      <span className="sustainability-split-product-cta-callout-name">
                        {getLocalized(featuredProduct?.name, language) || (isArabic ? "منظف متعدد الأسطح" : "Multi Surface Cleaner")}
                      </span>
                      <span className="sustainability-split-product-cta-callout-price">
                        {featuredProduct?.sizes?.[0]?.price ? `${featuredProduct.sizes[0].price} ${isArabic ? "شيكل" : "ILS"}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </a>

              <div className="sustainability-split-product-cta-left">
                <div className="sustainability-split-product-cta-left-content">
                  <h2 className="sustainability-split-product-cta-heading">
                    {isArabic ? "وداعًا للهدر. أهلاً بمنتجات عناية مصممة بهدف." : "Goodbye, waste. Hello, care products made with purpose."}
                  </h2>
                  <p className="sustainability-split-product-cta-subtitle">
                    {isArabic ? "اكتشف منتجات EB Chemical العملية للتنظيف والعناية اليومية." : "Explore practical EB Chemical products for everyday cleaning and care."}
                  </p>
                  <button
                    className="sustainability-split-product-cta-btn"
                    type="button"
                    onClick={() => onNavigate("products")}
                  >
                    {isArabic ? "المنظفات" : "Cleaners"}
                  </button>
                </div>
              </div>
            </div>
          </section>

      </main>
    </>
  );
}

export default SustainabilityPage;
