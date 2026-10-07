import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getNavigationItem } from "../src/data/adminNavigation.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Domains page uses the shared admin-data-table system", () => {
  const page = read("src/pages/AdminDomainsPage.jsx");
  assert.match(page, /admin-data-table-wrap/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table-actions/);
  assert.match(page, /admin-data-table-cell-clip/);
  assert.match(page, /aria-label=\{`\$\{labels\.edit\}/);
  assert.match(page, /aria-label=\{`\$\{labels\.delete\}/);
  assert.doesNotMatch(page, /admin-table-wrap/);
  assert.doesNotMatch(page, /className="admin-table"/);
});

test("Domains page is fully bilingual and keeps the shell title", () => {
  const page = read("src/pages/AdminDomainsPage.jsx");
  assert.match(page, /labels\.title/);
  assert.match(page, /labels\.subtitle/);
  assert.match(page, /labels\.addDomain/);
  assert.match(page, /labels\.loading/);
  assert.match(page, /labels\.empty/);
  assert.match(page, /labels\.accessDeniedTitle/);
  assert.doesNotMatch(page, /admin-page-header/);
});

test("Overview page carries platform-overview markup and honest totals", () => {
  const page = read("src/pages/AdminPlatformOverview.jsx");
  assert.match(page, /className="platform-overview"/);
  assert.match(page, /platform-metrics/);
  assert.match(page, /platform-metric-card/);
  assert.match(page, /platform-recent-list/);
  assert.match(page, /platform-quick-actions/);
  assert.match(page, /platform-recent-logo/);
  assert.match(page, /platform-overview-loading/);
  assert.match(page, /platform-recent-empty/);
  assert.match(page, /const totalMembers = 0;/);
  assert.match(page, /<div className="platform-metric-value">-<\/div>/);
  assert.match(page, /labels\.accessDeniedTitle/);
  assert.match(page, /labels\.loading/);
});

test("Platform Sites placeholder keeps honest Soon copy with a Companies CTA", () => {
  const page = read("src/pages/AdminPlaceholderPage.jsx");
  const nav = getNavigationItem("admin-platform-placeholder-sites");
  assert.equal(nav.placeholder, true, "platform Sites must stay a placeholder");
  assert.match(page, /admin-platform-placeholder-sites/);
  assert.match(page, /PlatformSitesHonestyContent/);
  assert.match(page, /onNavigate\("admin-platform-companies"\)/);
  assert.match(page, /platform-sites-honesty/);
  assert.match(page, /تُدار مواقع الشركات من داخل الشركة نفسها/);
  assert.match(page, /Sites for a company are managed after opening that company/);
});

test("Memberships panel uses the shared admin-data-table system", () => {
  const page = read("src/components/CompanyMembershipsPanel.jsx");
  assert.match(page, /admin-data-table-wrap/);
  assert.match(page, /className="admin-data-table"/);
  assert.match(page, /admin-data-table-actions/);
  assert.match(page, /aria-label=\{`Edit \$\{membership\.email/);
  assert.match(page, /aria-label=\{`Disable \$\{membership\.email/);
  assert.doesNotMatch(page, /admin-table-wrap/);
  assert.doesNotMatch(page, /company-memberships-table/);
});

test("dashboard-shell.css carries platform Overview and Domains tokens", () => {
  const css = read("src/styles/dashboard-shell.css");
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-overview \{/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-metric-card \{/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-recent-item:hover/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-quick-action \{/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-domains-toolbar \{/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.admin-data-table th \{/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.platform-sites-honesty-cta \{/);
  assert.match(css, /\.admin-studio-shell\.admin-platform \.company-card-footer \{[\s\S]*?--dashboard-card-radius/);
});