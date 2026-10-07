import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  SiteContextError,
  buildSiteContext,
  isArchivedSite,
  resolveSiteContext,
} from "../src/utils/landingPlatform/siteContext.js";
import {
  clearActiveSiteContext,
  clearActiveSiteHint,
  persistActiveSiteHint,
  readActiveSiteHint,
  restoreActiveSiteContext,
} from "../src/utils/landingPlatform/activeSiteSession.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function siteFixture(id, status, companyId = "icare") {
  return { id, companyId, slug: id, name: id, status, defaultLocale: "en", settings: {} };
}

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

// --- Functional: site context contract ---------------------------------------

test("cpanel siteContext rejects archived sites with SITE_ARCHIVED", (t) => {
  t.after(resetBrowserMocks);

  t.test("isArchivedSite is true only for archived status", () => {
    assert.equal(isArchivedSite(siteFixture("s1", "archived")), true);
    assert.equal(isArchivedSite(siteFixture("s2", "active")), false);
    assert.equal(isArchivedSite(siteFixture("s3", "draft")), false);
    assert.equal(isArchivedSite(null), false);
  });

  t.test("explicit active siteId resolves normally", () => {
    const context = resolveSiteContext({
      companyId: "icare",
      siteId: "site-active",
      sites: [siteFixture("site-active", "active")],
      resolveMode: "none",
    });
    assert.equal(context.siteId, "site-active");
    assert.equal(context.source, "explicit");
  });

  t.test("explicit archived siteId throws SITE_ARCHIVED", () => {
    assert.throws(
      () => resolveSiteContext({
        companyId: "icare",
        siteId: "site-archived",
        sites: [siteFixture("site-archived", "archived")],
        resolveMode: "none",
      }),
      (error) => error instanceof SiteContextError && error.code === "SITE_ARCHIVED",
    );
  });

  t.test("buildSiteContext rejects an archived site", () => {
    assert.throws(
      () => buildSiteContext({ companyId: "icare", site: siteFixture("site-archived", "archived"), source: "explicit" }),
      (error) => error instanceof SiteContextError && error.code === "SITE_ARCHIVED",
    );
  });

  t.test("single-site fallback never picks an archived site", () => {
    const context = resolveSiteContext({
      companyId: "icare",
      sites: [siteFixture("site-only-archived", "archived")],
      resolveMode: "single-site-fallback",
    });
    assert.equal(context.siteId, null);
    assert.equal(context.source, "none");
  });
});

test("restoreActiveSiteContext rejects an archived current site (SITE_ARCHIVED)", async (t) => {
  t.after(resetBrowserMocks);

  t.test("archived sessionStorage hint is rejected and cleared", () => {
    mockSessionStorage();
    mockWindowUrl("https://cpanel.example/admin/dashboard");
    clearActiveSiteContext();
    clearActiveSiteHint("icare");
    persistActiveSiteHint({ companyId: "icare", siteId: "site-archived" });
    assert.deepEqual(readActiveSiteHint(), { companyId: "icare", siteId: "site-archived" });

    const rejectedCodes = [];
    const context = restoreActiveSiteContext({
      companyId: "icare",
      sites: [
        siteFixture("site-active", "active"),
        siteFixture("site-archived", "archived"),
      ],
      membership,
      onRejected: (error) => rejectedCodes.push(error?.code),
    });

    assert.equal(context, null, "archived site must never be restored as context");
    assert.deepEqual(rejectedCodes, ["SITE_ARCHIVED"]);
    assert.equal(readActiveSiteHint(), null, "hint must be cleared after rejection");
    assert.equal(globalThis.window.location.href, "https://cpanel.example/admin/dashboard", "URL must not gain a siteId");
  });

  t.test("direct URL ?siteId= of an archived site is rejected", () => {
    mockSessionStorage();
    mockWindowUrl("https://cpanel.example/admin/dashboard?siteId=site-archived");
    clearActiveSiteContext();
    clearActiveSiteHint("icare");

    const rejectedCodes = [];
    const context = restoreActiveSiteContext({
      companyId: "icare",
      sites: [siteFixture("site-archived", "archived")],
      membership,
      onRejected: (error) => rejectedCodes.push(error?.code),
    });

    assert.equal(context, null);
    assert.deepEqual(rejectedCodes, ["SITE_ARCHIVED"]);
    assert.equal(readActiveSiteHint(), null);
  });

  t.test("active site hint still restores after the archived tests", () => {
    mockSessionStorage();
    mockWindowUrl("https://cpanel.example/admin/dashboard");
    clearActiveSiteContext();
    clearActiveSiteHint("icare");
    persistActiveSiteHint({ companyId: "icare", siteId: "site-active" });
    const context = restoreActiveSiteContext({
      companyId: "icare",
      sites: [siteFixture("site-active", "active")],
      membership,
    });
    assert.ok(context);
    assert.equal(context.siteId, "site-active");
  });
});

// --- Source-level UI assertions (no DOM renderer in this suite) --------------

