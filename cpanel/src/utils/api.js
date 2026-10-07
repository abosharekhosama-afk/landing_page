const configuredApiUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
const normalizedApiUrl = configuredApiUrl.replace(/\/$/, "");

export const apiBaseUrl = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;
export const tokenStorageKey = "epChemicalJwt";
export const userStorageKey = "epChemicalUser";
export const protectedApiErrorEvent = "epChemical:protected-api-error";

export function resolveApiAssetUrl(value) {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("/")) {
    return new URL(value, `${new URL(apiBaseUrl).origin}/`).toString();
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith("/uploads/")) {
        return new URL(parsed.pathname + parsed.search + parsed.hash, `${new URL(apiBaseUrl).origin}/`).toString();
      }
    } catch {
      // Malformed URL: fall through and return the original value.
    }
  }
  return value;
}

function uploadMessage(code, fallback) {
  if (code !== "MEDIA_STORAGE_UNAVAILABLE") return fallback;
  return document.documentElement.lang === "ar"
    ? "تخزين الوسائط الدائم غير مهيأ على خادم الاختبار. حاول مجددًا بعد تهيئة التخزين."
    : "Persistent media storage is unavailable on staging. Retry after storage is configured.";
}

function createUploadError(message, status, code = "") {
  const error = new Error(uploadMessage(code, message));
  error.status = status;
  error.code = code;

  if ((status === 401 || status === 403) && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(protectedApiErrorEvent, {
        detail: { status },
      }),
    );
  }

  return error;
}

export function getToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function setAuthSession({ token, user }) {
  const previousToken = localStorage.getItem(tokenStorageKey);
  if (previousToken && previousToken !== token) {
    localStorage.removeItem("cpanelActiveCompany");
  }
  localStorage.setItem(tokenStorageKey, token);
  localStorage.setItem(userStorageKey, JSON.stringify(user));
}

const productImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const productVideoTypes = new Set(["video/mp4", "video/webm"]);

export function validateProductMediaFile(file, { allowVideo = true } = {}) {
  const isVideo = productVideoTypes.has(file?.type);
  const isImage = productImageTypes.has(file?.type);
  if (!isImage && !(allowVideo && isVideo)) {
    throw createUploadError(
      allowVideo ? "Use JPG, PNG, WEBP, GIF, MP4, or WEBM media." : "Use a JPG, PNG, WEBP, or GIF image.",
      400,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }
  const maximum = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (Number(file.size || 0) > maximum) {
    throw createUploadError(isVideo ? "Video exceeds the 50 MB limit." : "Image exceeds the 8 MB limit.", 413, "MEDIA_TOO_LARGE");
  }
  return { isVideo, maximum };
}

export function clearAuthSession() {
  localStorage.removeItem(tokenStorageKey);
  localStorage.removeItem(userStorageKey);
  localStorage.removeItem("cpanelActiveCompany");
}

export function getStoredUser() {
  try {
    const user = localStorage.getItem(userStorageKey);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    return null;
  }
}

export function createApiHeaders(token, headers = {}) {
  const safeHeaders = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.toLowerCase() !== "x-company-id"),
  );

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...safeHeaders,
  };
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const url = `${apiBaseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: createApiHeaders(token, options.headers),
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || "API request failed.";
    console.error("API request failed", {
      endpoint: path,
      status: response.status,
      message,
    });
    const error = new Error(message);
    error.status = response.status;
    error.code = data.code || "";
    error.errors = data.errors && typeof data.errors === "object" ? data.errors : {};
    error.response = data;
    throw error;
  }

  return data;
}

export async function uploadImage(file) {
  validateProductMediaFile(file, { allowVideo: false });
  const token = getToken();

  if (!token) {
    throw createUploadError("Authentication required.", 401);
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${apiBaseUrl}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createUploadError(data.message || "Image upload failed.", response.status, data.code);
  }

  const url = data.url || data.path || "";
  return {
    ...data,
    url,
    path: data.path || url,
  };
}

export async function uploadImages(files = []) {
  const fileList = Array.from(files).filter(Boolean);
  if (!fileList.length) {
    return [];
  }
  fileList.forEach((file) => validateProductMediaFile(file, { allowVideo: false }));

  const token = getToken();

  if (!token) {
    throw createUploadError("Authentication required.", 401);
  }

  const formData = new FormData();
  fileList.forEach((file) => formData.append("image", file));

  const response = await fetch(`${apiBaseUrl}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createUploadError(data.message || "Images upload failed.", response.status, data.code);
  }

  const uploaded = data.files || (data.path || data.url ? [data] : []);
  return uploaded.map((file) => {
    const url = file.url || file.path || "";
    return {
      ...file,
      url,
      path: file.path || url,
    };
  });
}

