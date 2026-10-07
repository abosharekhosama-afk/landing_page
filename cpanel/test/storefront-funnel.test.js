import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  FUNNEL_CLIENT_EVENT_TYPES,
  getStorefrontSessionKey,
  trackStorefrontEvent,
} from "../src/utils/storefrontAnalytics.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("client funnel events cover cart and checkout but never purchase", () => {
  assert.deepEqual(
    [...FUNNEL_CLIENT_EVENT_TYPES],
    ["add_to_cart", "remove_from_cart", "initiate_checkout"],
  );
  assert.equal(FUNNEL_CLIENT_EVENT_TYPES.includes("purchase"), false);
});

test("session key is persisted once and never fabricated from data", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const first = getStorefrontSessionKey();
  assert.ok(first, "a session key must be generated when possible");
  assert.equal(getStorefrontSessionKey(), first, "the stored key must be reused");
  assert.equal(storage.get("epStorefrontAnalyticsSessionKey"), first);
  delete globalThis.localStorage;
});

test("trackStorefrontEvent posts an allowlisted event to the public ingest endpoint", async () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const calls = [];
  globalThis.fetch = (url, options) => {
    calls.push({ url, options });
    return Promise.resolve({ ok: true });
  };

  const pending = trackStorefrontEvent("add_to_cart", { productId: "p-1" });
  assert.ok(pending, "an allowlisted event must be sent");
  await pending;

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/storefront\/analytics\/visitor$/);
  assert.equal(calls[0].options.method, "POST");
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.eventType, "add_to_cart");
  assert.equal(payload.productId, "p-1");
  assert.ok(payload.sessionKey, "events must carry the visitor session key");
  assert.equal(Object.hasOwn(payload, "purchase"), false);

  assert.equal(
    trackStorefrontEvent("purchase", {}),
    null,
    "purchase is recorded by the order API only",
  );
  assert.equal(trackStorefrontEvent("pageview", {}), null, "unknown client events are not emitted");
  assert.equal(trackStorefrontEvent(""), null);
  assert.equal(calls.length, 1, "rejected events must not hit the network");

  delete globalThis.localStorage;
  delete globalThis.fetch;
});

test("storefront App emits cart and checkout funnel events from committed state", () => {
  const app = read("src/App.jsx");
  assert.match(
    app,
    /import \{[^}]*trackStorefrontEvent[^}]*\} from "\.\/utils\/storefrontAnalytics\.js";/,
  );
  assert.match(app, /trackStorefrontEvent\("add_to_cart"/);
  assert.match(app, /trackStorefrontEvent\("remove_from_cart"/);
  assert.match(app, /trackStorefrontEvent\("initiate_checkout"/);
  assert.equal(
    app.includes('trackStorefrontEvent("purchase"'),
    false,
    "purchase is never emitted from the UI",
  );
  assert.match(app, /previousCartRef/, "cart events must diff the committed cart state");
  assert.match(app, /checkoutTrackedRef/, "checkout start must be recorded once per attempt");
});

test("CPanel Analytics behavior page renders the funnel block from API data", () => {
  const page = read("src/pages/AdminAnalyticsPage.jsx");
  assert.match(page, /function FunnelRows\(/);
  assert.match(page, /<FunnelRows funnel=\{analytics\?\.funnel\} labels=\{labels\} \/>/);
  assert.match(page, /funnel\?\.productViews/);
  assert.match(page, /funnel\?\.removeFromCart/);
  assert.match(page, /funnel\?\.checkoutStarted/);
  assert.match(page, /funnel\?\.purchases/);
  assert.match(page, /formatPercent\(funnel\?\.purchaseConversionRate\)/);
  assert.match(page, /Storefront funnel/);
});
