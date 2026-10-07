import React from "react";
import { getWebsiteMediaImage } from "../data/websiteMedia.js";

const cleanupImages = {
  hero: "/homepage-categories/home-care.jpg",
  galleryOne: "/homepage-categories/home-care.jpg",
  galleryTwo: "/homepage-categories/kitchen.jpg",
  galleryThree: "/homepage-categories/laundry.jpg",
  galleryFour: "/homepage-categories/car-care.jpg",
  galleryFive: "/homepage-categories/bathroom.jpg",
  gallerySix: "/homepage-categories/home-care.jpg",
  cta: "/images/products/carpet-rug-cleaner.svg",
  community: "/images/products/porcelain-ceramic-floor-cleaner.svg",
  collaborations: "/images/products/limescale-remover.svg",
  locations: "/images/products/green-radiator-water.svg",
};

const content = {
  en: {
    heroTitle: "We started with your home, and we're helping clean the spaces around it.",
    heroText:
      "EB Chemical creates practical cleaning products for everyday spaces. We focus on cleaner homes, cars, and shared environments.",
    galleryTitle: "CleanUps",
    ctaTitle: "Sign up for the next CleanUp",
    ctaText:
      "Sign up to be the first to know about our upcoming CleanUp events in Ramallah and across Palestine. We organize community activities regularly. You'll receive all updates and details directly to your inbox.",
    signUp: "Sign up",
    gallery: [
      {
        location: "Gaza, Palestine",
        title: "EB Chemical Community CleanUp",
        image: cleanupImages.galleryOne,
      },
      {
        location: "Nablus, Palestine",
        title: "Care Products Team CleanUp",
        image: cleanupImages.galleryTwo,
      },
      {
        location: "Ramallah, Palestine",
        title: "Shared Spaces CleanUp",
        image: cleanupImages.galleryThree,
      },
      {
        location: "Palestine",
        title: "Everyday Cleaning Awareness Day",
        image: cleanupImages.galleryFour,
      },
      {
        location: "Hebron, Palestine",
        title: "Home Care CleanUp Day",
        image: cleanupImages.galleryFive,
      },
      {
        location: "Bethlehem, Palestine",
        title: "Cleaner Streets Awareness Event",
        image: cleanupImages.gallerySix,
      },
    ],
    tabs: [
      {
        key: "community",
        label: "Community",
        title: "Community",
        description:
          "Cleaner spaces start with people. EB Chemical supports community-driven cleaning efforts that bring people together for practical care.",
        button: "Join us",
        buttonAction: "follow-us",
        image: cleanupImages.community,
      },
      {
        key: "collaborations",
        label: "Collaborations",
        title: "Collaborations",
        description:
          "Interested in hosting a CleanUp event with EB Chemical? Send us a message and let's work together to create cleaner shared spaces.",
        button: "Sign up",
        buttonAction: "follow-us",
        image: cleanupImages.collaborations,
      },
      {
        key: "locations",
        label: "Locations",
        title: "Locations",
        description:
          "We focus on everyday spaces where cleaning matters most. From homes and workplaces to cars, shops, and shared environments.",
        button: "Explore locations",
        buttonAction: "products",
        image: cleanupImages.locations,
      },
    ],
  },
  ar: {
    heroTitle: "بدأنا من منزلك، ونساعد في تنظيف المساحات من حولك.",
    heroText:
      "تقدّم EB Chemical منتجات تنظيف عملية للمساحات اليومية. نركّز على منازل وسيارات وبيئات مشتركة أكثر نظافة.",
    galleryTitle: "حملات التنظيف",
    ctaTitle: "سجّل في حملة التنظيف القادمة",
    ctaText:
      "سجّل لتكون أول من يعرف عن حملات التنظيف القادمة في رام الله والداخل الفلسطيني. ننظم مبادرات مجتمعية بشكل دوري. وستصلك جميع التفاصيل والتحديثات مباشرة.",
    signUp: "سجّل الآن",
    gallery: [
      {
        location: "غزة، فلسطين",
        title: "حملة تنظيف مجتمعية من EB Chemical",
        image: cleanupImages.galleryOne,
      },
      {
        location: "نابلس، فلسطين",
        title: "حملة تنظيف فريق منتجات العناية",
        image: cleanupImages.galleryTwo,
      },
      {
        location: "رام الله، فلسطين",
        title: "حملة تنظيف المساحات المشتركة",
        image: cleanupImages.galleryThree,
      },
      {
        location: "فلسطين",
        title: "يوم التوعية بالتنظيف اليومي",
        image: cleanupImages.galleryFour,
      },
      {
        location: "الخليل، فلسطين",
        title: "يوم تنظيف العناية المنزلية",
        image: cleanupImages.galleryFive,
      },
      {
        location: "بيت لحم، فلسطين",
        title: "فعالية التوعية بشوارع أنظف",
        image: cleanupImages.gallerySix,
      },
    ],
    tabs: [
      {
        key: "community",
        label: "المجتمع",
        title: "المجتمع",
        description:
          "المساحات الأنظف تبدأ من الناس. تدعم EB Chemical جهود التنظيف المجتمعية التي تجمع الناس للعناية العملية.",
        button: "انضم إلينا",
        buttonAction: "follow-us",
        image: cleanupImages.community,
      },
      {
        key: "collaborations",
        label: "التعاونات",
        title: "التعاونات",
        description:
          "هل ترغب في تنظيم فعالية تنظيف مع EB Chemical؟ أرسل لنا رسالة لنعمل معًا على إنشاء مساحات مشتركة أكثر نظافة.",
        button: "سجّل الآن",
        buttonAction: "follow-us",
        image: cleanupImages.collaborations,
      },
      {
        key: "locations",
        label: "المواقع",
        title: "المواقع",
        description:
          "نركّز على المساحات اليومية التي يكون فيها التنظيف مهمًا. من المنازل وأماكن العمل إلى السيارات والمتاجر والبيئات المشتركة.",
        button: "استكشف المواقع",
        buttonAction: "products",
        image: cleanupImages.locations,
      },
    ],
  },
};

