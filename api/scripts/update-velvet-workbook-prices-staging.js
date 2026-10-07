/**
 * Staging-only Velvet workbook price correction (أقل سعر ONLY) + safe size
 * cleanup of invented automatic defaults (500ml / 1L / 1.5L and localized
 * equivalents). Kids-velvet company scope only. No other tenants. No production.
 *
 * Default: dry-run (no writes). The dry-run report is printed and also saved to
 * `api/tmp-velvet-price-dry-run.json`.
 *
 * Apply:
 *   node scripts/update-velvet-workbook-prices-staging.js --apply
 *
 * Requires:
 *   PLATFORM_API_URL=https://api-staging.igroup.website
 *   SCOPED_ADMIN_TOKEN (kids-velvet scoped), or IPLAY_MINT_SCOPED_TOKEN=true + DATABASE_URL=eb_catalog_test
 *   CONFIRM_VELVET_STAGING_PRICES=kids-velvet@eb_catalog_test   (for --apply)
 *
 * If credentials are unavailable the script still runs the dry-run and prints
 * DRY_RUN_ONLY with the missing env vars. It never invents tokens.
 */

import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VELVET_COMPANY_ID,
  VELVET_SITE_ID,
  enrichWorkbookRowsWithCommerceHints,
  parseWorkbookImportRows,
} from "../src/catalog/velvetWorkbookCatalog.js";
import {
  isCleanPriceCorrectionPlan,
  planVelvetSizeCleanup,
  planVelvetWorkbookPriceCorrection,
} from "../src/catalog/velvetWorkbookCommerce.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const apiDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(apiDir, ".env.staging.local") });
dotenv.config({ path: path.join(apiDir, ".env") });

const apply = process.argv.includes("--apply");
const companyId = VELVET_COMPANY_ID;
const siteId = VELVET_SITE_ID;
const apiUrl = String(process.env.PLATFORM_API_URL || "").replace(/\/$/, "");
let token = String(process.env.SCOPED_ADMIN_TOKEN || "");
const workbookPath = String(
  process.env.VELVET_WORKBOOK_PATH
  || path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "velvet_product_taxonomy.xlsx"),
);
const dryRunReportPath = path.join(apiDir, "tmp-velvet-price-dry-run.json");

function fail(message) {
  throw new Error(message);
}

function decodeJwt(value) {
  try {
    return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function loadWorkbookSheets(xlsxPath) {
  const py = `
import json, openpyxl, sys
path = sys.argv[1]
out_path = sys.argv[2]
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
out = {}
for key, index, header_row in (("import", 4, 3), ("classified", 1, 3)):
    ws = wb[wb.sheetnames[index]]
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(c).strip() if c is not None else "" for c in rows[header_row]]
    data = []
    for row in rows[header_row + 1:]:
        if all(c is None or str(c).strip() == "" for c in row):
            continue
        data.append(dict(zip(headers, row)))
    out[key] = data
wb.close()
with open(out_path, "w", encoding="utf-8") as handle:
    json.dump(out, handle, ensure_ascii=False, default=str)
`;
  const outPath = path.join(process.env.TEMP || "/tmp", `velvet-workbook-sheets-${Date.now()}.json`);
  const result = spawnSync("python", ["-c", py, xlsxPath, outPath], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (result.status !== 0) {
    fail(`Unable to read workbook: ${result.stderr || result.stdout || "python failed"}`);
  }
  return JSON.parse(readFileSync(outPath, "utf8"));
}

if (apiUrl !== "https://api-staging.igroup.website") {
  fail("PLATFORM_API_URL must be the exact staging API origin (https://api-staging.igroup.website).");
}

if (!token && process.env.IPLAY_MINT_SCOPED_TOKEN === "true") {
  const databaseUrl = String(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
  let databaseName = "";
  try {
    databaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\/+/, ""));
  } catch {
    databaseName = "";
  }
  if (databaseName !== "eb_catalog_test") {
    fail("Automatic token minting is restricted to the eb_catalog_test staging database.");
  }
  const [{ companyRepository, platformUserRepository }, { signCompanyScopeToken }] = await Promise.all([
    import("../src/data/store.js"),
    import("../src/middleware/auth.js"),
  ]);
  const users = await platformUserRepository.listUsers();
  const user = users.find((entry) => entry.role === "super_admin" && entry.isActive !== false);
  const company = companyRepository.getCompanyById(companyId);
  if (!user || !company) fail("A staging Super Admin and the kids-velvet company are required for token minting.");
  token = signCompanyScopeToken(user, company);
}

const authHeaders = token
  ? {
    Authorization: `Bearer ${token}`,
    "X-Company-Id": companyId,
    "Content-Type": "application/json",
    Accept: "application/json",
  }
  : {
    "X-Company-Id": companyId,
    Accept: "application/json",
  };

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...authHeaders, ...(options.headers || {}) },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    fail(`${options.method || "GET"} ${url} failed (${response.status}): ${body?.message || "Unknown error"}`);
  }
  return body;
}

