import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getNavigationItem } from "../src/data/adminNavigation.js";
import { canonicalAdminPageKey, resolvePage } from "../src/utils/cpanelAccess.js";
import { moduleAllowsPage, normalizedModulePage } from "../src/utils/moduleRegistry.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  bookingSettingsPageKeys,
  filterSettingsSections,
  resolveTenantManagementPage,
  tenantManagementDirection,
  tenantManagementRoutes,
} from "../src/utils/tenantManagement.js";

const settingsModule = { enabled: true, route: "/admin/settings" };
const customersModule = { enabled: true, route: "/admin/customers" };
const modules = [settingsModule, customersModule];
const companyAdmin = { role: "company_admin", activeCompany: { id: "icare", modules } };
const scopedAdmin = { ...companyAdmin, globalRole: "super_admin", isCompanyScope: true };
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("all tenant management canonical routes resolve without platform fallback", () => {
  for (const [page, path] of Object.entries(tenantManagementRoutes)) {
    assert.equal(resolveTenantManagementPage(path), page);
    assert.equal(resolvePage(path, companyAdmin, modules), page);
    assert.notEqual(resolvePage(path, companyAdmin, modules), "admin-platform-companies");
  }
});

test("legacy Automations and settings routes canonicalize inside the tenant", () => {
  assert.equal(resolvePage("/admin/coming-soon/automations", companyAdmin, modules), "admin-automations");
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-automations"), "admin-automations");
  assert.equal(resolvePage("/admin/coming-soon/settings/receipts", companyAdmin, modules), "admin-settings-receipts");
});

test("scoped Super Admin retains the selected tenant on every new route", () => {
  for (const path of Object.values(tenantManagementRoutes)) {
    assert.equal(resolvePage(path, scopedAdmin, modules), resolveTenantManagementPage(path));
  }
});

test("recognized unauthorized management routes render No Access", () => {
  const employee = { role: "employee", permissions: ["products.view"], activeCompany: companyAdmin.activeCompany };
  assert.equal(resolvePage("/admin/settings/tax", employee, modules), "admin-no-access");
  assert.equal(resolvePage("/admin/automations", employee, modules), "admin-no-access");
});

test("settings and booking children reuse existing module boundaries", () => {
  for (const page of bookingSettingsPageKeys) {
    assert.equal(normalizedModulePage(page), "admin-settings");
    assert.equal(moduleAllowsPage(modules, page), true);
    assert.equal(canAccessAdminPage(companyAdmin, page), true);
  }
  assert.equal(normalizedModulePage("admin-automations"), "admin-customers");
  assert.equal(moduleAllowsPage(modules, "admin-automations"), true);
});

test("Automations is a real centralized tenant navigation item", () => {
  const item = getNavigationItem("admin-automations");
  assert.equal(item?.existing, true);
  assert.equal(item?.placeholder, undefined);
});

test("settings search filters titles and descriptions in both directions", () => {
  const sections = [{ title: { en: "Finance", ar: "المالية" }, rows: [
    { title: { en: "Tax", ar: "الضريبة" }, description: { en: "Locations", ar: "المواقع" } },
    { title: { en: "Shipping", ar: "الشحن" }, description: { en: "Regions", ar: "المناطق" } },
  ] }];
  assert.equal(filterSettingsSections(sections, "locations", "en")[0].rows[0].title.en, "Tax");
  assert.equal(filterSettingsSections(sections, "الشحن", "ar")[0].rows[0].title.en, "Shipping");
  assert.equal(tenantManagementDirection("ar"), "rtl");
  assert.equal(tenantManagementDirection("en"), "ltr");
});

test("Booking List and Analytics explicitly preserve company in the tenant shell", async () => {
  for (const file of ["AdminBookingListPage.jsx", "AdminBookingsAnalyticsPage.jsx"]) {
    const page = await read(`../src/pages/${file}`);
    assert.match(page, /BookingPageShell[\s\S]*?company=\{company\}/);
    assert.doesNotMatch(page, /admin-platform|window\.location/);
  }
});

