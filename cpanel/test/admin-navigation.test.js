import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  companyDropshipSections,
  getNavigationItem,
  navigationContainsPage,
  placeholderPagePaths,
  platformNavigation,
  tenantNavigation,
  toggleExclusiveGroup,
  toggleExclusivePopover,
  velvetDropshipSection,
} from "../src/data/adminNavigation.js";
import { createTranslator } from "../src/data/translations.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import { resolvePage } from "../src/utils/cpanelAccess.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("main navigation groups expand exclusively and can collapse", () => {
  assert.equal(toggleExclusiveGroup(null, "catalog"), "catalog");
  assert.equal(toggleExclusiveGroup("catalog", "sales"), "sales");
  assert.equal(toggleExclusiveGroup("sales", "sales"), null);
});

test("top-bar popovers are mutually exclusive", () => {
  assert.equal(toggleExclusivePopover(null, "resources"), "resources");
  assert.equal(toggleExclusivePopover("resources", "notifications"), "notifications");
  assert.equal(toggleExclusivePopover("notifications", "notifications"), null);
});

test("placeholder routes are bilingual frontend-only destinations", () => {
  const tenantItem = getNavigationItem("admin-tenant-placeholder-ai-agents-personal-assistant");
  const platformItem = getNavigationItem("admin-platform-placeholder-mobile-apps");
  assert.equal(tenantItem.placeholder, true);
  assert.equal(platformItem.placeholder, true);
  assert.equal(placeholderPagePaths[tenantItem.pageKey], "/admin/coming-soon/ai-agents/personal-assistant");
  assert.equal(placeholderPagePaths[platformItem.pageKey], "/admin/platform/coming-soon/mobile-apps");
  assert.equal(createTranslator("en")("adminShell.underDevelopment"), "This page is under development");
  assert.equal(createTranslator("ar")("adminShell.underDevelopment"), "هذه الصفحة قيد التطوير");
});

test("placeholder role visibility preserves platform and tenant isolation", () => {
  assert.equal(canAccessAdminPage("super_admin", "admin-platform-placeholder-mobile-apps"), true);
  assert.equal(canAccessAdminPage("company_admin", "admin-platform-placeholder-mobile-apps"), false);
  assert.equal(canAccessAdminPage("company_admin", "admin-tenant-placeholder-ai-agents-personal-assistant"), true);
  assert.equal(canAccessAdminPage({ role: "employee", permissions: ["products.view"] }, "admin-tenant-placeholder-ai-agents-personal-assistant"), false);
});

test("placeholder routes resolve on direct refresh without crossing scopes", () => {
  assert.equal(
    resolvePage("/admin/coming-soon/ai-agents/personal-assistant", { role: "company_admin" }),
    "admin-tenant-placeholder-ai-agents-personal-assistant",
  );
  assert.equal(
    resolvePage("/admin/platform/coming-soon/mobile-apps", { role: "super_admin" }),
    "admin-platform-placeholder-mobile-apps",
  );
  assert.equal(
    resolvePage("/admin/platform/coming-soon/mobile-apps", { role: "company_admin" }),
    "admin",
  );
});

test("company dropshipping is one expandable sidebar group", () => {
  const group = tenantNavigation.find((item) => item.id === "tenant-company-dropship");
  assert.equal(group.label.en, "Dropshipping");
  assert.equal(group.label.ar, "الدروبشيبينغ");
  assert.ok(group.children);
  assert.deepEqual(group.children.map((child) => child.label.en), ["Merchants", "Catalog", "Orders", "Fulfillment", "Settlements"]);
  assert.deepEqual(group.children.map((child) => child.moduleKey), [
    "company_dropship.merchants",
    "company_dropship.catalog",
    "company_dropship.orders",
    "company_dropship.fulfillment",
    "company_dropship.settlements",
  ]);
  assert.deepEqual(group.children.map((child) => child.pageKey), companyDropshipSections.map((section) => section.pageKey));
  assert.deepEqual(group.children.map((child) => child.path), companyDropshipSections.map((section) => section.path));
  const companyAdmin = { role: "company_admin" };
  for (const section of companyDropshipSections) {
    assert.equal(resolvePage(section.path, companyAdmin), section.pageKey);
    assert.equal(velvetDropshipSection(section.pageKey), section.id);
    assert.equal(navigationContainsPage(group, section.pageKey), true);
  }
  assert.equal(velvetDropshipSection("admin-velvet-dropshipping"), "merchants");
  const layout = read("src/components/AdminLayout.jsx");
  assert.match(layout, /item\.moduleKey/);
  assert.match(layout, /!configuredPageKeys\.has\(item\.pageKey\)/);
});

