import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import test from "node:test";
import { isCustomModulesCapabilityEnabled } from "../src/utils/customModulesUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("AdminDashboardPage defines tenant-local storageKeys map used by tenantStorageKey", () => {
  const source = read("src/pages/AdminDashboardPage.jsx");
  assert.match(source, /const storageKeys = \{/);
  assert.match(source, /inventory:\s*"inventory"/);
  assert.match(source, /movements:\s*"stockMovements"/);
  assert.match(source, /settings:\s*"settings"/);
  assert.match(source, /stores:\s*"stores"/);
  assert.match(source, /tenantStorageKey\(companyId,\s*storageKeys\[key\]\)/);
  assert.doesNotMatch(source, /tenantStorageKey\(companyId,\s*storageKeys\[key\]\)[\s\S]*const storageKeys/);
});

test("disabled unit-creator module skips custom-modules capability", () => {
  const modules = [
    {
      module_key: "catalog.products",
      route: "/admin/products",
      enabled: true,
    },
  ];
  assert.equal(isCustomModulesCapabilityEnabled(modules), false);
  assert.equal(isCustomModulesCapabilityEnabled([]), false);
});

test("enabled unit-creator module allows custom-modules capability", () => {
  const modules = [
    {
      module_key: "settings.unit_creator",
      route: "/admin/unit-creator",
      enabled: true,
    },
  ];
  assert.equal(isCustomModulesCapabilityEnabled(modules), true);
});

test("CPanelApp gates custom-modules fetch on capability helper", () => {
  const source = read("src/CPanelApp.jsx");
  assert.match(source, /isCustomModulesCapabilityEnabled/);
  assert.match(source, /if\s*\(\s*!isCustomModulesCapabilityEnabled\(modules\)\s*\)/);
  assert.match(source, /setCustomModules\(\[\]\)/);
  assert.match(source, /fetchCustomModules\(\)/);
});
