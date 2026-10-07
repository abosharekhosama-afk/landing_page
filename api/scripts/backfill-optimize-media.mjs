#!/usr/bin/env node
/**
 * Staging backfill: optimize existing uploads + generate admin previews.
 *
 * Filesystem-only. Never touches Production, Coolify, or any database.
 *
 * Flags:
 *   --dry-run            (default) report counts/bytes/projections, write nothing
 *   --apply              only honored when CONFIRM=STAGING env is set
 *   --company=<id>       only walk uploads under <id>/ (tenant segment)
 *   --limit=N            process at most N images
 *   --cleanup-backups    cleanup mode: report/delete stale .optimize-backup runs
 *   --older-than-days=N  cleanup only considers backup runs older than N days
 *                        (default 7; the verification window)
 *
 * Behavior:
 *   1. Discover image files under UPLOADS_DIR (default api/uploads).
 *   2. Skip animated gifs / unsupported / already-small / decode failures.
 *   3. Apply: copy original to uploads/.optimize-backup/<runId>/... first,
 *      then write the optimized main preferring URL stability:
 *        - same-extension recompress when it preserves the URL and hits goals
 *        - otherwise write .webp and record a URL remap (original kept until
 *          the remap is applied + verified)
 *   4. Always generate/update the .admin-preview.webp sibling.
 *   5. Print a summary JSON to stdout (progress goes to stderr).
 *
 * Backup cleanup (--cleanup-backups):
 *   - Dry by default: reports what would be deleted; --apply (with
 *     CONFIRM=STAGING) actually deletes.
 *   - Only deletes under uploads/.optimize-backup/<runId>/ and only for runs
 *     older than --older-than-days (verification window).
 *   - NEVER deletes a backup whose content is still the live asset (byte-
 *     identical to the current file at the same relative path).
 *   - Refuses to run when a Production marker is detected.
 *
 * Restore procedure (manual):
 *   Copy a file from uploads/.optimize-backup/<runId>/<relative-path> back
 *   over uploads/<relative-path> to restore the pre-optimization original,
 *   e.g.:
 *     cp uploads/.optimize-backup/2026-09-13T12-34-56-789Z/co/brands/velvet/logo.jpg \
 *        uploads/co/brands/velvet/logo.jpg
 *   Only do this on Staging, and only for a run that still exists (cleanup
 *   removes backups after the verification window).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  adminPreviewFilename,
  generateAdminPreview,
  optimizeImageUpload,
} from "../src/uploads/optimizeImageUpload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(apiRoot, "uploads");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const BACKUP_ROOT_NAME = ".optimize-backup";

function parseArgs(argv) {
  const flags = {
    dryRun: true,
    apply: false,
    company: null,
    limit: Infinity,
    cleanupBackups: false,
    olderThanDays: 7,
  };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--cleanup-backups") flags.cleanupBackups = true;
    else if (arg.startsWith("--company=")) {
      flags.company = arg.slice("--company=".length).trim() || null;
    } else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) flags.limit = parsed;
    } else if (arg.startsWith("--older-than-days=")) {
      const parsed = Number.parseInt(arg.slice("--older-than-days=".length), 10);
      if (Number.isFinite(parsed) && parsed >= 0) flags.olderThanDays = parsed;
    }
  }
  if (flags.apply) flags.dryRun = false;
  return flags;
}

function productionMarker() {
  if (process.env.NODE_ENV === "production") return "NODE_ENV=production";
  if (process.env.VERCEL_ENV === "production") return "VERCEL_ENV=production";
  if (process.env.COOLIFY_ENVIRONMENT === "production") return "COOLIFY_ENVIRONMENT=production";
  const host = String(process.env.HOSTNAME || process.env.COMPUTERNAME || "").toLowerCase();
  if (host.includes("prod")) return `hostname contains 'prod' (${host})`;
  return null;
}

function contentTypeForExtension(ext) {
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "";
}

// Media-role keywords recognized in the path for reporting counts. Order
// matters for combined names: "heroPoster.jpg" classifies as poster, not hero.
const MEDIA_ROLE_KEYWORDS = ["hover", "header", "poster", "splash", "menu", "hero"];

function classifyType(relativePath) {
  const joined = relativePath.toLowerCase().split("/").join("/");
  const role = MEDIA_ROLE_KEYWORDS.find((keyword) => joined.includes(keyword));
  if (joined.includes("/brands/")) return role ? `brand-${role}` : "brand";
  if (joined.includes("/categories/")) return role ? `category-${role}` : "category";
  if (joined.includes("/products/")) {
    if (joined.includes("gallery")) return role ? `gallery-${role}` : "gallery";
    if (joined.includes("variant")) return role ? `variant-${role}` : "variant";
    return role ? `product-${role}` : "product";
  }
  if (joined.includes("banner") || joined.includes("/website-media/")) return role ? `banner-${role}` : "banner";
  return role ? `other-${role}` : "other";
}

function replaceExtension(relativePath, newExt) {
  const extIndex = relativePath.lastIndexOf(".");
  const stem = extIndex > 0 ? relativePath.slice(0, extIndex) : relativePath;
  return `${stem}${newExt}`;
}

async function recompressSameExtension(buffer, ext) {
  const pipeline = sharp(buffer, { failOn: "none", animated: false }).rotate();
  try {
    if (ext === ".jpg" || ext === ".jpeg") {
      return await pipeline
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
    }
    if (ext === ".png") {
      return await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    }
    if (ext === ".webp") {
      return await pipeline.webp({ quality: 80, alphaQuality: 90, smartSubsample: true, effort: 4 }).toBuffer();
    }
  } catch {
    return null;
  }
  return null;
}

function discoverImages(root, companyFilter) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === BACKUP_ROOT_NAME) continue;
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(ext)) continue;
        if (entry.name.endsWith(".admin-preview.webp")) continue;
        const relative = path.relative(root, full).split(path.sep).join("/");
        if (companyFilter && !relative.toLowerCase().startsWith(`${companyFilter.toLowerCase()}/`)) continue;
        files.push({ full, relative, ext });
      }
    }
  };
  walk(root);
  return files;
}

async function processFile({ full, relative, ext }, { apply, backupRoot }) {
  const originalBytes = fs.statSync(full).size;
  const contentType = contentTypeForExtension(ext);
  const result = {
    relativePath: relative,
    type: classifyType(relative),
    originalBytes,
    projectedBytes: originalBytes,
    mainAction: "keep",
    remap: null,
    previewBytes: 0,
    previewAction: "skip",
    skipReason: null,
    failure: null,
  };

  let buffer;
  try {
    buffer = fs.readFileSync(full);
  } catch (error) {
    result.failure = `read-failed:${error.message}`;
    return result;
  }

  const optimized = await optimizeImageUpload(buffer, contentType);
  let mainData = null;
  let mainTarget = full;

  if (optimized.skipped) {
    result.skipReason = optimized.reason || "skipped";
  } else {
    const optimizedExt = optimized.filenameExt || ext;
    if (optimizedExt === ext) {
      // Same extension: URL stays stable, write in place.
      mainData = optimized.data;
      result.mainAction = "rewrite-same-ext";
      result.projectedBytes = optimized.data.length;
    } else {
      // Format conversion (e.g. jpg → webp). Prefer same-extension recompress
      // when it preserves the URL and hits size goals; only remap when WebP is
      // materially better.
      const sameExt = await recompressSameExtension(buffer, ext);
      const sameExtGain = Boolean(sameExt && sameExt.length < originalBytes * 0.95);
      const webpMateriallyBetter = optimized.data.length < (sameExt?.length ?? Infinity) * 0.8;
      if (sameExtGain && !webpMateriallyBetter) {
        mainData = sameExt;
        result.mainAction = "rewrite-same-ext";
        result.projectedBytes = sameExt.length;
      } else {
        mainData = optimized.data;
        result.mainAction = "rewrite-webp-remap";
        result.projectedBytes = optimized.data.length;
        result.remap = { from: relative, to: replaceExtension(relative, ".webp") };
        mainTarget = path.join(path.dirname(full), path.basename(result.remap.to));
      }
    }
  }

  const preview = await generateAdminPreview(buffer, contentType);
  if (!preview.skipped && preview.data?.length) {
    result.previewAction = "write";
    result.previewBytes = preview.data.length;
  }

  if (apply) {
    try {
      if (mainData) {
        // Backup original BEFORE any write; never delete originals on apply.
        const backupTarget = path.join(backupRoot, relative);
        fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
        fs.copyFileSync(full, backupTarget);
        fs.mkdirSync(path.dirname(mainTarget), { recursive: true });
        fs.writeFileSync(mainTarget, mainData);
      }
      if (result.previewAction === "write") {
        const previewFilename = adminPreviewFilename(path.basename(relative));
        fs.writeFileSync(path.join(path.dirname(full), previewFilename), preview.data);
      }
    } catch (error) {
      result.failure = `apply-failed:${error.message}`;
    }
  }

  return result;
}

function summarize(results, flags, runId) {
  const countsByType = {};
  const skips = {};
  const failures = [];
  let bytesBefore = 0;
  let bytesAfter = 0;
  for (const result of results) {
    countsByType[result.type] = (countsByType[result.type] || 0) + 1;
    bytesBefore += result.originalBytes;
    bytesAfter += result.projectedBytes;
    if (result.skipReason) skips[result.skipReason] = (skips[result.skipReason] || 0) + 1;
    if (result.failure) failures.push({ relativePath: result.relativePath, failure: result.failure });
  }
  const reductions = results
    .filter((result) => result.originalBytes > 0 && result.projectedBytes < result.originalBytes)
    .map((result) => ((result.originalBytes - result.projectedBytes) / result.originalBytes) * 100);
  return {
    mode: flags.apply ? "apply" : "dry-run",
    runId,
    uploadsDir,
    scanned: results.length,
    countsByType,
    skips,
    failures,
    bytesBefore,
    bytesAfter,
    reductionPercent:
      bytesBefore > 0 ? Number((((bytesBefore - bytesAfter) / bytesBefore) * 100).toFixed(1)) : 0,
    averageReductionPercent: reductions.length
      ? Number((reductions.reduce((sum, value) => sum + value, 0) / reductions.length).toFixed(1))
      : 0,
    biggestFiles: [...results]
      .sort((left, right) => right.originalBytes - left.originalBytes)
      .slice(0, 5)
      .map((result) => ({
        relativePath: result.relativePath,
        originalBytes: result.originalBytes,
        projectedBytes: result.projectedBytes,
      })),
    remaps: results.filter((result) => result.remap).map((result) => result.remap),
    previewsToWrite: results.filter((result) => result.previewAction === "write").length,
  };
}

function parseRunIdTimestamp(runId) {
  // runId is `new Date().toISOString().replace(/[:.]/g, "-")`, e.g.
  // `2026-09-13T12-34-56-789Z`. Normalize back to ISO and parse; fall back to
  // the directory mtime when the name is not a timestamp.
  const normalized = String(runId).replace(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
    "$1T$2:$3:$4.$5Z",
  );
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function runAgeMs(runDir) {
  const parsed = parseRunIdTimestamp(path.basename(runDir));
  if (parsed != null) return Date.now() - parsed;
  try {
    return Date.now() - fs.statSync(runDir).mtimeMs;
  } catch {
    return Infinity;
  }
}

/**
 * Cleanup mode: report/delete stale `.optimize-backup/<runId>/` runs.
 * - Dry by default; `--apply` (with CONFIRM=STAGING) actually deletes.
 * - Only runs older than `--older-than-days` (verification window) qualify.
 * - NEVER deletes a backup whose content is still the live asset (byte-
 *   identical to the current file at the same relative path).
 * - Only ever touches paths under uploads/.optimize-backup/.
 */
