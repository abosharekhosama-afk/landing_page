import {
  announcementRepository,
  legalInformationRepository,
  splashAdRepository,
  storePolicyRepository,
  websiteMediaRepository,
} from "../data/store.js";
import { getVisibleAnnouncements } from "../engagement/announcements.js";
import { getVisibleSplashAds } from "../engagement/splashAds.js";
import { preferWebpUploadUrl } from "../uploads/preferWebpUploadUrl.js";
import { isStorefrontPageExcluded, storefrontDisplayRules } from "./displayRules.js";

function serializePublicAnnouncement(item) {
  return {
    id: String(item.id || ""),
    title: String(item.title || ""),
    text: String(item.text || ""),
    link: String(item.link || ""),
    text_color: item.text_color || null,
    background_color: item.background_color || null,
    alignment: item.alignment || "CENTER",
    priority: Number(item.priority || 0),
    placement: item.placement || "ALL_PAGES",
    animation_style: item.animation_style || null,
    animation_speed: item.animation_speed || null,
    animation_direction: item.animation_direction || null,
    animation_duration: item.animation_duration ?? null,
  };
}

function serializePublicSplashAd(item) {
  return {
    id: String(item.id || ""),
    title: String(item.title || ""),
    desktop_image_id: String(item.desktop_image_id || ""),
    mobile_image_id: String(item.mobile_image_id || ""),
    link: String(item.link || ""),
    close_delay_seconds: Math.max(0, Number(item.close_delay_seconds || 0)),
    display_duration_seconds: Math.max(0, Number(item.display_duration_seconds || 0)),
    frequency: item.frequency || "ONCE_PER_SESSION",
    excluded_pages: Array.isArray(item.excluded_pages) ? item.excluded_pages.map(String) : [],
    animation_style: item.animation_style || null,
    animation_speed: item.animation_speed || null,
    animation_direction: item.animation_direction || null,
    animation_duration: item.animation_duration ?? null,
  };
}

function serializePublicPolicy(item) {
  return {
    id: String(item.id || ""),
    type: String(item.type || ""),
    title_ar: String(item.title_ar || ""),
    title_en: String(item.title_en || ""),
    content_ar: String(item.content_ar || ""),
    content_en: String(item.content_en || ""),
    display_order: Number(item.display_order || 0),
    placements: Array.isArray(item.placements) ? item.placements.map(String) : [],
  };
}

function serializePublicLegalInformation(companyId, item) {
  if (!item) return null;
  const media = item.authority_logo_media_id
    ? websiteMediaRepository.findByCompany(companyId, item.authority_logo_media_id)
    : null;
  return {
    id: String(item.id || ""),
    registration_number: String(item.registration_number || ""),
    authority_name: String(item.authority_name || ""),
    authority_logo_media_id: String(item.authority_logo_media_id || ""),
    authority_logo_url: preferWebpUploadUrl(
      String(item.authority_logo_url || media?.imageUrl || media?.image_url || ""),
    ),
    business_information: item.business_information && typeof item.business_information === "object"
      ? item.business_information
      : {},
    placements: Array.isArray(item.placements) ? item.placements.map(String) : [],
  };
}

/**
 * Public storefront engagement payload for one tenant + page.
 * Never includes inactive, out-of-schedule, or cross-tenant records.
 */
export function buildPublicEngagementContent(company, companyId, page = "/") {
  const displayRules = storefrontDisplayRules(company);
  const pageExcluded = isStorefrontPageExcluded(company, page);

  const announcements = pageExcluded
    ? []
    : getVisibleAnnouncements(announcementRepository.getByCompany(companyId), page)
      .map(serializePublicAnnouncement);

  const splashAds = pageExcluded
    ? []
    : getVisibleSplashAds(splashAdRepository.getByCompany(companyId), page)
      .map(serializePublicSplashAd);

  const policies = storePolicyRepository.getByCompany(companyId)
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0) || String(a.id).localeCompare(String(b.id)))
    .map(serializePublicPolicy);

  const legalInformation = serializePublicLegalInformation(
    companyId,
    legalInformationRepository.getByCompany(companyId)[0] || null,
  );

  return {
    announcements,
    splashAds,
    policies,
    legalInformation,
    displayRules,
  };
}
