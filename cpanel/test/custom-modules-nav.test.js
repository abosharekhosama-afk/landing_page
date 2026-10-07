import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import test from "node:test";

import { resolvePage } from "../src/utils/cpanelAccess.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  canManageCustomModuleEntries,
  canViewCustomModule,
  customModuleNavItems,
  customModulePageKey,
  customModulePath,
  isCustomModulePage,
  isSupportedCustomFieldType,
  navVisibleCustomModules,
  parseCustomModuleKeyFromPage,
  parseCustomModuleKeyFromPath,
  validateEntryDraft,
} from "../src/utils/customModulesUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const sampleModules = [
  {
    id: "m1",
    key: "fleet_units",
    label: "Fleet units",
    icon: "folder",
    enabled: true,
    sidebarOrder: 10,
    permissions: {
      view: ["custom_modules.fleet_units.view"],
      manage: ["custom_modules.fleet_units.manage"],
    },
    fieldsSchema: [
      { key: "name", label: "Name", type: "text", required: true, showInList: true, options: [] },
      { key: "qty", label: "Qty", type: "number", required: false, showInList: true, options: [] },
    ],
  },
  {
    id: "m2",
    key: "archived_units",
    label: "Archived",
    enabled: false,
    sidebarOrder: 20,
    permissions: {
      view: ["custom_modules.archived_units.view"],
      manage: ["custom_modules.archived_units.manage"],
    },
    fieldsSchema: [{ key: "note", label: "Note", type: "text", required: false, options: [] }],
  },
  {
    id: "m3",
    key: "secret_units",
    label: "Secret",
    enabled: true,
    sidebarOrder: 5,
    permissions: {
      view: ["custom_modules.secret_units.view"],
      manage: ["custom_modules.secret_units.manage"],
    },
    fieldsSchema: [{ key: "code", label: "Code", type: "text", required: true, options: [] }],
  },
];

test("enabled module appears in nav; disabled and unauthorized do not", () => {
  const viewer = {
    role: "employee",
    permissions: ["custom_modules.fleet_units.view", "custom_modules.archived_units.view"],
  };
  const visible = navVisibleCustomModules(sampleModules, viewer);
  assert.deepEqual(visible.map((module) => module.key), ["fleet_units"]);
  const items = customModuleNavItems(sampleModules, viewer);
  assert.equal(items.length, 1);
  assert.equal(items[0].pageKey, customModulePageKey("fleet_units"));
  assert.equal(items[0].path, customModulePath("fleet_units"));
  assert.equal(items[0].label.en, "Fleet units");
  assert.equal(items[0].label.ar, "Fleet units");
});

test("manage permission implies accessible module in nav", () => {
  const manager = {
    role: "employee",
    permissions: ["custom_modules.secret_units.manage"],
  };
  assert.equal(canViewCustomModule(manager, sampleModules[2]), true);
  assert.equal(canManageCustomModuleEntries(manager, sampleModules[2]), true);
  const keys = navVisibleCustomModules(sampleModules, manager).map((module) => module.key);
  assert.deepEqual(keys, ["secret_units"]);
});

test("direct dynamic route resolves by module key", () => {
  const staff = { role: "employee", permissions: ["custom_modules.fleet_units.view"] };
  assert.equal(parseCustomModuleKeyFromPath("/admin/custom-modules/fleet_units"), "fleet_units");
  assert.equal(parseCustomModuleKeyFromPage(customModulePageKey("fleet_units")), "fleet_units");
  assert.equal(isCustomModulePage(customModulePageKey("fleet_units")), true);
  assert.equal(resolvePage("/admin/custom-modules/fleet_units", staff), customModulePageKey("fleet_units"));
  assert.equal(canAccessAdminPage(staff, customModulePageKey("fleet_units")), true);
});

test("invalid and unauthorized custom module paths", () => {
  const guest = { role: "customer" };
  assert.equal(parseCustomModuleKeyFromPath("/admin/custom-modules/"), "");
  assert.notEqual(resolvePage("/admin/custom-modules/fleet_units", guest), customModulePageKey("fleet_units"));
  assert.equal(canAccessAdminPage(guest, customModulePageKey("fleet_units")), false);
});

test("read-only view cannot manage entries; schema validation works", () => {
  const viewer = { role: "employee", permissions: ["custom_modules.fleet_units.view"] };
  const module = sampleModules[0];
  assert.equal(canManageCustomModuleEntries(viewer, module), false);
  assert.equal(validateEntryDraft({ name: "" }, module.fieldsSchema).valid, false);
  assert.equal(validateEntryDraft({ name: "Truck A", qty: "2" }, module.fieldsSchema).valid, true);
  assert.equal(isSupportedCustomFieldType("text"), true);
  assert.equal(isSupportedCustomFieldType("mystery"), false);
});

test("CPanel wires dynamic nav, route, workspace, and refresh", () => {
  const app = read("src/CPanelApp.jsx");
  const layout = read("src/components/AdminLayout.jsx");
  const page = read("src/pages/AdminCustomModulePage.jsx");
  const workspace = read("src/components/CustomModuleEntriesWorkspace.jsx");
  const access = read("src/utils/cpanelAccess.js");
  const unit = read("src/pages/AdminUnitCreatorPage.jsx");

  assert.match(app, /fetchCustomModules/);
  assert.match(app, /customModules/);
  assert.match(app, /refreshCustomModules/);
  assert.match(app, /AdminCustomModulePage/);
  assert.match(app, /isCustomModulePage\(activePage\)/);
  assert.match(layout, /customModuleNavItems/);
  assert.match(layout, /tenant-custom-modules/);
  assert.match(layout, /Custom modules/);
  assert.match(access, /parseCustomModuleKeyFromPath/);
  assert.match(access, /customModulePageKey/);
  assert.match(page, /fetchCustomModule/);
  assert.match(page, /copy\.forbidden/);
  assert.match(page, /copy\.notFound/);
  assert.match(page, /copy\.unavailable/);
  assert.match(page, /CustomModuleEntriesWorkspace/);
  assert.match(workspace, /EntryFormDialog/);
  assert.match(workspace, /readOnly/);
  assert.match(workspace, /createCustomModuleEntry/);
  assert.match(workspace, /updateCustomModuleEntry/);
  assert.match(workspace, /deleteCustomModuleEntry/);
  assert.match(unit, /onCustomModulesChange/);
  assert.match(unit, /customModulePath/);
  assert.doesNotMatch(app, /localStorage.*customModules/);
  assert.doesNotMatch(page, /localStorage/);
});

test("AdminLayout passes path for custom module navigation", () => {
  const layout = read("src/components/AdminLayout.jsx");
  assert.match(layout, /if \(item\?\.path\) onNavigate\(pageKey, \{ path: item\.path \}\)/);
});
