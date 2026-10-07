import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { fetchProductListRatings } from "../src/utils/homeContentApi.js";
import {
  formatProductListingRating,
  productListingReviewsSummary,
  productListingStarsFilled,
} from "../src/utils/reviewsUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

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

test("listing runtime has no fake default rating", () => {
  const page = read("src/pages/ProductsPage.jsx");
  // The `|| 5` fallback and every stored-rating source are gone.
  assert.doesNotMatch(page, /\|\|\s*5/);
  assert.doesNotMatch(page, /product\.rating/);
  assert.doesNotMatch(page, /product\.reviewRating/);
  assert.doesNotMatch(page, /product\.reviewCount/);
  assert.doesNotMatch(page, /product\.reviews\?\.length/);
  assert.doesNotMatch(page, /4\.94/);
  assert.doesNotMatch(page, /66 reviews/);
  assert.doesNotMatch(page, /Maha A\.|Khaled S\.|Rana M\./);
});

test("listing card renders real ratings via the honest helpers", () => {
  const page = read("src/pages/ProductsPage.jsx");
  assert.match(page, /fetchProductListRatings/);
  assert.match(page, /from "\.\.\/utils\/homeContentApi\.js"/);
  assert.match(page, /formatProductListingRating/);
  assert.match(page, /productListingStarsFilled/);
  assert.match(page, /from "\.\.\/utils\/reviewsUi\.js"/);
  // Stars are filled from the real average; zero reviews render no stars.
  assert.match(page, /filledStars/);
  assert.match(page, /reviewCount > 0/);
  // Honest empty + loading states exist in both languages.
  assert.match(page, /No reviews yet|ratingSummary/);
  assert.match(page, /Loading rating…/);
  assert.match(page, /جارٍ تحميل التقييم/);
});

test("product details and homepage reviews are untouched by this task", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  const home = read("src/pages/HomePage.jsx");
  // Details still own their real per-product fetch and summary.
  assert.match(details, /fetchProductReviews\(productId\)/);
  assert.match(details, /formatRatingSummary\(reviewCount, averageRating, language\)/);
  // Homepage still owns its store-reviews filter.
  assert.match(home, /filterHomepageStoreReviews/);
  // The listing helper is fetch-per-product, not the homepage fetch.
  const api = read("src/utils/homeContentApi.js");
  assert.match(api, /fetchProductListRatings/);
  assert.match(api, /fetchProductReviews\(productId, options\)/);
});

test("productListingReviewsSummary derives count/average from real rows only", () => {
  assert.deepEqual(productListingReviewsSummary([]), { count: 0, average: 0 });
  assert.deepEqual(productListingReviewsSummary(null), { count: 0, average: 0 });
  assert.deepEqual(productListingReviewsSummary("nope"), { count: 0, average: 0 });
  assert.deepEqual(
    productListingReviewsSummary([
      { id: "r1", rating: 5 },
      { id: "r2", rating: 4 },
      { id: "r3", rating: 5 },
    ]),
    { count: 3, average: 4.67 },
  );
});

test("productListingStarsFilled never implies a rating for zero reviews", () => {
  assert.equal(productListingStarsFilled(5, 0), 0);
  assert.equal(productListingStarsFilled(0, 0), 0);
  assert.equal(productListingStarsFilled(4.67, 3), 5);
  assert.equal(productListingStarsFilled(4.2, 5), 4);
  assert.equal(productListingStarsFilled(0, 2), 0);
});

test("formatProductListingRating is honest in both languages", () => {
  assert.equal(formatProductListingRating(0, 0, "en"), "No reviews yet");
  assert.equal(formatProductListingRating(0, 0, "ar"), "لا توجد تقييمات بعد");
  assert.equal(formatProductListingRating(3, 4.6667, "en"), "4.7 ★ | 3 reviews");
  assert.equal(formatProductListingRating(1, 5, "en"), "5.0 ★ | 1 review");
  assert.equal(formatProductListingRating(1, 5, "ar"), "5.0 ★ | تقييم واحد");
  assert.equal(formatProductListingRating(2, 4, "ar"), "4.0 ★ | تقييمان");
  assert.equal(formatProductListingRating(3, 4.6667, "ar"), "4.7 ★ | 3 تقييم");
});

test("listing fetch returns real per-product summaries with tenant headers", async () => {
  const calls = [];
  const payloads = {
    "p-with-reviews": [
      { id: "r1", type: "product", productId: "p-with-reviews", rating: 5 },
      { id: "r2", type: "product", productId: "p-with-reviews", rating: 4 },
    ],
    "p-empty": [],
  };
  const restore = mockFetch(async (url, options = {}) => {
    calls.push({ url: String(url), headers: { ...(options.headers || {}) } });
    const id = decodeURIComponent(String(url).split("/reviews/product/")[1] || "");
    return okJson(payloads[id] ?? [])();
  });
  try {
    const ratings = await fetchProductListRatings(["p-with-reviews", "p-empty"], {
      env: { VITE_STOREFRONT_COMPANY_ID: "icare", VITE_STOREFRONT_SITE_ID: "site-1" },
    });
    // Product with approved reviews -> real average + real count.
    assert.deepEqual(ratings["p-with-reviews"], { count: 2, average: 4.5 });
    // Product without reviews -> honest zero, still present.
    assert.deepEqual(ratings["p-empty"], { count: 0, average: 0 });
    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.match(call.url, /\/reviews\/product\//);
      assert.equal(call.headers["x-company-id"], "icare");
      assert.equal(call.headers["x-site-id"], "site-1");
      assert.equal(call.headers.Authorization, undefined);
    }
    assert.doesNotMatch(JSON.stringify(calls), /Bearer/i);
  } finally {
    restore();
  }
});

test("listing fetch omits empty tenant headers and never fakes on failure", async () => {
  const seen = {};
  const restore = mockFetch(async (url, options = {}) => {
    const id = decodeURIComponent(String(url).split("/reviews/product/")[1] || "");
    seen.headers = { ...(options.headers || {}) };
    if (id === "p-down") throw new Error("network down");
    return okJson([])();
  });
  try {
    const ratings = await fetchProductListRatings(["p-down", "p-empty", "", "p-empty"], { env: {} });
    // Failed product has no entry -> its card renders the honest empty state.
    assert.equal("p-down" in ratings, false);
    assert.deepEqual(ratings["p-empty"], { count: 0, average: 0 });
    assert.equal("x-company-id" in seen.headers, false);
  } finally {
    restore();
  }
});
