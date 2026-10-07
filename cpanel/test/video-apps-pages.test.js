import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  canManageVideoLibrary,
  canViewTenantApps,
  canViewVideoLibrary,
  enabledCompanyApps,
  isVideoAppsPage,
  normalizeVlogMediaType,
  videoAppsDirection,
  videoAppsPageKeys,
  vlogPreviewUrl,
} from "../src/utils/videoApps.js";
import { canAccessAdminPage, isScopedPlatformSuperAdmin } from "../src/utils/roles.js";
import { tenantNavigation } from "../src/data/adminNavigation.js";

const pageSource = fs.readFileSync(
  new URL("../src/pages/AdminVideoAppsPage.jsx", import.meta.url),
  "utf8",
);
const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");
const dashboardSource = fs.readFileSync(
  new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url),
  "utf8",
);
const cssSource = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const layoutSource = fs.readFileSync(
  new URL("../src/components/AdminLayout.jsx", import.meta.url),
  "utf8",
);

test("Video Library and Apps routes render through the dedicated tenant page", () => {
  assert.equal(videoAppsPageKeys.length, 5);
  assert.equal(isVideoAppsPage("admin-vlogs"), true);
  assert.equal(isVideoAppsPage("admin-tenant-placeholder-video-live-stream"), true);
  assert.equal(isVideoAppsPage("admin-tenant-placeholder-apps-market"), true);
  assert.equal(isVideoAppsPage("admin-products"), false);
  assert.match(appSource, /videoAppsPageKeys\.includes\(activePage\)[\s\S]*?<AdminVideoAppsPage/);
});

test("Video and Apps pages render one page heading without duplicating the shell heading", () => {
  assert.match(pageSource, /<AdminLayout[\s\S]*?hideHeader/);
  assert.match(pageSource, /function PageHeader/);
  assert.equal((pageSource.match(/data-video-apps-page-header/g) || []).length, 1);
});

