import sharp from "sharp";

export const IMAGE_OPTIMIZE_TARGET_BYTES = 1_000_000;
export const IMAGE_OPTIMIZE_SKIP_BYTES = 250_000;

// Admin-only list thumbnails (54px table cells, ~3x for retina). NEVER used for
// storefront hero/product large visuals.
export const ADMIN_PREVIEW_MAX_EDGE = 160;
export const ADMIN_PREVIEW_SUFFIX = ".admin-preview.webp";

const WEBP_QUALITY_STEPS = [82, 74, 66, 58, 50, 42];
const JPEG_QUALITY_STEPS = [85, 78, 70, 62, 55, 48];

/**
 * Naming helper: `/uploads/co/foo.jpg` → `/uploads/co/foo.admin-preview.webp`
 * (same basename + `.admin-preview.webp` before final extension replacement).
 */
export function adminPreviewFilename(filename) {
  const base = String(filename || "");
  if (base.endsWith(ADMIN_PREVIEW_SUFFIX)) return base;
  const extIndex = base.lastIndexOf(".");
  const stem = extIndex > 0 ? base.slice(0, extIndex) : base;
  return `${stem}${ADMIN_PREVIEW_SUFFIX}`;
}

function extensionForContentType(contentType) {
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/gif") return ".gif";
  return "";
}

function result({
  data,
  contentType,
  width,
  height,
  originalBytes,
  quality = null,
  format,
  skipped = false,
  reason = null,
}) {
  return {
    data,
    contentType,
    filenameExt: extensionForContentType(contentType),
    width,
    height,
    originalBytes,
    optimizedBytes: data.length,
    quality,
    format,
    skipped,
    reason,
    reductionPercent:
      originalBytes > 0
        ? Number((((originalBytes - data.length) / originalBytes) * 100).toFixed(1))
        : 0,
  };
}

/**
 * File-size compression only. Never changes pixel width/height (no resize/crop/stretch).
 * Auto-orients via EXIF then strips metadata. Prefer WebP when safe.
 */
export async function optimizeImageUpload(buffer, contentType = "") {
  const originalBytes = Buffer.byteLength(buffer);
  const mime = String(contentType || "").toLowerCase();

  if (!Buffer.isBuffer(buffer) || !originalBytes) {
    return result({
      data: buffer,
      contentType: mime || "application/octet-stream",
      width: null,
      height: null,
      originalBytes,
      format: null,
      skipped: true,
      reason: "empty",
    });
  }

  // Animated GIF: keep as-is (re-encoding flattens animation).
  if (mime === "image/gif") {
    try {
      const meta = await sharp(buffer, { animated: true, failOn: "none" }).metadata();
      if ((meta.pages || 1) > 1) {
        return result({
          data: buffer,
          contentType: mime,
          width: meta.width ?? null,
          height: meta.height ?? null,
          originalBytes,
          format: "gif",
          skipped: true,
          reason: "animated-gif",
        });
      }
    } catch {
      return result({
        data: buffer,
        contentType: mime,
        width: null,
        height: null,
        originalBytes,
        format: "gif",
        skipped: true,
        reason: "gif-unreadable",
      });
    }
  }

  // Already small web-friendly assets: avoid unnecessary recompress.
  if (
    originalBytes <= IMAGE_OPTIMIZE_SKIP_BYTES &&
    (mime === "image/webp" || mime === "image/jpeg" || mime === "image/png")
  ) {
    try {
      const meta = await sharp(buffer, { failOn: "none" }).metadata();
      return result({
        data: buffer,
        contentType: mime,
        width: meta.width ?? null,
        height: meta.height ?? null,
        originalBytes,
        format: meta.format || mime.split("/")[1] || null,
        skipped: true,
        reason: "already-small",
      });
    } catch {
      return result({
        data: buffer,
        contentType: mime,
        width: null,
        height: null,
        originalBytes,
        format: null,
        skipped: true,
        reason: "already-small-unreadable",
      });
    }
  }

  let pipeline;
  let meta;
  try {
    pipeline = sharp(buffer, { failOn: "none", animated: false }).rotate();
    meta = await pipeline.metadata();
  } catch (error) {
    return result({
      data: buffer,
      contentType: mime || "application/octet-stream",
      width: null,
      height: null,
      originalBytes,
      format: null,
      skipped: true,
      reason: `decode-failed:${error.message}`,
    });
  }

  const width = meta.width ?? null;
  const height = meta.height ?? null;
  const hasAlpha = Boolean(meta.hasAlpha);

  async function encodeWebp(quality) {
    // New sharp instance each attempt — pipelines are consumed after toBuffer.
    return sharp(buffer, { failOn: "none", animated: false })
      .rotate()
      .webp({
        quality,
        alphaQuality: Math.min(100, quality + 8),
        smartSubsample: true,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });
  }

  async function encodeJpeg(quality) {
    return sharp(buffer, { failOn: "none", animated: false })
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  }

  async function encodePng() {
    return sharp(buffer, { failOn: "none", animated: false })
      .rotate()
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toBuffer({ resolveWithObject: true });
  }

  let best = null;

  const tryCandidates = async (steps, encoder, contentTypeOut, format) => {
    for (const quality of steps) {
      try {
        const encoded = await encoder(quality);
        const info = encoded.info;
        // Guard: never accept a dimension change.
        if (
          (width != null && info.width != null && info.width !== width) ||
          (height != null && info.height != null && info.height !== height)
        ) {
          continue;
        }
        const candidate = {
          data: encoded.data,
          contentType: contentTypeOut,
          width: info.width ?? width,
          height: info.height ?? height,
          originalBytes,
          quality,
          format,
          skipped: false,
          reason: null,
        };
        if (!best || candidate.data.length < best.data.length) best = candidate;
        if (candidate.data.length <= IMAGE_OPTIMIZE_TARGET_BYTES) break;
      } catch {
        // try next quality
      }
    }
  };

  // Prefer WebP (supports alpha). Fall back to JPEG (opaque) or PNG (alpha).
  await tryCandidates(WEBP_QUALITY_STEPS, encodeWebp, "image/webp", "webp");

  if (!best || best.data.length > IMAGE_OPTIMIZE_TARGET_BYTES) {
    if (hasAlpha) {
      try {
        const encoded = await encodePng();
        const info = encoded.info;
        if (
          !(width != null && info.width != null && info.width !== width) &&
          !(height != null && info.height != null && info.height !== height)
        ) {
          const candidate = {
            data: encoded.data,
            contentType: "image/png",
            width: info.width ?? width,
            height: info.height ?? height,
            originalBytes,
            quality: null,
            format: "png",
            skipped: false,
            reason: null,
          };
          if (!best || candidate.data.length < best.data.length) best = candidate;
        }
      } catch {
        // keep webp best
      }
    } else {
      await tryCandidates(JPEG_QUALITY_STEPS, encodeJpeg, "image/jpeg", "jpeg");
    }
  }

  if (!best) {
    return result({
      data: buffer,
      contentType: mime || "application/octet-stream",
      width,
      height,
      originalBytes,
      format: meta.format || null,
      skipped: true,
      reason: "encode-failed",
    });
  }

  // Keep original when optimization is not meaningfully smaller.
  if (best.data.length >= originalBytes * 0.95) {
    return result({
      data: buffer,
      contentType: mime || best.contentType,
      width,
      height,
      originalBytes,
      format: meta.format || null,
      skipped: true,
      reason: "no-meaningful-gain",
      quality: best.quality,
    });
  }

  return result(best);
}

