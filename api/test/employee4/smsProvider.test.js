import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SmsProvider,
  normalizeSendResult,
  normalizeBalanceResult,
  normalizeRechargeHistoryResult,
  normalizeDeliveryStatusResult,
} from "../../src/sms/providers/SmsProvider.js";
import { MockSmsProvider } from "../../src/sms/providers/MockSmsProvider.js";
import { smsRegistry, createSmsRegistry, getSmsProvider, registerSmsProvider } from "../../src/sms/providers/providerRegistry.js";
import {
  validateRecipient,
  validateMessage,
  validateSender,
  validateSmsInput,
} from "../../src/sms/smsValidation.js";
import {
  sanitizeLogValue,
  sanitizeError,
  buildSmsLog,
} from "../../src/sms/smsSanitizer.js";

// --- Contract normalization tests ---

test("normalizeSendResult produces consistent shape", () => {
  const result = normalizeSendResult({ success: true, providerReference: "ref-1", cost: 0.04 });
  assert.equal(result.success, true);
  assert.equal(result.providerReference, "ref-1");
  assert.equal(result.cost, 0.04);
  assert.equal(result.balance, null);
  assert.equal(result.error, null);
});

test("normalizeSendResult defaults unsupported fields to null", () => {
  const result = normalizeSendResult({ success: false, error: "fail" });
  assert.equal(result.success, false);
  assert.equal(result.providerReference, null);
  assert.equal(result.cost, null);
  assert.equal(result.error, "fail");
});

test("normalizeBalanceResult unsupported shape", () => {
  const result = normalizeBalanceResult({ supported: false });
  assert.equal(result.supported, false);
  assert.equal(result.value, null);
  assert.equal(result.currency, null);
});

test("normalizeBalanceResult supported shape", () => {
  const result = normalizeBalanceResult({ supported: true, value: 500, currency: "USD" });
  assert.equal(result.supported, true);
  assert.equal(result.value, 500);
  assert.equal(result.currency, "USD");
});

test("normalizeRechargeHistoryResult unsupported shape", () => {
  const result = normalizeRechargeHistoryResult({ supported: false });
  assert.equal(result.supported, false);
  assert.equal(result.value, null);
});

test("normalizeDeliveryStatusResult unsupported shape", () => {
  const result = normalizeDeliveryStatusResult({ supported: false });
  assert.equal(result.supported, false);
  assert.equal(result.status, null);
});

// --- Mock provider tests ---

test("mock provider returns normalized send result", async () => {
  const provider = new MockSmsProvider();
  const result = await provider.send({ to: "15551234567", message: "hi", sender: "NOTIFY" });
  assert.equal(result.success, true);
  assert.equal(typeof result.providerReference, "string");
  assert.equal(result.providerReference.startsWith("mock-"), true);
  assert.equal(result.error, null);
});

test("mock provider identified as 'mock'", () => {
  assert.equal(MockSmsProvider.providerId, "mock");
});

test("mock provider getBalance returns supported mock balance", async () => {
  const provider = new MockSmsProvider();
  const balance = await provider.getBalance();
  assert.equal(balance.supported, true);
  assert.equal(balance.value, 1000);
  assert.equal(balance.currency, "CREDITS");
});

test("mock provider getRechargeHistory is unsupported", async () => {
  const provider = new MockSmsProvider();
  const result = await provider.getRechargeHistory();
  assert.equal(result.supported, false);
  assert.equal(result.value, null);
});

test("mock provider getDeliveryStatus is unsupported", async () => {
  const provider = new MockSmsProvider();
  const result = await provider.getDeliveryStatus("some-ref");
  assert.equal(result.supported, false);
  assert.equal(result.status, null);
});

// --- Registry tests ---

test("registry resolves mock provider", () => {
  const previous = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = "mock";
  try {
    const provider = getSmsProvider();
    assert.ok(provider instanceof MockSmsProvider);
  } finally {
    process.env.SMS_PROVIDER = previous;
  }
});

test("registry rejects unknown provider", () => {
  const previous = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = "unknown-provider";
  try {
    assert.throws(() => getSmsProvider(), /SMS provider is not configured/);
  } finally {
    process.env.SMS_PROVIDER = previous;
  }
});

