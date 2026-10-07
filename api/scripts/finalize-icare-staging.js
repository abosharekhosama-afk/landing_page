import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { Pool } from "pg";

const EXTERNAL_TARGET_URL = "https://cg8hv00dppir2hu99ds4p75h.187.55.225.56.sslip.io";
const EXTERNAL_TARGET_HOST = "cg8hv00dppir2hu99ds4p75h.187.55.225.56.sslip.io";
const CONTAINER_TARGET_URL = "http://127.0.0.1:5000";
const CONTAINER_TARGET_HOST = "127.0.0.1";
const CONTAINER_DATABASE = "eb_catalog_test";
const CONTAINER_DATABASE_USER = "eb_catalog_test_user";
const args = new Set(process.argv.slice(2));
const containerLocal = args.has("--container-local");
const verifyBoundaryOnly = args.has("--verify-boundary");
const statusOnly = args.has("--status");
const statusDetails = args.has("--details");
const clearLegacyImagesOnly = args.has("--clear-legacy-images");
const supportedArgs = new Set([
  "--container-local",
  "--verify-boundary",
  "--status",
  "--details",
  "--clear-legacy-images",
]);
const unsupportedArgs = [...args].filter((argument) => !supportedArgs.has(argument));
if (unsupportedArgs.length) {
  throw new Error(`Unsupported argument: ${unsupportedArgs[0]}`);
}
if (verifyBoundaryOnly && !containerLocal) {
  throw new Error("--verify-boundary requires --container-local.");
}
if (statusOnly && !containerLocal) {
  throw new Error("--status requires --container-local.");
}
if (statusOnly && verifyBoundaryOnly) {
  throw new Error("--status and --verify-boundary cannot be combined.");
}
if (statusDetails && !statusOnly) {
  throw new Error("--details requires --status.");
}
if (clearLegacyImagesOnly && !containerLocal) {
  throw new Error("--clear-legacy-images requires --container-local.");
}
if (clearLegacyImagesOnly && (statusOnly || verifyBoundaryOnly)) {
  throw new Error("--clear-legacy-images cannot be combined with --status or --verify-boundary.");
}
const TARGET_URL = containerLocal ? CONTAINER_TARGET_URL : EXTERNAL_TARGET_URL;
const TARGET_HOST = containerLocal ? CONTAINER_TARGET_HOST : EXTERNAL_TARGET_HOST;
const COMPANY_ID = "icare";
const ADMIN_EMAIL = "icare-admin@igroup.website";
let password = String(process.env.ICARE_STAGING_PASSWORD || "");

delete process.env.ICARE_STAGING_PASSWORD;

const TEST_RECORDS = Object.freeze({
  product: {
    id: "product-1783965814870",
    slug: "icare-integration-product-1783965814764",
    name: "Updated iCare Integration Product",
  },
  category: {
    id: "fe2a6b82-9a30-4a90-8d81-af806f273405",
    slug: "product-test-category-1783965814764",
    name: "Product Test Category",
  },
  brand: {
    id: "02c7e456-3c3e-46d1-895a-7053b4e2140c",
    slug: "product-test-brand-1783965814764",
    name: "iCare Product Test Brand",
  },
});

const EXPECTED_COUNTS = Object.freeze({
  categories: 43,
  brands: 18,
  products: 20,
  websiteTexts: 173,
  websiteMedia: 18,
});

const LEGACY_HOST = "backend.igroup.website";
const PLACEHOLDER_HOST = "via.placeholder.com";
const LEGACY_PREFIXES = ["/public/uploads/", "/uploads/", "/storage/icare/uploads/"];
const CLEARED_PRODUCT_IMAGE = "/images/products/product-placeholder.svg";
const CLEARED_PRODUCT_PRIMARY_IMAGE = `${CLEARED_PRODUCT_IMAGE}?legacy-cleared=1`;
const IMAGE_CONCURRENCY = 4;
const runState = {
  interrupted: false,
  completed: 0,
  failed: 0,
  total: 0,
  activeToken: "",
  abortController: new AbortController(),
  interruptReported: false,
};
const report = {
  cleanup: [],
  images: {
    discovered: 0,
    uploaded: 0,
    reused: 0,
    cleared: 0,
    failed: [],
  },
  updates: {
    products: 0,
    categories: 0,
    brands: 0,
    websiteMedia: 0,
  },
  smoke: {},
  counts: {},
  clearLegacyImages: null,
  remainingLegacyImages: [],
};

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function localizedEnglish(value) {
  if (typeof value === "string") return value;
  return isRecord(value) && typeof value.en === "string" ? value.en : "";
}

