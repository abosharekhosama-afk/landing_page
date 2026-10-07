import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
const unitStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-site-manifest-unit-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.DATA_STORE_DIR = unitStoreDir;
process.env.SITE_EDITOR_DRAFT_STORE_DIR = path.join(unitStoreDir, "editor-drafts");

const { buildLegacyIcareManifest } = await import("../src/siteEditor/icareLegacyManifestProvider.js");
const {
  buildEditorPageDescriptor,
  manifestPageToDocument,
  validateSiteManifest,
} = await import("../src/siteEditor/siteManifest.js");
const { validatePageDocument } = await import("../src/siteEditor/schema.js");
const { assertManifestMatchesCompany, validateConnectionUrl } = await import("../src/siteEditor/websiteConnection.js");

const now = "2026-07-30T00:00:00.000Z";

function validManifest(overrides = {}) {
  return {
    schemaVersion: "1.0",
    companyId: "mock-brand",
    siteId: "mock-brand-storefront",
    siteName: "Mock Brand",
    baseUrl: "https://mock-brand.example",
    routePrefix: "/",
    defaultLocale: "en",
    supportedLocales: ["en", "ar"],
    generatedAt: now,
    pages: [
      {
        id: "home",
        route: "/",
        pageType: "standard",
        title: { en: "Home", ar: "الرئيسية" },
        navigationVisible: true,
        parentId: null,
        order: 0,
        editable: true,
        sections: [
          {
            id: "hero",
            sectionType: "hero",
            order: 0,
            editable: true,
            layout: { sourceComponent: "app/mock/components/Hero.tsx" },
            responsive: {},
            elements: [
              { id: "hero-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "Hello" }, ar: { text: "مرحبا" } }, source: null, styles: { alignment: "start" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

test("site manifest schema validation", async (t) => {
  await t.test("accepts a well-formed manifest", () => {
    const result = validateSiteManifest(validManifest());
    assert.equal(result.schemaVersion, "1.0");
    assert.equal(result.companyId, "mock-brand");
    assert.equal(result.pages.length, 1);
  });

  await t.test("rejects invalid schema versions, missing identity, and unsupported page types", () => {
    assert.throws(() => validateSiteManifest(validManifest({ schemaVersion: "0.9" })), /schema/i);
    assert.throws(() => validateSiteManifest(validManifest({ companyId: "" })), /companyId/i);
    assert.throws(() => validateSiteManifest(validManifest({ siteId: "" })), /siteId/i);
    assert.throws(() => validateSiteManifest(validManifest({
      pages: [{ ...validManifest().pages[0], pageType: "bogus" }],
    })), /page/i);
  });

  await t.test("rejects duplicate page and section ids", () => {
    const duplicate = validManifest();
    duplicate.pages.push(duplicate.pages[0]);
    assert.throws(() => validateSiteManifest(duplicate), /duplicate/i);
    const duplicateSection = validManifest();
    duplicateSection.pages[0].sections.push(duplicateSection.pages[0].sections[0]);
    assert.throws(() => validateSiteManifest(duplicateSection), /duplicate/i);
  });

  await t.test("rejects cross-origin routes and missing localized titles", () => {
    assert.throws(() => validateSiteManifest(validManifest({
      pages: [{ ...validManifest().pages[0], route: "//evil.example" }],
    })), /route/i);
    assert.throws(() => validateSiteManifest(validManifest({
      pages: [{ ...validManifest().pages[0], title: { en: "" } }],
    })), /title/i);
  });
});

test("manifest company identity assertion", async (t) => {
  const company = { id: "mock-brand", slug: "mock-brand", name: "Mock Brand" };
  await t.test("accepts a manifest that matches the company", () => {
    assert.equal(assertManifestMatchesCompany(validManifest(), company), true);
  });
  await t.test("rejects a manifest for a different company", () => {
    assert.throws(() => assertManifestMatchesCompany(validManifest({ companyId: "someone-else" }), company), /company/i);
  });
  await t.test("rejects a manifest claiming another company's siteId", () => {
    assert.throws(() => assertManifestMatchesCompany(validManifest({ siteId: "another-brand-storefront" }), company), /site/i);
  });
  await t.test("rejects a remote manifest URL that does not match the authenticated company", () => {
    const companyA = { id: "a", slug: "a", name: "A" };
    const companyB = { id: "b", slug: "b", name: "B" };
    assert.throws(() => assertManifestMatchesCompany(validManifest({ companyId: "b", siteId: "b-storefront" }), companyA), /company/i);
  });
});

test("manifest URL validation", async () => {
  assert.equal(validateConnectionUrl("https://brand.example/site-manifest.json", "siteManifestUrl"), "https://brand.example/site-manifest.json");
  assert.throws(() => validateConnectionUrl("http://brand.example/site-manifest.json", "siteManifestUrl"), /https/i);
  assert.throws(() => validateConnectionUrl("javascript:alert(1)", "siteManifestUrl"), /https/i);
  assert.equal(validateConnectionUrl("", "siteManifestUrl"), "");
});

test("manifest URL local connection mode", async (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS;
  t.after(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousFlag === undefined) delete process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS;
    else process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS = previousFlag;
  });
  const setMode = (env, flag) => {
    process.env.NODE_ENV = env;
    if (flag === undefined) delete process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS;
    else process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS = flag;
  };

  await t.test("localhost HTTP is rejected without the flag", () => {
    setMode("development", undefined);
    assert.throws(() => validateConnectionUrl("http://localhost:3000/api/site-manifest", "siteManifestUrl"), /https/i);
  });

  await t.test("localhost HTTP is rejected when the flag is not exactly true", () => {
    setMode("development", "1");
    assert.throws(() => validateConnectionUrl("http://127.0.0.1:3000/api/site-manifest", "siteManifestUrl"), /https/i);
  });

  await t.test("localhost HTTP is accepted in development with the flag", () => {
    setMode("development", "true");
    assert.equal(validateConnectionUrl("http://localhost:3000/api/site-manifest", "siteManifestUrl"), "http://localhost:3000/api/site-manifest");
    assert.equal(validateConnectionUrl("http://127.0.0.1:3000/api/site-manifest", "siteManifestUrl"), "http://127.0.0.1:3000/api/site-manifest");
    assert.equal(validateConnectionUrl("http://[::1]:3000/api/site-manifest", "siteManifestUrl"), "http://[::1]:3000/api/site-manifest");
    assert.equal(validateConnectionUrl("http://localhost:3000/", "siteManifestUrl"), "http://localhost:3000");
    assert.equal(validateConnectionUrl("http://localhost:3000", "storefrontBaseUrl"), "http://localhost:3000");
  });

  await t.test("local HTTP with credentials is rejected even with the flag", () => {
    setMode("development", "true");
    assert.throws(() => validateConnectionUrl("http://user:pass@localhost:3000/api/site-manifest", "siteManifestUrl"), /https/i);
    assert.throws(() => validateConnectionUrl("https://user:pass@localhost:3000/api/site-manifest", "siteManifestUrl"), /https/i);
  });

  await t.test("non-local HTTP remains rejected even with the flag", () => {
    setMode("development", "true");
    assert.throws(() => validateConnectionUrl("http://brand.example/site-manifest.json", "siteManifestUrl"), /https/i);
    assert.throws(() => validateConnectionUrl("http://127.0.0.1.evil.example/site-manifest.json", "siteManifestUrl"), /https/i);
  });

  await t.test("HTTPS remains accepted everywhere", () => {
    setMode("production", "true");
    assert.equal(validateConnectionUrl("https://brand.example/site-manifest.json", "siteManifestUrl"), "https://brand.example/site-manifest.json");
    assert.equal(validateConnectionUrl("https://localhost/site-manifest.json", "siteManifestUrl"), "https://localhost/site-manifest.json");
    setMode("development", "true");
    assert.equal(validateConnectionUrl("https://127.0.0.1/site-manifest.json", "siteManifestUrl"), "https://127.0.0.1/site-manifest.json");
  });

  await t.test("production rejects localhost even when the flag is present", () => {
    setMode("production", "true");
    assert.throws(() => validateConnectionUrl("http://localhost:3000/api/site-manifest", "siteManifestUrl"), /https/i);
    assert.throws(() => validateConnectionUrl("http://127.0.0.1:3000/api/site-manifest", "siteManifestUrl"), /https/i);
    assert.throws(() => validateConnectionUrl("http://[::1]:3000/api/site-manifest", "siteManifestUrl"), /https/i);
  });

  await t.test("test environment rejects localhost even when the flag is present", () => {
    setMode("test", "true");
    assert.throws(() => validateConnectionUrl("http://localhost:3000/api/site-manifest", "siteManifestUrl"), /https/i);
  });
});

test("manifest baseUrl local connection mode", async (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS;
  t.after(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousFlag === undefined) delete process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS;
    else process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS = previousFlag;
  });
  const setMode = (env, flag) => {
    process.env.NODE_ENV = env;
    if (flag === undefined) delete process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS;
    else process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS = flag;
  };
  const manifestWithBaseUrl = (baseUrl) => validManifest({ baseUrl });

  await t.test("localhost HTTP baseUrl is rejected without the flag", () => {
    setMode("development", undefined);
    assert.throws(() => validateSiteManifest(manifestWithBaseUrl("http://localhost:3000")), /https/i);
  });

  await t.test("localhost HTTP baseUrl is accepted in development with the flag", () => {
    setMode("development", "true");
    const normalized = validateSiteManifest(manifestWithBaseUrl("http://localhost:3000"));
    assert.equal(normalized.baseUrl, "http://localhost:3000");
    const ipv4 = validateSiteManifest(manifestWithBaseUrl("http://127.0.0.1:3000"));
    assert.equal(ipv4.baseUrl, "http://127.0.0.1:3000");
    const ipv6 = validateSiteManifest(manifestWithBaseUrl("http://[::1]:3000"));
    assert.equal(ipv6.baseUrl, "http://[::1]:3000");
  });

  await t.test("production rejects localhost HTTP baseUrl even with the flag", () => {
    setMode("production", "true");
    assert.throws(() => validateSiteManifest(manifestWithBaseUrl("http://localhost:3000")), /https/i);
  });

  await t.test("test environment rejects localhost HTTP baseUrl even with the flag", () => {
    setMode("test", "true");
    assert.throws(() => validateSiteManifest(manifestWithBaseUrl("http://127.0.0.1:3000")), /https/i);
  });

  await t.test("non-local HTTP baseUrl is rejected even with the flag", () => {
    setMode("development", "true");
    assert.throws(() => validateSiteManifest(manifestWithBaseUrl("http://brand.example")), /https/i);
  });

  await t.test("HTTPS baseUrl remains accepted everywhere", () => {
    setMode("production", "true");
    assert.equal(validateSiteManifest(manifestWithBaseUrl("https://brand.example/")).baseUrl, "https://brand.example");
    setMode("development", "true");
    assert.equal(validateSiteManifest(manifestWithBaseUrl("https://localhost/")).baseUrl, "https://localhost");
  });

  await t.test("credentials are rejected in baseUrl even with the flag", () => {
    setMode("development", "true");
    assert.throws(() => validateSiteManifest(manifestWithBaseUrl("http://user:pass@localhost:3000")), /https/i);
    assert.throws(() => validateSiteManifest(manifestWithBaseUrl("https://user:pass@brand.example")), /https/i);
  });

  await t.test("companyId and siteId validation is unchanged", () => {
    setMode("development", "true");
    assert.throws(() => validateSiteManifest(validManifest({ baseUrl: "http://localhost:3000", companyId: "" })), /companyId/i);
    assert.throws(() => validateSiteManifest(validManifest({ baseUrl: "http://localhost:3000", siteId: "" })), /siteId/i);
    const normalized = validateSiteManifest(validManifest({ baseUrl: "http://localhost:3000" }));
    assert.equal(normalized.companyId, "mock-brand");
    assert.equal(normalized.siteId, "mock-brand-storefront");
  });
});

test("adding a page or section to a manifest is reflected without registry changes", async (t) => {
  await t.test("a newly added manifest page appears in the editor page list", () => {
    const manifest = validManifest();
    manifest.pages.push({
      id: "vlog",
      route: "/vlog",
      pageType: "standard",
      title: { en: "Vlog", ar: "مدونة" },
      navigationVisible: true,
      parentId: null,
      order: 1,
      editable: true,
      sections: [],
    });
    const normalized = validateSiteManifest(manifest);
    const page = normalized.pages.find((entry) => entry.id === "vlog");
    const descriptor = buildEditorPageDescriptor(page, normalized, { companyId: "mock-brand", locale: "en" });
    assert.equal(descriptor.id, "vlog");
    assert.equal(descriptor.routePattern, "/vlog");
    assert.equal(descriptor.isEditable, true);
    const document = manifestPageToDocument(page, normalized, { companyId: "mock-brand", locale: "en" });
    assert.equal(document.pageId, "vlog");
    assert.equal(document.previewPath, "/vlog");
  });

  await t.test("a newly added section to an existing page appears in the document", () => {
    const manifest = validManifest();
    manifest.pages[0].sections.push({
      id: "reviews",
      sectionType: "reviews",
      order: 1,
      editable: true,
      layout: { sourceComponent: "app/mock/components/Reviews.tsx" },
      responsive: {},
      elements: [],
    });
    const normalized = validateSiteManifest(manifest);
    const document = manifestPageToDocument(normalized.pages[0], normalized, { companyId: "mock-brand", locale: "en" });
    assert.equal(document.sections.length, 2);
    assert.equal(document.sections[1].id, "reviews");
    assert.equal(document.sections[1].type, "reviews");
    assert.equal(document.sections[1].settings.sourceComponent, "app/mock/components/Reviews.tsx");
  });

  await t.test("same page id across two tenants produces isolated documents", () => {
    const first = validateSiteManifest(validManifest());
    const second = validateSiteManifest(validManifest({
      companyId: "second-brand",
      siteId: "second-brand-storefront",
      baseUrl: "https://second-brand.example",
      pages: [{
        ...validManifest().pages[0],
        title: { en: "Second Home", ar: "الرئيسية الثانية" },
        sections: [{
          id: "hero",
          sectionType: "hero",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/second/components/Hero.tsx" },
          responsive: {},
          elements: [],
        }],
      }],
    }));
    const firstDocument = manifestPageToDocument(first.pages[0], first, { companyId: "mock-brand", locale: "en" });
    const secondDocument = manifestPageToDocument(second.pages[0], second, { companyId: "second-brand", locale: "en" });
    assert.equal(firstDocument.pageId, "home");
    assert.equal(secondDocument.pageId, "home");
    assert.equal(firstDocument.companyId, "mock-brand");
    assert.equal(secondDocument.companyId, "second-brand");
    assert.equal(firstDocument.title, "Home");
    assert.equal(secondDocument.title, "Second Home");
    assert.notEqual(firstDocument.sections[0].settings.sourceComponent, secondDocument.sections[0].settings.sourceComponent);
  });
});

test("legacy iCare provider only serves the legacy tenant", async (t) => {
  await t.test("builds a manifest for the icare company with all pages and home sections", () => {
    const manifest = buildLegacyIcareManifest({ id: "icare", slug: "icare", name: "iCare" });
    assert.equal(manifest.siteId, "icare-storefront");
    assert.equal(manifest.routePrefix, "/icare");
    assert.deepEqual(manifest.pages.map((page) => page.id), ["home", "shop", "story", "find-us", "faq", "contact", "shipping", "privacy", "terms", "accessibility"]);
    assert.equal(manifest.pages[0].sections.length, 7);
    assert.deepEqual(manifest.pages[0].sections.map((section) => section.sectionType), ["hero", "productCollection", "promo", "philosophy", "productCollection", "social", "commitment"]);
  });
  await t.test("does not build for a non-icare company and never when a manifest URL is configured", () => {
    assert.equal(buildLegacyIcareManifest({ id: "eb-chemical", slug: "eb-chemical", name: "EB" }), null);
    assert.equal(buildLegacyIcareManifest({ id: "icare", slug: "icare", name: "iCare", settings: { websiteConnection: { siteManifestUrl: "https://x.example/m.json" } } }), null);
  });
});

test("manifest editability survives into the editor document", async (t) => {
  const manifest = validManifest();
  manifest.pages[0].sections[0].elements.push({
    id: "nested-card",
    elementType: "container",
    order: 1,
    editable: true,
    content: { en: {}, ar: {} },
    source: null,
    styles: {},
    responsive: {},
    validation: {},
    editableProperties: [],
    children: [
      { id: "nested-text", elementType: "text", order: 0, editable: false, content: { en: { text: "Locked" }, ar: { text: "مقفل" } }, source: null, styles: {}, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
    ],
  });
  const normalized = validateSiteManifest(manifest);
  const document = manifestPageToDocument(normalized.pages[0], normalized, { companyId: "mock-brand", locale: "en" });

  await t.test("section and element editability flags are preserved", () => {
    assert.equal(document.sections[0].editable, true);
    assert.equal(document.sections[0].elements[0].editable, true);
    assert.equal(document.sections[0].elements[0].settings.editableProperties[0], "content");
  });

  await t.test("empty editableProperties survive as an explicit array", () => {
    assert.deepEqual(document.sections[0].elements[1].settings.editableProperties, []);
  });

  await t.test("a non-editable section disables every descendant", () => {
    const locked = validManifest();
    locked.pages[0].sections[0].editable = false;
    locked.pages[0].sections[0].elements[0].editable = true;
    const normalizedLocked = validateSiteManifest(locked);
    const lockedDocument = manifestPageToDocument(normalizedLocked.pages[0], normalizedLocked, { companyId: "mock-brand", locale: "en" });
    assert.equal(lockedDocument.sections[0].editable, false);
    assert.equal(lockedDocument.sections[0].elements[0].editable, false);
  });

  await t.test("an element editable: false stays locked even in an editable section", () => {
    assert.equal(document.sections[0].elements[1].editable, true);
    assert.equal(document.sections[0].elements[1].children[0].editable, false);
  });

  await t.test("validatePageDocument round-trips the editable flags", () => {
    const roundTripped = validatePageDocument(document, {
      companyId: "mock-brand",
      pageId: document.pageId,
      previewPath: document.previewPath,
      routePattern: document.routePattern,
    });
    assert.equal(roundTripped.sections[0].editable, true);
    assert.equal(roundTripped.sections[0].elements[1].children[0].editable, false);
  });
});

test("migration 017 additively scopes editor drafts by site", () => {
  const base = path.resolve(import.meta.dirname, "../supabase/migrations");
  const migration016 = fs.readFileSync(path.join(base, "016_company_site_editor_drafts.sql"), "utf8");
  const migration017 = fs.readFileSync(path.join(base, "017_site_editor_drafts_site_scope.sql"), "utf8");
  assert.match(migration016, /unique \(company_id, page_id, locale\)/);
  assert.match(migration017, /add constraint company_site_editor_drafts_site_scope_key\s+unique \(company_id, site_id, page_id, locale\)/);
  assert.match(migration017, /drop constraint if exists company_site_editor_drafts_company_id_page_id_locale_key/);
  assert.match(migration017, /create index if not exists idx_company_site_editor_drafts_site_lookup/);
  assert.doesNotMatch(migration017, /drop table|truncate|delete from|create table/i);
});

function validSectionLibrary() {
  return {
    version: "1",
    blankSection: { enabled: true, sectionType: "content" },
    categories: [
      { id: "welcome", title: { en: "Welcome", ar: "ترحيب" }, icon: "home", order: 0 },
      { id: "store", title: { en: "Store", ar: "المتجر" }, order: 1 },
    ],
    templates: [
      {
        templateId: "hero-overlay",
        categoryId: "welcome",
        sectionType: "hero",
        layoutVariant: "overlay",
        title: { en: "Hero with Image Overlay", ar: "ترحيب بصورة خلفية" },
        description: { en: "Full-bleed image with centered copy", ar: "صورة بعرض كامل" },
        thumbnail: "https://mock-brand.example/media/hero-overlay.jpg",
        pageTypes: ["standard"],
        capabilities: { requiresMedia: true },
        defaultSectionDocument: {
          id: "hero-overlay-section",
          sectionType: "hero",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/mock/components/Hero.tsx", contentAlignment: "center" },
          responsive: {},
          elements: [
            { id: "hero-overlay-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "Hello" }, ar: { text: "مرحبا" } }, source: null, styles: { alignment: "center" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
          ],
        },
      },
      {
        templateId: "store-grid",
        categoryId: "store",
        sectionType: "productCollection",
        layoutVariant: "grid",
        title: { en: "Product Grid", ar: "شبكة المنتجات" },
        thumbnail: "https://mock-brand.example/media/store-grid.jpg",
        pageTypes: ["standard", "dynamic"],
        capabilities: { requiresProducts: true },
        defaultSectionDocument: {
          id: "store-grid-section",
          sectionType: "productCollection",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/mock/components/Grid.tsx" },
          responsive: {},
          elements: [
            { id: "store-grid-collection", elementType: "productCollection", order: 0, editable: false, content: { source: "featured", limit: 8, columns: 4 }, source: { type: "collection", key: "featured" }, styles: {}, responsive: {}, validation: {}, editableProperties: [], children: [] },
          ],
        },
      },
    ],
  };
}

test("site manifest section library", async (t) => {
  await t.test("accepts a well-formed sectionLibrary and normalizes it", () => {
    const result = validateSiteManifest(validManifest({ sectionLibrary: validSectionLibrary() }));
    assert.equal(result.sectionLibrary.version, "1");
    assert.deepEqual(result.sectionLibrary.categories.map((category) => category.id), ["welcome", "store"]);
    assert.equal(result.sectionLibrary.blankSection.enabled, true);
    assert.equal(result.sectionLibrary.blankSection.sectionType, "content");
    assert.equal(result.sectionLibrary.templates[0].sectionType, "hero");
    assert.equal(result.sectionLibrary.templates[0].defaultSectionDocument.elements[0].content.en.text, "Hello");
  });

  await t.test("remains backward compatible when sectionLibrary is absent", () => {
    const result = validateSiteManifest(validManifest());
    assert.equal(result.sectionLibrary, null);
  });

  await t.test("rejects a template that references an unknown category", () => {
    const library = validSectionLibrary();
    library.templates[0].categoryId = "missing";
    assert.throws(() => validateSiteManifest(validManifest({ sectionLibrary: library })), /category/i);
  });

  await t.test("rejects a template whose section type differs from its defaultSectionDocument", () => {
    const library = validSectionLibrary();
    library.templates[0].sectionType = "promo";
    assert.throws(() => validateSiteManifest(validManifest({ sectionLibrary: library })), /match/i);
  });

  await t.test("rejects a thumbnail that is not a safe HTTPS URL", () => {
    const library = validSectionLibrary();
    library.templates[0].thumbnail = "http://mock-brand.example/media/hero-overlay.jpg";
    assert.throws(() => validateSiteManifest(validManifest({ sectionLibrary: library })), /https/i);
  });

  await t.test("filters template pageTypes to supported editable page types", () => {
    const library = validSectionLibrary();
    library.templates[0].pageTypes = ["standard", "system", "bogus"];
    const result = validateSiteManifest(validManifest({ sectionLibrary: library }));
    assert.deepEqual(result.sectionLibrary.templates[0].pageTypes, ["standard", "system"]);
  });

  await t.test("defaults blankSection to disabled when omitted", () => {
    const library = validSectionLibrary();
    delete library.blankSection;
    const result = validateSiteManifest(validManifest({ sectionLibrary: library }));
    assert.deepEqual(result.sectionLibrary.blankSection, { enabled: false });
  });

  await t.test("keeps product template content as configuration only", () => {
    const result = validateSiteManifest(validManifest({ sectionLibrary: validSectionLibrary() }));
    const collection = result.sectionLibrary.templates[1].defaultSectionDocument.elements[0];
    assert.equal(collection.elementType, "productCollection");
    assert.deepEqual(collection.content, { source: "featured", limit: 8, columns: 4 });
  });

  await t.test("product template configuration survives a draft round-trip", () => {
    const document = {
      id: "home:draft", companyId: "mock-brand", siteId: "mock-brand-storefront", pageId: "home",
      pageType: "standard", title: "Home", slug: "home", routePattern: "/", previewPath: "/",
      locale: "en", status: "draft", revision: 0,
      sections: [
        { id: "store-grid-section", type: "productCollection", order: 0, editable: true, settings: {}, styles: {}, responsive: {}, elements: [
          { id: "collection", type: "productCollection", content: { source: "featured", limit: 8, columns: 4, showPrice: true }, settings: {}, styles: {}, responsive: {}, children: [] },
        ] },
      ],
    };
    const roundTripped = validatePageDocument(document, { companyId: "mock-brand", pageId: "home", previewPath: "/", routePattern: "/" });
    assert.deepEqual(roundTripped.sections[0].elements[0].content, { source: "featured", limit: 8, columns: 4, showPrice: true });
  });
});

function validSiteDesign(overrides = {}) {
  return {
    version: "1",
    capabilities: {
      themes: true,
      colors: true,
      typography: false,
      pageBackgrounds: false,
      pageTransitions: false,
    },
    defaultThemeId: "mock-default",
    themePresets: [
      {
        themeId: "mock-default",
        name: { en: "Mock Default", ar: "افتراضي تجريبي" },
        description: { en: "A mock default theme", ar: "تصميم افتراضي تجريبي" },
        previewSwatches: ["#ffffff", "#151515", "#c79a6b"],
        colorTheme: {
          base: { primaryBackground: "#FFFFFF", secondaryBackground: "#f5f3ee" },
          general: { linesAndDividers: "#e6e2d9" },
          accent: { primary: "#151515", secondary: "#c79a6b", tertiary: "#e8d8c3", quaternary: "#f5f3ee" },
          text: { titles: "#151515", subtitles: "#6b655c", body: "#2a2118", secondary: "#7d7468", linksAndActions: "#b08048" },
          buttons: {
            primary: { background: "#151515", border: "#151515", text: "#ffffff" },
            secondary: { background: "#ffffff", border: "#151515", text: "#151515" },
          },
        },
      },
    ],
    ...overrides,
  };
}

function manifestWithSiteDesign(siteDesign) {
  return validManifest({ siteDesign });
}

function validTextThemePreset(overrides = {}) {
  return {
    textThemeId: "mock-text-default",
    name: { en: "Mock Text Default", ar: "نص افتراضي تجريبي" },
    description: { en: "A mock default text theme", ar: "نص افتراضي تجريبي" },
    styles: {
      display: { fontFamily: "system-sans", fontSizePx: 64, fontWeight: 500, lineHeight: 1.05, letterSpacingEm: -0.01 },
      heading1: { fontFamily: "system-sans", fontSizePx: 44, fontWeight: 500, lineHeight: 1.1, letterSpacingEm: -0.01 },
      heading2: { fontFamily: "system-sans", fontSizePx: 34, fontWeight: 500, lineHeight: 1.15, letterSpacingEm: 0 },
      heading3: { fontFamily: "system-sans", fontSizePx: 24, fontWeight: 600, lineHeight: 1.2, letterSpacingEm: 0 },
      body: { fontFamily: "system-sans", fontSizePx: 16, fontWeight: 400, lineHeight: 1.5, letterSpacingEm: 0 },
      small: { fontFamily: "system-sans", fontSizePx: 14, fontWeight: 400, lineHeight: 1.4, letterSpacingEm: 0.01 },
      button: { fontFamily: "system-sans", fontSizePx: 14, fontWeight: 600, lineHeight: 1, letterSpacingEm: 0.06 },
    },
    ...overrides,
  };
}

function validTextSiteDesign(overrides = {}) {
  return validSiteDesign({
    capabilities: { ...validSiteDesign().capabilities, typography: true },
    defaultTextThemeId: "mock-text-default",
    textThemePresets: [validTextThemePreset()],
    ...overrides,
  });
}

function validPageBackgroundPreset(overrides = {}) {
  return {
    pageBackgroundId: "mock-page-bg",
    name: { en: "Mock Page Background", ar: "خلفية صفحة تجريبية" },
    description: { en: "A mock page background", ar: "خلفية صفحة تجريبية" },
    background: {
      pageColor: "#F8F4EE",
      contentColor: "#ffffff",
      pattern: "none",
      patternColor: "#d9d1c5",
      patternOpacity: 0,
    },
    ...overrides,
  };
}

function validPageBackgroundSiteDesign(overrides = {}) {
  return validSiteDesign({
    capabilities: { ...validSiteDesign().capabilities, pageBackgrounds: true },
    defaultPageBackgroundId: "mock-page-bg",
    pageBackgroundPresets: [validPageBackgroundPreset()],
    ...overrides,
  });
}

test("site manifest siteDesign section", async (t) => {
  await t.test("remains backward compatible when siteDesign is absent", () => {
    const result = validateSiteManifest(validManifest());
    assert.equal(result.siteDesign, null);
  });

  await t.test("accepts a valid Phase 1 siteDesign and normalizes colors", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validSiteDesign()));
    assert.equal(result.siteDesign.version, "1");
    assert.equal(result.siteDesign.defaultThemeId, "mock-default");
    assert.equal(result.siteDesign.capabilities.themes, true);
    assert.equal(result.siteDesign.capabilities.colors, true);
    assert.equal(result.siteDesign.capabilities.typography, false);
    assert.equal(result.siteDesign.themePresets.length, 1);
    const preset = result.siteDesign.themePresets[0];
    assert.equal(preset.themeId, "mock-default");
    assert.equal(preset.name.en, "Mock Default");
    assert.equal(preset.name.ar, "افتراضي تجريبي");
    assert.deepEqual(preset.previewSwatches, ["#ffffff", "#151515", "#c79a6b"]);
    assert.equal(preset.colorTheme.base.primaryBackground, "#ffffff");
    assert.equal(preset.colorTheme.buttons.primary.background, "#151515");
    assert.equal(preset.colorTheme.buttons.secondary.text, "#151515");
  });

  await t.test("rejects duplicate theme ids", () => {
    const duplicates = validSiteDesign();
    duplicates.themePresets.push(duplicates.themePresets[0]);
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(duplicates)), /duplicate/i);
  });

  await t.test("rejects an unknown defaultThemeId", () => {
    const missing = validSiteDesign({ defaultThemeId: "does-not-exist" });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /unknown theme/i);
  });

  await t.test("rejects invalid hex colors", () => {
    const badColor = validSiteDesign();
    badColor.themePresets[0].colorTheme.accent.primary = "red";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(badColor)), /hex/i);
    const shortColor = validSiteDesign();
    shortColor.themePresets[0].previewSwatches = ["#fff"];
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(shortColor)), /hex/i);
  });

  await t.test("rejects unknown color properties", () => {
    const unknown = validSiteDesign();
    unknown.themePresets[0].colorTheme.text.extra = "#123456";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unknown)), /unknown colorTheme\.text property/i);
  });

  await t.test("rejects more than 20 themes", () => {
    const many = validSiteDesign({ themePresets: [] });
    for (let index = 0; index < 21; index += 1) {
      many.themePresets.push({
        themeId: `theme-${index}`,
        name: { en: `Theme ${index}`, ar: `تصميم ${index}` },
        description: { en: "", ar: `وصف ${index}` },
        previewSwatches: ["#ffffff"],
        colorTheme: {
          accent: { primary: "#123456" },
          buttons: { primary: { background: "#123456" }, secondary: { background: "#654321" } },
        },
      });
    }
    many.defaultThemeId = "theme-0";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(many)), /too many/i);
  });

  await t.test("rejects unsafe text or CSS-like values", () => {
    const unsafeName = validSiteDesign();
    unsafeName.themePresets[0].name.en = "<script>alert(1)</script>";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsafeName)), /plain text/i);
    const cssColor = validSiteDesign();
    cssColor.themePresets[0].colorTheme.accent.secondary = "url(https://evil.example/x.png)";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(cssColor)), /hex/i);
    const gradient = validSiteDesign();
    gradient.themePresets[0].colorTheme.base.primaryBackground = "linear-gradient(red, blue)";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(gradient)), /hex/i);
  });

  await t.test("siteDesign remains tenant-manifest data and is normalized only from the manifest", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validSiteDesign()));
    assert.equal(typeof result.siteDesign.defaultThemeId, "string");
    assert.deepEqual(
      result.siteDesign.themePresets.map((preset) => preset.themeId),
      ["mock-default"],
    );
    assert.ok(Object.keys(result.siteDesign).includes("themePresets"));
    assert.ok(!Object.keys(result.siteDesign).includes("css"));
  });

  await t.test("rejects an unknown top-level siteDesign property", () => {
    const extra = validSiteDesign({ css: { arbitrary: true } });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown siteDesign property/i);
  });

  await t.test("rejects an unknown theme preset property", () => {
    const extra = validSiteDesign();
    extra.themePresets[0].fontUpload = true;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown themePresets\[0\] property/i);
  });

  await t.test("rejects an unknown colorTheme group", () => {
    const extra = validSiteDesign();
    extra.themePresets[0].colorTheme.videoBackground = { color: "#000000" };
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown colorTheme property/i);
  });

  await t.test("rejects an unknown colorTheme.buttons property", () => {
    const extra = validSiteDesign();
    extra.themePresets[0].colorTheme.buttons.hover = { background: "#123456" };
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown colorTheme\.buttons property/i);
  });

  await t.test("rejects more than 8 preview swatches instead of truncating", () => {
    const manySwatches = validSiteDesign();
    manySwatches.themePresets[0].previewSwatches = [
      "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777", "#888888", "#999999",
    ];
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(manySwatches)), /too many preview swatches/i);
  });

  await t.test("rejects a missing required color group", () => {
    const missingGroup = validSiteDesign();
    delete missingGroup.themePresets[0].colorTheme.base;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missingGroup)), /colorTheme\.base must be a color object/i);
  });

  await t.test("rejects a missing required color key", () => {
    const missingKey = validSiteDesign();
    delete missingKey.themePresets[0].colorTheme.text.body;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missingKey)), /colorTheme\.text\.body is required/i);
    const missingButtonKey = validSiteDesign();
    delete missingButtonKey.themePresets[0].colorTheme.buttons.primary.border;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missingButtonKey)), /buttons\.primary\.border is required/i);
  });

  await t.test("keeps an existing siteDesign without typography valid and normalizes empty typography", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validSiteDesign()));
    assert.equal(result.siteDesign.defaultTextThemeId, "");
    assert.deepEqual(result.siteDesign.textThemePresets, []);
  });

  await t.test("accepts valid typography and normalizes text theme presets", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validTextSiteDesign()));
    assert.equal(result.siteDesign.capabilities.typography, true);
    assert.equal(result.siteDesign.defaultTextThemeId, "mock-text-default");
    assert.equal(result.siteDesign.textThemePresets.length, 1);
    const preset = result.siteDesign.textThemePresets[0];
    assert.equal(preset.textThemeId, "mock-text-default");
    assert.equal(preset.name.en, "Mock Text Default");
    assert.equal(preset.name.ar, "نص افتراضي تجريبي");
    assert.deepEqual(preset.styles.body, {
      fontFamily: "system-sans",
      fontSizePx: 16,
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacingEm: 0,
    });
    assert.equal(preset.styles.button.fontFamily, "system-sans");
  });

  await t.test("rejects an unknown text theme property", () => {
    const extra = validTextSiteDesign();
    extra.textThemePresets[0].fallbackFamily = "Inter";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown textThemePresets\[0\] property/i);
  });

  await t.test("rejects duplicate textThemeId", () => {
    const duplicates = validTextSiteDesign();
    duplicates.textThemePresets.push(duplicates.textThemePresets[0]);
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(duplicates)), /duplicate text theme id/i);
  });

  await t.test("rejects an unknown defaultTextThemeId", () => {
    const missing = validTextSiteDesign({ defaultTextThemeId: "does-not-exist" });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /unknown text theme/i);
  });

  await t.test("rejects an unsupported font family", () => {
    const unsupported = validTextSiteDesign();
    unsupported.textThemePresets[0].styles.body.fontFamily = "inter";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsupported)), /supported system font family/i);
  });

  await t.test("rejects a raw CSS font-family value", () => {
    const rawCss = validTextSiteDesign();
    rawCss.textThemePresets[0].styles.heading1.fontFamily = "'Helvetica Neue', Arial, sans-serif";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(rawCss)), /supported system font family/i);
  });

  await t.test("rejects a missing required style token", () => {
    const missingToken = validTextSiteDesign();
    delete missingToken.textThemePresets[0].styles.small;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missingToken)), /styles\.small is required/i);
  });

  await t.test("rejects a missing required style property", () => {
    const missingProp = validTextSiteDesign();
    delete missingProp.textThemePresets[0].styles.body.lineHeight;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missingProp)), /styles\.body\.lineHeight is required/i);
  });

  await t.test("rejects an unknown style token", () => {
    const unknownToken = validTextSiteDesign();
    unknownToken.textThemePresets[0].styles.caption = {
      fontFamily: "system-sans",
      fontSizePx: 12,
      fontWeight: 400,
      lineHeight: 1.3,
      letterSpacingEm: 0,
    };
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unknownToken)), /unknown textThemePresets\[0\]\.styles property/i);
  });

  await t.test("rejects invalid font sizes", () => {
    const tooSmall = validTextSiteDesign();
    tooSmall.textThemePresets[0].styles.body.fontSizePx = 9;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(tooSmall)), /allowed range \(10 to 96\)/i);
    const tooLarge = validTextSiteDesign();
    tooLarge.textThemePresets[0].styles.body.fontSizePx = 97;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(tooLarge)), /allowed range \(10 to 96\)/i);
    const nonInteger = validTextSiteDesign();
    nonInteger.textThemePresets[0].styles.body.fontSizePx = 16.5;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(nonInteger)), /integer pixel size/i);
    const stringSize = validTextSiteDesign();
    stringSize.textThemePresets[0].styles.body.fontSizePx = "16";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(stringSize)), /integer pixel size/i);
  });

  await t.test("rejects invalid font weights", () => {
    const lowWeight = validTextSiteDesign();
    lowWeight.textThemePresets[0].styles.body.fontWeight = 200;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(lowWeight)), /fontWeight must be one of 300, 400, 500, 600, 700, 800/i);
    const highWeight = validTextSiteDesign();
    highWeight.textThemePresets[0].styles.body.fontWeight = 900;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(highWeight)), /fontWeight must be one of 300, 400, 500, 600, 700, 800/i);
    const stringWeight = validTextSiteDesign();
    stringWeight.textThemePresets[0].styles.body.fontWeight = "500";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(stringWeight)), /fontWeight must be one of 300, 400, 500, 600, 700, 800/i);
  });

  await t.test("rejects invalid line heights", () => {
    const lowHeight = validTextSiteDesign();
    lowHeight.textThemePresets[0].styles.body.lineHeight = 0.5;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(lowHeight)), /allowed range \(1 to 2\)/i);
    const highHeight = validTextSiteDesign();
    highHeight.textThemePresets[0].styles.body.lineHeight = 2.5;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(highHeight)), /allowed range \(1 to 2\)/i);
    const stringHeight = validTextSiteDesign();
    stringHeight.textThemePresets[0].styles.body.lineHeight = "1.5";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(stringHeight)), /must be a number/i);
  });

  await t.test("rejects invalid letter spacing", () => {
    const lowSpacing = validTextSiteDesign();
    lowSpacing.textThemePresets[0].styles.body.letterSpacingEm = -0.2;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(lowSpacing)), /allowed range \(-0\.1 to 0\.3\)/i);
    const highSpacing = validTextSiteDesign();
    highSpacing.textThemePresets[0].styles.body.letterSpacingEm = 0.5;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(highSpacing)), /allowed range \(-0\.1 to 0\.3\)/i);
    const stringSpacing = validTextSiteDesign();
    stringSpacing.textThemePresets[0].styles.body.letterSpacingEm = "0";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(stringSpacing)), /must be a number/i);
  });

  await t.test("rejects more than 12 text theme presets", () => {
    const many = validTextSiteDesign({ textThemePresets: [] });
    for (let index = 0; index < 13; index += 1) {
      many.textThemePresets.push(validTextThemePreset({ textThemeId: `text-${index}` }));
    }
    many.defaultTextThemeId = "text-0";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(many)), /too many text theme presets/i);
  });

  await t.test("rejects HTML, URL, script, CSS function, and variable values", () => {
    const unsafeName = validTextSiteDesign();
    unsafeName.textThemePresets[0].name.en = "<script>alert(1)</script>";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsafeName)), /plain text/i);
    const urlFont = validTextSiteDesign();
    urlFont.textThemePresets[0].styles.body.fontFamily = "url(https://evil.example/font.woff2)";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(urlFont)), /supported system font family/i);
    const cssVar = validTextSiteDesign();
    cssVar.textThemePresets[0].styles.body.fontFamily = "var(--font-body)";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(cssVar)), /supported system font family/i);
    const cssFunction = validTextSiteDesign();
    cssFunction.textThemePresets[0].styles.body.fontFamily = "calc(16px + 2vw)";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(cssFunction)), /supported system font family/i);
    const unsafeDescription = validTextSiteDesign();
    unsafeDescription.textThemePresets[0].description.ar = "<img src=x onerror=alert(1)>";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsafeDescription)), /plain text/i);
  });

  await t.test("rejects malformed typography instead of truncating", () => {
    const nonArray = validTextSiteDesign({ textThemePresets: "not-an-array" });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(nonArray)), /textThemePresets must be an array/i);
    const notObject = validTextSiteDesign();
    notObject.textThemePresets[0] = 42;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(notObject)), /textThemePresets\[0\] must be an object/i);
    const missingStyles = validTextSiteDesign();
    delete missingStyles.textThemePresets[0].styles;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missingStyles)), /styles must be an object/i);
  });
});

