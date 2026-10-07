import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import {
  bannerCtaLabelText,
  getOfferStatus,
  isSafeBannerUrl,
  isScheduledActive,
  validateOffer,
} from "../src/content/homeOfferRules.js";

const NOW = new Date("2026-09-17T12:00:00.000Z").getTime();

// --- Pure rules: campaign status -------------------------------------------

test("getOfferStatus reports Active/Scheduled/Expired/Disabled", () => {
  assert.equal(getOfferStatus({ isActive: true }, NOW), "active");
  assert.equal(getOfferStatus({}, NOW), "active");
  assert.equal(
    getOfferStatus({ startAt: "2026-09-17T13:00:00.000Z" }, NOW),
    "scheduled",
  );
  assert.equal(
    getOfferStatus({ endAt: "2026-09-17T11:59:59.000Z", isActive: true }, NOW),
    "expired",
  );
  assert.equal(getOfferStatus({ isActive: false }, NOW), "disabled");
  assert.equal(
    getOfferStatus({ isActive: false, endAt: "2020-01-01T00:00:00.000Z" }, NOW),
    "disabled",
  );
});

test("expired banners never report scheduled (regression)", () => {
  const expired = { isActive: true, endAt: "2026-09-17T11:59:59.000Z" };
  assert.equal(getOfferStatus(expired, NOW), "expired");
  assert.notEqual(getOfferStatus(expired, NOW), "scheduled");
  assert.equal(isScheduledActive(expired, NOW), false);
});

// --- Pure rules: safe URLs ---------------------------------------------------

test("isSafeBannerUrl blocks javascript: and every unsafe scheme", () => {
  for (const bad of [
    "javascript:alert(1)",
    "  javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<h1>x</h1>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "blob:https://example.com/x",
    "ftp://example.com/x",
    "mailto:shop@example.com",
    "https://example.com/a b",
    'https://example.com/"quoted"',
    "https://user:pass@example.com/",
    "https://",
    "products<script>",
  ]) {
    assert.equal(isSafeBannerUrl(bad), false, `should block ${bad}`);
  }
});

test("isSafeBannerUrl allows the storefront destinations", () => {
  for (const good of [
    "",
    "products",
    "car-care",
    "/offers/summer",
    "#top",
    "https://example.com/sale",
    "http://localhost:5000/uploads/banner.jpg",
  ]) {
    assert.equal(isSafeBannerUrl(good), true, `should allow ${good}`);
  }
});

// --- Pure rules: CTA validation ----------------------------------------------

test("validateOffer keeps legacy payloads valid and enforces CTA rules", () => {
  assert.equal(validateOffer({ title: { en: "Offer" }, transitionDurationMs: 5000 }), null);
  const legacy = {
    id: "legacy",
    title: { en: "Legacy" },
    image: "/uploads/test/banner.jpg",
    desktopImage: "/uploads/test/banner.jpg",
    mobileImage: "/uploads/test/banner.jpg",
    autoplay: true,
    transitionDurationMs: 5000,
    isActive: true,
  };
  assert.equal(validateOffer(legacy), null);
  assert.equal(bannerCtaLabelText({ en: "Shop" }), "Shop");
  assert.equal(bannerCtaLabelText("Buy"), "Buy");
  assert.equal(bannerCtaLabelText({}), "");
  // Link without a label is rejected.
  assert.match(
    validateOffer({ title: { en: "Offer" }, ctaText: { en: "", ar: "" }, ctaLink: "products" }),
    /CTA label/i,
  );
  // Unsafe links are rejected even with a label present.
  assert.match(
    validateOffer({ title: { en: "Offer" }, ctaText: { en: "Shop" }, ctaLink: "javascript:alert(1)" }),
    /safe URL/i,
  );
  assert.match(
    validateOffer({ title: { en: "Offer" }, ctaText: { en: "Shop" }, ctaLink: "data:text/html,x" }),
    /safe URL/i,
  );
  // Safe links with a label pass.
  assert.equal(
    validateOffer({ title: { en: "Offer" }, ctaText: { en: "Shop" }, ctaLink: "https://example.com/sale" }),
    null,
  );
  assert.equal(
    validateOffer({ title: { en: "عرض" }, ctaText: { ar: "تسوق" }, ctaLink: "/offers" }),
    null,
  );
});

