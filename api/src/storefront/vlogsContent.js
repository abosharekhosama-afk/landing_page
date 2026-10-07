import { companyRepository } from "../data/store.js";
import { preferWebpUploadUrl } from "../uploads/preferWebpUploadUrl.js";

const localized = (value, fallback = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      en: String(value.en ?? value.english ?? fallback ?? ""),
      ar: String(value.ar ?? value.arabic ?? value.en ?? fallback ?? ""),
    };
  }
  const text = String(value ?? fallback ?? "");
  return { en: text, ar: text };
};

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const safeUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/uploads/")) return preferWebpUploadUrl(url);
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return preferWebpUploadUrl(parsed.toString());
  } catch {
    return url.startsWith("/") ? url : "";
  }
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeMediaType(value, fallback = "video") {
  const type = String(value ?? fallback).trim().toLowerCase();
  return type === "image" || type === "post" ? "image" : "video";
}

export function readWebsiteContentSettings(company) {
  const settings = company?.settings?.websiteContent;
  return settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
}

export function normalizeVlogEntry(input = {}, existing = {}) {
  const title = localized(input.title || { en: input.titleEn, ar: input.titleAr }, existing.title?.en || "");
  const description = localized(
    input.description || { en: input.descriptionEn, ar: input.descriptionAr },
    existing.description?.en || "",
  );
  const slug = String(input.slug || existing.slug || "").trim().toLowerCase();
  if (slug && !slugPattern.test(slug)) {
    const error = new Error("Vlog slug is invalid.");
    error.statusCode = 400;
    throw error;
  }
  const mediaType = normalizeMediaType(input.mediaType ?? input.type ?? existing.mediaType ?? existing.type, "video");
  return {
    id: String(input.id || existing.id || `vlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    slug: slug || String(existing.slug || input.id || "").trim().toLowerCase(),
    title,
    description,
    videoUrl: safeUrl(input.videoUrl ?? existing.videoUrl),
    posterUrl: safeUrl(input.posterUrl ?? input.thumbnail ?? existing.posterUrl ?? existing.thumbnail),
    imageUrl: safeUrl(input.imageUrl ?? input.image ?? existing.imageUrl ?? existing.image),
    linkUrl: safeUrl(input.linkUrl ?? input.link ?? existing.linkUrl),
    mediaType,
    sortOrder: finiteNumber(input.sortOrder ?? existing.sortOrder, 0),
    isActive: input.isActive !== false,
    featured: input.featured === true,
    createdAt: existing.createdAt || input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeVlogHero(input = {}, existing = {}) {
  return {
    title: localized(input.title || { en: input.titleEn, ar: input.titleAr }, existing.title?.en || ""),
    imageUrl: safeUrl(input.imageUrl ?? input.image ?? existing.imageUrl ?? existing.image),
    videoUrl: safeUrl(input.videoUrl ?? existing.videoUrl),
    posterUrl: safeUrl(input.posterUrl ?? existing.posterUrl),
  };
}

export function listCompanyVlogs(company) {
  const content = readWebsiteContentSettings(company);
  return (Array.isArray(content.vlogs) ? content.vlogs : [])
    .map((entry) => ({
      ...entry,
      id: String(entry.id || ""),
      slug: String(entry.slug || entry.id || ""),
      title: localized(entry.title),
      description: localized(entry.description),
      videoUrl: safeUrl(entry.videoUrl),
      posterUrl: safeUrl(entry.posterUrl || entry.thumbnail),
      imageUrl: safeUrl(entry.imageUrl || entry.image),
      linkUrl: safeUrl(entry.linkUrl || entry.link),
      mediaType: normalizeMediaType(entry.mediaType ?? entry.type, "video"),
      thumbnail: safeUrl(entry.posterUrl || entry.thumbnail),
      sortOrder: finiteNumber(entry.sortOrder, 0),
      isActive: entry.isActive !== false,
      featured: entry.featured === true,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
}

export function companyVlogHero(company) {
  const content = readWebsiteContentSettings(company);
  return normalizeVlogHero(content.vlogHero || {}, content.vlogHero || {});
}

export async function saveCompanyVlogs(companyId, vlogs) {
  const company = companyRepository.getCompanyById(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }
  const normalized = (Array.isArray(vlogs) ? vlogs : []).map((entry) => normalizeVlogEntry(entry, entry));
  await companyRepository.updateCompanyBrandingAndSettings(companyId, {
    settingsPatch: {
      websiteContent: {
        vlogs: normalized,
      },
    },
  });
  return normalized;
}

export async function saveCompanyVlogHero(companyId, hero) {
  const company = companyRepository.getCompanyById(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }
  const current = readWebsiteContentSettings(company);
  const normalized = normalizeVlogHero(hero, current.vlogHero || {});
  await companyRepository.updateCompanyBrandingAndSettings(companyId, {
    settingsPatch: {
      websiteContent: {
        vlogHero: normalized,
      },
    },
  });
  return normalized;
}

export function serializePublicVlog(entry = {}, locale = "en") {
  const title = localized(entry.title);
  const description = localized(entry.description);
  return {
    id: String(entry.id || ""),
    slug: String(entry.slug || entry.id || ""),
    title,
    description,
    videoUrl: safeUrl(entry.videoUrl),
    posterUrl: safeUrl(entry.posterUrl),
    imageUrl: safeUrl(entry.imageUrl),
    linkUrl: safeUrl(entry.linkUrl),
    mediaType: normalizeMediaType(entry.mediaType ?? entry.type, "video"),
    sortOrder: finiteNumber(entry.sortOrder, 0),
    featured: entry.featured === true,
    label: title[locale] || title.en || "",
  };
}

export function serializePublicVlogHero(hero = {}, locale = "en") {
  const title = localized(hero.title);
  return {
    title,
    label: title[locale] || title.en || "",
    imageUrl: safeUrl(hero.imageUrl),
    videoUrl: safeUrl(hero.videoUrl),
    posterUrl: safeUrl(hero.posterUrl),
  };
}

export function publicVlogsForCompany(company, locale = "en") {
  return listCompanyVlogs(company)
    .filter((entry) => entry.isActive !== false)
    .map((entry) => serializePublicVlog(entry, locale));
}

export function publicVlogHeroForCompany(company, locale = "en") {
  return serializePublicVlogHero(companyVlogHero(company), locale);
}
