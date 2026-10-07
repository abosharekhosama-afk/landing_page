import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import { resolveStorefrontCompany } from "../src/tenancy/company.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-catalog-settings-"));
const now = "2026-07-13T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);

const users = [
  ["icare-admin", "admin@icare.test", "company_admin", "icare"],
  ["eb-admin", "admin@eb.test", "admin", "eb-chemical"],
  ["icare-customer", "customer@icare.test", "customer", "icare"],
  ["revoked-admin", "revoked@icare.test", "company_admin", "icare"],
  ["super-user", "super@test.local", "super_admin", "eb-chemical"],
].map(([id, email, role, companyId]) => ({
  id,
  name: id,
  email,
  password: passwordHash,
  role,
  permissions: [],
  isActive: true,
  company_id: companyId,
  createdAt: now,
  updatedAt: now,
}));

const memberships = [
  ["icare:icare-admin", "icare", "icare-admin", "company_admin"],
  ["eb-chemical:eb-admin", "eb-chemical", "eb-admin", "company_admin"],
  ["icare:icare-customer", "icare", "icare-customer", "customer"],
  ["icare:revoked-admin", "icare", "revoked-admin", "company_admin"],
].map(([id, companyId, userId, role]) => ({
  id,
  companyId,
  userId,
  role,
  status: "active",
  permissions: [],
  createdAt: now,
  updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "eb-chemical",
      slug: "eb-chemical",
      name: "EB Chemical",
      status: "active",
      isDefault: true,
      settings: { language: "en", currency: "ILS", logoUrl: "/eb-logo.png" },
    },
    {
      id: "icare",
      slug: "icare",
      name: "iCare",
      status: "active",
      isDefault: false,
      storefrontUrl: "https://igroup.website/icare",
      storefrontPath: "/icare",
      settings: { language: "ar", locale: "ar-PS", direction: "rtl", currency: "ILS" },
    },
  ],
  users,
  memberships,
  categories: [
    {
      id: "eb-category",
      company_id: "eb-chemical",
      slug: "eb-only",
      name: { en: "EB Only", ar: "إي بي" },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "icare-referenced-category",
      company_id: "icare",
      slug: "referenced-category",
      name: { en: "Referenced Category", ar: "فئة مرتبطة" },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  brands: [
    {
      id: "eb-brand",
      company_id: "eb-chemical",
      slug: "eb-only",
      name: "EB Only",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "icare-referenced-brand",
      company_id: "icare",
      slug: "referenced-brand",
      name: "Referenced Brand",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  products: [
    {
      id: "icare-product",
      slug: "icare-product",
      name: { en: "iCare Product", ar: "منتج" },
      categoryId: "icare-referenced-category",
      brandId: "icare-referenced-brand",
      category: "Referenced Category",
      brand: "Referenced Brand",
      company_id: "icare",
    },
    {
      id: "icare-inactive-product",
      slug: "icare-inactive-product",
      name: { en: "Inactive iCare Product", ar: "" },
      isActive: false,
      company_id: "icare",
    },
    {
      id: "eb-product",
      slug: "eb-product",
      name: { en: "EB Product", ar: "منتج" },
      category: "EB Only",
      brand: "EB Only",
      company_id: "eb-chemical",
    },
  ],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.JWT_SECRET = "catalog-settings-test-secret";
process.env.NODE_ENV = "test";

const { app } = await import("../src/server.js");
const { companyMembershipRepository } = await import("../src/data/store.js");
const {
  deleteCompanyMembershipWithClient,
  loadPlatformStoreFromSupabase,
  loadStoreFromSupabase,
  runCompanyBrandingSettingsTransaction,
  runTenantCatalogWriteTransaction,
  setCompanyPersistenceDependenciesForTest,
  setPlatformLoadDependenciesForTest,
  startupHydrationTimeoutMs,
} = await import("../src/data/postgresStore.js");
const { sendCatalogError } = await import("../src/routes/catalogValidation.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, body, headers = {}, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.response.status, 200);
  return result.body;
}

test("tenant catalog and company settings contracts", async (t) => {
  await t.test("storefront resolver supports dedicated domains and generic shared paths", () => {
    const storefrontCompanies = [
      {
        id: "eb-chemical", slug: "eb-chemical", status: "active",
        domain: "ebchemi.com", domains: ["ebchemi.com"],
      },
      {
        id: "icare", slug: "icare", status: "active", domain: "", domains: [],
        storefrontUrl: "https://igroup.website/icare", storefrontPath: "/icare",
      },
      {
        id: "ifit", slug: "ifit", status: "active", domain: "", domains: [],
        storefrontUrl: "https://igroup.website/ifit", storefrontPath: "/ifit",
      },
      {
        id: "inactive", slug: "inactive", status: "inactive", domain: "", domains: [],
        storefrontUrl: "https://igroup.website/inactive", storefrontPath: "/inactive",
      },
    ];
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "ebchemi.com", path: "/products",
    })?.id, "eb-chemical");
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "igroup.website", path: "/icare",
    })?.id, "icare");
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "igroup.website", path: "/icare/products",
    })?.id, "icare");
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "igroup.website", path: "/ifit/products",
    })?.id, "ifit");
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "igroup.website", path: "/unknown-company",
    }), null);
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "igroup.website", path: "/inactive",
    }), null);
    assert.equal(resolveStorefrontCompany(storefrontCompanies, {
      host: "igroup.website", path: "/icare-products",
    }), null);
  });
  const icare = await login("admin@icare.test");
  const eb = await login("admin@eb.test");
  const customer = await login("customer@icare.test");
  const superAdmin = await login("super@test.local");

  await t.test("public product reads honor the resolved company header and expose only active products", async () => {
    const icareCatalog = await request("/products", {
      headers: { "X-Company-Id": "icare" },
    });
    assert.equal(icareCatalog.response.status, 200);
    assert.deepEqual(icareCatalog.body.map((product) => product.id), ["icare-product"]);
    assert.equal(icareCatalog.body.some((product) => product.id === "eb-product"), false);

    const ebCatalog = await request("/products", {
      headers: { "X-Company-Id": "eb-chemical" },
    });
    assert.equal(ebCatalog.response.status, 200);
    assert.deepEqual(ebCatalog.body.map((product) => product.id), ["eb-product"]);

    const unknownCatalog = await request("/products", {
      headers: { "X-Company-Id": "unknown-company" },
    });
    assert.equal(unknownCatalog.response.status, 404);
  });

  let createdCategory;
  let overrideCategory;
  await t.test("iCare company_admin creates and reads an iCare category", async () => {
    const created = await request("/categories", {
      token: icare.token,
      body: { slug: "shared-slug", name: { en: "iCare Category", ar: "فئة آي كير" } },
    });
    assert.equal(created.response.status, 201);
    createdCategory = created.body;
    const read = await request(`/categories/${createdCategory.id}`, { token: icare.token });
    assert.equal(read.response.status, 200);
    assert.equal(read.body.name.ar, "فئة آي كير");
  });

  await t.test("category IDs are tenant-safe for reads and mutations", async () => {
    assert.equal((await request(`/categories/${createdCategory.id}`, { token: eb.token })).response.status, 404);
    assert.equal((await request(`/categories/${createdCategory.id}`, {
      token: eb.token,
      body: { name: { en: "Changed", ar: "" } },
      method: "PATCH",
    })).response.status, 404);
    assert.equal((await request(`/categories/${createdCategory.id}`, {
      token: eb.token,
      method: "DELETE",
    })).response.status, 404);
    assert.equal((await request("/categories/eb-category", { token: icare.token })).response.status, 404);
    assert.equal((await request("/categories/eb-category", {
      token: icare.token,
      body: { isActive: false },
      method: "PATCH",
    })).response.status, 404);
    assert.equal((await request("/categories/eb-category", {
      token: icare.token,
      method: "DELETE",
    })).response.status, 404);
  });

  await t.test("category authorization, uniqueness, parents, references, and overrides", async () => {
    assert.equal((await request("/categories", {
      token: customer.token,
      body: { slug: "customer-category", name: { en: "Denied", ar: "" } },
    })).response.status, 403);
    assert.equal((await request("/categories", {
      token: icare.token,
      body: { slug: "shared-slug", name: { en: "Duplicate", ar: "" } },
    })).response.status, 409);
    assert.equal((await request("/categories", {
      token: eb.token,
      body: { slug: "shared-slug", name: { en: "Allowed in EB", ar: "" } },
    })).response.status, 201);
    assert.equal((await request("/categories", {
      token: icare.token,
      body: { slug: "cross-parent", name: { en: "Cross Parent", ar: "" }, parentId: "eb-category" },
    })).response.status, 404);
    assert.equal((await request("/categories/icare-referenced-category", {
      token: icare.token,
      method: "DELETE",
    })).response.status, 409);
    const root = await request("/categories", {
      token: icare.token,
      body: { slug: "cycle-root", name: { en: "Cycle Root", ar: "" } },
    });
    const child = await request("/categories", {
      token: icare.token,
      body: { slug: "cycle-child", name: { en: "Cycle Child", ar: "" }, parentId: root.body.id },
    });
    assert.equal(root.response.status, 201);
    assert.equal(child.response.status, 201);
    assert.equal((await request(`/categories/${root.body.id}`, {
      token: icare.token,
      body: { parentId: child.body.id },
      method: "PATCH",
    })).response.status, 400);
    const status = await request(`/categories/${createdCategory.id}/status`, {
      token: icare.token,
      body: { isActive: false },
      method: "PATCH",
    });
    assert.equal(status.response.status, 200);
    assert.equal(status.body.isActive, false);
    const overridden = await request("/categories?companyId=eb-chemical", {
      token: icare.token,
      headers: { "X-Company-Id": "icare" },
      body: {
        companyId: "eb-chemical",
        slug: "override-category",
        name: { en: "Override Attempt", ar: "" },
      },
    });
    assert.equal(overridden.response.status, 201);
    overrideCategory = overridden.body;
    assert.equal((await request(`/categories/${overrideCategory.id}`, { token: eb.token })).response.status, 404);
  });

  let createdBrand;
  await t.test("brand CRUD is authorized and tenant-isolated", async () => {
    const created = await request("/brands", {
      token: icare.token,
      body: { slug: "shared-brand", name: "iCare Brand" },
    });
    assert.equal(created.response.status, 201);
    createdBrand = created.body;
    assert.equal((await request(`/brands/${createdBrand.id}`, { token: icare.token })).response.status, 200);
    assert.equal((await request(`/brands/${createdBrand.id}`, { token: eb.token })).response.status, 404);
    assert.equal((await request("/brands/eb-brand", { token: icare.token })).response.status, 404);
    assert.equal((await request("/brands/eb-brand", {
      token: icare.token,
      body: { name: "Changed" },
      method: "PATCH",
    })).response.status, 404);
    assert.equal((await request("/brands/eb-brand", {
      token: icare.token,
      method: "DELETE",
    })).response.status, 404);
    assert.equal((await request(`/brands/${createdBrand.id}`, {
      token: eb.token,
      body: { name: "Changed" },
      method: "PATCH",
    })).response.status, 404);
    assert.equal((await request(`/brands/${createdBrand.id}`, {
      token: eb.token,
      method: "DELETE",
    })).response.status, 404);
    assert.equal((await request("/brands", {
      token: customer.token,
      body: { slug: "customer-brand", name: "Denied" },
    })).response.status, 403);
    const status = await request(`/brands/${createdBrand.id}/status`, {
      token: icare.token,
      body: { isActive: false },
      method: "PATCH",
    });
    assert.equal(status.response.status, 200);
    assert.equal(status.body.isActive, false);
  });

  await t.test("brand uniqueness, references, and overrides are tenant-safe", async () => {
    assert.equal((await request("/brands", {
      token: icare.token,
      body: { slug: "shared-brand", name: "Duplicate" },
    })).response.status, 409);
    assert.equal((await request("/brands", {
      token: eb.token,
      body: { slug: "shared-brand", name: "Allowed in EB" },
    })).response.status, 201);
    assert.equal((await request("/brands/icare-referenced-brand", {
      token: icare.token,
      method: "DELETE",
    })).response.status, 409);
    const overridden = await request("/brands?companyId=eb-chemical", {
      token: icare.token,
      headers: { "X-Company-Id": "icare" },
      body: { companyId: "eb-chemical", slug: "override-brand", name: "Override Attempt" },
    });
    assert.equal(overridden.response.status, 201);
    assert.equal((await request(`/brands/${overridden.body.id}`, { token: eb.token })).response.status, 404);
  });

  await t.test("iCare settings and context expose only safe active-company branding", async () => {
    const initial = await request("/company/settings", { token: icare.token });
    assert.equal(initial.response.status, 200);
    assert.equal(initial.body.name, "iCare");
    assert.equal(initial.body.language, "ar");
    assert.equal(initial.body.logoUrl, null);
    assert.equal(JSON.stringify(initial.body).includes("EB Chemical"), false);

    const updated = await request("/company/settings?companyId=eb-chemical", {
      token: icare.token,
      headers: { "X-Company-Id": "icare" },
      body: {
        companyId: "eb-chemical",
        name: "iCare Updated",
        logoUrl: "/uploads/icare-logo.png",
        language: "ar",
        locale: "ar-PS",
        direction: "rtl",
        currency: "ILS",
        supportEmail: "support@icare.test",
        theme: { primary: "#123456", accent: "#abc" },
      },
      method: "PATCH",
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.name, "iCare Updated");
    assert.equal(updated.body.theme.primary, "#123456");

    const context = await request("/company/context", { token: icare.token });
    assert.equal(context.response.status, 200);
    assert.equal(context.body.id, "icare");
    assert.equal(context.body.slug, "icare");
    assert.equal(context.body.domain, null);
    assert.equal(context.body.settings.logoUrl, "/uploads/icare-logo.png");
    assert.equal(context.body.settings.theme.secondary, null);
    assert.equal(JSON.stringify(context.body).includes("EB Chemical"), false);

    const ebSettings = await request("/company/settings", { token: eb.token });
    assert.equal(ebSettings.response.status, 200);
    assert.equal(ebSettings.body.name, "EB Chemical");
    assert.equal(ebSettings.body.logoUrl, "/eb-logo.png");
  });

  await t.test("settings reject forbidden, unknown, and unsafe fields", async () => {
    for (const body of [
      { slug: "changed" },
      { secret: "nope" },
      { adminModules: { products: true } },
      { direction: "sideways" },
      { currency: "ils" },
      { theme: { primary: "url(javascript:alert(1))" } },
    ]) {
      const result = await request("/company/settings", {
        token: icare.token,
        body,
        method: "PATCH",
      });
      assert.equal(result.response.status, 400);
    }
  });

  await t.test("EB Points visibility setting is boolean, admin-only, and tenant-scoped", async () => {
    const initial = await request("/company/settings", { token: icare.token });
    assert.equal(initial.response.status, 200);
    assert.equal(Object.hasOwn(initial.body, "ebPointsEnabled"), false);

    const rejected = await request("/company/settings", {
      token: icare.token,
      body: { ebPointsEnabled: "true" },
      method: "PATCH",
    });
    assert.equal(rejected.response.status, 400);

    const updated = await request("/company/settings", {
      token: icare.token,
      body: { ebPointsEnabled: true },
      method: "PATCH",
    });
    assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.ebPointsEnabled, true);

    const context = await request("/company/context", { token: icare.token });
    assert.equal(context.response.status, 200);
    assert.equal(context.body.settings.ebPointsEnabled, true);

    const ebContext = await request("/company/context", { token: eb.token });
    assert.equal(ebContext.response.status, 200);
    assert.equal(ebContext.body.isDefault, true);
    assert.equal(Object.hasOwn(ebContext.body.settings, "ebPointsEnabled"), false);

    const storefront = await request("/company/resolve-storefront?host=localhost&path=/");
    if (storefront.status === 200 && storefront.body?.settings) {
      assert.equal(Object.hasOwn(storefront.body.settings, "ebPointsEnabled"), false);
    }
  });

  await t.test("strict catalog PATCH validation rejects coercion and unsafe keys", async () => {
    assert.equal((await request(`/categories/${createdCategory.id}`, {
      token: icare.token, body: {}, method: "PATCH",
    })).response.status, 400);
    assert.equal((await request(`/brands/${createdBrand.id}`, {
      token: icare.token, body: {}, method: "PATCH",
    })).response.status, 400);

    for (const sortOrder of ["", " ", true, false, [], {}, null, 1.5, "1.5", "+2", "01"]) {
      const result = await request(`/categories/${createdCategory.id}`, {
        token: icare.token, body: { sortOrder }, method: "PATCH",
      });
      assert.equal(result.response.status, 400, `sortOrder ${JSON.stringify(sortOrder)} must fail`);
    }
    for (const sortOrder of [0, -2, 15, "0", "-2", "15"]) {
      const result = await request(`/categories/${createdCategory.id}`, {
        token: icare.token, body: { sortOrder }, method: "PATCH",
      });
      assert.equal(result.response.status, 200, `sortOrder ${JSON.stringify(sortOrder)} must pass`);
    }
    for (const unsafeBody of [
      JSON.parse('{"__proto__":{"polluted":true}}'),
      { prototype: "unsafe" },
      { constructor: "unsafe" },
    ]) {
      assert.equal((await request(`/categories/${createdCategory.id}`, {
        token: icare.token, body: unsafeBody, method: "PATCH",
      })).response.status, 400);
    }
  });

  await t.test("theme colors accept only 3, 4, 6, or 8 hex digits", async () => {
    for (const color of ["#abc", "#abcd", "#112233", "#11223344"]) {
      assert.equal((await request("/company/settings", {
        token: icare.token, body: { theme: { primary: color } }, method: "PATCH",
      })).response.status, 200);
    }
    for (const color of ["#12", "#12345", "#1234567", "#123456789", "rgb(0,0,0)"]) {
      assert.equal((await request("/company/settings", {
        token: icare.token, body: { theme: { primary: color } }, method: "PATCH",
      })).response.status, 400);
    }
  });

  await t.test("normalized product references are optional, tenant-safe, and authoritative", async () => {
    const scopedOverride = await request("/products?companyId=eb-chemical", {
      token: icare.token,
      headers: { "X-Company-Id": "eb-chemical" },
      body: {
        id: "icare-scoped-product",
        slug: "icare-scoped-product",
        name: { en: "Scoped iCare Product", ar: "" },
        isActive: true,
        companyId: "eb-chemical",
      },
    });
    assert.equal(scopedOverride.response.status, 201);
    const scopedIcareProducts = await request("/products", { token: icare.token });
    const scopedEbProducts = await request("/products", { token: eb.token });
    assert.equal(scopedIcareProducts.body.some((product) => product.id === "icare-scoped-product"), true);
    assert.equal(scopedEbProducts.body.some((product) => product.id === "icare-scoped-product"), false);

    const accepted = await request("/products", {
      token: icare.token,
      body: {
        id: "icare-normalized-product",
        slug: "icare-normalized-product",
        name: { en: "Normalized", ar: "" },
        categoryId: "icare-referenced-category",
        brandId: "icare-referenced-brand",
        category: "Legacy category disagreement",
        brand: "Legacy brand disagreement",
      },
    });
    assert.equal(accepted.response.status, 201);
    assert.equal(accepted.body.categoryId, "icare-referenced-category");
    assert.equal(accepted.body.brandId, "icare-referenced-brand");
    assert.equal(accepted.body.category, "Legacy category disagreement");
    assert.equal(accepted.body.brand, "Legacy brand disagreement");

    const updated = await request("/products/icare-normalized-product", {
      token: icare.token,
      method: "PUT",
      body: { categoryId: "icare-referenced-category", brandId: "icare-referenced-brand" },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.categoryId, "icare-referenced-category");
    assert.equal(updated.body.brandId, "icare-referenced-brand");
    assert.equal((await request("/products/icare-normalized-product", {
      token: icare.token, method: "PUT", body: { categoryId: "eb-category" },
    })).response.status, 404);

    assert.equal((await request("/products", {
      token: icare.token,
      body: { id: "bad-category", slug: "bad-category", categoryId: "eb-category" },
    })).response.status, 404);
    assert.equal((await request("/products", {
      token: icare.token,
      body: { id: "bad-brand", slug: "bad-brand", brandId: "eb-brand" },
    })).response.status, 404);
    assert.equal((await request("/products", {
      token: icare.token,
      body: { id: "inactive-category", slug: "inactive-category", categoryId: createdCategory.id },
    })).response.status, 400);
    assert.equal((await request("/products", {
      token: icare.token,
      body: { id: "inactive-brand", slug: "inactive-brand", brandId: createdBrand.id },
    })).response.status, 400);
    const legacy = await request("/products", {
      token: icare.token,
      body: { id: "legacy-only", slug: "legacy-only", category: "Legacy", brand: "Legacy" },
    });
    assert.equal(legacy.response.status, 201);

    for (const body of [
      { id: "snake-category", slug: "snake-category", category_id: "eb-category" },
      { id: "snake-brand", slug: "snake-brand", brand_id: "eb-brand" },
      {
        id: "mixed-reference",
        slug: "mixed-reference",
        categoryId: "icare-referenced-category",
        category_id: "eb-category",
      },
    ]) {
      assert.equal((await request("/products", { token: icare.token, body })).response.status, 400);
    }
  });

  await t.test("tenant employee creation cannot claim an existing global identity", async () => {
    const reusedId = await request("/employees", {
      token: icare.token,
      body: {
        id: "eb-admin",
        name: "Hostile ID reuse",
        email: "hostile-id@test.local",
      },
    });
    assert.equal(reusedId.response.status, 409);
    assert.match(reusedId.body.message, /global user identity already exists/i);

    const reusedEmail = await request("/employees", {
      token: icare.token,
      body: {
        id: "new-client-id",
        name: "Hostile email reuse",
        email: " ADMIN@EB.TEST ",
      },
    });
    assert.equal(reusedEmail.response.status, 409);
    assert.match(reusedEmail.body.message, /email already belongs/i);
  });

  await t.test("platform company endpoints validate and expose storefront metadata", async () => {
    const before = await request("/platform/companies/icare", { token: superAdmin.token });
    assert.equal(before.response.status, 200);

    const updated = await request("/platform/companies/icare", {
      token: superAdmin.token,
      method: "PATCH",
      body: {
        domain: "",
        storefrontUrl: "https://igroup.website/icare",
        storefrontPath: "/icare",
        settings: { ...before.body.settings, currency: "ILS", language: "ar" },
      },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.id, "icare");
    assert.equal(updated.body.slug, "icare");
    assert.equal(updated.body.domain, "");
    assert.deepEqual(updated.body.domains, []);
    assert.equal(updated.body.storefrontUrl, "https://igroup.website/icare");
    assert.equal(updated.body.storefrontPath, "/icare");
    assert.equal(updated.body.settings.currency, "ILS");
    assert.equal(updated.body.settings.language, "ar");

    const detail = await request("/platform/companies/icare", { token: superAdmin.token });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.storefrontUrl, "https://igroup.website/icare");
    assert.equal(detail.body.storefrontPath, "/icare");
    const listed = await request("/platform/companies", { token: superAdmin.token });
    assert.equal(listed.response.status, 200);
    const listedIcare = listed.body.find((company) => company.id === "icare");
    assert.equal(listedIcare.storefrontUrl, "https://igroup.website/icare");
    assert.equal(listedIcare.storefrontPath, "/icare");

    const resolved = await request(
      "/company/resolve-storefront?host=igroup.website&path=%2Ficare%2Fproducts",
    );
    assert.equal(resolved.response.status, 200);
    assert.equal(resolved.body.id, "icare");
    assert.equal(resolved.body.storefrontPath, "/icare");
    assert.equal("users" in resolved.body, false);
    assert.equal("memberships" in resolved.body, false);
    assert.equal("adminModules" in resolved.body.settings, false);
    const unresolved = await request(
      "/company/resolve-storefront?host=igroup.website&path=%2Funknown-company",
    );
    assert.equal(unresolved.response.status, 404);

    const created = await request("/platform/companies", {
      token: superAdmin.token,
      body: {
        name: "Shared Path Company",
        slug: "shared-path-company",
        status: "draft",
        domain: "",
        storefrontUrl: "https://igroup.website/shared-path-company",
        storefrontPath: "/shared-path-company",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.domain, "");
    assert.deepEqual(created.body.domains, []);
    assert.equal(created.body.storefrontUrl, "https://igroup.website/shared-path-company");
    assert.equal(created.body.storefrontPath, "/shared-path-company");

    for (const body of [
      { storefrontUrl: "http://igroup.website/icare" },
      { storefrontUrl: "https://user:secret@igroup.website/icare" },
      { storefrontPath: "icare" },
      { storefrontPath: "/../icare" },
    ]) {
      const rejected = await request("/platform/companies/icare", {
        token: superAdmin.token,
        method: "PATCH",
        body,
      });
      assert.equal(rejected.response.status, 400);
    }
  });

  await t.test("clearing a non-default company domain deletes it and survives hydration", async () => {
    const tableRows = {
      companies: [
        { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", is_default: true },
      ],
      company_domains: [],
      company_settings: [],
    };
    const cloneRows = (rows) => JSON.parse(JSON.stringify(rows || []));
    const loadDependencies = {
      selectAllRows: async (table) => cloneRows(tableRows[table]),
    };
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://isolated.invalid/domain-clear-test";
    setPlatformLoadDependenciesForTest(loadDependencies);
    setCompanyPersistenceDependenciesForTest({
      upsertRows: async (table, rows, conflictColumn = "id") => {
        tableRows[table] ||= [];
        for (const row of cloneRows(rows)) {
          const index = tableRows[table].findIndex(
            (current) => current[conflictColumn] === row[conflictColumn],
          );
          if (index >= 0) tableRows[table][index] = { ...tableRows[table][index], ...row };
          else tableRows[table].push(row);
        }
      },
      deleteCompanyDomain: async (domainId) => {
        const index = tableRows.company_domains.findIndex((row) => row.id === domainId);
        if (index >= 0) tableRows.company_domains.splice(index, 1);
      },
    });

    try {
      const domainStore = await import(`../src/data/store.js?domain-clear=${Date.now()}`);
      const created = await domainStore.companyRepository.createCompanyDraft({
        slug: "icare",
        name: "iCare",
        status: "active",
        domain: "legacy-icare.example",
        storefrontUrl: "https://igroup.website/icare",
        storefrontPath: "/icare",
        settings: { currency: "ILS", language: "ar" },
      });
      assert.equal(created.domain, "legacy-icare.example");
      assert.deepEqual(created.domains, ["legacy-icare.example"]);
      assert.equal(created.storefrontUrl, "https://igroup.website/icare");
      assert.equal(created.storefrontPath, "/icare");
      assert.equal(created.settings.currency, "ILS");
      assert.equal(created.settings.language, "ar");
      assert.equal(tableRows.company_domains[0].domain, "legacy-icare.example");

      const replaced = await domainStore.companyRepository.updateCompanyDraft("icare", {
        domain: "care.example",
      });
      assert.equal(replaced.domain, "care.example");
      assert.deepEqual(replaced.domains, ["care.example"]);
      assert.equal(tableRows.company_domains.length, 1);
      assert.equal(tableRows.company_domains[0].domain, "care.example");

      const updated = await domainStore.companyRepository.updateCompanyDraft("icare", { domain: "" });
      assert.equal(updated.id, "icare");
      assert.equal(updated.slug, "icare");
      assert.equal(updated.domain, "");
      assert.deepEqual(updated.domains, []);
      assert.deepEqual(tableRows.company_domains, []);
      assert.equal(updated.storefrontUrl, "https://igroup.website/icare");
      assert.equal(updated.storefrontPath, "/icare");
      const persistedIcareSettings = tableRows.company_settings.find((row) => row.company_id === "icare");
      assert.equal(persistedIcareSettings.settings.storefrontUrl, "https://igroup.website/icare");
      assert.equal(persistedIcareSettings.settings.storefrontPath, "/icare");

      const secondCompany = await domainStore.companyRepository.createCompanyDraft({
        slug: "ifit",
        name: "iFit",
        status: "active",
        domain: "",
        storefrontUrl: "https://igroup.website/ifit",
        storefrontPath: "/ifit",
      });
      assert.equal(secondCompany.domain, "");
      assert.deepEqual(secondCompany.domains, []);
      assert.equal(secondCompany.storefrontUrl, "https://igroup.website/ifit");
      assert.equal(secondCompany.storefrontPath, "/ifit");
      assert.equal(tableRows.company_domains.some((row) => ["icare", "ifit"].includes(row.company_id)), false);

      setPlatformLoadDependenciesForTest(loadDependencies);
      const restartedStore = await import(`../src/data/store.js?domain-clear-restart=${Date.now()}`);
      const rehydrated = restartedStore.companyRepository.getCompanyById("icare");
      assert.equal(rehydrated.id, "icare");
      assert.equal(rehydrated.slug, "icare");
      assert.equal(rehydrated.domain, "");
      assert.deepEqual(rehydrated.domains, []);
      assert.equal(rehydrated.storefrontUrl, "https://igroup.website/icare");
      assert.equal(rehydrated.storefrontPath, "/icare");
      assert.equal(rehydrated.settings.currency, "ILS");
      assert.equal(rehydrated.settings.language, "ar");
      const rehydratedSecond = restartedStore.companyRepository.getCompanyById("ifit");
      assert.equal(rehydratedSecond.domain, "");
      assert.deepEqual(rehydratedSecond.domains, []);
      assert.equal(rehydratedSecond.storefrontUrl, "https://igroup.website/ifit");
      assert.equal(rehydratedSecond.storefrontPath, "/ifit");
    } finally {
      setCompanyPersistenceDependenciesForTest(null);
      setPlatformLoadDependenciesForTest(null);
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  await t.test("fresh PostgreSQL startup hydrates isolated repositories with bounded queries", async () => {
    const tableRows = {
      companies: [
        { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", is_default: true },
        { id: "icare", slug: "icare", name: "iCare", status: "active", is_default: false },
        { id: "empty-company", slug: "empty-company", name: "Empty", status: "active", is_default: false },
      ],
      company_domains: [],
      company_settings: [],
      users: [
        { id: "icare-only", email: "icare-only@test.local", role: "customer", is_active: true },
        { id: "shared-user", email: "shared@test.local", role: "employee", is_active: true },
        { id: "shared-user", email: "shared@test.local", role: "employee", is_active: true },
        { id: "inactive-user", email: "inactive@test.local", role: "employee", is_active: false },
        { id: "inactive-member-user", email: "inactive-member@test.local", role: "employee", is_active: true },
        { id: "platform-super", email: "super-platform@test.local", role: "super_admin", is_active: true },
      ],
      company_memberships: [
        { id: "icare:icare-only", company_id: "icare", user_id: "icare-only", role: "customer", is_active: true },
        { id: "eb:shared", company_id: "eb-chemical", user_id: "shared-user", role: "employee", permissions: ["orders.view"], is_active: true },
        { id: "icare:shared", company_id: "icare", user_id: "shared-user", role: "customer", permissions: ["profile.view"], is_active: true },
        { id: "icare:inactive-user", company_id: "icare", user_id: "inactive-user", role: "employee", is_active: true },
        { id: "icare:inactive-member", company_id: "icare", user_id: "inactive-member-user", role: "employee", is_active: false },
      ],
      products: [
        {
          id: "shared-record",
          company_id: null,
          slug: "eb-product",
          data: { name: "EB Product", company_id: "icare" },
        },
        { id: "shared-record", company_id: "icare", slug: "icare-product", data: { name: "iCare Product" } },
      ],
      product_variants: [
        { id: "shared-variant", company_id: null, product_id: "shared-record", data: { marker: "eb" } },
        { id: "shared-variant", company_id: "icare", product_id: "shared-record", data: { marker: "icare" } },
      ],
      product_gallery_images: [
        { id: "shared-gallery", company_id: null, product_id: "shared-record", image_url: "/eb.png" },
        { id: "shared-gallery", company_id: "icare", product_id: "shared-record", image_url: "/icare.png" },
      ],
      orders: [
        { id: "shared-order", company_id: null, status: "EB", data: {} },
        { id: "shared-order", company_id: "icare", status: "iCare", data: {} },
      ],
      order_items: [
        { id: "shared-item", company_id: null, order_id: "shared-order", product_id: "shared-record", data: { marker: "eb" } },
        { id: "shared-item", company_id: "icare", order_id: "shared-order", product_id: "shared-record", data: { marker: "icare" } },
      ],
      carts: [
        { id: "eb-cart", company_id: null, user_id: "same-cart-user", items: [{ marker: "eb" }] },
        { id: "icare-cart", company_id: "icare", user_id: "same-cart-user", items: [{ marker: "icare" }] },
      ],
      company_categories: [
        { id: "shared-category", company_id: null, slug: "eb-category", name: { en: "EB" } },
        { id: "shared-category", company_id: "icare", slug: "icare-category", name: { en: "iCare" } },
      ],
      company_brands: [
        { id: "shared-brand", company_id: null, slug: "eb-brand", name: "EB" },
        { id: "shared-brand", company_id: "icare", slug: "icare-brand", name: "iCare" },
      ],
      product_bundles: [
        { id: "bundle-1", company_id: "icare", slug: "icare-bundle", name: "iCare Bundle", pricing_mode: "auto_sum", discount_value: 0, is_active: true },
      ],
      product_bundle_items: [
        { id: "bundle-item-1", company_id: "icare", bundle_id: "bundle-1", product_id: "shared-record", quantity: 2, sort_order: 0 },
      ],
    };
    const calls = [];
    const cloneRows = (rows) => JSON.parse(JSON.stringify(rows || []));
    const selectAllRows = async (table, query = "select=*") => {
      calls.push({ table, query });
      let rows = cloneRows(tableRows[table]);
      if (table === "company_memberships" && query.includes("company_id=eq.")) {
        const companyId = decodeURIComponent(query.match(/company_id=eq\.([^&]+)/)?.[1] || "");
        rows = rows.filter((row) => row.company_id === companyId);
      }
      return rows;
    };
    const selectTenantRows = async (table, companyId) => cloneRows(tableRows[table]).filter((row) =>
      companyId === "eb-chemical"
        ? row.company_id == null || row.company_id === companyId
        : row.company_id === companyId);
    const dependencies = { selectAllRows, selectTenantRows };

    calls.length = 0;
    await loadPlatformStoreFromSupabase(dependencies);
    assert.equal(calls.length, 49);
    assert.equal(new Set(calls.map((call) => call.table)).size, 49);
    assert.equal(calls.every((call) => call.query === "select=*"), true);

    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://isolated.invalid/catalog-startup-test";
    setPlatformLoadDependenciesForTest(dependencies);
    let freshStore;
    try {
      freshStore = await import(`../src/data/store.js?startup=${Date.now()}`);
    } finally {
      setPlatformLoadDependenciesForTest(null);
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    const ebProducts = freshStore.productRepository.getByCompany("eb-chemical");
    const icareProducts = freshStore.productRepository.getByCompany("icare");
    assert.equal(ebProducts.length, 1);
    assert.equal(icareProducts.length, 1);
    assert.equal(ebProducts[0].slug, "eb-product");
    assert.equal(freshStore.getRecordCompanyId(ebProducts[0]), "eb-chemical");
    assert.equal(icareProducts[0].slug, "icare-product");
    assert.equal(ebProducts[0].variants[0].marker, "eb");
    assert.equal(icareProducts[0].variants[0].marker, "icare");
    assert.equal(ebProducts[0].gallery_images[0].image_url, "/eb.png");
    assert.equal(icareProducts[0].gallery_images[0].image_url, "/icare.png");
    assert.equal(freshStore.categoryRepository.getByCompany("eb-chemical")[0].slug, "eb-category");
    assert.equal(freshStore.categoryRepository.getByCompany("icare")[0].slug, "icare-category");
    assert.equal(freshStore.brandRepository.getByCompany("eb-chemical")[0].slug, "eb-brand");
    assert.equal(freshStore.brandRepository.getByCompany("icare")[0].slug, "icare-brand");
    assert.equal(freshStore.orderRepository.getByCompany("eb-chemical")[0].items[0].marker, "eb");
    assert.equal(freshStore.orderRepository.getByCompany("icare")[0].items[0].marker, "icare");
    assert.equal(freshStore.cartRepository.findByCompany("eb-chemical", "same-cart-user")[0].marker, "eb");
    assert.equal(freshStore.cartRepository.findByCompany("icare", "same-cart-user")[0].marker, "icare");

    assert.deepEqual(freshStore.userRepository.getByCompany("eb-chemical").map((user) => user.id), ["shared-user"]);
    assert.deepEqual(
      freshStore.userRepository.getByCompany("icare").map((user) => user.id).sort(),
      ["icare-only", "shared-user"],
    );
    assert.deepEqual(freshStore.userRepository.getByCompany("empty-company"), []);
    assert.equal(freshStore.userRepository.getByCompany("eb-chemical").some((user) => user.id === "icare-only"), false);
    assert.equal(freshStore.userRepository.getByCompany("icare").some((user) => user.id === "platform-super"), false);
    assert.equal(freshStore.userRepository.getByCompany("icare").some((user) => user.id === "inactive-user"), false);
    assert.equal(freshStore.userRepository.getByCompany("icare").some((user) => user.id === "inactive-member-user"), false);
    const ebShared = freshStore.userRepository.findByCompany("eb-chemical", "shared-user");
    const icareShared = freshStore.userRepository.findByCompany("icare", "shared-user");
    assert.notEqual(ebShared, icareShared);
    assert.equal(ebShared.role, "employee");
    assert.deepEqual(ebShared.permissions, ["orders.view"]);
    assert.equal(ebShared.companyId, "eb-chemical");
    assert.equal(icareShared.role, "customer");
    assert.deepEqual(icareShared.permissions, ["profile.view"]);
    assert.equal(icareShared.companyId, "icare");
    assert.equal(ebShared.globalRole, "employee");
    assert.equal(icareShared.globalRole, "employee");
    const { signToken, verifyToken } = await import("../src/middleware/auth.js");
    const sharedIdentity = freshStore.users.find((user) => user.id === "shared-user");
    const ebMembership = freshStore.companyMemberships.find(
      (membership) => membership.companyId === "eb-chemical" && membership.userId === "shared-user",
    );
    const icareMembership = freshStore.companyMemberships.find(
      (membership) => membership.companyId === "icare" && membership.userId === "shared-user",
    );
    const ebPayload = verifyToken(signToken(sharedIdentity, ebMembership));
    const icarePayload = verifyToken(signToken(sharedIdentity, icareMembership));
    assert.equal(ebPayload.companyId, "eb-chemical");
    assert.equal(ebPayload.membershipRole, "employee");
    assert.equal(icarePayload.companyId, "icare");
    assert.equal(icarePayload.membershipRole, "customer");
    assert.equal((await freshStore.platformUserRepository.listUsers()).some((user) => user.id === "platform-super"), true);
    assert.equal((await freshStore.platformUserRepository.listUsers()).filter((user) => user.id === "shared-user").length, 1);

    assert.throws(
      () => freshStore.userRepository.createForCompany("icare", {
        id: "shared-user",
        email: "attacker@test.local",
        role: "employee",
      }),
      (error) => error.statusCode === 409 && /identity already exists/i.test(error.message),
    );
    assert.throws(
      () => freshStore.userRepository.createForCompany("icare", {
        id: "hostile-new-id",
        email: " SHARED@test.local ",
        role: "employee",
      }),
      (error) => error.statusCode === 409 && /email already belongs/i.test(error.message),
    );
    const newTenantUser = freshStore.userRepository.createForCompany("icare", {
      id: "new-tenant-user",
      email: "new-tenant@test.local",
      role: "employee",
      permissions: ["orders.view"],
      isActive: true,
    });
    assert.equal(newTenantUser.id, "new-tenant-user");
    assert.equal(newTenantUser.role, "employee");
    assert.deepEqual(newTenantUser.permissions, ["orders.view"]);

    const explicitIcare = await loadStoreFromSupabase("icare", dependencies);
    assert.equal(explicitIcare.store.products.length, 1);
    assert.equal(explicitIcare.store.products[0].slug, "icare-product");

    const adapterCalls = [];
    const deletedByAdapter = await deleteCompanyMembershipWithClient({
      async query(sql, params) {
        adapterCalls.push({ sql, params });
        return { rows: [{ id: "icare:shared" }] };
      },
    }, "icare", "shared-user", "icare:shared");
    assert.deepEqual(deletedByAdapter, [{ id: "icare:shared" }]);
    assert.match(adapterCalls[0].sql, /delete from public\.company_memberships/i);
    assert.deepEqual(adapterCalls[0].params, ["icare", "shared-user", "icare:shared"]);

    process.env.DATABASE_URL = "postgresql://isolated.invalid/catalog-membership-delete";
    await assert.rejects(
      freshStore.deleteTenantUserMembership("icare", "shared-user", {
        deleteRemote: async () => { throw new Error("simulated delete failure"); },
      }),
      /simulated delete failure/,
    );
    assert.equal(freshStore.userRepository.findByCompany("icare", "shared-user").role, "customer");
    await freshStore.deleteTenantUserMembership("icare", "shared-user", {
      deleteRemote: async (companyId, userId) => {
        const index = tableRows.company_memberships.findIndex(
          (membership) => membership.company_id === companyId && membership.user_id === userId,
        );
        if (index < 0) return [];
        return [tableRows.company_memberships.splice(index, 1)[0]];
      },
    });
    process.env.DATABASE_URL = previousDatabaseUrl;
    assert.equal(freshStore.userRepository.findByCompany("icare", "shared-user"), null);
    assert.equal(freshStore.userRepository.findByCompany("eb-chemical", "shared-user").role, "employee");
    assert.equal((await freshStore.platformUserRepository.listUsers()).some((user) => user.id === "shared-user"), true);

    process.env.DATABASE_URL = "postgresql://isolated.invalid/catalog-membership-restart";
    setPlatformLoadDependenciesForTest(dependencies);
    let restartedStore;
    try {
      restartedStore = await import(`../src/data/store.js?membership-restart=${Date.now()}`);
    } finally {
      setPlatformLoadDependenciesForTest(null);
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    assert.equal(restartedStore.userRepository.findByCompany("icare", "shared-user"), null);
    assert.equal(restartedStore.userRepository.findByCompany("eb-chemical", "shared-user").role, "employee");
    assert.equal((await restartedStore.platformUserRepository.listUsers()).some((user) => user.id === "shared-user"), true);

    assert.equal(startupHydrationTimeoutMs({ POSTGRES_STARTUP_HYDRATION_TIMEOUT_MS: "45000" }), 45000);
    for (const value of ["not-a-number", "0", "-5", "1.5", "Infinity"]) {
      assert.equal(startupHydrationTimeoutMs({ POSTGRES_STARTUP_HYDRATION_TIMEOUT_MS: value }), 30000);
    }

    const loadWithRows = (overrides) => loadPlatformStoreFromSupabase({
      selectAllRows: async (table) => cloneRows(
        Object.prototype.hasOwnProperty.call(overrides, table) ? overrides[table] : tableRows[table],
      ),
    });
    await loadWithRows({
      product_variants: [...tableRows.product_variants, cloneRows([tableRows.product_variants[0]])[0]],
      product_gallery_images: [
        ...tableRows.product_gallery_images,
        cloneRows([tableRows.product_gallery_images[0]])[0],
      ],
      order_items: [...tableRows.order_items, cloneRows([tableRows.order_items[0]])[0]],
      carts: [...tableRows.carts, cloneRows([tableRows.carts[0]])[0]],
    });

    const bundleStore = await loadWithRows({
      product_bundles: [
        { id: "bundle-1", company_id: "icare", slug: "icare-bundle", name: "iCare Bundle", pricing_mode: "auto_sum", discount_value: 0, is_active: true },
      ],
      product_bundle_items: [
        { id: "bundle-item-1", company_id: "icare", bundle_id: "bundle-1", product_id: "shared-record", quantity: 2, sort_order: 0 },
      ],
    });
    assert.equal(bundleStore.store.productBundles.length, 1);
    assert.equal(bundleStore.store.productBundles[0].slug, "icare-bundle");
    assert.equal(bundleStore.store.productBundles[0].pricingMode, "auto_sum");
    assert.equal(bundleStore.store.productBundleItems.length, 1);
    assert.equal(bundleStore.store.productBundleItems[0].bundleId, "bundle-1");
    assert.equal(bundleStore.store.productBundleItems[0].quantity, 2);
    assert.equal(bundleStore.store.memberships.length, 4);
    assert.equal(bundleStore.store.memberships.some((membership) => membership.id === "eb:shared"), true);
    assert.equal(bundleStore.store.memberships.some((membership) => membership.id === "icare:inactive-member"), true);

    const noBundleRows = await loadWithRows({
      product_bundles: undefined,
      product_bundle_items: undefined,
    });
    assert.deepEqual(noBundleRows.store.productBundles, []);
    assert.deepEqual(noBundleRows.store.productBundleItems, []);
    assert.equal(noBundleRows.store.memberships.length, 4);

    for (const [table, changedField, changedValue] of [
      ["product_variants", "data", { marker: "conflict" }],
      ["product_gallery_images", "image_url", "/conflict.png"],
      ["order_items", "data", { marker: "conflict" }],
      ["carts", "items", [{ marker: "conflict" }]],
    ]) {
      const conflicting = { ...cloneRows([tableRows[table][0]])[0], [changedField]: changedValue };
      await assert.rejects(
        loadWithRows({ [table]: [...tableRows[table], conflicting] }),
        new RegExp(`conflicting duplicate ${table}`),
      );
    }
    await assert.rejects(
      loadWithRows({
        carts: [
          ...tableRows.carts,
          { ...tableRows.carts[0], id: "different-cart-id", items: [{ marker: "conflict" }] },
        ],
      }),
      /conflicting duplicate carts row eb-chemical:same-cart-user/,
    );
    await assert.rejects(
      loadWithRows({
        product_variants: [
          ...tableRows.product_variants,
          { id: "orphan-variant", company_id: "icare", product_id: "eb-only-product" },
        ],
      }),
      /missing cross-tenant-safe product parent/,
    );
    await assert.rejects(
      loadWithRows({
        order_items: [
          ...tableRows.order_items,
          { id: "orphan-item", company_id: "icare", order_id: "eb-only-order" },
        ],
      }),
      /missing cross-tenant-safe order parent/,
    );

    await assert.rejects(
      loadPlatformStoreFromSupabase({
        selectAllRows: async (table, query) => table === "company_categories"
          ? [{ id: "unknown-category", company_id: "unknown-company", slug: "unknown" }]
          : selectAllRows(table, query),
      }),
      /unknown or unsafe company/,
    );

    process.env.DATABASE_URL = "postgresql://isolated.invalid/catalog-startup-failure";
    setPlatformLoadDependenciesForTest({
      selectAllRows: async (table) => {
        if (table === "products") throw new Error("simulated platform hydration failure");
        return cloneRows(tableRows[table]);
      },
    });
    try {
      const failedStore = await import(`../src/data/store.js?startup-failure=${Date.now()}`);
      await assert.rejects(
        failedStore.persistCompanyStore("icare"),
        /persistence is configured but unavailable/i,
      );
    } finally {
      setPlatformLoadDependenciesForTest(null);
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  await t.test("tenant catalog transaction locks company and rolls back callback failures", async () => {
    const statements = [];
    const client = {
      async query(sql) {
        statements.push(sql.trim().toLowerCase());
        if (sql.includes("from public.companies")) return { rows: [{ id: "icare" }] };
        return { rows: [] };
      },
    };
    await assert.rejects(
      runTenantCatalogWriteTransaction(client, "icare", async (callbackClient, companyId) => {
        assert.equal(callbackClient, client);
        assert.equal(companyId, "icare");
        throw new Error("simulated locked mutation failure");
      }),
      /simulated locked mutation failure/,
    );
    assert.equal(statements[0], "begin");
    assert.match(statements[1], /for update/);
    assert.equal(statements.at(-1), "rollback");
    assert.equal(statements.includes("commit"), false);
  });

  await t.test("catalog storage fails closed outside test without PostgreSQL", () => {
    const script = 'import("./src/data/store.js")';
    for (const nodeEnv of ["production", ""]) {
      const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
        cwd: path.resolve(testDir, ".."),
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_ENV: nodeEnv,
          DATABASE_URL: "",
          POSTGRES_URL: "",
          ALLOW_LOCAL_CATALOG_STORAGE: "",
        },
      });
      assert.notEqual(result.status, 0);
      assert.match(`${result.stderr}${result.stdout}`, /PostgreSQL catalog storage is required/);
    }
    assert.equal(process.env.NODE_ENV, "test");
  });

  await t.test("company branding transaction rolls back both writes on failure", async () => {
    const statements = [];
    const client = {
      async query(sql) {
        statements.push(sql.trim().toLowerCase());
        if (sql.includes("from public.companies")) return { rows: [{ id: "icare", name: "iCare" }] };
        if (sql.includes("from public.company_settings")) return { rows: [{ settings: { currency: "ILS" } }] };
        if (sql.includes("insert into public.company_settings")) throw new Error("simulated settings failure");
        return { rows: [] };
      },
    };
    await assert.rejects(
      runCompanyBrandingSettingsTransaction(client, "icare", {
        name: "Changed", settingsPatch: { language: "ar" },
      }),
      /simulated settings failure/,
    );
    assert.equal(statements[0], "begin");
    assert.equal(statements.at(-1), "rollback");
    assert.equal(statements.includes("commit"), false);
  });

  await t.test("database conflicts are mapped by constraint without leaking details", () => {
    function capture(error, context) {
      const result = { statusCode: 0, payload: null };
      const response = {
        status(code) { result.statusCode = code; return this; },
        json(payload) { result.payload = payload; return result; },
      };
      return sendCatalogError(response, error, context);
    }
    assert.match(capture({ code: "23505", constraint: "company_categories_company_id_slug_key" }).payload.message, /Category slug/);
    assert.match(capture({ code: "23505", constraint: "company_brands_company_id_slug_key" }).payload.message, /Brand slug/);
    assert.equal(capture({ code: "23505", constraint: "unexpected_unique" }).payload.message, "Database conflict.");
    assert.match(capture({ code: "23503", constraint: "fk_products_company_category" }, { operation: "delete" }).payload.message, /referenced by products/);
    assert.equal(capture({ code: "23503", constraint: "fk_company_categories_parent" }, { operation: "update" }).statusCode, 400);
  });

  await t.test("revoked membership and platform-only Super Admin cannot use tenant settings", async () => {
    const revoked = await login("revoked@icare.test");
    await companyMembershipRepository.disableMembership("icare", "revoked-admin");
    assert.equal((await request("/company/settings", { token: revoked.token })).response.status, 401);
    assert.equal((await request("/company/context", { token: "invalid-token" })).response.status, 401);
    assert.equal((await request("/company/settings", { token: superAdmin.token })).response.status, 403);
  });

  await t.test("migration statically contains normalized tenant-safe schema", () => {
    const sql = fs.readFileSync(
      path.resolve(testDir, "../supabase/migrations/009_tenant_catalog_entities.sql"),
      "utf8",
    );
    for (const required of [
      "create table public.company_categories",
      "create table public.company_brands",
      "incompatible schema",
      "company_categories_pkey",
      "company_brands_pkey",
      "company_categories_name_check",
      "company_categories_description_check",
      "not c.condeferrable",
      "foreign key (company_id, parent_id)",
      "fk_products_company_category",
      "fk_products_company_brand",
      "unique (company_id, slug)",
      "idx_company_categories_active_sort",
      "idx_company_brands_active_sort",
      "idx_products_company_category",
      "idx_products_company_brand",
      "on delete restrict not valid",
      "RLS is intentionally deferred",
      "pg_am",
      "indoption",
      "opcdefault",
      "with ordinality",
    ]) {
      assert.equal(sql.includes(required), true, `Missing migration fragment: ${required}`);
    }
    assert.equal(sql.includes("enable row level security"), false);
    assert.equal(sql.includes("idx_company_categories_slug"), false);
    assert.equal(sql.includes("idx_company_brands_slug"), false);
    assert.equal(/validate\s+constraint/i.test(sql), false);
    assert.equal(/update\s+public\.products/i.test(sql), false);

    const postgresStore = fs.readFileSync(
      path.resolve(testDir, "../src/data/postgresStore.js"),
      "utf8",
    );
    for (const required of [
      "where company_id = $1 and id = $2",
      "insert into public.company_categories",
      "insert into public.company_brands",
      "delete from public.company_categories where company_id = $1 and id = $2",
      "delete from public.company_brands where company_id = $1 and id = $2",
      "where company_id = $1",
      "category_id = $2",
      "brand_id = $2",
      "withTenantCatalogWriteLock(companyId",
      "createCategoryWithTenantLockInSupabase",
      "updateCategoryWithTenantLockInSupabase",
      "deleteCategoryWithTenantLockInSupabase",
      "deleteBrandWithTenantLockInSupabase",
      "saveProductWithTenantCatalogLockInSupabase",
      "with recursive ancestry",
      "parent.company_id = $1",
    ]) {
      assert.equal(postgresStore.includes(required), true, `Missing tenant SQL fragment: ${required}`);
    }
    assert.equal(postgresStore.includes("saveCompanyCatalogToSupabase"), false);
    assert.equal(postgresStore.includes('deleteMissingCompanyRows("company_categories"'), false);
    assert.equal(postgresStore.includes('deleteMissingCompanyRows("company_brands"'), false);
    assert.equal(postgresStore.includes("const includeProducts = options.includeProducts === true"), true);
    const productRoutes = fs.readFileSync(path.resolve(testDir, "../src/routes/products.js"), "utf8");
    assert.equal(productRoutes.includes("persistCompanyStore"), false);
    assert.equal(productRoutes.includes("category_id and brand_id are not accepted"), true);
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});
