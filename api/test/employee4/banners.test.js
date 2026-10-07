import test from "node:test";
import assert from "node:assert/strict";
import { isScheduledActive, validateOffer } from "../../src/content/homeOfferRules.js";

const now = new Date("2026-09-02T12:00:00Z").getTime();

test("home offers respect activation and schedule", () => {
  assert.equal(isScheduledActive({ isActive: true }, now), true);
  assert.equal(isScheduledActive({ isActive: false }, now), false);
  assert.equal(isScheduledActive({ startAt: "2026-09-02T13:00:00Z" }, now), false);
  assert.equal(isScheduledActive({ endAt: "2026-09-02T11:59:59Z" }, now), false);
  assert.equal(isScheduledActive({ startAt: "2026-09-02T11:00:00Z", endAt: "2026-09-02T13:00:00Z" }, now), true);
});

test("home offer validation enforces title, duration and schedule", () => {
  assert.equal(validateOffer({ title: { en: "Offer" }, transitionDurationMs: 5000 }), null);
  assert.match(validateOffer({ title: {}, transitionDurationMs: 5000 }), /title/i);
  assert.match(validateOffer({ title: { en: "Offer" }, transitionDurationMs: 100 }), /duration/i);
  assert.match(validateOffer({ title: { en: "Offer" }, startAt: "bad" }), /start/i);
});
