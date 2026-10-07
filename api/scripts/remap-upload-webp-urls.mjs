#!/usr/bin/env node
/**
 * Staging WebP URL remap: after the media backfill wrote `.webp` companions,
 * the DB/API still store `.png`/`.jpg` paths. This script remaps references to
 * the `.webp` sibling when that sibling exists.
 *
 * Filesystem + in-memory repos only. Never touches Production, Coolify, or any
 * database directly — apply persists through the existing store layer.
 *
 * Flags:
 *   --dry-run            (default) report only, write nothing
 *   --apply              only honored when CONFIRM=STAGING env is set
 *   --company=<id>       only remap references for this company (e.g. kids-velvet)
 *
 * Behavior:
 *   1. Discover media URL string fields in the tenant catalog: brands
 *      (logoUrl, heroPoster, headerImage, menuImage), categories (imageUrl),
 *      products (image, hoverImage, usageVideoPoster, fallbackImage,
 *      productsPageImage, productsPageHoverImage, detailSectionImages),
 *      product galleries, product variants, website media (imageUrl,
 *      fallbackImageUrl), company settings (logoUrl, faviconUrl), and vlogs /
 *      vlog hero (posterUrl, imageUrl, thumbnail) from
 *      company.settings.websiteContent.
 *   2. For each `/uploads/….(png|jpg|jpeg)` reference, candidate = same path
 *      with `.webp`.
 *   3. Only include a remap when the WebP sibling exists:
 *        - UPLOADS_DIR filesystem check when set and the directory exists
 *        - otherwise HEAD request against PUBLIC_API_URL (staging)
 *   4. Dry-run prints a JSON summary: mode, company filter, counts by entity
 *      type (brand, category, product, gallery, variant, banner, other), each
 *      remap { companyId, entityType, entityId, field, from, to }, and totals.
 *   5. Apply (NOT run by this task): update in-memory repos +
 *      persistCompanyStore for the staging company only, and write a rollback
 *      JSON backup under api/scripts/.remap-backup/<runId>.json with every
 *      before value. Refuses Production markers.
 *
 * Restore procedure (manual):
 *   The backup file at api/scripts/.remap-backup/<runId>.json contains every
 *   remap with its `path` and `from` (before) value. To restore, re-apply the
 *   backup mapping: for each entry, set the record identified by
 *   (companyId, entityType, entityId) at `path` back to `from`, then persist
 *   the company store again. Only do this on Staging, and only for a run whose
 *   backup file still exists.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const BACKUP_ROOT = path.join(__dirname, ".remap-backup");

const UPLOADS_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const ENTITY_TYPE_KEYS = ["brand", "category", "product", "gallery", "variant", "banner", "vlog", "vlogHero", "other"];

export function parseArgs(argv) {
  const flags = {
    dryRun: true,
    apply: false,
    company: null,
  };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--company=")) {
      flags.company = arg.slice("--company=".length).trim() || null;
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
 * True when the value is a platform `/uploads/` image reference with a
 * png/jpg/jpeg extension (the only references that can be remapped to .webp).
 */
export function isUploadsImageUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return false;
    }
  }
  if (!pathname.startsWith("/uploads/")) return false;
  const queryIndex = pathname.indexOf("?");
  if (queryIndex >= 0) pathname = pathname.slice(0, queryIndex);
  const ext = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
  return UPLOADS_IMAGE_EXTENSIONS.has(ext);
}

/**
 * Same URL with the extension replaced by `.webp`, preserving any query string:
 * `/uploads/co/foo.jpg` → `/uploads/co/foo.webp`
 * `https://api.example.com/uploads/co/foo.png?v=1` → `.../foo.webp?v=1`
 */
export function webpCandidateFor(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  const queryIndex = trimmed.indexOf("?");
  const query = queryIndex >= 0 ? trimmed.slice(queryIndex) : "";
  const base = queryIndex >= 0 ? trimmed.slice(0, queryIndex) : trimmed;
  const extIndex = base.lastIndexOf(".");
  const stem = extIndex > 0 ? base.slice(0, extIndex) : base;
  return `${stem}.webp${query}`;
}

function uploadsRelativePath(value) {
  let pathname = typeof value === "string" ? value.trim() : "";
  if (!pathname) return null;
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }
  const queryIndex = pathname.indexOf("?");
  if (queryIndex >= 0) pathname = pathname.slice(0, queryIndex);
  if (!pathname.startsWith("/uploads/")) return null;
  return pathname.slice("/uploads/".length);
}

