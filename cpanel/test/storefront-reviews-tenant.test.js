import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { fetchProductReviews } from "../src/utils/homeContentApi.js";
import {
  resolveStorefrontTenant,
  storefrontTenantHeaders,
} from "../src/utils/storefrontContentApi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function mockFetch(capture) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    capture.url = String(url);
    capture.options = options;
    capture.headers = { ...(options.headers || {}) };
    return {
      ok: true,
      status: 200,
      async json() {
        return [];
      },
    };
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

function headerName(headers, name) {
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return found ? headers[found] : undefined;
}

test("anonymous storefront resolves the correct tenant from env (no JWT)", async () => {
  const capture = {};
  const restoreFetch = mockFetch(capture);
  const originalLocalStorage = globalThis.localStorage;
  // Anonymous visitor: no CPanel storage at all.
  delete globalThis.localStorage;
  try {
    const data = await fetchProductReviews("icare-product-1", {
      env: { VITE_STOREFRONT_COMPANY_ID: "icare", VITE_STOREFRONT_SITE_ID: "site-1" },
    });
    assert.deepEqual(data, []);
    assert.match(capture.url, /\/reviews\/product\/icare-product-1/);
    assert.equal(headerName(capture.headers, "x-company-id"), "icare");
    assert.equal(headerName(capture.headers, "x-site-id"), "site-1");
    // No JWT/Bearer on the public storefront path.
    assert.equal(headerName(capture.headers, "authorization"), undefined);
    assert.doesNotMatch(JSON.stringify(capture.headers), /Bearer/i);
    assert.doesNotMatch(JSON.stringify(capture.headers), /JWT/i);
  } finally {
    restoreFetch();
    if (originalLocalStorage !== undefined) globalThis.localStorage = originalLocalStorage;
    else delete globalThis.localStorage;
  }
});

test("missing localStorage does not break the storefront request", async () => {
  const capture = {};
  const restoreFetch = mockFetch(capture);
  const originalLocalStorage = globalThis.localStorage;
  const hadStorage = "localStorage" in globalThis;
  delete globalThis.localStorage;
  try {
    // With tenant configured, headers still resolve without storage.
    const withTenant = await fetchProductReviews("p1", {
      env: { VITE_STOREFRONT_COMPANY_ID: "icare" },
    });
    assert.deepEqual(withTenant, []);
    assert.equal(headerName(capture.headers, "x-company-id"), "icare");

    // With no tenant configured, the request still succeeds and omits the header
    // entirely (never sends an empty x-company-id).
    const emptyCapture = {};
    const restoreSecond = mockFetch(emptyCapture);
    try {
      const withoutTenant = await fetchProductReviews("p1", { env: {} });
      assert.deepEqual(withoutTenant, []);
      assert.equal("x-company-id" in emptyCapture.headers, false);
      assert.equal("X-Company-Id" in emptyCapture.headers, false);
      assert.equal(headerName(emptyCapture.headers, "x-company-id"), undefined);
    } finally {
      restoreSecond();
    }
  } finally {
    restoreFetch();
    if (hadStorage) globalThis.localStorage = originalLocalStorage;
    else delete globalThis.localStorage;
  }
});

test("stale CPanel company does not change the storefront tenant", async () => {
  const capture = {};
  const restoreFetch = mockFetch(capture);
  const originalLocalStorage = globalThis.localStorage;
  // Simulate a previous CPanel login for a different company.
  globalThis.localStorage = {
    getItem: (key) =>
      key === "cpanelActiveCompany"
        ? JSON.stringify({ id: "other-company", siteId: "other-site" })
        : null,
  };
  try {
    const data = await fetchProductReviews("icare-product-1", {
      env: { VITE_STOREFRONT_COMPANY_ID: "icare", VITE_STOREFRONT_SITE_ID: "site-1" },
    });
    assert.deepEqual(data, []);
    assert.equal(headerName(capture.headers, "x-company-id"), "icare");
    assert.equal(headerName(capture.headers, "x-site-id"), "site-1");
    assert.notEqual(headerName(capture.headers, "x-company-id"), "other-company");
    assert.notEqual(headerName(capture.headers, "x-site-id"), "other-site");

    // The shared helper itself ignores CPanel storage too.
    assert.deepEqual(resolveStorefrontTenant({ VITE_STOREFRONT_COMPANY_ID: "icare" }), {
      companyId: "icare",
      siteId: "",
    });
    assert.deepEqual(storefrontTenantHeaders({ VITE_STOREFRONT_COMPANY_ID: "icare" }), {
      "x-company-id": "icare",
    });
    assert.deepEqual(storefrontTenantHeaders({}), {});
  } finally {
    restoreFetch();
    if (originalLocalStorage !== undefined) globalThis.localStorage = originalLocalStorage;
    else delete globalThis.localStorage;
  }
});

test("storefront reviews helper shares the storefront tenant context (no CPanel read, no empty header, no JWT)", () => {
  const homeApi = read("src/utils/homeContentApi.js");
  const storefrontApi = read("src/utils/storefrontContentApi.js");
  // Same source: home helper delegates to the shared storefront helper.
  assert.match(homeApi, /storefrontTenantHeaders/);
  assert.match(homeApi, /from "\.\/storefrontContentApi\.js"/);
  assert.match(storefrontApi, /resolveStorefrontTenant/);
  assert.match(storefrontApi, /VITE_STOREFRONT_COMPANY_ID/);
  assert.match(storefrontApi, /VITE_STOREFRONT_SITE_ID/);
  // Public path never reads CPanel storage (code, not comments) and never
  // attaches auth headers (Authorization: / Bearer ${...} code, not comments).
  assert.doesNotMatch(homeApi, /localStorage\.getItem\(\s*["']cpanelActiveCompany["']/);
  assert.doesNotMatch(storefrontApi, /localStorage\.getItem\(\s*["']cpanelActiveCompany["']/);
  assert.doesNotMatch(homeApi, /Authorization\s*:/);
  assert.doesNotMatch(homeApi, /Bearer\s+\$/);
  assert.doesNotMatch(storefrontApi, /Authorization\s*:/);
  assert.doesNotMatch(storefrontApi, /Bearer\s+\$/);
  // The public reviews helper never builds an empty x-company-id value.
  assert.doesNotMatch(homeApi, /"x-company-id":\s*companyId/);
  assert.doesNotMatch(homeApi, /'x-company-id':\s*companyId/);
  // Empty tenant yields no header object (caller sends no x-company-id at all).
  assert.deepEqual(storefrontTenantHeaders({}), {});
  assert.deepEqual(
    storefrontTenantHeaders({ VITE_STOREFRONT_COMPANY_ID: "  ", VITE_STOREFRONT_SITE_ID: "" }),
    {},
  );
});
