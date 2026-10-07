import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  canAccessAdminPage,
  isAdminPortalRole,
  landingPageForRole,
} from "../src/utils/roles.js";
import {
  landingPage,
  moduleAllowsPageForUser,
  resolvePage,
} from "../src/utils/cpanelAccess.js";

const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");

const company = { id: "tenant-a" };
const scopedSuperAdmin = {
  role: "company_admin",
  globalRole: "super_admin",
  isCompanyScope: true,
  activeCompany: company,
};
const companyAdmin = { role: "company_admin", activeCompany: company };
const employee = { role: "employee", permissions: ["products.view"], activeCompany: company };
const productsModule = [{ enabled: true, route: "/admin/products" }];
const tenantRoutes = [
  ["/admin/vlogs", "admin-vlogs"],
  ["/admin/vlogs/new", "admin-vlogs-new"],
  ["/admin/products", "admin-products"],
  ["/admin/brands", "admin-brands"],
  ["/admin/website-texts", "admin-website-texts"],
  ["/admin/website-media", "admin-website-media"],
];

function navigationSafePage(user, modules, requestedPage) {
  const routeRecognized = true;
  const roleAllowed = routeRecognized && canAccessAdminPage(user, requestedPage);
  const moduleAllowed = moduleAllowsPageForUser(user, modules, requestedPage);
  if (roleAllowed && moduleAllowed) return requestedPage;
  if (routeRecognized && isAdminPortalRole(user?.role)) return "admin-no-access";
  return landingPage(user, modules);
}

test("moduleAllowsPageForUser bypasses module gating only for scoped platform Super Admin", () => {
  const modulesWithoutVideos = [{ enabled: true, route: "/admin/products" }];

  assert.equal(moduleAllowsPageForUser(scopedSuperAdmin, modulesWithoutVideos, "admin-vlogs"), true);
  assert.equal(moduleAllowsPageForUser(companyAdmin, modulesWithoutVideos, "admin-vlogs"), false);
  assert.equal(moduleAllowsPageForUser(employee, modulesWithoutVideos, "admin-vlogs"), false);
  assert.equal(moduleAllowsPageForUser({ role: "super_admin" }, modulesWithoutVideos, "admin-vlogs"), false);
});

test("scoped Super Admin navigation does not redirect tenant routes to admin-no-access", () => {
  const modulesWithoutVideos = [{ enabled: true, route: "/admin/products" }];

  for (const [path, pageKey] of tenantRoutes) {
    assert.equal(
      navigationSafePage(scopedSuperAdmin, modulesWithoutVideos, pageKey),
      pageKey,
      `${path} must stay accessible for scoped Super Admin`,
    );
    assert.equal(
      resolvePage(path, scopedSuperAdmin, modulesWithoutVideos),
      pageKey,
      `${path} must resolve for scoped Super Admin`,
    );
  }
});

test("normal company_admin and employee route behavior remains unchanged", () => {
  const modulesWithoutVideos = [{ enabled: true, route: "/admin/products" }];

  assert.equal(navigationSafePage(companyAdmin, modulesWithoutVideos, "admin-vlogs"), "admin-no-access");
  assert.equal(navigationSafePage(companyAdmin, productsModule, "admin-products"), "admin-products");
  assert.equal(navigationSafePage(employee, productsModule, "admin-products"), "admin-products");
  assert.equal(navigationSafePage(employee, productsModule, "admin-vlogs"), "admin-no-access");
  assert.equal(landingPage(companyAdmin, productsModule), "admin");
  assert.equal(landingPageForRole("super_admin"), "admin-platform-companies");
});

test("CPanelApp navigate uses moduleAllowsPageForUser for tenant route guards", () => {
  assert.match(appSource, /moduleAllowsPageForUser\(authorizationUser, navigationModules, requestedPage\)/);
  assert.doesNotMatch(
    appSource,
    /moduleAllowsPage\(navigationModules, requestedPage\)/,
  );
});

test("CPanelApp reloads vlogs with moduleAllowsPageForUser and on vlogs page entry", () => {
  assert.match(appSource, /moduleAllowsPageForUser\(currentUser, modules, "admin-vlogs"\)/);
  assert.match(appSource, /\["admin-vlogs", "admin-vlogs-new"\]\.includes\(activePage\)/);
  assert.doesNotMatch(appSource, /moduleAllowsPage\(modules, "admin-vlogs"\)/);
});
