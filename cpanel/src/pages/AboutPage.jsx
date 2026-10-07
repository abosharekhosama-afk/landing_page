import React from "react";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";

const fallbackImages = {
  hero: "/products/limescale-remover-hover.jpg",
  intro: "/products/limescale-remover-main.jpg",
  banner: "/homepage-categories/home-care.jpg",
  rethinking_clean: "/homepage-categories/home-care.jpg",
  pillar1: "/images/products/limescale-remover.svg",
  pillar2: "/images/products/fabric-cleaner.svg",
  pillar3: "/images/products/car-interior-cleaner.svg",
  cta: "/homepage-categories/car-care.jpg",
  join: "/homepage-categories/car-care.jpg",
  impact: "/homepage-categories/bathroom.jpg",
  stat1: "/images/products/limescale-remover.svg",
  stat2: "/images/products/fabric-cleaner.svg",
  stat3: "/images/products/car-interior-cleaner.svg",
};

const content = {
  en: {
    heroTitle: "We're here to make cleaning simpler",
    heroSubtitle: "Practical cleaning and care products for homes, cars, and everyday spaces.",
    review: "Over 500+ orders from happy customers",
    intro:
      "EB Chemical creates practical cleaning and care products for everyday use. We make home and car care easier, cleaner, and more effective. All built on reliable products and simple routines.",
    rethinkTitle: "Rethinking clean",
    rethinkText:
      "EB Chemical makes everyday cleaning simpler, more reliable, and more effective. We focus on practical products for homes, cars, and daily spaces. Strong results start with clear and easy routines.",
    pillarsTitle: "A cleaner way forward",
    pillarsSubtitle: "What if everyday cleaning could be easier, smarter, and more effective?",
    ctaTitle: "Join us in making cleaning simpler",
    ctaText:
      "We create practical home and car care products designed to make everyday cleaning easier, cleaner, and more reliable.",
    ctaButton: "Discover more",
    impactTitle: "Impact",
    impactMeta1: "MAKING EVERYDAY CLEANING COUNT",
    impactMeta2: "SINCE WE STARTED",
    impactText:
      "Good cleaning results should be practical, visible, and reliable. These numbers represent our commitment to better routines for homes, cars, and everyday spaces.",
  },
  ar: {
    heroTitle: "نحن هنا لجعل التنظيف أسهل",
    heroSubtitle: "منتجات تنظيف وعناية عملية للمنزل والسيارة والمساحات اليومية.",
    review: "أكثر من 500 طلب من عملاء سعداء",
    intro:
      "نطوّر في EB Chemical منتجات تنظيف وعناية عملية للاستخدام اليومي. نهدف لجعل العناية بالمنزل والسيارة أسهل وأنظف وأكثر فعالية. كل ذلك بمنتجات موثوقة وروتين بسيط.",
    rethinkTitle: "إعادة التفكير في التنظيف",
    rethinkText:
      "تأسست EB Chemical لتجعل التنظيف اليومي أسهل وأكثر موثوقية وفعالية. نركز على منتجات عملية للمنازل والسيارات والمساحات اليومية. نتائج قوية تبدأ بروتين بسيط وواضح.",
    pillarsTitle: "طريقة أنظف للأمام",
    pillarsSubtitle: "ماذا لو كان التنظيف اليومي أسهل، أذكى، وأكثر فعالية؟",
    ctaTitle: "انضم إلينا لجعل التنظيف أسهل",
    ctaText:
      "نقدم منتجات عملية للعناية بالمنزل والسيارة، مصممة لجعل التنظيف اليومي أسهل وأنظف وأكثر موثوقية.",
    ctaButton: "اكتشف المزيد",
    impactTitle: "الأثر",
    impactMeta1: "نجعل التنظيف اليومي أكثر قيمة",
    impactMeta2: "منذ أن بدأنا",
    impactText:
      "نتائج التنظيف الجيد يجب أن تكون عملية وواضحة وموثوقة. تمثل هذه الأرقام التزامنا بروتين أفضل للمنازل والسيارات والمساحات اليومية.",
  },
};

