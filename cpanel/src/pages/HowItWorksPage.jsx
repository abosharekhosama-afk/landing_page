import React, { useState, useEffect } from "react";
import { placeholderImage } from "../data/products.js";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";

const fallbackImages = {
  hero: "/products/limescale-remover-hover.jpg",
  concentrate: "/products/limescale-remover-main.jpg",
  steps: "/products/limescale-remover-main.jpg",
  refill: "/images/products/fabric-cleaner.svg",
  cta: "/homepage-categories/car-care.jpg",
  essentials: "/homepage-categories/home-care.jpg",
};

function localize(value, language) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.en || value.ar || "";
}

const copy = {
  en: {
    label: "How it works",
    heroTitle: "How it works",
    heroSubtitle: "Choose the product once, clean with confidence every day.",
    badge: "Over 500+ orders from happy customers",
    rating: "4.85",
    intro: "Cleaning made simple. Choose the right product, use it with confidence, and keep your home, car, and daily spaces fresh with less effort.",
    featureCards: {
      heading: "Cleaning made simple",
      cards: [
        { title: "Choose the right product", text: "Select the cleaner that matches your space and cleaning need." },
        { title: "Use with confidence", text: "Follow simple steps and use each product with less confusion." },
        { title: "Keep spaces fresh", text: "Make home, car, and daily care easier with less effort." },
      ],
    },
    concentrateTitle: "Choose the right product",
    refillTitle: "Refill and reuse",
    ctaTitle: "Goodbye clutter. Hello, easier cleaning.",
    ctaText: "Explore practical EB Chemical products designed for homes, cars, and everyday spaces.",
    ctaButton: "Shop now",
    scheduleTitle: "Set Your Routine",
    scheduleButton: "Explore products",
    scheduleLabels: ["Pick Your Product", "Set Your Routine", "Enjoy Cleaner Spaces"],
    scheduleTabs: [
      {
        label: "Pick Your Essentials",
        title: "Pick Your Essentials",
        text: "Choose the EB Chemical products that match your daily cleaning needs.",
        button: "Explore products",
      },
      {
        label: "Set Your Schedule",
        title: "Set Your Schedule",
        text: "Build a simple cleaning routine for your home, car, and everyday spaces.",
        button: "Start now",
      },
      {
        label: "Enjoy Cleaner Spaces",
        title: "Enjoy Cleaner Spaces",
        text: "Use your products with confidence and keep your spaces fresh with less effort.",
        button: "Shop now",
      },
    ],
    productsTitle: "Popular Products",
    previous: "Previous",
    next: "Next",
    currency: "ILS",
    steps: [
      ["Select", "Choose the product that matches your cleaning need."],
      ["Apply", "Use the product according to the surface or area."],
      ["Clean", "Wipe, rinse, or finish the job with a simple routine."],
    ],
    refillSteps: [
      ["Fill", "Add the product or refill to the bottle."],
      ["Start", "Use it again whenever you need a fresh clean."],
    ],
    tabs: [
      {
        title: "Pick Your Essentials",
        text: "Choose the products you need, add them to your cart, and complete your order easily.",
      },
      {
        title: "Set Your Schedule",
        text: "Set up automatic deliveries so you never run out of your favorite products.",
      },
      {
        title: "Enjoy a Cleaner Life",
        text: "Sit back and enjoy a consistently clean home with less effort and less waste.",
      },
    ],
    subscribeButton: "Subscribe now",
    badges: ["Subscribe & Save 50%", "Seasonal Scent", "Bestseller", "Offer"],
  },
  ar: {
    label: "كيف يعمل",
    heroTitle: "كيف يعمل",
    heroSubtitle: "اختر المنتج المناسب، ونظّف بثقة كل يوم.",
    badge: "أكثر من 500 طلب من عملاء سعداء",
    rating: "٤٫٨٥",
    intro: "تنظيف أسهل بخطوات واضحة. اختر المنتج المناسب، واستخدمه بثقة، وحافظ على منزلك وسيارتك ومساحاتك اليومية نظيفة ومنعشة بجهد أقل.",
    featureCards: {
      heading: "تنظيف أسهل بخطوات واضحة",
      cards: [
        { title: "اختر المنتج المناسب", text: "ابحث عن المنظف الذي يناسب مساحتك واحتياجك." },
        { title: "استخدم بثقة", text: "خطوات بسيطة تساعدك على التنظيف دون ارتباك." },
        { title: "حافظ على المساحات منعشة", text: "اجعل العناية بالمنزل والسيارة والمساحات اليومية أسهل بجهد أقل." },
      ],
    },
    concentrateTitle: "اختر المنتج المناسب",
    refillTitle: "أعد التعبئة والاستخدام",
    ctaTitle: "وداعًا للفوضى. أهلًا بتنظيف أسهل.",
    ctaText: "اكتشف منتجات EB Chemical العملية المصممة للمنازل والسيارات والمساحات اليومية.",
    ctaButton: "تسوق الآن",
    scheduleTitle: "رتّب روتينك",
    scheduleButton: "اكتشف المنتجات",
    scheduleLabels: ["اختر المنتج المناسب", "رتّب روتينك", "استمتع بمساحات أنظف"],
    scheduleTabs: [
      {
        label: "اختر الأساسيات",
        title: "اختر الأساسيات",
        text: "اختر منتجات EB Chemical المناسبة لاحتياجات التنظيف اليومية.",
        button: "اكتشف المنتجات",
      },
      {
        label: "رتّب روتينك",
        title: "رتّب روتينك",
        text: "ابنِ روتين تنظيف بسيط للمنزل والسيارة والمساحات اليومية.",
        button: "ابدأ الآن",
      },
      {
        label: "استمتع بمساحات أنظف",
        title: "استمتع بمساحات أنظف",
        text: "استخدم منتجاتك بثقة وحافظ على مساحاتك منعشة بجهد أقل.",
        button: "تسوق الآن",
      },
    ],
    productsTitle: "المنتجات الشائعة",
    previous: "السابق",
    next: "التالي",
    currency: "شيكل",
    steps: [
      ["اختر", "اختر المنتج المناسب لاحتياج التنظيف."],
      ["استخدم", "استخدم المنتج حسب السطح أو المنطقة."],
      ["نظّف", "امسح أو اشطف أو أكمل المهمة بخطوات بسيطة."],
    ],
    refillSteps: [
      ["عبّئ", "أضف المنتج أو العبوة إلى الزجاجة."],
      ["ابدأ", "استخدمه مرة أخرى عندما تحتاج إلى تنظيف منعش."],
    ],
    tabs: [
      {
        title: "اختر أساسياتك",
        text: "اختر المنتجات التي تحتاجها، أضفها إلى السلة، وأكمل طلبك بسهولة.",
      },
      {
        title: "حدد جدولك",
        text: "اضبط التوصيل التلقائي لضمان عدم نفاد منتجاتك المفضلة.",
      },
      {
        title: "استمتع بحياة أنظف",
        text: "استرخِ واستمتع بمنزل نظيف باستمرار بجهد أقل ونفايات أقل.",
      },
    ],
    subscribeButton: "اشترك الآن",
    badges: ["عرض خاص", "الأكثر مبيعًا", "رائحة موسمية", "وفّر أكثر"],
  },
};

