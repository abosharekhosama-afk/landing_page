import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tenantNavigation } from "../src/data/adminNavigation.js";
import {
  buildWebsiteContentWorkspace,
  contentSlotCreatePayload,
  CONTENT_SLOT_CATALOGS,
  groupContentSlotsByPage,
  missingContentSlots,
  resolveContentSlots,
  websiteTextLocation,
} from "../src/data/websiteTextSlots.js";
import { canonicalAdminPageKey, resolvePage } from "../src/utils/cpanelAccess.js";
import { moduleAllowsPage } from "../src/utils/moduleRegistry.js";
import { canAccessAdminPage } from "../src/utils/roles.js";
import {
  additionalLanguagesFromCompany,
  originalLanguageFromCompany,
  resolveWebsiteContentPage,
  websiteContentRoutes,
} from "../src/utils/websiteContent.js";

const websiteModule = { enabled: true, route: "/admin/website-texts" };
const modules = [websiteModule];
const company = { id: "icare", modules, settings: { direction: "rtl", language: "ar", locale: "ar-PS" } };
const companyAdmin = { role: "company_admin", activeCompany: company };
const scopedAdmin = { ...companyAdmin, globalRole: "super_admin", isCompanyScope: true };
const employee = { role: "employee", permissions: [], activeCompany: company };
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Website Content exposes two canonical tenant routes", () => {
  assert.deepEqual(websiteContentRoutes, {
    "admin-website-content-cms": "/admin/website-content/cms",
    "admin-website-content-multilingual": "/admin/website-content/multilingual",
  });
  for (const [page, path] of Object.entries(websiteContentRoutes)) {
    assert.equal(resolveWebsiteContentPage(path), page);
    assert.equal(resolvePage(path, companyAdmin, modules), page);
    assert.equal(resolvePage(path, scopedAdmin, modules), page);
  }
});

test("tenant Website Texts route remains canonical while legacy placeholder routes canonicalize", () => {
  assert.equal(resolvePage("/admin/website-texts", companyAdmin, modules), "admin-website-texts");
  assert.equal(resolvePage("/admin/coming-soon/website-content/multilingual", companyAdmin, modules), "admin-website-content-multilingual");
  assert.equal(canonicalAdminPageKey("admin-website-texts"), "admin-website-texts");
  assert.equal(canonicalAdminPageKey("admin-tenant-placeholder-website-content-multilingual"), "admin-website-content-multilingual");
});

test("Website Content navigation exposes sites, page text, media, CMS, and Multilingual", () => {
  const group = tenantNavigation.find((item) => item.id === "tenant-website-content");
  assert.deepEqual(group.children.map((item) => item.pageKey), [
    "admin-sites",
    "admin-website-texts",
    "admin-website-media",
    "admin-homepage-offers",
    "admin-website-content-cms",
    "admin-website-content-multilingual",
  ]);
  assert.deepEqual(
    group.children.find((item) => item.pageKey === "admin-website-media")?.label,
    { en: "Media", ar: "الوسائط" },
  );
  assert.ok(group.children.every((item) => item.existing && !item.placeholder));
});

test("existing website module gates both pages and unauthorized users get No Access", () => {
  for (const page of Object.keys(websiteContentRoutes)) {
    assert.equal(moduleAllowsPage(modules, page), true);
    assert.equal(canAccessAdminPage(companyAdmin, page), true);
    assert.equal(canAccessAdminPage(employee, page), false);
    assert.equal(resolvePage(websiteContentRoutes[page], employee, modules), "admin-no-access");
  }
});

test("Multilingual derives only real company language configuration", () => {
  assert.deepEqual(originalLanguageFromCompany(company, "en"), {
    code: "ar",
    direction: "rtl",
    locale: "ar-PS",
    name: "Arabic",
  });
  assert.deepEqual(additionalLanguagesFromCompany(company, "en"), []);
  const configured = { settings: { language: "en", locale: "en-US", supportedLanguages: [
    { code: "fr", name: "French", status: "draft" },
    { code: "de", translationProgress: 42 },
  ] } };
  const rows = additionalLanguagesFromCompany(configured, "en");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "draft");
  assert.equal(rows[0].progress, null);
  assert.equal(rows[1].progress, 42);
});

