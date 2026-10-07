import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { getNavigationItem } from "../src/data/adminNavigation.js";
import {
  canViewSiteMobile,
  confirmedSiteFacts,
  isSiteMobilePage,
  resolveSiteMobileDestination,
  siteMobileDirection,
  siteMobilePageKeys,
  suggestedLinkSlug,
} from "../src/utils/siteMobile.js";

const pageSource = fs.readFileSync(
  new URL("../src/pages/AdminSiteMobilePage.jsx", import.meta.url),
  "utf8",
);
const appSource = fs.readFileSync(new URL("../src/CPanelApp.jsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

const companyAdmin = { role: "company_admin", activeCompany: { id: "icare" } };
const modules = [
  { enabled: true, route: "/admin/settings" },
  { enabled: true, route: "/admin/website-media" },
];

test("all Site & Mobile App routes render through one connected tenant page", () => {
  assert.equal(siteMobilePageKeys.length, 7);
  for (const pageKey of siteMobilePageKeys) {
    assert.equal(isSiteMobilePage(pageKey), true);
    assert.ok(getNavigationItem(pageKey)?.path);
  }
  assert.equal(isSiteMobilePage("admin-products"), false);
  assert.match(appSource, /siteMobilePageKeys\.includes\(activePage\)[\s\S]*?<AdminSiteMobilePage/);
});

test("the hub resolves its child pages and existing Edit Site route", () => {
  const context = { currentUser: companyAdmin, modules };
  assert.equal(resolveSiteMobileDestination("website", context), "admin-tenant-placeholder-site-website");
  assert.equal(resolveSiteMobileDestination("siteSpeed", context), "admin-tenant-placeholder-site-speed");
  assert.equal(resolveSiteMobileDestination("security", context), "admin-tenant-placeholder-site-security");
  assert.equal(resolveSiteMobileDestination("mobileApp", context), "admin-tenant-placeholder-site-mobile-app");
  assert.equal(resolveSiteMobileDestination("logoBrand", context), "admin-tenant-placeholder-site-logo-brand");
  assert.equal(resolveSiteMobileDestination("linkBio", context), "admin-tenant-placeholder-site-link-in-bio");
  assert.equal(resolveSiteMobileDestination("editSite", context), "admin-site-editor");
});

test("website actions reuse authorized settings and website-content destinations", () => {
  const context = { currentUser: companyAdmin, modules };
  assert.equal(resolveSiteMobileDestination("websiteContent", context), "admin-website-media");
  assert.equal(resolveSiteMobileDestination("settings", context), "admin-settings");
  assert.equal(resolveSiteMobileDestination("connectDomain", context), "admin-settings");
  assert.equal(
    resolveSiteMobileDestination("websiteContent", { currentUser: companyAdmin, modules: [] }),
    null,
  );
  assert.equal(
    resolveSiteMobileDestination("connectDomain", {
      currentUser: { role: "super_admin", activeCompany: { id: "icare" } },
      modules: [],
    }),
    "admin-platform-domains",
  );
});

test("tenant scope and role guards remain authoritative", () => {
  assert.equal(canViewSiteMobile(companyAdmin, { id: "icare" }), true);
  assert.equal(canViewSiteMobile({ role: "manager" }, { id: "icare" }), true);
  assert.equal(canViewSiteMobile({ role: "super_admin" }, { id: "icare" }), true);
  assert.equal(canViewSiteMobile({ role: "super_admin" }), false);
  assert.equal(canViewSiteMobile({ role: "employee", permissions: [] }, { id: "icare" }), false);
});

test("confirmed site facts expose only supplied company data", () => {
  assert.deepEqual(confirmedSiteFacts({ id: "icare", name: "iCare", slug: "icare" }), {
    companyName: "iCare",
    direction: null,
    domain: null,
    faviconUrl: null,
    language: null,
    locale: null,
    logoUrl: null,
    slug: "icare",
    storefrontUrl: null,
  });
  assert.equal(suggestedLinkSlug({ slug: "icare" }), "icare");
  assert.equal(suggestedLinkSlug({ slug: "Not a valid path" }), null);
  assert.match(pageSource, /This address is not reserved or active/);
  assert.doesNotMatch(pageSource, /\b(?:SEO score|traffic total|uptime percentage|100% uptime|SSL secure|PageSpeed score|app members)\b/i);
});

test("Mobile App has two accessible tabs without fabricated app state", () => {
  assert.match(pageSource, /role="tablist"/);
  assert.match(pageSource, /aria-selected=\{tab === id\}/);
  assert.match(pageSource, /const tabs = \[[\s\S]*?native[\s\S]*?members/);
  assert.doesNotMatch(pageSource, /status:\s*["'](?:installed|connected|published|live)["']/i);
});

test("Website Overview has the screenshot-specific summary and four status sections", () => {
  assert.match(pageSource, /site-overview-summary-card/);
  assert.match(pageSource, /site-overview-company-identity/);
  assert.match(pageSource, /site-overview-seo-body/);
  assert.match(pageSource, /site-overview-performance-body/);
  assert.match(pageSource, /site-overview-mini-chart/);
  assert.match(pageSource, /site-overview-accessibility-body/);
  assert.match(pageSource, /\["linkBio", Link2, text\.linkTitle\]/);
});

test("Site Speed renders device tabs, result area, metrics grid, and FAQ", () => {
  assert.match(pageSource, /site-speed-device-tabs/);
  assert.match(pageSource, /site-speed-score-area/);
  assert.match(pageSource, /site-speed-metrics-grid/);
  assert.match(pageSource, /site-speed-faq/);
  assert.match(pageSource, /\["LCP"[\s\S]*?\["INP"[\s\S]*?\["CLS"[\s\S]*?\["FCP"/);
  assert.match(pageSource, /\["TTFB"/);
  assert.match(cssSource, /\.site-speed-metrics-grid \{ grid-template-columns: repeat\(6/);
  assert.match(cssSource, /\.site-speed-metric:nth-child\(n\+4\)[^}]*grid-column: span 3/);
});

test("Uptime & Security renders monitoring, availability, infrastructure, load, and details", () => {
  assert.match(pageSource, /site-security-status-card/);
  assert.match(pageSource, /site-security-availability-card/);
  assert.match(pageSource, /site-security-map-card/);
  assert.match(pageSource, /site-security-infrastructure-card/);
  assert.match(pageSource, /site-security-simulator-card/);
  assert.match(pageSource, /site-security-details-card/);
  assert.match(pageSource, /"Encryption"/);
  assert.match(pageSource, /"Threat protection"/);
  assert.match(pageSource, /"Compliance"/);
  assert.match(cssSource, /\.site-security-chart path \{ display: none; \}/);
});

test("Mobile App retains two tabs and adds reference actions and setup checklist", () => {
  assert.match(pageSource, /"Watch Video"/);
  assert.match(pageSource, /site-mobile-app-setup-checklist/);
  assert.match(pageSource, /"Choose an app layout"/);
  assert.match(cssSource, /\.site-mobile-phone-preview \{ height: 500px; width: 258px; \}/);
});

test("Brand and Hopp pages use distinct split heroes and honest previews", () => {
  assert.match(pageSource, /site-brand-split-hero/);
  assert.match(pageSource, /site-brand-assets-section/);
  assert.match(pageSource, /site-hopp-split-hero/);
  assert.match(pageSource, /site-hopp-url-field/);
  assert.match(pageSource, /site-brand-secondary-action/);
  assert.match(pageSource, /site-hopp-help-action/);
  assert.match(pageSource, /site-hopp-carousel-controls/);
  assert.match(pageSource, /readOnly value=\{slug \|\| ""\}/);
  assert.match(pageSource, /Preview only/);
});

test("unsupported actions reuse the shared bilingual under-development flow", () => {
  assert.match(pageSource, /AdminUnderDevelopmentContent/);
  assert.match(pageSource, /const unsupported = \(\) => setShowUnsupported\(true\)/);
  assert.match(pageSource, /fallback\(\)/);
});

test("Site & Mobile App pages support one scoped CSS section and RTL/LTR", () => {
  assert.equal(siteMobileDirection("ar"), "rtl");
  assert.equal(siteMobileDirection("en"), "ltr");
  assert.match(pageSource, /data-site-mobile-direction=\{siteMobileDirection\(language\)\}/);
  assert.match(cssSource, /\[dir="rtl"\] \.site-mobile-page-header/);
  assert.equal((cssSource.match(/\/\* Tenant Site & Mobile App pages \*\//g) || []).length, 1);
  assert.equal((cssSource.match(/\/\* Screenshot-matched Site & Mobile App page compositions \*\//g) || []).length, 1);
  assert.match(cssSource, /@media \(max-width: 640px\)[\s\S]*?\.site-mobile-hub-grid/);
});

test("the dedicated page hides the shell heading and renders one page title", () => {
  assert.match(pageSource, /<AdminLayout[\s\S]*?hideHeader/);
  assert.equal((pageSource.match(/data-site-mobile-page-header/g) || []).length, 1);
});
