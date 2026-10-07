import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { placeholderPagePaths } from "../src/data/adminNavigation.js";
import { landingPage, moduleAllowsPageForUser, resolvePage } from "../src/utils/cpanelAccess.js";
import { moduleAllowsPage, pageKeyForModule } from "../src/utils/moduleRegistry.js";
import { analyticsPageKeys } from "../src/utils/analytics.js";
import { canAccessAdminPage, isAdminPortalRole } from "../src/utils/roles.js";

const registrySource = fs.readFileSync(
  new URL("../src/utils/moduleRegistry.js", import.meta.url),
  "utf8",
);
const accessSource = fs.readFileSync(
  new URL("../src/utils/cpanelAccess.js", import.meta.url),
  "utf8",
);

const growthRoutes = [
  ["/admin/banners", "admin-banners"],
  ["/admin/splash-ads", "admin-splash-ads"],
  ["/admin/sms", "admin-sms"],
  ["/admin/announcements", "admin-announcements"],
];

const mediaModules = [
  { route: "/admin/dashboard", enabled: true },
  { route: "/admin/products", enabled: true },
  { route: "/admin/orders", enabled: true },
  { route: "/admin/customers", enabled: true },
  { route: "/admin/reports", enabled: true },
  { route: "/admin/website-media", enabled: true },
  { route: "/admin/banners", enabled: true },
  { route: "/admin/splash-ads", enabled: true },
];
const company = { id: "velvet", modules: mediaModules };

const mediaAdsPermissions = [
  "dashboard.view",
  "products.view",
  "orders.view",
  "customers.view",
  "reports.view",
  "website_media.manage",
  "banners.view",
  "banners.manage",
  "splash_ads.view",
  "splash_ads.manage",
];
const mediaEmployee = {
  role: "employee",
  permissions: mediaAdsPermissions,
  activeCompany: company,
};

const intendedPages = [
  "admin",
  "admin-products",
  "admin-orders",
  "admin-customers",
  ...analyticsPageKeys,
  "admin-website-media",
  "admin-banners",
  "admin-splash-ads",
];

const forbiddenPages = [
  "admin-staff",
  "admin-security",
  "admin-settings",
  "admin-site-editor",
  "admin-sites",
  "admin-inventory",
  "admin-dropshipping",
  "admin-platform-companies",
  "admin-activity-log",
];

function navigationSafePage(user, modules, requestedPage) {
  const routeRecognized = true;
  const roleAllowed = routeRecognized && canAccessAdminPage(user, requestedPage);
  const moduleAllowed = moduleAllowsPageForUser(user, modules, requestedPage);
  if (roleAllowed && moduleAllowed) return requestedPage;
  return routeRecognized && isAdminPortalRole(user?.role)
    ? "admin-no-access"
    : landingPage(user, modules);
}

test("Growth modules map routes to real CPanel page keys", () => {
  for (const [route, pageKey] of growthRoutes) {
    assert.equal(pageKeyForModule({ route }), pageKey, route);
    assert.equal(
      moduleAllowsPage([{ route, enabled: true }], pageKey),
      true,
      `${pageKey} must be module-allowed when its module is enabled`,
    );
    assert.equal(
      moduleAllowsPage([{ route, enabled: false }], pageKey),
      false,
      `${pageKey} must stay blocked when its module is disabled`,
    );
    assert.equal(placeholderPagePaths[pageKey], undefined, `${pageKey} must not be a placeholder`);
  }
  assert.doesNotMatch(registrySource, /"admin-banners": "marketing\.banners"/);
  assert.doesNotMatch(registrySource, /"admin-splash-ads": "marketing\.splash_ads"/);
  assert.match(registrySource, /"\/admin\/banners": "admin-banners"/);
  assert.match(registrySource, /"\/admin\/splash-ads": "admin-splash-ads"/);
});

test("Media/Ads employee resolves Banners and Splash Ads URLs instead of falling back", () => {
  assert.equal(accessSource.includes('"admin-banners": "/admin/banners"'), true);
  assert.equal(accessSource.includes('"admin-splash-ads": "/admin/splash-ads"'), true);
  assert.equal(accessSource.includes('"admin-sms": "/admin/sms"'), true);
  assert.equal(accessSource.includes('"admin-announcements": "/admin/announcements"'), true);

  assert.equal(resolvePage("/admin/banners", mediaEmployee, mediaModules), "admin-banners");
  assert.equal(resolvePage("/admin/splash-ads", mediaEmployee, mediaModules), "admin-splash-ads");
});

test("Banners and Splash Ads navigate without collapsing into admin-no-access", () => {
  assert.equal(navigationSafePage(mediaEmployee, mediaModules, "admin-banners"), "admin-banners");
  assert.equal(
    navigationSafePage(mediaEmployee, mediaModules, "admin-splash-ads"),
    "admin-splash-ads",
  );

  const companyAdmin = { role: "company_admin", activeCompany: company };
  assert.equal(navigationSafePage(companyAdmin, mediaModules, "admin-banners"), "admin-banners");
  assert.equal(
    navigationSafePage(companyAdmin, mediaModules, "admin-splash-ads"),
    "admin-splash-ads",
  );

  const allowedByModule = !mediaModules.length || moduleAllowsPage(mediaModules, "admin-banners");
  assert.equal(allowedByModule, true, "guard module check must accept Banners after the fix");
});

test("Media/Ads permission profile opens exactly the intended pages", () => {
  for (const page of intendedPages) {
    assert.equal(canAccessAdminPage(mediaEmployee, page), true, `${page} must be allowed`);
    assert.equal(
      moduleAllowsPageForUser(mediaEmployee, mediaModules, page),
      true,
      `${page} must be allowed by the company modules`,
    );
  }
  assert.equal(canAccessAdminPage(mediaEmployee, "admin-analytics-behavior"), true);
  assert.match(
    registrySource,
    /"admin-analytics-behavior": "admin-reports"/,
    "Storefront funnel and Campaign performance live on Analytics Behavior",
  );
  for (const page of forbiddenPages) {
    const permissionAllowed = canAccessAdminPage(mediaEmployee, page);
    const moduleAllowed = moduleAllowsPageForUser(mediaEmployee, mediaModules, page);
    assert.equal(
      permissionAllowed && moduleAllowed,
      false,
      `${page} must stay denied by the permission and module gates`,
    );
    assert.notEqual(navigationSafePage(mediaEmployee, mediaModules, page), page);
  }
});

test("employee without media keys gets no Banners, Splash Ads, Media, or Analytics access", () => {
  const catalogOnly = {
    role: "employee",
    permissions: ["dashboard.view", "products.view"],
    activeCompany: company,
  };
  for (const page of [
    "admin-banners",
    "admin-splash-ads",
    "admin-website-media",
    ...analyticsPageKeys,
  ]) {
    assert.equal(canAccessAdminPage(catalogOnly, page), false, `${page} must not be granted`);
    assert.notEqual(navigationSafePage(catalogOnly, mediaModules, page), page);
  }
  assert.notEqual(resolvePage("/admin/banners", catalogOnly, mediaModules), "admin-banners");
  assert.equal(
    resolvePage("/admin/banners", catalogOnly, mediaModules),
    landingPage(catalogOnly, mediaModules),
  );
});
