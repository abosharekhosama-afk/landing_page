import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  ADMIN_PREVIEW_MAX_EDGE,
  ADMIN_PREVIEW_SUFFIX,
  adminPreviewFilename,
  generateAdminPreview,
  IMAGE_OPTIMIZE_SKIP_BYTES,
  IMAGE_OPTIMIZE_TARGET_BYTES,
  optimizeImageUpload,
} from "../src/uploads/optimizeImageUpload.js";

test("optimizeImageUpload preserves exact pixel dimensions on large JPEG", async () => {
  const width = 2400;
  const height = 1800;
  const original = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 48, g: 110, b: 190 },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();

  // Inflate with low-compressibility noise if needed so original is large.
  let payload = original;
  if (payload.length < 1_500_000) {
    payload = await sharp({
      create: {
        width,
        height,
        channels: 3,
        noise: { type: "gaussian", mean: 128, sigma: 60 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  const optimized = await optimizeImageUpload(payload, "image/jpeg");
  assert.equal(optimized.width, width);
  assert.equal(optimized.height, height);
  assert.ok(optimized.optimizedBytes < optimized.originalBytes, "file size must shrink");
  assert.ok(
    optimized.optimizedBytes <= IMAGE_OPTIMIZE_TARGET_BYTES * 1.35 || optimized.format === "webp",
    "should approach ~1MB target when practical",
  );
  assert.ok(["webp", "jpeg"].includes(optimized.format) || optimized.contentType.startsWith("image/"));

  console.log(
    JSON.stringify({
      example: "large-jpeg",
      dimensions: `${width}x${height}`,
      originalBytes: optimized.originalBytes,
      optimizedBytes: optimized.optimizedBytes,
      reductionPercent: optimized.reductionPercent,
      format: optimized.format,
      quality: optimized.quality,
      skipped: optimized.skipped,
    }),
  );
});

test("optimizeImageUpload skips already-small web-friendly images", async () => {
  const small = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#224466" },
  })
    .webp({ quality: 80 })
    .toBuffer();
  assert.ok(small.length <= IMAGE_OPTIMIZE_SKIP_BYTES);
  const optimized = await optimizeImageUpload(small, "image/webp");
  assert.equal(optimized.skipped, true);
  assert.equal(optimized.reason, "already-small");
  assert.equal(optimized.width, 64);
  assert.equal(optimized.height, 64);
  assert.equal(optimized.optimizedBytes, small.length);
});

test("optimizeImageUpload preserves transparency via WebP/PNG path", async () => {
  const width = 800;
  const height = 600;
  const png = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 20, g: 180, b: 90, alpha: 0.4 },
    },
  })
    .png()
    .toBuffer();

  const optimized = await optimizeImageUpload(png, "image/png");
  assert.equal(optimized.width, width);
  assert.equal(optimized.height, height);
  assert.ok(
    optimized.contentType === "image/webp" || optimized.contentType === "image/png",
    "alpha-safe format required",
  );
  if (!optimized.skipped) {
    assert.ok(optimized.optimizedBytes < optimized.originalBytes);
  }
  console.log(
    JSON.stringify({
      example: "alpha-png",
      dimensions: `${width}x${height}`,
      originalBytes: optimized.originalBytes,
      optimizedBytes: optimized.optimizedBytes,
      reductionPercent: optimized.reductionPercent,
      format: optimized.format,
      quality: optimized.quality,
      skipped: optimized.skipped,
    }),
  );
});

test("optimizeImageUpload never calls resize semantics (dimension lock)", async () => {
  const width = 1200;
  const height = 900;
  const original = await sharp({
    create: { width, height, channels: 3, background: "#8899aa" },
  })
    .jpeg({ quality: 92 })
    .toBuffer();
  const optimized = await optimizeImageUpload(original, "image/jpeg");
  assert.equal(optimized.width, width);
  assert.equal(optimized.height, height);
});

test("adminPreviewFilename derives sibling admin-preview path", () => {
  assert.equal(adminPreviewFilename("foo.jpg"), "foo.admin-preview.webp");
  assert.equal(adminPreviewFilename("/uploads/co/foo.jpg"), "/uploads/co/foo.admin-preview.webp");
  assert.equal(adminPreviewFilename("foo.png"), "foo.admin-preview.webp");
  assert.equal(adminPreviewFilename("noext"), "noext.admin-preview.webp");
  assert.equal(adminPreviewFilename("foo.admin-preview.webp"), "foo.admin-preview.webp");
  assert.equal(adminPreviewFilename(""), ".admin-preview.webp");
});