if (apply) {
  if (!token) fail("SCOPED_ADMIN_TOKEN is required for --apply.");
  const claims = decodeJwt(token);
  const scopedCompany = claims.companyId || claims.company_id || claims.activeCompanyId || claims.active_company_id;
  if (scopedCompany !== companyId) fail("The supplied token is not scoped to kids-velvet.");
  if (process.env.CONFIRM_VELVET_STAGING_PRICES !== "kids-velvet@eb_catalog_test") {
    fail("CONFIRM_VELVET_STAGING_PRICES=kids-velvet@eb_catalog_test is required for --apply.");
  }
}

const sheets = loadWorkbookSheets(workbookPath);
const enriched = enrichWorkbookRowsWithCommerceHints(sheets.import, sheets.classified);
const parsed = parseWorkbookImportRows(enriched);
if (parsed.duplicates.length) {
  fail(`Duplicate product_id values in workbook: ${parsed.duplicates.join(", ")}`);
}
if (parsed.products.length !== 434) {
  fail(`Expected 434 unique workbook products, found ${parsed.products.length}.`);
}

const existingProducts = await request(`${apiUrl}/api/products`);
const products = Array.isArray(existingProducts) ? existingProducts : [];

const pricePlan = planVelvetWorkbookPriceCorrection({
  workbookProducts: parsed.products,
  existingProducts: products,
});
const sizePlan = planVelvetSizeCleanup({ existingProducts: products });

const dryRunReport = {
  mode: apply ? "apply" : "dry-run",
  companyId,
  siteId,
  workbookPath,
  TOTAL_WORKBOOK_PRODUCTS: pricePlan.TOTAL_WORKBOOK_PRODUCTS,
  EXACT_MATCHED: pricePlan.EXACT_MATCHED,
  UNMATCHED: pricePlan.UNMATCHED,
  PRICE_CHANGED: pricePlan.PRICE_CHANGED,
  ALREADY_CORRECT: pricePlan.ALREADY_CORRECT,
  MULTI_VARIANT_CASES: pricePlan.MULTI_VARIANT_CASES,
  ERRORS: pricePlan.ERRORS,
  CLEAN: pricePlan.CLEAN,
  SIZE_CLEAR_CANDIDATES: sizePlan.SIZE_CLEAR_CANDIDATES,
  SIZE_MANUAL_REVIEW: sizePlan.MANUAL_REVIEW,
  SIZE_UNTOUCHED: sizePlan.UNTOUCHED,
  PRICE_CHANGED_SAMPLES: pricePlan.priceChanged.slice(0, 10).map((item) => ({
    sourceProductId: item.sourceProductId,
    productId: item.productId,
    currentPrice: item.currentPrice,
    targetPrice: item.targetPrice,
    variantPatch: item.variantPatch,
  })),
  MULTI_VARIANT_SAMPLES: pricePlan.multiVariantCases.slice(0, 10),
  UNMATCHED_SAMPLES: pricePlan.unmatched.slice(0, 10),
  SIZE_CLEAR_SAMPLES: sizePlan.wouldClear.slice(0, 10).map((item) => ({
    sourceProductId: item.sourceProductId,
    productId: item.productId,
    clearable: item.clearable,
  })),
  SIZE_MANUAL_REVIEW_SAMPLES: sizePlan.manualReview.slice(0, 10),
};

console.log(JSON.stringify(dryRunReport, null, 2));

