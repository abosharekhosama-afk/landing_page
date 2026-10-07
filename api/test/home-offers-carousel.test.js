import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "home-offers-carousel-"));
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const password = "HomeOffers-carousel-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-07T12:00:00.000Z";

const company = (id) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: {
    language: "en",
    currency: "USD",
    websiteConnection: {
      siteId: `${id}-storefront`,
      storefrontBaseUrl: `https://${id}.example`,
      defaultLocale: "en",
      supportedLocales: ["en"],
    },
  },
});

const user = (id, companyId, role = "company_admin") => ({
  id,
  email: `${id}@test.local`,
  password: passwordHash,
  role,
  company_id: companyId,
  permissions: [],
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const offer = (id, companyId, overrides = {}) => ({
  id,
  company_id: companyId,
  title: { en: `Offer ${id}`, ar: `عرض ${id}` },
  description: { en: "Description", ar: "الوصف" },
  image: "/images/products/product-placeholder.svg",
  ctaText: { en: "Shop now", ar: "تسوق الآن" },
  ctaLink: "products",
  displayOrder: 0,
  isActive: true,
  productIds: [],
  ...overrides,
});

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  domains: [
    { id: "icare-domain", company_id: "icare", domain: "icare.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "eb-domain", company_id: "eb-chemical", domain: "eb.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [user("icare-admin", "icare"), user("eb-admin", "eb-chemical")],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  ],
  brands: [],
  categories: [],
  products: [],
  offers: [
    // Visible icare offers (deliberately out of order to prove displayOrder sort).
    offer("icare-second", "icare", { displayOrder: 2 }),
    offer("icare-first", "icare", { displayOrder: 1 }),
    offer("icare-window", "icare", {
      displayOrder: 3,
      startAt: "2000-01-01T00:00:00.000Z",
      endAt: "2999-01-01T00:00:00.000Z",
    }),
    // Hidden icare offers: inactive, scheduled-future, expired.
    offer("icare-inactive", "icare", { displayOrder: 0, isActive: false }),
    offer("icare-future", "icare", { displayOrder: 0, startAt: "2999-01-01T00:00:00.000Z" }),
    offer("icare-expired", "icare", { displayOrder: 0, endAt: "2000-01-01T00:00:00.000Z" }),
    // Other tenant: must never leak into icare.
    offer("eb-only", "eb-chemical", { displayOrder: 1 }),
  ],
  orders: [],
  websiteTexts: [],
  websiteMedia: [],
  websiteMediaHiddenKeys: [],
  workSessions: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "home-offers-carousel-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = uploadsDir;

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function api(pathname, { method = "GET", token, companyId = "icare", body, siteId } = {}) {
  const headers = {
    ...(companyId ? { "X-Company-Id": companyId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(siteId ? { "X-Site-Id": siteId } : {}),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { response, body: parsed };
}

async function login(email, companyId) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Company-Id": companyId },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.token;
}

test("anonymous storefront sees only scheduled-active offers in displayOrder (no JWT)", async () => {
  // No token on purpose: the homepage is public.
  const { response, body } = await api("/home-offers", { companyId: "icare" });
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body));
  assert.deepEqual(
    body.map((item) => item.id),
    ["icare-first", "icare-second", "icare-window"],
  );
});

test("anonymous storefront never leaks the other tenant offers", async () => {
  const icare = await api("/home-offers", { companyId: "icare" });
  assert.equal(icare.response.status, 200);
  assert.equal(icare.body.some((item) => item.id === "eb-only"), false);

  const eb = await api("/home-offers", { companyId: "eb-chemical" });
  assert.equal(eb.response.status, 200);
  assert.deepEqual(eb.body.map((item) => item.id), ["eb-only"]);
});

test("admin /all still returns the full stored list (source of truth untouched)", async () => {
  const token = await login("icare-admin@test.local", "icare");
  const { response, body } = await api("/home-offers/all", { token, companyId: "icare" });
  assert.equal(response.status, 200);
  const ids = body.map((item) => item.id);
  for (const id of ["icare-first", "icare-second", "icare-window", "icare-inactive", "icare-future", "icare-expired"]) {
    assert.ok(ids.includes(id), `admin list should include ${id}`);
  }
  assert.equal(ids.includes("eb-only"), false);
});