/**
 * Existence check for a WebP candidate. Prefers the UPLOADS_DIR filesystem
 * when provided; otherwise issues a HEAD request against PUBLIC_API_URL.
 * Tests inject a mocked `exists` into buildRemapPlan instead of calling this.
 */
export async function webpExists(candidate, { uploadsDir = null, publicApiUrl = null } = {}) {
  if (uploadsDir) {
    const relative = uploadsRelativePath(candidate);
    if (!relative) return false;
    return fs.existsSync(path.join(uploadsDir, relative));
  }
  if (publicApiUrl) {
    const url = /^https?:\/\//i.test(candidate) ? candidate : `${publicApiUrl}${candidate}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
  return false;
}

function addRef(refs, companyId, entityType, entityId, field, pathSegments, value) {
  if (!isUploadsImageUrl(value)) return;
  refs.push({
    companyId,
    entityType,
    entityId,
    field,
    path: pathSegments,
    from: value.trim(),
  });
}

/**
 * Discover every remappable upload image reference in one company's catalog.
 * `catalog` shape: { companyId, brands, categories, products, websiteMedia,
 * companies }. `companies` is used for company settings logoUrl/faviconUrl.
 */
export function discoverMediaReferences(catalog = {}) {
  const refs = [];
  const companyId = catalog.companyId;

  for (const brand of catalog.brands || []) {
    for (const field of ["logoUrl", "heroPoster", "headerImage", "menuImage"]) {
      addRef(refs, companyId, "brand", brand.id, field, [field], brand[field]);
    }
  }

  for (const category of catalog.categories || []) {
    addRef(refs, companyId, "category", category.id, "imageUrl", ["imageUrl"], category.imageUrl);
  }

  for (const product of catalog.products || []) {
    for (const field of [
      "image",
      "hoverImage",
      "usageVideoPoster",
      "fallbackImage",
      "productsPageImage",
      "productsPageHoverImage",
    ]) {
      addRef(refs, companyId, "product", product.id, field, [field], product[field]);
    }

    const detailImages = product.detailSectionImages || product.detail_section_images || {};
    if (detailImages && typeof detailImages === "object") {
      for (const [key, value] of Object.entries(detailImages)) {
        addRef(refs, companyId, "product", product.id, `detailSectionImages.${key}`, ["detailSectionImages", key], value);
      }
    }

    const galleryKey = Array.isArray(product.gallery_images)
      ? "gallery_images"
      : Array.isArray(product.galleryImages)
        ? "galleryImages"
        : null;
    const gallery = galleryKey ? product[galleryKey] : [];
    gallery.forEach((entry, index) => {
      if (typeof entry === "string") {
        addRef(refs, companyId, "gallery", product.id, `gallery[${index}]`, [galleryKey, index], entry);
      } else {
        const key = entry?.image_url != null
          ? "image_url"
          : entry?.image != null
            ? "image"
            : entry?.url != null
              ? "url"
              : null;
        if (key) {
          addRef(refs, companyId, "gallery", product.id, `gallery[${index}].${key}`, [galleryKey, index, key], entry[key]);
        }
      }
    });

    const variants = Array.isArray(product.variants) ? product.variants : [];
    variants.forEach((variant, index) => {
      const key = variant?.image_url != null
        ? "image_url"
        : variant?.imageUrl != null
          ? "imageUrl"
          : variant?.image != null
            ? "image"
            : null;
      if (key) {
        addRef(refs, companyId, "variant", product.id, `variants[${index}].${key}`, ["variants", index, key], variant[key]);
      }
    });
  }

  for (const item of catalog.websiteMedia || []) {
    for (const field of ["imageUrl", "fallbackImageUrl"]) {
      addRef(refs, companyId, "banner", item.id, field, [field], item[field]);
    }
  }

  // Vlogs + vlog hero live in company.settings.websiteContent (see
  // storefront/vlogsContent.js). Paths are settings-relative so apply can
  // persist them through the company repository.
  const vlogs = Array.isArray(catalog.vlogs) ? catalog.vlogs : [];
  vlogs.forEach((entry, index) => {
    const entityId = String(entry?.id || `vlog[${index}]`);
    for (const field of ["posterUrl", "imageUrl", "thumbnail"]) {
      addRef(
        refs,
        companyId,
        "vlog",
        entityId,
        `vlogs[${index}].${field}`,
        ["settings", "websiteContent", "vlogs", index, field],
        entry?.[field],
      );
    }
  });

  const vlogHero = catalog.vlogHero && typeof catalog.vlogHero === "object" ? catalog.vlogHero : {};
  for (const field of ["imageUrl", "posterUrl"]) {
    addRef(
      refs,
      companyId,
      "vlogHero",
      companyId,
      `vlogHero.${field}`,
      ["settings", "websiteContent", "vlogHero", field],
      vlogHero[field],
    );
  }

  for (const company of catalog.companies || []) {
    const settings = company.settings && typeof company.settings === "object" ? company.settings : {};
    for (const field of ["logoUrl", "faviconUrl"]) {
      addRef(refs, companyId, "other", company.id, `settings.${field}`, ["settings", field], settings[field]);
    }
  }

  return refs;
}

export function readPath(record, pathSegments) {
  let current = record;
  for (const segment of pathSegments) {
    if (current == null) return undefined;
    current = current[segment];
  }
  return current;
}

export function writePath(record, pathSegments, value) {
  let current = record;
  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    if (current == null) return false;
    current = current[pathSegments[index]];
  }
  if (current == null) return false;
  current[pathSegments[pathSegments.length - 1]] = value;
  return true;
}

