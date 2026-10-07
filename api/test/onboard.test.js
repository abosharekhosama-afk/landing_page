import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "eb-onboard-"));
const now = "2026-07-13T00:00:00.000Z";
const password = "Super-secret-123!";
const passwordHash = await hashPassword(password);

const companies = [
  { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", isDefault: true },
  { id: "icare", slug: "icare", name: "iCare", status: "active", isDefault: false, storefrontUrl: "https://igroup.website/icare" },
];

const users = [
  { id: "super-admin", name: "Super Admin", email: "super@test.local", password: passwordHash, role: "super_admin", permissions: [], isActive: true, company_id: "eb-chemical", createdAt: now, updatedAt: now },
  { id: "existing-admin", name: "Existing Admin", email: "existing@test.local", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "eb-chemical", createdAt: now, updatedAt: now },
  { id: "regular-user", name: "Regular User", email: "user@test.local", password: passwordHash, role: "customer", permissions: [], isActive: true, company_id: "eb-chemical", createdAt: now, updatedAt: now },
];

const memberships = [
  { id: "eb-chemical:super-admin", companyId: "eb-chemical", userId: "super-admin", role: "super_admin", status: "active", createdAt: now, updatedAt: now },
  { id: "eb-chemical:existing-admin", companyId: "eb-chemical", userId: "existing-admin", role: "company_admin", status: "active", createdAt: now, updatedAt: now },
  { id: "eb-chemical:regular-user", companyId: "eb-chemical", userId: "regular-user", role: "customer", status: "active", createdAt: now, updatedAt: now },
];

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2, companies, users, memberships,
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-onboard-test-secret";
process.env.NODE_ENV = "test";

const { app } = await import("../src/server.js");
const { platformUserRepository } = await import("../src/data/store.js");
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
  return request("/auth/login", { body: { email, password } });
}

const ALL_MODULES = [
  "dashboard", "catalog.products", "catalog.categories", "catalog.brands",
  "storefront.videos", "storefront.locations", "storefront.website_media", "storefront.website_texts",
  "operations.orders", "operations.invoices", "operations.delivery", "operations.reviews", "operations.inventory",
  "people.customers", "people.employees",
  "settings.configuration", "settings.product_settings", "settings.reports", "settings.activity_log", "settings.unit_creator",
  "dropshipping.overview", "dropshipping.marketers", "dropshipping.products", "dropshipping.orders",
  "dropshipping.earnings", "dropshipping.withdrawals", "dropshipping.reports", "dropshipping.settings",
];

const ENABLED_MODULES = ["dashboard", "catalog.products", "operations.orders", "storefront.website_media", "people.customers"];
const DISABLED_MODULES = ALL_MODULES.filter((k) => !ENABLED_MODULES.includes(k));

