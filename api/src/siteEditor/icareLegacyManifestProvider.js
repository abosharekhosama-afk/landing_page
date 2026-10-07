import { websiteMediaRepository, websiteTextsRepository } from "../data/store.js";
import { MANIFEST_SCHEMA_VERSION } from "./siteManifest.js";

export const LEGACY_ICARE_SITE_ID = "icare-storefront";
export const LEGACY_ICARE_ROUTE_PREFIX = "/icare";

function textValue(record, locale) {
  if (!record) return "";
  const active = locale === "ar" ? record.valueAr : record.valueEn;
  return String(active || record.valueEn || record.valueAr || "").trim();
}

function contentByKey(companyId, key, locale) {
  return textValue(websiteTextsRepository.findByCompany(companyId, (entry) => (
    entry.key === key && entry.isActive !== false && entry.is_active !== false && !entry.deletedAt && !entry.deleted_at
  )), locale);
}

function heroImage(companyId, locale) {
  const contentImage = contentByKey(companyId, "home_hero_image", locale);
  if (contentImage) return { src: contentImage, assetId: "" };
  const media = websiteMediaRepository.getByCompany(companyId).find((entry) => (
    entry.isActive !== false && entry.is_active !== false && !entry.deletedAt && !entry.deleted_at
    && ["home_hero", "homepage_hero", "homepage_hero_left"].includes(entry.sectionKey)
  ));
  return {
    src: String(media?.imageUrl || media?.fallbackImageUrl || "").trim(),
    assetId: media?.id || "",
  };
}

function localizedContent(content) {
  return { en: content, ar: content };
}

function element(id, elementType, content, options = {}) {
  return {
    id,
    elementType,
    order: options.order ?? 0,
    editable: true,
    content: localizedContent(content),
    source: options.source || null,
    styles: options.styles || {},
    responsive: options.responsive || {},
    validation: options.validation || {},
    editableProperties: options.editableProperties || ["content", "styles", "responsive"],
    children: options.children || [],
  };
}

