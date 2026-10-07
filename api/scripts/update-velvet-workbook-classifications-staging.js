/**
 * Staging-only Velvet workbook full classification population.
 *
 * Default: dry-run (no writes).
 * Apply:
 *   node scripts/update-velvet-workbook-classifications-staging.js --apply
 *
 * Requires:
 *   PLATFORM_API_URL=https://api-staging.igroup.website
 *   SCOPED_ADMIN_TOKEN (kids-velvet scoped), STAGING_LOGIN_EMAIL/PASSWORD, or
 *   IPLAY_MINT_SCOPED_TOKEN=true + DATABASE_URL=eb_catalog_test
 *   CONFIRM_VELVET_STAGING_CLASSIFICATIONS=kids-velvet@eb_catalog_test   (for --apply)
 */

import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_FILTER_ATTRIBUTE_GROUPS } from "../src/catalog/productFilterAttributes.js";
import {
  VELVET_COMPANY_ID,
  VELVET_SITE_ID,
  getSourceProductId,
  isCleanVelvetWorkbookClassificationPlan,
  parseVelvetWorkbookClassificationRows,
  planVelvetWorkbookClassificationUpdate,
  summarizeVelvetWorkbookClassificationVerification,
} from "../src/catalog/velvetWorkbookClassifications.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const apiDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(apiDir, ".env.staging.local") });
dotenv.config({ path: path.join(apiDir, ".env") });
dotenv.config({ path: path.join(repoRoot, "cpanel", ".env.staging") });

const apply = process.argv.includes("--apply");
const companyId = VELVET_COMPANY_ID;
const siteId = VELVET_SITE_ID;
const apiUrl = String(process.env.PLATFORM_API_URL || "https://api-staging.igroup.website").replace(/\/$/, "");
let token = String(process.env.SCOPED_ADMIN_TOKEN || "");
const workbookPath = String(
  process.env.VELVET_WORKBOOK_PATH
  || path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads", "velvet_product_taxonomy.xlsx"),
);

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

function loadWorkbookClassifiedRows(xlsxPath) {
  const py = `
import json, openpyxl, sys
path = sys.argv[1]
out_path = sys.argv[2]
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb[wb.sheetnames[1]]
rows = list(ws.iter_rows(values_only=True))
headers = [str(c).strip() if c is not None else "" for c in rows[3]]
data = []
for row in rows[4:]:
    if all(c is None or str(c).strip() == "" for c in row):
        continue
    data.append(dict(zip(headers, row)))
wb.close()
with open(out_path, "w", encoding="utf-8") as handle:
    json.dump(data, handle, ensure_ascii=False, default=str)
`;
  const outPath = path.join(process.env.TEMP || "/tmp", `velvet-workbook-classifications-${Date.now()}.json`);
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

async function resolveTokenViaLogin() {
  const email = String(process.env.STAGING_LOGIN_EMAIL || "").trim();
  const password = String(process.env.STAGING_LOGIN_PASSWORD || "");
  if (!email || !password) return "";
  const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Company-Id": companyId,
    },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginResponse.json().catch(() => ({}));
  if (!loginResponse.ok) {
    fail(`Staging login failed (${loginResponse.status}): ${loginBody?.message || "Unknown error"}`);
  }
  let sessionToken = String(loginBody.token || "");
  const role = loginBody.user?.role || loginBody.user?.globalRole || "";
  const activeCompanyId = loginBody.activeCompany?.id || "";
  if (role === "super_admin" && activeCompanyId !== companyId) {
    const scopeResponse = await fetch(`${apiUrl}/api/platform/companies/${encodeURIComponent(companyId)}/scope`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Accept: "application/json",
      },
    });
    const scopeBody = await scopeResponse.json().catch(() => ({}));
    if (!scopeResponse.ok) {
      fail(`Company scope entry failed (${scopeResponse.status}): ${scopeBody?.message || "Unknown error"}`);
    }
    sessionToken = String(scopeBody.token || sessionToken);
  }
  return sessionToken;
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
  if (databaseName === "eb_catalog_test") {
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
}

if (!token) {
  token = await resolveTokenViaLogin();
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
  if (!token) fail("SCOPED_ADMIN_TOKEN or STAGING_LOGIN_EMAIL/PASSWORD is required for --apply.");
  const claims = decodeJwt(token);
  const scopedCompany = claims.companyId || claims.company_id || claims.activeCompanyId || claims.active_company_id;
  if (scopedCompany !== companyId) fail("The supplied token is not scoped to kids-velvet.");
  if (process.env.CONFIRM_VELVET_STAGING_CLASSIFICATIONS !== "kids-velvet@eb_catalog_test") {
    fail("CONFIRM_VELVET_STAGING_CLASSIFICATIONS=kids-velvet@eb_catalog_test is required for --apply.");
  }
}

const classifiedRows = loadWorkbookClassifiedRows(workbookPath);
const workbookProducts = parseVelvetWorkbookClassificationRows(classifiedRows);
if (workbookProducts.length !== 434) {
  fail(`Expected 434 workbook products with classification metadata, found ${workbookProducts.length}.`);
}