async function cleanupBackups(flags) {
  const backupRoot = path.join(uploadsDir, BACKUP_ROOT_NAME);
  const report = {
    mode: flags.apply ? "cleanup-apply" : "cleanup-dry-run",
    backupRoot,
    olderThanDays: flags.olderThanDays,
    runs: 0,
    eligibleRuns: 0,
    tooRecentRuns: 0,
    filesScanned: 0,
    deletedFiles: 0,
    deletedBytes: 0,
    skippedStillLive: 0,
    skippedUnsafe: 0,
    failures: [],
    restoreNote:
      "Restore: copy uploads/.optimize-backup/<runId>/<relative> back over uploads/<relative> to restore the pre-optimization original.",
  };

  if (!fs.existsSync(backupRoot)) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const olderThanMs = flags.olderThanDays * 24 * 60 * 60 * 1000;
  const runs = [];
  for (const entry of fs.readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(backupRoot, entry.name);
    runs.push({ name: entry.name, runDir, ageMs: runAgeMs(runDir) });
  }
  report.runs = runs.length;

  for (const run of runs) {
    if (run.ageMs < olderThanMs) {
      report.tooRecentRuns += 1;
      continue;
    }
    report.eligibleRuns += 1;

    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) files.push(full);
      }
    };
    walk(run.runDir);

    for (const backupFile of files) {
      report.filesScanned += 1;
      const relative = path.relative(run.runDir, backupFile).split(path.sep).join("/");
      const livePath = path.join(uploadsDir, relative);

      let stillLive = false;
      try {
        if (fs.existsSync(livePath)) {
          stillLive = fs.readFileSync(livePath).equals(fs.readFileSync(backupFile));
        }
      } catch {
        // Unreadable live/backup: refuse to delete (unsafe).
        report.skippedUnsafe += 1;
        continue;
      }
      if (stillLive) {
        report.skippedStillLive += 1;
        continue;
      }

      const size = fs.statSync(backupFile).size;
      if (flags.apply) {
        try {
          fs.unlinkSync(backupFile);
          report.deletedFiles += 1;
          report.deletedBytes += size;
        } catch (error) {
          report.failures.push({ file: backupFile, failure: error.message });
        }
      } else {
        report.deletedFiles += 1;
        report.deletedBytes += size;
      }
    }
  }

  // Prune empty run directories after a real cleanup.
  if (flags.apply) {
    for (const run of runs) {
      try {
        if (fs.readdirSync(run.runDir).length === 0) fs.rmdirSync(run.runDir);
      } catch {
        // leave the directory alone
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
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
  if (!fs.existsSync(uploadsDir)) {
    console.error(`Uploads directory not found: ${uploadsDir}`);
    process.exit(2);
  }

  if (flags.cleanupBackups) {
    await cleanupBackups(flags);
    return;
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(uploadsDir, BACKUP_ROOT_NAME, runId);
  const files = discoverImages(uploadsDir, flags.company).slice(0, flags.limit);

  const results = [];
  for (const file of files) {
    const result = await processFile(file, { apply: flags.apply, backupRoot });
    results.push(result);
    if (result.failure) console.error(`FAIL ${result.relativePath}: ${result.failure}`);
  }

  const summary = summarize(results, flags, runId);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`Backfill aborted: ${error.message}`);
  process.exit(1);
});