test("My Sites page wires archive/restore end to end", () => {
  const source = read("src/pages/AdminSitesPage.jsx");

  assert.match(source, /import \{ archiveSite, createSite, fetchSites, restoreSite \} from "\.\.\/utils\/sitesApi\.js";/);
  assert.match(source, /import \{ isArchivedSite, pickPrimaryDomain \} from "\.\.\/utils\/landingPlatform\/siteContext\.js";/);

  // Guards: archive/restore/manage/edit all refuse archived sites.
  assert.match(source, /function requestArchive\(site\) \{[^}]*if \(!canManage \|\| isArchivedSite\(site\)\) return;/);
  assert.match(source, /if \(!canManage \|\| !isArchivedSite\(site\) \|\| statusBusySiteId\) return;/);
  assert.match(source, /function manageSite\(site\) \{\r?\n\s*setOpenMenuSiteId\(null\);\r?\n\s*if \(isArchivedSite\(site\)\) return;/);
  assert.match(source, /setOpenMenuSiteId\(null\);\r?\n\s*if \(isArchivedSite\(site\)\) return;\r?\n\s*onNavigate\("admin-site-editor"/);

  // Manage/Edit are disabled on archived cards (card buttons + overflow menu).
  const disabledManage = source.match(/disabled=\{archived\} onClick=\{\(\) => manageSite\(site\)\}/g) || [];
  const disabledEdit = source.match(/disabled=\{archived\} onClick=\{\(\) => openEditor\(site\)\}/g) || [];
  assert.ok(disabledManage.length >= 2, "Manage must be disabled (card + overflow menu) for archived sites");
  assert.ok(disabledEdit.length >= 2, "Edit must be disabled (card + overflow menu) for archived sites");

  // Overflow menu swaps Archive for Restore on archived sites.
  assert.match(source, /\{canManage && \(archived \? \(/);
  assert.match(source, /onClick=\{\(\) => void handleRestore\(site\)\} role="menuitem"[^>]*>\{copy\.restoreSite\}/);
  assert.match(source, /onClick=\{\(\) => requestArchive\(site\)\} role="menuitem"[^>]*>\{copy\.archiveSite\}/);

  // Confirmation dialog + API calls + status propagation to the shell.
  assert.match(source, /function ArchiveSiteConfirmDialog\(/);
  assert.match(source, /applyUpdatedSite\(await archiveSite\(site\.id\)\)/);
  assert.match(source, /applyUpdatedSite\(await restoreSite\(site\.id\)\)/);
  assert.match(source, /if \(onSiteStatusChanged\) onSiteStatusChanged\(updated\);/);

  // Archived badge label is rendered for archived status.
  assert.match(source, /if \(status === "archived"\) return copy\.statusArchived;/);
  assert.match(source, /sites-card sites-card-archived/);
});

test("My Sites page ships ar/en strings for archive and restore", () => {
  const source = read("src/pages/AdminSitesPage.jsx");

  const expected = [
    'statusArchived: "Archived"',
    'archiveSite: "Archive Site"',
    'restoreSite: "Restore Site"',
    'archiveConfirmTitle: "Archive this site?"',
    'statusArchived: "مؤرشف"',
    'archiveSite: "أرشفة الموقع"',
    'restoreSite: "استعادة الموقع"',
    'archiveConfirmTitle: "هل تريد أرشفة هذا الموقع؟"',
  ];
  for (const entry of expected) {
    assert.ok(source.includes(entry), `missing copy entry: ${entry}`);
  }
  // Copy keys used by the flow must be defined in both locales.
  for (const key of ["archiveCancel", "archiving", "archiveSuccess", "archiveError", "restoreSuccess", "restoreError"]) {
    const matches = source.match(new RegExp(`${key}:`, "g")) || [];
    assert.ok(matches.length >= 2, `copy key "${key}" must exist for both en and ar`);
  }
});

test("sites API client archives and restores via PATCH", () => {
  const source = read("src/utils/sitesApi.js");
  assert.match(source, /async function updateSiteStatus\(siteId, status\) \{/);
  assert.match(source, /method: "PATCH"/);
  assert.match(source, /export function archiveSite\(siteId\) \{\r?\n\s*return updateSiteStatus\(siteId, "archived"\);/);
  assert.match(source, /export function restoreSite\(siteId\) \{\r?\n\s*return updateSiteStatus\(siteId, "active"\);/);
});

test("Site Switcher hides archived sites", () => {
  const source = read("src/components/SiteContextBar.jsx");
  assert.match(source, /import \{[^}]*isArchivedSite[^}]*\} from "\.\.\/utils\/landingPlatform\/siteContext\.js";/);
  assert.match(source, /const switchableSites = companySites\.filter\(\(site\) => !isArchivedSite\(site\)\);/);
});

test("shell drops site context when a site is archived or restored session", () => {
  const source = read("src/CPanelApp.jsx");

  assert.match(source, /function handleSiteStatusChanged\(updatedSite\) \{/);
  assert.match(source, /if \(!isArchivedSite\(updatedSite\)\) return;/);
  assert.match(source, /onSiteStatusChanged=\{handleSiteStatusChanged\}/);

  // Session restore: SITE_ARCHIVED on the stored site → drop context + back to My Sites.
  assert.match(source, /siteArchived = error\?\.code === "SITE_ARCHIVED";/);
  assert.match(source, /else if \(siteArchived\) \{/);
  assert.match(source, /setSiteContext\(null\);\r?\n\s*navigate\("admin-sites", \{ replace: true \}\);/);
});