/**
 * Apply one remap to a record in place. Only writes when the current value
 * still matches `from` (guards against clobbering a newer value).
 */
export function applyRemapToRecord(record, remap) {
  if (!record || !remap?.path || !Array.isArray(remap.path)) return false;
  if (readPath(record, remap.path) !== remap.from) return false;
  return writePath(record, remap.path, remap.to);
}

/**
 * Build the remap plan for one company catalog. `exists(candidate)` decides
 * whether the WebP sibling is present (fs or HEAD in the CLI; mocked in tests).
 */
export async function buildRemapPlan(catalog, { exists }) {
  const refs = discoverMediaReferences(catalog);
  const remaps = [];
  for (const ref of refs) {
    const to = webpCandidateFor(ref.from);
    if (await exists(to)) {
      remaps.push({ ...ref, to });
    }
  }
  return remaps;
}

export function summarize(remaps, flags, runId, { companiesScanned = 0, references = 0 } = {}) {
  const countsByEntityType = Object.fromEntries(ENTITY_TYPE_KEYS.map((key) => [key, 0]));
  for (const remap of remaps) {
    countsByEntityType[remap.entityType] = (countsByEntityType[remap.entityType] || 0) + 1;
  }
  const publicRemaps = remaps.map(({ path: _path, ...rest }) => rest);
  return {
    mode: flags.apply ? "apply" : "dry-run",
    runId,
    companyFilter: flags.company || null,
    companiesScanned,
    countsByEntityType,
    remaps: publicRemaps,
    totals: {
      references,
      remaps: remaps.length,
      missingWebp: references - remaps.length,
    },
    restoreNote: flags.apply
      ? `Restore: re-apply api/scripts/.remap-backup/${runId}.json — for each entry set the record (companyId/entityType/entityId) at \`path\` back to \`from\`, then persist the company store. Staging only.`
      : "Dry-run only: nothing was written. Re-run with --apply and CONFIRM=STAGING to remap.",
  };
}

function entityRepositoryFor(store, entityType) {
  switch (entityType) {
    case "brand":
      return store.brandRepository;
    case "category":
      return store.categoryRepository;
    case "product":
    case "gallery":
    case "variant":
      return store.productRepository;
    case "banner":
      return store.websiteMediaRepository;
    default:
      return null;
  }
}

