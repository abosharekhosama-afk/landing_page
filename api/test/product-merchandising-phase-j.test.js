import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";
import {
  applyMerchandisingFlags,
  productIsFeatured,
  productIsNewArrival,
  resolvePublicSalePrice,
} from "../src/products/merchandisingFlags.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-merchandising-phase-j-"));
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const password = "PhaseJ-merch-123!";
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

const user = (id, companyId, role = "company_admin", permissions = []) => ({
  id,
  email: `${id}@test.local`,
  password: passwordHash,
  role,
  company_id: companyId,
  permissions,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  domains: [
    { id: "icare-domain", company_id: "icare", domain: "icare.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "eb-domain", company_id: "eb-chemical", domain: "eb.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-view", "icare", "employee", ["products.view"]),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-view", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
    { id: "eb-brand", slug: "eb-brand", name: { en: "EB" }, company_id: "eb-chemical", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
  ],
  products: [
    {
      id: "icare-featured",
      slug: "icare-featured",
      sku: "FEAT-1",
      name: { en: "Featured Item" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      isActive: true,
      visible: true,
      isFeatured: true,
      isNewArrival: true,
      isBestseller: false,
      collection: ["promotions-discounts"],
      price: 40,
      sortOrder: 1,
      variants: [{ id: "v1", size: "M", price: 40, sale_price: 30, stock: 5, visible: true }],
    },
    {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Item" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      isActive: true,
      visible: true,
      isFeatured: false,
      price: 20,
      sortOrder: 2,
      variants: [{ id: "v2", size: "M", price: 20, stock: 2, visible: true }],
    },
    {
      id: "icare-trashed-featured",
      slug: "icare-trashed-featured",
      sku: "TRASH-1",
      name: { en: "Trashed Featured" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      isActive: true,
      visible: true,
      isFeatured: true,
      isNewArrival: true,
      deletedAt: now,
      price: 15,
      sortOrder: 3,
    },
    {
      id: "icare-inactive-featured",
      slug: "icare-inactive-featured",
      sku: "INACT-1",
      name: { en: "Inactive Featured" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      isActive: false,
      visible: true,
      isFeatured: true,
      price: 12,
      sortOrder: 4,
    },
    {
      id: "eb-product",
      slug: "eb-product",
      sku: "EB-1",
      name: { en: "EB Product" },
      company_id: "eb-chemical",
      brandId: "eb-brand",
      isActive: true,
      visible: true,
      isFeatured: true,
      price: 50,
      sortOrder: 1,
    },
  ],
  offers: [
    {
      id: "icare-offer-1",
      company_id: "icare",
      title: { en: "Limited Offer", ar: "عرض محدود" },
      description: { en: "Save now", ar: "وفر الآن" },
      image: "/images/products/product-placeholder.svg",
      ctaText: { en: "Shop", ar: "تسوق" },
      ctaLink: "products",
      displayOrder: 1,
      isActive: true,
      productIds: ["icare-featured", "icare-trashed-featured"],
    },
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
process.env.JWT_SECRET = "phase-j-merchandising-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = uploadsDir;

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function login(email) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Company-Id": email.startsWith("eb-") ? "eb-chemical" : "icare" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.token;
}

async function api(pathname, { method = "GET", token, companyId = "icare", body, siteId } = {}) {
  const headers = {
    "X-Company-Id": companyId,
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

test("Phase J helpers normalize featured/newArrival aliases", () => {
  const fromAlias = applyMerchandisingFlags({ isFeatured: true, isNewArrival: true });
  assert.equal(fromAlias.featured, true);
  assert.equal(fromAlias.newArrival, true);
  assert.equal(fromAlias.isFeatured, true);
  assert.equal(productIsFeatured({ isFeatured: true }), true);
  assert.equal(productIsNewArrival({ newArrival: true }), true);
  assert.deepEqual(resolvePublicSalePrice(40, 30), { price: 30, originalPrice: 40 });
});

test("public serializer exposes featured/newArrival/bestseller and never limitedOffer", () => {
  const serialized = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "P" },
    isFeatured: true,
    isNewArrival: true,
    isBestseller: true,
    limitedOffer: true,
    isLimitedOffer: true,
    costPrice: 9,
    variants: [{ id: "v1", price: 40, sale_price: 25, stock: 1, visible: true }],
  });
  assert.equal(serialized.featured, true);
  assert.equal(serialized.newArrival, true);
  assert.equal(serialized.bestseller, true);
  assert.equal("limitedOffer" in serialized, false);
  assert.equal("isLimitedOffer" in serialized, false);
  assert.equal("costPrice" in serialized, false);
  assert.equal(serialized.price, 25);
  assert.equal(serialized.originalPrice, 40);
  assert.equal(serialized.variants[0].price, 25);
  assert.equal(serialized.variants[0].originalPrice, 40);
});

test("admin can enable and disable Featured / New Arrival", async () => {
  const token = await login("icare-admin@test.local");
  const list = await api("/products", { token });
  assert.equal(list.response.status, 200);
  const before = list.body.find((item) => item.id === "icare-plain");
  assert.ok(before);
  assert.equal(before.isFeatured === true || before.featured === true, false);

  const enabled = await api("/products/icare-plain", {
    method: "PUT",
    token,
    body: {
      ...before,
      featured: true,
      newArrival: true,
      bestseller: false,
    },
  });
  assert.equal(enabled.response.status, 200, JSON.stringify(enabled.body));
  assert.equal(enabled.body.featured, true);
  assert.equal(enabled.body.isFeatured, true);
  assert.equal(enabled.body.newArrival, true);
  assert.equal(enabled.body.isNewArrival, true);

  const disabled = await api("/products/icare-plain", {
    method: "PUT",
    token,
    body: {
      ...enabled.body,
      featured: false,
      newArrival: false,
    },
  });
  assert.equal(disabled.response.status, 200, JSON.stringify(disabled.body));
  assert.equal(disabled.body.featured, false);
  assert.equal(disabled.body.newArrival, false);
});

test("view-only employee cannot update merchandising flags", async () => {
  const token = await login("icare-view@test.local");
  const result = await api("/products/icare-featured", {
    method: "PUT",
    token,
    body: { id: "icare-featured", featured: false, name: { en: "Nope" } },
  });
  assert.equal(result.response.status, 403);
});

test("company cannot feature another tenant product", async () => {
  const token = await login("icare-admin@test.local");
  const result = await api("/products/eb-product", {
    method: "PUT",
    token,
    companyId: "icare",
    body: { id: "eb-product", featured: true, name: { en: "Stolen" } },
  });
  assert.equal(result.response.status, 404);
});

test("storefront content exposes merchandising flags and excludes trash/inactive", async () => {
  const { response, body } = await api("/storefront/content?locale=en", {
    companyId: "icare",
    siteId: "icare-storefront",
  });
  assert.equal(response.status, 200);
  const slugs = body.products.map((item) => item.slug);
  assert.ok(slugs.includes("icare-featured"));
  assert.equal(slugs.includes("icare-trashed-featured"), false);
  assert.equal(slugs.includes("icare-inactive-featured"), false);
  assert.equal(slugs.includes("eb-product"), false);

  const featured = body.products.find((item) => item.slug === "icare-featured");
  assert.equal(featured.featured, true);
  assert.equal(featured.newArrival, true);
  assert.equal(featured.bestseller, false);
  assert.equal("limitedOffer" in featured, false);
  assert.equal("costPrice" in featured, false);
  assert.equal(featured.price, 30);
  assert.equal(featured.originalPrice, 40);

  const detail = await api("/storefront/products/icare-featured", {
    companyId: "icare",
    siteId: "icare-storefront",
  });
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.newArrival, true);
  assert.equal(detail.body.featured, true);
});

test("homepage offers accept productIds, reject trashed and cross-tenant", async () => {
  const token = await login("icare-admin@test.local");

  const trashedAttach = await api("/home-offers/icare-offer-1", {
    method: "PUT",
    token,
    body: {
      title: { en: "Limited Offer", ar: "عرض محدود" },
      productIds: ["icare-trashed-featured"],
    },
  });
  assert.equal(trashedAttach.response.status, 400);

  const crossTenant = await api("/home-offers/icare-offer-1", {
    method: "PUT",
    token,
    body: {
      title: { en: "Limited Offer", ar: "عرض محدود" },
      productIds: ["eb-product"],
    },
  });
  assert.equal(crossTenant.response.status, 400);

  const ok = await api("/home-offers/icare-offer-1", {
    method: "PUT",
    token,
    body: {
      title: { en: "Limited Offer", ar: "عرض محدود" },
      description: { en: "Save now", ar: "وفر الآن" },
      image: "/images/products/product-placeholder.svg",
      ctaText: { en: "Shop", ar: "تسوق" },
      ctaLink: "products",
      displayOrder: 1,
      isActive: true,
      productIds: ["icare-featured", "icare-plain"],
    },
  });
  assert.equal(ok.response.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(ok.body.productIds, ["icare-featured", "icare-plain"]);

  const publicOffers = await api("/home-offers", { companyId: "icare" });
  assert.equal(publicOffers.response.status, 200);
  const offer = publicOffers.body.find((item) => item.id === "icare-offer-1");
  assert.ok(offer);
  assert.deepEqual(offer.productIds, ["icare-featured", "icare-plain"]);
  assert.equal("limitedOffer" in offer, false);
});

test("permanent delete scrubs homepage offer productIds", async () => {
  const token = await login("icare-admin@test.local");

  const attach = await api("/home-offers", {
    method: "POST",
    token,
    body: {
      id: "icare-offer-scrub",
      title: { en: "Scrub Offer", ar: "عرض" },
      description: { en: "Temp", ar: "موقت" },
      image: "/images/products/product-placeholder.svg",
      ctaText: { en: "Shop", ar: "تسوق" },
      ctaLink: "products",
      displayOrder: 9,
      isActive: true,
      productIds: ["icare-featured"],
    },
  });
  assert.equal(attach.response.status, 201, JSON.stringify(attach.body));

  // Create a disposable product to attach then permanently delete.
  const created = await api("/products", {
    method: "POST",
    token,
    body: {
      slug: "icare-disposable",
      sku: "DISP-1",
      name: { en: "Disposable" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      isActive: true,
      visible: true,
      featured: true,
      price: 8,
      variants: [{ id: "vd", size: "S", price: 8, stock: 1, visible: true }],
    },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const disposableId = created.body.id;

  const linked = await api("/home-offers/icare-offer-scrub", {
    method: "PUT",
    token,
    body: {
      ...attach.body,
      productIds: ["icare-featured", disposableId],
    },
  });
  assert.equal(linked.response.status, 200, JSON.stringify(linked.body));
  assert.ok(linked.body.productIds.includes(disposableId));

  const trash = await api(`/products/${disposableId}`, { method: "DELETE", token });
  assert.equal(trash.response.status, 204);

  const permanent = await api(`/products/${disposableId}/permanent`, { method: "DELETE", token });
  assert.equal(permanent.response.status, 204);

  const offers = await api("/home-offers/all", { token });
  assert.equal(offers.response.status, 200);
  const offer = offers.body.find((item) => item.id === "icare-offer-scrub");
  assert.ok(offer);
  assert.equal(offer.productIds.includes(disposableId), false);
  assert.ok(offer.productIds.includes("icare-featured"));
});
