import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const draftDirectory = process.env.SITE_EDITOR_DRAFT_STORE_DIR
  ? path.resolve(process.env.SITE_EDITOR_DRAFT_STORE_DIR)
  : process.env.NODE_ENV === "test" && process.env.DATA_STORE_DIR
    ? path.resolve(process.env.DATA_STORE_DIR)
    : path.join(os.tmpdir(), "igroup-site-editor-local");
const draftFile = path.join(draftDirectory, "site-editor-drafts.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDrafts() {
  try {
    const value = JSON.parse(fs.readFileSync(draftFile, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const drafts = readDrafts();

function draftKey(companyId, siteId, pageId, locale) {
  const site = String(siteId || "").trim();
  return site ? `${companyId}:${site}:${locale}:${pageId}` : `${companyId}:${locale}:${pageId}`;
}

function persistLocalDrafts() {
  if (process.env.NODE_ENV === "production") {
    const error = new Error("Site editor draft persistence is available only in an isolated local environment.");
    error.statusCode = 503;
    error.code = "LOCAL_DRAFT_STORAGE_REQUIRED";
    throw error;
  }
  fs.mkdirSync(draftDirectory, { recursive: true });
  const temporary = `${draftFile}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(drafts, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, draftFile);
}

export function getLocalSiteEditorDraft(companyId, siteId = "", pageId, locale = "en") {
  const record = drafts[draftKey(companyId, siteId, pageId, locale)];
  return record ? clone(record) : null;
}

export function saveLocalSiteEditorDraft({ companyId, siteId = "", pageId, locale = "en", expectedRevision, document, actor }) {
  const key = draftKey(companyId, siteId, pageId, locale);
  const current = drafts[key] || null;
  const currentRevision = Number(current?.document?.revision || 0);
  if (Number(expectedRevision) !== currentRevision) {
    const error = new Error("The draft changed in another session. Reload before saving again.");
    error.statusCode = 409;
    error.code = "REVISION_CONFLICT";
    error.currentRevision = currentRevision;
    throw error;
  }

  const nextRevision = currentRevision + 1;
  const now = new Date().toISOString();
  const record = {
    companyId,
    pageId,
    locale,
    document: { ...clone(document), revision: nextRevision, status: "draft" },
    audit: {
      createdAt: current?.audit?.createdAt || now,
      createdBy: current?.audit?.createdBy || actor?.id || "",
      updatedAt: now,
      updatedBy: actor?.id || "",
      updatedByEmail: actor?.email || "",
    },
  };

  drafts[key] = record;
  try {
    persistLocalDrafts();
  } catch (error) {
    if (current) drafts[key] = current;
    else delete drafts[key];
    throw error;
  }
  return clone(record);
}

export function clearLocalSiteEditorDraftsForTest() {
  if (process.env.NODE_ENV !== "test") return;
  Object.keys(drafts).forEach((key) => delete drafts[key]);
}
