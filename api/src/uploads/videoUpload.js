import { spawnSync } from "node:child_process";

export const VIDEO_MIME_TYPES = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
]);

export const MAX_VIDEO_UPLOAD_MB = Number(process.env.MAX_VIDEO_UPLOAD_MB || 150);
export const MAX_VIDEO_UPLOAD_BYTES = MAX_VIDEO_UPLOAD_MB * 1024 * 1024;

let ffmpegAvailability = null;

export function ffmpegAvailable() {
  if (ffmpegAvailability !== null) return ffmpegAvailability;
  try {
    const probe = spawnSync("ffmpeg", ["-version"], { timeout: 5000, stdio: "ignore" });
    ffmpegAvailability = probe.status === 0;
  } catch {
    ffmpegAvailability = false;
  }
  return ffmpegAvailability;
}

function containerSignature(data) {
  if (!data || data.length < 12) return null;
  const ftyp = data.slice(4, 8).toString("latin1");
  if (ftyp === "ftyp") return "mp4";
  if (
    data[0] === 0x1a
    && data[1] === 0x45
    && data[2] === 0xdf
    && data[3] === 0xa3
  ) {
    return "webm";
  }
  return null;
}

export function validateVideoUpload({ contentType, size }) {
  const mimeType = String(contentType || "").trim().toLowerCase();
  if (!VIDEO_MIME_TYPES.has(mimeType)) {
    const error = new Error("Only MP4 and WebM video files are allowed.");
    error.statusCode = 400;
    throw error;
  }

  if (size > MAX_VIDEO_UPLOAD_BYTES) {
    const error = new Error(`Video files must be ${MAX_VIDEO_UPLOAD_MB} MB or smaller.`);
    error.statusCode = 413;
    throw error;
  }

  return {
    mimeType,
    extension: VIDEO_MIME_TYPES.get(mimeType),
    size,
    maxBytes: MAX_VIDEO_UPLOAD_BYTES,
  };
}

export function assertVideoContainer(data) {
  const signature = containerSignature(data);
  if (!signature) {
    const error = new Error("The uploaded file is not a valid MP4 or WebM video.");
    error.statusCode = 400;
    throw error;
  }
  return signature;
}
