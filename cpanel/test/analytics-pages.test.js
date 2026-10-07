import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getNavigationItem, navigationContainsPage, tenantNavigation } from "../src/data/adminNavigation.js";
import { canonicalAdminPageKey, resolvePage } from "../src/utils/cpanelAccess.js";
import { analyticsPageKeys, analyticsRoutes, buildVerifiedOperationalSummary, reportCatalog } from "../src/utils/analytics.js";
import { canAccessAdminPage } from "../src/utils/roles.js";

const root = path.resolve(import.meta.dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, "src", file), "utf8");
const reportsModule = [{ route: "/admin/reports", enabled: true }];
const companyAdmin = { role: "company_admin", activeCompany: { id: "icare", modules: reportsModule } };
const analyticsEmployee = { role: "employee", permissions: ["reports.view"], activeCompany: { id: "icare", modules: reportsModule } };

test("every canonical Analytics route resolves to its dedicated page key", () => {
  assert.equal(analyticsPageKeys.length, 9);
  for (const [page, route] of Object.entries(analyticsRoutes)) {
    assert.equal(resolvePage(route, companyAdmin, reportsModule), page, route);
    assert.equal(resolvePage(`${route}/`, companyAdmin, reportsModule), page, `${route}/`);
  }
});

test("legacy Analytics paths and page keys canonicalize safely", () => {
  const aliases = {
    "/admin/reports": "admin-analytics-reports",
    "/admin/coming-soon/analytics/highlights": "admin-analytics-highlights",
    "/admin/coming-soon/analytics/realtime": "admin-analytics-realtime",
    "/admin/coming-soon/analytics/traffic": "admin-analytics-traffic",
    "/admin/coming-soon/analytics/behavior": "admin-analytics-behavior",
    "/admin/coming-soon/analytics/marketing": "admin-analytics-marketing",
    "/admin/coming-soon/analytics/recordings": "admin-analytics-session-recordings",
    "/admin/coming-soon/analytics/insights": "admin-analytics-insights",
    "/admin/coming-soon/analytics/benchmarks": "admin-analytics-benchmarks",
  };
  for (const [route, page] of Object.entries(aliases)) assert.equal(resolvePage(route, companyAdmin, reportsModule), page);
  assert.equal(canonicalAdminPageKey("admin-reports"), "admin-analytics-reports");
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-analytics-recordings"), "admin-analytics-session-recordings");
});

test("Analytics navigation contains nine canonical children with canonical paths", () => {
  const analytics = tenantNavigation.find((item) => item.id === "tenant-growth")?.children.find((item) => item.id === "tenant-analytics");
  assert.ok(analytics);
  assert.equal(analytics.children.length, 9);
  for (const page of analyticsPageKeys) {
    const item = getNavigationItem(page);
    assert.equal(item?.pageKey, page);
    assert.equal(item?.placeholder, undefined);
    assert.equal(item?.requiresModule, true);
    assert.equal(navigationContainsPage(analytics, page), true);
  }
});

test("sidebar active state uses canonical page identity, never module aliases", () => {
  const layout = source("components/AdminLayout.jsx");
  assert.match(layout, /const activeKey = canonicalAdminPageKey\(activePage\)/);
  assert.doesNotMatch(layout, /const activeKey = normalizedModulePage\(activePage\)/);
  assert.equal(canonicalAdminPageKey("admin-community"), "admin-community");
  assert.equal(canonicalAdminPageKey("admin-meetings"), "admin-meetings");
  assert.equal(canonicalAdminPageKey("admin-analytics-traffic"), "admin-analytics-traffic");
});

test("Contacts is active only for Contacts and Contact Detail canonical keys", () => {
  const customers = tenantNavigation.find((item) => item.id === "tenant-customers-leads");
  const analytics = tenantNavigation.find((item) => item.id === "tenant-growth")?.children.find((item) => item.id === "tenant-analytics");
  assert.equal(navigationContainsPage(customers, "admin-customers"), true);
  assert.equal(navigationContainsPage(customers, "admin-analytics-highlights"), false);
  assert.equal(navigationContainsPage(analytics, "admin-analytics-highlights"), true);
});

test("Analytics access uses the existing reports permission and module", () => {
  const roles = source("utils/roles.js");
  const modules = source("utils/moduleRegistry.js");
  for (const page of analyticsPageKeys) {
    assert.equal(canAccessAdminPage(analyticsEmployee, page), true, page);
    assert.match(roles, new RegExp(`"${page}": \\["reports\\.view"\\]`));
    assert.match(modules, new RegExp(`"${page}": "admin-reports"`));
  }
});

