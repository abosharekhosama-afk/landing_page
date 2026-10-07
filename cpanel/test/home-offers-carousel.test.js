import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { fetchStorefrontHomepageOffers } from "../src/utils/homeContentApi.js";
import {
  filterVisibleHomeOffers,
  homeOfferAutoplayDelay,
  homeOfferCtaLink,
  homeOfferCtaText,
  homeOfferDescription,
  homeOfferTitle,
  homeOffersCopy,
  isHomeOfferVisible,
  resolveHomeOfferCtaTarget,
  resolveHomeOfferImage,
  resolveHomeOfferMediaUrl,
  sortHomeOffersByDisplayOrder,
} from "../src/utils/homeOffersUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const NOW = new Date("2026-09-16T12:00:00.000Z").getTime();

function mockFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

function okJson(payload) {
  return async () => ({
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
  });
}

// --- Pure helpers: visibility + schedule ---------------------------------

test("isHomeOfferVisible honors isActive/startAt/endAt", () => {
  assert.equal(isHomeOfferVisible({ isActive: true }, NOW), true);
  assert.equal(isHomeOfferVisible({}, NOW), true);
  assert.equal(isHomeOfferVisible({ isActive: false }, NOW), false);
  assert.equal(
    isHomeOfferVisible({ startAt: "2026-09-16T13:00:00.000Z" }, NOW),
    false,
  );
  assert.equal(
    isHomeOfferVisible({ endAt: "2026-09-16T11:59:59.000Z" }, NOW),
    false,
  );
  assert.equal(
    isHomeOfferVisible(
      { startAt: "2026-09-16T11:00:00.000Z", endAt: "2026-09-16T13:00:00.000Z" },
      NOW,
    ),
    true,
  );
  assert.equal(isHomeOfferVisible({ startAt: "not-a-date" }, NOW), false);
  assert.equal(isHomeOfferVisible({ endAt: "not-a-date" }, NOW), false);
  assert.equal(isHomeOfferVisible(null, NOW), false);
  assert.equal(isHomeOfferVisible("nope", NOW), false);
});

test("filterVisibleHomeOffers sorts by displayOrder and drops hidden/scheduled", () => {
  const rows = [
    { id: "b", displayOrder: 2, isActive: true },
    { id: "hidden", displayOrder: 0, isActive: false },
    { id: "future", displayOrder: 0, startAt: "2999-01-01T00:00:00.000Z" },
    { id: "expired", displayOrder: 0, endAt: "2000-01-01T00:00:00.000Z" },
    { id: "a", displayOrder: 1, isActive: true },
  ];
  assert.deepEqual(
    filterVisibleHomeOffers(rows, NOW).map((offer) => offer.id),
    ["a", "b"],
  );
  assert.deepEqual(filterVisibleHomeOffers(null, NOW), []);
  assert.deepEqual(filterVisibleHomeOffers("nope", NOW), []);
  assert.deepEqual(sortHomeOffersByDisplayOrder(null), []);
});

// --- Pure helpers: stored content only ------------------------------------

test("resolveHomeOfferMediaUrl keeps CPanel-static roots and rewrites uploads onto the API", () => {
  assert.equal(resolveHomeOfferMediaUrl("/images/products/fabric-cleaner.svg"), "/images/products/fabric-cleaner.svg");
  assert.equal(resolveHomeOfferMediaUrl("/products/limescale-remover-main.jpg"), "/products/limescale-remover-main.jpg");
  assert.equal(resolveHomeOfferMediaUrl("/homepage-categories/home-care.jpg"), "/homepage-categories/home-care.jpg");
  assert.equal(
    resolveHomeOfferMediaUrl("/uploads/kids-velvet/banner.jpg"),
    "http://localhost:5000/uploads/kids-velvet/banner.jpg",
  );
  assert.equal(
    resolveHomeOfferMediaUrl("https://wrong-host.example/uploads/kids-velvet/banner.jpg"),
    "http://localhost:5000/uploads/kids-velvet/banner.jpg",
  );
  assert.equal(resolveHomeOfferMediaUrl(""), "");
  assert.equal(resolveHomeOfferMediaUrl(null), "");
});

