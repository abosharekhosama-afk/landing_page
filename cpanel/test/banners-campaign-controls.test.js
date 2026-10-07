import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BANNERS_FORM_COPY,
  BANNER_STATUS_COPY,
  bannerCtaLabelText,
  bannerFormFromItem,
  bannerPreviewModel,
  bannerSavePayload,
  bannerStatusLabel,
  bannerStatusOf,
  emptyBannerForm,
  isSafeBannerUrl,
  moveBanner,
  validateBannerForm,
} from "../src/utils/bannersUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const NOW = new Date("2026-09-17T12:00:00.000Z").getTime();

// --- Campaign status: Active/Scheduled/Expired/Disabled ---------------------

test("bannerStatusOf reports all four campaign states", () => {
  assert.equal(bannerStatusOf({ isActive: true }, NOW), "active");
  assert.equal(bannerStatusOf({}, NOW), "active");
  assert.equal(bannerStatusOf({ startAt: "2026-09-17T13:00:00.000Z" }, NOW), "scheduled");
  assert.equal(bannerStatusOf({ endAt: "2026-09-17T11:59:59.000Z", isActive: true }, NOW), "expired");
  assert.equal(bannerStatusOf({ isActive: false }, NOW), "disabled");
  assert.equal(bannerStatusOf({ isActive: false, endAt: "2020-01-01T00:00:00.000Z" }, NOW), "disabled");
});

test("expired banners never report scheduled (regression)", () => {
  const expired = { isActive: true, endAt: "2026-09-17T11:59:59.000Z" };
  assert.equal(bannerStatusOf(expired, NOW), "expired");
  assert.notEqual(bannerStatusOf(expired, NOW), "scheduled");
});

test("status labels exist in en + ar", () => {
  for (const status of ["active", "scheduled", "expired", "disabled"]) {
    assert.equal(typeof bannerStatusLabel(status, "en"), "string");
    assert.equal(typeof bannerStatusLabel(status, "ar"), "string");
  }
  assert.equal(bannerStatusLabel("expired", "en"), BANNER_STATUS_COPY.en.expired);
  assert.equal(bannerStatusLabel("disabled", "ar"), BANNER_STATUS_COPY.ar.disabled);
});

// --- Safe URLs ---------------------------------------------------------------

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
    "https://user:pass@example.com/",
  ]) {
    assert.equal(isSafeBannerUrl(bad), false, `should block ${bad}`);
  }
});

test("isSafeBannerUrl allows the storefront destinations", () => {
  for (const good of ["", "products", "car-care", "/offers/summer", "#top", "https://example.com/sale"]) {
    assert.equal(isSafeBannerUrl(good), true, `should allow ${good}`);
  }
});

// --- Form validation mirrors the server contract ------------------------------

test("validateBannerForm requires a title and enforces the CTA rules", () => {
  assert.ok(validateBannerForm(emptyBannerForm(), "en").title);
  assert.equal(typeof BANNERS_FORM_COPY.en.titleRequired, "string");
  assert.equal(typeof BANNERS_FORM_COPY.ar.titleRequired, "string");
  const base = { ...emptyBannerForm(), title: { en: "Sale", ar: "" } };
  assert.deepEqual(validateBannerForm(base, "en"), {});
  assert.ok(validateBannerForm({ ...base, ctaText: { en: "", ar: "" } }, "en").ctaText);
  assert.ok(validateBannerForm({ ...base, ctaLink: "javascript:alert(1)" }, "en").ctaLink);
  assert.deepEqual(validateBannerForm({ ...base, ctaLink: "https://example.com/s" }, "en"), {});
  assert.deepEqual(validateBannerForm({ ...base, ctaLink: "" }, "en"), {});
});

test("validateBannerForm enforces schedule and numeric ranges", () => {
  const base = { ...emptyBannerForm(), title: { en: "Sale", ar: "" } };
  assert.ok(validateBannerForm({ ...base, displayOrder: -1 }, "en").displayOrder);
  assert.ok(validateBannerForm({ ...base, transitionDurationMs: 100 }, "en").transitionDurationMs);
  assert.ok(validateBannerForm({ ...base, startAt: "bad" }, "en").startAt);
  assert.ok(validateBannerForm({ ...base, startAt: "2026-09-18T00:00:00.000Z", endAt: "2026-09-17T00:00:00.000Z" }, "en").endAt);
});

test("bannerCtaLabelText reads every stored shape", () => {
  assert.equal(bannerCtaLabelText({ en: "Shop" }), "Shop");
  assert.equal(bannerCtaLabelText("Buy"), "Buy");
  assert.equal(bannerCtaLabelText({}), "");
});

// --- Payload + preview use the same form data ----------------------------------

test("banner payload keeps the legacy image fallback and schedule nulls", () => {
  const payload = bannerSavePayload({ ...emptyBannerForm(), desktopImage: "/d.jpg", startAt: "", endAt: "" });
  assert.equal(payload.image, "/d.jpg");
  assert.equal(payload.startAt, null);
  assert.equal(payload.endAt, null);
  const fromItem = bannerFormFromItem({ id: "b1", title: { en: "Hi" } });
  assert.equal(fromItem.title.en, "Hi");
  assert.equal(typeof fromItem.description.ar, "string");
});

