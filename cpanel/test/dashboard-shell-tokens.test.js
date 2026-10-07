import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getNavigationItem, navigationContainsPage, tenantNavigation } from "../src/data/adminNavigation.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("dashboard-shell.css carries the Wix Dashboard design tokens", () => {
  const css = read("src/styles/dashboard-shell.css");
  for (const token of [
    "--dashboard-sidebar-width: 255px",
    "#131720",
    "#F0F4F7",
    "#116DFF",
    "#000624",
    "--dashboard-studio-sidebar-width: 228px",
    "#A8CAFF",
    "--dashboard-card-radius: 8px",
    "--dashboard-shadow-card: none",
    "--dashboard-input-height: 30px",
    "--dashboard-search-radius: 15px",
    "--dashboard-nav-selected: #42454C",
    "--dashboard-text-muted: #CFD0D2",
  ]) {
    assert.ok(css.includes(token), `dashboard-shell.css should contain ${token}`);
  }
});

test("CPanel index does not load Be Vietnam Pro", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /Be\+Vietnam|Be Vietnam/i);
  assert.match(html, /family=Inter/);
  assert.match(html, /family=Tajawal/);
  assert.match(html, /IBM\+Plex\+Sans\+Arabic/);
});

test("selected nav keeps Wix muted label color and search shell matches CDP", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(
    css,
    /\.admin-studio-shell \.admin-nav-button\.active[\s\S]*?color:\s*var\(--dashboard-text-muted\)/,
  );
  assert.match(
    css,
    /\.admin-studio-shell \.admin-global-search[\s\S]*?border-radius:\s*var\(--dashboard-search-radius\)/,
  );
  assert.match(
    css,
    /\.admin-studio-shell \.admin-global-search[\s\S]*?background:\s*#1F222B/,
  );
});

test("platform Companies uses Dashboard dark shell; Sites page alone uses Studio light", () => {
  const css = read("src/styles/dashboard-shell.css");
  const layout = read("src/components/AdminLayout.jsx");
  assert.match(css, /Platform company management uses Wix Dashboard dark shell/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.admin-sidebar[\s\S]*?--dashboard-bg-sidebar/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.company-card[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.admin-sidebar[\s\S]*?--dashboard-bg-sidebar-studio/);
  assert.match(layout, /admin-sites-workspace/);
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \{\s*--studio-sidebar-width: var\(--dashboard-sidebar-width\);/,
  );
});

test("admin shell kills Be Vietnam Pro on body and all descendants", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /body:has\(\.admin-studio-shell\)/);
  assert.match(css, /\.admin-studio-shell \*:not\(code\)/);
  const fontFamilyDecls = [...css.matchAll(/font-family\s*:[^;]+;/gi)].map((m) => m[0]);
  assert.ok(fontFamilyDecls.length > 0, "expected font-family declarations");
  for (const decl of fontFamilyDecls) {
    assert.doesNotMatch(decl, /Be Vietnam/i, `font-family must not include Be Vietnam: ${decl}`);
  }
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-search-field[\s\S]*?--dashboard-search-radius/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-search-field[\s\S]*?#1F222B/,
  );
});

test("memberships detail uses Dashboard tokens under admin-platform", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-panel[\s\S]*?padding:\s*24px/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-panel[\s\S]*?margin-top:\s*24px/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-head h2[\s\S]*?font-size:\s*20px/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-head p[\s\S]*?var\(--dashboard-text-secondary\)/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-selector select[\s\S]*?--dashboard-input-height/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-selector select[\s\S]*?--dashboard-control-radius-compact/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-member-create-form input[\s\S]*?--dashboard-input-height/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-member-create-form \.admin-primary-button[\s\S]*?--dashboard-button-height/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-member-create-form \.admin-primary-button[\s\S]*?--dashboard-accent/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-member-edit-form[\s\S]*?--dashboard-card-radius/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-panel \.admin-data-table th[\s\S]*?#F7F8F8/,
  );
  assert.match(
    css,
    /\.admin-studio-shell\.admin-platform \.company-memberships-panel \.admin-data-table th[\s\S]*?--dashboard-font-family/,
  );
  assert.match(
    css,
    /\.admin-studio-shell \.admin-status-pill[\s\S]*?--dashboard-font-family/,
  );
});

