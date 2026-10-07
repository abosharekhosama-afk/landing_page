import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { navigationContainsPage, tenantNavigation } from "../src/data/adminNavigation.js";
import { canonicalAdminPageKey, resolvePage } from "../src/utils/cpanelAccess.js";
import { moduleAllowsPage } from "../src/utils/moduleRegistry.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  canonicalDeveloperToolsPageKey,
  developerToolsDirection,
  developerToolsRoutes,
  getCompanyStorefrontUrl,
  resolveDeveloperToolsPage,
} from "../src/utils/developerTools.js";

const settingsModule = { enabled: true, route: "/admin/settings" };
const modules = [settingsModule];
const company = { id: "icare", domain: "igroup.website/icare", modules };
const companyAdmin = { activeCompany: company, role: "company_admin" };
const manager = { activeCompany: company, role: "manager" };
const scopedAdmin = { ...companyAdmin, globalRole: "super_admin", isCompanyScope: true };
const employee = { activeCompany: company, permissions: [], role: "employee" };
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Developer Tools exposes all five canonical tenant routes", () => {
  assert.deepEqual(developerToolsRoutes, {
    "admin-developer-site-logs": "/admin/developer-tools/logging-tools/wix-logs",
    "admin-developer-advanced-log-tools": "/admin/developer-tools/logging-tools/advanced-log-tools",
    "admin-developer-monitoring": "/admin/developer-tools/monitoring",
    "admin-developer-secrets-manager": "/admin/developer-tools/secrets-manager",
    "admin-developer-triggered-emails": "/admin/developer-tools/triggered-emails",
  });
  for (const [page, path] of Object.entries(developerToolsRoutes)) {
    assert.equal(resolveDeveloperToolsPage(path), page);
    assert.equal(resolvePage(path, companyAdmin, modules), page);
    assert.equal(resolvePage(path, manager, modules), page);
    assert.equal(resolvePage(path, scopedAdmin, modules), page);
  }
});

test("Developer Tools aliases canonicalize to the nested routes", () => {
  const aliases = {
    "/admin/developer-tools": "admin-developer-site-logs",
    "/admin/developer-tools/logging-tools": "admin-developer-site-logs",
    "/admin/developer-tools/wix-logs": "admin-developer-site-logs",
    "/admin/developer-tools/advanced-log-tools": "admin-developer-advanced-log-tools",
  };
  for (const [path, page] of Object.entries(aliases)) {
    assert.equal(resolveDeveloperToolsPage(path), page);
    assert.equal(resolvePage(path, companyAdmin, modules), page);
  }
  assert.equal(canonicalDeveloperToolsPageKey("admin-developer-tools"), "admin-developer-site-logs");
  assert.equal(canonicalAdminPageKey("admin-developer-wix-logs"), "admin-developer-site-logs");
});

test("sidebar has Developer Tools, nested Logging Tools, and all requested children", () => {
  const developer = tenantNavigation.find((item) => item.id === "tenant-developer-tools");
  const logging = developer.children.find((item) => item.id === "tenant-logging-tools");
  assert.deepEqual(logging.children.map((item) => item.pageKey), [
    "admin-developer-site-logs",
    "admin-developer-advanced-log-tools",
  ]);
  assert.deepEqual(developer.children.slice(1).map((item) => item.pageKey), [
    "admin-developer-monitoring",
    "admin-developer-secrets-manager",
    "admin-developer-triggered-emails",
  ]);
  assert.equal(navigationContainsPage(developer, "admin-developer-site-logs"), true);
  assert.equal(navigationContainsPage(logging, "admin-developer-advanced-log-tools"), true);
});

test("nested routes keep both parent navigation branches active", async () => {
  const layout = await read("../src/components/AdminLayout.jsx");
  assert.match(layout, /const branchActive = navigationContainsPage\(item, activeKey\)/);
  assert.match(layout, /const open = level === 0 \? openMain === item\.id : Boolean\(openNested\[item\.id\] \|\| branchActive\)/);
  assert.match(layout, /setOpenMain\(activeMain\)/);
});

test("Developer Tools reuses Settings module and access rules", () => {
  for (const [page, path] of Object.entries(developerToolsRoutes)) {
    assert.equal(moduleAllowsPage(modules, page), true);
    assert.equal(canAccessAdminPage(companyAdmin, page), true);
    assert.equal(canAccessAdminPage(manager, page), true);
    assert.equal(canAccessAdminPage(employee, page), false);
    assert.equal(resolvePage(path, employee, modules), "admin-no-access");
  }
});

