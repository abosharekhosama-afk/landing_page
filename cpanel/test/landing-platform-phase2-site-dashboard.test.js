import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ACTIVE_SITE_HINT_KEY,
  activateSiteContext,
  clearActiveSiteContext,
  clearActiveSiteHint,
  getActiveSiteContext,
  persistActiveSiteHint,
  readActiveSiteHint,
  readSiteIdFromUrl,
  restoreActiveSiteContext,
  syncSiteIdToUrl,
} from "../src/utils/landingPlatform/activeSiteSession.js";

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
  settings: {},
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

// --- Browser mocks (node has no sessionStorage / window) --------------------

function mockSessionStorage() {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

function mockWindowUrl(url) {
  const location = { href: url, search: new URL(url).search };
  globalThis.window = {
    location,
    history: {
      replaceState: (_state, _title, path) => {
        const next = new URL(path, new URL(url).origin);
        location.href = next.href;
        location.search = next.search;
      },
    },
  };
}

function resetBrowserMocks() {
  delete globalThis.sessionStorage;
  delete globalThis.window;
}

// --- Restore from hint + URL revalidation -----------------------------------

test("restoreActiveSiteContext restores from sessionStorage hint via resolveSiteContext", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  persistActiveSiteHint({ companyId: "icare", siteId: "site-icare-a" });
  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(context.companyId, "icare");
  assert.equal(context.siteId, "site-icare-a");
  assert.equal(context.source, "explicit");
  assert.equal(getActiveSiteContext(), context);
  assert.deepEqual(readActiveSiteHint(), { companyId: "icare", siteId: "site-icare-a" });

  clearActiveSiteContext();
  clearActiveSiteHint();
  resetBrowserMocks();
});

test("restoreActiveSiteContext prefers URL ?siteId= over hint after revalidation", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard?siteId=site-icare-b");
  clearActiveSiteContext();
  clearActiveSiteHint();

  persistActiveSiteHint({ companyId: "icare", siteId: "site-icare-a" });
  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(context.siteId, "site-icare-b");
  assert.equal(context.source, "explicit");
  assert.deepEqual(readActiveSiteHint(), { companyId: "icare", siteId: "site-icare-b" });

  clearActiveSiteContext();
  clearActiveSiteHint();
  resetBrowserMocks();
});

test("restoreActiveSiteContext rejects cross-company hint and clears (fail safe)", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  persistActiveSiteHint({ companyId: "other-company", siteId: "site-other-1" });
  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(context, null);
  assert.equal(getActiveSiteContext(), null);
  assert.equal(readActiveSiteHint(), null);

  resetBrowserMocks();
});

test("restoreActiveSiteContext rejects stale siteId (not in company) and clears", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  persistActiveSiteHint({ companyId: "icare", siteId: "site-does-not-exist" });
  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(context, null);
  assert.equal(getActiveSiteContext(), null);
  assert.equal(readActiveSiteHint(), null);

  resetBrowserMocks();
});

test("restoreActiveSiteContext rejects cross-company URL siteId and clears", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard?siteId=site-other-1");
  clearActiveSiteContext();
  clearActiveSiteHint();

  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(context, null);
  assert.equal(getActiveSiteContext(), null);
  assert.equal(readActiveSiteHint(), null);

  resetBrowserMocks();
});

// --- No auto-pick -----------------------------------------------------------

test("multi-site company never auto-picks without explicit id (restore leaves null)", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(context, null);
  assert.equal(getActiveSiteContext(), null);

  resetBrowserMocks();
});

test("single-site legacy: restoreMode none leaves null without explicit id", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  const context = restoreActiveSiteContext({
    companyId: "icare",
    sites: [icareSiteA],
    membership,
  });
  assert.equal(context, null);
  assert.equal(getActiveSiteContext(), null);

  resetBrowserMocks();
});

// --- Activate + switch + clear ----------------------------------------------

