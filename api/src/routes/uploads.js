import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { effectiveTenantRole, requireAuth, requirePermission } from "../middleware/auth.js";
import { deleteSupabaseStorageObject, isSupabaseStorageConfigured, uploadImageToSupabaseStorage } from "../data/supabaseStore.js";
import { companyStoragePath, companyStorageSegment } from "../tenancy/company.js";
import { persistCompanyStore, productRepository, userRepository } from "../data/store.js";
import { productMediaRelativeDirectory, validateProductMediaUpload } from "../productSchema/productMedia.js";
import { mediaUrlStillReferenced } from "../products/mediaReferences.js";
import { assertVideoContainer, ffmpegAvailable, MAX_VIDEO_UPLOAD_MB, validateVideoUpload } from "../uploads/videoUpload.js";
import { adminPreviewFilename, generateAdminPreview, optimizeImageUpload } from "../uploads/optimizeImageUpload.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, "../../uploads");

const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const videoTypes = new Map([["video/mp4", ".mp4"], ["video/webm", ".webm"]]);
const productMediaTypes = new Map([...imageTypes, ...videoTypes]);

// Product-scoped media routes: update is enough (matches CPanel product form media UI).
const PRODUCT_MEDIA_MUTATION_PERMISSIONS = ["product_media.manage", "products.manage", "products.update"];
// Legacy POST /uploads stores company-root images and is also used by Website Media UI.
// Do NOT grant products.update here — that would let product editors dump unrelated company files.
const LEGACY_IMAGE_UPLOAD_PERMISSIONS = ["product_media.manage", "products.manage", "website_media.manage"];

function employeeHasAnyPermission(req, permissions) {
  const role = effectiveTenantRole(req);
  return (
    ["employee", "staff"].includes(role) &&
    req.user?.permissions?.some((permission) => permissions.includes(permission))
  );
}

function employeeCanMutateProductMedia(req) {
  return employeeHasAnyPermission(req, PRODUCT_MEDIA_MUTATION_PERMISSIONS);
}

function requireProductUploader(req, res, next) {
  const role = effectiveTenantRole(req);
  if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return next();
  // Shared company-root image endpoint: product media editors OR website media editors.
  // products.update alone is intentionally excluded (use /uploads/products/:productId).
  if (employeeHasAnyPermission(req, LEGACY_IMAGE_UPLOAD_PERMISSIONS)) return next();
  return res.status(403).json({ message: "Product media permission required." });
}

function requireWebsiteMediaUploader(req, res, next) {
  const role = effectiveTenantRole(req);
  if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return next();
  if (["employee", "staff"].includes(role) && req.user?.permissions?.some((p) => ["website_media.manage"].includes(p))) return next();
  return res.status(403).json({ message: "Website media permission required." });
}

function getBoundary(contentType = "") {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2] || "";
}