test("generic content slots group by page and section from config", () => {
  const siteA = {
    settings: {
      websiteContent: {
        slots: [
          { key: "home.hero.title", page: "Home", section: "Hero", label: "Hero title" },
          { key: "about.intro", page: "About", section: "Intro", label: "About intro" },
          { key: "contact.email", page: "Contact", section: "Form", label: "Email" },
        ],
      },
    },
  };
  const siteB = {
    settings: {
      websiteContent: {
        slots: [
          { key: "home.welcome", page: "Home", section: "Hero", label: "Welcome" },
          { key: "news.heading", page: "News", section: "Header", label: "News heading" },
          { key: "faq.q1", page: "FAQ", section: "Questions", label: "Question 1" },
          { key: "footer.note", page: "Footer", section: "Footer", label: "Footer note" },
        ],
      },
    },
  };

  const pagesA = groupContentSlotsByPage(resolveContentSlots(siteA)).map((entry) => entry.page);
  const pagesB = groupContentSlotsByPage(resolveContentSlots(siteB)).map((entry) => entry.page);
  assert.deepEqual(pagesA, ["Home", "About", "Contact"]);
  assert.deepEqual(pagesB, ["Home", "News", "FAQ", "Footer"]);

  const workspaceA = buildWebsiteContentWorkspace(siteA, [{ key: "home.hero.title", valueEn: "Hi", valueAr: "مرحبا" }]);
  assert.equal(workspaceA.existing.length, 1);
  assert.equal(workspaceA.missing.length, 2);
  assert.equal(workspaceA.existing[0].location.field, "Hero title");
  assert.ok(workspaceA.missing.every((slot) => slot.status === "missing"));
  assert.equal(workspaceA.pages.includes("About"), true);

  const workspaceB = buildWebsiteContentWorkspace(siteB, []);
  assert.equal(workspaceB.existing.length, 0);
  assert.equal(workspaceB.missingCount, 4);
  assert.deepEqual(workspaceB.pages, ["FAQ", "Footer", "Home", "News"]);
});

test("create missing slot payload stays empty (no fake marketing copy)", () => {
  const payload = contentSlotCreatePayload({
    key: "home.hero.title",
    page: "Home",
    section: "Hero",
    label: "Hero title",
  });
  assert.equal(payload.valueEn, "");
  assert.equal(payload.valueAr, "");
  assert.equal(payload.key, "home.hero.title");
  assert.match(JSON.stringify(payload), /"valueEn":""/);
  assert.doesNotMatch(JSON.stringify(payload), /Velvet|copyright|Welcome to/i);
});

test("catalog attach is config or existing-key driven, never companyId", () => {
  const blank = resolveContentSlots({ id: "any-tenant", settings: {} }, []);
  assert.deepEqual(blank, []);

  const viaCatalogId = resolveContentSlots({
    settings: { websiteContent: { slotCatalog: "storefront-copy-v1" } },
  }, []);
  assert.ok(viaCatalogId.some((slot) => slot.key === "copy.footer.tagline"));
  assert.ok(viaCatalogId.some((slot) => slot.key === "news.0.title"));

  const viaExistingKeys = resolveContentSlots(
    { id: "other-tenant", settings: {} },
    [{ key: "copy.contact.submit" }],
  );
  assert.ok(viaExistingKeys.some((slot) => slot.key === "copy.contact.submit"));
  assert.equal(
    missingContentSlots(viaExistingKeys, [{ key: "copy.contact.submit" }]).some((slot) => slot.key === "copy.contact.submit"),
    false,
  );
});

test("human-readable location prefers slot metadata over raw keys", () => {
  const location = websiteTextLocation(
    { key: "news.0.title", label: "legacy" },
    { page: "News", section: "Cards", label: "Card 1 title" },
  );
  assert.deepEqual(location, { page: "News", section: "Cards", field: "Card 1 title" });
});

