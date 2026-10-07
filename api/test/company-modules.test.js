import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
process.env.NODE_ENV = "test";
process.env.CATALOG_STORAGE_MODE = "memory";

const {
  COMPANY_SCOPE_EXPIRY_SECONDS, signCompanyScopeToken, verifyToken,
} = await import("../src/middleware/auth.js");
const { enforceCompanyModuleAccess, moduleForRequest } = await import("../src/middleware/moduleAccess.js");
const {
  CPANEL_MODULE_DEFINITIONS,
  defaultEnabledModuleKeys,
  listCompanyModules,
  modulesVisibleToUser,
  replaceCompanyModules,
  restoreCompanyModuleDefaults,
} = await import("../src/moduleRegistry.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Super Admin company scope is short-lived, company-bound, and has no membership claim", () => {
  const token = signCompanyScopeToken({ id: "platform-root", role: "super_admin" }, { id: "icare", status: "active" });
  const payload = verifyToken(token);
  assert.equal(payload.tokenType, "company_scope");
  assert.equal(payload.companyId, "icare");
  assert.equal(payload.membershipId, undefined);
  assert.equal(payload.membershipRole, undefined);
  assert.ok(payload.scopeId);
  assert.equal(payload.exp - payload.iat, COMPANY_SCOPE_EXPIRY_SECONDS);
  assert.throws(() => signCompanyScopeToken({ id: "admin", role: "company_admin" }, { id: "icare", status: "active" }));
  assert.throws(() => signCompanyScopeToken({ id: "root", role: "super_admin" }, { id: "icare", status: "inactive" }));
});

test("EB defaults to all modules while iCare keeps relevant commerce and dropshipping modules", () => {
  const eb = defaultEnabledModuleKeys("eb-chemical");
  const icare = defaultEnabledModuleKeys("icare");
  const dropshipKeys = CPANEL_MODULE_DEFINITIONS.map((entry) => entry.module_key).filter((key) => key.startsWith("company_dropship."));
  assert.deepEqual(dropshipKeys, [
    "company_dropship.merchants",
    "company_dropship.catalog",
    "company_dropship.orders",
    "company_dropship.fulfillment",
    "company_dropship.settlements",
  ]);
  assert.equal(eb.size, CPANEL_MODULE_DEFINITIONS.length - dropshipKeys.length);
  assert.equal(dropshipKeys.every((key) => eb.has(key) === false), true);
  assert.equal(dropshipKeys.every((key) => defaultEnabledModuleKeys("kids-velvet").has(key) === false), true);
  assert.equal(icare.has("catalog.products"), true);
  assert.equal(icare.has("storefront.website_texts"), true);
  assert.equal(icare.has("dropshipping.products"), true);
  assert.equal(icare.has("company_dropship.orders"), false);
  assert.equal(icare.has("operations.invoices"), false);
  assert.equal(icare.has("settings.product_settings"), false);
});

test("company module reads normalize overrides and filter disabled or unauthorized modules", async () => {
  const modules = await listCompanyModules("icare", { query: async (_sql, params) => {
    assert.deepEqual(params, ["icare"]);
    return { rows: [{ ...CPANEL_MODULE_DEFINITIONS[1], enabled: true, company_sort_order: 7, label_en_override: "Tenant products" }] };
  } });
  assert.equal(modules[0].sort_order, 7);
  assert.equal(modules[0].label_en, "Tenant products");
  assert.equal(modulesVisibleToUser(modules, { role: "company_admin" }).length, 1);
  assert.equal(modulesVisibleToUser([{ ...modules[0], enabled: false }], { role: "company_admin" }).length, 0);
});

test("module updates are tenant-scoped, validated, idempotent upserts with configuration", async () => {
  const calls = [];
  const transaction = async (callback) => callback({ query: async (sql, params) => { calls.push({ sql, params }); } });
  await replaceCompanyModules("icare", [{ module_key: "catalog.products", enabled: true, sort_order: 25, configuration_override: { mode: "beauty" } }], { transaction });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /on conflict\(company_id,module_key\) do update/i);
  assert.equal(calls[0].params[0], "icare");
  assert.equal(calls[0].params[1], "catalog.products");
  assert.equal(calls[0].params[6], '{"mode":"beauty"}');
  await assert.rejects(() => replaceCompanyModules("icare", [{ module_key: "catalog.products", enabled: "yes", sort_order: 1 }], { transaction }), /enabled must be boolean/);
  await assert.rejects(() => replaceCompanyModules("icare", [{ module_key: "unknown", enabled: true, sort_order: 1 }], { transaction }), /Unknown module/);
});

test("restore defaults deletes and recreates only the selected company's settings", async () => {
  const calls = [];
  const transaction = async (callback) => callback({ query: async (sql, params) => { calls.push({ sql, params }); } });
  await restoreCompanyModuleDefaults("icare", { transaction });
  assert.match(calls[0].sql, /delete from public\.company_cpanel_modules where company_id=\$1/i);
  assert.deepEqual(calls[0].params, ["icare"]);
  assert.equal(calls.slice(1).every((call) => call.params[0] === "icare"), true);
  assert.equal(calls.length, CPANEL_MODULE_DEFINITIONS.length + 1);
});