function HowProductCarousel({ language, onViewProduct, products, t }) {
  const isArabic = language === "ar";
  const trackRef = React.useRef(null);
  const [progress, setProgress] = React.useState(0);
  const visibleProducts = products.slice(0, 10);

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

    const card = track.querySelector(".how-product-slide-card");
    const distance = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * 0.85;
    track.scrollBy({
      left: (isArabic ? -direction : direction) * distance,
      behavior: "smooth",
    });
  }

  if (!visibleProducts.length) return null;

  return (
    <section className="how-product-showcase">
      <div className="how-product-showcase-head">
        <h2>{t.productsTitle}</h2>
        <div className="how-product-slider-controls" aria-label={isArabic ? "التحكم بالمنتجات" : "Product slider controls"}>
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

      <div className="how-product-slider-track" onScroll={updateProgress} ref={trackRef}>
        {visibleProducts.map((product, index) => {
          const firstSize = product.sizes?.[0] || { size: "", price: 0 };
          const mainImage = product.image || product.fallbackImage || placeholderImage;
          const hoverImage =
            product.hoverImage ||
            product.secondaryImage ||
            product.gallery?.[1] ||
            product.images?.[1] ||
            mainImage;
          const hasHoverImage = hoverImage && hoverImage !== mainImage;
          const label = localize(product.badge, language) || t.badges[index % t.badges.length];
          const details =
            localize(product.shortDescription, language) ||
            (isArabic ? "حل عملي للعناية اليومية." : "A practical daily-care solution.");
          const productName = localize(product.name, language);

          return (
            <article
              className="how-product-slide-card"
              key={product.id || product.slug || productName}
              style={{ "--stagger": `${index * 70}ms` }}
            >
              <button
                className="how-product-image-wrap"
                onClick={() => onViewProduct?.(product.slug)}
                type="button"
              >
                <span className="how-product-badge">{label}</span>
                <img
                  className="how-product-image-main"
                  alt={productName}
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
                    className="how-product-image-hover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    src={hoverImage}
                  />
                )}
              </button>
              <button className="how-product-slide-copy" onClick={() => onViewProduct?.(product.slug)} type="button">
                <strong>{productName}</strong>
                <span>{details}</span>
                <b>
                  {isArabic ? "من" : "From"} {firstSize.price} {t.currency}
                </b>
              </button>
            </article>
          );
        })}
      </div>

      <div className="how-product-slider-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(progress, 0.18)})` }} />
      </div>
    </section>
  );
}

