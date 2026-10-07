import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-site-editor-conn-"));
const password = "Connection-test-123!";
const passwordHash = await hashPassword(password);
const now = "2026-07-30T00:00:00.000Z";

const REMOTE_MANIFEST_URL = "https://icare-storefront.example/site-manifest.json";
const ICARE_STOREFRONT_URL = "https://igroup.website/icare";

const icareRemoteManifest = {
  schemaVersion: "1.0",
  companyId: "icare",
  siteId: "icare-storefront",
  siteName: "iCare",
  baseUrl: "https://igroup.website",
  routePrefix: "/icare",
  defaultLocale: "en",
  supportedLocales: ["en", "ar"],
  generatedAt: now,
  pages: [
    {
      id: "home",
      route: "/icare",
      pageType: "standard",
      title: { en: "Home", ar: "الرئيسية" },
      navigationVisible: true,
      parentId: null,
      order: 0,
      editable: true,
      sections: [
        {
          id: "icare-hero",
          sectionType: "hero",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/icare/components/Hero.tsx" },
          responsive: {},
          elements: [
            { id: "icare-hero-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "Remote iCare" }, ar: { text: "آي كير" } }, source: null, styles: { alignment: "start" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
          ],
        },
      ],
    },
    {
      id: "shop",
      route: "/icare/shop",
      pageType: "standard",
      title: { en: "Shop", ar: "المتجر" },
      navigationVisible: true,
      parentId: null,
      order: 1,
      editable: true,
      sections: [
        {
          id: "icare-catalog",
          sectionType: "productCollection",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/icare/components/Shop.tsx" },
          responsive: {},
          elements: [],
        },
      ],
    },
  ],
  sectionLibrary: {
    version: "1",
    blankSection: { enabled: true, sectionType: "content" },
    categories: [
      { id: "welcome", title: { en: "Welcome", ar: "ترحيب" }, order: 0 },
      { id: "store", title: { en: "Store", ar: "المتجر" }, order: 1 },
    ],
    templates: [
      {
        templateId: "icare-hero-overlay",
        categoryId: "welcome",
        sectionType: "hero",
        layoutVariant: "overlay",
        title: { en: "iCare Hero", ar: "ترحيب آي كير" },
        description: { en: "iCare hero template", ar: "قالب ترحيب آي كير" },
        thumbnail: "https://igroup.website/media/icare-hero-overlay.jpg",
        pageTypes: ["standard"],
        capabilities: { requiresMedia: true },
        defaultSectionDocument: {
          id: "icare-hero-overlay-section",
          sectionType: "hero",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/icare/components/Hero.tsx", contentAlignment: "center" },
          responsive: {},
          elements: [
            { id: "icare-hero-overlay-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "Remote iCare hero" }, ar: { text: "ترحيب آي كير" } }, source: null, styles: { alignment: "center" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
          ],
        },
      },
      {
        templateId: "icare-store-grid",
        categoryId: "store",
        sectionType: "productCollection",
        layoutVariant: "grid",
        title: { en: "iCare Store Grid", ar: "شبكة متجر آي كير" },
        description: { en: "iCare store grid template", ar: "قالب شبكة المتجر" },
        thumbnail: "https://igroup.website/media/icare-store-grid.jpg",
        pageTypes: ["standard"],
        capabilities: {},
        defaultSectionDocument: {
          id: "icare-store-grid-section",
          sectionType: "productCollection",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/icare/components/Shop.tsx" },
          responsive: {},
          elements: [],
        },
      },
    ],
  },
};

const brandManifest = {
  schemaVersion: "1.0",
  companyId: "another-brand",
  siteId: "another-brand-storefront",
  siteName: "Another Brand",
  baseUrl: "https://another-brand.example",
  routePrefix: "/",
  defaultLocale: "en",
  supportedLocales: ["en", "ar"],
  generatedAt: now,
  pages: [
    {
      id: "home",
      route: "/",
      pageType: "standard",
      title: { en: "Brand Home", ar: "الرئيسية" },
      navigationVisible: true,
      parentId: null,
      order: 0,
      editable: true,
      sections: [
        {
          id: "brand-hero",
          sectionType: "banner",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/brand/components/Banner.tsx" },
          responsive: {},
          elements: [
            { id: "brand-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "Brand only heading" }, ar: { text: "عنوان العلامة" } }, source: null, styles: { alignment: "start" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
          ],
        },
      ],
    },
  ],
  sectionLibrary: {
    version: "1",
    blankSection: { enabled: true, sectionType: "content" },
    categories: [
      { id: "welcome", title: { en: "Welcome", ar: "ترحيب" }, order: 0 },
    ],
    templates: [
      {
        templateId: "brand-hero-overlay",
        categoryId: "welcome",
        sectionType: "hero",
        layoutVariant: "overlay",
        title: { en: "Brand Hero", ar: "ترحيب العلامة" },
        description: { en: "Brand only hero template", ar: "قالب ترحيب خاص بالعلامة" },
        thumbnail: "https://another-brand.example/media/brand-hero-overlay.jpg",
        pageTypes: ["standard"],
        capabilities: { requiresMedia: true },
        defaultSectionDocument: {
          id: "brand-hero-overlay-section",
          sectionType: "hero",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/brand/components/Banner.tsx", contentAlignment: "center" },
          responsive: {},
          elements: [
            { id: "brand-hero-overlay-heading", elementType: "heading", order: 0, editable: true, content: { en: { text: "Brand only heading" }, ar: { text: "عنوان العلامة" } }, source: null, styles: { alignment: "center" }, responsive: {}, validation: {}, editableProperties: ["content"], children: [] },
          ],
        },
      },
    ],
  },
};

const siteDesignPayload = {
  version: "1",
  capabilities: { themes: true, colors: true, typography: false, pageBackgrounds: false, pageTransitions: false },
  defaultThemeId: "icare-default",
  themePresets: [
    {
      themeId: "icare-default",
      name: { en: "iCare Default", ar: "تصميم آي كير الافتراضي" },
      description: { en: "Signature iCare", ar: "هوية آي كير" },
      previewSwatches: ["#ffffff", "#151515", "#c79a6b"],
      colorTheme: {
        base: { primaryBackground: "#ffffff", secondaryBackground: "#f5f3ee" },
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
};

const companies = [
  { id: "icare", slug: "icare", name: "iCare", status: "active", storefrontUrl: "https://igroup.website/icare", storefrontPath: "/icare" },
  { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active" },
  {
    id: "another-brand",
    slug: "another-brand",
    name: "Another Brand",
    status: "active",
    settings: {
      websiteConnection: {
        connectionStatus: "connected",
        siteManifestUrl: "https://another-brand.example/site-manifest.json",
        siteId: "another-brand-storefront",
        routePrefix: "/",
        defaultLocale: "en",
        supportedLocales: ["en", "ar"],
        lastManifestSyncAt: now,
        manifestSchemaVersion: "1.0",
        connectionError: "",
        lastManifest: brandManifest,
      },
    },
  },
];
const users = [
  { id: "icare-admin", email: "editor@icare.test", name: "iCare editor", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "icare", createdAt: now, updatedAt: now },
  { id: "eb-admin", email: "editor@eb.test", name: "EB editor", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "eb-chemical", createdAt: now, updatedAt: now },
  { id: "brand-admin", email: "editor@brand.test", name: "Brand editor", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "another-brand", createdAt: now, updatedAt: now },
];
const memberships = [
  { id: "icare:icare-admin", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  { id: "eb-chemical:eb-admin", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  { id: "another-brand:brand-admin", companyId: "another-brand", userId: "brand-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
];
fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2, companies, users, memberships,
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.SITE_EDITOR_DRAFT_STORE_DIR = path.join(dataStoreDir, "editor-drafts");
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "site-editor-connection-test";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, body, headers = {}, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.status, 200);
  return result.body.token;
}

const originalFetch = globalThis.fetch;
let manifestResponder = null;
globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (manifestResponder && target === REMOTE_MANIFEST_URL) {
    const payload = manifestResponder.payload;
    const status = manifestResponder.status;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    };
  }
  return originalFetch(url, init);
};

function readPersistedConnection() {
  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  const company = persisted.companies.find((entry) => entry.id === "icare");
  return company?.settings?.websiteConnection || null;
}

function reloadConnectionFromStore() {
  const storeFileUrl = new URL("../src/data/store.js", import.meta.url).href;
  const script = `
    process.env.DATA_STORE_DIR = ${JSON.stringify(dataStoreDir)};
    process.env.NODE_ENV = "test";
    process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
    process.env.DATABASE_URL = "";
    process.env.POSTGRES_URL = "";
    process.env.SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    const { companyRepository } = await import(${JSON.stringify(storeFileUrl)});
    process.stdout.write(JSON.stringify(companyRepository.getWebsiteConnection("icare")));
    process.exit(0);
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("site editor connection resolution prefers remote, never silently falls back to legacy, and persists", async (t) => {
  t.after(async () => {
    server.close();
    fs.rmSync(dataStoreDir, { recursive: true, force: true });
  });

  const icareToken = await login("editor@icare.test");
  const ebToken = await login("editor@eb.test");
  const brandToken = await login("editor@brand.test");

  await t.test("legacy fallback is used only when no connection is configured", async () => {
    const icare = await request("/site-editor/connection", { token: icareToken });
    assert.equal(icare.body.resolution, "legacy");
    assert.equal(icare.body.resolvedSource, "legacy");
    assert.equal(icare.body.connectionStatus, "not-configured");

    const library = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(library.status, 200);
    assert.equal(library.body.source, "legacy");
    assert.equal(library.body.sectionLibrary, null);
    assert.equal(library.body.requiresConnection, true);

    const eb = await request("/site-editor/connection", { token: ebToken });
    assert.equal(eb.body.resolution, "none");
    assert.equal(eb.body.resolvedSource, null);
    const pages = await request("/site-editor/pages", { token: ebToken });
    assert.equal(pages.status, 409);
    assert.equal(pages.body.code, "SITE_NOT_CONNECTED");
  });

  await t.test("a configured remote connection wins over legacy and Connect + Sync persists it", async () => {
    manifestResponder = { status: 200, payload: { ...icareRemoteManifest, siteDesign: siteDesignPayload } };

    const saved = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: {
        storefrontBaseUrl: ICARE_STOREFRONT_URL,
        siteManifestUrl: REMOTE_MANIFEST_URL,
        siteId: "icare-storefront",
        routePrefix: "/icare",
        defaultLocale: "en",
        supportedLocales: ["en", "ar"],
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.connectionStatus, "not-configured");

    const sync = await request("/site-editor/manifest/sync", {
      token: icareToken,
      method: "POST",
      body: { siteManifestUrl: REMOTE_MANIFEST_URL },
    });
    assert.equal(sync.status, 200);
    assert.equal(sync.body.synced, true);
    assert.equal(sync.body.source, "remote");
    assert.equal(sync.body.siteId, "icare-storefront");
    assert.equal(sync.body.connection.connectionStatus, "connected");

    const connection = await request("/site-editor/connection", { token: icareToken });
    assert.equal(connection.body.resolution, "remote");
    assert.equal(connection.body.resolvedSource, "remote");
    assert.equal(connection.body.connectionStatus, "connected");
    assert.equal(connection.body.siteId, "icare-storefront");
    assert.equal(connection.body.storefrontBaseUrl, ICARE_STOREFRONT_URL);
    assert.equal(connection.body.siteManifestUrl, REMOTE_MANIFEST_URL);
    assert.equal(connection.body.defaultLocale, "en");
    assert.deepEqual(connection.body.supportedLocales, ["en", "ar"]);
    assert.equal(connection.body.manifestSchemaVersion, "1.0");
    assert.equal(connection.body.siteDesign.defaultThemeId, "icare-default");
    assert.equal(connection.body.siteDesign.themePresets.length, 1);
    assert.equal(connection.body.siteDesign.themePresets[0].colorTheme.base.primaryBackground, "#ffffff");
    assert.equal(connection.body.siteDesign.capabilities.typography, false);
    assert.equal(connection.body.lastManifest, undefined);
    assert.equal(connection.body.pages, undefined);
    assert.equal(connection.body.sectionLibrary, undefined);

    const library = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(library.status, 200);
    assert.equal(library.body.source, "remote");
    assert.equal(library.body.siteId, "icare-storefront");
    assert.equal(library.body.requiresConnection, undefined);
    assert.equal(library.body.sectionLibrary.version, "1");
    assert.deepEqual(library.body.sectionLibrary.categories.map((c) => c.id), ["welcome", "store"]);
    assert.deepEqual(library.body.sectionLibrary.templates.map((template) => template.templateId), ["icare-hero-overlay", "icare-store-grid"]);

    const persisted = readPersistedConnection();
    assert.equal(persisted.connectionStatus, "connected");
    assert.equal(persisted.siteManifestUrl, REMOTE_MANIFEST_URL);
    assert.equal(persisted.siteId, "icare-storefront");
    assert.equal(persisted.storefrontBaseUrl, ICARE_STOREFRONT_URL);
    assert.equal(persisted.defaultLocale, "en");
    assert.deepEqual(persisted.supportedLocales, ["en", "ar"]);
    assert.equal(persisted.manifestSchemaVersion, "1.0");
    assert.equal(Boolean(persisted.lastManifest), true);

    for (const key of ["storefrontBaseUrl", "siteManifestUrl", "siteId", "routePrefix", "defaultLocale", "connectionStatus", "lastManifestSyncAt", "manifestSchemaVersion"]) {
      assert.equal(connection.body[key], persisted[key], `field ${key} round-trips with matching names`);
    }

    const reloaded = reloadConnectionFromStore();
    assert.equal(reloaded.connectionStatus, "connected");
    assert.equal(reloaded.siteManifestUrl, REMOTE_MANIFEST_URL);
    assert.equal(reloaded.siteId, "icare-storefront");
  });

  await t.test("partial locale updates preserve the remote connection and lastManifest", async () => {
    const before = await request("/site-editor/connection", { token: icareToken });
    assert.equal(before.body.resolution, "remote");

    const localeUpdate = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: { defaultLocale: "ar" },
    });
    assert.equal(localeUpdate.status, 200);
    assert.equal(localeUpdate.body.defaultLocale, "ar");
    assert.equal(localeUpdate.body.connectionStatus, "connected");
    assert.equal(Boolean(localeUpdate.body.lastManifest), true);
    assert.equal(localeUpdate.body.lastManifestSyncAt, before.body.lastManifestSyncAt);

    const localesUpdate = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: { supportedLocales: ["en", "ar", "fr"] },
    });
    assert.equal(localesUpdate.status, 200);
    assert.deepEqual(localesUpdate.body.supportedLocales, ["en", "ar", "fr"]);
    assert.equal(localesUpdate.body.connectionStatus, "connected");
    assert.equal(Boolean(localesUpdate.body.lastManifest), true);

    const prefixUpdate = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: { routePrefix: "/icare" },
    });
    assert.equal(prefixUpdate.status, 200);
    assert.equal(prefixUpdate.body.connectionStatus, "connected");
    assert.equal(Boolean(prefixUpdate.body.lastManifest), true);
    assert.equal(prefixUpdate.body.siteManifestUrl, REMOTE_MANIFEST_URL);

    const browserAttempt = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: { siteManifestUrl: REMOTE_MANIFEST_URL, siteDesign: { attackerControlled: true } },
    });
    const verified = await request("/site-editor/connection", { token: icareToken });
    assert.equal(verified.body.siteDesign.attackerControlled, undefined);
    assert.equal(verified.body.siteDesign.defaultThemeId, "icare-default");
    const persistedAfterBrowser = readPersistedConnection();
    const persistedSiteDesign = persistedAfterBrowser.lastManifest?.siteDesign;
    assert.equal(persistedSiteDesign && persistedSiteDesign.attackerControlled, undefined);
    assert.equal(persistedSiteDesign?.defaultThemeId, "icare-default");

    const after = await request("/site-editor/connection", { token: icareToken });
    assert.equal(after.body.resolution, "remote");
    assert.equal(after.body.resolvedSource, "remote");
    assert.equal(after.body.connectionStatus, "connected");
    assert.equal(after.body.lastManifestSyncAt, before.body.lastManifestSyncAt);

    const library = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(library.status, 200);
    assert.equal(library.body.source, "remote");
    assert.equal(library.body.requiresConnection, undefined);
  });

  await t.test("another tenant never receives iCare's library", async () => {
    const brand = await request("/site-editor/section-library", { token: brandToken });
    assert.equal(brand.status, 200);
    assert.equal(brand.body.siteId, "another-brand-storefront");
    assert.equal(brand.body.source, "remote");
    assert.deepEqual(brand.body.sectionLibrary.templates.map((template) => template.templateId), ["brand-hero-overlay"]);
    assert.equal(JSON.stringify(brand.body.sectionLibrary).includes("icare-"), false);

    const icare = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(JSON.stringify(icare.body.sectionLibrary).includes("brand-"), false);

    const eb = await request("/site-editor/section-library", { token: ebToken });
    assert.equal(eb.status, 409);
    assert.equal(eb.body.code, "SITE_NOT_CONNECTED");

    const brandConnection = await request("/site-editor/connection", { token: brandToken });
    assert.equal(brandConnection.body.siteDesign, null);
    assert.equal(JSON.stringify(brandConnection.body).includes("icare-default"), false);
  });

  await t.test("a configured remote failure is an explicit error and never falls back to legacy", async () => {
    manifestResponder = { status: 500, payload: null };
    const failed = await request("/site-editor/manifest/sync", {
      token: icareToken,
      method: "POST",
      body: { siteManifestUrl: REMOTE_MANIFEST_URL },
    });
    assert.equal(failed.status, 500);
    assert.equal(failed.body.code, "MANIFEST_FETCH_FAILED");

    const connection = await request("/site-editor/connection", { token: icareToken });
    assert.equal(connection.body.resolution, "error");
    assert.equal(connection.body.resolvedSource, null);
    assert.equal(connection.body.connectionStatus, "error");
    assert.notEqual(connection.body.connectionError, "");

    const pages = await request("/site-editor/pages", { token: icareToken });
    assert.equal(pages.status, 409);
    assert.equal(pages.body.code, "CONNECTION_SYNC_FAILED");
    assert.equal(JSON.stringify(pages.body).includes("Skincare"), false);
  });

  await t.test("a manifest identity mismatch is an explicit error, not legacy", async () => {
    manifestResponder = { status: 200, payload: brandManifest };
    const mismatched = await request("/site-editor/manifest/sync", {
      token: icareToken,
      method: "POST",
      body: { siteManifestUrl: REMOTE_MANIFEST_URL },
    });
    assert.equal(mismatched.status, 403);
    assert.equal(mismatched.body.code, "CONNECTION_IDENTITY_MISMATCH");
    const pages = await request("/site-editor/pages", { token: icareToken });
    assert.equal(pages.status, 409);
    assert.equal(pages.body.code, "CONNECTION_SYNC_FAILED");
  });

  await t.test("an explicit empty siteManifestUrl disconnects and clears stale sync data", async () => {
    manifestResponder = { status: 200, payload: icareRemoteManifest };
    const connected = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: {
        storefrontBaseUrl: ICARE_STOREFRONT_URL,
        siteManifestUrl: REMOTE_MANIFEST_URL,
        siteId: "icare-storefront",
        routePrefix: "/icare",
        defaultLocale: "en",
        supportedLocales: ["en", "ar"],
      },
    });
    assert.equal(connected.status, 200);
    const sync = await request("/site-editor/manifest/sync", {
      token: icareToken,
      method: "POST",
      body: { siteManifestUrl: REMOTE_MANIFEST_URL },
    });
    assert.equal(sync.status, 200);
    assert.equal(sync.body.connection.connectionStatus, "connected");

    const before = await request("/site-editor/connection", { token: icareToken });
    assert.equal(before.body.resolution, "remote");
    assert.equal(Boolean(before.body.lastManifestSyncAt), true);

    const disconnected = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: { siteManifestUrl: "" },
    });
    assert.equal(disconnected.status, 200);
    assert.equal(disconnected.body.connectionStatus, "not-configured");
    assert.equal(disconnected.body.lastManifest, null);
    assert.equal(disconnected.body.lastManifestSyncAt, null);
    assert.equal(disconnected.body.manifestSchemaVersion, null);
    assert.equal(disconnected.body.connectionError, "");

    const after = await request("/site-editor/connection", { token: icareToken });
    assert.equal(after.body.resolution, "legacy");
    assert.equal(after.body.resolvedSource, "legacy");
    assert.equal(after.body.connectionStatus, "not-configured");
    assert.equal(after.body.hasManifest, false);

    const library = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(library.status, 200);
    assert.equal(library.body.source, "legacy");
    assert.equal(library.body.sectionLibrary, null);
    assert.equal(library.body.requiresConnection, true);
  });

  await t.test("removing the connection returns to explicit legacy behavior", async () => {
    const removed = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: { siteManifestUrl: "", storefrontBaseUrl: "" },
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.connectionStatus, "not-configured");
    assert.equal(removed.body.lastManifest, null);

    const connection = await request("/site-editor/connection", { token: icareToken });
    assert.equal(connection.body.resolution, "legacy");
    assert.equal(connection.body.resolvedSource, "legacy");
    assert.equal(connection.body.siteDesign, null);

    const library = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(library.status, 200);
    assert.equal(library.body.source, "legacy");
    assert.equal(library.body.sectionLibrary, null);
    assert.equal(library.body.requiresConnection, true);
  });

  await t.test("a configured but unsynchronized connection is an explicit CONNECTION_REQUIRED error, never legacy", async () => {
    const saved = await request("/site-editor/connection", {
      token: icareToken,
      method: "PUT",
      body: {
        storefrontBaseUrl: ICARE_STOREFRONT_URL,
        siteManifestUrl: REMOTE_MANIFEST_URL,
        siteId: "icare-storefront",
        routePrefix: "/icare",
        defaultLocale: "en",
        supportedLocales: ["en", "ar"],
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.connectionStatus, "not-configured");
    assert.equal(saved.body.lastManifest, null);

    const connection = await request("/site-editor/connection", { token: icareToken });
    assert.equal(connection.body.resolution, "configured");
    assert.equal(connection.body.resolvedSource, null);
    assert.equal(connection.body.connectionStatus, "not-configured");
    assert.equal(connection.body.hasManifest, false);
    assert.equal(connection.body.siteDesign, null);

    const pages = await request("/site-editor/pages", { token: icareToken });
    assert.equal(pages.status, 409);
    assert.equal(pages.body.code, "CONNECTION_REQUIRED");
    assert.equal(JSON.stringify(pages.body).includes("home-hero"), false);

    const library = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(library.status, 409);
    assert.equal(library.body.code, "CONNECTION_REQUIRED");
    assert.equal(JSON.stringify(library.body).includes("home-hero"), false);
  });
});
