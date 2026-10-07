import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ATTRIBUTION_CLIENT_FIELDS,
  getStorefrontAttribution,
  trackStorefrontEvent,
} from "../src/utils/storefrontAnalytics.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function installBrowser({ search = "", referrer = "" } = {}) {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = { location: { pathname: "/", search } };
  globalThis.document = { referrer };
  return storage;
}

function removeBrowser() {
  delete globalThis.localStorage;
  delete globalThis.window;
  delete globalThis.document;
}

test("attribution fields are the five standard UTM parameters plus the referrer", () => {
  assert.deepEqual(
    [...ATTRIBUTION_CLIENT_FIELDS],
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"],
  );
  assert.equal(ATTRIBUTION_CLIENT_FIELDS.includes("referrer"), false);
  assert.equal(ATTRIBUTION_CLIENT_FIELDS.includes("email"), false);
});

test("first-touch attribution is captured from the entry URL and never overwritten", () => {
  const storage = installBrowser({
    search: "?utm_source=fb&utm_medium=social&utm_campaign=winter",
    referrer: "https://News.Site.Test/article?email=secret@example.com",
  });

  const first = getStorefrontAttribution();
  assert.equal(first.utm_source, "fb");
  assert.equal(first.utm_medium, "social");
  assert.equal(first.utm_campaign, "winter");
  assert.equal(first.referrer, "news.site.test", "only the referrer hostname is stored");
  assert.equal(Object.hasOwn(first, "email"), false);
  assert.ok(storage.get("epStorefrontAttribution"), "attribution is persisted for the session");

  globalThis.window.location.search = "?utm_source=ig&utm_campaign=spring&utm_content=post_01";
  globalThis.document.referrer = "https://other.test/";
  const second = getStorefrontAttribution();
  assert.equal(second.utm_source, "fb", "the entry campaign wins");
  assert.equal(second.utm_campaign, "winter");
  assert.equal(second.utm_content, "post_01", "still-empty fields may be filled later");
  assert.equal(second.referrer, "news.site.test");

  removeBrowser();
});

test("funnel events carry the attribution object to the ingest endpoint", async () => {
  const storage = installBrowser({ search: "?utm_source=fb&utm_campaign=winter" });
  const calls = [];
  globalThis.fetch = (url, options) => {
    calls.push({ url, options });
    return Promise.resolve({ ok: true });
  };

  const pending = trackStorefrontEvent("add_to_cart", { productId: "p-1" });
  assert.ok(pending);
  await pending;

  const payload = JSON.parse(calls[0].options.body);
  assert.ok(payload.attribution, "events must carry attribution");
  assert.equal(payload.attribution.utm_source, "fb");
  assert.equal(payload.attribution.utm_campaign, "winter");
  assert.equal(payload.sessionKey, getStorefrontSessionKeySafe(storage));

  removeBrowser();
  delete globalThis.fetch;
});

function getStorefrontSessionKeySafe(storage) {
  return storage.get("epStorefrontAnalyticsSessionKey");
}

test("storefront checkout forwards the session key and attribution with the order", () => {
  const app = read("src/App.jsx");
  assert.match(app, /getStorefrontAttribution/);
  assert.match(app, /analyticsSessionKey: getStorefrontSessionKey\(\)/);
  assert.match(app, /attribution: getStorefrontAttribution\(\)/);

  const orders = read("src/utils/orders.js");
  assert.match(orders, /analyticsSessionKey,/);
  assert.match(orders, /attribution,/);
  assert.match(orders, /analyticsSessionKey: analyticsSessionKey \|\| undefined/);
  assert.match(
    orders,
    /attribution: attribution && Object\.keys\(attribution\)\.length \? attribution : undefined/,
  );
});

test("CPanel Analytics behavior page renders the campaign performance table", () => {
  const page = read("src/pages/AdminAnalyticsPage.jsx");
  assert.match(page, /function CampaignTable\(\{ campaigns, labels \}\)/);
  assert.match(page, /<CampaignTable campaigns=\{analytics\?\.campaigns\} labels=\{labels\} \/>/);
  assert.match(page, /Campaign performance/);
  assert.match(page, /\(no campaign\)/);
  assert.match(page, /row\.uniquePurchasingCustomers \?\? labels\.noVerified/);
  assert.match(page, /formatPercent\(row\.conversionRate\)/);
  assert.match(page, /formatNumber\(row\.revenue\)/);
  assert.match(page, /<th>Visits<\/th>/);
  assert.match(page, /<th>Purchases<\/th>/);
  assert.match(page, /<th>Returned orders<\/th>/);
  assert.match(page, /<th>Conversion rate<\/th>/);
});

test("attribution capture never stores a raw referrer URL or contact fields", () => {
  const source = read("src/utils/storefrontAnalytics.js");
  assert.match(source, /new URL\(raw\)\.hostname/);
  assert.equal(
    source.includes("localStorage.setItem(attributionStorageKey, JSON.stringify(attribution))"),
    true,
  );
  assert.equal(/email|phone/.test(source), false, "no contact fields may be captured");
});
