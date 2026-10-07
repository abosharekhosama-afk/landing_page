import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { enterCompanyScope } from "../src/utils/auth.js";
import { effectivePlatformRole, isPlatformAdmin } from "../src/utils/roles.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("companies, domains, and company switch use isPlatformAdmin", () => {
  const companies = read("src/pages/AdminCompaniesPage.jsx");
  const domains = read("src/pages/AdminDomainsPage.jsx");
  const switcher = read("src/components/CompanySwitcher.jsx");
  const layout = read("src/components/AdminLayout.jsx");
  const auth = read("src/utils/auth.js");

  for (const source of [companies, domains, switcher, layout, auth]) {
    assert.match(source, /isPlatformAdmin\(effectivePlatformRole\(/);
  }
  assert.doesNotMatch(companies, /role !== "super_admin"/);
  assert.doesNotMatch(companies, /role === "super_admin"/);
  assert.doesNotMatch(domains, /!== "super_admin"/);
  assert.doesNotMatch(switcher, /=== "super_admin"/);
  assert.doesNotMatch(layout, /=== "super_admin"/);
  assert.doesNotMatch(auth, /!== "super_admin"/);
  assert.equal(isPlatformAdmin(effectivePlatformRole({ role: "platform_admin" })), true);
  assert.equal(
    isPlatformAdmin(effectivePlatformRole({ role: "company_admin", globalRole: "platform_admin" })),
    true,
  );
  assert.equal(isPlatformAdmin(effectivePlatformRole({ role: "company_admin" })), false);
  assert.equal(isPlatformAdmin(effectivePlatformRole({ role: "super_admin" })), true);
});

function installStorage(user) {
  const values = new Map([
    ["epChemicalJwt", "platform-token"],
    ["epChemicalUser", JSON.stringify(user)],
  ]);
  const storage = {
    get length() { return values.size; },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const sessionValues = new Map();
  const sessionStorage = {
    get length() { return sessionValues.size; },
    getItem(key) { return sessionValues.get(key) ?? null; },
    key(index) { return [...sessionValues.keys()][index] ?? null; },
    setItem(key, value) { sessionValues.set(key, String(value)); },
    removeItem(key) { sessionValues.delete(key); },
  };
  globalThis.localStorage = storage;
  globalThis.sessionStorage = sessionStorage;
}

test("enterCompanyScope allows platform_admin and rejects company_admin", async () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;

  installStorage({ role: "company_admin", globalRole: "company_admin", isActive: true });
  await assert.rejects(enterCompanyScope("icare"), /A Super Admin session is required/);

  installStorage({ role: "platform_admin", globalRole: "platform_admin", isActive: true });
  globalThis.fetch = async (url) => {
    if (String(url).includes("/platform/companies/icare/scope")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            token: "scoped-token",
            user: {
              role: "company_admin",
              globalRole: "platform_admin",
              isCompanyScope: true,
              activeCompany: { id: "icare", slug: "icare" },
            },
            activeCompany: { id: "icare", slug: "icare" },
          };
        },
      };
    }
    if (String(url).includes("/company/context")) {
      return { ok: true, status: 200, async json() { return { id: "icare", modules: [] }; } };
    }
    return { ok: true, status: 200, async json() { return {}; } };
  };

  const user = await enterCompanyScope("icare");
  assert.equal(user.globalRole, "platform_admin");
  assert.equal(user.isCompanyScope, true);

  globalThis.localStorage = originalLocalStorage;
  globalThis.sessionStorage = originalSessionStorage;
  globalThis.fetch = originalFetch;
});