test("employees without reports.view receive No Access, not Dashboard", () => {
  const denied = { role: "employee", permissions: ["customers.view"], activeCompany: { id: "icare", modules: reportsModule } };
  for (const route of Object.values(analyticsRoutes)) assert.equal(resolvePage(route, denied, reportsModule), "admin-no-access");
});

test("scoped Super Admin and company operators retain tenant Analytics access", () => {
  const scoped = { ...companyAdmin, globalRole: "super_admin", isCompanyScope: true };
  assert.equal(resolvePage("/admin/analytics/highlights", scoped, reportsModule), "admin-analytics-highlights");
  assert.equal(resolvePage("/admin/analytics/realtime", { role: "manager", activeCompany: companyAdmin.activeCompany }, reportsModule), "admin-analytics-realtime");
});

test("unknown routes alone use the role landing fallback", () => {
  assert.equal(resolvePage("/admin/analytics/not-real", companyAdmin, reportsModule), "admin");
  assert.notEqual(resolvePage("/admin/analytics/behavior", companyAdmin, reportsModule), "admin");
});

test("CPanel renders Analytics before generic Dashboard and placeholder fallbacks", () => {
  const app = source("CPanelApp.jsx");
  assert.match(app, /import AdminAnalyticsPage/);
  assert.match(app, /analyticsPageKeys\.includes\(activePage\)[\s\S]*?<AdminAnalyticsPage/);
  assert.match(app, /!analyticsPageKeys\.includes\(activePage\)/);
  assert.match(app, /window\.addEventListener\("popstate", onPopState\)/);
  assert.match(app, /resolvePage\(window\.location\.pathname/);
});

test("Analytics pages use centralized navigation and no page-level history router", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /onNavigate=\{onNavigate\}/);
  assert.doesNotMatch(page, /pushState|replaceState|window\.location\.href/);
});

test("the renderer contains nine genuinely distinct page compositions", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  for (const marker of ["analytics-highlights-page", "analytics-realtime-page", "analytics-traffic-page", "analytics-behavior-page", "analytics-marketing-page", "analytics-recordings-page", "analytics-insights-page", "analytics-benchmarks-page", "analytics-reports-page"]) assert.match(page, new RegExp(marker));
  for (const component of ["HighlightsPage", "RealtimePage", "TrafficPage", "BehaviorPage", "MarketingPage", "RecordingsPage", "InsightsPage", "BenchmarksPage", "ReportsPage"]) assert.match(page, new RegExp(`function ${component}`));
});

test("Analytics header Reports navigates to the existing reports workspace", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /function PageHeader\(\{ activePage, ar, labels, onOpenReports, onUnsupported \}\)/);
  assert.match(page, /tenant-analytics-header-actions"><button onClick=\{onUnsupported\} type="button"><AlertCircle size=\{16\}\/>\{labels\.alerts\}<\/button><button onClick=\{onOpenReports\} type="button"><FileBarChart size=\{16\}\/>\{labels\.reports\}<\/button>/);
  assert.match(page, /onOpenReports=\{\(\) => onNavigate\?\.\("admin-analytics-reports"\)\}/);
  assert.match(page, /<button onClick=\{onUnsupported\} type="button"><AlertCircle/);
});

test("Highlights Orders and Customers KPIs use Reports Summary without treating unavailable as zero", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /fetchReportsSummary/);
  assert.match(page, /normalizeReportsSummary/);
  assert.match(page, /reportsSummaryMetric\(reportsPayload, "orders_count"\)/);
  assert.match(page, /reportsSummaryMetric\(reportsPayload, "customers_count"\)/);
  assert.match(page, /setReportsUnavailable\(true\)/);
  assert.match(page, /reportsUnavailable \? null : reportsSummaryMetric\(reportsPayload, "orders_count"\)/);
  assert.match(page, /label="Orders" value=\{ordersValue\}/);
  assert.match(page, /label="Customers" value=\{customersValue\}/);
  assert.doesNotMatch(page, /label="Orders" status=\{labels\.unavailableDetail\}\/>/);
});

test("unverified visitor, behavior, marketing, recording, and benchmark data remain honest", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /No verified analytics source/);
  assert.match(page, /No verified Search Console connection/);
  assert.match(page, /No verified recording source is enabled/);
  assert.match(page, /No claim is made about competitor performance/);
  assert.doesNotMatch(page, /Math\.random|mockVisitors|fakeTraffic|sampleRecording/);
});

test("Behavior page receives real visitor analytics, not fabricated values", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /case "admin-analytics-behavior": content = <BehaviorPage labels=\{labels\} language=\{language\} visitorData=\{visitorData\}\/>/);
  assert.match(page, /"admin-analytics-behavior",/);
  assert.match(page, /visitorData=\{visitorData\}\/>/);
  assert.match(page, /behavior\?\.avgSessionDurationSeconds/);
  assert.match(page, /behavior\?\.pagesPerSession/);
  assert.match(page, /behavior\?\.bounceRate/);
  assert.match(page, /behavior\?\.topPages/);
  assert.match(page, /formatDuration\(behavior\?\.avgSessionDurationSeconds\)/);
  assert.doesNotMatch(page, /Math\.random|fakeSessions|mockBehavior|sampleTopPages|hardcodedMetrics/);
});

