#!/usr/bin/env node
/**
 * Staging missing-WebP sibling generator.
 *
 * Discovers platform `/uploads/<company>/` PNG/JPG uploads that are missing a
 * `.webp` sibling (HEAD 200 original, HEAD 404 `.webp`), downloads ONLY those
 * originals from the staging public API into a LOCAL MIRROR directory, and
 * generates the missing `.webp` sibling + `.admin-preview.webp` there.
 *
 * Filesystem-only. Never touches Production, Coolify, or any database. Apply
 * only mutates the local mirror — it does NOT upload anything to staging.
 *
 * Flags:
 *   --company=<id>          tenant segment, e.g. kids-velvet (required)
 *   --public-api=<url>      staging API base, e.g. https://api-staging.igroup.website
 *                           (required for discovery + HEAD/GET checks)
 *   --paths=<file.json>     optional explicit list of upload paths to check
 *                           (JSON array of strings like "/uploads/kids-velvet/...")
 *   --dry-run               (default) report only, write nothing
 *   --apply                 only honored when CONFIRM=STAGING env is set
 *   --limit=N               process at most N missing uploads
 *
 * Behavior:
 *   1. Discover candidate upload paths from the public catalog endpoints
 *      (brands, categories, products, website-media) OR read them from
 *      --paths=<file.json>. External CDN URLs are never considered.
 *   2. For each candidate, HEAD the original and its `.webp` sibling. Only
 *      paths with HEAD 200 original + HEAD 404 `.webp` are "missing".
 *   3. Download the missing originals into the local mirror dir
 *      (UPLOADS_DIR env or api/.staging-uploads-mirror).
 *   4. Generate the `.webp` sibling via optimizeImageUpload (dimensions
 *      preserved; metadata stripped / quality reduced OK) and always write
 *      the `.admin-preview.webp` sibling via generateAdminPreview.
 *   5. Never deletes originals. On apply, the original is first copied to
 *      <mirror>/.optimize-backup/<runId>/... (reuses backfill patterns).
 *   6. Prints a JSON summary: mode, appliedTarget (always "local-mirror"),
 *      missing count, bytes before/after, categories (brand.logo /
 *      website-media / vlog / ...), failures.
 *
 * Restore procedure (manual):
 *   Copy a file from <mirror>/.optimize-backup/<runId>/<relative-path> back
 *   over <mirror>/<relative-path> to restore the pre-generation original.
 *   Only do this on Staging, and only for a run that still exists.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  adminPreviewFilename,
  generateAdminPreview,
} from "../src/uploads/optimizeImageUpload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const mirrorDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(apiRoot, ".staging-uploads-mirror");
const BACKUP_ROOT_NAME = ".optimize-backup";

const UPLOADS_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

export function parseArgs(argv) {
  const flags = {
    dryRun: true,
    apply: false,
    company: null,
    publicApi: null,
    pathsFile: null,
    limit: Infinity,
  };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--company=")) {
      flags.company = arg.slice("--company=".length).trim() || null;
    } else if (arg.startsWith("--public-api=")) {
      flags.publicApi = arg.slice("--public-api=".length).trim().replace(/\/+$/, "") || null;
    } else if (arg.startsWith("--paths=")) {
      flags.pathsFile = arg.slice("--paths=".length).trim() || null;
    } else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) flags.limit = parsed;
    }
  }
  if (flags.apply) flags.dryRun = false;
  return flags;
}

export function productionMarker() {
  if (process.env.NODE_ENV === "production") return "NODE_ENV=production";
  if (process.env.VERCEL_ENV === "production") return "VERCEL_ENV=production";
  if (process.env.COOLIFY_ENVIRONMENT === "production") return "COOLIFY_ENVIRONMENT=production";
  const host = String(process.env.HOSTNAME || process.env.COMPUTERNAME || "").toLowerCase();
  if (host.includes("prod")) return `hostname contains 'prod' (${host})`;
  return null;
}

/**
 * Extract the `/uploads/<company>/...` pathname from a URL string. Returns ""
 * for external CDN URLs, non-/uploads/ paths, or non-image extensions.
 */