function safeFilename(filename, contentType, types = imageTypes) {
  const extensionFromName = path.extname(filename || "").toLowerCase();
  const extension =
    allowedExtensions.has(extensionFromName)
      ? extensionFromName.replace(".jpeg", ".jpg")
      : types.get(contentType);

  if (!extension) {
    return "";
  }

  const baseName = path
    .basename(filename || "upload", extensionFromName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${baseName || "image"}-${unique}${extension}`;
}

function parseMultipartImages(body, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  let cursor = body.indexOf(boundaryBuffer);
  const uploads = [];

  while (cursor !== -1) {
    let headerStart = cursor + boundaryBuffer.length;

    if (body.slice(headerStart, headerStart + 2).toString() === "--") {
      break;
    }

    if (body[headerStart] === 13 && body[headerStart + 1] === 10) {
      headerStart += 2;
    }

    const headerEnd = body.indexOf(headerSeparator, headerStart);
    if (headerEnd === -1) {
      break;
    }

    const headers = body.slice(headerStart, headerEnd).toString("utf8");
    const nextBoundary = body.indexOf(boundaryBuffer, headerEnd + headerSeparator.length);
    if (nextBoundary === -1) {
      break;
    }

    const filename = headers.match(/filename="([^"]+)"/i)?.[1];
    if (filename) {
      const contentType =
        headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() || "";
      let dataEnd = nextBoundary;

      if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) {
        dataEnd -= 2;
      }

      uploads.push({
        contentType,
        filename,
        data: body.slice(headerEnd + headerSeparator.length, dataEnd),
      });
    }

    cursor = nextBoundary;
  }

  return uploads;
}

function buildPublicUrl(req, relativePath) {
  const configuredPublicApiUrl = process.env.PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (configuredPublicApiUrl) {
    return `${configuredPublicApiUrl}/uploads/${relativePath}`;
  }

  const forwardedProtocol = req.headers["x-forwarded-proto"]?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || req.protocol;
  return `${protocol}://${req.get("host")}/uploads/${relativePath}`;
}

async function prepareOptimizedImageUpload(upload) {
  const optimized = await optimizeImageUpload(upload.data, upload.contentType);
  const contentType = optimized.contentType || upload.contentType;
  const filename = safeFilename(upload.filename, contentType);
  if (!filename) {
    const error = new Error("Unsupported image file type.");
    error.statusCode = 400;
    throw error;
  }
  // Ensure extension matches optimized format (WebP conversion changes extension).
  const desiredExt = optimized.filenameExt || path.extname(filename);
  const finalName = desiredExt && !filename.endsWith(desiredExt)
    ? `${filename.replace(/\.[^.]+$/, "")}${desiredExt}`
    : filename;
  return {
    data: optimized.data,
    contentType,
    filename: finalName,
    optimization: {
      width: optimized.width,
      height: optimized.height,
      originalBytes: optimized.originalBytes,
      optimizedBytes: optimized.optimizedBytes,
      reductionPercent: optimized.reductionPercent,
      format: optimized.format,
      quality: optimized.quality,
      skipped: optimized.skipped,
      reason: optimized.reason,
    },
  };
}

/**
 * Writes the sibling admin preview (`foo.admin-preview.webp`) next to a freshly
 * optimized image upload. Image uploads only — never called for video.
 * Returns null when the source cannot produce a preview (animated gif, decode
 * failure, empty payload) so callers can skip the sibling without failing the
 * main upload.
 */
async function writeAdminPreviewSibling({
  companyId,
  prepared,
  localDirectory,
  relativePrefix,
  pathParts,
  useSupabaseStorage,
}) {
  const preview = await generateAdminPreview(prepared.data, prepared.contentType);
  if (preview.skipped || !preview.data?.length) return null;
  const previewFilename = adminPreviewFilename(prepared.filename);
  if (useSupabaseStorage) {
    const saved = await uploadImageToSupabaseStorage({
      companyId,
      filename: previewFilename,
      contentType: preview.contentType,
      data: preview.data,
      pathParts,
    });
    return { ...saved, preview, filename: previewFilename };
  }
  const relativePath = `${relativePrefix}/${previewFilename}`;
  fs.writeFileSync(path.join(localDirectory, previewFilename), preview.data);
  return { path: `/uploads/${relativePath}`, relativePath, preview, filename: previewFilename };
}

function requiresPersistentStorage() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function requireProductMediaPermission(req, res, next) {
  const role = effectiveTenantRole(req);
  if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return next();
  if (employeeCanMutateProductMedia(req)) return next();
  return res.status(403).json({ message: "Product media permission required." });
}

function requireOwnedProduct(req, res, next) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(req.params.productId || "")) return res.status(400).json({ message: "Invalid product ID." });
  if (!productRepository.findByCompany(req.companyId, req.params.productId)) return res.status(404).json({ message: "Product not found." });
  return next();
}

function hasLocalPersistentStorage() {
  return Boolean(process.env.UPLOADS_DIR?.trim());
}

function storageUnavailableResponse(req, res, mediaLabel = "media") {
  const isArabic = String(req.headers["accept-language"] || "").toLowerCase().startsWith("ar");
  const message = isArabic
    ? "تخزين الوسائط الدائم غير مهيأ على الخادم. يرجى المحاولة بعد تهيئة التخزين."
    : `Persistent ${mediaLabel} storage is not configured. Configure UPLOADS_DIR on a mounted persistent volume or configure Supabase Storage.`;
  return res.status(503).json({ code: "MEDIA_STORAGE_UNAVAILABLE", message });
}