test("activate + switch updates memory and hint", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  const first = activateSiteContext({
    companyId: "icare",
    siteId: "site-icare-a",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(first.siteId, "site-icare-a");
  assert.equal(getActiveSiteContext(), first);
  assert.deepEqual(readActiveSiteHint(), { companyId: "icare", siteId: "site-icare-a" });

  const second = activateSiteContext({
    companyId: "icare",
    siteId: "site-icare-b",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(second.siteId, "site-icare-b");
  assert.equal(getActiveSiteContext(), second);
  assert.deepEqual(readActiveSiteHint(), { companyId: "icare", siteId: "site-icare-b" });

  clearActiveSiteContext();
  clearActiveSiteHint();
  resetBrowserMocks();
});

test("clearActiveSiteHint(companyId) only clears that company's hint", () => {
  mockSessionStorage();
  clearActiveSiteHint();

  persistActiveSiteHint({ companyId: "icare", siteId: "site-icare-a" });
  clearActiveSiteHint("other-company");
  assert.deepEqual(readActiveSiteHint(), { companyId: "icare", siteId: "site-icare-a" });

  clearActiveSiteHint("icare");
  assert.equal(readActiveSiteHint(), null);

  resetBrowserMocks();
});

test("clear on company mismatch: switch clears memory + that company's hint", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  clearActiveSiteContext();
  clearActiveSiteHint();

  const first = activateSiteContext({
    companyId: "icare",
    siteId: "site-icare-a",
    sites: [icareSiteA, icareSiteB],
    membership,
  });
  assert.equal(getActiveSiteContext(), first);

  // Company switch: clear memory + the leaving company's hint.
  clearActiveSiteContext();
  clearActiveSiteHint("icare");
  assert.equal(getActiveSiteContext(), null);
  assert.equal(readActiveSiteHint(), null);

  // A stale hint for the old company must not restore into the new company.
  persistActiveSiteHint({ companyId: "icare", siteId: "site-icare-a" });
  const context = restoreActiveSiteContext({
    companyId: "other-company",
    sites: [otherSite],
    membership: null,
  });
  assert.equal(context, null);
  assert.equal(getActiveSiteContext(), null);
  assert.equal(readActiveSiteHint(), null);

  resetBrowserMocks();
});

// --- URL sync ---------------------------------------------------------------

test("syncSiteIdToUrl mirrors the active siteId onto the URL (best-effort)", () => {
  mockSessionStorage();
  mockWindowUrl("https://cpanel.example/admin/dashboard");
  syncSiteIdToUrl("site-icare-a");
  assert.equal(readSiteIdFromUrl(), "site-icare-a");
  syncSiteIdToUrl(null);
  assert.equal(readSiteIdFromUrl(), null);
  resetBrowserMocks();
});

test("hint key is namespaced by version and carries companyId", () => {
  mockSessionStorage();
  clearActiveSiteHint();
  persistActiveSiteHint({ companyId: "icare", siteId: "site-icare-a" });
  assert.equal(ACTIVE_SITE_HINT_KEY, "landingPlatform.activeSiteHint.v1");
  const raw = globalThis.sessionStorage.getItem(ACTIVE_SITE_HINT_KEY);
  assert.deepEqual(JSON.parse(raw), { companyId: "icare", siteId: "site-icare-a" });
  resetBrowserMocks();
});

// --- File smoke -------------------------------------------------------------

test("file smoke: AdminLayout site identity / My Sites back / switcher when wired", () => {
  const layout = read("src/components/AdminLayout.jsx");
  assert.match(layout, /SiteContextBar/);
  assert.match(layout, /siteContext/);
  assert.match(layout, /onBackToMySites/);
  assert.match(layout, /onSwitchSite/);
  assert.match(layout, /siteContextEnabled/);

  const bar = read("src/components/SiteContextBar.jsx");
  assert.match(bar, /Back to My Sites/);
  assert.match(bar, /العودة إلى مواقعي/);
  assert.match(bar, /onSwitchSite/);
  assert.match(bar, /site-context-status/);
  assert.match(bar, /Pick a site to manage/);
  assert.match(bar, /super_admin/);

  const app = read("src/CPanelApp.jsx");
  assert.match(app, /restoreActiveSiteContext/);
  assert.match(app, /clearActiveSiteHint/);
  assert.match(app, /handleSwitchSite/);
  assert.match(app, /siteContextEnabled/);
  assert.match(app, /preserveSiteIdInPath/);

  const session = read("src/utils/landingPlatform/activeSiteSession.js");
  assert.match(session, /landingPlatform\.activeSiteHint\.v1/);
  assert.match(session, /persistActiveSiteHint/);
  assert.match(session, /restoreActiveSiteContext/);
  assert.match(session, /clearActiveSiteHint/);
  assert.match(session, /sessionStorage/);
});