function homeSections(companyId, locale) {
  const image = heroImage(companyId, locale);
  const heading = contentByKey(companyId, "home_hero_headline", locale);
  const subtitle = contentByKey(companyId, "home_hero_subtitle", locale);
  const cta = contentByKey(companyId, "home_hero_cta", locale);
  return [
    {
      id: "home-hero",
      sectionType: "hero",
      order: 0,
      editable: true,
      layout: { sourceComponent: "app/icare/components/Hero.tsx", contentAlignment: "end" },
      responsive: { mobile: { contentAlignment: "center" } },
      elements: [
        ...(image.src ? [element("home-hero-image", "image", { src: image.src, alt: heading || "iCare", link: "", assetId: image.assetId }, {
          styles: { width: 100, heightMode: "cover", objectFit: "cover", borderRadius: 0 },
          responsive: { mobile: { width: 100, heightMode: "cover", objectFit: "cover" } },
        })] : []),
        element("home-hero-content", "container", {}, {
          styles: { alignment: "start", width: 46 },
          responsive: { mobile: { alignment: "center", width: 100 } },
          editableProperties: ["styles", "responsive"],
          children: [
            element("home-hero-heading", "heading", { text: heading || "iCare" }, {
              source: { type: "content", key: "home_hero_headline" },
              styles: { alignment: "start", color: "#ffffff", fontSize: 64, fontWeight: 500, lineHeight: 1.02 },
              responsive: { mobile: { alignment: "center", fontSize: 38 } },
            }),
            element("home-hero-subtitle", "text", { text: subtitle }, {
              source: { type: "content", key: "home_hero_subtitle" },
              styles: { alignment: "start", color: "#ffffff", fontSize: 18, fontWeight: 400, lineHeight: 1.45 },
              responsive: { mobile: { alignment: "center", fontSize: 16 } },
            }),
            element("home-hero-button", "button", { label: cta || "Shop iCare", link: "/icare/shop" }, {
              source: { type: "content", key: "home_hero_cta" },
              styles: { alignment: "start", backgroundColor: "#ffffff", color: "#151515", borderRadius: 999 },
              responsive: { mobile: { alignment: "center" } },
            }),
          ],
        }),
      ],
    },
    { id: "home-trending", sectionType: "productCollection", order: 1, editable: true, layout: { sourceComponent: "app/icare/components/LandingProductShowcase.tsx" }, responsive: {}, elements: [
      element("home-trending-title", "heading", { text: contentByKey(companyId, "home_trending_title", locale) || "Trending essentials" }, {
        source: { type: "content", key: "home_trending_title" },
        styles: { alignment: "start", fontSize: 34, fontWeight: 500, lineHeight: 1.1 },
        responsive: {},
      }),
      element("home-trending-collection", "productCollection", { source: "featured", limit: 10 }, {
        editableProperties: [],
      }),
    ] },
    { id: "home-promo", sectionType: "promo", order: 2, editable: true, layout: { sourceComponent: "app/icare/components/PromoSection.tsx" }, responsive: {}, elements: [
      element("home-promo-headline", "heading", { text: contentByKey(companyId, "home_promo_headline", locale) || "chilly little flush" }, {
        source: { type: "content", key: "home_promo_headline" },
        styles: { alignment: "start", fontSize: 40, fontWeight: 600, lineHeight: 1.1 },
        responsive: {},
      }),
      element("home-promo-description", "text", { text: contentByKey(companyId, "home_promo_description", locale) }, {
        source: { type: "content", key: "home_promo_description" },
        styles: { alignment: "start", fontSize: 16, lineHeight: 1.5 },
        responsive: {},
      }),
      element("home-promo-cta", "button", { label: contentByKey(companyId, "home_promo_cta_label", locale) || "POCKET BLUSH", link: "/icare/shop" }, {
        source: { type: "content", key: "home_promo_cta_label" },
        styles: { alignment: "start", borderRadius: 999 },
        responsive: {},
      }),
    ] },
    { id: "home-philosophy", sectionType: "philosophy", order: 3, editable: true, layout: { sourceComponent: "app/icare/components/PhilosophySection.tsx" }, responsive: {}, elements: [
      element("home-philosophy-headline", "heading", { text: contentByKey(companyId, "home_philosophy_headline", locale) || "one of everything really good" }, {
        source: { type: "content", key: "home_philosophy_headline" },
        styles: { alignment: "start", fontSize: 44, fontWeight: 500, lineHeight: 1.05 },
        responsive: {},
      }),
      element("home-philosophy-text", "text", { text: contentByKey(companyId, "home_philosophy_text", locale) }, {
        source: { type: "content", key: "home_philosophy_text" },
        styles: { alignment: "start", fontSize: 16, lineHeight: 1.5 },
        responsive: {},
      }),
      element("home-philosophy-cta", "button", { label: contentByKey(companyId, "home_philosophy_cta", locale) || "SHOP ICARE", link: "/icare/story" }, {
        source: { type: "content", key: "home_philosophy_cta" },
        styles: { alignment: "start", borderRadius: 999 },
        responsive: {},
      }),
    ] },
    { id: "home-showcase", sectionType: "productCollection", order: 4, editable: true, layout: { sourceComponent: "app/icare/components/ProductShowcase.tsx" }, responsive: {}, elements: [
      element("home-showcase-collection", "productCollection", { source: "featured", limit: 4 }, {
        editableProperties: [],
      }),
    ] },
    { id: "home-social-grid", sectionType: "social", order: 5, editable: true, layout: { sourceComponent: "app/icare/components/SocialGrid.tsx" }, responsive: {}, elements: [
      element("home-social-grid-heading", "heading", { text: contentByKey(companyId, "home_social_grid_heading", locale) }, {
        source: { type: "content", key: "home_social_grid_heading" },
        styles: { alignment: "start", fontSize: 34, fontWeight: 500, lineHeight: 1.1 },
        responsive: {},
      }),
      element("home-social-grid-cta", "button", { label: contentByKey(companyId, "home_social_grid_cta", locale) || "FIND US ON SOCIAL", link: "/icare/vlog" }, {
        source: { type: "content", key: "home_social_grid_cta" },
        styles: { alignment: "start", borderRadius: 999 },
        responsive: {},
      }),
    ] },
    { id: "home-commitment", sectionType: "commitment", order: 6, editable: true, layout: { sourceComponent: "app/icare/components/CommitmentSection.tsx" }, responsive: {}, elements: [
      element("home-commitment-content", "container", {}, {
        editableProperties: ["styles", "responsive"],
        children: [
          element("home-commitment-list", "list", { items: ["mission", "philanthropy", "sustainability"] }, {
            editableProperties: [],
          }),
        ],
      }),
    ] },
  ];
}