const pillars = {
  en: [
    {
      key: "bottle",
      imageKey: "pillar1",
      title: "Better everyday products",
      text: "Practical cleaning products designed to make daily home and car care easier, cleaner, and more reliable.",
      fallbackImage: fallbackImages.pillar1,
    },
    {
      key: "concentrates",
      imageKey: "pillar2",
      title: "Simple routines",
      text: "Clear cleaning solutions that help customers get strong results without complicated steps.",
      fallbackImage: fallbackImages.pillar2,
    },
    {
      key: "materials",
      imageKey: "pillar3",
      title: "Effective care",
      text: "Products made for real daily use across homes, cars, and shared spaces.",
      fallbackImage: fallbackImages.pillar3,
    },
  ],
  ar: [
    {
      key: "bottle",
      imageKey: "pillar1",
      title: "منتجات يومية أفضل",
      text: "منتجات تنظيف عملية مصممة لجعل العناية بالمنزل والسيارة أسهل وأنظف وأكثر موثوقية.",
      fallbackImage: fallbackImages.pillar1,
    },
    {
      key: "concentrates",
      imageKey: "pillar2",
      title: "روتين بسيط",
      text: "حلول تنظيف واضحة تساعد العملاء على الحصول على نتائج قوية بدون خطوات معقدة.",
      fallbackImage: fallbackImages.pillar2,
    },
    {
      key: "materials",
      imageKey: "pillar3",
      title: "عناية فعالة",
      text: "منتجات مناسبة للاستخدام اليومي في المنازل والسيارات والمساحات المشتركة.",
      fallbackImage: fallbackImages.pillar3,
    },
  ],
};

const stats = {
  en: [
    {
      key: "products",
      imageKey: "stat1",
      value: "243k",
      label: "CLEANING ROUTINES SUPPORTED",
      fallbackImage: fallbackImages.stat1,
    },
    {
      key: "orders",
      imageKey: "stat2",
      value: "123kg",
      label: "PRODUCT WASTE REDUCED",
      fallbackImage: fallbackImages.stat2,
    },
    {
      key: "categories",
      imageKey: "stat3",
      value: "123kg",
      label: "EVERYDAY CARE IMPROVED",
      fallbackImage: fallbackImages.stat3,
    },
  ],
  ar: [
    {
      key: "products",
      imageKey: "stat1",
      value: "243k",
      label: "روتين تنظيف مدعوم",
      fallbackImage: fallbackImages.stat1,
    },
    {
      key: "orders",
      imageKey: "stat2",
      value: "123kg",
      label: "تقليل هدر المنتجات",
      fallbackImage: fallbackImages.stat2,
    },
    {
      key: "categories",
      imageKey: "stat3",
      value: "123kg",
      label: "تحسين العناية اليومية",
      fallbackImage: fallbackImages.stat3,
    },
  ],
};

const mobileIntroCards = [
  {
    title: "Practical products",
    text: "Cleaning and care solutions made for homes, cars, and daily spaces.",
  },
  {
    title: "Simple routines",
    text: "Easy-to-use products that make daily cleaning more practical.",
  },
  {
    title: "Reliable results",
    text: "Focused formulas designed to help spaces feel cleaner and fresher.",
  },
];