test("registry supports registering a custom provider", () => {
  class CustomProvider extends SmsProvider {
    get capabilities() {
      return { balance: true, rechargeHistory: true, deliveryStatus: true };
    }
    async send() {
      return normalizeSendResult({ success: true, providerReference: "custom-1" });
    }
  }
  registerSmsProvider("custom-test", new CustomProvider());
  const previous = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = "custom-test";
  try {
    const provider = getSmsProvider();
    assert.ok(provider instanceof CustomProvider);
        assert.equal(provider.capabilities.balance, true);
  } finally {
    process.env.SMS_PROVIDER = previous;
  }
});

// --- Validation tests ---

test("validateRecipient accepts local leading-zero format", () => {
  assert.equal(validateRecipient("0599999999"), "599999999");
});

test("validateRecipient rejects empty", () => {
  assert.throws(() => validateRecipient(""), /recipient is required/i);
  assert.throws(() => validateRecipient(null), /recipient is required/i);
  assert.throws(() => validateRecipient(undefined), /recipient is required/i);
});

test("validateRecipient rejects garbage", () => {
  assert.throws(() => validateRecipient("abc"), /invalid/i);
  assert.throws(() => validateRecipient("!!!"), /invalid/i);
  assert.throws(() => validateRecipient("12345"), /not a valid/i);
});

test("validateMessage rejects empty/whitespace", () => {
  assert.throws(() => validateMessage(""), /message is required/i);
  assert.throws(() => validateMessage("   "), /message is required/i);
  assert.throws(() => validateMessage(null), /message is required/i);
});

test("validateMessage rejects oversize", () => {
  assert.throws(() => validateMessage("x".repeat(1601)), /exceeds maximum/i);
});

test("validateMessage accepts valid text", () => {
  assert.equal(validateMessage("Hello"), "Hello");
});

test("validateSender rejects empty", () => {
  assert.throws(() => validateSender(""), /sender is required/i);
  assert.throws(() => validateSender(null), /sender is required/i);
});

test("validateSender rejects injection characters", () => {
  assert.throws(() => validateSender("NOTIFY\r\n"), /invalid characters/i);
  assert.throws(() => validateSender("NOTIFY\n"), /invalid characters/i);
});

test("validateSender rejects too long", () => {
  assert.throws(() => validateSender("ABCDEFGHIJKLMNOP"), /exceeds 11/i);
});

test("validateSender accepts valid ID", () => {
  assert.equal(validateSender("NOTIFY"), "NOTIFY");
});

test("validateSmsInput bundles validation", () => {
  const result = validateSmsInput({ to: "+15551234567", message: "hi", sender: "NOTIFY" });
  assert.equal(result.to, "15551234567");
  assert.equal(result.text, "hi");
  assert.equal(result.senderId, "NOTIFY");
});

test("validateSmsInput rejects if any field invalid", () => {
  assert.throws(() => validateSmsInput({ to: "", message: "hi", sender: "NOTIFY" }), /recipient is required/i);
  assert.throws(() => validateSmsInput({ to: "+15551234567", message: "", sender: "NOTIFY" }), /message is required/i);
  assert.throws(() => validateSmsInput({ to: "+15551234567", message: "hi", sender: "" }), /sender is required/i);
});

// --- Sanitization tests ---

test("sanitizeLogValue redacts secrets and internal IPs", () => {
  const input = "Bearer SUPER_SECRET api_key=SECRET123 password=hunter2 DATABASE_URL=postgres://admin:admin@10.0.0.5/db host=192.168.1.1";
  const result = sanitizeLogValue(input);
  assert.equal(result, "[REDACTED] [REDACTED] [REDACTED] [REDACTED] host=[REDACTED]");
});

test("sanitizeLogValue redacts 10.x.x.x", () => {
  const input = "error at 10.0.0.5:5432";
  const result = sanitizeLogValue(input);
  assert.equal(result, "error at [REDACTED]:5432");
});

test("sanitizeLogValue redacts 172.16-31.x.x", () => {
  const input = "db at 172.16.5.10";
  const result = sanitizeLogValue(input);
  assert.equal(result, "db at [REDACTED]");
});

test("sanitizeLogValue redacts 127.0.0.1", () => {
  const input = "localhost 127.0.0.1 connection";
  const result = sanitizeLogValue(input);
  assert.equal(result, "localhost [REDACTED] connection");
});