function standardPage({ id, title, route, order, navigationVisible = true }) {
  return {
    id,
    route,
    pageType: "standard",
    title,
    navigationVisible,
    parentId: null,
    order,
    editable: true,
    sections: [
      {
        id: `${id}-content`,
        sectionType: "content",
        order: 0,
        editable: true,
        layout: {},
        responsive: {},
        elements: [
          element(`${id}-heading`, "heading", { text: title.en }, {
            styles: { alignment: "start", fontSize: 44, fontWeight: 500, lineHeight: 1.05 },
            responsive: {},
          }),
        ],
      },
    ],
  };
}

export function supportsLegacyIcare(company) {
  if (!company || !company.id) return false;
  const connection = company.settings?.websiteConnection;
  if (connection?.siteManifestUrl) return false;
  return company.id === "icare" || company.slug === "icare";
}

export function buildLegacyIcareManifest(company, locale = "en") {
  if (!supportsLegacyIcare(company)) return null;
  const activeLocale = locale === "ar" ? "ar" : "en";
  const pages = [
    {
      id: "home",
      route: LEGACY_ICARE_ROUTE_PREFIX,
      pageType: "standard",
      title: { en: "Home", ar: "الرئيسية" },
      navigationVisible: true,
      parentId: null,
      order: 0,
      editable: true,
      sections: homeSections(company.id, activeLocale),
    },
    standardPage({ id: "shop", title: { en: "Shop", ar: "المتجر" }, route: "/icare/shop", order: 1 }),
    standardPage({ id: "story", title: { en: "Our Story", ar: "قصتنا" }, route: "/icare/story", order: 2 }),
    standardPage({ id: "find-us", title: { en: "Find Us", ar: "موقعنا" }, route: "/icare/find-us", order: 3 }),
    standardPage({ id: "faq", title: { en: "FAQ", ar: "الأسئلة الشائعة" }, route: "/icare/faq", order: 4 }),
    standardPage({ id: "contact", title: { en: "Contact", ar: "اتصل بنا" }, route: "/icare/contact", order: 5 }),
    standardPage({ id: "shipping", title: { en: "Shipping", ar: "الشحن" }, route: "/icare/shipping", order: 6 }),
    standardPage({ id: "privacy", title: { en: "Privacy", ar: "الخصوصية" }, route: "/icare/privacy", order: 7 }),
    standardPage({ id: "terms", title: { en: "Terms", ar: "الشروط" }, route: "/icare/terms", order: 8 }),
    standardPage({ id: "accessibility", title: { en: "Accessibility", ar: "إمكانية الوصول" }, route: "/icare/accessibility", order: 9 }),
  ];
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    companyId: company.id,
    siteId: LEGACY_ICARE_SITE_ID,
    siteName: company.name || "iCare",
    baseUrl: "https://igroup.website",
    routePrefix: LEGACY_ICARE_ROUTE_PREFIX,
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    generatedAt: new Date().toISOString(),
    pages,
  };
}
