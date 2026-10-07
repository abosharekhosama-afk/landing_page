import test from "node:test";
import assert from "node:assert/strict";
import { isValidIpOrCidr, ipMatchesRule, normalizeIp, parseIpOrCidr } from "../../src/security/ipNetwork.js";

test("normalizes IPv4-mapped IPv6", () => assert.equal(normalizeIp("::ffff:192.168.1.1"), "192.168.1.1"));
test("validates IPv4, IPv6 and CIDR", () => {
  assert.equal(isValidIpOrCidr("192.0.2.10"), true);
  assert.equal(isValidIpOrCidr("192.0.2.0/24"), true);
  assert.equal(isValidIpOrCidr("2001:db8::1"), true);
  assert.equal(isValidIpOrCidr("2001:db8::/32"), true);
  assert.equal(isValidIpOrCidr("999.1.1.1"), false);
  assert.equal(isValidIpOrCidr("192.0.2.0/33"), false);
});
test("matches addresses against CIDR rules", () => {
  assert.equal(ipMatchesRule("192.0.2.44", "192.0.2.0/24"), true);
  assert.equal(ipMatchesRule("192.0.3.44", "192.0.2.0/24"), false);
  assert.equal(ipMatchesRule("2001:db8:abcd::1", "2001:db8::/32"), true);
  assert.equal(ipMatchesRule("2001:db9::1", "2001:db8::/32"), false);
});
test("rejects malformed CIDR values", () => assert.equal(parseIpOrCidr("2001:db8::/129"), null));
