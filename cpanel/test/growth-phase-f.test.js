import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const marketingPages = [
  "src/pages/AdminBannersPage.jsx",
  "src/pages/AdminAnnouncementsPage.jsx",
  "src/pages/AdminSplashAdsPage.jsx",
  "src/pages/AdminSmsPage.jsx",
  "src/pages/AdminFeaturePage.jsx",
];

for (const file of marketingPages) {
  test(`${path.basename(file)} uses shared admin-data-table system`, () => {
    const source = read(file);
    assert.match(source, /className="admin-data-table-wrap"/);
    assert.match(source, /className="admin-data-table"/);
    assert.doesNotMatch(source, /admin-table-wrap/);
    assert.doesNotMatch(source, /className="admin-table"/);
  });
}

test("Analytics nested tables use shared admin-data-table system", () => {
  const page = read("src/pages/AdminAnalyticsPage.jsx");
  assert.match(page, /className="admin-data-table-wrap"/);
  assert.match(page, /className="admin-data-table"/);
  assert.doesNotMatch(page, /className="tenant-dashboard-table"/);
  assert.doesNotMatch(page, /className="admin-table"/);
  const search = read("src/components/SearchAnalyticsPanel.jsx");
  assert.match(search, /className="admin-data-table-wrap"/);
  assert.match(search, /className="admin-data-table"/);
});

test("Analytics keeps unavailable / notConnected honesty markers", () => {
  const page = read("src/pages/AdminAnalyticsPage.jsx");
  assert.match(page, /labels\.unavailable|unavailable/);
  assert.match(page, /labels\.notConnected|notConnected/);
  assert.match(page, /No verified recording source|decorative/);
  assert.doesNotMatch(page, /fake sessions|fabricated metric|mock chart series/i);
});

test("SEO page keeps save API and Search Console honesty", () => {
  const page = read("src/pages/AdminMarketingPage.jsx");
  assert.match(page, /marketing-seo-page/);
  assert.match(page, /data-marketing-seo-settings/);
  assert.match(page, /notConnected/);
  assert.match(page, /Google Search Console/);
  assert.match(page, /handleSave|onSubmit=\{handleSave\}/);
});

test("dashboard-shell.css carries tenant growth/analytics/SEO overrides", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /Phase F - Growth \/ Analytics \/ SEO chrome/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.admin-panel-card \.admin-data-table-wrap[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.tenant-analytics-page \.tenant-analytics-metric[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.tenant-marketing-page \.marketing-seo-settings[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.home-content-manager \.homepage-card-admin[\s\S]*?--dashboard-card-radius/);
  assert.match(css, /\.admin-studio-shell\.admin-tenant \.website-media-manager \.website-media-card[\s\S]*?--dashboard-bg-card/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?tenant-analytics-page/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?tenant-marketing-page[\s\S]*?overflow-x:\s*hidden/);
});
