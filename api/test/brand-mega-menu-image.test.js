import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import { serializePublicBrand } from "../src/storefront/publicContent.js";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/022_brand_menu_image.sql", import.meta.url),
  "utf8",
);
const brandsRoute = fs.readFileSync(new URL("../src/routes/brands.js", import.meta.url), "utf8");
const postgresStore = fs.readFileSync(new URL("../src/data/postgresStore.js", import.meta.url), "utf8");
const memoryStore = fs.readFileSync(new URL("../src/data/store.js", import.meta.url), "utf8");
const publicContent = fs.readFileSync(
  new URL("../src/storefront/publicContent.js", import.meta.url),
  "utf8",
);
const cpanel = fs.readFileSync(
  new URL("../../cpanel/src/pages/AdminDashboardPage.jsx", import.meta.url),
  "utf8",
);

test("migration 022 adds independent menu_image without touching other media columns", () => {
  assert.match(migration, /add column if not exists menu_image text/i);
  assert.doesNotMatch(migration, /update\s+public\.company_brands/i);
  assert.doesNotMatch(migration, /set\s+menu_image/i);
});

test("persistence maps menuImage independently from headerImage and heroPoster", () => {
  assert.match(postgresStore, /menu_image:\s*brand\.menuImage/);
  assert.match(postgresStore, /menuImage:\s*row\.menu_image/);
  assert.match(postgresStore, /menuImage:\s*"menu_image"/);
  assert.match(postgresStore, /header_image, menu_image, country/);
  assert.match(memoryStore, /menuImage:\s*brand\.menuImage \|\| brand\.menu_image/);
  assert.match(brandsRoute, /"menuImage"/);
  assert.match(publicContent, /menuImage:\s*safeUrl\(brand\.menuImage/);
  assert.doesNotMatch(brandsRoute, /kids-velvet|velvet-brand/);
  const brandForm = cpanel.slice(cpanel.indexOf('kind === "brand"'), cpanel.indexOf('kind === "vlog"'));
  assert.match(brandForm, /Mega Menu Image/);
  assert.doesNotMatch(brandForm, /kids-velvet|brand\.\{slug\}\.menuImage|websiteMedia/);
});

test("serializePublicBrand exposes menuImage without remapping sibling media fields", () => {
  const brand = serializePublicBrand({
    id: "b1",
    slug: "demo",
    name: { en: "Demo", ar: "تجريبي" },
    logoUrl: "https://cdn.example/logo.png",
    heroVideo: "https://cdn.example/hero.mp4",
    heroPoster: "https://cdn.example/poster.jpg",
    headerImage: "https://cdn.example/header.jpg",
    menuImage: "https://cdn.example/menu.jpg",
  });
  assert.equal(brand.logoUrl, "https://cdn.example/logo.png");
  assert.equal(brand.heroVideo, "https://cdn.example/hero.mp4");
  assert.equal(brand.heroPoster, "https://cdn.example/poster.jpg");
  assert.equal(brand.headerImage, "https://cdn.example/header.jpg");
  assert.equal(brand.menuImage, "https://cdn.example/menu.jpg");

  const cleared = serializePublicBrand({
    id: "b1",
    slug: "demo",
    name: "Demo",
    logoUrl: "https://cdn.example/logo.png",
    headerImage: "https://cdn.example/header.jpg",
    menuImage: null,
  });
  assert.equal(cleared.menuImage, "");
  assert.equal(cleared.logoUrl, "https://cdn.example/logo.png");
  assert.equal(cleared.headerImage, "https://cdn.example/header.jpg");

  const unsafe = serializePublicBrand({
    id: "b1",
    slug: "demo",
    name: "Demo",
    menuImage: "javascript:alert(1)",
  });
  assert.equal(unsafe.menuImage, "");
});

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-mega-menu-image-"));
const now = "2026-09-06T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);

fs.writeFileSync(
  path.join(dataStoreDir, "store.json"),
  JSON.stringify({
    version: 2,
    companies: [
      {
        id: "tenant-a",
        slug: "tenant-a",
        name: "Tenant A",
        status: "active",
        settings: { language: "en", currency: "USD" },
      },
      {
        id: "tenant-b",
        slug: "tenant-b",
        name: "Tenant B",
        status: "active",
        settings: { language: "en", currency: "USD" },
      },
    ],
    users: [
      {
        id: "admin-a",
        name: "Admin A",
        email: "admin-a@test.local",
        password: passwordHash,
        role: "company_admin",
        permissions: [],
        isActive: true,
        company_id: "tenant-a",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "admin-b",
        name: "Admin B",
        email: "admin-b@test.local",
        password: passwordHash,
        role: "company_admin",
        permissions: [],
        isActive: true,
        company_id: "tenant-b",
        createdAt: now,
        updatedAt: now,
      },
    ],
    memberships: [
      {
        id: "tenant-a:admin-a",
        companyId: "tenant-a",
        userId: "admin-a",
        role: "company_admin",
        status: "active",
        permissions: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "tenant-b:admin-b",
        companyId: "tenant-b",
        userId: "admin-b",
        role: "company_admin",
        status: "active",
        permissions: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    products: [],
    categories: [],
    brands: [],
    websiteTexts: [],
    websiteMedia: [
      {
        id: "home-hero",
        company_id: "tenant-a",
        sectionKey: "home.hero",
        sectionLabel: "Home hero",
        groupKey: "home",
        imageUrl: "https://cdn.example/home-hero.jpg",
        isActive: true,
      },
    ],
    websiteMediaHiddenKeys: [],
    workSessions: [],
    domains: [],
    orders: [],
  }),
);

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "brand-mega-menu-image-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function login(email) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, `login failed for ${email}`);
  return body.token;
}

async function request(pathname, { token, method = "GET", body, companyId } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { "X-Company-Id": companyId } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => null) };
}