const existingProducts = await request(`${apiUrl}/api/products`);
const plan = planVelvetWorkbookClassificationUpdate({
  workbookProducts,
  existingProducts: Array.isArray(existingProducts) ? existingProducts : [],
});

const preApplyReport = {
  mode: apply ? "apply" : "dry-run",
  companyId,
  siteId,
  workbookPath,
  TOTAL_UNIQUE_SOURCE_TAGS: plan.TOTAL_UNIQUE_SOURCE_TAGS,
  TAG_CLASSIFICATION_COUNTS: plan.TAG_CLASSIFICATION_COUNTS,
  TAG_INVENTORY: plan.TAG_INVENTORY.map((entry) => ({
    tag: entry.tag,
    unique_product_count: entry.unique_product_count,
    classification: entry.classification.status,
    canonical_group: entry.classification.group || null,
    canonical_id: entry.classification.id || null,
  })),
  UNRESOLVED_TAGS: plan.UNRESOLVED_TAGS,
  MISSING_SOURCE_IDS: plan.MISSING_SOURCE_IDS,
  DUPLICATE_SOURCE_IDS: plan.DUPLICATE_SOURCE_IDS,
  MATCHED_TO_WORKBOOK: plan.MATCHED_TO_WORKBOOK,
  AGE_COVERAGE: plan.AGE_COVERAGE,
  GENDER_COVERAGE: plan.GENDER_COVERAGE,
  SKILL_COVERAGE: plan.SKILL_COVERAGE,
  OCCASION_COVERAGE: plan.OCCASION_COVERAGE,
  MATERIAL_COVERAGE: plan.MATERIAL_COVERAGE,
  PRODUCT_TYPE_COVERAGE: plan.PRODUCT_TYPE_COVERAGE,
  THEME_COVERAGE: plan.THEME_COVERAGE,
  COLLECTION_COVERAGE: plan.COLLECTION_COVERAGE,
  PRODUCTS_WITH_ANY_ATTRIBUTE: plan.PRODUCTS_WITH_ANY_ATTRIBUTE,
  PRODUCTS_WITHOUT_EXTRA_ATTRIBUTES: plan.PRODUCTS_WITHOUT_EXTRA_ATTRIBUTES,
  WOULD_UPDATE: plan.WOULD_UPDATE,
  ALREADY_CORRECT: plan.ALREADY_CORRECT,
  ERRORS: plan.ERRORS,
  CLEAN: plan.CLEAN,
};
console.log(JSON.stringify(preApplyReport, null, 2));

if (!apply) {
  process.exit(isCleanVelvetWorkbookClassificationPlan(plan) ? 0 : 2);
}

if (!isCleanVelvetWorkbookClassificationPlan(plan)) {
  fail("Dry-run plan is not clean; refusing to apply.");
}

const backupDir = path.resolve(repoRoot, "api", "backups");
await mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const productBackupFile = path.join(backupDir, `velvet-kids-velvet-classifications-products-${stamp}.json`);

await writeFile(
  productBackupFile,
  `${JSON.stringify({
    exportedAt: new Date().toISOString(),
    companyId,
    siteId,
    productCount: existingProducts.length,
    products: existingProducts.map((product) => ({
      id: product.id,
      sourceProductId: getSourceProductId(product),
      ...Object.fromEntries(PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [group, product[group] ?? product.data?.[group] ?? []])),
      price: product.price ?? null,
      stockQty: product.stockQty ?? product.data?.stockQty ?? null,
      brandId: product.brandId ?? product.data?.brandId ?? null,
      mainCategoryId: product.mainCategoryId ?? product.data?.mainCategoryId ?? null,
      subCategoryId: product.subCategoryId ?? product.data?.subCategoryId ?? null,
      categoryId: product.categoryId ?? product.data?.categoryId ?? null,
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({ id: variant.id, stock: variant.stock ?? variant.stockQty ?? null }))
        : [],
    })),
  }, null, 2)}\n`,
  { flag: "wx" },
);

if (existingProducts.length !== 434) {
  fail(`PRODUCT_BACKUP_COUNT expected 434, got ${existingProducts.length}.`);
}

const fingerprintsBefore = new Map(
  plan.wouldUpdate.map((item) => [item.productId, item.fingerprintBefore]),
);

let updatedProducts = 0;
for (const item of plan.wouldUpdate) {
  const payload = Object.fromEntries(
    PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [group, item.targetAttributes[group] ?? []]),
  );
  await request(`${apiUrl}/api/products/${encodeURIComponent(item.productId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  updatedProducts += 1;
}

const afterProducts = await request(`${apiUrl}/api/products`);
const workbookBySourceId = new Map(workbookProducts.map((row) => [row.sourceProductId, row]));
const verification = summarizeVelvetWorkbookClassificationVerification({
  products: afterProducts,
  workbookBySourceId,
  fingerprintsBefore,
});

console.log(JSON.stringify({
  mode: "apply-complete",
  backupFile: productBackupFile,
  PRODUCTS_UPDATED: updatedProducts,
  verification,
}, null, 2));

if (!verification.clean) {
  fail("Post-apply verification failed.");
}
