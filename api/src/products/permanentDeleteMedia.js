/**
 * Safe media cleanup for permanent product delete (Decision 21).
 * Deletes storage objects only when no other in-tenant product still references the URL.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteSupabaseStorageObject, isSupabaseStorageConfigured } from "../data/supabaseStore.js";
import { companyStorageSegment } from "../tenancy/company.js";
import { collectProductMediaUrls, mediaUrlStillReferenced } from "./mediaReferences.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultUploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, "../../uploads");

function storagePathFromMediaUrl(mediaUrl, companyId) {
  const raw = String(mediaUrl || "").trim();
  if (!raw) return null;
  let pathname = raw;
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      pathname = new URL(raw).pathname || "";
    }
  } catch {
    return null;
  }

  const companySegment = companyStorageSegment(companyId);
  const uploadsPrefix = "/uploads/";
  if (!pathname.startsWith(uploadsPrefix)) return null;
  const relative = decodeURIComponent(pathname.slice(uploadsPrefix.length));
  if (!relative.startsWith(`${companySegment}/`)) return null;
  if (relative.includes("..")) return null;
  return relative;
}

async function deleteStorageObject(relativePath, uploadsDir = defaultUploadsDir) {
  if (!relativePath) return false;
  if (isSupabaseStorageConfigured()) {
    await deleteSupabaseStorageObject(relativePath);
    return true;
  }
  const target = path.resolve(uploadsDir, ...relativePath.split("/"));
  const root = path.resolve(uploadsDir);
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) return false;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    fs.unlinkSync(target);
    return true;
  }
  return false;
}

/**
 * Remove physical media for a product that has been permanently deleted from the DB,
 * skipping any URL still referenced by another product in the same tenant.
 */
export async function cleanupUnreferencedProductMedia(companyId, product, {
  tenantProducts = [],
  uploadsDir = defaultUploadsDir,
} = {}) {
  const urls = collectProductMediaUrls(product);
  const deleted = [];
  const retained = [];
  const failures = [];

  for (const url of urls) {
    if (mediaUrlStillReferenced(tenantProducts, url, { excludeProductId: product?.id })) {
      retained.push(url);
      continue;
    }
    const relative = storagePathFromMediaUrl(url, companyId);
    if (!relative) {
      retained.push(url);
      continue;
    }
    try {
      const removed = await deleteStorageObject(relative, uploadsDir);
      if (removed) deleted.push(url);
      else retained.push(url);
    } catch (error) {
      retained.push(url);
      failures.push({ url, relative, message: error?.message || String(error) });
      console.error(
        "Product media cleanup failed (non-fatal):",
        { companyId, productId: product?.id, url, relative, message: error?.message || String(error) },
      );
    }
  }

  return { deleted, retained, failures };
}

/**
 * Permanent delete ordering invariant: DB record first, media only after success.
 * If deleteProductRecord fails or returns falsy, cleanupMedia is never called.
 * Media cleanup is best-effort: failures are logged and do not undo DB deletion.
 */
export async function deleteProductRecordThenCleanupMedia({
  deleteProductRecord,
  cleanupMedia,
}) {
  const removed = await deleteProductRecord();
  if (!removed) {
    return { removed: null, mediaResult: null };
  }
  try {
    const mediaResult = await cleanupMedia();
    return { removed, mediaResult };
  } catch (error) {
    console.error(
      "Product permanent-delete media cleanup failed (non-fatal):",
      error?.message || String(error),
    );
    return {
      removed,
      mediaResult: {
        deleted: [],
        retained: [],
        failures: [{ message: error?.message || String(error) }],
      },
    };
  }
}