test("resolveHomeOfferImage prefers stored desktop, then legacy, then mobile", () => {
  const offer = {
    desktopImage: "/d.jpg",
    image: "/legacy.jpg",
    mobileImage: "/m.jpg",
  };
  assert.equal(resolveHomeOfferImage(offer), "/d.jpg");
  assert.equal(resolveHomeOfferImage(offer, { mobile: true }), "/m.jpg");
  assert.equal(resolveHomeOfferImage({ image: "/legacy.jpg" }), "/legacy.jpg");
  assert.equal(resolveHomeOfferImage({}), "");
  assert.equal(resolveHomeOfferImage(null), "");
});

test("localized getters read stored en/ar only, link defaults honestly", () => {
  const offer = {
    title: { en: "Hello", ar: "مرحبا" },
    description: { en: "Desc", ar: "الوصف" },
    ctaText: { en: "Shop", ar: "تسوق" },
    ctaLink: "car-care",
  };
  assert.equal(homeOfferTitle(offer, "en"), "Hello");
  assert.equal(homeOfferTitle(offer, "ar"), "مرحبا");
  assert.equal(homeOfferDescription(offer, "ar"), "الوصف");
  assert.equal(homeOfferCtaText(offer, "en"), "Shop");
  assert.equal(homeOfferCtaLink(offer), "car-care");
  assert.equal(homeOfferCtaLink({}), "products");
  assert.equal(homeOfferTitle("nope", "en"), "");
});

test("autoplay delay honors stored duration within the validated range", () => {
  assert.equal(homeOfferAutoplayDelay({ transitionDurationMs: 8000 }), 8000);
  assert.equal(homeOfferAutoplayDelay({}), 5000);
  assert.equal(homeOfferAutoplayDelay({ transitionDurationMs: 100 }), 500);
  assert.equal(homeOfferAutoplayDelay({ transitionDurationMs: 999999 }), 60000);
});

test("copy exists in en + ar (no invented-language gaps)", () => {
  assert.equal(typeof homeOffersCopy("en").loading, "string");
  assert.equal(typeof homeOffersCopy("ar").loading, "string");
  assert.equal(typeof homeOffersCopy("ar").retry, "string");
});

test("CTA target resolves to real destinations only (never blank pages)", () => {
  assert.deepEqual(resolveHomeOfferCtaTarget("https://example.com/x"), {
    kind: "external",
    target: "https://example.com/x",
  });
  assert.deepEqual(resolveHomeOfferCtaTarget("/policies/shipping"), {
    kind: "path",
    target: "/policies/shipping",
  });
  assert.deepEqual(resolveHomeOfferCtaTarget("car-care"), {
    kind: "category",
    target: "car-care",
  });
  assert.deepEqual(resolveHomeOfferCtaTarget("products"), {
    kind: "products",
    target: "products",
  });
  assert.deepEqual(resolveHomeOfferCtaTarget(""), {
    kind: "products",
    target: "products",
  });
});

// --- Storefront wiring: no fakes, anonymous tenant -------------------------

test("storefront offers path imports no fake fallback seed", () => {
  const api = read("src/utils/homeContentApi.js");
  assert.doesNotMatch(api, /fallbackOffers/);
  const page = read("src/pages/HomePage.jsx");
  assert.doesNotMatch(page, /fallbackOffers/);
});