// --- Runtime: create/update enforcement --------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "home-offers-banners-v2-"));
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const password = "Banners-v2-123!";
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

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  domains: [],
  users: [user("icare-admin", "icare"), user("eb-admin", "eb-chemical")],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  ],
  brands: [],
  categories: [],
  products: [],
  offers: [],
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
process.env.JWT_SECRET = "home-offers-banners-v2-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = uploadsDir;

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function api(pathname, { method = "GET", token, companyId = "icare", body } = {}) {
  const headers = {
    ...(companyId ? { "X-Company-Id": companyId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

const validBanner = () => ({
  title: { en: "Winter sale", ar: "تخفيضات الشتاء" },
  description: { en: "Up to 50% off", ar: "حتى 50%" },
  desktopImage: "/uploads/icare/winter.jpg",
  mobileImage: "/uploads/icare/winter-mobile.jpg",
  ctaText: { en: "Shop now", ar: "تسوق الآن" },
  ctaLink: "products",
  displayOrder: 1,
  isActive: true,
  transitionDurationMs: 5000,
});

test("POST /home-offers rejects unsafe CTA links with 400", async () => {
  const token = await login("icare-admin@test.local", "icare");
  for (const ctaLink of ["javascript:alert(1)", "DATA:text/html,x", "ftp://example.com/x"]) {
    const { response, body } = await api("/home-offers", {
      method: "POST",
      token,
      companyId: "icare",
      body: { ...validBanner(), ctaLink },
    });
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.match(String(body?.message || ""), /safe URL/i);
  }
});

test("POST /home-offers rejects missing title and link-without-label with 400", async () => {
  const token = await login("icare-admin@test.local", "icare");
  const noTitle = await api("/home-offers", {
    method: "POST", token, companyId: "icare", body: { ...validBanner(), title: { en: "", ar: "" } },
  });
  assert.equal(noTitle.response.status, 400);
  assert.match(String(noTitle.body?.message || ""), /title/i);

  const noLabel = await api("/home-offers", {
    method: "POST", token, companyId: "icare",
    body: { ...validBanner(), ctaText: { en: "", ar: "" } },
  });
  assert.equal(noLabel.response.status, 400);
  assert.match(String(noLabel.body?.message || ""), /CTA label/i);
});

test("duplicate displayOrder keeps its new order after a Down move and reload", async () => {
  const token = await login("icare-admin@test.local", "icare");
  const create = (name) => api("/home-offers", {
    method: "POST", token, companyId: "icare",
    body: { ...validBanner(), title: { en: name, ar: name }, displayOrder: 0 },
  });
  const first = await create("Reseq one");
  assert.equal(first.response.status, 201, JSON.stringify(first.body));
  const second = await create("Reseq two");
  assert.equal(second.response.status, 201, JSON.stringify(second.body));
  const wanted = new Set([first.body.id, second.body.id]);

  const before = await api("/home-offers/all", { token, companyId: "icare" });
  assert.equal(before.response.status, 200);
  const pairBefore = before.body.filter((item) => wanted.has(item.id)).map((item) => item.id);
  assert.equal(pairBefore.length, 2);
  const target = pairBefore[0];

  // Same move the admin UI performs: relocate one visual step down in the full
  // sorted list, resequence 0..n-1, and persist every changed row via PUT.
  const sorted = [...before.body].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  const index = sorted.findIndex((item) => item.id === target);
  assert.ok(index >= 0 && index < sorted.length - 1);
  const [relocated] = sorted.splice(index, 1);
  sorted.splice(index + 1, 0, relocated);
  const next = sorted.map((item, displayOrder) => ({ ...item, displayOrder }));
  const previousById = new Map(before.body.map((item) => [item.id, item]));
  for (const item of next) {
    if (previousById.get(item.id)?.displayOrder !== item.displayOrder) {
      const updated = await api(`/home-offers/${item.id}`, {
        method: "PUT", token, companyId: "icare", body: item,
      });
      assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
    }
  }

  // Reload: the resequenced order is still stored (nothing reverts).
  const after = await api("/home-offers/all", { token, companyId: "icare" });
  assert.equal(after.response.status, 200);
  assert.deepEqual(
    after.body.filter((item) => wanted.has(item.id)).map((item) => item.id),
    [pairBefore[1], pairBefore[0]],
  );
  assert.deepEqual(
    after.body.map((item) => item.displayOrder),
    after.body.map((_, order) => order),
  );
});
test("POST then PUT keep validateOffer() enforced and persist valid banners", async () => {
  const token = await login("icare-admin@test.local", "icare");
  const created = await api("/home-offers", {
    method: "POST", token, companyId: "icare", body: validBanner(),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const id = created.body.id;
  assert.ok(id);

  // Unsafe update is rejected and the stored document is unchanged.
  const badUpdate = await api(`/home-offers/${id}`, {
    method: "PUT", token, companyId: "icare",
    body: { ctaLink: "javascript:alert(document.cookie)" },
  });
  assert.equal(badUpdate.response.status, 400);
  assert.match(String(badUpdate.body?.message || ""), /safe URL/i);

  // Valid update persists (action -> API -> DB -> read back).
  const goodUpdate = await api(`/home-offers/${id}`, {
    method: "PUT", token, companyId: "icare",
    body: { ctaLink: "https://example.com/winter", displayOrder: 2 },
  });
  assert.equal(goodUpdate.response.status, 200, JSON.stringify(goodUpdate.body));
  assert.equal(goodUpdate.body.ctaLink, "https://example.com/winter");
  assert.equal(goodUpdate.body.displayOrder, 2);

  const adminList = await api("/home-offers/all", { token, companyId: "icare" });
  assert.equal(adminList.response.status, 200);
  const stored = adminList.body.find((item) => item.id === id);
  assert.ok(stored);
  assert.equal(stored.ctaLink, "https://example.com/winter");
  assert.equal(stored.title.en, "Winter sale");

  // Tenant isolation: the other company never sees this banner.
  const ebToken = await login("eb-admin@test.local", "eb-chemical");
  const ebList = await api("/home-offers/all", { token: ebToken, companyId: "eb-chemical" });
  assert.equal(ebList.response.status, 200);
  assert.equal(ebList.body.some((item) => item.id === id), false);
});