router.post(
  "/",
  requireAuth,
  requireProductUploader,
  express.raw({
    limit: "25mb",
    type: (req) => req.headers["content-type"]?.startsWith("multipart/form-data"),
  }),
  async (req, res) => {
    const boundary = getBoundary(req.headers["content-type"]);
    const uploads = boundary ? parseMultipartImages(req.body, boundary) : [];

    if (!uploads.length) {
      return res.status(400).json({ message: "No image file was uploaded." });
    }

    for (const upload of uploads) {
      if (!imageTypes.has(upload.contentType)) {
        return res.status(400).json({ message: "Only JPG, PNG, WEBP, and GIF images are allowed." });
      }
    }

    const useSupabaseStorage = isSupabaseStorageConfigured();

    if (!useSupabaseStorage && requiresPersistentStorage() && !hasLocalPersistentStorage()) {
      return storageUnavailableResponse(req, res, "image");
    }

    const companyUploadDir = path.join(uploadsDir, companyStorageSegment(req.companyId));
    if (!useSupabaseStorage) fs.mkdirSync(companyUploadDir, { recursive: true });

    const savedFiles = [];

    for (const upload of uploads) {
      let prepared;
      try {
        prepared = await prepareOptimizedImageUpload(upload);
      } catch (error) {
        return res.status(error.statusCode || 400).json({ message: error.message });
      }

      if (useSupabaseStorage) {
        const saved = await uploadImageToSupabaseStorage({
          companyId: req.companyId,
          filename: prepared.filename,
          contentType: prepared.contentType,
          data: prepared.data,
        });
        const preview = await writeAdminPreviewSibling({
          companyId: req.companyId,
          prepared,
          pathParts: ["uploads", new Date().toISOString().slice(0, 10)],
          useSupabaseStorage,
        });
        savedFiles.push({
          ...saved,
          optimization: prepared.optimization,
          ...(preview ? { adminPreviewUrl: preview.url } : {}),
        });
      } else {
        const relativePath = companyStoragePath(req.companyId, prepared.filename);
        fs.writeFileSync(path.join(companyUploadDir, prepared.filename), prepared.data);
        const preview = await writeAdminPreviewSibling({
          companyId: req.companyId,
          prepared,
          localDirectory: companyUploadDir,
          relativePrefix: companyStorageSegment(req.companyId),
          useSupabaseStorage,
        });
        savedFiles.push({
          path: `/uploads/${relativePath}`,
          url: buildPublicUrl(req, relativePath),
          optimization: prepared.optimization,
          ...(preview ? { adminPreviewUrl: buildPublicUrl(req, preview.relativePath) } : {}),
        });
      }
    }

    res.status(201).json({
      ...savedFiles[0],
      files: savedFiles,
    });
  },
);

router.post(
  "/products/:productId",
  requireAuth,
  requireProductMediaPermission,
  requireOwnedProduct,
  express.raw({ limit: "55mb", type: (req) => req.headers["content-type"]?.startsWith("multipart/form-data") }),
  async (req, res, next) => {
    try {
      const boundary = getBoundary(req.headers["content-type"]);
      const uploads = boundary ? parseMultipartImages(req.body, boundary) : [];
      if (!uploads.length) return res.status(400).json({ message: "No media file was uploaded." });
      const validatedUploads = [];
      for (const upload of uploads) {
        try {
          validatedUploads.push({
            upload,
            validation: validateProductMediaUpload({ contentType: upload.contentType, size: upload.data.length }),
          });
        } catch (error) {
          return res.status(error.statusCode || 400).json({ message: error.message });
        }
      }
      const useSupabaseStorage = isSupabaseStorageConfigured();
      if (!useSupabaseStorage && requiresPersistentStorage() && !hasLocalPersistentStorage()) return storageUnavailableResponse(req, res);
      const relativeDirectory = productMediaRelativeDirectory(req.companyId, req.params.productId);
      const localDirectory = path.join(uploadsDir, ...relativeDirectory.split("/"));
      if (!useSupabaseStorage) fs.mkdirSync(localDirectory, { recursive: true });
      const savedFiles = [];
      for (const { upload, validation } of validatedUploads) {
        const { isVideo } = validation;
        if (isVideo) {
          const filename = safeFilename(upload.filename, upload.contentType, productMediaTypes);
          if (!filename) return res.status(400).json({ message: "Unsupported media file type." });
          if (useSupabaseStorage) {
            savedFiles.push(await uploadImageToSupabaseStorage({ companyId: req.companyId, filename, contentType: upload.contentType, data: upload.data, pathParts: ["products", req.params.productId] }));
          } else {
            const relativePath = `${relativeDirectory}/${filename}`;
            fs.writeFileSync(path.join(localDirectory, filename), upload.data);
            savedFiles.push({ path: `/uploads/${relativePath}`, url: buildPublicUrl(req, relativePath), mediaType: "video" });
          }
          continue;
        }

        let prepared;
        try {
          prepared = await prepareOptimizedImageUpload(upload);
        } catch (error) {
          return res.status(error.statusCode || 400).json({ message: error.message });
        }
        if (useSupabaseStorage) {
          const saved = await uploadImageToSupabaseStorage({
            companyId: req.companyId,
            filename: prepared.filename,
            contentType: prepared.contentType,
            data: prepared.data,
            pathParts: ["products", req.params.productId],
          });
          const preview = await writeAdminPreviewSibling({
            companyId: req.companyId,
            prepared,
            pathParts: ["products", req.params.productId],
            useSupabaseStorage,
          });
          savedFiles.push({
            ...saved,
            mediaType: "image",
            optimization: prepared.optimization,
            ...(preview ? { adminPreviewUrl: preview.url } : {}),
          });
        } else {
          const relativePath = `${relativeDirectory}/${prepared.filename}`;
          fs.writeFileSync(path.join(localDirectory, prepared.filename), prepared.data);
          const preview = await writeAdminPreviewSibling({
            companyId: req.companyId,
            prepared,
            localDirectory,
            relativePrefix: relativeDirectory,
            useSupabaseStorage,
          });
          savedFiles.push({
            path: `/uploads/${relativePath}`,
            url: buildPublicUrl(req, relativePath),
            mediaType: "image",
            optimization: prepared.optimization,
            ...(preview ? { adminPreviewUrl: buildPublicUrl(req, preview.relativePath) } : {}),
          });
        }
      }
      return res.status(201).json({ ...savedFiles[0], files: savedFiles });
    } catch (error) { return next(error); }
  },
);