test("company dropshipping is opt-in and activated only for the Velvet company", () => {
  const migration = fs.readFileSync(new URL("../supabase/migrations/042_company_dropship_modules.sql", import.meta.url), "utf8");
  const navigation = fs.readFileSync(new URL("../../cpanel/src/utils/moduleRegistry.js", import.meta.url), "utf8");
  assert.match(migration, /company_dropship\.merchants/);
  assert.match(migration, /company_dropship\.catalog/);
  assert.match(migration, /company_dropship\.orders/);
  assert.match(migration, /company_dropship\.fulfillment/);
  assert.match(migration, /company_dropship\.settlements/);
  assert.match(migration, /select 'kids-velvet', module_key, true, sort_order/);
  assert.equal(migration.includes("'eb-chemical'"), false);
  assert.equal(migration.includes("'icare'"), false);
  assert.match(navigation, /"\/admin\/velvet-dropshipping\/orders": "admin-velvet-dropshipping-orders"/);
  assert.match(navigation, /"\/admin\/velvet-dropshipping\/merchants": "admin-velvet-dropshipping-merchants"/);
});

test("direct API paths resolve to their server-enforced module", () => {
  const req = (originalUrl) => ({ originalUrl });
  assert.equal(moduleForRequest(req("/api/admin/dropshipping/products")), "dropshipping.products");
  assert.equal(moduleForRequest(req("/api/admin/velvet-dropshipping/orders")), "company_dropship.orders");
  assert.equal(moduleForRequest(req("/api/velvet-dropshipping/stores/demo")), null);
  assert.equal(moduleForRequest(req("/api/admin/invoices")), "operations.invoices");
  assert.equal(moduleForRequest(req("/api/admin/custom-modules")), "settings.unit_creator");
  assert.equal(moduleForRequest(req("/api/admin/activity-log?limit=10")), "settings.activity_log");
  assert.equal(moduleForRequest(req("/api/admin/product-field-definitions")), "catalog.products");
  assert.equal(moduleForRequest(req("/api/admin/products/icare-product/field-values")), "catalog.products");
  assert.equal(moduleForRequest(req("/api/admin/product-schema")), "settings.product_settings");
  assert.equal(moduleForRequest(req("/api/platform/companies")), null);
});

test("disabled company APIs return 403 while enabled APIs continue to their route", async () => {
  const response = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const base = { companyId: "icare", headers: { authorization: "Bearer test" }, user: { role: "company_admin" } };
  const denied = response();
  let deniedNext = false;
  await enforceCompanyModuleAccess({ ...base, method: "GET", originalUrl: "/api/admin/invoices" }, denied, () => { deniedNext = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.body.moduleKey, "operations.invoices");
  assert.equal(deniedNext, false);

  const allowed = response();
  let allowedNext = false;
  await enforceCompanyModuleAccess({ ...base, method: "GET", originalUrl: "/api/products" }, allowed, () => { allowedNext = true; });
  assert.equal(allowedNext, true);
  assert.equal(allowed.statusCode, 200);
});

test("migration 012 is additive, repeatable, and seeds EB and iCare without touching migration 011", () => {
  const migration = fs.readFileSync(path.join(root, "api/supabase/migrations/012_company_cpanel_modules.sql"), "utf8");
  assert.match(migration, /create table if not exists public\.cpanel_module_definitions/i);
  assert.match(migration, /create table if not exists public\.company_cpanel_modules/i);
  assert.match(migration, /on conflict\(module_key\) do update/i);
  assert.match(migration, /select 'eb-chemical',module_key,true/i);
  assert.match(migration, /select 'icare',module_key/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from/i);
  const migration011 = fs.readFileSync(path.join(root, "api/supabase/migrations/011_tenant_product_content.sql"), "utf8");
  assert.ok(migration011.length > 0);
});

test("CPanel wiring includes dynamic modules, guarded routes, scope switch, and feature pages", () => {
  const app = fs.readFileSync(path.join(root, "cpanel/src/CPanelApp.jsx"), "utf8");
  const layout = fs.readFileSync(path.join(root, "cpanel/src/components/AdminLayout.jsx"), "utf8");
  const companies = fs.readFileSync(path.join(root, "cpanel/src/pages/AdminCompaniesPage.jsx"), "utf8");
  const feature = fs.readFileSync(path.join(root, "cpanel/src/pages/AdminFeaturePage.jsx"), "utf8");
  assert.match(app, /moduleAllowsPage/);
  assert.match(app, /enterCompanyScope/);
  assert.match(app, /exitCompanyScope/);
  assert.match(layout, /groupCompanyModules\(modules\)/);
  assert.match(layout, /onReturnToPlatform/);
  assert.match(companies, /Manage Modules/);
  assert.match(companies, /Manage company/);
  assert.match(feature, /admin-website-texts/);
});

test("custom modules cannot override a temporary Super Admin tenant scope", () => {
  const route = fs.readFileSync(path.join(root, "api/src/routes/customModules.js"), "utf8");
  assert.match(route, /if \(req\.tenantScope\) return req\.companyId/);
});