async function applyRemapsForCompany(store, companyId, remaps) {
  let applied = 0;
  const otherRemaps = [];
  const websiteContentRemaps = [];
  for (const remap of remaps) {
    if (remap.companyId !== companyId) continue;
    if (remap.entityType === "other") {
      otherRemaps.push(remap);
      continue;
    }
    if (remap.entityType === "vlog" || remap.entityType === "vlogHero") {
      websiteContentRemaps.push(remap);
      continue;
    }
    const repository = entityRepositoryFor(store, remap.entityType);
    if (!repository) continue;
    const record = repository.findByCompany(companyId, remap.entityId);
    if (!record) continue;
    if (applyRemapToRecord(record, remap)) applied += 1;
  }

  // Vlogs + vlog hero live in company.settings.websiteContent and persist
  // through the company repository (not persistCompanyStore).
  if (websiteContentRemaps.length) {
    const company = store.companies.find((entry) => entry.id === companyId);
    if (company) {
      const settings = company.settings && typeof company.settings === "object" ? company.settings : {};
      const websiteContent = settings.websiteContent
        && typeof settings.websiteContent === "object"
        && !Array.isArray(settings.websiteContent)
        ? settings.websiteContent
        : {};
      let changed = false;
      for (const remap of websiteContentRemaps) {
        // path is ["settings", "websiteContent", ...] — apply relative to settings.
        if (applyRemapToRecord(settings, remap.path.slice(1))) {
          applied += 1;
          changed = true;
        }
      }
      if (changed) {
        await store.companyRepository.updateCompanyBrandingAndSettings(company.id, {
          settingsPatch: { websiteContent },
        });
      }
    }
  }

  // Company settings (logoUrl/faviconUrl) persist through the company
  // repository, not persistCompanyStore.
  for (const remap of otherRemaps) {
    const company = store.companies.find((entry) => entry.id === remap.entityId);
    if (!company) continue;
    const field = remap.path[remap.path.length - 1];
    await store.companyRepository.updateCompanyBrandingAndSettings(company.id, {
      settingsPatch: { [field]: remap.to },
    });
    applied += 1;
  }

  if (applied > 0) {
    await store.persistCompanyStore(companyId);
  }
  return applied;
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

  const uploadsDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : null;
  const publicApiUrl = process.env.PUBLIC_API_URL
    ? String(process.env.PUBLIC_API_URL).replace(/\/+$/, "")
    : null;
  const useFilesystem = Boolean(uploadsDir && fs.existsSync(uploadsDir));
  if (!useFilesystem && !publicApiUrl) {
    console.error(
      "Refusing to run: set UPLOADS_DIR (existing directory) or PUBLIC_API_URL (staging HEAD checks) to verify WebP siblings.",
    );
    process.exit(2);
  }

  const store = await import("../src/data/store.js");
  const companies = store.companies.filter(
    (company) => !flags.company || company.id === flags.company,
  );
  if (!companies.length) {
    console.error(`No companies matched filter: ${flags.company || "(all)"}`);
    process.exit(2);
  }

  const exists = (candidate) =>
    webpExists(candidate, {
      uploadsDir: useFilesystem ? uploadsDir : null,
      publicApiUrl: useFilesystem ? null : publicApiUrl,
    });

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const allRemaps = [];
  let references = 0;

  for (const company of companies) {
    const websiteContent = company.settings?.websiteContent;
    const catalog = {
      companyId: company.id,
      brands: store.brandRepository.getByCompany(company.id),
      categories: store.categoryRepository.getByCompany(company.id),
      products: store.productRepository.getByCompany(company.id),
      websiteMedia: store.websiteMediaRepository.getByCompany(company.id),
      companies: [company],
      vlogs: Array.isArray(websiteContent?.vlogs) ? websiteContent.vlogs : [],
      vlogHero: websiteContent?.vlogHero && typeof websiteContent.vlogHero === "object"
        ? websiteContent.vlogHero
        : {},
    };
    const companyRefs = discoverMediaReferences(catalog);
    references += companyRefs.length;
    const remaps = await buildRemapPlan(catalog, { exists });
    allRemaps.push(...remaps);
  }

  if (flags.apply) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const backupFile = path.join(BACKUP_ROOT, `${runId}.json`);
    fs.writeFileSync(
      backupFile,
      `${JSON.stringify({
        runId,
        createdAt: new Date().toISOString(),
        mode: "apply",
        companyFilter: flags.company || null,
        remaps: allRemaps,
        restoreNote:
          "Restore: for each entry, set the record (companyId/entityType/entityId) at `path` back to `from`, then persist the company store. Staging only.",
      }, null, 2)}\n`,
      "utf8",
    );

    let applied = 0;
    for (const company of companies) {
      applied += await applyRemapsForCompany(store, company.id, allRemaps);
    }
    console.error(`Applied ${applied} remaps; rollback backup written to ${backupFile}`);
  }

  const summary = summarize(allRemaps, flags, runId, {
    companiesScanned: companies.length,
    references,
  });
  console.log(JSON.stringify(summary, null, 2));
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((error) => {
    console.error(`Remap aborted: ${error.message}`);
    process.exit(1);
  });
}