export function requireLoginPassword(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("ICARE_STAGING_PASSWORD is required.");
  }
  return value;
}

export async function authenticateBeforeMutation({
  passwordValue,
  authenticate,
  mutate,
}) {
  let loginPassword = requireLoginPassword(passwordValue);
  let token = "";
  try {
    token = await authenticate(loginPassword);
    runState.activeToken = token;
    loginPassword = "";
    return await mutate(token);
  } finally {
    loginPassword = "";
    token = "";
    runState.activeToken = "";
  }
}

export function interruptRun(state = runState) {
  state.interrupted = true;
  state.activeToken = "";
  password = "";
  state.abortController.abort();
  return {
    completed: state.completed,
    failed: state.failed,
    remaining: Math.max(0, state.total - state.completed - state.failed),
  };
}

async function readJson(response, label) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`${label} failed (HTTP ${response.status}): ${body?.message || response.statusText}`);
  }
  return body;
}

function assertApprovedTarget(url) {
  if (containerLocal) {
    if (
      url.protocol !== "http:"
      || url.hostname !== CONTAINER_TARGET_HOST
      || url.port !== "5000"
      || url.origin !== CONTAINER_TARGET_URL
    ) {
      throw new Error("Container-local mode permits only http://127.0.0.1:5000.");
    }
    return;
  }
  if (
    url.protocol !== "https:"
    || url.hostname !== EXTERNAL_TARGET_HOST
    || url.port
    || url.origin !== EXTERNAL_TARGET_URL
  ) {
    throw new Error("External staging execution requires the fixed trusted HTTPS endpoint.");
  }
}

async function stagingFetch(input, init = {}) {
  const url = input instanceof URL ? input : new URL(input);
  assertApprovedTarget(url);
  const response = await fetch(url, { ...init, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`Staging API redirect rejected for ${url.pathname}.`);
  }
  return response;
}

async function verifyContainerBoundary() {
  if (!containerLocal) return;
  if (process.env.NODE_ENV !== "production") {
    throw new Error("Container-local mode requires NODE_ENV=production.");
  }
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!connectionString) {
    throw new Error("Container-local mode requires the staging PostgreSQL connection.");
  }
  const pool = new Pool({
    connectionString,
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 1,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
    query_timeout: 10000,
  });
  try {
    const result = await pool.query(
      "select current_database() as database_name, current_user as database_user",
    );
    const boundary = result.rows[0];
    if (
      boundary?.database_name !== CONTAINER_DATABASE
      || boundary?.database_user !== CONTAINER_DATABASE_USER
    ) {
      throw new Error("Container database boundary verification failed.");
    }
  } finally {
    await pool.end();
  }

  const healthUrl = new URL("/api/health", TARGET_URL);
  const healthResponse = await stagingFetch(healthUrl, { cache: "no-store" });
  if (healthResponse.status !== 200) {
    throw new Error(`Container-local API health check failed (HTTP ${healthResponse.status}).`);
  }
}

async function resolveStagingCompany() {
  const target = new URL("/api/company/resolve-storefront", TARGET_URL);
  assertApprovedTarget(target);
  target.searchParams.set("host", "igroup.website");
  target.searchParams.set("path", "/icare");
  const company = await readJson(
    await stagingFetch(target, { cache: "no-store" }),
    "Storefront resolver",
  );
  if (
    company?.id !== COMPANY_ID
    || company?.slug !== COMPANY_ID
    || company?.status !== "active"
    || company?.storefrontPath !== "/icare"
  ) {
    throw new Error("The approved staging URL does not resolve to the active iCare storefront.");
  }
  return company;
}

