import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { fetchHomepageStoreReviews } from "../src/utils/homeContentApi.js";
import {
  filterHomepageStoreReviews,
  homepageReviewsSummary,
  isHomepageStoreReview,
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

test("homepage runtime no longer imports fallbackReviews", () => {
  const api = read("src/utils/homeContentApi.js");
  assert.doesNotMatch(api, /fallbackReviews/);
  assert.doesNotMatch(api, /reviews as fallbackReviews/);
  assert.doesNotMatch(api, /from "\.\.\/data\/homeContent\.js".*reviews/);
});

test("homepage reviews helper is anonymous with the shared storefront tenant", () => {
  const api = read("src/utils/homeContentApi.js");
  assert.match(api, /fetchHomepageStoreReviews/);
  assert.match(api, /storefrontTenantHeaders/);
  assert.match(api, /storefrontApiRequest/);
  assert.match(api, /from "\.\/storefrontContentApi\.js"/);
  assert.doesNotMatch(api, /localStorage\.getItem\(\s*["']cpanelActiveCompany["']/);
  assert.doesNotMatch(api, /Authorization\s*:/);
  assert.doesNotMatch(api, /Bearer\s+\$/);
});

test("homepage filter uses explicit types, never employeeId sniffing", () => {
  const page = read("src/pages/HomePage.jsx");
  assert.match(page, /filterHomepageStoreReviews/);
  assert.doesNotMatch(page, /!review\.employeeId/);
  assert.doesNotMatch(page, /!review\?\.employeeId/);
});

test("homepage has no hardcoded rating summary or demo reviewers", () => {
  const page = read("src/pages/HomePage.jsx");
  assert.doesNotMatch(page, /4\.94/);
  assert.doesNotMatch(page, /66 reviews/);
  assert.doesNotMatch(page, /66 تقييم/);
  assert.doesNotMatch(page, /Maya A\.|Ahmad S\.|Lina K\./);
});

test("isHomepageStoreReview accepts website/store/site only", () => {
  assert.equal(isHomepageStoreReview({ type: "website" }), true);
  assert.equal(isHomepageStoreReview({ type: "store" }), true);
  assert.equal(isHomepageStoreReview({ type: "site" }), true);
  assert.equal(isHomepageStoreReview({ type: "Website" }), true);
  // Product reviews carry an empty employeeId — they must stay excluded.
  assert.equal(isHomepageStoreReview({ type: "product", productId: "p1", employeeId: "" }), false);
  assert.equal(isHomepageStoreReview({ type: "employee", employeeId: "e1" }), false);
  assert.equal(isHomepageStoreReview({ type: "order", orderId: "o1" }), false);
  assert.equal(isHomepageStoreReview({ employeeId: "" }), false);
  assert.equal(isHomepageStoreReview({}), false);
  assert.equal(isHomepageStoreReview(null), false);
});

test("filterHomepageStoreReviews keeps only eligible types", () => {
  const rows = [
    { id: "w1", type: "website" },
    { id: "s1", type: "store" },
    { id: "t1", type: "site" },
    { id: "p1", type: "product", productId: "p1", employeeId: "" },
    { id: "e1", type: "employee", employeeId: "e1" },
    { id: "o1", type: "order" },
  ];
  assert.deepEqual(
    filterHomepageStoreReviews(rows).map((review) => review.id),
    ["w1", "s1", "t1"],
  );
  assert.deepEqual(filterHomepageStoreReviews(null), []);
  assert.deepEqual(filterHomepageStoreReviews("nope"), []);
});

test("homepage summary derives average/count from real rows only", () => {
  assert.deepEqual(homepageReviewsSummary([]), { count: 0, average: 0 });
  const rows = [
    { id: "w1", type: "website", rating: 5 },
    { id: "s1", type: "store", rating: 4 },
    { id: "p1", type: "product", rating: 1, productId: "p1", employeeId: "" },
  ];
  // The 1-star product review must not drag the homepage average down.
  assert.deepEqual(homepageReviewsSummary(rows), { count: 2, average: 4.5 });
});

test("homepage fetch requests website/store/site with tenant headers", async () => {
  const calls = [];
  const restore = mockFetch(async (url, options = {}) => {
    calls.push({ url: String(url), headers: { ...(options.headers || {}) } });
    return {
      ok: true,
      status: 200,
      async json() {
        return [];
      },
    };
  });
  try {
    const data = await fetchHomepageStoreReviews({
      env: { VITE_STOREFRONT_COMPANY_ID: "icare", VITE_STOREFRONT_SITE_ID: "site-1" },
    });
    assert.deepEqual(data, []);
    const urls = calls.map((call) => call.url);
    assert.equal(calls.length, 3);
    assert.ok(urls.some((url) => url.includes("/reviews?type=website")));
    assert.ok(urls.some((url) => url.includes("/reviews?type=store")));
    assert.ok(urls.some((url) => url.includes("/reviews?type=site")));
    for (const call of calls) {
      assert.equal(call.headers["x-company-id"], "icare");
      assert.equal(call.headers["x-site-id"], "site-1");
      assert.equal(call.headers.Authorization, undefined);
    }
    assert.doesNotMatch(JSON.stringify(calls), /Bearer/i);
  } finally {
    restore();
  }
});

test("homepage fetch merges types, dedupes, and never sends empty tenant", async () => {
  const website = [{ id: "w1", type: "website", createdAt: "2026-01-02" }];
  const store = [
    { id: "w1", type: "website", createdAt: "2026-01-02" },
    { id: "s1", type: "store", createdAt: "2026-03-01" },
  ];
  const site = [{ id: "t1", type: "site", createdAt: "2026-02-01" }];
  const payloads = { website, store, site };
  const capture = {};
  const restore = mockFetch(async (url, options = {}) => {
    capture.headers = { ...(options.headers || {}) };
    const type = String(url).split("type=")[1];
    return okJson(payloads[type] || [])();
  });
  try {
    const data = await fetchHomepageStoreReviews({ env: {} });
    assert.deepEqual(
      data.map((review) => review.id),
      ["s1", "t1", "w1"],
    );
    assert.equal("x-company-id" in capture.headers, false);
  } finally {
    restore();
  }
});

test("homepage fetch resolves [] when the API is down (no fakes)", async () => {
  const restore = mockFetch(async () => {
    throw new Error("network down");
  });
  try {
    const data = await fetchHomepageStoreReviews({
      env: { VITE_STOREFRONT_COMPANY_ID: "icare" },
    });
    assert.deepEqual(data, []);
  } finally {
    restore();
  }
});
