import { apiRequest } from "./api.js";

function siteQuery(siteId) {
  const value = String(siteId || "").trim();
  return value ? `siteId=${encodeURIComponent(value)}` : "";
}

function withSiteQuery(path, siteId) {
  const query = siteQuery(siteId);
  return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
}

export async function fetchSiteEditorConnection(siteId) {
  const payload = await apiRequest(withSiteQuery("/site-editor/connection", siteId), { cache: "no-store" });
  if (!payload || typeof payload !== "object") throw new TypeError("Site editor connection is invalid.");
  return payload;
}

export async function updateSiteEditorConnection(patch, siteId) {
  return apiRequest(withSiteQuery("/site-editor/connection", siteId), {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function validateSiteEditorConnection(siteManifestUrl, siteId) {
  return apiRequest(withSiteQuery("/site-editor/connection/validate", siteId), {
    method: "POST",
    body: JSON.stringify({ siteManifestUrl }),
  });
}

export async function syncSiteEditorManifest(siteManifestUrl, siteId) {
  return apiRequest(withSiteQuery("/site-editor/manifest/sync", siteId), {
    method: "POST",
    body: JSON.stringify({ siteManifestUrl }),
  });
}

export async function fetchSiteEditorPages(locale = "en", siteId) {
  const payload = await apiRequest(withSiteQuery(`/site-editor/pages?locale=${encodeURIComponent(locale)}`, siteId), { cache: "no-store" });
  if (!payload || !Array.isArray(payload.items)) throw new TypeError("Site editor page list is invalid.");
  return payload.items;
}

export async function fetchSiteEditorDocument(pageId, locale = "en", siteId) {
  const payload = await apiRequest(withSiteQuery(`/site-editor/pages/${encodeURIComponent(pageId)}?locale=${encodeURIComponent(locale)}`, siteId), { cache: "no-store" });
  if (!payload?.document) throw new TypeError("Site editor page document is invalid.");
  return payload.document;
}

export async function saveSiteEditorDraft(pageId, document, revision, siteId) {
  return apiRequest(withSiteQuery(`/site-editor/pages/${encodeURIComponent(pageId)}/draft`, siteId), {
    method: "PUT",
    body: JSON.stringify({ document, revision }),
  });
}

export async function fetchSiteEditorSectionLibrary(siteId) {
  const payload = await apiRequest(withSiteQuery("/site-editor/section-library", siteId), { cache: "no-store" });
  if (!payload || typeof payload !== "object") throw new TypeError("Site editor section library is invalid.");
  return payload;
}