test("generateAdminPreview shrinks dimensions AND bytes (admin-only resize allowed)", async () => {
  const width = 2400;
  const height = 1800;
  const original = await sharp({
    create: {
      width,
      height,
      channels: 3,
      noise: { type: "gaussian", mean: 128, sigma: 60 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();

  const preview = await generateAdminPreview(original, "image/jpeg");
  assert.equal(preview.skipped, false);
  assert.equal(preview.contentType, "image/webp");
  assert.equal(preview.filenameSuffix, ADMIN_PREVIEW_SUFFIX);
  assert.ok(preview.width <= ADMIN_PREVIEW_MAX_EDGE, "width must shrink to max edge");
  assert.ok(preview.height <= ADMIN_PREVIEW_MAX_EDGE, "height must shrink to max edge");
  assert.ok(preview.width < width, "width must be smaller than original");
  assert.ok(preview.height < height, "height must be smaller than original");
  assert.ok(preview.previewBytes < preview.originalBytes, "bytes must shrink");
  assert.ok(preview.previewBytes < original.length, "preview must be smaller than source");

  console.log(
    JSON.stringify({
      example: "admin-preview",
      dimensions: `${width}x${height}`,
      previewDimensions: `${preview.width}x${preview.height}`,
      originalBytes: preview.originalBytes,
      previewBytes: preview.previewBytes,
      contentType: preview.contentType,
    }),
  );
});

test("generateAdminPreview does not upscale small images", async () => {
  const small = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#224466" },
  })
    .webp({ quality: 80 })
    .toBuffer();
  const preview = await generateAdminPreview(small, "image/webp");
  assert.equal(preview.skipped, false);
  assert.equal(preview.width, 64);
  assert.equal(preview.height, 64);
});

test("generateAdminPreview is alpha-safe (WebP)", async () => {
  const png = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 20, g: 180, b: 90, alpha: 0.4 },
    },
  })
    .png()
    .toBuffer();
  const preview = await generateAdminPreview(png, "image/png");
  assert.equal(preview.contentType, "image/webp");
  assert.ok(preview.width <= ADMIN_PREVIEW_MAX_EDGE);
  assert.ok(preview.height <= ADMIN_PREVIEW_MAX_EDGE);
});