export function uploadsImagePath(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return "";
    }
  }
  const queryIndex = pathname.indexOf("?");
  if (queryIndex >= 0) pathname = pathname.slice(0, queryIndex);
  if (!pathname.startsWith("/uploads/")) return "";
  const ext = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
  if (!UPLOADS_IMAGE_EXTENSIONS.has(ext)) return "";
  return pathname;
}

/** Same path with the extension replaced by `.webp`. */
export function webpSiblingFor(value) {
  const pathname = uploadsImagePath(value);
  if (!pathname) return "";
  const extIndex = pathname.lastIndexOf(".");
  const stem = extIndex > 0 ? pathname.slice(0, extIndex) : pathname;
  return `${stem}.webp`;
}

/**
 * Classify a relative upload path for the summary categories:
 * brand.logo / website-media / vlog / brand / category / product / other.
 */
export function classifyPath(relativePath) {
  const joined = String(relativePath || "").toLowerCase().split("/").join("/");
  if (joined.includes("/brands/")) {
    if (joined.includes("logo")) return "brand.logo";
    return "brand";
  }
  if (joined.includes("/categories/")) return "category";
  if (joined.includes("/products/")) return "product";
  if (joined.includes("/website-media/")) return "website-media";
  if (joined.includes("/vlogs/")) return "vlog";
  return "other";
}

function addRef(refs, entityType, entityId, field, value) {
  const pathname = uploadsImagePath(value);
  if (!pathname) return;
  refs.push({ entityType, entityId, field, path: pathname });
}

/**
 * Discover candidate upload paths from the public catalog endpoints.
 * `fetchJson` is injectable for tests. Only platform `/uploads/` image paths
 * are collected — external CDN URLs are never considered.
 */
export async function discoverUploadPaths({ publicApi, company, fetchJson }) {
  const headers = { Accept: "application/json", "X-Company-Id": company };
  const get = fetchJson || (async (pathname) => {
    const response = await fetch(`${publicApi}${pathname}`, { headers });
    if (!response.ok) return null;
    return response.json();
  });

  const [brands, categories, products, websiteMedia] = await Promise.all([
    get("/api/brands"),
    get("/api/categories"),
    get("/api/products"),
    get("/api/website-media"),
  ]);

  const refs = [];
  for (const brand of Array.isArray(brands) ? brands : []) {
    for (const field of ["logoUrl", "logo", "heroPoster", "hero_poster", "headerImage", "menuImage"]) {
      addRef(refs, "brand", brand.id, field, brand[field]);
    }
  }
  for (const category of Array.isArray(categories) ? categories : []) {
    addRef(refs, "category", category.id, "imageUrl", category.imageUrl || category.image_url || category.image);
  }
  for (const product of Array.isArray(products) ? products : []) {
    for (const field of ["image", "primaryImage", "hoverImage", "fallbackImage", "productsPageImage", "productsPageHoverImage"]) {
      addRef(refs, "product", product.id, field, product[field]);
    }
    const gallery = product.galleryImages || product.gallery_images || [];
    gallery.forEach((entry, index) => {
      const value = typeof entry === "string" ? entry : entry?.image_url || entry?.url || entry?.image || "";
      addRef(refs, "gallery", product.id, `gallery[${index}]`, value);
    });
    const variants = product.variants || [];
    variants.forEach((variant, index) => {
      addRef(refs, "variant", product.id, `variants[${index}]`, variant?.image_url || variant?.imageUrl || variant?.image || "");
    });
  }
  for (const item of Array.isArray(websiteMedia) ? websiteMedia : []) {
    for (const field of ["imageUrl", "fallbackImageUrl"]) {
      addRef(refs, "website-media", item.id, field, item[field]);
    }
  }

  // Deduplicate by path.
  const byPath = new Map();
  for (const ref of refs) {
    if (!byPath.has(ref.path)) byPath.set(ref.path, ref);
  }
  return [...byPath.values()];
}

/**
 * Read an explicit list of upload paths from a JSON file.
 * Accepts an array of strings or `{ path, category? }` objects.
 */
