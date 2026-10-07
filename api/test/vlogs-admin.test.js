import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "vlogs-admin-test-"));
const now = "2026-08-29T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);
const companyId = "tenant-vlogs";
const siteId = "tenant-vlogs-storefront";

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [{
    id: companyId,
    slug: companyId,
    name: "Vlog Tenant",
    status: "active",
    domain: "",
    settings: {
      storefrontUrl: "https://tenant-vlogs.example",
      storefrontPath: "/",
      websiteConnection: {
        siteId,
        storefrontBaseUrl: "https://tenant-vlogs.example",
        defaultLocale: "en",
        supportedLocales: ["en", "ar"],
      },
      websiteContent: {
        vlogHero: { title: { en: "Existing hero", ar: "واجهة موجودة" }, imageUrl: "https://cdn.example/hero.jpg" },
      },
    },
  }],
  domains: [{
    id: "tenant-vlogs-domain",
    company_id: companyId,
    domain: "tenant-vlogs.example",
    is_primary: true,
    is_active: true,
    is_verified: true,
    created_at: now,
    updated_at: now,
  }],
  users: [{
    id: "tenant-admin",
    name: "Tenant Admin",
    email: "admin@vlogs.test",
    password: passwordHash,
    role: "company_admin",
    permissions: [],
    isActive: true,
    company_id: companyId,
    createdAt: now,
    updatedAt: now,
  }],
  memberships: [{
    id: `${companyId}:tenant-admin`,
    companyId,
    userId: "tenant-admin",
    role: "company_admin",
    status: "active",
    permissions: [],
    createdAt: now,
    updatedAt: now,
  }],
  products: [],
  categories: [],
  brands: [],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "vlogs-admin-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());

const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function api(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    response,
    body: response.status === 204 ? null : await response.json().catch(() => null),
  };
}

const login = await api("/auth/login", {
  method: "POST",
  body: { email: "admin@vlogs.test", password },
});
assert.equal(login.response.status, 200);
const token = login.body.token;

test("admin vlog create persists through list reload and storefront content", async () => {
  const created = await api("/admin/vlogs", {
    method: "POST",
    token,
    body: {
      slug: "care-story",
      title: { en: "Care story", ar: "قصة العناية" },
      description: { en: "Intro", ar: "مقدمة" },
      videoUrl: "https://cdn.example/story.mp4",
      posterUrl: "https://cdn.example/story.jpg",
      mediaType: "video",
      sortOrder: 1,
      isActive: true,
      featured: true,
    },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.slug, "care-story");

  const listed = await api("/admin/vlogs", { token });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].slug, "care-story");
  assert.equal(listed.body.hero.title.en, "Existing hero", "hero settings survive vlog saves");

  const duplicate = await api("/admin/vlogs", {
    method: "POST",
    token,
    body: {
      slug: "care-story",
      title: { en: "Duplicate", ar: "مكرر" },
      mediaType: "video",
    },
  });
  assert.equal(duplicate.response.status, 409);
  assert.match(duplicate.body.message, /slug already exists/i);

  const storefront = await fetch(`${baseUrl}/storefront/content?locale=en`, {
    headers: {
      "X-Company-Id": companyId,
      "X-Site-Id": siteId,
    },
  });
  const storefrontBody = await storefront.json();
  assert.equal(storefront.status, 200);
  assert.deepEqual(storefrontBody.vlogs.map((item) => item.slug), ["care-story"]);
  assert.equal(storefrontBody.vlogHero.title.en, "Existing hero");

  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  const savedCompany = persisted.companies.find((entry) => entry.id === companyId);
  assert.equal(savedCompany.settings.websiteContent.vlogs.length, 1);
  assert.equal(savedCompany.settings.websiteContent.vlogs[0].slug, "care-story");
  assert.equal(savedCompany.settings.websiteContent.vlogHero.title.en, "Existing hero");
});

test("simulated cold reload serves the same persisted vlog list", async () => {
  const listed = await api("/admin/vlogs", { token });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].slug, "care-story");
});

test("admin can create image/post vlogs and expose poster fields on storefront", async () => {
  const created = await api("/admin/vlogs", {
    method: "POST",
    token,
    body: {
      slug: "photo-post",
      title: { en: "Photo post", ar: "منشور صورة" },
      description: { en: "Gallery", ar: "معرض" },
      imageUrl: "https://cdn.example/post.jpg",
      mediaType: "post",
      sortOrder: 2,
      isActive: true,
    },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.mediaType, "image");

  const listed = await api("/admin/vlogs", { token });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.items.some((item) => item.slug === "photo-post"), true);
  const imageItem = listed.body.items.find((item) => item.slug === "photo-post");
  assert.equal(imageItem.imageUrl, "https://cdn.example/post.jpg");
  assert.equal(imageItem.thumbnail, "");

  const storefront = await fetch(`${baseUrl}/storefront/content?locale=en`, {
    headers: { "X-Company-Id": companyId, "X-Site-Id": siteId },
  });
  const storefrontBody = await storefront.json();
  assert.equal(storefront.status, 200);
  const videoItem = storefrontBody.vlogs.find((item) => item.slug === "care-story");
  assert.equal(videoItem.posterUrl, "https://cdn.example/story.jpg");
  const postItem = storefrontBody.vlogs.find((item) => item.slug === "photo-post");
  assert.equal(postItem.mediaType, "image");
  assert.equal(postItem.imageUrl, "https://cdn.example/post.jpg");
});

test("admin delete removes vlog records and duplicate slug validation still works", async () => {
  const before = await api("/admin/vlogs", { token });
  assert.ok(before.body.items.some((item) => item.slug === "care-story"));

  const removed = await api("/admin/vlogs/care-story", { method: "DELETE", token });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.body.ok, true);

  const afterDelete = await api("/admin/vlogs", { token });
  assert.equal(afterDelete.body.items.some((item) => item.slug === "care-story"), false);
  assert.equal(afterDelete.body.items.some((item) => item.slug === "photo-post"), true);

  const duplicate = await api("/admin/vlogs", {
    method: "POST",
    token,
    body: { slug: "photo-post", title: { en: "Duplicate", ar: "مكرر" }, mediaType: "image" },
  });
  assert.equal(duplicate.response.status, 409);

  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  const savedCompany = persisted.companies.find((entry) => entry.id === companyId);
  assert.deepEqual(savedCompany.settings.websiteContent.vlogs.map((item) => item.slug), ["photo-post"]);
});