test("site manifest siteDesign page backgrounds", async (t) => {
  await t.test("existing siteDesign without Page Backgrounds remains valid", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validSiteDesign()));
    assert.equal(result.siteDesign.defaultThemeId, "mock-default");
    assert.equal(result.siteDesign.themePresets.length, 1);
    assert.equal(result.siteDesign.capabilities.pageBackgrounds, false);
  });

  await t.test("missing Page Backgrounds normalize to empty ID and empty array", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validSiteDesign()));
    assert.equal(result.siteDesign.defaultPageBackgroundId, "");
    assert.deepEqual(result.siteDesign.pageBackgroundPresets, []);
  });

  await t.test("a valid Page Background preset normalizes correctly", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validPageBackgroundSiteDesign()));
    assert.equal(result.siteDesign.capabilities.pageBackgrounds, true);
    assert.equal(result.siteDesign.defaultPageBackgroundId, "mock-page-bg");
    assert.equal(result.siteDesign.pageBackgroundPresets.length, 1);
    const preset = result.siteDesign.pageBackgroundPresets[0];
    assert.equal(preset.pageBackgroundId, "mock-page-bg");
    assert.equal(preset.name.en, "Mock Page Background");
    assert.equal(preset.name.ar, "خلفية صفحة تجريبية");
    assert.equal(preset.description.en, "A mock page background");
    assert.equal(preset.background.pageColor, "#f8f4ee");
    assert.equal(preset.background.contentColor, "#ffffff");
    assert.equal(preset.background.pattern, "none");
    assert.equal(preset.background.patternColor, "#d9d1c5");
    assert.equal(preset.background.patternOpacity, 0);
  });

  await t.test("hex colors normalize to lowercase", () => {
    const custom = validPageBackgroundSiteDesign();
    custom.pageBackgroundPresets[0].background.pageColor = "#AB12EF";
    custom.pageBackgroundPresets[0].background.patternColor = "#ABCDEF";
    const result = validateSiteManifest(manifestWithSiteDesign(custom));
    assert.equal(result.siteDesign.pageBackgroundPresets[0].background.pageColor, "#ab12ef");
    assert.equal(result.siteDesign.pageBackgroundPresets[0].background.patternColor, "#abcdef");
  });

  await t.test("more than 12 page background presets is rejected", () => {
    const many = validPageBackgroundSiteDesign({ pageBackgroundPresets: [] });
    for (let index = 0; index < 13; index += 1) {
      many.pageBackgroundPresets.push(validPageBackgroundPreset({ pageBackgroundId: `bg-${index}` }));
    }
    many.defaultPageBackgroundId = "bg-0";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(many)), /too many page background presets/i);
  });

  await t.test("non-array pageBackgroundPresets is rejected", () => {
    const nonArray = validPageBackgroundSiteDesign({ pageBackgroundPresets: "not-an-array" });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(nonArray)), /pageBackgroundPresets must be an array/i);
  });

  await t.test("duplicate pageBackgroundId is rejected", () => {
    const duplicates = validPageBackgroundSiteDesign();
    duplicates.pageBackgroundPresets.push(duplicates.pageBackgroundPresets[0]);
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(duplicates)), /duplicate page background id/i);
  });

  await t.test("unknown defaultPageBackgroundId is rejected", () => {
    const missing = validPageBackgroundSiteDesign({ defaultPageBackgroundId: "does-not-exist" });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /unknown page background/i);
  });

  await t.test("missing defaultPageBackgroundId with presets is rejected", () => {
    const noDefault = validPageBackgroundSiteDesign();
    delete noDefault.defaultPageBackgroundId;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(noDefault)), /defaultPageBackgroundId is required/i);
  });

  await t.test("missing required description is rejected", () => {
    const missing = validPageBackgroundSiteDesign();
    delete missing.pageBackgroundPresets[0].description;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /description is required/i);
  });

  await t.test("missing pageBackgroundId is rejected", () => {
    const missing = validPageBackgroundSiteDesign();
    delete missing.pageBackgroundPresets[0].pageBackgroundId;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /pageBackgroundId is required/i);
  });

  await t.test("missing name is rejected", () => {
    const missing = validPageBackgroundSiteDesign();
    delete missing.pageBackgroundPresets[0].name;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /name is required/i);
  });

  await t.test("missing background is rejected", () => {
    const missing = validPageBackgroundSiteDesign();
    delete missing.pageBackgroundPresets[0].background;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), /background is required/i);
  });

  await t.test("unknown preset property is rejected", () => {
    const extra = validPageBackgroundSiteDesign();
    extra.pageBackgroundPresets[0].image = "https://evil.example/bg.png";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown pageBackgroundPresets\[0\] property/i);
  });

  await t.test("unknown background property is rejected", () => {
    const extra = validPageBackgroundSiteDesign();
    extra.pageBackgroundPresets[0].background.gradient = "linear-gradient(red, blue)";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown pageBackgroundPresets\[0\]\.background property/i);
  });

  await t.test("every missing required background property is rejected", () => {
    for (const key of ["pageColor", "contentColor", "pattern", "patternColor", "patternOpacity"]) {
      const missing = validPageBackgroundSiteDesign();
      delete missing.pageBackgroundPresets[0].background[key];
      assert.throws(() => validateSiteManifest(manifestWithSiteDesign(missing)), new RegExp(`\\.background\\.${key} is required`, "i"));
    }
  });

  await t.test("an unsafe pageBackgroundId is rejected", () => {
    const unsafe = validPageBackgroundSiteDesign();
    unsafe.pageBackgroundPresets[0].pageBackgroundId = "evil id!";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsafe)), /pageBackgroundId is invalid/i);
  });

  await t.test("an unsupported pattern identifier is rejected", () => {
    const unsupported = validPageBackgroundSiteDesign();
    unsupported.pageBackgroundPresets[0].background.pattern = "polka-dots";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsupported)), /must be one of none, soft-grain, subtle-dots, soft-grid/i);
    const nonString = validPageBackgroundSiteDesign();
    nonString.pageBackgroundPresets[0].background.pattern = 42;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(nonString)), /supported pattern identifier/i);
  });

  await t.test("three-digit hex is rejected", () => {
    const short = validPageBackgroundSiteDesign();
    short.pageBackgroundPresets[0].background.pageColor = "#fff";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(short)), /hex/i);
  });

  await t.test("eight-digit hex is rejected", () => {
    const alpha = validPageBackgroundSiteDesign();
    alpha.pageBackgroundPresets[0].background.contentColor = "#12345678";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(alpha)), /hex/i);
  });

  await t.test("rgb, rgba, hsl, gradients, CSS variables, functions, and URLs are rejected", () => {
    for (const value of ["rgb(255,0,0)", "rgba(0,0,0,0.5)", "hsl(120, 50%, 50%)", "linear-gradient(red, blue)", "var(--bg)", "url(https://evil.example/x.png)"]) {
      const bad = validPageBackgroundSiteDesign();
      bad.pageBackgroundPresets[0].background.pageColor = value;
      assert.throws(() => validateSiteManifest(manifestWithSiteDesign(bad)), /hex/i);
    }
  });

  await t.test("patternOpacity below 0 is rejected", () => {
    const low = validPageBackgroundSiteDesign();
    low.pageBackgroundPresets[0].background.pattern = "soft-grain";
    low.pageBackgroundPresets[0].background.patternOpacity = -0.01;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(low)), /allowed range \(0 to 0\.25\)/i);
  });

  await t.test("patternOpacity above 0.25 is rejected", () => {
    const high = validPageBackgroundSiteDesign();
    high.pageBackgroundPresets[0].background.pattern = "soft-grain";
    high.pageBackgroundPresets[0].background.patternOpacity = 0.26;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(high)), /allowed range \(0 to 0\.25\)/i);
  });

  await t.test("a numeric-string opacity is rejected", () => {
    const string = validPageBackgroundSiteDesign();
    string.pageBackgroundPresets[0].background.patternOpacity = "0.1";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(string)), /must be a number/i);
  });

  await t.test("NaN and Infinity opacity values are rejected", () => {
    const nan = validPageBackgroundSiteDesign();
    nan.pageBackgroundPresets[0].background.patternOpacity = NaN;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(nan)), /must be a number/i);
    const inf = validPageBackgroundSiteDesign();
    inf.pageBackgroundPresets[0].background.patternOpacity = Infinity;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(inf)), /must be a number/i);
  });

  await t.test("pattern none with non-zero opacity is rejected", () => {
    const none = validPageBackgroundSiteDesign();
    none.pageBackgroundPresets[0].background.pattern = "none";
    none.pageBackgroundPresets[0].background.patternOpacity = 0.1;
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(none)), /must be 0 when the pattern is "none"/i);
  });

  await t.test("non-none patterns with valid opacity are accepted", () => {
    for (const pattern of ["soft-grain", "subtle-dots", "soft-grid"]) {
      const preset = validPageBackgroundSiteDesign();
      preset.pageBackgroundPresets[0].background.pattern = pattern;
      preset.pageBackgroundPresets[0].background.patternOpacity = 0.12;
      const result = validateSiteManifest(manifestWithSiteDesign(preset));
      assert.equal(result.siteDesign.pageBackgroundPresets[0].background.pattern, pattern);
      assert.equal(result.siteDesign.pageBackgroundPresets[0].background.patternOpacity, 0.12);
    }
  });

  await t.test("HTML and scripts in localized text are rejected", () => {
    const unsafeName = validPageBackgroundSiteDesign();
    unsafeName.pageBackgroundPresets[0].name.en = "<script>alert(1)</script>";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsafeName)), /plain text/i);
    const unsafeDescription = validPageBackgroundSiteDesign();
    unsafeDescription.pageBackgroundPresets[0].description.ar = "<img src=x onerror=alert(1)>";
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(unsafeDescription)), /plain text/i);
  });

  await t.test("unknown top-level Site Design properties remain rejected", () => {
    const extra = validPageBackgroundSiteDesign({ css: { arbitrary: true } });
    assert.throws(() => validateSiteManifest(manifestWithSiteDesign(extra)), /unknown siteDesign property/i);
  });

  await t.test("pageTransitions behavior remains unchanged", () => {
    const result = validateSiteManifest(manifestWithSiteDesign(validPageBackgroundSiteDesign()));
    assert.equal(result.siteDesign.capabilities.pageTransitions, false);
    const enabled = validPageBackgroundSiteDesign({ capabilities: { ...validSiteDesign().capabilities, pageBackgrounds: true, pageTransitions: true } });
    const enabledResult = validateSiteManifest(manifestWithSiteDesign(enabled));
    assert.equal(enabledResult.siteDesign.capabilities.pageTransitions, true);
  });

  await t.test("themes, colors, typography, and page backgrounds coexist without conflict", () => {
    const combined = validPageBackgroundSiteDesign();
    combined.capabilities = { ...combined.capabilities, typography: true };
    combined.defaultTextThemeId = "mock-text-default";
    combined.textThemePresets = [validTextThemePreset()];
    const result = validateSiteManifest(manifestWithSiteDesign(combined));
    assert.equal(result.siteDesign.capabilities.themes, true);
    assert.equal(result.siteDesign.capabilities.colors, true);
    assert.equal(result.siteDesign.capabilities.typography, true);
    assert.equal(result.siteDesign.capabilities.pageBackgrounds, true);
    assert.equal(result.siteDesign.defaultThemeId, "mock-default");
    assert.equal(result.siteDesign.defaultTextThemeId, "mock-text-default");
    assert.equal(result.siteDesign.defaultPageBackgroundId, "mock-page-bg");
    assert.equal(result.siteDesign.themePresets.length, 1);
    assert.equal(result.siteDesign.textThemePresets.length, 1);
    assert.equal(result.siteDesign.pageBackgroundPresets.length, 1);
  });
});
