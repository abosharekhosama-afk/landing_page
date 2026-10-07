import crypto from "node:crypto";
import {
  getSiteEditorDraftFromSupabase,
  isSupabaseConfigured,
  saveSiteEditorDraftToSupabase,
} from "../data/postgresStore.js";
import { getLocalSiteEditorDraft, saveLocalSiteEditorDraft } from "./draftStore.js";

function localStorageAllowed() {
  return process.env.NODE_ENV !== "production";
}

function requireRepository() {
  if (process.env.SITE_EDITOR_DATABASE_URL) return "postgres";
  if (isSupabaseConfigured()) return "postgres";
  if (localStorageAllowed()) return "local";
  const error = new Error("PostgreSQL site editor draft storage is not configured.");
  error.statusCode = 503;
  error.code = "SITE_EDITOR_DATABASE_REQUIRED";
  throw error;
}

export async function getSiteEditorDraft(companyId, pageId, locale = "en", siteId = "") {
  return requireRepository() === "postgres"
    ? getSiteEditorDraftFromSupabase(companyId, pageId, locale, siteId)
    : getLocalSiteEditorDraft(companyId, siteId, pageId, locale);
}

export async function saveSiteEditorDraft(input) {
  if (requireRepository() === "postgres") {
    const nextRevision = Number(input.expectedRevision) + 1;
    return saveSiteEditorDraftToSupabase({
      ...input,
      id: crypto.randomUUID(),
      siteId: input.siteId || input.document?.siteId || `${input.companyId}-storefront`,
      document: { ...input.document, revision: nextRevision, status: "draft" },
    });
  }
  return saveLocalSiteEditorDraft(input);
}

export function siteEditorDraftStorageKind() {
  return requireRepository();
}