test("backfill dry-run on temp fixture directory reports projections without writing", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-fixture-"));
  try {
    const coDir = path.join(fixtureRoot, "co", "brands");
    fs.mkdirSync(coDir, { recursive: true });

    const bigJpeg = await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 3,
        noise: { type: "gaussian", mean: 128, sigma: 60 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    fs.writeFileSync(path.join(coDir, "logo.jpg"), bigJpeg);

    const smallWebp = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#224466" },
    })
      .webp({ quality: 80 })
      .toBuffer();
    fs.writeFileSync(path.join(coDir, "tiny.webp"), smallWebp);

    const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = spawnSync(
      process.execPath,
      ["scripts/backfill-optimize-media.mjs", "--dry-run"],
      {
        cwd: apiRoot,
        env: { ...process.env, UPLOADS_DIR: fixtureRoot },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.mode, "dry-run");
    assert.equal(summary.scanned, 2);
    assert.equal(summary.countsByType.brand, 2);
    assert.ok(summary.bytesBefore > 0, "bytes before must be reported");
    assert.ok(summary.bytesAfter < summary.bytesBefore, "projected after must shrink");
    assert.equal(summary.previewsToWrite, 2, "both fixtures project an admin preview");
    assert.equal(summary.failures.length, 0);

    // Dry-run must not write anything.
    assert.ok(!fs.existsSync(path.join(fixtureRoot, ".optimize-backup")), "no backup dir on dry-run");
    assert.ok(!fs.existsSync(path.join(coDir, "logo.admin-preview.webp")), "no preview written on dry-run");
    assert.ok(!fs.existsSync(path.join(coDir, "logo.webp")), "no remap written on dry-run");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("backfill classifyType reports hover/hero/header/poster/splash/menu roles", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-classify-"));
  try {
    const brandDir = path.join(fixtureRoot, "co", "brands", "velvet");
    fs.mkdirSync(brandDir, { recursive: true });
    const img = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#334455" },
    })
      .jpeg({ quality: 90 })
      .toBuffer();
    for (const name of [
      "hero.jpg",
      "heroPoster.jpg",
      "headerImage.jpg",
      "menuImage.jpg",
      "splash.jpg",
      "hover.jpg",
      "logo.jpg",
    ]) {
      fs.writeFileSync(path.join(brandDir, name), img);
    }

    const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = spawnSync(
      process.execPath,
      ["scripts/backfill-optimize-media.mjs", "--dry-run"],
      {
        cwd: apiRoot,
        env: { ...process.env, UPLOADS_DIR: fixtureRoot },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.scanned, 7, "all image files under uploads are still processed");
    assert.equal(summary.countsByType["brand-hero"], 1, "hero.jpg");
    assert.equal(summary.countsByType["brand-poster"], 1, "heroPoster.jpg classifies as poster");
    assert.equal(summary.countsByType["brand-header"], 1, "headerImage.jpg");
    assert.equal(summary.countsByType["brand-menu"], 1, "menuImage.jpg");
    assert.equal(summary.countsByType["brand-splash"], 1, "splash.jpg");
    assert.equal(summary.countsByType["brand-hover"], 1, "hover.jpg");
    assert.equal(summary.countsByType.brand, 1, "logo.jpg stays plain brand");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("backfill cleanup-backups reports, refuses without CONFIRM, keeps still-live originals", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-cleanup-"));
  try {
    const uploads = path.join(fixtureRoot, "uploads");
    const liveBrandDir = path.join(uploads, "co", "brands");
    fs.mkdirSync(liveBrandDir, { recursive: true });

    const oldRunDir = path.join(uploads, ".optimize-backup", "2026-01-01T00-00-00-000Z", "co", "brands");
    fs.mkdirSync(oldRunDir, { recursive: true });

    // Replaced original: live file differs from backup → eligible for cleanup.
    const original = Buffer.from("original-content-1234567890");
    const optimized = Buffer.from("optimized-content-abcdefghij");
    fs.writeFileSync(path.join(liveBrandDir, "logo.jpg"), optimized);
    fs.writeFileSync(path.join(oldRunDir, "logo.jpg"), original);

    // Still-live original: backup identical to the live file → must be kept.
    const kept = Buffer.from("kept-original");
    fs.writeFileSync(path.join(liveBrandDir, "kept.jpg"), kept);
    fs.writeFileSync(path.join(oldRunDir, "kept.jpg"), kept);

    // Recent run inside the verification window → must be skipped.
    const recentRunId = new Date().toISOString().replace(/[:.]/g, "-");
    const recentRunDir = path.join(uploads, ".optimize-backup", recentRunId, "co", "brands");
    fs.mkdirSync(recentRunDir, { recursive: true });
    fs.writeFileSync(path.join(recentRunDir, "recent.jpg"), Buffer.from("recent-backup"));

    const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const run = (args, env = {}) =>
      spawnSync(process.execPath, ["scripts/backfill-optimize-media.mjs", ...args], {
        cwd: apiRoot,
        env: { ...process.env, UPLOADS_DIR: uploads, ...env },
        encoding: "utf8",
      });

    // Dry run: report only, nothing deleted.
    const dry = run(["--cleanup-backups", "--older-than-days=0"]);
    assert.equal(dry.status, 0, dry.stderr);
    const drySummary = JSON.parse(dry.stdout);
    assert.equal(drySummary.mode, "cleanup-dry-run");
    assert.equal(drySummary.runs, 2);
    assert.equal(drySummary.deletedFiles, 2, "replaced original + recent-run file are eligible at 0 days");
    assert.equal(drySummary.skippedStillLive, 1, "still-live original must be kept");
    assert.ok(fs.existsSync(path.join(oldRunDir, "logo.jpg")), "dry run must not delete");

    // Verification window: recent run is skipped with --older-than-days=7.
    const windowed = run(["--cleanup-backups", "--older-than-days=7"]);
    assert.equal(windowed.status, 0, windowed.stderr);
    const windowedSummary = JSON.parse(windowed.stdout);
    assert.equal(windowedSummary.tooRecentRuns, 1, "recent run must stay inside the window");
    assert.equal(windowedSummary.deletedFiles, 1, "only the old replaced original is eligible");
    assert.equal(windowedSummary.skippedStillLive, 1, "still-live original must be kept");

    // Apply without CONFIRM=STAGING must refuse.
    const refused = run(["--cleanup-backups", "--older-than-days=0", "--apply"]);
    assert.equal(refused.status, 2, "apply without CONFIRM=STAGING must refuse");

    // Apply with CONFIRM=STAGING deletes eligible, keeps still-live.
    const applied = run(["--cleanup-backups", "--older-than-days=0", "--apply"], { CONFIRM: "STAGING" });
    assert.equal(applied.status, 0, applied.stderr);
    const appliedSummary = JSON.parse(applied.stdout);
    assert.equal(appliedSummary.mode, "cleanup-apply");
    assert.equal(appliedSummary.deletedFiles, 2);
    assert.equal(appliedSummary.skippedStillLive, 1);
    assert.ok(!fs.existsSync(path.join(oldRunDir, "logo.jpg")), "eligible backup must be deleted");
    assert.ok(fs.existsSync(path.join(oldRunDir, "kept.jpg")), "still-live backup must remain");
    assert.ok(fs.existsSync(path.join(liveBrandDir, "logo.jpg")), "live asset must remain untouched");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("generate-missing-webp-siblings dry-run with explicit paths reports projections without writing", async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "missing-webp-fixture-"));
  try {
    // Write a paths file that the script's readPathsFile will consume.
    const pathsFile = path.join(fixtureRoot, "paths.json");
    fs.writeFileSync(pathsFile, JSON.stringify(["/uploads/kids-velvet/brands/velvet-logo.jpg"]));

    // Test parseArgs, productionMarker, webpSiblingFor, classifyPath, readPathsFile.
    const {
      parseArgs,
      productionMarker,
      webpSiblingFor,
      classifyPath,
      readPathsFile,
      uploadsImagePath,
      summarize,
    } = await import("../scripts/generate-missing-webp-siblings.mjs");

    assert.equal(parseArgs(["--company=kids-velvet"]).company, "kids-velvet");
    assert.equal(parseArgs(["--apply"]).dryRun, false);
    assert.equal(parseArgs(["--dry-run"]).dryRun, true);
    assert.equal(parseArgs(["--limit=5"]).limit, 5);

    assert.ok(productionMarker() === null, "productionMarker must return null in non-production env");

    assert.equal(
      webpSiblingFor("/uploads/kids-velvet/brands/velvet-logo.jpg"),
      "/uploads/kids-velvet/brands/velvet-logo.webp",
    );
    assert.equal(
      webpSiblingFor("https://api.example.com/uploads/kids-velvet/brands/velvet-logo.png"),
      "/uploads/kids-velvet/brands/velvet-logo.webp",
    );
    assert.equal(webpSiblingFor("/images/other.jpg"), "");

    assert.equal(uploadsImagePath("/uploads/kids-velvet/brands/velvet-logo.jpg"), "/uploads/kids-velvet/brands/velvet-logo.jpg");
    assert.equal(uploadsImagePath("https://cdn.example.com/other.jpg"), "");
    assert.equal(uploadsImagePath("/uploads/kids-velvet/product.webp"), "");

    assert.equal(classifyPath("kids-velvet/brands/velvet/logo.jpg"), "brand.logo");
    assert.equal(classifyPath("kids-velvet/brands/velvet/hero.jpg"), "brand");
    assert.equal(classifyPath("kids-velvet/website-media/header.webp"), "website-media");
    assert.equal(classifyPath("kids-velvet/categories/cat.jpg"), "category");
    assert.equal(classifyPath("kids-velvet/products/prod.jpg"), "product");

    const pathRefs = readPathsFile(pathsFile);
    assert.equal(pathRefs.length, 1);
    assert.equal(pathRefs[0].path, "/uploads/kids-velvet/brands/velvet-logo.jpg");

    // Test summarize with a dummy result set.
    const mockResults = [
      {
        path: "/uploads/kids-velvet/brands/velvet-logo.jpg",
        relativePath: "kids-velvet/brands/velvet-logo.jpg",
        category: "brand.logo",
        entityType: "brand",
        entityId: "b1",
        field: "logoUrl",
        originalBytes: 1_500_000,
        webpBytes: 120_000,
        previewBytes: 3_000,
        webpAction: "write",
        previewAction: "write",
        failure: null,
      },
      {
        path: "/uploads/kids-velvet/website-media/header.jpg",
        relativePath: "kids-velvet/website-media/header.jpg",
        category: "website-media",
        entityType: "banner",
        entityId: "wm1",
        field: "imageUrl",
        originalBytes: 800_000,
        webpBytes: 60_000,
        previewBytes: 2_000,
        webpAction: "write",
        previewAction: "write",
        failure: null,
      },
    ];
    const summary = summarize(mockResults, parseArgs(["--dry-run"]), "test-run");
    assert.equal(summary.mode, "dry-run");
    assert.equal(summary.appliedTarget, "local-mirror");
    assert.equal(summary.missingCount, 2);
    assert.equal(summary.bytesBefore, 2_300_000);
    assert.equal(summary.bytesAfter, 180_000);
    assert.equal(summary.previewsToWrite, 2);
    assert.equal(summary.failures.length, 0);
    assert.equal(summary.countsByCategory["brand.logo"], 1);
    assert.equal(summary.countsByCategory["website-media"], 1);
    assert.ok(summary.reductionPercent > 90, "must show significant projected reduction");
    assert.ok(summary.note.includes("Dry-run"), "dry-run summary must note nothing was written");

    const applySummary = summarize(mockResults, parseArgs(["--apply", "--company=kids-velvet"]), "test-run");
    assert.equal(applySummary.mode, "apply");
    assert.ok(applySummary.note.includes("local-mirror"), "apply must note appliedTarget: local-mirror");
    assert.ok(applySummary.note.includes("Nothing was uploaded to staging"), "apply must state nothing was uploaded to staging");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
