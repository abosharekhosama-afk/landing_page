import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { isNavigationPlaceholderPage } from "../src/data/adminNavigation.js";
import { isCustomModulePage } from "../src/utils/customModulesUi.js";
import { landingPage, moduleAllowsPageForUser, resolvePage } from "../src/utils/cpanelAccess.js";
import { moduleAllowsPage } from "../src/utils/moduleRegistry.js";
import { canAccessAdminPage, isAdminPortalRole } from "../src/utils/roles.js";

const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");

const unhydratedCompany = { id: "tenant-a", modules: [] };
const hydratedCompany = {
  id: "tenant-a",
  modules: [
    { route: "/admin/products", enabled: true },
    { route: "/admin/orders", enabled: true },
  ],
};
const employee = {
  role: "employee",
  permissions: ["products.view", "orders.view"],
  activeCompany: unhydratedCompany,
};
const hydratedEmployee = { ...employee, activeCompany: hydratedCompany };
const employeeWithoutPermissions = {
  role: "employee",
  permissions: [],
  activeCompany: hydratedCompany,
};

function runGuardEffect({ activePage, currentUser, company, modules }) {
  if (!company || !currentUser || activePage === "admin-login") return activePage;
  if (currentUser.role === "manager") return activePage;
  if (["company_admin", "admin"].includes(currentUser.role)) return activePage;
  if (isCustomModulePage(activePage)) return activePage;
  if (activePage === "admin-no-access") {
    const recoveryPage = landingPage(currentUser, modules);
    const recoveryAllowedByModule =
      !modules.length ||
      isNavigationPlaceholderPage(recoveryPage) ||
      moduleAllowsPage(modules, recoveryPage);
    const recoveryAllowedByPermission = canAccessAdminPage(currentUser, recoveryPage);
    if (
      recoveryPage !== "admin-no-access" &&
      recoveryAllowedByModule &&
      recoveryAllowedByPermission
    ) {
      return recoveryPage;
    }
  }
  const allowedByModule =
    !modules.length ||
    isNavigationPlaceholderPage(activePage) ||
    moduleAllowsPage(modules, activePage);
  const allowedByPermission = canAccessAdminPage(currentUser, activePage);
  if (!allowedByModule || !allowedByPermission) return "admin-no-access";
  return activePage;
}

function navigateSafePage({ user, company, modules, requestedPage }) {
  const routeRecognized = true;
  const roleAllowed = routeRecognized && canAccessAdminPage(user, requestedPage);
  const moduleAllowed =
    !modules.length ||
    !company ||
    requestedPage === "admin-platform-companies" ||
    requestedPage === "admin-platform-domains" ||
    requestedPage === "admin-login" ||
    isNavigationPlaceholderPage(requestedPage) ||
    moduleAllowsPageForUser(user, modules, requestedPage);
  if (roleAllowed && moduleAllowed) return requestedPage;
  return routeRecognized && isAdminPortalRole(user?.role)
    ? "admin-no-access"
    : landingPage(user, modules);
}

function settle({ currentUser, company, modules, initialPage, maxSteps = 25 }) {
  let activePage = initialPage;
  const history = [];
  const visited = new Set();
  for (let step = 0; step < maxSteps; step += 1) {
    if (visited.has(activePage)) {
      return { activePage, history, looped: true };
    }
    visited.add(activePage);
    history.push(activePage);
    const target = runGuardEffect({ activePage, currentUser, company, modules });
    const next =
      target === activePage
        ? activePage
        : navigateSafePage({ user: currentUser, company, modules, requestedPage: target });
    if (next === activePage) return { activePage, history, looped: false };
    activePage = next;
  }
  return { activePage, history, looped: true };
}