function AboutPage({ language = "en", onNavigate, websiteMedia = [] }) {
  const isArabic = language === "ar";
  const t = content[isArabic ? "ar" : "en"];
  const items = pillars[isArabic ? "ar" : "en"];
  const numbers = stats[isArabic ? "ar" : "en"];
  const [activePillar, setActivePillar] = React.useState("");

  const image = React.useCallback(
    (key) => getWebsiteMediaImage(websiteMedia, `about_${key}`, fallbackImages[key]) || fallbackImages[key],
    [websiteMedia]
  );

  return (
    <main className="mission-page" dir={isArabic ? "rtl" : "ltr"}>
      <section className="mission-hero" data-header-theme="light">
        <div className="mission-hero-content">
          <h1 className="mission-hero-title">{t.heroTitle}</h1>
          <p className="mission-hero-subtitle">{t.heroSubtitle}</p>
          <div className="mission-review-row">
            <span>{t.review}</span>
            <div className="rating-box">
              <span>4.85</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0L13.09 6.26L20 7.12L14.14 12.17L15.12 19.02L10 15.71L4.87 19.02L5.85 12.17L0 7.12L6.91 6.26L10 0Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
        <picture>
          <source srcSet={image("hero")} type="image/webp" />
          <img className="mission-media" src={image("hero")} alt="" aria-hidden="true" loading="eager" fetchpriority="high" />
        </picture>
      </section>

      <section className="mission-section mission-statement">
        <div className="mission-intro-cards" aria-label="Built for easier everyday cleaning" dir="ltr">
          <h2 className="mission-intro-title">Built for easier everyday cleaning</h2>
          <div className="mission-intro-card-list">
            {mobileIntroCards.map((card) => (
              <article className="mission-intro-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mission-sections-3-4">
        <section className="mission-rethinking">
          <div className="mission-rethinking-content">
            <h2 className="mission-rethinking-title">{t.rethinkTitle}</h2>
            <p className="mission-rethinking-text">{t.rethinkText}</p>
          </div>
          <picture>
            <source srcSet={image("rethinking_clean")} type="image/webp" />
            <img className="mission-rethinking-bg" src={image("rethinking_clean")} alt="" aria-hidden="true" loading="lazy" />
          </picture>
          <div className="mission-rethinking-overlay" />
        </section>

        <section className="mission-forward">
          <div className="mission-forward-inner">
            <div className="mission-forward-header">
              <h2 className="mission-forward-title">{t.pillarsTitle}</h2>
              <p className="mission-forward-subtitle">{t.pillarsSubtitle}</p>
            </div>
            <div className="mission-forward-grid">
              {items.map((item) => {
                const isOpen = activePillar === item.key;
                return (
                  <div
                    className={`mission-forward-card${isOpen ? ' is-open' : ''}`}
                    key={item.key}
                    onClick={() => setActivePillar(isOpen ? '' : item.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePillar(isOpen ? '' : item.key); } }}
                  >
                    <img className="mission-forward-card-image" src={image(item.imageKey) || item.fallbackImage} alt="" aria-hidden="true" loading="lazy" />
                    <div className="mission-forward-card-overlay" />
                    <h3 className="mission-forward-card-title">{item.title}</h3>
                    <div className="mission-forward-card-plus">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3V21" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 12L21 12" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="mission-forward-card-details">
                      <p>{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <section className="mission-section mission-join">
        <div className="mission-join-inner">
          <div className="mission-join-media">
            <picture>
              <source srcSet={image("join")} type="image/webp" />
              <img className="mission-join-image" src={image("join")} alt="" aria-hidden="true" />
            </picture>
          </div>
          <div className="mission-join-content">
            <h2 className="mission-join-title">{t.ctaTitle}</h2>
            <div className="mission-join-text">
              <p>{t.ctaText}</p>
            </div>
            <button className="mission-join-button" type="button" onClick={() => onNavigate?.("sustainability")}>
              {t.ctaButton}
            </button>
          </div>
        </div>
      </section>

      <section className="mission-section mission-impact">
        <div className="mission-impact-inner">
          <div className="mission-impact-header">
            <h2 className="mission-impact-title">{t.impactTitle}</h2>
            <div className="mission-impact-copy">
              <p>{t.impactText}</p>
            </div>
          </div>
          <div className="mission-impact-meta">
            <span>{t.impactMeta1}</span>
            <span>{t.impactMeta2}</span>
          </div>
          <div className="mission-impact-visual">
            <img className="mission-impact-image" src={image("impact")} alt="" aria-hidden="true" />
            <div className="mission-impact-overlay" />
            <div className="mission-impact-stats">
              {numbers.map((stat, i) => (
                <div className={`mission-impact-stat-row mission-impact-stat-pos-${i}`} key={stat.key}>
                  <div className="mission-impact-stat-card">
                    <img className="mission-impact-stat-icon" src={image(stat.imageKey) || stat.fallbackImage} alt="" aria-hidden="true" />
                    <div className="mission-impact-stat-body">
                      <span className="mission-impact-stat-number">{stat.value}</span>
                      <span className="mission-impact-stat-label">{stat.label}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
