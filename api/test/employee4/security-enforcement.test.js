import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "security-enforcement-"));
const now = "2026-09-10T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "sec-co",
      slug: "sec-co",
      name: "Security Co",
      status: "active",
      settings: {
        securityProtection: {
          accountFailedAttempts: 2,
          accountLockMinutes: 30,
          ipFailedAttempts: 20,
          ipBlockMinutes: 30,
        },
        websiteConnection: {
          siteId: "sec-co-storefront",
          storefrontBaseUrl: "https://sec-co.example",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
    {
      id: "other-co",
      slug: "other-co",
      name: "Other Co",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "other-co-storefront",
          storefrontBaseUrl: "https://other-co.example",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
  ],
  domains: [
    {
      id: "sec-domain",
      company_id: "sec-co",
      domain: "sec-co.example",
      is_primary: true,
      is_active: true,
      is_verified: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "other-domain",
      company_id: "other-co",
      domain: "other-co.example",
      is_primary: true,
      is_active: true,
      is_verified: true,
      created_at: now,
      updated_at: now,
    },
  ],
  users: [
    {
      id: "sec-admin",
      name: "Sec Admin",
      email: "admin@sec.test",
      password: passwordHash,
      role: "company_admin",
      permissions: [],
      isActive: true,
      company_id: "sec-co",
      createdAt: now,
      updatedAt: now,
    },
  ],
  memberships: [
    {
      id: "sec-co:sec-admin",
      companyId: "sec-co",
      userId: "sec-admin",
      role: "company_admin",
      status: "active",
      permissions: [],
      createdAt: now,
      updatedAt: now,
    },
  ],
  ipBlocks: [
    {
      id: "block-1",
      company_id: "sec-co",
      ip_address: "203.0.113.50",
      block_type: "MANUAL",
      reason: "test block",
      is_active: true,
      created_at: now,
      expires_at: null,
    },
  ],
  loginSecurity: [],
  ipSecurity: [],
  loginHistory: [],
  products: [],
  usersExtra: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "security-enforcement-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../../src/server.js");
const {
  ipBlockRepository,
  loginSecurityRepository,
} = await import("../../src/data/store.js");
const { resolveClientIp, enforceIpBlock } = await import("../../src/middleware/ipBlock.js");

test("resolveClientIp uses Express req.ip and ignores spoofed X-Forwarded-For", () => {
  const spoofed = resolveClientIp({
    ip: "198.51.100.10",
    headers: { "x-forwarded-for": "203.0.113.50, 10.0.0.1" },
    socket: { remoteAddress: "198.51.100.10" },
  });
  assert.equal(spoofed, "198.51.100.10");

  const mapped = resolveClientIp({
    ip: "::ffff:198.51.100.25",
    headers: { "x-forwarded-for": "203.0.113.99" },
    socket: { remoteAddress: "::ffff:198.51.100.25" },
  });
  assert.equal(mapped, "198.51.100.25");

  const socketFallback = resolveClientIp({
    headers: { "x-forwarded-for": "203.0.113.1" },
    socket: { remoteAddress: "::ffff:192.0.2.10" },
  });
  assert.equal(socketFallback, "192.0.2.10");
});

test("spoofed X-Forwarded-For cannot bypass a tenant IP block on req.ip", async () => {
  const blockedIp = "198.51.100.66";
  ipBlockRepository.createForCompany("sec-co", {
    id: "block-req-ip",
    company_id: "sec-co",
    ip_address: blockedIp,
    block_type: "MANUAL",
    reason: "authoritative req.ip block",
    is_active: true,
    created_at: now,
    expires_at: null,
  }, { prepend: true });

  let status = 0;
  let body = null;
  const req = {
    companyId: "sec-co",
    ip: blockedIp,
    headers: { "x-forwarded-for": "203.0.113.200" },
    socket: { remoteAddress: blockedIp },
  };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
  let nextCalled = false;
  enforceIpBlock(req, res, () => { nextCalled = true; });

  assert.equal(status, 403);
  assert.match(String(body?.message || ""), /access denied/i);
  assert.equal(nextCalled, false);
  assert.equal(req.clientIp, blockedIp);
});

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const port = server.address().port;

async function login({ email = "admin@sec.test", password: pw = password, companyId = "sec-co", ip = "198.51.100.10" } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": companyId,
      "X-Forwarded-For": ip,
    },
    body: JSON.stringify({ email, password: pw }),
  });
  return { response, body: await response.json().catch(() => ({})) };
}

async function storefrontGet({ companyId = "sec-co", siteId = "sec-co-storefront", ip = "198.51.100.10" } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/storefront/content?page=/`, {
    headers: {
      "X-Company-Id": companyId,
      "X-Site-Id": siteId,
      "X-Forwarded-For": ip,
    },
  });
  return { response, body: await response.json().catch(() => ({})) };
}

test("manual IP block denies login for the owning tenant", async () => {
  const blocked = await login({ ip: "203.0.113.50" });
  assert.equal(blocked.response.status, 403);
  assert.match(String(blocked.body.message || ""), /access denied/i);

  const allowed = await login({ ip: "198.51.100.10" });
  assert.equal(allowed.response.status, 200);
  assert.ok(allowed.body.token);
});

test("manual IP block denies storefront requests for the owning tenant only", async () => {
  const blocked = await storefrontGet({ ip: "203.0.113.50" });
  assert.equal(blocked.response.status, 403);

  const other = await storefrontGet({
    companyId: "other-co",
    siteId: "other-co-storefront",
    ip: "203.0.113.50",
  });
  assert.equal(other.response.status, 200);
  assert.equal(other.body.site.companyId, "other-co");
});

test("failed logins lock the account and subsequent login is denied", async () => {
  const email = "admin@sec.test";
  // Reset counters for a deterministic lock path.
  const existing = loginSecurityRepository.findByCompany("sec-co", (entry) => entry.email === email);
  if (existing) {
    existing.failed_attempts = 0;
    existing.locked_until = null;
  }

  const first = await login({ password: "wrong-password", ip: "198.51.100.20" });
  assert.equal(first.response.status, 401);
  const second = await login({ password: "wrong-password", ip: "198.51.100.20" });
  assert.equal(second.response.status, 401);

  const locked = loginSecurityRepository.findByCompany("sec-co", (entry) => entry.email === email);
  assert.ok(locked?.locked_until);
  assert.ok(new Date(locked.locked_until) > new Date());

  const denied = await login({ ip: "198.51.100.20" });
  assert.equal(denied.response.status, 423);
  assert.match(String(denied.body.message || ""), /locked/i);
});

test("IP block created for one tenant does not deny another tenant", async () => {
  ipBlockRepository.createForCompany("sec-co", {
    id: "block-temp-other-ip",
    company_id: "sec-co",
    ip_address: "203.0.113.77",
    block_type: "MANUAL",
    reason: "tenant scoped",
    is_active: true,
    created_at: now,
    expires_at: null,
  }, { prepend: true });

  const blockedHome = await storefrontGet({ ip: "203.0.113.77" });
  assert.equal(blockedHome.response.status, 403);

  const otherOk = await storefrontGet({
    companyId: "other-co",
    siteId: "other-co-storefront",
    ip: "203.0.113.77",
  });
  assert.equal(otherOk.response.status, 200);
});
