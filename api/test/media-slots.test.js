import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-slots-test-"));
const now = "2026-08-12T00:00:00.000Z";
const password = "Media-slots-2026!";
const passwordHash = await hashPassword(password);

const users = [
  ["kids-admin", "kids-admin@test.local", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));

const memberships = [
  ["kids-velvet", "kids-admin", "company_admin", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "kids-velvet", slug: "kids-velvet", name: "i-play", status: "active", settings: { websiteConnection: { siteId: "kids-velvet-storefront", storefrontBaseUrl: "https://feature-preview.vercel.app", defaultLocale: "ar", supportedLocales: ["ar", "en"] } } },
  ],
  domains: [
    { id: "kids-domain", company_id: "kids-velvet", domain: "feature-preview.vercel.app", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users,
  memberships,
  websiteTexts: [],
  websiteMedia: [
    { id: "slot-hero-video", company_id: "kids-velvet", sectionKey: "home.hero.video", sectionLabel: "Home hero video", groupKey: "home", videoUrl: "/uploads/kids-velvet/website-media/home.mp4", mediaType: "video", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-hero-poster", company_id: "kids-velvet", sectionKey: "home.hero.poster", sectionLabel: "Home hero poster", groupKey: "home", imageUrl: "/uploads/kids-velvet/website-media/home-poster.jpg", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-brand-logo", company_id: "kids-velvet", sectionKey: "brand.baby.logo", sectionLabel: "Branch logo", groupKey: "brands", imageUrl: "/uploads/kids-velvet/website-media/baby-logo.png", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-brand-video", company_id: "kids-velvet", sectionKey: "brand.baby.video", sectionLabel: "Brand baby hero video", groupKey: "brands", videoUrl: "/uploads/kids-velvet/website-media/baby.mp4", mediaType: "video", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-brand-poster", company_id: "kids-velvet", sectionKey: "brand.baby.poster", sectionLabel: "Brand baby hero poster", groupKey: "brands", imageUrl: "/uploads/kids-velvet/website-media/baby-poster.jpg", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-category-video", company_id: "kids-velvet", sectionKey: "category.toys.heroVideo", sectionLabel: "Category toys hero video", groupKey: "categories", videoUrl: "/uploads/kids-velvet/website-media/toys.mp4", mediaType: "video", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-product-video", company_id: "kids-velvet", sectionKey: "product.play-one.usageVideo", sectionLabel: "Product usage video", groupKey: "products", videoUrl: "/uploads/kids-velvet/website-media/play-one.mp4", mediaType: "video", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-product-poster", company_id: "kids-velvet", sectionKey: "product.play-one.usageVideoPoster", sectionLabel: "Product usage poster", groupKey: "products", imageUrl: "/uploads/kids-velvet/website-media/play-one-poster.jpg", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-site-logo", company_id: "kids-velvet", sectionKey: "site.logo", sectionLabel: "Website logo", groupKey: "identity", imageUrl: "/uploads/kids-velvet/website-media/logo.png", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-about-0-image", company_id: "kids-velvet", sectionKey: "about.0.image", sectionLabel: "About section 1 image", groupKey: "about", imageUrl: "/uploads/kids-velvet/website-media/about-0.jpg", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-news-0-image", company_id: "kids-velvet", sectionKey: "news.0.image", sectionLabel: "News item 1 image", groupKey: "news", imageUrl: "/uploads/kids-velvet/website-media/news-0.jpg", isActive: true, createdAt: now, updatedAt: now },
    { id: "slot-hidden", company_id: "kids-velvet", sectionKey: "home.hero.video", sectionLabel: "Hidden video slot", groupKey: "home", videoUrl: "/uploads/kids-velvet/website-media/old.mp4", mediaType: "video", isActive: false, createdAt: now, updatedAt: now },
  ],
  websiteMediaHiddenKeys: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "media-slots-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("storefront content returns the exact media slot keys i-play consumes", async () => {
  const response = await fetch(`${baseUrl}/storefront/content?locale=en`, {
    headers: { "X-Company-Id": "kids-velvet", "X-Site-Id": "kids-velvet-storefront", Origin: "https://feature-preview.vercel.app" },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const media = body.media;

  const slot = (sectionKey) => media.find((item) => item.sectionKey === sectionKey);

  const homeVideo = slot("home.hero.video");
  assert.ok(homeVideo, "home.hero.video slot must be exposed");
  assert.equal(homeVideo.mediaType, "video");
  assert.equal(homeVideo.video, "/uploads/kids-velvet/website-media/home.mp4");
  assert.ok("image" in homeVideo);
  assert.ok("fallbackImage" in homeVideo);

  const homePoster = slot("home.hero.poster");
  assert.equal(homePoster.image, "/uploads/kids-velvet/website-media/home-poster.jpg");

  const brandVideo = slot("brand.baby.video");
  assert.ok(brandVideo, "brand.baby.video slot must be exposed");
  assert.equal(brandVideo.mediaType, "video");
  assert.equal(brandVideo.video, "/uploads/kids-velvet/website-media/baby.mp4");
  const brandPoster = slot("brand.baby.poster");
  assert.equal(brandPoster.image, "/uploads/kids-velvet/website-media/baby-poster.jpg");
  const brandLogo = slot("brand.baby.logo");
  assert.ok(brandLogo, "brand.baby.logo slot must be exposed");
  assert.equal(brandLogo.image, "/uploads/kids-velvet/website-media/baby-logo.png");

  const categoryVideo = slot("category.toys.heroVideo");
  assert.ok(categoryVideo, "category.toys.heroVideo slot must be exposed");
  assert.equal(categoryVideo.mediaType, "video");
  assert.equal(categoryVideo.video, "/uploads/kids-velvet/website-media/toys.mp4");

  const productVideo = slot("product.play-one.usageVideo");
  assert.ok(productVideo, "product usage video slot must be exposed");
  assert.equal(productVideo.video, "/uploads/kids-velvet/website-media/play-one.mp4");
  const productPoster = slot("product.play-one.usageVideoPoster");
  assert.equal(productPoster.image, "/uploads/kids-velvet/website-media/play-one-poster.jpg");

  const siteLogo = slot("site.logo");
  assert.ok(siteLogo, "site.logo slot must be exposed");
  assert.equal(siteLogo.image, "/uploads/kids-velvet/website-media/logo.png");

  const aboutImage = slot("about.0.image");
  assert.ok(aboutImage, "about.0.image slot must be exposed");
  assert.equal(aboutImage.image, "/uploads/kids-velvet/website-media/about-0.jpg");

  const newsImage = slot("news.0.image");
  assert.ok(newsImage, "news.0.image slot must be exposed");
  assert.equal(newsImage.image, "/uploads/kids-velvet/website-media/news-0.jpg");
});

test("storefront content resolves the newest active media for each slot key", async () => {
  const response = await fetch(`${baseUrl}/storefront/content?locale=en`, {
    headers: { "X-Company-Id": "kids-velvet", "X-Site-Id": "kids-velvet-storefront", Origin: "https://feature-preview.vercel.app" },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const heroVideos = body.media.filter((item) => item.sectionKey === "home.hero.video");
  assert.equal(heroVideos.length, 1, "inactive media must not duplicate an active slot");
  assert.equal(heroVideos[0].video, "/uploads/kids-velvet/website-media/home.mp4");
});

test("public serialization does not leak internal media fields", async () => {
  const response = await fetch(`${baseUrl}/storefront/content?locale=en`, {
    headers: { "X-Company-Id": "kids-velvet", "X-Site-Id": "kids-velvet-storefront", Origin: "https://feature-preview.vercel.app" },
  });
  const body = await response.json();
  const item = body.media.find((entry) => entry.sectionKey === "product.play-one.usageVideo");
  assert.equal("company_id" in item, false);
  assert.equal("videoUrl" in item, false);
  assert.equal("updatedAt" in item, false);
});
