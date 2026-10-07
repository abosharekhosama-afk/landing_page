import test from "node:test";
import assert from "node:assert/strict";
import { encryptSecret, decryptSecret, encryptSecrets, decryptSecrets } from "../../src/sms/smsProviderCrypto.js";
import { assertSafeUrl, isBlockedIp } from "../../src/sms/providers/DynamicHttpSmsProvider.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationDir = path.resolve(here, "../../supabase/migrations");
const storeSourcePath = path.resolve(here, "../../src/data/store.js");
const postgresStoreSourcePath = path.resolve(here, "../../src/data/postgresStore.js");

test("SMS secrets encrypt and decrypt every supported naming variant", () => {
  const input = {
    apiKey: "A", api_key: "B", apiSecret: "C", api_secret: "D", password: "E",
    token: "F", accessToken: "G", access_token: "H", clientSecret: "I", client_secret: "J",
    username: "K", account: "L", sender: "M",
  };
  const encrypted = encryptSecrets(input);
  for (const [key, value] of Object.entries(encrypted)) {
    assert.notEqual(value, input[key], key);
    assert.match(value, /^enc:v1:/, key);
  }
  assert.deepEqual(decryptSecrets(encrypted), input);
  assert.equal(decryptSecret(encryptSecret("round-trip")), "round-trip");
});

test("production never falls back to the development SMS encryption key", () => {
  const oldEnv = { NODE_ENV: process.env.NODE_ENV, SMS_ENCRYPTION_KEY: process.env.SMS_ENCRYPTION_KEY };
  process.env.NODE_ENV = "production";
  delete process.env.SMS_ENCRYPTION_KEY;
  try {
    assert.throws(() => encryptSecret("secret"), /SMS_ENCRYPTION_KEY is required in production/i);
  } finally {
    if (oldEnv.NODE_ENV === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv.NODE_ENV;
    if (oldEnv.SMS_ENCRYPTION_KEY === undefined) delete process.env.SMS_ENCRYPTION_KEY; else process.env.SMS_ENCRYPTION_KEY = oldEnv.SMS_ENCRYPTION_KEY;
  }
});

test("dynamic SMS provider rejects localhost, loopback, private and reserved addresses", () => {
  for (const url of ["http://localhost/sms", "http://127.0.0.1/sms", "http://[::1]/sms", "http://10.0.0.1/sms", "http://172.16.0.1/sms", "http://192.168.1.1/sms", "http://169.254.169.254/latest/meta-data/"]) {
    assert.throws(() => assertSafeUrl(url), /blocked|private|reserved/i, url);
  }
  assert.equal(isBlockedIp("127.0.0.1"), true);
  assert.equal(isBlockedIp("10.1.2.3"), true);
  assert.equal(isBlockedIp("172.31.255.255"), true);
  assert.equal(isBlockedIp("192.168.1.1"), true);
  assert.equal(isBlockedIp("8.8.8.8"), false);
  assert.throws(() => assertSafeUrl("file:///etc/passwd"), /http or https/i);
  assert.throws(() => assertSafeUrl("https://user:pass@example.com/sms"), /credentials/i);
});

test("backend permission catalog contains SMS provider and splash permissions", () => {
  const source = fs.readFileSync(storeSourcePath, "utf8");
  for (const permission of ["sms.providers.manage", "splash_ads.view", "splash_ads.manage"]) assert.match(source, new RegExp(`\"${permission.replaceAll(".", "\\.")}\"`), permission);
});

test("employee 4 persistence and routes are company-scoped", () => {
  const source = fs.readFileSync(storeSourcePath, "utf8");
  for (const collection of ["smsLogs", "smsAutomations", "announcements", "splashAds", "storePolicies", "legalInformation", "loginHistory", "loginSecurity", "ipBlocks"]) {
    assert.match(source, new RegExp(`normalizeTenantRecords\\(persisted\\?\.${collection}`), collection);
  }
});

test("SMS provider migration enforces one active provider per company without priority coupling", () => {
  const migrations = fs.readdirSync(migrationDir).filter((name) => /sms_providers\.sql$/.test(name)).sort();
  assert.ok(migrations.length > 0);
  const sql = fs.readFileSync(path.join(migrationDir, migrations.at(-1)), "utf8");
  assert.match(sql, /create unique index[\s\S]*idx_sms_providers_single_active/i);
  assert.match(sql, /on (?:public\.)?company_sms_providers\(company_id\)[\s\S]*where is_active = true/i);
  assert.doesNotMatch(sql, /where is_active = true and priority = 1/i);
});

test("SMS provider lifecycle is transactionally implemented", () => {
  const source = fs.readFileSync(postgresStoreSourcePath, "utf8");
  for (const name of ["createSmsProviderForCompany", "activateSmsProvider", "deactivateSmsProvider"]) {
    const start = source.indexOf(`export async function ${name}`);
    assert.ok(start >= 0, name);
    const end = source.indexOf("export async function", start + 10);
    const body = source.slice(start, end < 0 ? source.length : end);
    assert.match(body, /withTransaction\(/, name);
  }
});