test("active navigation recognizes nested destinations", () => {
  const catalog = tenantNavigation.find((item) => item.id === "tenant-catalog");
  const templates = platformNavigation.find((item) => item.id === "platform-templates");
  assert.equal(navigationContainsPage(catalog, "admin-products"), true);
  assert.equal(navigationContainsPage(catalog, "admin-orders"), false);
  assert.equal(navigationContainsPage(templates, "admin-platform-placeholder-templates-studio-editor"), true);
});

test("existing functional destinations remain in the centralized navigation", () => {
  for (const pageKey of [
    "admin",
    "admin-products",
    "admin-categories",
    "admin-brands",
    "admin-orders",
    "admin-customers",
    "admin-staff",
    "admin-settings",
    "admin-platform-companies",
    "admin-platform-domains",
  ]) {
    assert.ok(getNavigationItem(pageKey), `${pageKey} should remain navigable`);
  }
});

test("Coupons, Automatic Discounts, and SEO are real destinations, not placeholders", () => {
  for (const pageKey of ["admin-coupons", "admin-automatic-discounts", "admin-seo"]) {
    const item = getNavigationItem(pageKey);
    assert.ok(item, `${pageKey} should exist in navigation`);
    assert.equal(item.placeholder, undefined, `${pageKey} must not be a placeholder`);
    assert.ok(item.path, `${pageKey} should expose a real path`);
    assert.equal(placeholderPagePaths[pageKey], undefined, `${pageKey} must not be in placeholderPagePaths`);
  }
  assert.equal(getNavigationItem("admin-coupons").path, "/admin/coupons");
  assert.equal(getNavigationItem("admin-automatic-discounts").path, "/admin/automatic-discounts");
  assert.equal(getNavigationItem("admin-seo").path, "/admin/marketing/seo");
});

test("tenant shell uses the enlarged sidebar and real Quick Actions popover", () => {
  const layout = read("src/components/AdminLayout.jsx");
  const css = read("src/styles/global.css");
  assert.match(layout, /admin-sidebar-quick-actions/);
  assert.match(layout, /activePopover === "quickActions"/);
  assert.match(layout, /admin-quick-actions-popover/);
  assert.match(css, /--studio-sidebar-width:\s*255px/);
  assert.match(css, /\.admin-studio-shell \.admin-nav-button[\s\S]*?font-size:\s*14px/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.dashboard[\s\S]*?max-width:\s*none/);
  assert.match(css, /width:\s*min\(100%, 1500px\)/);
});