router.delete("/products/:productId", requireAuth, requireProductMediaPermission, requireOwnedProduct, async (req, res, next) => {
  try {
    const raw = String(req.body?.path || req.body?.url || "");
    const pathname = raw.startsWith("http") ? new URL(raw).pathname : raw;
    const directory = companyStoragePath(req.companyId, "products", req.params.productId);
    const prefix = `/uploads/${directory}/`;
    const storageMarker = `/${directory}/`;
    if (!pathname.startsWith(prefix) && !raw.includes(storageMarker)) return res.status(403).json({ message: "Media does not belong to this tenant and product." });

    // Decision 21: if another in-tenant product still references this URL (e.g. after
    // duplicate), clear the caller's intent by returning success without deleting storage.
    const tenantProducts = productRepository.getByCompany(req.companyId);
    if (mediaUrlStillReferenced(tenantProducts, raw || pathname, { excludeProductId: req.params.productId })) {
      return res.status(204).end();
    }

    if (isSupabaseStorageConfigured()) {
      const markerIndex = raw.indexOf(storageMarker);
      const storagePath = markerIndex >= 0 ? decodeURIComponent(raw.slice(markerIndex + 1)) : pathname.slice("/uploads/".length);
      await deleteSupabaseStorageObject(storagePath);
    } else {
      const relative = pathname.slice("/uploads/".length);
      const target = path.resolve(uploadsDir, ...relative.split("/"));
      const expectedRoot = path.resolve(uploadsDir, ...directory.split("/"));
      if (!target.startsWith(`${expectedRoot}${path.sep}`)) return res.status(403).json({ message: "Invalid media path." });
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    return res.status(204).end();
  } catch (error) { return next(error); }
});

router.post(
  "/website-media",
  requireAuth,
  requireWebsiteMediaUploader,
  express.raw({
    limit: `${MAX_VIDEO_UPLOAD_MB}mb`,
    type: (req) => req.headers["content-type"]?.startsWith("multipart/form-data"),
  }),
  async (req, res, next) => {
    try {
      const boundary = getBoundary(req.headers["content-type"]);
      const uploads = boundary ? parseMultipartImages(req.body, boundary) : [];
      if (!uploads.length) return res.status(400).json({ message: "No video file was uploaded." });

      const validatedUploads = [];
      for (const upload of uploads) {
        try {
          const validation = validateVideoUpload({ contentType: upload.contentType, size: upload.data.length });
          const signature = assertVideoContainer(upload.data);
          if ((signature === "webm") !== (validation.mimeType === "video/webm")) {
            return res.status(400).json({ message: "The video container does not match the declared file type." });
          }
          validatedUploads.push({ upload, validation });
        } catch (error) {
          return res.status(error.statusCode || 400).json({ message: error.message });
        }
      }

      const useSupabaseStorage = isSupabaseStorageConfigured();
      if (!useSupabaseStorage && requiresPersistentStorage() && !hasLocalPersistentStorage()) {
        return storageUnavailableResponse(req, res, "video");
      }

      const savedFiles = [];
      for (const { upload, validation } of validatedUploads) {
        const filename = safeFilename(upload.filename, upload.contentType, videoTypes);
        if (!filename) return res.status(400).json({ message: "Unsupported video file type." });
        if (useSupabaseStorage) {
          savedFiles.push(await uploadImageToSupabaseStorage({
            companyId: req.companyId,
            filename,
            contentType: upload.contentType,
            data: upload.data,
            pathParts: ["website-media"],
          }));
        } else {
          const relativePath = companyStoragePath(req.companyId, "website-media", filename);
          const localDirectory = path.join(uploadsDir, ...relativePath.split("/").slice(0, -1));
          fs.mkdirSync(localDirectory, { recursive: true });
          fs.writeFileSync(path.join(localDirectory, filename), upload.data);
          savedFiles.push({
            path: `/uploads/${relativePath}`,
            url: buildPublicUrl(req, relativePath),
          });
        }
      }

      const first = savedFiles[0];
      return res.status(201).json({
        ...first,
        files: savedFiles,
        mediaType: "video",
        contentType: validatedUploads[0].validation.mimeType,
        size: validatedUploads[0].validation.size,
        maxBytes: validatedUploads[0].validation.maxBytes,
        ffmpegAvailable: ffmpegAvailable(),
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  "/avatar",
  requireAuth,
  express.raw({
    limit: "4mb",
    type: (req) => req.headers["content-type"]?.startsWith("multipart/form-data"),
  }),
  async (req, res) => {
    const boundary = getBoundary(req.headers["content-type"]);
    const uploads = boundary ? parseMultipartImages(req.body, boundary) : [];

    if (!uploads.length) {
      return res.status(400).json({ message: "No image file was uploaded." });
    }

    const useSupabaseStorage = isSupabaseStorageConfigured();

    if (!useSupabaseStorage && requiresPersistentStorage() && !hasLocalPersistentStorage()) {
      return storageUnavailableResponse(req, res, "image");
    }

    const companyUploadDir = path.join(uploadsDir, companyStorageSegment(req.companyId));
    if (!useSupabaseStorage) fs.mkdirSync(companyUploadDir, { recursive: true });

    const upload = uploads[0];
    if (!imageTypes.has(upload.contentType)) {
      return res.status(400).json({ message: "Only JPG, PNG, WEBP, and GIF images are allowed." });
    }

    let prepared;
    try {
      prepared = await prepareOptimizedImageUpload(upload);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ message: error.message });
    }
    const filename = `avatar-${req.user.id}-${Date.now()}${path.extname(prepared.filename) || ".webp"}`;

    let savedFile;
    if (useSupabaseStorage) {
      savedFile = await uploadImageToSupabaseStorage({
        companyId: req.companyId,
        filename,
        contentType: prepared.contentType,
        data: prepared.data,
      });
    } else {
      const relativePath = companyStoragePath(req.companyId, filename);
      fs.writeFileSync(path.join(companyUploadDir, filename), prepared.data);
      savedFile = {
        path: `/uploads/${relativePath}`,
        url: buildPublicUrl(req, relativePath),
      };
    }

    // Avatar is an image upload: also write the sibling admin preview.
    const preview = await writeAdminPreviewSibling({
      companyId: req.companyId,
      prepared: { ...prepared, filename },
      localDirectory: companyUploadDir,
      relativePrefix: companyStorageSegment(req.companyId),
      pathParts: ["uploads", new Date().toISOString().slice(0, 10)],
      useSupabaseStorage,
    });

    const avatarUrl = savedFile.url || savedFile.path || "";
    userRepository.updateForCompany(req.companyId, req.user.id, { avatarUrl }, { touchMembership: false });
    await persistCompanyStore(req.companyId);

    res.status(201).json({
      url: avatarUrl,
      optimization: prepared.optimization,
      ...(preview ? { adminPreviewUrl: preview.url || buildPublicUrl(req, preview.relativePath) } : {}),
    });
  },
);

export default router;