test("CPanelApp guard recovers from admin-no-access with a replace navigation", () => {
  const guardIndex = appSource.indexOf("if (isCustomModulePage(activePage)) return;");
  const recoveryIndex = appSource.indexOf(
    "const recoveryPage = landingPage(currentUser, modules);",
  );
  const guardEndIndex = appSource.indexOf("const allowedByModule =", recoveryIndex);

  assert.notEqual(guardIndex, -1, "employee/admin access guard effect not found");
  assert.ok(
    recoveryIndex > guardIndex,
    "recovery must live inside the employee/admin access guard effect",
  );
  assert.ok(
    guardEndIndex > recoveryIndex,
    "recovery must run before the existing no-access guard checks",
  );
  assert.match(appSource, /recoveryPage !== "admin-no-access" &&/);
  assert.match(appSource, /canAccessAdminPage\(currentUser, recoveryPage\)/);
  assert.match(appSource, /moduleAllowsPage\(modules, recoveryPage\)/);
  assert.match(appSource, /navigate\(recoveryPage, \{ replace: true \}\)/);
});

test("employee initially resolves to admin-no-access with empty/unhydrated modules", () => {
  assert.equal(resolvePage("/admin/dashboard", employee), "admin-no-access");
  assert.equal(resolvePage("/admin/dashboard", employee, []), "admin-no-access");
  assert.equal(landingPage(employee, []), "admin-no-access");

  const result = settle({
    currentUser: employee,
    company: unhydratedCompany,
    modules: unhydratedCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(result.looped, false);
  assert.equal(result.activePage, "admin-no-access");
  assert.deepEqual(result.history, ["admin-no-access"]);
});

test("after modules hydrate the app transitions to an accessible page", () => {
  assert.equal(
    landingPage(hydratedEmployee, hydratedCompany.modules),
    "admin-products",
    "hydration must produce a real landing page",
  );

  const result = settle({
    currentUser: hydratedEmployee,
    company: hydratedCompany,
    modules: hydratedCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(result.looped, false);
  assert.deepEqual(result.history, ["admin-no-access", "admin-products"]);
  assert.equal(result.activePage, "admin-products");

  const staffResult = settle({
    currentUser: { ...hydratedEmployee, role: "staff" },
    company: hydratedCompany,
    modules: hydratedCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(staffResult.looped, false);
  assert.equal(staffResult.activePage, "admin-products");
});

test("employee with genuinely no accessible page stays on admin-no-access", () => {
  assert.equal(landingPage(employeeWithoutPermissions, hydratedCompany.modules), "admin-no-access");

  const result = settle({
    currentUser: employeeWithoutPermissions,
    company: hydratedCompany,
    modules: hydratedCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(result.looped, false);
  assert.deepEqual(result.history, ["admin-no-access"]);
  assert.equal(result.activePage, "admin-no-access");
});

test("no redirect loop across hydration, disabled modules, and platform admin", () => {
  const hydrated = settle({
    currentUser: hydratedEmployee,
    company: hydratedCompany,
    modules: hydratedCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(hydrated.looped, false);
  assert.equal(new Set(hydrated.history).size, hydrated.history.length);

  const rehydrated = settle({
    currentUser: hydratedEmployee,
    company: hydratedCompany,
    modules: hydratedCompany.modules,
    initialPage: hydrated.activePage,
  });
  assert.equal(rehydrated.looped, false);
  assert.equal(rehydrated.activePage, "admin-products");

  const disabledModuleCompany = {
    id: "tenant-a",
    modules: [{ route: "/admin/products", enabled: false }],
  };
  const disabledResult = settle({
    currentUser: { ...employee, activeCompany: disabledModuleCompany },
    company: disabledModuleCompany,
    modules: disabledModuleCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(disabledResult.looped, false);
  assert.deepEqual(disabledResult.history, ["admin-no-access"]);

  const platformAdmin = { role: "super_admin", activeCompany: hydratedCompany };
  const platformResult = settle({
    currentUser: platformAdmin,
    company: hydratedCompany,
    modules: hydratedCompany.modules,
    initialPage: "admin-no-access",
  });
  assert.equal(platformResult.looped, false);
  assert.deepEqual(platformResult.history, ["admin-no-access"]);
});