test("platform shell uses Dashboard dark sidebar; Sites workspace alone uses Studio light", () => {
  const shell = read("src/styles/dashboard-shell.css");
  const layout = read("src/components/AdminLayout.jsx");
  const css = read("src/styles/global.css");
  const cardCss = css.slice(css.indexOf("/* Super Admin Sites-style company cards */"));
  assert.match(shell, /Platform company management uses Wix Dashboard dark shell/);
  assert.match(shell, /\.admin-studio-shell\.admin-platform \.admin-sidebar[\s\S]*?--dashboard-bg-sidebar/);
  assert.match(shell, /\.admin-studio-shell\.admin-sites-workspace \.admin-sidebar[\s\S]*?--dashboard-bg-sidebar-studio/);
  assert.match(layout, /admin-sites-workspace/);
  assert.match(cardCss, /\.admin-platform \.company-cards-grid:not\(\.company-cards-list\)[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(cardCss, /\.admin-platform \.company-card-preview-img[\s\S]*?object-fit:\s*cover/);
});

test("Super Admin companies render responsive Sites-style cards", () => {
  const page = read("src/pages/AdminCompaniesPage.jsx");
  const css = read("src/styles/global.css");
  const cardCss = css.slice(css.indexOf("/* Super Admin Sites-style company cards */"));
  assert.match(page, /<article[\s\S]*?data-company-card/);
  assert.match(page, /company-card-preview[\s\S]*?company-card-footer/);
  assert.match(cardCss, /gap:\s*16px/);
  assert.match(cardCss, /\.admin-platform \.company-card-preview \{[\s\S]*?aspect-ratio:\s*1\.45 \/ 1/);
  assert.match(cardCss, /\.admin-platform \.company-card-footer \{[\s\S]*?height:\s*62px/);
  assert.match(cardCss, /\.admin-platform \.company-card-preview-img[\s\S]*?padding:\s*0;[\s\S]*?object-fit:\s*cover/);
  assert.match(cardCss, /@media \(max-width: 1680px\)[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(cardCss, /@media \(max-width: 1360px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(cardCss, /@media \(max-width: 980px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cardCss, /@media \(max-width: 640px\)[\s\S]*?grid-template-columns:\s*1fr/);
});

test("company card Manage and Open CPanel actions share the secure switch handler", () => {
  const page = read("src/pages/AdminCompaniesPage.jsx");
  assert.match(page, /async function manageCompany\(companyId\)[\s\S]*?guardedSwitchRef\.current\(companyId\)/);
  assert.match(page, /Building2[\s\S]*?cardLabels\.manageCompany/);
  assert.match(page, /LogIn[\s\S]*?cardLabels\.openCpanel/);
  assert.ok((page.match(/void manageCompany\(company\.id\)/g) || []).length >= 3);
});

test("company card action menu is isolated and closes outside or with Escape", () => {
  const page = read("src/pages/AdminCompaniesPage.jsx");
  assert.match(page, /event\.stopPropagation\(\)[\s\S]*?setMenuOpenId/);
  assert.match(page, /className="company-card-menu"[\s\S]*?event\.stopPropagation\(\)/);
  assert.match(page, /document\.addEventListener\("mousedown", handleClick\)/);
  assert.match(page, /e\.key === "Escape"[\s\S]*?setMenuOpenId\(null\)/);
});

test("company cards use a neutral initials placeholder when media is unavailable", () => {
  const page = read("src/pages/AdminCompaniesPage.jsx");
  const css = read("src/styles/global.css");
  const cardCss = css.slice(css.indexOf("/* Super Admin Sites-style company cards */"));
  assert.match(page, /data-company-placeholder/);
  assert.match(page, /companyInitials\(company\.name\)/);
  assert.match(page, /onError=\{\(\) => markCompanyMediaFailed\(company\.id\)\}/);
  assert.match(cardCss, /\.admin-platform \.company-card-preview-placeholder \{[\s\S]*?background:\s*#edf1f5/);
  assert.match(cardCss, /\.admin-platform \.company-card-preview-initials \{[\s\S]*?border-radius:\s*0;[\s\S]*?box-shadow:\s*none/);
});

test("storefront card actions render only when a storefront URL exists", () => {
  const page = read("src/pages/AdminCompaniesPage.jsx");
  assert.ok((page.match(/\{company\.storefrontUrl && \(/g) || []).length >= 2);
  assert.match(page, /href=\{company\.storefrontUrl\}[\s\S]*?target="_blank"/);
});

test("CPanel shell fixes the viewport and isolates sidebar and workspace scrolling", () => {
  const css = read("src/styles/global.css");
  assert.match(css, /\.admin-studio-shell \{[\s\S]*?position:\s*fixed;[\s\S]*?height:\s*100vh;[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.admin-studio-shell \.admin-sidebar,[\s\S]*?position:\s*fixed;[\s\S]*?height:\s*calc\(100vh - var\(--admin-topnav-h\)\);[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /\.admin-studio-shell \.admin-workspace \{[\s\S]*?position:\s*fixed;[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.admin-studio-shell \.admin-sidebar[\s\S]*?z-index:\s*1200/);
});

test("header renders anchored dropdowns and fixed right-side panels", () => {
  const layout = read("src/components/AdminLayout.jsx");
  const css = read("src/styles/global.css");
  assert.match(layout, /admin-topnav-menu-anchor[\s\S]*?active="resources"/);
  assert.match(layout, /admin-topnav-menu-anchor[\s\S]*?active="community"/);
  assert.match(layout, /admin-profile-anchor[\s\S]*?active="profile"/);
  assert.match(layout, /\["help", "inbox", "notifications", "news", "quickActions"\]\.includes\(activePopover\)/);
  assert.match(css, /\.admin-topnav-menu-anchor > \.admin-shell-dropdown \{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.admin-studio-shell \.admin-shell-panel \{[\s\S]*?position:\s*fixed;[\s\S]*?height:\s*calc\(100vh - var\(--admin-topnav-h\)\)/);
});

test("Escape and outside pointer interactions close the active popover", () => {
  const layout = read("src/components/AdminLayout.jsx");
  assert.match(layout, /event\.key !== "Escape"/);
  assert.match(layout, /setActivePopover\(null\)/);
  assert.match(layout, /!event\.target\.closest\("\[data-admin-popover-root\]"\)/);
  assert.match(layout, /document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(layout, /document\.addEventListener\("pointerdown", closeOutside\)/);
});