test("storefront offers fetch is anonymous with the shared tenant context", () => {
  const api = read("src/utils/homeContentApi.js");
  assert.match(api, /fetchStorefrontHomepageOffers/);
  assert.match(api, /storefrontTenantHeaders/);
  assert.match(api, /storefrontApiRequest/);
  assert.match(api, /from "\.\/storefrontContentApi\.js"/);
  assert.doesNotMatch(api, /localStorage\.getItem\(\s*["']cpanelActiveCompany["']/);
  assert.doesNotMatch(api, /Authorization\s*:/);
  assert.doesNotMatch(api, /Bearer\s+\$/);
});

test("homepage renders the real carousel with schedule-aware offers", () => {
  const page = read("src/pages/HomePage.jsx");
  assert.match(page, /HomeOffersCarousel/);
  assert.match(page, /filterVisibleHomeOffers/);
  assert.match(page, /homepageOffersStatus/);
  assert.match(page, /onRetryOffers/);
  assert.doesNotMatch(page, /\.filter\(\(offer\) => offer\.isActive/);
  const app = read("src/App.jsx");
  assert.match(app, /fetchStorefrontHomepageOffers/);
  assert.match(app, /homepageOffersStatus/);
  assert.doesNotMatch(app, /fetchHomepageOffers\(\)/);
});

test("carousel has arrows/dots/autoplay and honest states, no invented slides", () => {
  const carousel = read("src/components/HomeOffersCarousel.jsx");
  assert.match(carousel, /‹/);
  assert.match(carousel, /›/);
  assert.match(carousel, /home-offers-dot/);
  assert.match(carousel, /tabIndex=\{0\}/);
  assert.match(carousel, /resolveHomeOfferMediaUrl/);
  assert.match(carousel, /setTimeout/);
  assert.match(carousel, /transitionDurationMs|homeOfferAutoplayDelay/);
  assert.match(carousel, /autoplay !== false/);
  assert.match(carousel, /aria-busy/);
  assert.match(carousel, /loadFailed/);
  assert.match(carousel, /onRetry/);
  assert.match(carousel, /return null/);
  assert.doesNotMatch(carousel, /Daily care essentials/);
  assert.doesNotMatch(carousel, /أساسيات العناية اليومية/);
  assert.doesNotMatch(carousel, /fallbackOffers/);
});

// --- Runtime: anonymous tenant headers, honest failure ----------------------

test("storefront fetch sends tenant headers and never a JWT", async () => {
  const calls = [];
  const restore = mockFetch(async (url, options = {}) => {
    calls.push({ url: String(url), headers: { ...(options.headers || {}) } });
    return okJson([])();
  });
  try {
    const data = await fetchStorefrontHomepageOffers({
      env: { VITE_STOREFRONT_COMPANY_ID: "icare", VITE_STOREFRONT_SITE_ID: "site-1" },
    });
    assert.deepEqual(data, []);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/home-offers/);
    assert.equal(calls[0].headers["x-company-id"], "icare");
    assert.equal(calls[0].headers["x-site-id"], "site-1");
    assert.equal(calls[0].headers.Authorization, undefined);
    assert.doesNotMatch(JSON.stringify(calls), /Bearer/i);
  } finally {
    restore();
  }
});

test("storefront fetch never sends an empty tenant header", async () => {
  const capture = {};
  const restore = mockFetch(async (url, options = {}) => {
    capture.headers = { ...(options.headers || {}) };
    return okJson([])();
  });
  try {
    await fetchStorefrontHomepageOffers({ env: {} });
    assert.equal("x-company-id" in capture.headers, false);
  } finally {
    restore();
  }
});

test("storefront fetch returns stored offers and [] for non-array payloads", async () => {
  const stored = [{ id: "offer-1", title: { en: "Real" } }];
  let restore = mockFetch(okJson(stored));
  try {
    assert.deepEqual(await fetchStorefrontHomepageOffers({ env: {} }), stored);
  } finally {
    restore();
  }
  restore = mockFetch(okJson({}));
  try {
    assert.deepEqual(await fetchStorefrontHomepageOffers({ env: {} }), []);
  } finally {
    restore();
  }
});

test("storefront fetch throws when the API is down (caller shows honest error)", async () => {
  const restore = mockFetch(async () => {
    throw new Error("network down");
  });
  try {
    await assert.rejects(
      () => fetchStorefrontHomepageOffers({ env: { VITE_STOREFRONT_COMPANY_ID: "icare" } }),
      /network down/,
    );
  } finally {
    restore();
  }
});
