import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "storefront-engagement-"));
const now = "2026-09-10T00:00:00.000Z";

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "kids-velvet",
      slug: "kids-velvet",
      name: "i-play",
      status: "active",
      settings: {
        currency: "USD",
        websiteConnection: {
          siteId: "kids-velvet-storefront",
          storefrontBaseUrl: "https://feature-preview.vercel.app",
          defaultLocale: "en",
          supportedLocales: ["en", "ar"],
        },
        storefrontDisplayRules: { excludedPages: ["/checkout"] },
      },
    },
    {
      id: "other-shop",
      slug: "other-shop",
      name: "Other",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "other-shop-storefront",
          storefrontBaseUrl: "https://other-shop.example",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
  ],
  domains: [
    {
      id: "kids-domain",
      company_id: "kids-velvet",
      domain: "i-play-preview.vercel.app",
      is_primary: true,
      is_active: true,
      is_verified: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "other-domain",
      company_id: "other-shop",
      domain: "other-shop.example",
      is_primary: true,
      is_active: true,
      is_verified: true,
      created_at: now,
      updated_at: now,
    },
  ],
  products: [],
  categories: [],
  brands: [],
  websiteTexts: [],
  websiteMedia: [
    {
      id: "logo-media",
      company_id: "kids-velvet",
      sectionKey: "legal.logo",
      imageUrl: "https://cdn.example/logo.png",
      isActive: true,
    },
  ],
  websiteMediaHiddenKeys: [],
  announcements: [
    {
      id: "ann-1",
      company_id: "kids-velvet",
      title: "Welcome",
      text: "Hello shoppers",
      link: "/shop",
      is_active: true,
      priority: 5,
      placement: "ALL_PAGES",
      selected_pages: [],
      start_date: null,
      end_date: null,
    },
    {
      id: "ann-home",
      company_id: "kids-velvet",
      title: "Home only",
      text: "Homepage promo",
      is_active: true,
      priority: 9,
      placement: "HOMEPAGE",
      selected_pages: [],
    },
    {
      id: "ann-inactive",
      company_id: "kids-velvet",
      title: "Hidden",
      text: "Nope",
      is_active: false,
      priority: 99,
      placement: "ALL_PAGES",
    },
    {
      id: "ann-other",
      company_id: "other-shop",
      title: "Other tenant",
      text: "Leak?",
      is_active: true,
      priority: 1,
      placement: "ALL_PAGES",
    },
  ],
  splashAds: [
    {
      id: "splash-1",
      company_id: "kids-velvet",
      title: "Splash",
      desktop_image_id: "https://cdn.example/splash.jpg",
      mobile_image_id: "",
      link: "/promo",
      is_active: true,
      frequency: "EVERY_VISIT",
      excluded_pages: ["/checkout"],
      close_delay_seconds: 0,
      display_duration_seconds: 0,
    },
    {
      id: "splash-other",
      company_id: "other-shop",
      title: "Other splash",
      desktop_image_id: "https://cdn.example/other.jpg",
      is_active: true,
      frequency: "EVERY_VISIT",
      excluded_pages: [],
    },
  ],
  splashAdEvents: [],
  storePolicies: [
    {
      id: "pol-1",
      company_id: "kids-velvet",
      type: "SHIPPING",
      title_en: "Shipping",
      title_ar: "الشحن",
      content_en: "Ships fast",
      content_ar: "شحن سريع",
      is_active: true,
      display_order: 1,
      placements: ["FOOTER", "STANDALONE_PAGE"],
    },
    {
      id: "pol-inactive",
      company_id: "kids-velvet",
      type: "PRIVACY",
      title_en: "Hidden policy",
      content_en: "Hidden",
      is_active: false,
      display_order: 2,
      placements: ["FOOTER"],
    },
  ],
  legalInformation: [
    {
      id: "legal-kids-velvet",
      company_id: "kids-velvet",
      registration_number: "REG-1",
      authority_name: "Authority",
      authority_logo_media_id: "logo-media",
      business_information: { en: "Registered business", ar: "نشاط مسجل" },
      placements: ["FOOTER", "STANDALONE_PAGE"],
    },
  ],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "storefront-engagement-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../../src/server.js");
const { splashAdEventRepository } = await import("../../src/data/store.js");

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const baseUrl = `http://127.0.0.1:${server.address().port}/api/storefront`;

async function request(pathname, { companyId = "kids-velvet", siteId = "kids-velvet-storefront", method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      "X-Company-Id": companyId,
      "X-Site-Id": siteId,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : "{}",
  });
  return { response, body: await response.json().catch(() => null) };
}

test("storefront content exposes tenant engagement fields with display rules", async () => {
  const { response, body } = await request("/content?page=/");
  assert.equal(response.status, 200);
  assert.deepEqual(body.announcements.map((item) => item.id), ["ann-home", "ann-1"]);
  assert.deepEqual(body.splashAds.map((item) => item.id), ["splash-1"]);
  assert.deepEqual(body.policies.map((item) => item.id), ["pol-1"]);
  assert.equal(body.legalInformation.authority_name, "Authority");
  assert.equal(body.legalInformation.authority_logo_url, "https://cdn.example/logo.png");
  assert.ok(body.displayRules.excludedPages.includes("/checkout"));
  assert.equal(body.announcements.some((item) => item.id === "ann-other"), false);
  assert.equal(body.splashAds.some((item) => item.id === "splash-other"), false);
});

test("excluded pages hide announcements and splash ads but keep policies/legal", async () => {
  const { response, body } = await request("/content?page=/checkout");
  assert.equal(response.status, 200);
  assert.deepEqual(body.announcements, []);
  assert.deepEqual(body.splashAds, []);
  assert.equal(body.policies.length, 1);
  assert.equal(body.legalInformation.registration_number, "REG-1");
});

test("public splash tracking is tenant-scoped", async () => {
  const view = await request("/splash-ads/splash-1/view", { method: "POST" });
  assert.equal(view.response.status, 201);
  assert.equal(view.body.event_type, "VIEW");

  const cross = await request("/splash-ads/splash-other/view", { method: "POST" });
  assert.equal(cross.response.status, 404);

  const events = splashAdEventRepository.getByCompany("kids-velvet");
  assert.equal(events.some((event) => event.splash_ad_id === "splash-1" && event.event_type === "VIEW"), true);
  assert.equal(splashAdEventRepository.getByCompany("other-shop").length, 0);

  const click = await request("/splash-ads/splash-1/click", { method: "POST" });
  assert.equal(click.response.status, 201);
  assert.equal(click.body.event_type, "CLICK");
});