export function readPathsFile(pathsFile) {
  const raw = fs.readFileSync(pathsFile, "utf8");
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.paths;
  if (!Array.isArray(list)) throw new Error("--paths file must be a JSON array of upload paths");
  const refs = [];
  for (const value of list) {
    const pathname = uploadsImagePath(typeof value === "string" ? value : value?.path);
    if (!pathname) continue;
    const relative = pathname.slice("/uploads/".length);
    const category =
      (typeof value === "object" && value?.category) || classifyPath(relative);
    refs.push({
      entityType: category,
      entityId: typeof value === "object" ? String(value?.entityId || "") : "",
      field: typeof value === "object" ? String(value?.field || "") : "",
      path: pathname,
      category,
    });
  }
  return refs;
}

/**
 * Force a same-dimensions WebP encode for a missing sibling.
 * Unlike optimizeImageUpload, this never skips for "already-small" /
 * "no-meaningful-gain" — the goal is a preferWebp-compatible sibling.
 * Raises Sharp's input pixel limit so large brand logos still decode.
 * WebP itself rejects canvases above 16383px on either edge.
 */
export async function forceWebpSibling(buffer, { quality = 82 } = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return { skipped: true, reason: "empty", data: null, width: null, height: null, kind: "full" };
  }
  try {
    const meta = await sharp(buffer, {
      failOn: "none",
      animated: false,
      limitInputPixels: false,
    }).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width > 16383 || height > 16383) {
      return {
        skipped: true,
        reason: "webp-dimension-limit",
        data: null,
        width,
        height,
        kind: "full",
      };
    }
    const encoded = await sharp(buffer, {
      failOn: "none",
      animated: false,
      limitInputPixels: false,
    })
      .rotate()
      .webp({
        quality,
        alphaQuality: Math.min(100, quality + 8),
        smartSubsample: true,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });
    return {
      skipped: false,
      reason: null,
      data: encoded.data,
      width,
      height,
      kind: "full",
    };
  } catch (error) {
    return {
      skipped: true,
      reason: `webp-encode-failed:${error.message}`,
      data: null,
      width: null,
      height: null,
      kind: "full",
    };
  }
}

/**
 * Storefront display derivative for assets that exceed the WebP canvas limit.
 * Max edge 2048, contain, no upscale. Written as `*.display.webp` — NOT a
 * replacement for the main original (dimensions of the main asset stay intact).
 */
export async function forceDisplayWebpSibling(buffer, { maxEdge = 2048, quality = 80 } = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return { skipped: true, reason: "empty", data: null, width: null, height: null, kind: "display" };
  }
  try {
    const encoded = await sharp(buffer, {
      failOn: "none",
      animated: false,
      limitInputPixels: false,
    })
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        alphaQuality: Math.min(100, quality + 8),
        smartSubsample: true,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });
    return {
      skipped: false,
      reason: null,
      data: encoded.data,
      width: encoded.info.width ?? null,
      height: encoded.info.height ?? null,
      kind: "display",
    };
  } catch (error) {
    return {
      skipped: true,
      reason: `display-encode-failed:${error.message}`,
      data: null,
      width: null,
      height: null,
      kind: "display",
    };
  }
}

/**
 * HEAD-check each candidate: original must be 200 and the `.webp` sibling 404.
 * Returns only the missing entries. `headStatus` is injectable for tests.
 */
export async function discoverMissing(refs, { publicApi, headStatus }) {
  const check = headStatus || (async (pathname) => {
    try {
      const response = await fetch(`${publicApi}${pathname}`, { method: "HEAD" });
      return response.status;
    } catch {
      return 0;
    }
  });

  const missing = [];
  for (const ref of refs) {
    const sibling = webpSiblingFor(ref.path);
    if (!sibling) continue;
    const [originalStatus, siblingStatus] = await Promise.all([
      check(ref.path),
      check(sibling),
    ]);
    if (originalStatus === 200 && siblingStatus === 404) {
      missing.push({ ...ref, sibling });
    }
  }
  return missing;
}