test("banner preview mirrors the live form data (desktop + mobile)", () => {
  const editing = {
    ...emptyBannerForm(),
    title: { en: "Sale", ar: "تخفيضات" },
    ctaText: { en: "Shop", ar: "تسوق" },
    ctaLink: "car-care",
    desktopImage: "/images/desktop.jpg",
    mobileImage: "/images/mobile.jpg",
  };
  const preview = bannerPreviewModel(editing, "en");
  assert.equal(preview.title, "Sale");
  assert.equal(preview.ctaTarget.kind, "category");
  assert.equal(preview.ctaTarget.target, "car-care");
  assert.equal(preview.desktopImage, "/images/desktop.jpg");
  assert.equal(preview.mobileImage, "/images/mobile.jpg");
  assert.equal(preview.status, "active");
  assert.equal(bannerPreviewModel({ ...editing, endAt: "2020-01-01T00:00:00.000Z" }, "en").status, "expired");
  assert.equal(bannerPreviewModel(editing, "ar").title, "تخفيضات");
});

// --- Display-order controls ----------------------------------------------------

test("moveBanner resequences to distinct orders when banners share displayOrder", () => {
  const rows = [
    { id: "a", displayOrder: 0 },
    { id: "b", displayOrder: 0 },
  ];
  const down = moveBanner(rows, "a", "down");
  assert.equal(down.moved, true);
  assert.deepEqual(down.items.map((item) => item.id), ["b", "a"]);
  assert.deepEqual(down.items.map((item) => item.displayOrder), [0, 1]);
  // A reload sorts by the persisted distinct orders, so the new order survives.
  const reloaded = [...down.items].sort((x, y) => Number(x.displayOrder || 0) - Number(y.displayOrder || 0));
  assert.deepEqual(reloaded.map((item) => item.id), ["b", "a"]);
  // The input is never mutated.
  assert.deepEqual(rows.map((item) => item.displayOrder), [0, 0]);
});

test("moveBanner swaps display order with the visual neighbor", () => {
  const rows = [
    { id: "a", displayOrder: 1 },
    { id: "b", displayOrder: 2 },
    { id: "c", displayOrder: 3 },
  ];
  const down = moveBanner(rows, "a", "down");
  assert.equal(down.moved, true);
  assert.deepEqual(down.items.map((item) => item.id), ["b", "a", "c"]);
  const up = moveBanner(down.items, "a", "up");
  assert.deepEqual(up.items.map((item) => item.id), ["a", "b", "c"]);
  assert.equal(moveBanner(rows, "a", "up").moved, false);
  assert.equal(moveBanner(rows, "missing", "down").moved, false);
  assert.deepEqual(rows.map((item) => item.id), ["a", "b", "c"]);
});

// --- Admin page wiring: campaign controls on the same source of truth ----------

test("banners admin derives the four statuses (no Expired-as-Scheduled)", () => {
  const page = read("src/pages/AdminBannersPage.jsx");
  assert.match(page, /bannerStatusOf/);
  assert.match(page, /bannerStatusLabel/);
  assert.match(page, /admin-status-pill/);
  assert.match(page, /status-\$\{bannerStatusOf/);
  assert.doesNotMatch(page, /activeNow\(item\) \?/);
});

test("banners admin validates CTA + URL before create/update", () => {
  const page = read("src/pages/AdminBannersPage.jsx");
  assert.match(page, /validateBannerForm/);
  assert.match(page, /isSafeBannerUrl|ctaLinkUnsafe|ctaLink/);
  assert.match(page, /field-error/);
  assert.match(page, /javascript:/);
});

test("banners admin previews the live form on desktop + mobile frames", () => {
  const page = read("src/pages/AdminBannersPage.jsx");
  assert.match(page, /bannerPreviewModel/);
  assert.match(page, /BannerPreviewFrame/);
  assert.match(page, /Desktop/);
  assert.match(page, /Mobile/);
  assert.match(page, /admin-banner-preview/);
});

test("banners admin has real loading/save/error/success states", () => {
  const page = read("src/pages/AdminBannersPage.jsx");
  assert.match(page, /Loading banners/);
  assert.match(page, /Saving…/);
  assert.match(page, /Retry/);
  assert.match(page, /aria-busy/);
  assert.match(page, /aria-live/);
  assert.match(page, /Banner saved/);
});

test("banners admin keeps home-offers as the source of truth", () => {
  const page = read("src/pages/AdminBannersPage.jsx");
  assert.match(page, /\/home-offers\/all/);
  assert.match(page, /\/home-offers/);
  assert.match(page, /bannerSavePayload/);
  assert.doesNotMatch(page, /\/api\/banners/);
  assert.doesNotMatch(page, /fallbackOffers/);
});

test("banners admin offers Up/Down display-order controls", () => {
  const page = read("src/pages/AdminBannersPage.jsx");
  assert.match(page, /moveBanner/);
  assert.match(page, /Move up/);
  assert.match(page, /Move down/);
});

test("banner campaign styles cover statuses, preview and field states", () => {
  const css = read("src/styles/global.css");
  for (const status of ["active", "scheduled", "expired", "disabled"]) {
    assert.match(css, new RegExp(`\\.admin-status-pill\\.status-${status}`));
  }
  assert.match(css, /\.admin-banner-preview-frames/);
  assert.match(css, /field-error/);
  assert.match(css, /field-hint/);
});

test("carousel contract is untouched by the campaign controls", () => {
  const carousel = read("src/components/HomeOffersCarousel.jsx");
  assert.match(carousel, /filterVisibleHomeOffers/);
  assert.match(carousel, /resolveHomeOfferMediaUrl/);
  assert.doesNotMatch(carousel, /bannerStatusOf/);
  assert.doesNotMatch(carousel, /BannerPreviewFrame/);
});