test("sanitizeLogValue preserves phone numbers and costs", () => {
  const input = "sent to +15551234567 cost 0.05 balance 12.50";
  const result = sanitizeLogValue(input);
  assert.equal(result, input);
});

test("sanitizeError preserves safe message, removes secrets", () => {
  const error = new Error("Auth failed for api_key=SECRET123 at 10.0.0.5");
  const result = sanitizeError(error);
  assert.equal(result, "Auth failed for [REDACTED] at [REDACTED]");
});

test("sanitizeError handles non-Error input", () => {
  assert.equal(sanitizeError(null), null);
  assert.equal(sanitizeError("plain string"), "plain string");
  assert.equal(sanitizeError(42), "Unexpected error.");
});

test("SmsProvider.send throws if not implemented", async () => {
  const provider = new SmsProvider();
  await assert.rejects(() => provider.send({ to: "1", message: "hi", sender: "S" }), /must be implemented/i);
});

test("mock provider unsupported capabilities return explicit unsupported state", async () => {
  const provider = smsRegistry.resolve("mock");
  // Mock supports a clearly-labeled simulated balance (see dedicated test).
  // Recharge history and delivery status are NOT supported by the mock and
  // must return the explicit unsupported shape — never fabricated data.
  assert.deepEqual(
    await provider.getRechargeHistory(),
    { supported: false, value: null },
  );
  assert.deepEqual(
    await provider.getDeliveryStatus("ref"),
    { supported: false, status: null },
  );
});

test("createSmsRegistry returns an isolated registry", () => {
  const registry = createSmsRegistry();
  assert.deepEqual(registry.list(), []);
  assert.throws(() => registry.resolve("mock"), /not configured/i);
  assert.throws(() => registry.register("", new MockSmsProvider()), /key is required/i);
  assert.throws(() => registry.register("bad", { noSend: true }), /must implement send/i);
  registry.register("mock", new MockSmsProvider());
  assert.equal(registry.has("mock"), true);
  assert.ok(registry.resolve("MOCK") instanceof MockSmsProvider); // case-insensitive
  assert.deepEqual(registry.list(), ["mock"]);
});

test("buildSmsLog creates a pending record without inventing provider data", () => {
  const log = buildSmsLog({
    companyId: "c1",
    to: "599111222",
    text: "hello",
    senderId: "NOTIFY",
    providerName: "mock",
    relatedEntityType: "order",
    relatedEntityId: "order-9",
  });
  assert.equal(log.status, "PENDING");
  assert.equal(log.company_id, "c1");
  assert.equal(log.recipient, "599111222");
  assert.equal(log.sender, "NOTIFY");
  assert.equal(log.message, "hello");
  assert.equal(log.provider, "mock");
  assert.equal(log.provider_reference, null);
  assert.equal(log.cost, null);
  assert.equal(log.currency, null);
  assert.equal(log.sent_at, null);
  assert.equal(log.failed_at, null);
  assert.equal(log.error_message, null);
  assert.equal(log.related_entity_type, "order");
  assert.equal(log.related_entity_id, "order-9");
  assert.match(log.id, /^[0-9a-f-]{36}$/);
  assert.ok(log.created_at);
});

// --- sendSms integration tests (persistence through the existing architecture) ---

// Run the default store.js instance in isolated test-memory mode with a
// throwaway JSON persistence directory, so persistence through the existing
// architecture (TenantRepository + persistCompanyStore) is exercised for real
// without touching the developer's data-store or any database. Each node
// --test file runs in its own process, so this cannot leak into other suites.
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.DATA_STORE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "employee4-sms-"));

const { sendSms } = await import("../../src/sms/smsService.js");
const { smsLogRepository } = await import("../../src/data/store.js");

function readPersistedSmsLogs() {
  const raw = fs.readFileSync(path.join(process.env.DATA_STORE_DIR, "store.json"), "utf8");
  return JSON.parse(raw).smsLogs || [];
}