export function uploadProductMedia(file, productId, onProgress = () => {}) {
  try { validateProductMediaFile(file); }
  catch (error) { return Promise.reject(error); }
  const token = getToken();
  if (!token) return Promise.reject(createUploadError("Authentication required.", 401));
  if (!productId) return Promise.reject(createUploadError("Save the product before uploading media.", 400));
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBaseUrl}/uploads/products/${encodeURIComponent(productId)}`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const data = (() => { try { return JSON.parse(request.responseText || "{}"); } catch { return {}; } })();
      if (request.status < 200 || request.status >= 300) return reject(createUploadError(data.message || "Media upload failed.", request.status, data.code));
      const url = data.url || data.path || "";
      return resolve({ ...data, url, path: data.path || url });
    });
    request.addEventListener("error", () => reject(createUploadError("Media upload failed.", 0)));
    const formData = new FormData();
    formData.append("media", file);
    request.send(formData);
  });
}

export async function deleteProductMedia(productId, value) {
  return apiRequest(`/uploads/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    body: JSON.stringify({ url: value }),
  });
}

const websiteVideoTypes = new Set(["video/mp4", "video/webm"]);
const MAX_WEBSITE_VIDEO_MB = Number(import.meta.env?.VITE_MAX_WEBSITE_VIDEO_MB || 150);
const MAX_WEBSITE_VIDEO_BYTES = MAX_WEBSITE_VIDEO_MB * 1024 * 1024;

export function validateWebsiteVideoFile(file) {
  if (!file) throw createUploadError("No video file selected.", 400);
  if (!websiteVideoTypes.has(String(file.type || "").toLowerCase())) {
    throw createUploadError("Use MP4 or WEBM video files.", 400, "UNSUPPORTED_VIDEO_TYPE");
  }
  if (Number(file.size || 0) > MAX_WEBSITE_VIDEO_BYTES) {
    throw createUploadError(`Video exceeds the ${MAX_WEBSITE_VIDEO_MB} MB limit.`, 413, "VIDEO_TOO_LARGE");
  }
  return { maxBytes: MAX_WEBSITE_VIDEO_BYTES, maxMb: MAX_WEBSITE_VIDEO_MB };
}

export function websiteVideoUploadLimitMb() {
  return MAX_WEBSITE_VIDEO_MB;
}

export function uploadWebsiteVideo(file, onProgress = () => {}) {
  try { validateWebsiteVideoFile(file); }
  catch (error) { return Promise.reject(error); }
  const token = getToken();
  if (!token) return Promise.reject(createUploadError("Authentication required.", 401));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBaseUrl}/uploads/website-media`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    });
    request.addEventListener("load", () => {
      const data = (() => { try { return JSON.parse(request.responseText || "{}"); } catch { return {}; } })();
      if (request.status < 200 || request.status >= 300) {
        return reject(createUploadError(data.message || "Video upload failed.", request.status, data.code));
      }
      onProgress(100);
      return resolve({ ...data, url: data.url || data.path || "", path: data.path || data.url || "" });
    });
    request.addEventListener("error", () => reject(createUploadError("Video upload failed.", 0)));
    request.addEventListener("abort", () => reject(createUploadError("Video upload aborted.", 0)));
    const formData = new FormData();
    formData.append("file", file);
    request.send(formData);
  });
}
