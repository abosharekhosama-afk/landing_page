import { apiRequest } from "./api.js";

const websiteMediaCacheKeys = [
  "websiteMedia",
  "website_media",
  "epWebsiteMedia",
  "epChemicalWebsiteMedia",
  "epChemicalWebsiteMediaCache",
];

export function normalizeWebsiteMediaResponse(payload, { includeHidden = false } = {}) {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object" && Array.isArray(payload.items)) {
    if (!includeHidden) return payload.items;
    const hiddenSectionKeys = Array.isArray(payload.hiddenSectionKeys)
      ? payload.hiddenSectionKeys
      : [];
    return [
      ...payload.items,
      ...hiddenSectionKeys.map((sectionKey) => ({ sectionKey, isHidden: true })),
    ];
  }

  throw new TypeError("Website media API returned an invalid response.");
}

export function clearWebsiteMediaCache() {
  if (typeof window === "undefined") return;

  websiteMediaCacheKeys.forEach((key) => {
    window.localStorage?.removeItem(key);
    window.sessionStorage?.removeItem(key);
  });
}

export async function fetchWebsiteMedia() {
  clearWebsiteMediaCache();
  const response = await apiRequest("/website-media", { cache: "no-store" });
  return normalizeWebsiteMediaResponse(response);
}

export async function fetchAllWebsiteMedia() {
  clearWebsiteMediaCache();
  const response = await apiRequest("/website-media/all", { cache: "no-store" });
  return normalizeWebsiteMediaResponse(response);
}

export async function fetchWebsiteMediaSection(sectionKey) {
  clearWebsiteMediaCache();
  const response = await apiRequest(`/website-media/${encodeURIComponent(sectionKey)}`, { cache: "no-store" });
  return normalizeWebsiteMediaResponse(response);
}

export async function saveWebsiteMedia(item) {
  const saved = await apiRequest(item.id ? `/website-media/${item.id}` : "/website-media", {
    method: item.id ? "PUT" : "POST",
    body: JSON.stringify(item),
  });
  clearWebsiteMediaCache();
  return saved;
}

export async function deleteWebsiteMedia(id) {
  const result = await apiRequest(`/website-media/${id}`, { method: "DELETE" });
  clearWebsiteMediaCache();
  return result;
}
