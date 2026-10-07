import { companyStoragePath } from "../tenancy/company.js";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const videoTypes = new Set(["video/mp4", "video/webm"]);

export function productMediaRelativeDirectory(companyId, productId) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(productId || "")) throw Object.assign(new Error("Invalid product ID."), { statusCode: 400 });
  return companyStoragePath(companyId, "products", productId);
}

export function validateProductMediaUpload({ contentType, size }) {
  const isVideo = videoTypes.has(contentType);
  if (!imageTypes.has(contentType) && !isVideo) throw Object.assign(new Error("Unsupported media file type."), { statusCode: 400 });
  const maximum = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (size > maximum) throw Object.assign(new Error(isVideo ? "Video exceeds the 50 MB limit." : "Image exceeds the 8 MB limit."), { statusCode: 413 });
  return { isVideo, maximum };
}