test("Videos use API-backed tenant vlog management and creation flow", () => {
  assert.match(pageSource, /vlogs = \[\]/);
  assert.match(pageSource, /vlogHero/);
  assert.match(pageSource, /onDeleteVlog/);
  assert.match(pageSource, /onSaveVlogHero/);
  assert.match(pageSource, /onNavigate\("admin-vlogs-new"\)/);
  assert.match(pageSource, /vlogPreviewUrl\(/);
  assert.match(pageSource, /resolveApiAssetUrl/);
  assert.match(pageSource, /tenant-video-actions/);
  assert.match(pageSource, /onDeleteVlog\(video\.id\)/);
  assert.match(pageSource, /statusMessage/);
  assert.match(appSource, /from "\.\/utils\/vlogsApi\.js"/);
  assert.match(appSource, /fetchVlogs\(\)/);
  assert.match(appSource, /saveVlogHero\(/);
  assert.match(appSource, /statusMessage=\{adminMessage\}/);
  assert.match(dashboardSource, /case "admin-vlogs-new":[\s\S]*?renderEntityForm\("vlog"\)/);
  assert.match(dashboardSource, /onSaveVlog\?\./);
  assert.match(dashboardSource, /visibleWhen: \(form\) => form\?\.mediaType !== "image"/);
  assert.match(dashboardSource, /visibleWhen: \(form\) => form\?\.mediaType === "image"/);
});

test("vlog preview URLs prefer poster for video and image for post items", () => {
  assert.equal(normalizeVlogMediaType("post"), "image");
  assert.equal(
    vlogPreviewUrl({ mediaType: "video", posterUrl: "/uploads/poster.jpg", imageUrl: "/uploads/other.jpg" }),
    "/uploads/poster.jpg",
  );
  assert.equal(
    vlogPreviewUrl({ mediaType: "image", posterUrl: "/uploads/poster.jpg", imageUrl: "/uploads/post.jpg" }),
    "/uploads/post.jpg",
  );
  assert.equal(vlogPreviewUrl({ mediaType: "video", thumbnail: "/uploads/legacy.jpg" }), "/uploads/legacy.jpg");
  assert.equal(vlogPreviewUrl({ mediaType: "video" }), "");
});

test("authorized tenant admins and scoped Super Admins can view setup pages", () => {
  const company = { id: "icare" };
  assert.equal(canManageVideoLibrary({ role: "company_admin" }, company), true);
  assert.equal(canManageVideoLibrary({ role: "manager" }, company), true);
  assert.equal(canManageVideoLibrary({ role: "super_admin" }, company), true);
  assert.equal(canManageVideoLibrary({ role: "employee", permissions: [] }), false);
  assert.equal(canViewTenantApps({ role: "company_admin" }, company), true);
  assert.equal(canViewTenantApps({ role: "super_admin", activeCompany: company }), true);
  assert.equal(canViewTenantApps({ role: "super_admin" }), false);
  assert.equal(canViewTenantApps({ role: "employee", permissions: [] }, company), false);
  assert.match(
    pageSource,
    /const canView = isVideosPage[\s\S]*?: canViewTenantApps\(currentUser, company\)/,
  );
});

test("platform Super Admin Vlogs access recognizes scoped globalRole", () => {
  const company = { id: "tenant-a" };
  const scopedSuperAdmin = {
    role: "company_admin",
    globalRole: "super_admin",
    isCompanyScope: true,
    activeCompany: company,
  };
  const companyAdmin = { role: "company_admin", activeCompany: company };
  const employee = { role: "employee", permissions: [], activeCompany: company };
  const videosModule = [{ enabled: true, route: "/admin/vlogs" }];

  assert.equal(
    canViewVideoLibrary({ role: "super_admin", activeCompany: company }, [], company),
    true,
    "unscoped super_admin is allowed without module gating",
  );
  assert.equal(
    canViewVideoLibrary(scopedSuperAdmin, [], company),
    true,
    "scoped super_admin is allowed without module gating",
  );
  assert.equal(
    canViewVideoLibrary(companyAdmin, [], company),
    false,
    "company_admin remains denied when the videos module is missing",
  );
  assert.equal(
    canViewVideoLibrary(companyAdmin, videosModule, company),
    true,
    "company_admin remains allowed when the videos module is enabled",
  );
  assert.equal(
    canViewVideoLibrary(employee, videosModule, company),
    false,
    "employee remains denied for vlogs",
  );
  assert.equal(canManageVideoLibrary(scopedSuperAdmin, company), true);
  assert.equal(canAccessAdminPage(scopedSuperAdmin, "admin-vlogs-new"), true);
  assert.equal(isScopedPlatformSuperAdmin(scopedSuperAdmin), true);
  assert.equal(isScopedPlatformSuperAdmin(companyAdmin), false);
});

test("scoped Super Admin keeps Vlogs navigation visible when module gating would hide it", () => {
  const videoGroup = tenantNavigation.find((item) => item.id === "tenant-video");
  const vlogsItem = videoGroup?.children?.find((item) => item.pageKey === "admin-vlogs");
  assert.equal(vlogsItem?.requiresModule, true);
  assert.match(layoutSource, /isScopedPlatformSuperAdmin\(currentUser\)/);
});

test("Manage Apps groups only recognizable company-facing features", () => {
  const enabled = enabledCompanyApps([
    { enabled: true, module_key: "products", route: "/admin/products", label_en: "Products" },
    { enabled: true, module_key: "categories", route: "/admin/categories", label_en: "Categories" },
    { enabled: true, module_key: "reports", route: "/admin/reports", label_en: "Reports" },
    { enabled: true, module_key: "orders", route: "/admin/orders", label_en: "Orders" },
    { enabled: true, module_key: "custom", route: "/custom", label_en: "Custom" },
  ]);
  assert.deepEqual(
    enabled.map((item) => item.id),
    ["store-catalog", "analytics"],
  );
  assert.equal(enabled[0].pageKey, "admin-products");
  assert.equal(enabled[1].pageKey, "admin-reports");
  assert.equal(
    enabled.every((item) => item.status === "enabled"),
    true,
  );
  assert.equal(
    enabled.some((item) =>
      ["products", "categories", "orders", "reports", "custom"].includes(item.id),
    ),
    false,
  );
  assert.match(pageSource, /enabledCompanyApps\(modules\)/);
  assert.match(pageSource, /data-friendly-app-list/);
});

test("empty video/channel states never fabricate tenant records", () => {
  assert.match(pageSource, /videos[\s\S]*?\.filter[\s\S]*?rows\.map\(\(video\)/);
  assert.match(pageSource, /channels[\s\S]*?\.filter[\s\S]*?rows\.map\(\(channel\)/);
  assert.match(pageSource, /data-video-empty/);
  assert.match(pageSource, /data-channel-empty/);
  assert.match(pageSource, /Real company channels will appear here/);
});

test("App Market examples are discoverable but never installed or connected", () => {
  assert.match(pageSource, /const marketCategories/);
  assert.match(pageSource, /const marketExamples/);
  assert.match(pageSource, /No app is shown as installed or connected/);
  assert.match(pageSource, /data-market-examples-not-installed/);
  assert.match(pageSource, /Discoverable example/);
  assert.doesNotMatch(pageSource, />Installed</);
  assert.doesNotMatch(pageSource, />Connected</);
});

test("unsupported video and app actions reuse the bilingual under-development flow", () => {
  assert.match(pageSource, /AdminUnderDevelopmentContent/);
  assert.match(pageSource, /const unsupported = \(\) => setShowUnsupported\(true\)/);
  assert.match(pageSource, /aria-modal="true"/);
});

test("Video and Apps layouts support RTL, LTR, and responsive internal layouts", () => {
  assert.equal(videoAppsDirection("en"), "ltr");
  assert.equal(videoAppsDirection("ar"), "rtl");
  assert.match(pageSource, /dir=\{videoAppsDirection\(language\)\}/);
  const scoped = cssSource.slice(cssSource.indexOf("/* Tenant Video Library and Apps modules */"));
  assert.match(
    scoped,
    /\.app-market-shell \{[\s\S]*?grid-template-columns: 270px minmax\(0, 1fr\)/,
  );
  assert.match(scoped, /\.app-market-category:hover \.app-market-flyout/);
  assert.match(
    scoped,
    /@media \(max-width: 760px\)[\s\S]*?\.app-market-shell\s*\{[\s\S]*?display:\s*block/,
  );
  assert.match(scoped, /\[dir="rtl"\] \.video-apps-page-header/);
  assert.match(
    scoped,
    /\.live-stream-onboarding \.live-stream-options[\s\S]*?grid-template-columns: repeat\(2/,
  );
  assert.match(scoped, /\.channel-card-cover\s*\{[\s\S]*?aspect-ratio:\s*16 \/ 9/);
});