async function login(loginPassword) {
  const response = await stagingFetch(`${TARGET_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": COMPANY_ID,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: loginPassword }),
  });
  const session = await readJson(response, "Staging iCare login");
  if (
    typeof session?.token !== "string"
    || session?.activeCompany?.id !== COMPANY_ID
    || session?.activeMembership?.role !== "company_admin"
  ) {
    throw new Error("Login did not return an iCare company_admin session.");
  }
  return session.token;
}

async function api(token, pathname, init = {}) {
  const url = new URL(pathname, TARGET_URL);
  assertApprovedTarget(url);
  if (url.hostname !== TARGET_HOST) throw new Error("Refusing a non-staging API target.");
  const headers = new Headers(init.headers);
  headers.set("X-Company-Id", COMPANY_ID);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await stagingFetch(url, { ...init, headers, cache: "no-store" });
  if (response.status === 204) return null;
  return readJson(response, pathname);
}

function assertExactRecord(actual, expected, type) {
  if (!actual) throw new Error(`Expected staging test ${type} ${expected.id} was not found.`);
  if (actual.id !== expected.id || actual.slug !== expected.slug || localizedEnglish(actual.name) !== expected.name) {
    throw new Error(`The staging test ${type} identity did not match exactly; cleanup aborted.`);
  }
}

export async function cleanupTestRecords(token, apiCall = api) {
  const [products, categories, brands] = await Promise.all([
    apiCall(token, "/api/products"),
    apiCall(token, "/api/categories"),
    apiCall(token, "/api/brands"),
  ]);
  const product = products.find((entry) => entry.id === TEST_RECORDS.product.id);
  const category = categories.find((entry) => entry.id === TEST_RECORDS.category.id);
  const brand = brands.find((entry) => entry.id === TEST_RECORDS.brand.id);
  if (!product && !category && !brand) {
    report.cleanup.push({ type: "all", status: "already-removed" });
    return;
  }
  if (product) assertExactRecord(product, TEST_RECORDS.product, "product");
  if (category) assertExactRecord(category, TEST_RECORDS.category, "category");
  if (brand) assertExactRecord(brand, TEST_RECORDS.brand, "brand");
  if (product && (!category || !brand || product.categoryId !== category.id || product.brandId !== brand.id)) {
    throw new Error("The staging test product no longer references the expected test category and brand.");
  }
  const otherCategoryReferences = products.filter(
    (entry) => entry.id !== product?.id && entry.categoryId === TEST_RECORDS.category.id,
  );
  const otherBrandReferences = products.filter(
    (entry) => entry.id !== product?.id && entry.brandId === TEST_RECORDS.brand.id,
  );
  if (otherCategoryReferences.length || otherBrandReferences.length) {
    throw new Error("A migrated product references an original test category or brand; cleanup aborted.");
  }

  if (product) {
    await apiCall(token, `/api/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
    report.cleanup.push({ type: "product", id: product.id });
  }
  if (category) {
    await apiCall(token, `/api/categories/${encodeURIComponent(category.id)}`, { method: "DELETE" });
    report.cleanup.push({ type: "category", id: category.id });
  }
  if (brand) {
    await apiCall(token, `/api/brands/${encodeURIComponent(brand.id)}`, { method: "DELETE" });
    report.cleanup.push({ type: "brand", id: brand.id });
  }
}

function legacyUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const rawValue = value.trim();
    const absoluteUrl = /^https?:\/\//i.test(rawValue);
    const url = new URL(rawValue, `https://${LEGACY_HOST}`);
    if (url.pathname.includes("/uploads/icare/")) return "";
    const hostname = url.hostname.toLowerCase();
    const legacyHost = absoluteUrl && (hostname === LEGACY_HOST || hostname === PLACEHOLDER_HOST);
    const legacyPath = LEGACY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    if (!legacyHost && !legacyPath) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function isMigratedIcareUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value, CONTAINER_TARGET_URL);
    return url.hostname.toLowerCase() !== LEGACY_HOST
      && (
        url.pathname.includes("/uploads/icare/")
        || url.pathname.includes("/storage/icare/uploads/")
      );
  } catch {
    return false;
  }
}

function isClearedImage(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  try {
    return new URL(normalized, "https://local.invalid").pathname === CLEARED_PRODUCT_IMAGE;
  } catch {
    return normalized === CLEARED_PRODUCT_IMAGE;
  }
}

function imageReferences({ products = [], categories = [], brands = [], media = [] }) {
  const references = [];
  const add = (value, entity) => references.push({ value: String(value || ""), entity });

  for (const category of categories) add(category.imageUrl, `category:${category.id}`);
  for (const brand of brands) add(brand.logoUrl, `brand:${brand.id}`);
  for (const item of media) {
    add(item.imageUrl, `website-media:${item.id}:image`);
    add(item.fallbackImageUrl, `website-media:${item.id}:fallback`);
  }
  for (const product of products) {
    add(product.image || product.primaryImage, `product:${product.id}:primary`);
    for (const [index, entry] of (Array.isArray(product.gallery_images) ? product.gallery_images : []).entries()) {
      add(
        entry?.image_url || entry?.image || entry?.url,
        `product:${product.id}:gallery:${entry?.id || index}`,
      );
    }
  }
  return references;
}

