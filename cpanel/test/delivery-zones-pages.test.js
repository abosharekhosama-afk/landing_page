import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canUseDeliveryAction } from "../src/utils/roles.js";
import {
  defaultZoneCurrency,
  slugifyCityKey,
  zonePayloadFromDraft,
} from "../src/utils/deliveryZonesUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("delivery zones API client covers admin CRUD endpoints", () => {
  const api = read("src/utils/deliveryZonesApi.js");
  assert.match(api, /\/admin\/delivery-zones/);
  assert.match(api, /createDeliveryZone/);
  assert.match(api, /updateDeliveryZone/);
  assert.match(api, /deleteDeliveryZone/);
  assert.match(api, /fetchDeliveryZones/);
});

test("delivery workspace covers list, filters, dialog CRUD, and permission gates", () => {
  const workspace = read("src/components/DeliveryZonesWorkspace.jsx");
  const page = read("src/pages/AdminDeliveryPage.jsx");
  const app = read("src/CPanelApp.jsx");
  assert.match(workspace, /fetchDeliveryZones/);
  assert.match(workspace, /createDeliveryZone/);
  assert.match(workspace, /updateDeliveryZone/);
  assert.match(workspace, /deleteDeliveryZone/);
  assert.match(workspace, /canUseDeliveryAction/);
  assert.match(workspace, /statusFilter/);
  assert.match(workspace, /delivery-zones-dialog/);
  assert.match(workspace, /readOnly/);
  assert.match(workspace, /forbidden/);
  assert.match(workspace, /dir=\{ar \? "rtl" : "ltr"\}/);
  assert.match(page, /DeliveryZonesWorkspace/);
  assert.match(app, /activePage === "admin-delivery"/);
  assert.match(app, /AdminDeliveryPage/);
  assert.doesNotMatch(workspace, /localStorage|fake zone|mock delivery/i);
});

test("settings shipping embeds delivery workspace instead of unsupported shell", () => {
  const settings = read("src/pages/AdminSettingsPage.jsx");
  assert.match(settings, /admin-settings-shipping/);
  assert.match(settings, /DeliveryZonesWorkspace/);
  assert.match(settings, /compact/);
  assert.doesNotMatch(settings, /no shipping API is connected/i);
});

test("delivery page permissions use delivery.view and delivery.manage", () => {
  const roles = read("src/utils/roles.js");
  const permissions = read("src/data/permissions.js");
  assert.match(roles, /"admin-delivery": \["delivery\.view"\]/);
  assert.match(roles, /canUseDeliveryAction/);
  assert.match(permissions, /delivery\.view/);
  assert.match(permissions, /delivery\.manage/);
  assert.equal(canUseDeliveryAction({ role: "company_admin" }, "delivery.manage"), true);
  assert.equal(canUseDeliveryAction({ role: "employee", permissions: ["delivery.view"] }, "delivery.manage"), false);
  assert.equal(canUseDeliveryAction({ role: "employee", permissions: ["delivery.manage"] }, "delivery.manage"), true);
});

test("delivery zone helpers slugify keys and build API payloads safely", () => {
  assert.equal(slugifyCityKey("Ramallah City"), "ramallah-city");
  assert.equal(defaultZoneCurrency({ settings: { currency: "usd" } }), "USD");
  assert.deepEqual(zonePayloadFromDraft({
    city_name: "Nablus",
    city_key: "",
    region: "West Bank",
    delivery_price: "12.5",
    currency: "ils",
    enabled: true,
    display_order: "3",
  }), {
    city_name: "Nablus",
    city_key: "nablus",
    region: "West Bank",
    delivery_price: 12.5,
    currency: "ILS",
    enabled: true,
    display_order: 3,
  });
});

test("delivery styles include mobile summary and dialog layout", () => {
  const css = read("src/styles/global.css");
  const section = css.slice(css.indexOf("/* Delivery zones workspace */"));
  assert.match(section, /\.delivery-zones-summary/);
  assert.match(section, /\.delivery-zones-dialog-backdrop/);
  assert.match(section, /@media \(max-width: 820px\)/);
  assert.match(section, /@media \(max-width: 620px\)/);
});

test("delivery zones table uses the shared admin-data-table system with sticky actions", () => {
  const workspace = read("src/components/DeliveryZonesWorkspace.jsx");
  assert.match(workspace, /className="admin-data-table-wrap"/);
  assert.match(workspace, /className="admin-data-table"/);
  assert.match(workspace, /className="admin-data-table-actions"/);
  assert.match(workspace, /admin-data-table-cell-clip/);
  assert.match(workspace, /aria-label=\{copy\.edit\}/);
  assert.match(workspace, /aria-label=\{copy\.delete\}/);
  assert.doesNotMatch(workspace, /delivery-zones-table-wrap/);
  assert.doesNotMatch(workspace, /className="delivery-zones-table"/);
});
