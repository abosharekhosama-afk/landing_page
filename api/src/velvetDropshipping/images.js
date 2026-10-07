import sharp from "sharp";
import { httpError, resolveMerchantImage } from "./domain.js";

export function assertCleanSource({ cleanImageUrl, catalogImageUrl }) {
  if (cleanImageUrl && catalogImageUrl && cleanImageUrl === catalogImageUrl) {
    throw httpError(400, "A catalog image cannot be used as the clean source.");
  }
}

function label(storeName) {
  const safe = String(storeName || "").replace(/[<>&"]/g, "");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="96"><rect width="640" height="96" fill="#111827" fill-opacity="0.72"/><text x="24" y="60" fill="#ffffff" font-size="32" font-family="Arial">${safe}</text></svg>`,
  );
}

export async function generateMerchantImage({ cleanImage, storeName }) {
  if (!cleanImage) return { buffer: null, ...resolveMerchantImage({ cleanImageUrl: null }) };
  try {
    const buffer = await sharp(cleanImage)
      .resize(640, 640, { fit: "cover" })
      .composite([{ input: label(storeName), gravity: "south" }])
      .webp()
      .toBuffer();
    return {
      buffer,
      ...resolveMerchantImage({
        cleanImageUrl: "clean",
        generationSucceeded: true,
        generatedImageUrl: "pending-save",
      }),
    };
  } catch {
    return { buffer: null, ...resolveMerchantImage({ cleanImageUrl: "clean", generationSucceeded: false }) };
  }
}
