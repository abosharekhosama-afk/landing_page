import { websiteMediaRepository, websiteTextsRepository } from "../data/store.js";

const HOME_PAGE_ID = "icare:home";

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

export function listEditableIcarePages(companyId, locale = "en") {
  if (companyId !== "icare") return [];
  return [{
    id: HOME_PAGE_ID,
    tenantId: companyId,
    title: "Home",
    localizedTitle: { en: "Home", ar: "الرئيسية" },
    slug: "home",
    routePattern: "/icare",
    previewPath: "/icare",
    pageType: "standard",
    parentId: null,
    order: 0,
    menuVisibility: "main",
    status: "published-source",
    draftStatus: "not-saved",
    isSystem: false,
    isDynamic: false,
    isEditable: true,
    editableCapabilities: ["sections", "elements", "text", "media", "design"],
    locale: locale === "ar" ? "ar" : "en",
  }];
}

export function createIcareHomeDocument(companyId, locale = "en") {
  if (companyId !== "icare") return null;
  const activeLocale = locale === "ar" ? "ar" : "en";
  const image = heroImage(companyId, activeLocale);
  const heading = contentByKey(companyId, "home_hero_headline", activeLocale);
  const subtitle = contentByKey(companyId, "home_hero_subtitle", activeLocale);
  const cta = contentByKey(companyId, "home_hero_cta", activeLocale);
  const imageElements = image.src ? [{
    id: "home-hero-image",
    type: "image",
    content: { src: image.src, alt: heading || "iCare", link: "", assetId: image.assetId },
    settings: { role: "background" },
    styles: { width: 100, heightMode: "cover", objectFit: "cover", borderRadius: 0 },
    responsive: { mobile: { width: 100, heightMode: "cover", objectFit: "cover" } },
    children: [],
  }] : [];

  return {
    id: `${HOME_PAGE_ID}:draft`,
    companyId,
    siteId: `${companyId}:storefront`,
    pageId: HOME_PAGE_ID,
    pageType: "standard",
    title: "Home",
    slug: "home",
    routePattern: "/icare",
    previewPath: "/icare",
    locale: activeLocale,
    status: "draft",
    revision: 0,
    sections: [{
      id: "home-hero",
      type: "hero",
      order: 0,
      settings: { sourceComponent: "app/icare/components/Hero.tsx" },
      styles: { backgroundColor: "#eeeae3", paddingBlock: 48, paddingInline: 48, contentAlignment: "end" },
      responsive: { mobile: { paddingBlock: 28, paddingInline: 20, contentAlignment: "center" } },
      elements: [
        ...imageElements,
        {
          id: "home-hero-content",
          type: "container",
          content: {},
          settings: { role: "hero-content" },
          styles: { alignment: "start", width: 46 },
          responsive: { mobile: { alignment: "center", width: 100 } },
          children: [
            { id: "home-hero-heading", type: "heading", content: { text: heading }, settings: {}, styles: { alignment: "start", color: "#ffffff", fontSize: 64, fontWeight: 500, lineHeight: 1.02 }, responsive: { mobile: { alignment: "center", fontSize: 38 } }, children: [] },
            { id: "home-hero-subtitle", type: "text", content: { text: subtitle }, settings: {}, styles: { alignment: "start", color: "#ffffff", fontSize: 18, fontWeight: 400, lineHeight: 1.45 }, responsive: { mobile: { alignment: "center", fontSize: 16 } }, children: [] },
            { id: "home-hero-button", type: "button", content: { label: cta, link: "/icare/shop" }, settings: {}, styles: { alignment: "start", backgroundColor: "#ffffff", color: "#151515", borderRadius: 999 }, responsive: { mobile: { alignment: "center" } }, children: [] },
          ],
        },
      ],
    }],
  };
}

export { HOME_PAGE_ID };
