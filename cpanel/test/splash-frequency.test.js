import test from "node:test";
import assert from "node:assert/strict";
import { markSplashDisplayed, shouldDisplaySplash } from "../src/utils/splashFrequency.js";

function storage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
}

test("splash frequency: every visit always displays", () => {
  const store = storage();
  const ad = { id: "ad-1", frequency: "EVERY_VISIT" };
  markSplashDisplayed(ad, store);
  assert.equal(shouldDisplaySplash(ad, store), true);
});

test("splash frequency: once per session suppresses after display", () => {
  const store = storage();
  const ad = { id: "ad-2", frequency: "ONCE_PER_SESSION" };
  assert.equal(shouldDisplaySplash(ad, store), true);
  markSplashDisplayed(ad, store);
  assert.equal(shouldDisplaySplash(ad, store), false);
});

test("splash frequency: once per day resets on the next day", () => {
  const store = storage();
  const ad = { id: "ad-3", frequency: "ONCE_PER_DAY" };
  const today = new Date("2026-09-02T10:00:00Z");
  markSplashDisplayed(ad, store, today);
  assert.equal(shouldDisplaySplash(ad, store, today), false);
  assert.equal(shouldDisplaySplash(ad, store, new Date("2026-09-03T10:00:00Z")), true);
});
