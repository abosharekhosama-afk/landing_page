import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { canAccessAdminPage } from "../src/utils/roles.js";
import { tenantNavigation } from "../src/data/adminNavigation.js";
import { permissionGroups } from "../src/data/permissions.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const company = { id: "icare", settings: {} };
const companyAdmin = { role: "company_admin", activeCompany: company };
const employeeNoPerms = { role: "employee", permissions: [], activeCompany: company };
const employeeSiteEditor = { role: "employee", permissions: ["site_editor.access"], activeCompany: company };
const employeeSitesManage = { role: "employee", permissions: ["sites.manage"], activeCompany: company };

test("sitesApi exposes /admin/sites, fetchSites, fetchSite, createSite", () => {
  const api = read("src/utils/sitesApi.js");
  assert.match(api, /\/admin\/sites/);
  assert.match(api, /fetchSites/);
  assert.match(api, /fetchSite/);
  assert.match(api, /createSite/);
});

test("AdminSitesPage uses fetchSites, createSite, sites.manage, emptyTitle, Edit Site, site-editor path", () => {
  const page = read("src/pages/AdminSitesPage.jsx");
  assert.match(page, /fetchSites/);
  assert.match(page, /createSite/);
  assert.match(page, /sites\.manage/);
  assert.match(page, /emptyTitle/);
  assert.match(page, /Edit Site/);
  assert.match(page, /\/admin\/site-editor\?siteId=/);
});

test("CPanelApp imports AdminSitesPage and routes admin-sites", () => {
  const app = read("src/CPanelApp.jsx");
  assert.match(app, /import AdminSitesPage/);
  assert.match(app, /activePage === "admin-sites"/);
  assert.match(app, /AdminSitesPage/);
});

test("adminNavigation has admin-sites under tenant-website-content", () => {
  const group = tenantNavigation.find((item) => item.id === "tenant-website-content");
  assert.ok(group, "tenant-website-content group must exist");
  const sitesEntry = group.children.find((item) => item.pageKey === "admin-sites");
  assert.ok(sitesEntry, "admin-sites must be a child of tenant-website-content");
  assert.equal(sitesEntry.existing, true);
  assert.match(sitesEntry.label?.en || "", /Sites/);
});

test("roles.js maps admin-sites to [sites.manage, site_editor.access]", () => {
  const roles = read("src/utils/roles.js");
  assert.match(roles, /"admin-sites": \["sites\.manage", "site_editor\.access"\]/);
});

test("permissions.js includes sites.manage in the storefront group", () => {
  const permissions = read("src/data/permissions.js");
  assert.match(permissions, /sites\.manage/);
  assert.match(permissions, /site_editor\.access/);
});

test("SiteEditorPage reads URLSearchParams for siteId", () => {
  const page = read("src/pages/SiteEditorPage.jsx");
  assert.match(page, /URLSearchParams/);
  assert.match(page, /siteId/);
});

test("siteEditorApi uses withSiteQuery and siteId= pattern", () => {
  const api = read("src/utils/siteEditorApi.js");
  assert.match(api, /withSiteQuery/);
  assert.match(api, /siteId=/);
});

test("sites pages contain no fake or demo site strings", () => {
  const page = read("src/pages/AdminSitesPage.jsx");
  assert.doesNotMatch(page, /demo|fake|mock site|sample site|test site|hardcoded/i);
  const api = read("src/utils/sitesApi.js");
  assert.doesNotMatch(api, /demo|fake|mock|localStorage|sessionStorage/);
});

test("canAccessAdminPage grants access based on role and permissions", () => {
  // company_admin can access admin-sites
  assert.equal(canAccessAdminPage(companyAdmin, "admin-sites"), true);

  // employee with no perms cannot access admin-sites
  assert.equal(canAccessAdminPage(employeeNoPerms, "admin-sites"), false);

  // employee with site_editor.access can access admin-sites
  assert.equal(canAccessAdminPage(employeeSiteEditor, "admin-sites"), true);

  // employee with sites.manage can access admin-sites
  assert.equal(canAccessAdminPage(employeeSitesManage, "admin-sites"), true);
});
