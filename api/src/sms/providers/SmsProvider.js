/**
 * Provider-independent SMS contract.
 *
 * Adapters must NOT leak provider SDK details, raw HTTP responses, or
 * provider-specific field structures into business logic. Every provider
 * method returns a normalized shape so the application layer only ever
 * consumes: success, providerReference, cost, balance, error (for send),
 * and { supported, value, currency } / { supported, value } / { supported, status }
 * for capabilities.
 *
 * Normalization helper functions keep the contract difficult to violate:
 * providers are expected to return provider-normalized results, and the
 * service layer never inspects raw provider responses.
 */

/**
 * Normalized send result.
 * @typedef {Object} SmsSendResult
 * @property {boolean} success
 * @property {string|null} providerReference
 * @property {number|null} cost
 * @property {number|null} balance   - only when provider reports a post-send balance
 * @property {string|null} error      - sanitized application-level error (no secrets)
 */

/**
 * Normalized balance result.
 * @typedef {Object} SmsBalanceResult
 * @property {boolean} supported
 * @property {number|null} value
 * @property {string|null} currency
 */

/**
 * Normalized recharge history result.
 * @typedef {Object} SmsRechargeHistoryResult
 * @property {boolean} supported
 * @property {Array|null} value
 */

/**
 * Normalized delivery status result.
 * @typedef {Object} SmsDeliveryStatusResult
 * @property {boolean} supported
 * @property {string|null} status
 */

/**
 * Capability metadata for a provider.
 * @typedef {Object} SmsProviderCapabilities
 * @property {boolean} balance
 * @property {boolean} rechargeHistory
 * @property {boolean} deliveryStatus
 */

/**
 * Normalize a provider's send result to the stable contract shape.
 * Provider implementations MAY call this; the application layer MUST treat
 * its output as the only shape it consumes.
 *
 * @param {Object} result
 * @param {boolean} [success]
 * @param {string|null} [providerReference]
 * @param {number|null} [cost]
 * @param {number|null} [balance]
 * @param {string|null} [error]
 * @returns {SmsSendResult}
 */
export function normalizeSendResult({
  success = false,
  providerReference = null,
  cost = null,
  balance = null,
  error = null,
} = {}) {
  return {
    success: success === true,
    providerReference: typeof providerReference === "string" && providerReference ? providerReference : null,
    cost: cost == null ? null : Number(cost),
    balance: balance == null ? null : Number(balance),
    error: error ? String(error) : null,
  };
}

/**
 * Normalize a provider's balance result.
 * @param {Object} result
 * @param {boolean} [supported]
 * @param {number|null} [value]
 * @param {string|null} [currency]
 * @returns {SmsBalanceResult}
 */
export function normalizeBalanceResult({
  supported = false,
  value = null,
  currency = null,
} = {}) {
  return {
    supported: supported === true,
    value: supported ? (value == null ? null : Number(value)) : null,
    currency: supported && currency ? String(currency) : null,
  };
}

/**
 * Normalize a provider's recharge-history result.
 * @param {Object} result
 * @param {boolean} [supported]
 * @param {Array|null} [value]
 * @returns {SmsRechargeHistoryResult}
 */
export function normalizeRechargeHistoryResult({
  supported = false,
  value = null,
} = {}) {
  return {
    supported: supported === true,
    value: supported && Array.isArray(value) ? value : (supported ? [] : null),
  };
}

/**
 * Normalize a provider's delivery-status result.
 * @param {Object} result
 * @param {boolean} [supported]
 * @param {string|null} [status]
 * @returns {SmsDeliveryStatusResult}
 */
export function normalizeDeliveryStatusResult({
  supported = false,
  status = null,
} = {}) {
  return {
    supported: supported === true,
    status: supported && status ? String(status) : null,
  };
}

/**
 * Throw a normalized error that the Express error middleware turns into a
 * client-safe 400 response (statusCode convention used across the codebase).
 * @param {string} message
 */
export function smsValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * SmsProvider — stable provider contract.
 *
 * Concrete providers MUST override `send`, and MAY override `getBalance`,
 * `getRechargeHistory`, and `getDeliveryStatus` to return capability-aware
 * normalized results. The default implementations declare the capability as
 * UNSUPPORTED, so a provider that does not implement a method is correctly
 * represented as unsupported rather than throwing.
 */
export class SmsProvider {
  /**
   * @returns {SmsProviderCapabilities}
   */
  get capabilities() {
    return { balance: false, rechargeHistory: false, deliveryStatus: false };
  }

  /**
   * @param {Object} input  - { to, message, sender, metadata }
   * @returns {Promise<SmsSendResult>}
   */
  async send(_input) {
    throw smsValidationError("SmsProvider.send() must be implemented");
  }

  /**
   * @returns {Promise<SmsBalanceResult>}
   */
  async getBalance() {
    return normalizeBalanceResult({ supported: false });
  }

  /**
   * @returns {Promise<SmsRechargeHistoryResult>}
   */
  async getRechargeHistory() {
    return normalizeRechargeHistoryResult({ supported: false });
  }

  /**
   * @param {string} _providerReference
   * @returns {Promise<SmsDeliveryStatusResult>}
   */
  async getDeliveryStatus(_providerReference) {
    return normalizeDeliveryStatusResult({ supported: false });
  }
}