export function summarizeStatus({
  products = [],
  categories = [],
  brands = [],
  texts = [],
  media = [],
}) {
  const references = imageReferences({ products, categories, brands, media });
  const details = references
    .map(({ value, entity }) => {
      const url = legacyUrl(value);
      if (!url) return null;
      const parts = entity.split(":");
      let [entityType, entityId] = parts;
      let field = "image";
      if (entityType === "category") field = "imageUrl";
      if (entityType === "brand") field = "logoUrl";
      if (entityType === "website-media") {
        field = parts[2] === "fallback" ? "fallbackImageUrl" : "imageUrl";
      }
      if (entityType === "product" && parts[2] === "gallery") {
        entityType = "product-gallery";
        entityId = parts.slice(3).join(":");
        field = "image_url";
      }
      return { entityType, entityId, field, url: String(value) };
    })
    .filter(Boolean);
  return {
    counts: {
      categories: categories.length,
      brands: brands.length,
      products: products.length,
      websiteTexts: texts.length,
      websiteMedia: media.length,
    },
    testRecords: {
      product: products.some((entry) => entry.id === TEST_RECORDS.product.id),
      category: categories.some((entry) => entry.id === TEST_RECORDS.category.id),
      brand: brands.some((entry) => entry.id === TEST_RECORDS.brand.id),
    },
    images: {
      legacy: references.filter(({ value }) => Boolean(legacyUrl(value))).length,
      migrated: references.filter(({ value }) => isMigratedIcareUrl(value)).length,
      emptyOrCleared: references.filter(({ value }) => isClearedImage(value)).length,
    },
    details,
  };
}

async function loadPublicStatusSnapshot(apiCall = api) {
  const [products, categories, brands, texts, mediaResponse] = await Promise.all([
    apiCall(null, "/api/products"),
    apiCall(null, "/api/categories"),
    apiCall(null, "/api/brands"),
    apiCall(null, "/api/website-texts"),
    apiCall(null, "/api/website-media"),
  ]);
  const media = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse?.items || [];
  return { products, categories, brands, texts, media };
}

export async function runStatusMode({ apiCall = api, details = statusDetails } = {}) {
  const snapshot = await loadPublicStatusSnapshot(apiCall);
  const status = summarizeStatus(snapshot);
  if (!details) delete status.details;
  return status;
}

