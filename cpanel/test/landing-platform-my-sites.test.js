import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getLandingPlatformFlag,
  getLandingPlatformFlags,
} from "../src/utils/landingPlatform/featureFlags.js";
import {
  setActiveSiteContext,
  getActiveSiteContext,
  clearActiveSiteContext,
  activateSiteContext,
} from "../src/utils/landingPlatform/activeSiteSession.js";
import {
  resolveSiteContext,
  SiteContextError,
} from "../src/utils/landingPlatform/siteContext.js";
import { landingPageForUser } from "../src/utils/landingPlatform/landingPage.js";
import { landingPage } from "../src/utils/cpanelAccess.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// --- Fixtures ---------------------------------------------------------------

const icareSiteA = {
  id: "site-icare-a",
  companyId: "icare",
  slug: "icare-storefront",
  name: "iCare",
  status: "active",
  defaultLocale: "en",
  settings: { legacyWebsiteConnectionSiteId: "icare-storefront" },
};

const icareSiteB = {
  id: "site-icare-b",
  companyId: "icare",
  slug: "icare-blog",
  name: "iCare Blog",
  status: "draft",
  defaultLocale: "en",
  settings: {},
};

const otherSite = {
  id: "site-other-1",
  companyId: "other-company",
  slug: "other-storefront",
  name: "Other",
  status: "active",
  defaultLocale: "en",
  settings: {},
};

const membership = {
  companyId: "icare",
  role: "company_admin",
  status: "active",
  permissions: ["sites.manage"],
};

const companyAdmin = { role: "company_admin", permissions: [] };
const superAdmin = { role: "super_admin", permissions: [] };
const employeeNoPerms = { role: "employee", permissions: [] };

// --- Feature flags ----------------------------------------------------------

test("feature flags default to false", () => {
  const flags = getLandingPlatformFlags({});
  assert.equal(flags.landingPlatformEnabled, false);
  assert.equal(flags.mySitesEnabled, false);
  assert.equal(flags.siteContextEnabled, false);
  assert.equal(getLandingPlatformFlag(null, "mySitesEnabled"), false);
});

test("feature flags resolve from company settings", () => {
  const company = {
    settings: {
      landingPlatformFlags: { mySitesEnabled: true, siteContextEnabled: true },
    },
  };
  const flags = getLandingPlatformFlags(company);
  assert.equal(flags.mySitesEnabled, true);
  assert.equal(flags.siteContextEnabled, true);
  assert.equal(flags.landingPlatformEnabled, false);
});

// --- Active site session ----------------------------------------------------

test("activeSiteSession: set/get/clear in-memory context", () => {
  clearActiveSiteContext();
  assert.equal(getActiveSiteContext(), null);

  const context = { companyId: "icare", siteId: "site-icare-a", source: "explicit" };
  setActiveSiteContext(context);
  assert.equal(getActiveSiteContext(), context);

  clearActiveSiteContext();
  assert.equal(getActiveSiteContext(), null);

  setActiveSiteContext(null);
  assert.equal(getActiveSiteContext(), null);
});

test("activateSiteContext resolves an explicit site context and stores it", () => {
  clearActiveSiteContext();
  const context = activateSiteContext({
    companyId: "icare",
    siteId: "site-icare-a",
    sites: [icareSiteA, icareSiteB],
    membership,
    domains: ["icare.example.com"],
  });
  assert.equal(context.companyId, "icare");
  assert.equal(context.siteId, "site-icare-a");
  assert.equal(context.slug, "icare-storefront");
  assert.equal(context.source, "explicit");
  assert.equal(context.primaryDomain, "icare.example.com");
  assert.equal(getActiveSiteContext(), context);
  clearActiveSiteContext();
});

test("activateSiteContext rejects a site from another company", () => {
  clearActiveSiteContext();
  assert.throws(
    () => activateSiteContext({
      companyId: "icare",
      siteId: "site-other-1",
      sites: [icareSiteA, otherSite],
    }),
    (error) => error instanceof SiteContextError && error.code === "SITE_NOT_IN_COMPANY",
  );
  assert.equal(getActiveSiteContext(), null, "failed activation must not store a context");
});

// --- Multi-site selection rules ---------------------------------------------

test("multi-site company never auto-picks without siteId", () => {
  const context = resolveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
    resolveMode: "single-site-fallback",
  });
  assert.equal(context.siteId, null);
  assert.equal(context.source, "none");

  // activateSiteContext without siteId also leaves site null (no auto-pick).
  clearActiveSiteContext();
  const activated = activateSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(activated.siteId, null);
  assert.equal(activated.source, "none");
});

// --- Post-login landing -----------------------------------------------------

test("landingPageForUser: flags off → unchanged landing", () => {
  assert.equal(landingPageForUser(companyAdmin, [], {}), landingPage(companyAdmin, []));
  assert.equal(landingPageForUser(companyAdmin, [], {}), "admin");
  assert.equal(landingPageForUser(null, []), landingPage(null, []));
});

test("landingPageForUser: flags on → admin-sites for non-super-admin with access", () => {
  const flagged = { settings: { landingPlatformFlags: { mySitesEnabled: true } } };
  assert.equal(landingPageForUser(companyAdmin, [], flagged), "admin-sites");

  const flaggedPlatform = { settings: { landingPlatformFlags: { landingPlatformEnabled: true } } };
  assert.equal(landingPageForUser(companyAdmin, [], flaggedPlatform), "admin-sites");
});

test("landingPageForUser: super_admin is never forced to admin-sites", () => {
  const flagged = { settings: { landingPlatformFlags: { mySitesEnabled: true } } };
  assert.equal(landingPageForUser(superAdmin, [], flagged), "admin-platform-companies");
});

test("landingPageForUser: user without admin-sites access is not forced", () => {
  const flagged = { settings: { landingPlatformFlags: { mySitesEnabled: true } } };
  assert.equal(landingPageForUser(employeeNoPerms, [], flagged), landingPage(employeeNoPerms, []));
  assert.equal(landingPageForUser(employeeNoPerms, [], flagged), "admin-no-access");
});

// --- File smoke -------------------------------------------------------------

test("file smoke: Manage Site, Edit Site siteId path, My Sites AR/EN when flagged", () => {
  const page = read("src/pages/AdminSitesPage.jsx");
  assert.match(page, /manageSite/);
  assert.match(page, /activateSiteContext/);
  assert.match(page, /syncSiteIdToUrl/);
  assert.match(page, /onNavigate\("admin-dashboard"\)/);
  assert.match(page, /\/admin\/site-editor\?siteId=/);
  assert.match(page, /mySitesTitle: "My Sites"/);
  assert.match(page, /mySitesTitle: "مواقعي"/);
  assert.match(page, /mySitesOn/);

  const app = read("src/CPanelApp.jsx");
  assert.match(app, /landingPageForUser/);
  assert.match(app, /\{ "admin-sites": \{ en: "My Sites", ar: "مواقعي" \} \}/);

  const landing = read("src/utils/landingPlatform/landingPage.js");
  assert.match(landing, /admin-sites/);
  assert.match(landing, /super_admin/);
});