/**
 * Admin-only preview generator — ALLOWED to resize (unlike optimizeImageUpload).
 * - Max edge ~160px, contain, no upscale
 * - WebP preferred, alpha-safe
 * - Strips metadata (rotate() auto-orients + webp encode drops EXIF)
 * Returns `{ data, contentType, width, height, filenameSuffix }`.
 * NEVER use these for storefront large visuals.
 */
export async function generateAdminPreview(buffer, contentType = "") {
  const originalBytes = Buffer.byteLength(buffer);
  const mime = String(contentType || "").toLowerCase();

  if (!Buffer.isBuffer(buffer) || !originalBytes) {
    return {
      data: buffer,
      contentType: mime || "application/octet-stream",
      width: null,
      height: null,
      filenameSuffix: ADMIN_PREVIEW_SUFFIX,
      originalBytes,
      previewBytes: 0,
      skipped: true,
      reason: "empty",
    };
  }

  // Animated GIF: keep as-is (re-encoding flattens animation).
  if (mime === "image/gif") {
    try {
      const meta = await sharp(buffer, { animated: true, failOn: "none" }).metadata();
      if ((meta.pages || 1) > 1) {
        return {
          data: buffer,
          contentType: mime,
          width: meta.width ?? null,
          height: meta.height ?? null,
          filenameSuffix: ADMIN_PREVIEW_SUFFIX,
          originalBytes,
          previewBytes: originalBytes,
          skipped: true,
          reason: "animated-gif",
        };
      }
    } catch {
      return {
        data: buffer,
        contentType: mime,
        width: null,
        height: null,
        filenameSuffix: ADMIN_PREVIEW_SUFFIX,
        originalBytes,
        previewBytes: originalBytes,
        skipped: true,
        reason: "gif-unreadable",
      };
    }
  }

  let meta;
  try {
    meta = await sharp(buffer, { failOn: "none", animated: false }).metadata();
  } catch (error) {
    return {
      data: buffer,
      contentType: mime || "application/octet-stream",
      width: null,
      height: null,
      filenameSuffix: ADMIN_PREVIEW_SUFFIX,
      originalBytes,
      previewBytes: originalBytes,
      skipped: true,
      reason: `decode-failed:${error.message}`,
    };
  }

  const width = meta.width ?? null;
  const height = meta.height ?? null;
  if (!width || !height) {
    return {
      data: buffer,
      contentType: mime || "application/octet-stream",
      width: null,
      height: null,
      filenameSuffix: ADMIN_PREVIEW_SUFFIX,
      originalBytes,
      previewBytes: originalBytes,
      skipped: true,
      reason: "no-dimensions",
    };
  }

  const scale = Math.min(1, ADMIN_PREVIEW_MAX_EDGE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  try {
    const encoded = await sharp(buffer, { failOn: "none", animated: false })
      .rotate()
      .resize(targetWidth, targetHeight, { fit: "contain", withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 90, smartSubsample: true, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    return {
      data: encoded.data,
      contentType: "image/webp",
      width: encoded.info.width ?? targetWidth,
      height: encoded.info.height ?? targetHeight,
      filenameSuffix: ADMIN_PREVIEW_SUFFIX,
      originalBytes,
      previewBytes: encoded.data.length,
      skipped: false,
      reason: null,
    };
  } catch (error) {
    return {
      data: buffer,
      contentType: mime || "application/octet-stream",
      width,
      height,
      filenameSuffix: ADMIN_PREVIEW_SUFFIX,
      originalBytes,
      previewBytes: originalBytes,
      skipped: true,
      reason: `encode-failed:${error.message}`,
    };
  }
}