function HowItWorksPage({ language = "en", onNavigate, onViewProduct, products = [], websiteMedia = [] }) {
  const isArabic = language === "ar";
  const t = copy[isArabic ? "ar" : "en"];
  const scheduleTabs = t.scheduleTabs;
  const [activeScheduleTab, setActiveScheduleTab] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScheduleTab((current) => (current + 1) % scheduleTabs.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [scheduleTabs.length]);
  const image = React.useCallback(
    (key) => getWebsiteMediaImage(websiteMedia, `how_it_works_${key}`, fallbackImages[key]) || fallbackImages[key],
    [websiteMedia]
  );

  return (
    <main className="how-page" dir={isArabic ? "rtl" : "ltr"}>
      <section className="how-hero" data-header-theme="light">
        <img className="how-hero-bg" src={image("hero")} alt="" aria-hidden="true" />
        <div className="how-hero-content">
          <h1 className="how-hero-title">{t.heroTitle}</h1>
          <p className="how-hero-subtitle">{t.heroSubtitle}</p>
          <div className="hero-rating-badge">
            <span className="hero-rating-text">{t.badge}</span>
            <span className="hero-rating-pill">
              <span>{t.rating}</span>
              <span className="hero-rating-star">★</span>
            </span>
          </div>
        </div>
      </section>

      <section className="how-section how-statement">
        <div className="how-feature-cards">
          <h2 className="how-feature-heading">{t.featureCards.heading}</h2>
          {t.featureCards.cards.map((card, i) => (
            <div key={i} className="how-feature-card">
              <h3 className="how-feature-card-title">{card.title}</h3>
              <p className="how-feature-card-text">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="how-process-list">
        <section className="how-section how-process-block">
          <div className="how-process-content">
            <p className="how-process-label">{t.label}</p>
            <h2 className="how-process-title">{t.concentrateTitle}</h2>
            <div className="how-process-steps">
              {t.steps.map(([stepTitle, stepText], index) => (
                <div className="how-process-step" key={stepTitle}>
                  <span className="how-process-step-number">{index + 1}</span>
                  <div className="how-process-step-body">
                    <h3 className="how-process-step-title">{stepTitle}</h3>
                    <p className="how-process-step-text">{stepText}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="how-process-media">
            <img className="how-process-image" src={image("steps")} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.src = placeholderImage; }} />
          </div>
        </section>
        <section className="how-section how-process-block">
          <div className="how-process-content">
            <p className="how-process-label">{t.label}</p>
            <h2 className="how-process-title">{t.refillTitle}</h2>
            <div className="how-process-steps">
              {t.refillSteps.map(([stepTitle, stepText], index) => (
                <div className="how-process-step" key={stepTitle}>
                  <span className="how-process-step-number">{index + 1}</span>
                  <div className="how-process-step-body">
                    <h3 className="how-process-step-title">{stepTitle}</h3>
                    <p className="how-process-step-text">{stepText}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="how-process-media">
            <img className="how-process-image" src={image("refill")} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.src = placeholderImage; }} />
          </div>
        </section>
      </div>

      <div className="how-split-sections">
        <section className="how-split-row">
          <div className="how-split-card how-split-card-dark">
            <h2 className="how-split-title">{t.ctaTitle}</h2>
            <p className="how-split-text">{t.ctaText}</p>
            <button className="how-split-button" type="button" onClick={() => onNavigate?.("products")}>
              {t.ctaButton}
            </button>
          </div>
          <div className="how-split-card how-split-media">
            <img className="how-split-image" src={image("cta")} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.src = placeholderImage; }} />
          </div>
        </section>

        <section className="how-split-row">
          <div className="how-split-card how-split-media">
            <img className="how-split-image" src={image("essentials")} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.src = placeholderImage; }} />
          </div>
          <div className="how-split-card how-split-card-light how-schedule-card">
            <div className="how-schedule-content">
              <h2 className="how-split-title">{scheduleTabs[activeScheduleTab].title}</h2>
              <p className="how-schedule-text">{scheduleTabs[activeScheduleTab].text}</p>
              <button className="how-split-button" type="button" onClick={() => onNavigate?.("products")}>
                {scheduleTabs[activeScheduleTab].button}
              </button>
            </div>
            <div className="how-schedule-tabs">
              {scheduleTabs.map((tab, i) => (
                <button
                  className={`how-schedule-tab${i === activeScheduleTab ? " how-schedule-tab-active" : ""}`}
                  key={i}
                  type="button"
                  onClick={() => { setActiveScheduleTab(i); }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <HowProductCarousel language={language} onViewProduct={onViewProduct} products={products} t={t} />
    </main>
  );
}

export default HowItWorksPage;