test("sendSms persists every attempt through the existing persistence architecture", async () => {
  const previousProvider = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = "mock";
  try {
    const log = await sendSms({
      companyId: "sms-it-co",
      recipient: "0599111222",
      sender: "NOTIFY",
      message: "Order confirmed",
      relatedEntityType: "order",
      relatedEntityId: "order-1",
    });

    // Normalized mock result mapped onto the log — mock never invents cost.
    assert.equal(log.status, "SENT");
    assert.equal(log.provider, "mock");
    assert.equal(typeof log.provider_reference, "string");
    assert.equal(log.cost, null);
    assert.equal(log.currency, null);
    assert.equal(log.recipient, "599111222"); // validated + normalized
    assert.equal(log.error_message, null);
    assert.equal(log.related_entity_type, "order");
    assert.equal(log.related_entity_id, "order-1");

    // In-memory repository state (tenant-scoped)
    const memoryLogs = smsLogRepository.getByCompany("sms-it-co");
    assert.equal(memoryLogs.length, 1);
    assert.equal(memoryLogs[0].id, log.id);

    // Persisted through the existing persistence architecture (company-tagged)
    const persisted = readPersistedSmsLogs();
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].id, log.id);
    assert.equal(persisted[0].company_id, "sms-it-co");
    assert.equal(persisted[0].status, "SENT");
    assert.equal(persisted[0].provider, "mock");

    // Tenant isolation
    assert.equal(smsLogRepository.getByCompany("other-company").length, 0);

    // Survives a restart: a fresh store.js import rehydrates the log.
    const restarted = await import(`../../src/data/store.js?sms-restart-${Date.now()}`);
    const restored = restarted.smsLogRepository.getByCompany("sms-it-co");
    assert.equal(restored.length, 1);
    assert.equal(restored[0].id, log.id);
    assert.equal(restored[0].status, "SENT");
    assert.equal(restored[0].recipient, "599111222");
  } finally {
    process.env.SMS_PROVIDER = previousProvider;
  }
});

test("sendSms records sanitized failures and never leaks provider secrets", async () => {
  class FailingProvider extends SmsProvider {
    async send() {
      throw new Error("gateway auth failed api_key=VL_SUPER_SECRET at 10.0.0.9");
    }
  }
  registerSmsProvider("failing-it", new FailingProvider());

  const previousProvider = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = "failing-it";
  try {
    const log = await sendSms({
      companyId: "sms-fail-co",
      recipient: "+15559876543",
      sender: "NOTIFY",
      message: "hi",
    });

    assert.equal(log.status, "FAILED");
    assert.equal(log.provider_reference, null);
    assert.equal(log.sent_at, null);
    assert.ok(log.failed_at);
    assert.match(log.error_message, /\[REDACTED\]/);
    assert.equal(log.error_message.includes("VL_SUPER_SECRET"), false);
    assert.equal(log.error_message.includes("10.0.0.9"), false);

    // The failed attempt is still persisted — every attempt is logged.
    const persisted = readPersistedSmsLogs().filter((row) => row.company_id === "sms-fail-co");
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].status, "FAILED");
    assert.equal(persisted[0].id, log.id);
    assert.equal(persisted[0].error_message.includes("VL_SUPER_SECRET"), false);
  } finally {
    process.env.SMS_PROVIDER = previousProvider;
  }
});

test("sendSms rejects invalid input before any provider invocation", async () => {
  let providerCalled = false;
  class SpyProvider extends SmsProvider {
    async send() {
      providerCalled = true;
      return normalizeSendResult({ success: true });
    }
  }
  registerSmsProvider("spy-it", new SpyProvider());

  const previousProvider = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = "spy-it";
  try {
    const before = smsLogRepository.getByCompany("sms-invalid-co").length;
    await assert.rejects(
      () => sendSms({ companyId: "sms-invalid-co", recipient: "not-a-phone", sender: "N", message: "hi" }),
      /invalid/i,
    );
    assert.equal(providerCalled, false);
    assert.equal(smsLogRepository.getByCompany("sms-invalid-co").length, before);
  } finally {
    process.env.SMS_PROVIDER = previousProvider;
  }
});

test("production never falls back to the mock provider", async () => {
  const { getSmsProvider } = await import("../../src/sms/providers/providerRegistry.js");
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProvider = process.env.SMS_PROVIDER;
  process.env.NODE_ENV = "production";
  delete process.env.SMS_PROVIDER;
  try {
    assert.equal(getSmsProvider(), null);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousProvider === undefined) delete process.env.SMS_PROVIDER;
    else process.env.SMS_PROVIDER = previousProvider;
  }
});
