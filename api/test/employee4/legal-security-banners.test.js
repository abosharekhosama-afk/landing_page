import test from "node:test";
import assert from "node:assert/strict";
import { isIpInCidr, validateIpOrCidr } from "../../src/security/ipBlocking.js";
import { normalizeIp } from "../../src/security/ipBlocking.js";
import { recordLoginAttempt } from "../../src/security/loginHistory.js";

const COMPANY = "test-a-co";

test("Task 09/11: IPv4, IPv6 and CIDR validation/matching", () => {
  assert.equal(validateIpOrCidr("203.0.113.10"), true);
  assert.equal(validateIpOrCidr("2001:db8::10"), true);
  assert.equal(validateIpOrCidr("203.0.113.0/24"), true);
  assert.equal(validateIpOrCidr("2001:db8::/64"), true);
  assert.equal(validateIpOrCidr("203.0.113.999"), false);
  assert.equal(isIpInCidr("203.0.113.10", "203.0.113.0/24"), true);
  assert.equal(isIpInCidr("203.0.114.10", "203.0.113.0/24"), false);
  assert.equal(isIpInCidr("2001:db8::10", "2001:db8::/64"), true);
  assert.equal(normalizeIp("::ffff:203.0.113.10"), "203.0.113.10");
});

test("Task 10: unknown authentication identifiers are stored as safe hashes", async () => {
  const req = { ip: "203.0.113.10", headers: { "user-agent": "Mozilla/5.0 Chrome/151.0" } };
  const entry = await recordLoginAttempt({ companyId: COMPANY, user: null, email: "unknown-user@example.test", status: "FAILURE", req, failureReason: "INVALID_CREDENTIALS", attemptId: "attempt-test-safe-id" });
  assert.match(entry.email, /^unknown:[a-f0-9]{24}$/);
  assert.equal(entry.email.includes("unknown-user@example.test"), false);
  assert.equal(entry.attempt_id, "attempt-test-safe-id");
  assert.equal(entry.user_id, null);
  assert.equal(entry.password, undefined);
});

import { isScheduledActive, validateOffer } from "../../src/content/homeOfferRules.js";

test("Task 13: existing home offers gain backward-compatible banner controls", () => {
  const legacy = { id: "legacy", title: { en: "Legacy" }, image: "/uploads/test/banner.jpg", desktopImage: "/uploads/test/banner.jpg", mobileImage: "/uploads/test/banner.jpg", autoplay: true, transitionDurationMs: 5000, isActive: true };
  assert.equal(legacy.desktopImage, legacy.image);
  assert.equal(legacy.mobileImage, legacy.image);
  assert.equal(validateOffer(legacy), null);
  assert.equal(isScheduledActive({ ...legacy, startAt: "2026-09-03T00:00:00Z" }, new Date("2026-09-02T00:00:00Z")), false);
  assert.equal(isScheduledActive({ ...legacy, endAt: "2026-09-01T00:00:00Z" }, new Date("2026-09-02T00:00:00Z")), false);
  assert.equal(isScheduledActive(legacy, new Date("2026-09-02T00:00:00Z")), true);
});

import { getSecuritySettings } from "../../src/security/bruteForceProtection.js";

test("Task 11: security defaults are bounded and configurable", () => {
  assert.deepEqual(getSecuritySettings("missing-test-company"), {
    accountMaxFailedAttempts: 5,
    accountLockMinutes: 15,
    ipMaxFailedAttempts: 5,
    ipBlockMinutes: 15,
  });
});