await writeFile(dryRunReportPath, `${JSON.stringify(dryRunReport, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify({ dryRunReportSaved: dryRunReportPath }, null, 2));

if (!apply) {
  const missing = [];
  if (!token) missing.push("SCOPED_ADMIN_TOKEN (or IPLAY_MINT_SCOPED_TOKEN=true + DATABASE_URL=eb_catalog_test)");
  if (!process.env.CONFIRM_VELVET_STAGING_PRICES) missing.push("CONFIRM_VELVET_STAGING_PRICES=kids-velvet@eb_catalog_test");
  console.log(JSON.stringify({
    DRY_RUN_ONLY: true,
    missingForApply: missing,
    safeToReview: pricePlan.CLEAN && pricePlan.UNMATCHED === 381 && pricePlan.MULTI_VARIANT_CASES === 0,
  }, null, 2));
  process.exit(isCleanPriceCorrectionPlan(pricePlan) ? 0 : 2);
}

if (!isCleanPriceCorrectionPlan(pricePlan)) {
  fail("Dry-run price plan is not clean; refusing to apply.");
}

const backupDir = path.resolve(repoRoot, "api", "backups");
await mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupDir, `velvet-kids-velvet-prices-sizes-${stamp}.json`);

await writeFile(
  backupFile,
  `${JSON.stringify({
    exportedAt: new Date().toISOString(),
    companyId,
    siteId,
    productCount: products.length,
    products: products.map((product) => ({
      id: product.id,
      sourceProductId: product.sourceProductId || product.data?.sourceProductId || null,
      price: product.price ?? null,
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
          id: variant.id,
          price: variant.price ?? null,
          size: variant.size ?? null,
        }))
        : [],
    })),
  }, null, 2)}\n`,
  { flag: "wx" },
);

console.log(JSON.stringify({ backupCreated: true, backupFile, productBackupCount: products.length }, null, 2));

// Price apply: PUT /api/products/:id with price (+ single stale variant) only.
let updatedPrices = 0;
for (const item of pricePlan.priceChanged) {
  const patch = { price: item.targetPrice };
  if (item.variantPatch) {
    patch.variants = [{ id: item.variantPatch.variantId, price: item.variantPatch.price }];
  }
  await request(`${apiUrl}/api/products/${encodeURIComponent(item.productId)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  updatedPrices += 1;
}

// Size cleanup apply: clear automatic default sizes only (all variants sent so
// no variant is dropped by the merge; stock/cost/images are preserved server-side).
let clearedSizes = 0;
for (const item of sizePlan.wouldClear) {
  const clearableIds = new Set(item.clearable.map((entry) => entry.variantId));
  const product = products.find((entry) => entry.id === item.productId);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const patch = {
    variants: variants.map((variant) => ({
      id: variant.id,
      ...(clearableIds.has(String(variant.id || "")) ? { size: "" } : {}),
    })),
  };
  await request(`${apiUrl}/api/products/${encodeURIComponent(item.productId)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  clearedSizes += item.clearable.length;
}

// Verify storefront content prices after apply.
const storefrontResponse = await fetch(`${apiUrl}/api/storefront/content?locale=en`, {
  headers: {
    Accept: "application/json",
    "X-Company-Id": companyId,
    "X-Site-Id": siteId,
  },
});
const storefront = storefrontResponse.ok
  ? await storefrontResponse.json().catch(() => ({}))
  : fail(`GET ${apiUrl}/api/storefront/content failed (${storefrontResponse.status})`);

const workbookBySourceId = new Map(parsed.products.map((row) => [row.sourceProductId, row.minPrice]));
let storefrontPriceMatch = 0;
let storefrontSizeDefaults = 0;
for (const product of storefront.products || []) {
  const sourceId = product.sourceProductId || product.data?.sourceProductId || "";
  const target = workbookBySourceId.get(String(sourceId));
  if (target != null && Number(product.price) === target) storefrontPriceMatch += 1;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  for (const variant of variants) {
    const size = variant.size;
    if (typeof size === "string" && ["500ml", "1L", "1.5L"].includes(size.trim())) storefrontSizeDefaults += 1;
  }
}

console.log(JSON.stringify({
  mode: "apply-complete",
  updatedPrices,
  clearedSizes,
  verification: {
    STOREFRONT_CONTENT_TOTAL: (storefront.products || []).length,
    STOREFRONT_PRICE_MATCH: storefrontPriceMatch,
    STOREFRONT_SIZE_DEFAULTS_REMAINING: storefrontSizeDefaults,
  },
}, null, 2));