test("shared slot registry has no storefront tenant hardcoding", async () => {
  const slots = await read("../src/data/websiteTextSlots.js");
  assert.doesNotMatch(slots, /kids-velvet|eb-chemical|iPlay|i-play|Velvet Kids/i);
  assert.doesNotMatch(slots, /companyId\s*===|siteId\s*===|if\s*\(\s*company\.id/);
  assert.doesNotMatch(slots, /valueEn:\s*"[^"]{3,}"/);
});

test("Website Texts workspace is manager-oriented and config-driven", async () => {
  const page = await read("../src/pages/AdminFeaturePage.jsx");
  assert.match(page, /endpoint: "\/admin\/website-texts"/);
  assert.match(page, /buildWebsiteContentWorkspace/);
  assert.match(page, /contentSlotCreatePayload/);
  assert.match(page, /website-texts-workspace/);
  assert.match(page, /valueEn/);
  assert.match(page, /valueAr/);
  assert.match(page, /labels\.missing/);
  assert.match(page, /labels\.existing/);
  assert.match(page, /Add \$\{count\} missing texts/);
  assert.match(page, /website_texts\.manage/);
  assert.match(page, /website_media\.manage/);
  assert.match(page, /admin-website-media/);
  assert.match(page, /View only/);
  assert.match(page, /dir=\{ar \? "rtl" : "ltr"\}/);
  assert.doesNotMatch(page, /kids-velvet|eb-chemical|iPlay|i-play/i);
  assert.doesNotMatch(page, /companyId\s*===|siteId\s*===/);
  assert.doesNotMatch(page, /missingStorefrontTextSlots/);
});

test("Website Texts CSS covers workspace responsive layout", async () => {
  const css = await read("../src/styles/global.css");
  assert.match(css, /\.website-texts-workspace/);
  assert.match(css, /\.website-texts-page-nav/);
  assert.match(css, /\.website-texts-card\.is-missing/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("CMS and Multilingual render distinct reference structures without fabricated records", async () => {
  const page = await read("../src/pages/AdminWebsiteContentPage.jsx");
  assert.match(page, /Your Collections/);
  assert.match(page, /Form Collections/);
  assert.match(page, /Create a collection/);
  assert.match(page, /Original language/);
  assert.match(page, /Additional languages/);
  assert.match(page, /multilingual-table-wrap/);
  assert.match(page, /additionalLanguagesFromCompany\(company/);
  assert.doesNotMatch(page, /10,000|Enter Contest|Contact 2|German|translated words|word count/i);
});

test("Category editor preserves English and Arabic values independently", async () => {
  const dashboard = await read("../src/pages/AdminDashboardPage.jsx");
  assert.match(dashboard, /nameEn: current\?\.name\?\.en/);
  assert.match(dashboard, /nameAr: current\?\.name\?\.ar/);
  assert.match(dashboard, /descriptionEn: current\?\.description\?\.en/);
  assert.match(dashboard, /descriptionAr: current\?\.description\?\.ar/);
  assert.match(dashboard, /name: createLocalizedCopy\(form\.nameEn, form\.nameAr\)/);
  assert.match(dashboard, /description: form\.descriptionEn \|\| form\.descriptionAr \? createLocalizedCopy\(form\.descriptionEn, form\.descriptionAr\)/);
  assert.match(dashboard, /name: "nameAr"[\s\S]*?dir: "rtl"/);
  assert.doesNotMatch(dashboard, /name: createLocalizedCopy\(form\.name, form\.name\)/);
});

test("unsupported Website Content actions use the shared bilingual flow", async () => {
  const page = await read("../src/pages/AdminWebsiteContentPage.jsx");
  assert.match(page, /UnsupportedDialog/);
  assert.match(page, /onUnsupported/);
  assert.doesNotMatch(page, /apiRequest|fetch\(|localStorage|sessionStorage/);
});

test("CPanel owns Website Content routing and preserves the company shell", async () => {
  const app = await read("../src/CPanelApp.jsx");
  const page = await read("../src/pages/AdminWebsiteContentPage.jsx");
  assert.match(app, /\.\.\.websiteContentRoutes/);
  assert.match(app, /websiteContentPageKeys\.includes\(activePage\)/);
  assert.match(app, /AdminWebsiteContentPage activePage=\{activePage\} \{\.\.\.sharedLayoutProps\}/);
  assert.match(page, /ManagementShell[\s\S]*?company=\{company\}/);
  assert.doesNotMatch(page, /window\.history|pushState|replaceState/);
});

test("Website Content CSS is one scoped responsive RTL/LTR section", async () => {
  const css = await read("../src/styles/global.css");
  const marker = "/* Tenant Website Content pages */";
  assert.equal(css.split(marker).length - 1, 1);
  const section = css.slice(css.indexOf(marker), css.indexOf("/*", css.indexOf(marker) + marker.length));
  assert.match(section, /\.website-content-page/);
  assert.match(section, /margin-inline|padding-inline|border-inline/);
  assert.match(section, /\[dir="rtl"\]/);
  assert.match(section, /@media \(max-width: 700px\)/);
});

test("corrected Settings hub remains vertical and the legacy form stays removed", async () => {
  const settings = await read("../src/pages/AdminSettingsPage.jsx");
  const dashboard = await read("../src/pages/AdminDashboardPage.jsx");
  const css = await read("../src/styles/global.css");
  assert.match(settings, /settings-hub-list/);
  assert.doesNotMatch(settings, /settings-hub-grid/);
  assert.doesNotMatch(dashboard, /function SettingsPage|Save Company Settings|case "admin-settings"/);
  assert.doesNotMatch(css, /\.settings-hub-grid/);
});

test("storefront-copy-v1 catalog remains metadata-only", () => {
  const catalog = CONTENT_SLOT_CATALOGS["storefront-copy-v1"];
  assert.ok(catalog.length > 10);
  for (const slot of catalog) {
    assert.ok(slot.key && slot.page && slot.section && slot.label);
    assert.equal(Object.hasOwn(slot, "valueEn"), false);
  }
});