/**
 * Download one missing original and generate its `.webp` + `.admin-preview.webp`
 * siblings. Dry-run reports projections only; apply writes to the local mirror
 * (original backed up to <mirror>/.optimize-backup/<runId>/ first).
 */
export async function processMissing(entry, { publicApi, mirrorDir, apply, backupRoot }) {
  const relative = entry.path.slice("/uploads/".length);
  const result = {
    path: entry.path,
    relativePath: relative,
    category: classifyPath(relative),
    entityType: entry.entityType,
    entityId: entry.entityId,
    field: entry.field,
    originalBytes: 0,
    webpBytes: 0,
    previewBytes: 0,
    webpAction: "skip",
    previewAction: "skip",
    failure: null,
  };

  let buffer;
  try {
    const response = await fetch(`${publicApi}${entry.path}`);
    if (!response.ok) {
      result.failure = `download-failed:${response.status}`;
      return result;
    }
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    result.failure = `download-failed:${error.message}`;
    return result;
  }
  result.originalBytes = buffer.length;
  result.category = entry.category || classifyPath(relative);

  const contentType = entry.path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  // Prefer full-size WebP; fall back to `.display.webp` when the canvas exceeds
  // the WebP dimension limit (main original is never resized/deleted).
  let webp = await forceWebpSibling(buffer);
  if (
    webp.skipped &&
    (webp.reason === "webp-dimension-limit" || /too large for the WebP format/i.test(String(webp.reason || "")))
  ) {
    webp = await forceDisplayWebpSibling(buffer);
  }
  let preview = await generateAdminPreview(buffer, contentType);
  if (preview.skipped && /pixel limit|exceeds/i.test(String(preview.reason || ""))) {
    // Retry admin preview with an explicit high pixel limit for huge logos.
    try {
      const encoded = await sharp(buffer, {
        failOn: "none",
        animated: false,
        limitInputPixels: false,
      })
        .rotate()
        .resize({
          width: 160,
          height: 160,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80, alphaQuality: 90, smartSubsample: true, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      preview = {
        skipped: false,
        data: encoded.data,
        reason: null,
      };
    } catch (error) {
      preview = { skipped: true, data: null, reason: `preview-retry-failed:${error.message}` };
    }
  }

  if (!webp.skipped && webp.data?.length) {
    result.webpBytes = webp.data.length;
    result.webpAction = webp.kind === "display" ? "write-display" : "write";
    result.webpKind = webp.kind;
  } else {
    result.webpAction = "skip";
    result.webpBytes = buffer.length;
    result.failure = result.failure || `webp-skip:${webp.reason || "skipped"}`;
  }
  if (!preview.skipped && preview.data?.length) {
    result.previewBytes = preview.data.length;
    result.previewAction = "write";
  } else if (preview.reason) {
    result.failure = result.failure || `preview-skip:${preview.reason}`;
  }

  if (apply) {
    try {
      const targetDir = path.join(mirrorDir, path.dirname(relative));
      fs.mkdirSync(targetDir, { recursive: true });
      const targetFile = path.join(mirrorDir, relative);
      // Persist the downloaded original in the mirror (never delete staging originals).
      if (!fs.existsSync(targetFile)) {
        fs.writeFileSync(targetFile, buffer);
      } else {
        const backupTarget = path.join(backupRoot, relative);
        fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
        fs.copyFileSync(targetFile, backupTarget);
      }
      if (result.webpAction === "write" || result.webpAction === "write-display") {
        const webpRelative =
          result.webpAction === "write-display"
            ? relative.replace(/\.(png|jpe?g)$/i, ".display.webp")
            : relative.replace(/\.(png|jpe?g)$/i, ".webp");
        const webpTarget = path.join(mirrorDir, webpRelative);
        if (fs.existsSync(webpTarget)) {
          const backupTarget = path.join(backupRoot, webpRelative);
          fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
          fs.copyFileSync(webpTarget, backupTarget);
        }
        fs.writeFileSync(webpTarget, webp.data);
      }
      if (result.previewAction === "write") {
        const previewFilename = adminPreviewFilename(path.basename(relative));
        const previewTarget = path.join(targetDir, previewFilename);
        if (fs.existsSync(previewTarget)) {
          const backupTarget = path.join(backupRoot, path.join(path.dirname(relative), previewFilename));
          fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
          fs.copyFileSync(previewTarget, backupTarget);
        }
        fs.writeFileSync(previewTarget, preview.data);
      }
    } catch (error) {
      result.failure = `apply-failed:${error.message}`;
    }
  }

  return result;
}

export function summarize(results, flags, runId) {
  const countsByCategory = {};
  const failures = [];
  let bytesBefore = 0;
  let bytesAfter = 0;
  for (const result of results) {
    countsByCategory[result.category] = (countsByCategory[result.category] || 0) + 1;
    bytesBefore += result.originalBytes;
    bytesAfter += result.webpBytes;
    if (result.failure) failures.push({ path: result.path, failure: result.failure });
  }
  return {
    mode: flags.apply ? "apply" : "dry-run",
    appliedTarget: "local-mirror",
    runId,
    company: flags.company || null,
    publicApi: flags.publicApi || null,
    mirrorDir,
    missingCount: results.length,
    countsByCategory,
    bytesBefore,
    bytesAfter,
    reductionPercent:
      bytesBefore > 0 ? Number((((bytesBefore - bytesAfter) / bytesBefore) * 100).toFixed(1)) : 0,
    previewsToWrite: results.filter((result) => result.previewAction === "write").length,
    fullWebpToWrite: results.filter((result) => result.webpAction === "write").length,
    displayWebpToWrite: results.filter((result) => result.webpAction === "write-display").length,
    failures,
    note: flags.apply
      ? "Apply only mutated the local mirror (appliedTarget: local-mirror). Nothing was uploaded to staging; originals were never deleted (backed up under .optimize-backup/<runId>/)."
      : "Dry-run only: nothing was written. Re-run with --apply and CONFIRM=STAGING to write into the local mirror.",
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  const marker = productionMarker();
  if (marker) {
    console.error(`Refusing to run: production marker detected (${marker}).`);
    process.exit(2);
  }
  if (flags.apply && process.env.CONFIRM !== "STAGING") {
    console.error("Refusing to apply: --apply requires CONFIRM=STAGING env var.");
    process.exit(2);
  }
  if (!flags.company) {
    console.error("Refusing to run: --company=<id> is required (e.g. --company=kids-velvet).");
    process.exit(2);
  }
  if (!flags.publicApi) {
    console.error("Refusing to run: --public-api=<url> is required (e.g. --public-api=https://api-staging.igroup.website).");
    process.exit(2);
  }

  const refs = flags.pathsFile ? readPathsFile(flags.pathsFile) : await discoverUploadPaths(flags);
  if (!refs.length) {
    console.error("No candidate upload paths discovered. Nothing to check.");
    process.exit(2);
  }

  const missing = await discoverMissing(refs, flags);
  if (!missing.length) {
    console.log(JSON.stringify({
      mode: flags.apply ? "apply" : "dry-run",
      appliedTarget: "local-mirror",
      company: flags.company,
      publicApi: flags.publicApi,
      mirrorDir,
      missingCount: 0,
      countsByCategory: {},
      bytesBefore: 0,
      bytesAfter: 0,
      reductionPercent: 0,
      previewsToWrite: 0,
      failures: [],
      note: "No uploads are missing a .webp sibling.",
    }, null, 2));
    return;
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(mirrorDir, BACKUP_ROOT_NAME, runId);
  const selected = missing.slice(0, flags.limit);

  const results = [];
  for (const entry of selected) {
    const result = await processMissing(entry, {
      publicApi: flags.publicApi,
      mirrorDir,
      apply: flags.apply,
      backupRoot,
    });
    results.push(result);
    if (result.failure) console.error(`FAIL ${result.path}: ${result.failure}`);
  }

  const summary = summarize(results, flags, runId);
  console.log(JSON.stringify(summary, null, 2));
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((error) => {
    console.error(`Missing-WebP generator aborted: ${error.message}`);
    process.exit(1);
  });
}