function candidateUrls(source) {
  const url = new URL(source);
  const filename = path.posix.basename(url.pathname);
  const candidates = [
    source,
    `https://${LEGACY_HOST}/uploads/${filename}`,
    `https://${LEGACY_HOST}/public/uploads/${filename}`,
    `https://${LEGACY_HOST}/storage/icare/uploads/${filename}`,
  ];
  return [...new Set(candidates)];
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function downloadCandidate(url) {
  if (runState.interrupted) throw new Error("Finalization interrupted.");
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.any([
      AbortSignal.timeout(15000),
      runState.abortController.signal,
    ]),
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5",
      "User-Agent": "iCare-Staging-Migration/1.0",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType)) {
    throw new Error(`unsupported content type ${contentType || "unknown"}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > 8 * 1024 * 1024) {
    throw new Error(`invalid image size ${data.length}`);
  }
  return { data, contentType, sourceUrl: url };
}

async function recoverImage(source) {
  let lastError = null;
  for (const [index, candidate] of candidateUrls(source).slice(0, 2).entries()) {
    try {
      return await downloadCandidate(candidate);
    } catch (error) {
      lastError = error;
      if (runState.interrupted) throw new Error("Finalization interrupted.");
      if (index === 0) await delay(1000);
    }
  }
  throw lastError || new Error("No recoverable legacy image candidate.");
}

function extensionFor(contentType) {
  return ({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  })[contentType] || ".jpg";
}

async function uploadImage(token, source, recovered) {
  const originalName = path.posix.basename(new URL(source).pathname).replace(/[^a-zA-Z0-9._-]/g, "-");
  const filename = originalName && path.extname(originalName)
    ? originalName
    : `icare-migrated${extensionFor(recovered.contentType)}`;
  const form = new FormData();
  form.append("file", new Blob([recovered.data], { type: recovered.contentType }), filename);
  const uploaded = await api(token, "/api/uploads", { method: "POST", body: form });
  const url = uploaded?.url || uploaded?.path;
  if (typeof url !== "string" || !url) throw new Error("Staging upload returned no URL.");
  if (!url.includes("/icare/")) {
    throw new Error("Staging upload did not return an iCare-specific storage path.");
  }
  return url;
}

function contentHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function publicUploadUrl(filename) {
  const relativePath = `/uploads/icare/${encodeURIComponent(filename)}`;
  const publicApiUrl = String(process.env.PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  return publicApiUrl ? `${publicApiUrl}${relativePath}` : relativePath;
}

async function existingUploadHashes() {
  const uploadsRoot = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads");
  const companyDirectory = path.join(uploadsRoot, "icare");
  const hashes = new Map();
  let entries = [];
  try {
    entries = await fs.readdir(companyDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return hashes;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) continue;
    const filename = path.join(companyDirectory, entry.name);
    const stat = await fs.stat(filename);
    if (!stat.size || stat.size > 8 * 1024 * 1024) continue;
    const data = await fs.readFile(filename);
    hashes.set(contentHash(data), publicUploadUrl(entry.name));
  }
  return hashes;
}

export async function processUniqueImageJobs({
  jobs,
  recover,
  upload,
  findExisting = async () => "",
  concurrency = IMAGE_CONCURRENCY,
  state = runState,
  onProgress = () => {},
  dedupeKey = (recovered) => recovered?.data ? contentHash(recovered.data) : "",
}) {
  const uniqueJobs = [...new Map(jobs.map((job) => [job.source, job])).values()];
  const results = new Map();
  const resolvedByKey = new Map();
  let cursor = 0;
  state.total = uniqueJobs.length;

  async function worker() {
    while (!state.interrupted) {
      const index = cursor;
      cursor += 1;
      if (index >= uniqueJobs.length) return;
      const job = uniqueJobs[index];
      onProgress(index + 1, uniqueJobs.length, job);
      try {
        const recovered = await recover(job.source);
        if (state.interrupted) return;
        const key = dedupeKey(recovered, job);
        let resolution = key ? resolvedByKey.get(key) : null;
        if (!resolution) {
          resolution = (async () => {
            const existing = await findExisting(recovered, job);
            return existing || upload(job.source, recovered, job);
          })();
          if (key) resolvedByKey.set(key, resolution);
        }
        const migratedUrl = await resolution;
        results.set(job.source, migratedUrl);
        state.completed += 1;
      } catch (error) {
        if (state.interrupted) return;
        results.set(job.source, "");
        state.failed += 1;
        job.error = error.message;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), uniqueJobs.length || 1) },
      () => worker(),
    ),
  );
  return { results, jobs: uniqueJobs };
}

async function migrateImages(token) {
  const [products, categories, brands, mediaResponse] = await Promise.all([
    api(token, "/api/products"),
    api(token, "/api/categories"),
    api(token, "/api/brands"),
    api(token, "/api/website-media/all"),
  ]);
  const media = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse?.items || [];
  const references = imageReferences({ products, categories, brands, media });
  const legacyReferences = references
    .map(({ value, entity }) => ({ source: legacyUrl(value), entity }))
    .filter(({ source }) => Boolean(source));
  report.images.discovered = legacyReferences.length;
  const uploadHashes = await existingUploadHashes();
  const processed = await processUniqueImageJobs({
    jobs: legacyReferences,
    recover: recoverImage,
    findExisting: async (recovered) => uploadHashes.get(contentHash(recovered.data)) || "",
    upload: async (source, recovered) => {
      const hash = contentHash(recovered.data);
      const url = await uploadImage(token, source, recovered);
      uploadHashes.set(hash, url);
      report.images.uploaded += 1;
      return url;
    },
    onProgress: (current, total, job) => {
      console.log(`[${current}/${total}] ${job.entity} image`);
    },
  });
  if (runState.interrupted) {
    throw new Error("Finalization interrupted.");
  }
  const migrated = processed.results;
  report.images.reused += processed.jobs.length - report.images.uploaded - runState.failed;
  for (const job of processed.jobs) {
    if (job.error) {
      report.images.failed.push({
        entity: job.entity,
        sourceUrl: job.source,
        error: job.error,
      });
    }
  }

  async function migratedUrl(source, entity) {
    const normalized = legacyUrl(source);
    if (!normalized) return source;
    return migrated.get(normalized) || "";
  }

  for (const category of categories) {
    if (runState.interrupted) throw new Error("Finalization interrupted.");
    const current = legacyUrl(category.imageUrl);
    if (!current) continue;
    const imageUrl = await migratedUrl(current, `category:${category.id}`);
    await api(token, `/api/categories/${encodeURIComponent(category.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ imageUrl: imageUrl || null }),
    });
    report.updates.categories += 1;
    if (!imageUrl) report.images.cleared += 1;
  }

  for (const brand of brands) {
    if (runState.interrupted) throw new Error("Finalization interrupted.");
    const current = legacyUrl(brand.logoUrl);
    if (!current) continue;
    const logoUrl = await migratedUrl(current, `brand:${brand.id}`);
    await api(token, `/api/brands/${encodeURIComponent(brand.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ logoUrl: logoUrl || null }),
    });
    report.updates.brands += 1;
    if (!logoUrl) report.images.cleared += 1;
  }

  for (const item of media) {
    if (runState.interrupted) throw new Error("Finalization interrupted.");
    const current = legacyUrl(item.imageUrl) || legacyUrl(item.fallbackImageUrl);
    if (!current && !/placeholder\.com/i.test(String(item.imageUrl || item.fallbackImageUrl || ""))) continue;
    const imageUrl = current ? await migratedUrl(current, `website-media:${item.id}`) : "";
    await api(token, `/api/website-media/${encodeURIComponent(item.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        ...item,
        imageUrl,
        fallbackImageUrl: "",
      }),
    });
    report.updates.websiteMedia += 1;
    if (!imageUrl) report.images.cleared += 1;
  }

  for (const product of products) {
    if (runState.interrupted) throw new Error("Finalization interrupted.");
    let changed = false;
    const gallerySource = Array.isArray(product.gallery_images) ? product.gallery_images : [];
    const nextGallery = [];
    for (const [index, entry] of gallerySource.entries()) {
      const source = legacyUrl(entry?.image_url || entry?.image || entry?.url);
      if (!source) {
        nextGallery.push(entry);
        continue;
      }
      const imageUrl = await migratedUrl(source, `product:${product.id}:gallery:${entry.id || index}`);
      changed = true;
      if (imageUrl) nextGallery.push({ ...entry, image_url: imageUrl });
      else report.images.cleared += 1;
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const nextVariants = [];
    for (const [index, variant] of variants.entries()) {
      const source = legacyUrl(variant?.image_url || variant?.imageUrl || variant?.image);
      if (!source) {
        nextVariants.push(variant);
        continue;
      }
      const imageUrl = await migratedUrl(source, `product:${product.id}:variant:${variant.id || index}`);
      changed = true;
      nextVariants.push({
        ...variant,
        image_url: imageUrl,
        imageUrl,
        image: imageUrl,
      });
      if (!imageUrl) report.images.cleared += 1;
    }

    const primarySource = legacyUrl(product.image || product.primaryImage);
    const hoverSource = legacyUrl(product.hoverImage || product.secondaryImage);
    let primary = primarySource
      ? await migratedUrl(primarySource, `product:${product.id}:primary`)
      : product.image || product.primaryImage || "";
    const hover = hoverSource
      ? await migratedUrl(hoverSource, `product:${product.id}:hover`)
      : product.hoverImage || product.secondaryImage || "";
    changed ||= Boolean(primarySource || hoverSource);
    if (!primary && primarySource) {
      primary = nextGallery[0]?.image_url
        || nextVariants.find((variant) => variant.image_url)?.image_url
        || "";
      if (!primary) {
        report.images.failed.push({
          entity: `product:${product.id}:primary`,
          sourceUrl: primarySource,
          error: "No recovered gallery or variant image was available; product update skipped to avoid retaining or replacing with a placeholder.",
        });
        continue;
      }
      report.images.cleared += 1;
    }
    if (!changed) continue;

    if (runState.interrupted) throw new Error("Finalization interrupted.");
    await api(token, `/api/products/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        ...product,
        id: product.id,
        image: primary,
        primaryImage: primary,
        hoverImage: hover,
        secondaryImage: hover,
        variants: nextVariants,
        gallery_images: nextGallery,
        galleryImages: nextGallery.map((entry) => entry.image_url),
        clearGalleryImages: gallerySource.length > 0 && nextGallery.length === 0,
      }),
    });
    report.updates.products += 1;
  }
}

export async function clearLegacyImages(token, apiCall = api) {
  const [products, categories, brands, mediaResponse] = await Promise.all([
    apiCall(token, "/api/products"),
    apiCall(token, "/api/categories"),
    apiCall(token, "/api/brands"),
    apiCall(token, "/api/website-media/all"),
  ]);
  const media = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse?.items || [];
  const cleared = {
    categories: 0,
    brands: 0,
    products: 0,
    productPrimaryImages: 0,
    galleryImages: 0,
    websiteMedia: 0,
    websiteMediaUrls: 0,
    urlsCleared: 0,
  };

  for (const category of categories) {
    if (!legacyUrl(category.imageUrl)) continue;
    await apiCall(token, `/api/categories/${encodeURIComponent(category.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ imageUrl: null }),
    });
    cleared.categories += 1;
    cleared.urlsCleared += 1;
  }

  for (const brand of brands) {
    if (!legacyUrl(brand.logoUrl)) continue;
    await apiCall(token, `/api/brands/${encodeURIComponent(brand.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ logoUrl: null }),
    });
    cleared.brands += 1;
    cleared.urlsCleared += 1;
  }

  for (const item of media) {
    const clearImage = Boolean(legacyUrl(item.imageUrl));
    const clearFallback = Boolean(legacyUrl(item.fallbackImageUrl));
    if (!clearImage && !clearFallback) continue;
    await apiCall(token, `/api/website-media/${encodeURIComponent(item.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        ...item,
        imageUrl: clearImage ? "" : item.imageUrl || "",
        fallbackImageUrl: clearFallback ? "" : item.fallbackImageUrl || "",
      }),
    });
    cleared.websiteMedia += 1;
    cleared.websiteMediaUrls += Number(clearImage) + Number(clearFallback);
    cleared.urlsCleared += Number(clearImage) + Number(clearFallback);
  }

  for (const product of products) {
    const gallery = Array.isArray(product.gallery_images) ? product.gallery_images : [];
    const primaryIsLegacy = Boolean(legacyUrl(product.image || product.primaryImage));
    let galleryChanged = false;
    const nextGallery = gallery.map((entry) => {
      const current = entry?.image_url || entry?.image || entry?.url;
      if (!legacyUrl(current)) return entry;
      galleryChanged = true;
      cleared.galleryImages += 1;
      cleared.urlsCleared += 1;
      return {
        ...entry,
        image_url: CLEARED_PRODUCT_IMAGE,
        image: CLEARED_PRODUCT_IMAGE,
        url: CLEARED_PRODUCT_IMAGE,
      };
    });
    if (!primaryIsLegacy && !galleryChanged) continue;
    const primary = primaryIsLegacy
      ? CLEARED_PRODUCT_PRIMARY_IMAGE
      : product.image || product.primaryImage || CLEARED_PRODUCT_IMAGE;
    if (primaryIsLegacy) {
      cleared.productPrimaryImages += 1;
      cleared.urlsCleared += 1;
    }
    await apiCall(token, `/api/products/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        ...product,
        id: product.id,
        image: primary,
        primaryImage: primary,
        gallery_images: nextGallery,
        galleryImages: nextGallery.map((entry) => entry.image_url),
      }),
    });
    cleared.products += 1;
  }

  return cleared;
}

async function verifyClearedLegacyImages(token, apiCall = api) {
  const [products, categories, brands, texts, mediaResponse] = await Promise.all([
    apiCall(token, "/api/products"),
    apiCall(token, "/api/categories"),
    apiCall(token, "/api/brands"),
    apiCall(token, "/api/admin/website-texts"),
    apiCall(token, "/api/website-media/all"),
  ]);
  const media = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse?.items || [];
  const status = summarizeStatus({ products, categories, brands, texts, media });
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (status.counts[key] !== expected) {
      throw new Error(`Final ${key} count is ${status.counts[key]}, expected ${expected}.`);
    }
  }
  if (status.images.legacy !== 0) {
    report.remainingLegacyImages = status.details;
    throw new Error(`Final legacy image URL count is ${status.images.legacy}, expected 0.`);
  }
  report.remainingLegacyImages = [];
  await Promise.all([
    apiCall(null, "/api/products"),
    apiCall(null, "/api/categories"),
    apiCall(null, "/api/brands"),
    apiCall(null, "/api/website-texts"),
    apiCall(null, "/api/website-media"),
  ]);
  return status;
}

async function verify(token) {
  const [products, categories, brands, texts, mediaResponse, orders, employees, workSessions] = await Promise.all([
    api(token, "/api/products"),
    api(token, "/api/categories"),
    api(token, "/api/brands"),
    api(token, "/api/admin/website-texts"),
    api(token, "/api/website-media/all"),
    api(token, "/api/orders"),
    api(token, "/api/employees"),
    api(token, "/api/work-sessions/employees"),
  ]);
  const media = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse?.items || [];
  const counts = {
    categories: categories.length,
    brands: brands.length,
    products: products.length,
    websiteTexts: texts.length,
    websiteMedia: media.length,
  };
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[key] !== expected) throw new Error(`Final ${key} count is ${counts[key]}, expected ${expected}.`);
  }
  if (
    products.some((entry) => entry.id === TEST_RECORDS.product.id)
    || categories.some((entry) => entry.id === TEST_RECORDS.category.id)
    || brands.some((entry) => entry.id === TEST_RECORDS.brand.id)
  ) {
    throw new Error("One or more original staging test records remain.");
  }
  const categoryIds = new Set(categories.map((entry) => entry.id));
  const brandIds = new Set(brands.map((entry) => entry.id));
  for (const product of products) {
    if (product.categoryId && !categoryIds.has(product.categoryId)) {
      throw new Error(`Product ${product.id} has an invalid category link.`);
    }
    if (product.brandId && !brandIds.has(product.brandId)) {
      throw new Error(`Product ${product.id} has an invalid brand link.`);
    }
    if (!Array.isArray(product.variants) || !Array.isArray(product.gallery_images)) {
      throw new Error(`Product ${product.id} lost variant or gallery collections.`);
    }
  }
  const serialized = JSON.stringify({ products, categories, brands, media });
  if (/backend\.igroup\.website|placeholder\.com/i.test(serialized)) {
    throw new Error("Legacy or placeholder image URLs remain after finalization.");
  }
  report.counts = counts;
  report.smoke = {
    cpanelCatalog: true,
    orders: Array.isArray(orders),
    employees: Array.isArray(employees),
    workSessions: Array.isArray(workSessions),
    variantsAndGalleriesLinked: true,
  };

  const forged = await stagingFetch(`${TARGET_URL}/api/products`, {
    headers: {
      "X-Company-Id": "eb-chemical",
      Authorization: `Bearer ${token}`,
    },
  });
  if (forged.status !== 401 && forged.status !== 403) {
    throw new Error(`Cross-tenant JWT/header attempt returned HTTP ${forged.status}.`);
  }
  report.smoke.forgedCompanyHeaderRejected = true;
}

async function main() {
  await verifyContainerBoundary();
  await resolveStagingCompany();
  if (verifyBoundaryOnly) {
    console.log("Container-local staging boundary verified.");
    return;
  }
  if (statusOnly) {
    console.log(JSON.stringify(await runStatusMode(), null, 2));
    return;
  }
  await authenticateBeforeMutation({
    passwordValue: password,
    authenticate: async (loginPassword) => {
      const token = await login(loginPassword);
      password = "";
      return token;
    },
    mutate: async (token) => {
      if (clearLegacyImagesOnly) {
        const cleared = await clearLegacyImages(token);
        report.clearLegacyImages = cleared;
        const status = await verifyClearedLegacyImages(token);
        console.log(JSON.stringify({ ok: true, mode: "clear-legacy-images", cleared, status }, null, 2));
        return;
      }
      await cleanupTestRecords(token);
      await migrateImages(token);
      await verify(token);
      console.log(JSON.stringify({ ok: true, ...report }, null, 2));
    },
  });
  password = "";
}

const isMain = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.once("SIGINT", () => {
    const partial = interruptRun();
    runState.interruptReported = true;
    console.error(JSON.stringify({ interrupted: true, ...partial }, null, 2));
    process.exitCode = 130;
  });
  main().catch((error) => {
    password = "";
    runState.activeToken = "";
    if (runState.interrupted) {
      if (!runState.interruptReported) {
        console.error(JSON.stringify({ interrupted: true, ...interruptRun() }, null, 2));
      }
      process.exitCode = 130;
      return;
    }
    console.error(JSON.stringify({ ok: false, error: error.message, report }, null, 2));
    process.exitCode = 1;
  });
}