test("brand create/update/read/clear keep menuImage independent of sibling media", async () => {
  const tokenA = await login("admin-a@test.local");
  const tokenB = await login("admin-b@test.local");

  const created = await request("/brands", {
    token: tokenA,
    method: "POST",
    companyId: "tenant-a",
    body: {
      slug: "mega-menu-brand",
      name: { en: "Mega", ar: "ميجا" },
      logoUrl: "https://cdn.example/logo.png",
      heroVideo: "https://cdn.example/hero.mp4",
      heroPoster: "https://cdn.example/poster.jpg",
      headerImage: "https://cdn.example/header.jpg",
      menuImage: "https://cdn.example/menu.jpg",
    },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.menuImage, "https://cdn.example/menu.jpg");
  assert.equal(created.body.logoUrl, "https://cdn.example/logo.png");
  assert.equal(created.body.heroPoster, "https://cdn.example/poster.jpg");
  assert.equal(created.body.headerImage, "https://cdn.example/header.jpg");

  const patchedMenu = await request(`/brands/${created.body.id}`, {
    token: tokenA,
    method: "PATCH",
    companyId: "tenant-a",
    body: { menuImage: "https://cdn.example/menu-2.jpg" },
  });
  assert.equal(patchedMenu.response.status, 200);
  assert.equal(patchedMenu.body.menuImage, "https://cdn.example/menu-2.jpg");
  assert.equal(patchedMenu.body.logoUrl, "https://cdn.example/logo.png");
  assert.equal(patchedMenu.body.heroVideo, "https://cdn.example/hero.mp4");
  assert.equal(patchedMenu.body.heroPoster, "https://cdn.example/poster.jpg");
  assert.equal(patchedMenu.body.headerImage, "https://cdn.example/header.jpg");

  const patchedHeader = await request(`/brands/${created.body.id}`, {
    token: tokenA,
    method: "PATCH",
    companyId: "tenant-a",
    body: { headerImage: "https://cdn.example/header-2.jpg" },
  });
  assert.equal(patchedHeader.response.status, 200);
  assert.equal(patchedHeader.body.headerImage, "https://cdn.example/header-2.jpg");
  assert.equal(patchedHeader.body.menuImage, "https://cdn.example/menu-2.jpg");

  const cleared = await request(`/brands/${created.body.id}`, {
    token: tokenA,
    method: "PATCH",
    companyId: "tenant-a",
    body: { menuImage: null },
  });
  assert.equal(cleared.response.status, 200);
  assert.equal(cleared.body.menuImage, null);
  assert.equal(cleared.body.logoUrl, "https://cdn.example/logo.png");
  assert.equal(cleared.body.headerImage, "https://cdn.example/header-2.jpg");

  const read = await request(`/brands/${created.body.id}`, {
    token: tokenA,
    companyId: "tenant-a",
  });
  assert.equal(read.response.status, 200);
  assert.equal(read.body.menuImage, null);

  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  const hero = (persisted.websiteMedia || []).find((item) => item.sectionKey === "home.hero");
  assert.equal(hero?.imageUrl, "https://cdn.example/home-hero.jpg");

  assert.equal(
    (await request(`/brands/${created.body.id}`, { token: tokenB })).response.status,
    404,
  );
});