test("settings pages use real company context and honest preview states", async () => {
  const page = await read("../src/pages/AdminSettingsPage.jsx");
  const dashboard = await read("../src/pages/AdminDashboardPage.jsx");
  const shared = await read("../src/pages/AdminManagementShared.jsx");
  assert.match(page, /companyDisplayName\(company/);
  assert.match(page, /companySetting\(company, "currency"\)/);
  assert.match(page, /className=\{activePage === "admin-settings" \? "tenant-settings-hub-page"/);
  assert.match(page, /ManagementShell[\s\S]*?company=\{company\}/);
  assert.match(page, /settings-hub-list/);
  assert.doesNotMatch(page, /settings-hub-grid/);
  assert.doesNotMatch(dashboard, /function SettingsPage|Save Company Settings|case "admin-settings"/);
  assert.match(shared, /disabled=\{disabled\}/);
  assert.match(page, /EXAMPLE PREVIEW/);
  assert.match(page, /Automated tax is not connected/);
  assert.match(page, /No shipping region configured/);
  assert.doesNotMatch(page, /\bTRY\b|Avalara|85 automations|free trial/);
});

test("Settings hub keeps the required vertical section and row order", async () => {
  const page = await read("../src/pages/AdminSettingsPage.jsx");
  const hub = page.slice(page.indexOf("export const settingsHubSections"), page.indexOf("function SettingsHub"));
  const labels = [
    "Finance & payments", "Accept payments", "Getting paid", "Receipts", "Tax",
    "Business solutions", "Checkout", "Shipping, delivery & fulfillment", "Booking settings", "Video settings", "Subscription settings",
    "Website and site management", "SEO settings", "Website settings", "Domains", "Manage plan", "Business email", "Website performance settings", "Site member settings", "Compliance, privacy & cookies",
    "General", "Roles & permissions", "Business info", "AI integrations", "Mobile app", "Language & region",
    "Communications & notifications", "Inbox settings", "Communication channels", "Notifications you get", "Notifications you send",
    "Development & integrations", "Custom code", "Headless settings", "Marketing integrations",
  ];
  let position = -1;
  for (const label of labels) {
    const next = hub.indexOf(`en: "${label}"`, position + 1);
    assert.ok(next > position, `${label} should follow the previous Settings entry`);
    position = next;
  }
});

test("Booking settings use only supplied employees and keep integrations inactive", async () => {
  const page = await read("../src/pages/AdminBookingSettingsPage.jsx");
  assert.match(page, /Array\.isArray\(employees\)/);
  assert.match(page, /employeeDisplayName/);
  assert.match(page, /Availability is not configured/);
  assert.match(page, /All options are not connected/);
  assert.match(page, /Connection is not verified/);
  assert.doesNotMatch(page, /9:00 AM|10:00 AM|active integration|successfully connected/i);
});

test("unsupported controls use the shared bilingual under-development flow", async () => {
  const shared = await read("../src/pages/AdminManagementShared.jsx");
  const app = await read("../src/CPanelApp.jsx");
  assert.match(shared, /AdminUnderDevelopmentContent/);
  assert.match(app, /AdminAutomationsPage/);
  assert.match(app, /AdminSettingsPage/);
  assert.match(app, /AdminBookingSettingsPage/);
  assert.match(app, /\.\.\.tenantManagementRoutes/);
});

test("management CSS is one narrowly scoped responsive RTL/LTR section", async () => {
  const css = await read("../src/styles/global.css");
  const marker = "/* Tenant management settings and automations */";
  const settingsMarker = "/* Tenant Settings hub — full-width vertical reference layout */";
  assert.equal(css.split(marker).length - 1, 1);
  assert.equal(css.split(settingsMarker).length - 1, 1);
  const section = css.slice(css.indexOf(marker));
  const settingsSection = css.slice(css.indexOf(settingsMarker), css.indexOf(".settings-two-column"));
  assert.match(section, /\.tenant-management-page/);
  assert.match(settingsSection, /\.settings-hub-list/);
  assert.match(settingsSection, /flex-direction: column/);
  assert.doesNotMatch(settingsSection, /grid-template-columns/);
  assert.doesNotMatch(section, /\.settings-hub-grid/);
  assert.match(section, /\.booking-settings-hub/);
  assert.match(section, /\[dir="rtl"\]/);
  assert.match(section, /@media \(max-width: 760px\)/);
});
