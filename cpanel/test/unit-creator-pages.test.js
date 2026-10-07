import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import test from "node:test";

import {
  canBuildCustomModules,
  canManageCustomModuleEntries,
  canViewCustomModule,
  validateModuleDraft,
} from "../src/utils/customModulesUi.js";
import { canAccessAdminPage } from "../src/utils/roles.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("unit creator replaces generic feature page route", () => {
  const page = read("src/pages/AdminUnitCreatorPage.jsx");
  const app = read("src/CPanelApp.jsx");
  const feature = read("src/pages/AdminFeaturePage.jsx");
  assert.match(page, /fetchCustomModules\(/);
  assert.match(page, /CustomModuleEntriesWorkspace/);
  assert.match(page, /onCustomModulesChange/);
  assert.match(app, /activePage === "admin-unit-creator"/);
  assert.match(app, /AdminUnitCreatorPage/);
  assert.match(app, /onCustomModulesChange=\{refreshCustomModules\}/);
  assert.doesNotMatch(feature, /admin-unit-creator/);
  assert.doesNotMatch(page, /localStorage/);
});

test("unit creator covers module builder, entries, and permission states", () => {
  const page = read("src/pages/AdminUnitCreatorPage.jsx");
  const workspace = read("src/components/CustomModuleEntriesWorkspace.jsx");
  assert.match(page, /ModuleFormDialog/);
  assert.match(workspace, /EntryFormDialog/);
  assert.match(page, /copy\.loading/);
  assert.match(page, /copy\.forbidden/);
  assert.match(page, /copy\.builderReadOnly/);
  assert.match(workspace, /copy\.readOnly/);
  assert.match(page, /copy\.emptyModules/);
  assert.match(workspace, /copy\.emptyEntries/);
  assert.match(workspace, /copy\.confirmDeleteEntry/);
  assert.match(page, /canBuildCustomModules/);
  assert.match(workspace, /canManageCustomModuleEntries/);
  assert.match(workspace, /createCustomModuleEntry\(/);
  assert.match(workspace, /updateCustomModuleEntry\(/);
  assert.match(workspace, /deleteCustomModuleEntry\(/);
});

test("unit creator page permission mirrors company-admin builder access", () => {
  const roles = read("src/utils/roles.js");
  assert.match(roles, /"admin-unit-creator": null/);
  assert.equal(canAccessAdminPage({ role: "company_admin" }, "admin-unit-creator"), true);
  assert.equal(canAccessAdminPage({ role: "admin" }, "admin-unit-creator"), true);
  assert.equal(canAccessAdminPage({ role: "manager" }, "admin-unit-creator"), false);
  assert.equal(
    canAccessAdminPage(
      { role: "employee", permissions: ["product_settings.manage", "custom_modules.units.manage"] },
      "admin-unit-creator",
    ),
    false,
  );
  assert.equal(
    canAccessAdminPage(
      { role: "super_admin", isCompanyScope: true, activeCompany: { id: "c1" } },
      "admin-unit-creator",
    ),
    true,
  );
  assert.equal(canAccessAdminPage({ role: "super_admin" }, "admin-unit-creator"), false);
});

test("custom module helpers validate modules and permissions", () => {
  const module = {
    key: "units",
    label: "Units",
    enabled: true,
    permissions: { view: ["custom_modules.units.view"], manage: ["custom_modules.units.manage"] },
    fieldsSchema: [{ key: "unit_name", label: "Unit name", type: "text", required: true, options: [] }],
  };
  assert.equal(canBuildCustomModules({ role: "company_admin" }), true);
  assert.equal(canBuildCustomModules({ role: "employee", permissions: ["custom_modules.units.manage"] }), false);
  assert.equal(canViewCustomModule({ role: "employee", permissions: ["custom_modules.units.view"] }, module), true);
  assert.equal(canManageCustomModuleEntries({ role: "employee", permissions: ["custom_modules.units.view"] }, module), false);
  assert.equal(canManageCustomModuleEntries({ role: "employee", permissions: ["custom_modules.units.manage"] }, module), true);
  assert.equal(validateModuleDraft(module).valid, true);
  assert.equal(validateModuleDraft({ key: "bad", label: "", fieldsSchema: [] }).valid, false);
});
