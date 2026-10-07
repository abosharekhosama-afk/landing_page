import {
  SmsProvider,
  normalizeSendResult,
  normalizeBalanceResult,
  normalizeRechargeHistoryResult,
  normalizeDeliveryStatusResult,
} from "./SmsProvider.js";

/**
 * MockSmsProvider — a TEST-ONLY provider.
 *
 * Identified by provider id "mock". It is NEVER mistaken for a production
 * provider: its id is literally "mock" and it returns deterministic test data
 * that is explicitly tagged as mock-sourced.
 *
 * Capabilities:
 *   - send: supported (returns deterministic mock data)
 *   - balance: supported (mock value — must never be treated as production)
 *   - rechargeHistory: unsupported
 *   - deliveryStatus: unsupported
 */
export class MockSmsProvider extends SmsProvider {
  get capabilities() {
    return { balance: true, rechargeHistory: false, deliveryStatus: false };
  }

  /**
   * @param {Object} input - { to, message, sender, metadata }
   * @returns {Promise<import("./SmsProvider.js").SmsSendResult>}
   *
   * NOTE: This is mock data for testing only. It does not represent a real
   * provider response or real SMS delivery.
   */
  async send(input) {
    return normalizeSendResult({
      success: true,
      providerReference: `mock-${Date.now()}`,
      cost: null,
      balance: null,
      error: null,
      // carry recipient through metadata for traceability (not a secret)
      ...(input && input.to ? { recipient: String(input.to) } : {}),
    });
  }

  /**
   * @returns {Promise<import("./SmsProvider.js").SmsBalanceResult>}
   *
   * NOTE: returns a mock balance for testing only. Never treat as production.
   */
  async getBalance() {
    return normalizeBalanceResult({
      supported: true,
      value: 1000,
      currency: "CREDITS",
    });
  }

  async getRechargeHistory() {
    return normalizeRechargeHistoryResult({ supported: false });
  }

  async getDeliveryStatus(_providerReference) {
    return normalizeDeliveryStatusResult({ supported: false });
  }

  /** Stable test-only provider id. */
  static providerId = "mock";
}