test("Super Admin company onboarding", async (t) => {
  let superSession;

  await t.test("Super Admin logs in", async () => {
    const result = await login("super@test.local");
    assert.equal(result.response.status, 200);
    superSession = result.body;
  });

  await t.test("403 for non-Super-Admin", async () => {
    const userSession = await login("user@test.local");
    assert.equal(userSession.response.status, 200);
    const result = await request("/platform/onboard", {
      token: userSession.body.token,
      method: "POST",
      body: { company: { name: "Test" }, administrator: { name: "A", email: "a@b.com", password: "password123" }, modules: [] },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("Successful full onboarding creates company and admin (empty modules)", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "TestCorp", slug: "testcorp", status: "active", currency: "USD", language: "en", storefrontUrl: "https://testcorp.example.com" },
        administrator: { name: "Test Admin", email: "admin@testcorp.example.com", password: "Temp-pass-123!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.company.name, "TestCorp");
    assert.equal(result.body.company.slug, "testcorp");
    assert.equal(result.body.company.status, "active");
    assert.ok(result.body.company.storefrontUrl.startsWith("https://testcorp.example.com"));
    assert.equal(result.body.company.settings.currency, "USD");
    assert.equal(result.body.company.settings.language, "en");
    assert.equal(result.body.administrator.email, "admin@testcorp.example.com");
    assert.equal(result.body.administrator.role, "company_admin");
    assert.ok(result.body.administrator.id);
    assert.equal("password" in result.body, false);
    assert.equal("password" in result.body.administrator, false);
  });

  await t.test("New administrator can log in with the temporary password", async () => {
    const result = await request("/auth/login", {
      body: { email: "admin@testcorp.example.com", password: "Temp-pass-123!" },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.email, "admin@testcorp.example.com");
    assert.equal(result.body.user.role, "company_admin");
    assert.equal(result.body.activeCompany.id, "testcorp");
    assert.equal("password" in result.body.user, false);
  });

  await t.test("Modules from onboard return definitions and preserve enabled flags", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "ModCo", slug: "modco", status: "active" },
        administrator: { name: "Mod Admin", email: "mod@testcorp.example.com", password: "Mod-pass-123!" },
        modules: [
          { module_key: "dashboard", enabled: true },
          { module_key: "catalog.products", enabled: false },
        ],
      },
    });

    assert.equal(result.response.status, 201);
    const modules = result.body.modules;
    const allKeys = modules.map((m) => m.module_key);
    assert.ok(allKeys.includes("dashboard"));
    assert.ok(allKeys.includes("catalog.products"));
    assert.ok(allKeys.includes("catalog.categories"));
    assert.equal("password" in result.body, false);
  });

  await t.test("Existing user with same email is reused and password is unchanged", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "AnotherCo", slug: "anotherco", status: "active" },
        administrator: { name: "Test Admin Renamed", email: "admin@testcorp.example.com", password: "New-pass-456!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.administrator.email, "admin@testcorp.example.com");
    const existingUser = await platformUserRepository.findByEmail("admin@testcorp.example.com");
    assert.equal(result.body.administrator.id, existingUser.id);
    assert.equal("password" in result.body.administrator, false);

    const loginWithOriginal = await request("/auth/login", {
      body: { email: "admin@testcorp.example.com", password: "Temp-pass-123!" },
    });
    assert.equal(loginWithOriginal.response.status, 200);

    const loginWithNew = await request("/auth/login", {
      body: { email: "admin@testcorp.example.com", password: "New-pass-456!" },
    });
    assert.equal(loginWithNew.response.status, 401);
  });

  await t.test("Duplicate slug is rejected", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "Duplicate", slug: "testcorp", status: "active" },
        administrator: { name: "Admin", email: "dup@test.com", password: "LongPass123!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 409);
    assert.match(result.body.message, /already exists/i);
  });

  await t.test("Duplicate storefront URL is rejected", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "DupStore", slug: "dupstore", status: "active", storefrontUrl: "https://testcorp.example.com" },
        administrator: { name: "Admin", email: "dupstore@test.com", password: "LongPass123!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 409);
    assert.match(result.body.message, /storefront/i);
  });

  await t.test("Invalid module ID is rejected", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "BadModCo", slug: "badmodco", status: "active" },
        administrator: { name: "Admin", email: "badmod@test.com", password: "LongPass123!" },
        modules: [{ module_key: "nonexistent.module", enabled: true }],
      },
    });

    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /Unknown module/i);
  });

  await t.test("Temporary password under 8 characters is rejected", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "ShortPassCo", slug: "shortpass", status: "active" },
        administrator: { name: "Admin", email: "short@test.com", password: "Short1!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /at least 8 characters/i);
  });

  await t.test("Non-boolean module enabled is rejected by validation before any writes", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "ValidCo", slug: "validenabled", status: "active" },
        administrator: { name: "Admin", email: "validenabled@test.com", password: "LongPass123!" },
        modules: [{ module_key: "dashboard", enabled: "not-a-boolean" }],
      },
    });

    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /enabled must be a boolean/i);

    const companiesResult = await request("/platform/companies", { token: superSession.token });
    assert.equal(companiesResult.body.some((c) => c.id === "validenabled"), false, "no company should be created");
  });

  await t.test("Validation catches missing required fields", async () => {
    const missingName = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { status: "active" },
        administrator: { name: "Admin", email: "a@b.com", password: "LongPass123!" },
        modules: [],
      },
    });
    assert.equal(missingName.response.status, 400);
    assert.match(missingName.body.message, /name is required/i);

    const missingAdminName = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "ValidCo", status: "active" },
        administrator: { email: "a@b.com", password: "LongPass123!" },
        modules: [],
      },
    });
    assert.equal(missingAdminName.response.status, 400);
    assert.match(missingAdminName.body.message, /administrator\.name/i);

    const missingEmail = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "ValidCo", status: "active" },
        administrator: { name: "Admin", password: "LongPass123!" },
        modules: [],
      },
    });
    assert.equal(missingEmail.response.status, 400);
    assert.match(missingEmail.body.message, /email/i);
  });

  await t.test("Super Admin email cannot be reused as company administrator", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "SuperReuseCo", slug: "superreuse", status: "active" },
        administrator: { name: "Attacker", email: "super@test.local", password: "HackPass123!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 422);
    assert.match(result.body.message, /Super Admin/i);
  });

  await t.test("Email matching is case-insensitive for existing users", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "CaseCo", slug: "caseco", status: "active" },
        administrator: { name: "Case Admin", email: "EXISTING@TEST.LOCAL", password: "CasePass123!" },
        modules: [],
      },
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.administrator.id, "existing-admin");
    assert.equal(result.body.administrator.email, "existing@test.local");

    const originalPwd = await request("/auth/login", {
      body: { email: "existing@test.local", password: "Super-secret-123!" },
    });
    assert.equal(originalPwd.response.status, 200);
  });

  await t.test("Unselected modules are included in response with all module keys present", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "SelectModCo", slug: "selectmodco", status: "active" },
        administrator: { name: "Select Admin", email: "select@modco.test", password: "SelectPass123!" },
        modules: [
          { module_key: "dashboard", enabled: true },
          { module_key: "catalog.products", enabled: true },
        ],
      },
    });

    assert.equal(result.response.status, 201);
    const modules = result.body.modules;
    assert.ok(Array.isArray(modules), "modules should be an array");
    assert.ok(modules.length >= ALL_MODULES.length, "all module definitions should be present");

    const dashMod = modules.find((m) => m.module_key === "dashboard");
    assert.ok(dashMod, "dashboard should be present");
    const invMod = modules.find((m) => m.module_key === "operations.invoices");
    assert.ok(invMod, "unselected module should be present in response");

    const allKeysPresent = ALL_MODULES.every((key) => modules.some((m) => m.module_key === key));
    assert.ok(allKeysPresent, "all module keys should be present in response");
  });

  await t.test("Company scope token allows tenant-scoped API access", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "ScopeRouteCo", slug: "scoperouteco", status: "active" },
        administrator: { name: "Scope Admin", email: "scope@route.test", password: "ScopePass123!" },
        modules: [
          { module_key: "dashboard", enabled: true },
        ],
      },
    });
    assert.equal(result.response.status, 201);

    const scopeResult = await request(`/platform/companies/${result.body.company.id}/scope`, {
      token: superSession.token,
      method: "POST",
    });
    assert.equal(scopeResult.response.status, 200);
    assert.ok(scopeResult.body.token, "scope token should be returned");
    assert.ok(scopeResult.body.modules, "scope modules should be returned");
  });

  await t.test("Injected module failure rolls back company, membership, and newly created user", async () => {
    const { executeOnboarding, validateOnboardBody } = await import("../src/routes/platform.js");

    const input = validateOnboardBody({
      company: { name: "InjectFailCo", slug: "injectfailco", status: "active" },
      administrator: { name: "Inject Admin", email: "injectfail@test.com", password: "InjectPass123!" },
      modules: [{ module_key: "dashboard", enabled: true }],
    });

    const failingSaveModules = async () => {
      throw Object.assign(new Error("simulated module persistence failure"), { statusCode: 500 });
    };

    await assert.rejects(
      async () => executeOnboarding(input, { saveModules: failingSaveModules }),
      /simulated module persistence failure/,
    );

    const companiesResult = await request("/platform/companies", { token: superSession.token });
    assert.equal(companiesResult.body.some((c) => c.id === "injectfailco"), false, "company should be removed");

    const userCheck = await platformUserRepository.findByEmail("injectfail@test.com");
    assert.equal(userCheck, null, "newly created user should be removed");
  });

  await t.test("Injected module failure preserves reused existing user", async () => {
    const { executeOnboarding, validateOnboardBody } = await import("../src/routes/platform.js");

    const beforeUser = await platformUserRepository.findByEmail("existing@test.local");
    assert.ok(beforeUser, "existing user should exist before");

    const input = validateOnboardBody({
      company: { name: "InjectExistingCo", slug: "injectexistingco", status: "active" },
      administrator: { name: "Reuse Existing", email: "existing@test.local", password: "DontCare123!" },
      modules: [{ module_key: "dashboard", enabled: true }],
    });

    const failingSaveModules = async () => {
      throw Object.assign(new Error("simulated module persistence failure"), { statusCode: 500 });
    };

    await assert.rejects(
      async () => executeOnboarding(input, { saveModules: failingSaveModules }),
      /simulated module persistence failure/,
    );

    const companiesResult = await request("/platform/companies", { token: superSession.token });
    assert.equal(companiesResult.body.some((c) => c.id === "injectexistingco"), false, "company should be removed");

    const afterUser = await platformUserRepository.findByEmail("existing@test.local");
    assert.ok(afterUser, "existing user should still exist");
    assert.equal(afterUser.id, beforeUser.id, "existing user id should be unchanged");
  });

  await t.test("Disabled module API route returns 403 with correct module key", async () => {
    const onboardResult = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: { name: "DisableModCo", slug: "disablemodco", status: "active" },
        administrator: { name: "Disable Admin", email: "disable@modco.test", password: "DisablePass123!" },
        modules: [
          { module_key: "dashboard", enabled: true },
        ],
      },
    });
    assert.equal(onboardResult.response.status, 201);

    const scopeResult = await request(`/platform/companies/${onboardResult.body.company.id}/scope`, {
      token: superSession.token,
      method: "POST",
    });
    assert.equal(scopeResult.response.status, 200);
    assert.ok(scopeResult.body.token, "scope token should be returned");

    const invoicesRequest = await request("/admin/invoices", {
      token: scopeResult.body.token,
      method: "GET",
    });
    assert.equal(invoicesRequest.response.status, 403);
    assert.equal(invoicesRequest.body.moduleKey, "operations.invoices");
  });

  await t.test("Persistence coverage: storefront and settings fields in response", async () => {
    const result = await request("/platform/onboard", {
      token: superSession.token,
      method: "POST",
      body: {
        company: {
          name: "SettingsCo", slug: "settingsco", status: "active",
          storefrontUrl: "https://settingsco.example.com",
          storefrontPath: "/shop",
          domain: "settingsco.com",
          currency: "EUR",
          language: "de",
        },
        administrator: { name: "Settings Admin", email: "settings@co.test", password: "SettingsPass123!" },
        modules: [{ module_key: "dashboard", enabled: true }],
      },
    });

    assert.equal(result.response.status, 201);
    assert.ok(result.body.company.storefrontUrl.startsWith("https://settingsco.example.com"));
    assert.equal(result.body.company.domain, "settingsco.com");
    assert.equal(result.body.company.settings.currency, "EUR");
    assert.equal(result.body.company.settings.language, "de");

    const loginResult = await request("/auth/login", {
      body: { email: "settings@co.test", password: "SettingsPass123!" },
    });
    assert.equal(loginResult.response.status, 200);
    assert.equal(loginResult.body.user.email, "settings@co.test");
  });

  await t.test("validateOnboardBody normalizes all modules with unselected disabled", async () => {
    const { validateOnboardBody } = await import("../src/routes/platform.js");
    const { CPANEL_MODULE_DEFINITIONS } = await import("../src/moduleRegistry.js");

    const result = validateOnboardBody({
      company: { name: "ValidateModCo", status: "active" },
      administrator: { name: "Validate Admin", email: "validate@mod.test", password: "ValidatePass123!" },
      modules: [{ module_key: "dashboard", enabled: true }],
    });

    const allKeys = CPANEL_MODULE_DEFINITIONS.map((m) => m.module_key);
    const resultKeys = result.modules.map((m) => m.module_key);
    assert.equal(resultKeys.length, allKeys.length, "all modules should be present");
    assert.ok(allKeys.every((k) => resultKeys.includes(k)), "every definition key must appear");

    const dashMod = result.modules.find((m) => m.module_key === "dashboard");
    assert.equal(dashMod.enabled, true, "dashboard explicitly enabled");
    const invMod = result.modules.find((m) => m.module_key === "operations.invoices");
    assert.equal(invMod.enabled, false, "unselected module is disabled");
  });

  await t.test("executeOnboardingAtomic uses correct SQL with same client", async () => {
    const { executeOnboardingAtomic, validateOnboardBody } = await import("../src/routes/platform.js");

    const queries = [];
    const fakeClient = {
      query: async (text, params) => {
        queries.push({ text: text.replace(/\s+/g, " ").trim().substring(0, 120), params });
        return { rows: [] };
      },
    };
    const fakeTransaction = async (work) => work(fakeClient);

    const input = validateOnboardBody({
      company: {
        name: "TxTestCo", slug: "txtestco", status: "active",
        domain: "txtestco.com", currency: "USD", language: "en",
        storefrontUrl: "https://txtestco.com", storefrontPath: "/shop",
      },
      administrator: { name: "Tx Admin", email: "txadmin@test.com", password: "TxPass123!" },
      modules: [
        { module_key: "dashboard", enabled: true },
        { module_key: "catalog.products", enabled: false },
      ],
    });

    const result = await executeOnboardingAtomic(input, { transaction: fakeTransaction });

    assert.equal(result.companyId, "txtestco");
    assert.ok(result.userId, "userId must be set");
    assert.equal(result.isNewUser, true);

    const allSql = queries.map((q) => q.text).join(" ");
    assert.ok(allSql.includes("INSERT INTO public.companies"), "company insert");
    assert.ok(allSql.includes("INSERT INTO public.company_settings"), "settings insert");
    assert.ok(allSql.includes("INSERT INTO public.company_domains"), "domain insert");
    assert.ok(allSql.includes("INSERT INTO public.users"), "user insert");
    assert.ok(allSql.includes("INSERT INTO public.company_memberships"), "membership insert");

    const moduleInserts = queries.filter((q) => q.text.includes("company_cpanel_modules"));
    assert.equal(moduleInserts.length, 28, "all 28 module definitions inserted");
    const allModuleKeys = moduleInserts.map((q) => q.params[1]);
    assert.ok(allModuleKeys.includes("dashboard"), "dashboard present");
    assert.ok(allModuleKeys.includes("catalog.products"), "catalog.products present");
    assert.ok(allModuleKeys.includes("operations.invoices"), "operations.invoices present");
    const dashInsert = moduleInserts.find((q) => q.params[1] === "dashboard");
    assert.equal(dashInsert.params[2], true, "dashboard enabled");
    const prodInsert = moduleInserts.find((q) => q.params[1] === "catalog.products");
    assert.equal(prodInsert.params[2], false, "catalog.products disabled");
  });

  await t.test("executeOnboardingAtomic rejects on module failure without running post-commit reload", async () => {
    const { executeOnboardingAtomic, validateOnboardBody } = await import("../src/routes/platform.js");

    let queryIndex = 0;
    let moduleInsertAttempted = false;
    const failingClient = {
      query: async (text, params) => {
        queryIndex++;
        if (text.includes("company_cpanel_modules")) {
          moduleInsertAttempted = true;
          throw new Error("transaction failure during module insert");
        }
        return { rows: [] };
      },
    };
    const failingTransaction = async (work) => work(failingClient);

    const input = validateOnboardBody({
      company: { name: "FailTxCo", slug: "failtxco", status: "active" },
      administrator: { name: "Fail Tx", email: "failtx@test.com", password: "FailTxPass123!" },
      modules: [{ module_key: "dashboard", enabled: true }],
    });

    await assert.rejects(
      async () => executeOnboardingAtomic(input, { transaction: failingTransaction }),
      /transaction failure during module insert/,
    );

    assert.ok(moduleInsertAttempted, "module insert must have been reached");
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});