test("CPanel central router owns direct refresh and browser history handling", async () => {
  const app = await read("../src/CPanelApp.jsx");
  assert.match(app, /\.\.\.developerToolsRoutes/);
  assert.match(app, /developerToolsPageKeys\.includes\(activePage\)/);
  assert.match(app, /window\.addEventListener\("popstate"/);
  assert.match(app, /window\.history\[options\.replace \? "replaceState" : "pushState"\]/);
  for (const component of ["AdminSiteLogsPage", "AdminAdvancedLogToolsPage", "AdminMonitoringPage", "AdminSecretsManagerPage", "AdminTriggeredEmailsPage"]) {
    assert.match(app, new RegExp(`<${component} activePage=\\{activePage\\} \\{\\.\\.\\.sharedLayoutProps\\}`));
  }
});

test("every Developer Tools page forwards the active company into the tenant shell", async () => {
  const shared = await read("../src/pages/AdminDeveloperToolsShared.jsx");
  assert.match(shared, /ManagementShell activePage=\{activePage\}[\s\S]*?company=\{company\}/);
  for (const file of ["AdminSiteLogsPage.jsx", "AdminAdvancedLogToolsPage.jsx", "AdminMonitoringPage.jsx", "AdminSecretsManagerPage.jsx", "AdminTriggeredEmailsPage.jsx"]) {
    const page = await read(`../src/pages/${file}`);
    assert.match(page, /DeveloperToolsPage activePage=\{activePage\} company=\{company\}/);
    assert.doesNotMatch(page, /admin-platform|Platform/);
  }
});

test("pages use distinct structures and honest unavailable states", async () => {
  const logs = await read("../src/pages/AdminSiteLogsPage.jsx");
  const advanced = await read("../src/pages/AdminAdvancedLogToolsPage.jsx");
  const monitoring = await read("../src/pages/AdminMonitoringPage.jsx");
  const secrets = await read("../src/pages/AdminSecretsManagerPage.jsx");
  const emails = await read("../src/pages/AdminTriggeredEmailsPage.jsx");
  assert.match(logs, /developer-logs-toolbar[\s\S]*?developer-logs-stage/);
  assert.match(advanced, /Cloud logging integration[\s\S]*?Third-party logging endpoint/);
  assert.match(monitoring, /Data Requests[\s\S]*?Backend Requests[\s\S]*?CMS Collection Storage/);
  assert.match(secrets, /Secure secret storage is not connected/);
  assert.match(emails, /developer-sender-banner[\s\S]*?developer-campaign-card/);
  const combined = [logs, advanced, monitoring, secrets, emails].join("\n");
  assert.doesNotMatch(combined, /apiRequest|fetch\(|localStorage|sessionStorage|SendGrid|Mailgun|SMTP|Google Cloud/);
  assert.doesNotMatch(combined, /10,?000|10 GB|1,?000 collections|demo log|fake metric/i);
});

test("unsupported actions share the bilingual unavailable dialog", async () => {
  const shared = await read("../src/pages/AdminDeveloperToolsShared.jsx");
  assert.match(shared, /UnsupportedDialog/);
  assert.match(shared, /setUnavailableOpen\(true\)/);
  for (const file of ["AdminSiteLogsPage.jsx", "AdminAdvancedLogToolsPage.jsx", "AdminMonitoringPage.jsx", "AdminSecretsManagerPage.jsx", "AdminTriggeredEmailsPage.jsx"]) {
    assert.match(await read(`../src/pages/${file}`), /showUnavailable/);
  }
});

test("storefront URL uses only real company configuration", () => {
  assert.equal(getCompanyStorefrontUrl(company), "https://igroup.website/icare");
  assert.equal(getCompanyStorefrontUrl({ id: "icare" }), "");
  assert.equal(getCompanyStorefrontUrl({ domain: "/icare" }), "");
});

test("Developer Tools styles are one scoped responsive logical section", async () => {
  const css = await read("../src/styles/global.css");
  const marker = "/* Tenant Developer Tools pages */";
  assert.equal(css.split(marker).length - 1, 1);
  const section = css.slice(css.indexOf(marker));
  assert.match(section, /\.developer-tools-page/);
  assert.match(section, /margin-inline|padding-inline|border-inline/);
  assert.match(section, /\[dir="rtl"\]/);
  assert.match(section, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(section, /margin-left|margin-right|padding-left|padding-right/);
  assert.equal(developerToolsDirection("ar"), "rtl");
  assert.equal(developerToolsDirection("en"), "ltr");
});

test("existing Settings and Website Content routes remain intact", () => {
  assert.equal(resolvePage("/admin/settings", companyAdmin, modules), "admin-settings");
  const websiteModules = [{ enabled: true, route: "/admin/website-texts" }];
  const websiteUser = { ...companyAdmin, activeCompany: { ...company, modules: websiteModules } };
  assert.equal(resolvePage("/admin/website-content/cms", websiteUser, websiteModules), "admin-website-content-cms");
  assert.equal(resolvePage("/admin/website-content/multilingual", websiteUser, websiteModules), "admin-website-content-multilingual");
});