function CleanupsPage({ language = "en", onNavigate, websiteMedia = [] }) {
  const isArabic = language === "ar";
  const text = content[language] || content.en;
  const gallery = text.gallery.map((item, index) => ({
    ...item,
    image: getWebsiteMediaImage(websiteMedia, `cleanups_gallery_${index + 1}`, item.image),
  }));
  const tabs = text.tabs.map((tab) => ({
    ...tab,
    image: getWebsiteMediaImage(websiteMedia, `cleanups_tab_${tab.key}`, tab.image),
  }));
  const heroImage = getWebsiteMediaImage(websiteMedia, "cleanups_hero", cleanupImages.hero);
  const ctaImage = getWebsiteMediaImage(websiteMedia, "cleanups_cta", cleanupImages.cta);
  const tabsRef = React.useRef(null);
  const rotateRef = React.useRef(null);
  const [activeTabIndex, setActiveTabIndex] = React.useState(1);
  const activeTabContent = tabs[activeTabIndex] || tabs[tabs.length - 1];

  React.useEffect(() => {
    function tick() {
      setActiveTabIndex((prev) => (prev + 1) % tabs.length);
    }
    rotateRef.current = setInterval(tick, 4000);
    return () => clearInterval(rotateRef.current);
  }, [tabs.length]);

  function handleTabClick(index) {
    setActiveTabIndex(index);
    clearInterval(rotateRef.current);
    rotateRef.current = setInterval(() => {
      setActiveTabIndex((prev) => (prev + 1) % tabs.length);
    }, 4000);
  }

  function scrollToSignup() {
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="cleanups-page">
      <section className="cleanups-hero-section" data-header-theme="light">
        <div className="cleanups-hero-inner">
          <img className="cleanups-hero-image" alt="" aria-hidden="true" src={heroImage} />
          <div className="cleanups-hero-content">
            <h1 className="cleanups-hero-title">{text.heroTitle}</h1>
            <p className="cleanups-hero-description">{text.heroText}</p>
          </div>
        </div>
      </section>

      <section className="cleanups-events-section" aria-label={text.galleryTitle}>
        <div className="cleanups-events-header">
          <h2 className="cleanups-events-title">{text.galleryTitle}</h2>
        </div>
        <div className="cleanups-events-track">
          {gallery.map((item) => (
            <div className="cleanups-event-card" key={item.title}>
              <div className="cleanups-event-card-inner">
                <div className="cleanups-event-card-content" dir={isArabic ? "rtl" : "ltr"}>
                  <p className="cleanups-event-card-location">{item.location}</p>
                  <h3 className="cleanups-event-card-title">{item.title}</h3>
                </div>
                <div className="cleanups-event-card-overlay" />
                <img alt="" aria-hidden="true" src={item.image} loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cleanups-signup-banner">
        <img alt="" aria-hidden="true" src={ctaImage} />
        <div className="cleanups-signup-copy">
          <h2>{text.ctaTitle}</h2>
          <p>{text.ctaText}</p>
          <button className="cleanup-yellow-button" onClick={scrollToSignup} type="button">
            {text.signUp}
          </button>
        </div>
      </section>

      <section className="cleanups-tabs-section" ref={tabsRef}>
        <div className="cleanups-tabs-image">
          <img alt="" aria-hidden="true" src={activeTabContent.image} loading="lazy" />
        </div>
        <div className="cleanups-tabs-panel">
          <div className="cleanups-tabs-body" key={activeTabContent.key}>
            <h2 className="cleanups-tabs-heading">{activeTabContent.title}</h2>
            <p className="cleanups-tabs-description">{activeTabContent.description}</p>
            <button className="cleanup-yellow-button" onClick={() => onNavigate?.(activeTabContent.buttonAction || "follow-us")} type="button">
              {activeTabContent.button || text.signUp}
            </button>
          </div>
          <div className="cleanups-tab-list" role="tablist" aria-label={text.galleryTitle}>
            {tabs.map((tab, index) => (
              <button
                aria-selected={activeTabIndex === index}
                className={`cleanups-tab-item${activeTabIndex === index ? " active" : ""}`}
                key={tab.key}
                onClick={() => handleTabClick(index)}
                role="tab"
                type="button"
              >
                <span className="cleanups-tab-label">{tab.label}</span>
                <span className={`cleanups-tab-underline${activeTabIndex === index ? " active" : ""}`} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

export default CleanupsPage;