test("Sites workspace content uses Studio card grid tokens", () => {
  const css = read("src/styles/dashboard-shell.css");
  const page = read("src/pages/AdminSitesPage.jsx");
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-cards-grid[\s\S]*?minmax\(246px, 1fr\)/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-cards-grid[\s\S]*?gap:\s*24px/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card[\s\S]*?--dashboard-shadow-card/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card-thumb[\s\S]*?height:\s*138\.375px/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card-thumb[\s\S]*?max-height:\s*138\.375px/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-card-edit[\s\S]*?height:\s*24px/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-create-submit[\s\S]*?--dashboard-button-height/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-create-submit[\s\S]*?--dashboard-accent/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-status[\s\S]*?font-size:\s*12px/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-status[\s\S]*?font-weight:\s*500/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.sites-cards-grid[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(css, /\.admin-studio-shell\.admin-sites-workspace \.sites-create-submit[\s\S]*?justify-self:\s*start/);
  assert.match(page, /sites-cards-grid/);
  assert.match(page, /sites-card-thumb/);
  assert.match(page, /sites-card-footer/);
  assert.match(page, /sites-card-actions/);
  assert.match(page, /sites-card-edit/);
});

test("shared bilingual admin data table tokens exist in dashboard-shell.css", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-data-table-wrap \{[\s\S]*?overflow:\s*auto/);
  assert.match(css, /\.admin-data-table \{[\s\S]*?min-width:\s*720px/);
  assert.match(css, /\.admin-data-table-actions \{[\s\S]*?position:\s*sticky/);
  assert.match(css, /\[dir=rtl\] \.admin-data-table-actions/);
  assert.match(css, /\.admin-data-table-cell-clip \{[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.admin-data-table \{ min-width: 480px; \}/);
});

test("platform Overview uses Dashboard tokens under admin-platform", () => {
  const css = read("src/styles/dashboard-shell.css");
  const page = read("src/pages/AdminPlatformOverview.jsx");
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-overview \{[\s\S]*?gap:\s*24px/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-metrics \{[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-metric-card \{[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-metric-card \{[\s\S]*?box-shadow:\s*none/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-metric-icon \{[\s\S]*?--dashboard-accent/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-recent-item[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-recent-item:hover[\s\S]*?#F0F4F7/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-recent-logo[\s\S]*?border-radius:\s*var\(--dashboard-card-radius\)/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-quick-action \{[\s\S]*?--dashboard-button-height/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-quick-action \{[\s\S]*?--dashboard-accent/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.platform-metrics \{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(page, /platform-recent-logo/);
  assert.match(page, /platform-overview-loading/);
  assert.match(page, /e\.key === "Enter" \|\| e\.key === " "/);
  assert.match(page, /accessDeniedTitle/);
});

test("platform Domains page uses the shared admin-data-table system", () => {
  const page = read("src/pages/AdminDomainsPage.jsx");
  assert.match(page, /admin-data-table-wrap/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table-actions/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.match(page, /aria-label=\{`\$\{labels\.edit\}/);
  assert.match(page, /aria-label=\{`\$\{labels\.delete\}/);
  assert.match(page, /admin-data-loading/);
  assert.match(page, /admin-data-empty/);
  assert.doesNotMatch(page, /admin-table-wrap/);
  assert.doesNotMatch(page, /className="admin-table"/);
});

test("dashboard-shell.css is imported only from CPanelApp, never the storefront", () => {
  const app = read("src/CPanelApp.jsx");
  const storefront = read("src/App.jsx");
  assert.match(app, /import "\.\/styles\/dashboard-shell\.css";/);
  assert.doesNotMatch(storefront, /dashboard-shell\.css/);
});

test("Delivery is a real tenant navigation destination", () => {
  const delivery = getNavigationItem("admin-delivery");
  assert.ok(delivery, "admin-delivery should exist in navigation");
  assert.equal(delivery.pageKey, "admin-delivery");
  assert.equal(delivery.icon, "truck");
});

test("Tenant Sites is a real navigation destination, not a placeholder", () => {
  const sites = getNavigationItem("admin-sites");
  assert.ok(sites, "admin-sites should exist in navigation");
  assert.equal(sites.placeholder, undefined);
  assert.equal(sites.pageKey, "admin-sites");
});

test("Orders live under Sales, not under the Store catalog", () => {
  const catalog = tenantNavigation.find((item) => item.id === "tenant-catalog");
  assert.ok(catalog);
  assert.equal(navigationContainsPage(catalog, "admin-orders"), false);
  const sales = tenantNavigation.find((item) => item.id === "tenant-sales");
  assert.ok(sales);
  assert.equal(navigationContainsPage(sales, "admin-orders"), true);
});

test("Analytics nests under the Growth group", () => {
  const growth = tenantNavigation.find((item) => item.id === "tenant-growth");
  assert.ok(growth, "tenant-growth should exist");
  assert.equal(navigationContainsPage(growth, "admin-analytics-highlights"), true);
});

test("storefront and shell pages do not import dashboard-shell", () => {
  for (const file of [
    "src/components/Header.jsx",
    "src/pages/HomePage.jsx",
    "src/components/Footer.jsx",
    "src/pages/SiteEditorPage.jsx",
  ]) {
    const content = read(file);
    assert.doesNotMatch(content, /dashboard-shell\.css/, `${file} should not import dashboard-shell.css`);
  }
});
