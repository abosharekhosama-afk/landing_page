import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-site-editor-"));
const password = "Editor-test-123!";
const passwordHash = await hashPassword(password);
const now = "2026-07-30T00:00:00.000Z";

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
    {
      id: "catalog",
      route: "/catalog",
      pageType: "standard",
      title: { en: "Catalog", ar: "الكتالوج" },
      navigationVisible: true,
      parentId: null,
      order: 1,
      editable: true,
      sections: [
        {
          id: "catalog-grid",
          sectionType: "productCollection",
          order: 0,
          editable: true,
          layout: { sourceComponent: "app/brand/components/Catalog.tsx" },
          responsive: {},
          elements: [],
        },
      ],
    },
    {
      id: "about",
      route: "/about",
      pageType: "standard",
      title: { en: "About", ar: "حول" },
      navigationVisible: false,
      parentId: null,
      order: 2,
      editable: true,
      sections: [
        {
          id: "about-content",
          sectionType: "content",
          order: 0,
          editable: true,
          layout: {},
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
  { id: "icare-reader", email: "reader@icare.test", name: "iCare reader", password: passwordHash, role: "employee", permissions: ["site_editor.access"], isActive: true, company_id: "icare", createdAt: now, updatedAt: now },
  { id: "eb-admin", email: "editor@eb.test", name: "EB editor", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "eb-chemical", createdAt: now, updatedAt: now },
  { id: "brand-admin", email: "editor@brand.test", name: "Brand editor", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "another-brand", createdAt: now, updatedAt: now },
];
const memberships = [
  { id: "icare:icare-admin", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  { id: "icare:icare-reader", companyId: "icare", userId: "icare-reader", role: "employee", status: "active", permissions: ["site_editor.access"], createdAt: now, updatedAt: now },
  { id: "eb-chemical:eb-admin", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  { id: "another-brand:brand-admin", companyId: "another-brand", userId: "brand-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
];
fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2, companies, users, memberships,
  websiteTexts: [
    { id: "heading", company_id: "icare", key: "home_hero_headline", valueEn: "Skincare made clear", valueAr: "عناية واضحة", isActive: true },
    { id: "subtitle", company_id: "icare", key: "home_hero_subtitle", valueEn: "Real care for every routine", valueAr: "عناية حقيقية لكل روتين", isActive: true },
    { id: "cta", company_id: "icare", key: "home_hero_cta", valueEn: "Shop iCare", valueAr: "تسوق iCare", isActive: true },
  ],
  websiteMedia: [
    { id: "icare-hero", company_id: "icare", sectionKey: "home_hero", imageUrl: "/uploads/icare-hero.jpg", isActive: true },
    { id: "icare-alt", company_id: "icare", sectionKey: "home_alt", imageUrl: "/uploads/icare-alt.jpg", isActive: true },
    { id: "eb-media", company_id: "eb-chemical", sectionKey: "home_hero", imageUrl: "/uploads/eb.jpg", isActive: true },
  ],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.SITE_EDITOR_DRAFT_STORE_DIR = path.join(dataStoreDir, "editor-drafts");
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "site-editor-focused-test";
process.env.NODE_ENV = "test";

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

test("site editor API is authenticated, permissioned, tenant-scoped, validated, and revisioned", async (t) => {
  t.after(async () => {
    server.close();
    fs.rmSync(dataStoreDir, { recursive: true, force: true });
    const dbUrl = process.env.SITE_EDITOR_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (dbUrl) {
      const cleanPool = new pg.Pool({ connectionString: dbUrl });
      try {
        await cleanPool.query("delete from public.company_site_editor_drafts where company_id = $1", ["icare"]);
      } catch {}
      await cleanPool.end();
    }
  });
  const noAuth = await request("/site-editor/pages");
  assert.equal(noAuth.status, 401);

  const icareToken = await login("editor@icare.test");
  const readerToken = await login("reader@icare.test");
  const ebToken = await login("editor@eb.test");
  const brandToken = await login("editor@brand.test");

  await t.test("iCare page list exposes all legacy manifest pages and ignores tampered company headers", async () => {
    const pages = await request("/site-editor/pages?companyId=eb-chemical", { token: icareToken, headers: { "X-Company-Id": "eb-chemical" } });
    assert.equal(pages.status, 200);
    assert.deepEqual(pages.body.items.map((item) => item.id), ["home", "shop", "story", "find-us", "faq", "contact", "shipping", "privacy", "terms", "accessibility"]);
    assert.equal(pages.body.items[0].tenantId, "icare");
    assert.equal(pages.body.items[0].isEditable, true);
    assert.equal(pages.body.source, "site-manifest");
  });

  await t.test("iCare Home document is normalized from the manifest", async () => {
    const result = await request("/site-editor/pages/home", { token: icareToken });
    assert.equal(result.status, 200);
    assert.equal(result.body.document.companyId, "icare");
    assert.equal(result.body.document.siteId, "icare-storefront");
    assert.equal(result.body.document.previewPath, "/icare");
    assert.equal(result.body.document.routePattern, "/icare");
    assert.equal(result.body.document.sections[0].settings.sourceComponent, "app/icare/components/Hero.tsx");
    assert.equal(result.body.document.sections[0].elements.some((element) => element.type === "container"), true);
    assert.equal(JSON.stringify(result.body.document).includes("EB Chemical"), false);
    assert.equal(result.body.source, "site-manifest");
  });

  await t.test("unknown page returns a clear 404", async () => {
    assert.equal((await request("/site-editor/pages/products", { token: icareToken })).status, 404);
  });

  await t.test("an unconnected tenant receives SITE_NOT_CONNECTED, never another tenant's content", async () => {
    const result = await request("/site-editor/pages", { token: ebToken });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, "SITE_NOT_CONNECTED");
  });

  await t.test("a second connected tenant resolves its own pages without any registry changes", async () => {
    const pages = await request("/site-editor/pages", { token: brandToken });
    assert.equal(pages.status, 200);
    assert.deepEqual(pages.body.items.map((item) => item.id), ["home", "catalog", "about"]);
    assert.equal(pages.body.items[1].isEditable, true);
    assert.equal(pages.body.items[2].menuVisibility, "hidden");
    assert.equal(pages.body.items.every((item) => item.tenantId === "another-brand"), true);
  });

  await t.test("identical page ids across tenants stay fully isolated", async () => {
    const brandHome = await request("/site-editor/pages/home", { token: brandToken });
    assert.equal(brandHome.status, 200);
    assert.equal(brandHome.body.document.companyId, "another-brand");
    assert.equal(brandHome.body.document.siteId, "another-brand-storefront");
    assert.equal(brandHome.body.document.previewPath, "/");
    assert.equal(brandHome.body.document.sections[0].settings.sourceComponent, "app/brand/components/Banner.tsx");
    assert.equal(brandHome.body.document.sections[0].elements[0].content.text, "Brand only heading");
    assert.equal(JSON.stringify(brandHome.body.document).includes("Skincare made clear"), false);
    assert.equal(brandHome.body.document.pageId, "home");
  });

  await t.test("editor context and connection reflect the connected site", async () => {
    const context = await request("/site-editor/context", { token: brandToken });
    assert.equal(context.status, 200);
    assert.equal(context.body.site.id, "another-brand-storefront");
    assert.equal(context.body.site.name, "Another Brand");
    assert.equal(context.body.connection.connectionStatus, "connected");
    const connection = await request("/site-editor/connection", { token: brandToken });
    assert.equal(connection.body.connectionStatus, "connected");
    assert.equal(connection.body.resolvedSource, "remote");
    const legacyConnection = await request("/site-editor/connection", { token: icareToken });
    assert.equal(legacyConnection.body.resolvedSource, "legacy");
  });

  await t.test("section library is served from the connected tenant's own manifest only", async () => {
    const brand = await request("/site-editor/section-library", { token: brandToken });
    assert.equal(brand.status, 200);
    assert.equal(brand.body.siteId, "another-brand-storefront");
    assert.equal(brand.body.source, "remote");
    assert.equal(brand.body.sectionLibrary.version, "1");
    assert.deepEqual(brand.body.sectionLibrary.templates.map((template) => template.templateId), ["brand-hero-overlay"]);
    assert.equal(JSON.stringify(brand.body.sectionLibrary).includes("Skincare made clear"), false);
  });

  await t.test("a tenant without a section library receives null, never another tenant's templates", async () => {
    const icare = await request("/site-editor/section-library", { token: icareToken });
    assert.equal(icare.status, 200);
    assert.equal(icare.body.sectionLibrary, null);
    assert.equal(JSON.stringify(icare.body).includes("brand-hero-overlay"), false);
    const eb = await request("/site-editor/section-library", { token: ebToken });
    assert.equal(eb.status, 409);
    assert.equal(eb.body.code, "SITE_NOT_CONNECTED");
  });

  await t.test("manifest sync for the legacy tenant returns the legacy provider source", async () => {
    const result = await request("/site-editor/manifest/sync", { token: icareToken, method: "POST", body: {} });
    assert.equal(result.status, 200);
    assert.equal(result.body.synced, true);
    assert.equal(result.body.source, "legacy");
    assert.equal(result.body.siteId, "icare-storefront");
    assert.equal(result.body.pageCount, 10);
  });

  await t.test("connection validation requires a manifest URL", async () => {
    const result = await request("/site-editor/connection/validate", { token: icareToken, method: "POST", body: {} });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "MANIFEST_URL_REQUIRED");
  });

  const loaded = await request("/site-editor/pages/home", { token: icareToken });
  const changed = structuredClone(loaded.body.document);
  changed.sections[0].elements.find((element) => element.type === "container").children[0].content.text = "A safer edited heading";
  changed.companyId = "eb-chemical";

  await t.test("read-only permission cannot save", async () => {
    const result = await request("/site-editor/pages/home/draft", { token: readerToken, method: "PUT", body: { revision: 0, document: changed } });
    assert.equal(result.status, 403);
  });

  await t.test("expected revision saves locally and server injects tenant and audit metadata", async () => {
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 0, companyId: "eb-chemical", document: changed } });
    assert.equal(result.status, 200);
    assert.equal(result.body.revision, 1);
    assert.equal(result.body.document.companyId, "icare");
    assert.equal(result.body.document.siteId, "icare-storefront");
    assert.equal(result.body.audit.updatedBy, "icare-admin");
    if (!process.env.SITE_EDITOR_DATABASE_URL) {
      assert.equal(fs.existsSync(path.join(dataStoreDir, "editor-drafts", "site-editor-drafts.json")), true);
    }
  });

  await t.test("stale revision returns a clear conflict", async () => {
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 0, document: changed } });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, "REVISION_CONFLICT");
    assert.equal(result.body.currentRevision, 1);
  });

  await t.test("unsafe markup and script URLs are rejected", async () => {
    const unsafe = structuredClone(changed);
    unsafe.sections[0].elements.find((element) => element.type === "container").children[0].content.text = "<script>alert(1)</script>";
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 1, document: unsafe } });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "INVALID_DOCUMENT");
  });

  await t.test("cross-tenant media replacement is rejected", async () => {
    const crossTenant = structuredClone(changed);
    crossTenant.sections[0].elements.find((element) => element.type === "image").content = { src: "/uploads/eb.jpg", alt: "wrong", link: "", assetId: "eb-media" };
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 1, document: crossTenant } });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "TENANT_MEDIA_REQUIRED");
  });

  await t.test("a new section background must reference active tenant media", async () => {
    const rogueBackground = structuredClone(changed);
    rogueBackground.sections[0].settings.backgroundImage = "/uploads/rogue-bg.jpg";
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 1, document: rogueBackground } });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "TENANT_MEDIA_REQUIRED");
  });

  await t.test("active iCare media replacement succeeds at the current revision", async () => {
    const replacement = structuredClone(changed);
    replacement.sections[0].elements.find((element) => element.type === "image").content = { src: "/uploads/icare-alt.jpg", alt: "alternate", link: "", assetId: "icare-alt" };
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 1, document: replacement } });
    assert.equal(result.status, 200);
    assert.equal(result.body.revision, 2);
  });

  await t.test("an active tenant media section background saves successfully", async () => {
    const background = structuredClone(changed);
    background.sections[0].settings.backgroundImage = "/uploads/icare-hero.jpg";
    const result = await request("/site-editor/pages/home/draft", { token: icareToken, method: "PUT", body: { revision: 2, document: background } });
    assert.equal(result.status, 200);
    assert.equal(result.body.revision, 3);
    assert.equal(result.body.document.sections[0].settings.backgroundImage, "/uploads/icare-hero.jpg");
  });
});