test("Behavior and Highlights derive engagement and top pages from the same live visitor payload", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /fetchVisitorAnalytics\(\)/);
  assert.match(page, /seriesByDay/);
  assert.match(page, /behavior\?\.topPages/);
  assert.match(page, /EngagementRows/);
  assert.match(page, /DurationValue|formatDuration/);
  assert.match(page, /topPages/);
  assert.match(page, /stay null|unavailable/);
  assert.doesNotMatch(page, /pushState|replaceState|window\.location\.href/);
});

test("unsupported analytics surfaces remain unverified on Behavior and Highlights", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  assert.match(page, /Click tracking is not configured/);
  assert.match(page, /No click events are collected by a verified source/);
  assert.doesNotMatch(page, /topClicks|clickCount|mockClicks/);
});

test("operational summary uses only supplied tenant arrays", () => {
  assert.deepEqual(buildVerifiedOperationalSummary({ customers: [{ id: 1 }], employees: [{ id: 2 }], orders: [{ total: 12 }, { total: "8" }], products: [{ id: 3 }] }), { customers: 1, employees: 1, orders: 2, products: 1, revenue: 20 });
});

test("All Reports uses the reports summary API and keeps unsupported visitor templates honest", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  const workspace = source("components/AnalyticsReportsWorkspace.jsx");
  assert.equal(reportCatalog.length, 13);
  assert.match(page, /AnalyticsReportsWorkspace/);
  assert.match(workspace, /fetchReportsSummary/);
  assert.match(workspace, /dateFrom: appliedRange.date_from/);
  assert.match(workspace, /copy.forbidden/);
  assert.match(workspace, /copy.retry/);
  assert.match(workspace, /copy.emptyPeriod/);
  assert.match(workspace, /copy.readOnly/);
  assert.match(workspace, /unsupportedCatalog/);
  assert.doesNotMatch(workspace, /Math\.random|fakeRevenue|sampleReport|localStorage/);
  assert.match(page, /AdminUnderDevelopmentContent/);
  assert.match(page, /setUnsupported\(true\)/);
});

test("Analytics CSS is one scoped responsive section without global scaling", () => {
  const css = source("styles/global.css");
  const marker = "/* Tenant Analytics section */";
  assert.equal(css.split(marker).length - 1, 1);
  const start = css.indexOf(marker);
  const scoped = css.slice(start, css.indexOf("/* Tenant Site & Mobile App pages */", start));
  assert.match(scoped, /\.tenant-analytics-page/);
  assert.match(scoped, /\.analytics-realtime-layout/);
  assert.match(scoped, /\.analytics-recordings-page/);
  assert.match(scoped, /\.analytics-report-category/);
  assert.match(scoped, /@media \(max-width: 860px\)/);
  assert.doesNotMatch(scoped, /zoom:|transform:\s*scale/);
});

test("Analytics explicitly supports RTL and LTR", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  const util = source("utils/analytics.js");
  assert.match(page, /dir=\{analyticsDirection\(language\)\}/);
  assert.match(page, /ar:/);
  assert.match(util, /language === "ar" \? "rtl" : "ltr"/);
});

test("Traffic Search Quality uses real search analytics and omits redirect management", () => {
  const page = source("pages/AdminAnalyticsPage.jsx");
  const panel = source("components/SearchQualityPanel.jsx");
  const searchPanel = source("components/SearchAnalyticsPanel.jsx");
  assert.match(page, /import SearchQualityPanel from "..\/components\/SearchQualityPanel.jsx"/);
  assert.match(page, /function TrafficPage\(\{ labels, language = "en", visitorData \}\)/);
  assert.match(page, /<SearchQualityPanel language=\{language\} \/>/);
  assert.match(panel, /fetchSearchAnalytics/);
  assert.match(panel, /SearchTable, searchCopy/);
  assert.match(panel, /searchesWithResults/);
  assert.match(panel, /zeroResultSearches/);
  assert.match(panel, /totalEvents/);
  assert.doesNotMatch(panel, /fetchSearchRedirects|search\/redirects|saveSearchRedirect|deleteSearchRedirect|updateSearchRedirect/);
  assert.doesNotMatch(panel, /Math\.random|mockVisitors|fakeTraffic|sampleRecord/);
  assert.match(searchPanel, /export function SearchTable/);
  assert.match(searchPanel, /export function searchCopy/);
});
