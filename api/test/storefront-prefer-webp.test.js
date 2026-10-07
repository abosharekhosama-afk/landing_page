import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "storefront-prefer-webp-test-"));
const now = "2026-09-13T00:00:00.000Z";
fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "kids-velvet",
      slug: "kids-velvet",
      name: "i-play",
      status: "active",
      domain: "",
      settings: {
        currency: "USD",
        websiteConnection: {
          siteId: "kids-velvet-storefront",
          storefrontBaseUrl: "https://feature-preview.vercel.app",
          defaultLocale: "en",
          supportedLocales: ["en", "ar"],
        },
      },
    },
  ],
  domains: [
    { id: "kids-domain", company_id: "kids-velvet", domain: "i-play-preview.vercel.app", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [], memberships: [], orders: [],
  products: [
    {
      id: "uploads-product",
      company_id: "kids-velvet",
      slug: "uploads-product",
      name: { en: "Uploads product", ar: "منتج" },
      price: 10,
      image: "/uploads/kids-velvet/products/uploads-product.png",
      hoverImage: "/uploads/kids-velvet/products/uploads-product-hover.jpg",
      gallery_images: [{ id: "g1", image_url: "/uploads/kids-velvet/products/uploads-product-g1.jpg" }],
      variants: [{ id: "v1", image_url: "/uploads/kids-velvet/products/uploads-product-v1.png", price: 10, stock: 1, visible: true }],
      visible: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "missing-product",
      company_id: "kids-velvet",
      slug: "missing-product",
      name: { en: "Missing product", ar: "منتج" },
      price: 10,
      image: "/uploads/kids-velvet/products/missing-product.png",
      visible: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: [], brands: [], websiteTexts: [], websiteMedia: [], websiteMediaHiddenKeys: [], workSessions: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "storefront-prefer-webp-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

// WebP siblings that exist on disk (missing-product intentionally has none).
for (const relative of [
  "kids-velvet/products/uploads-product.webp",
  "kids-velvet/products/uploads-product-hover.webp",
  "kids-velvet/products/uploads-product-g1.webp",
  "kids-velvet/products/uploads-product-v1.webp",
]) {
  const full = path.join(process.env.UPLOADS_DIR, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, Buffer.from("webp"));
}

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const baseUrl = `http://127.0.0.1:${server.address().port}/api/storefront`;

async function request(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      "X-Company-Id": "kids-velvet",
      "X-Site-Id": "kids-velvet-storefront",
    },
  });
  return { response, body: await response.json().catch(() => null) };
}

test("storefront content prefers existing .webp siblings for /uploads/ images", async () => {
  const { response, body } = await request("/content?locale=en");
  assert.equal(response.status, 200);

  const uploadsProduct = body.products.find((item) => item.slug === "uploads-product");
  assert.equal(uploadsProduct.image, "/uploads/kids-velvet/products/uploads-product.webp");
  assert.equal(uploadsProduct.hoverImage, "/uploads/kids-velvet/products/uploads-product-hover.webp");
  assert.equal(uploadsProduct.gallery[0], "/uploads/kids-velvet/products/uploads-product-g1.webp");
  assert.equal(uploadsProduct.variants[0].image, "/uploads/kids-velvet/products/uploads-product-v1.webp");

  const missingProduct = body.products.find((item) => item.slug === "missing-product");
  assert.equal(missingProduct.image, "/uploads/kids-velvet/products/missing-product.png");
});