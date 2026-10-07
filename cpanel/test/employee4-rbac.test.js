import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../src/data/permissions.js";
import { canAccessAdminPage } from "../src/utils/roles.js";

test("Employee 4 pages require explicit permissions for staff", () => {
  const user = { role: "employee", permissions: ["sms.view", "legal_information.view"] };
  assert.equal(hasPermission(user, "sms.view"), true);
  assert.equal(hasPermission(user, "sms.manage"), false);
  assert.equal(canAccessAdminPage(user, "admin-sms"), true);
  assert.equal(canAccessAdminPage(user, "admin-security"), false);
  assert.equal(canAccessAdminPage(user, "admin-legal-information"), true);
});

test("Employee 4 manage permissions unlock corresponding pages/actions", () => {
  const user = { role: "staff", permissions: ["security.ip_blocks.manage", "banners.manage"] };
  assert.equal(canAccessAdminPage(user, "admin-security"), true);
  assert.equal(hasPermission(user, "security.ip_blocks.manage"), true);
  assert.equal(canAccessAdminPage(user, "admin-banners"), true);
});
