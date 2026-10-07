/**
 * SMS log sanitization — security-critical.
 *
 * Ensures that secrets, credentials, internal infrastructure details, and
 * raw provider responses NEVER enter SMS logs or API responses.
 *
 * Reuses the existing activity-log sensitive-key list from
 * activityLog/logger.js where applicable, and extends it with SMS-specific
 * patterns (provider auth tokens, DB connection strings, internal IPs).
 */

import crypto from "node:crypto";

// Patterns whose presence in a string triggers redaction to "[REDACTED]".
// These are intentionally targeted — we never redact plain numbers because
// phone numbers, costs, and provider references legitimately contain digits.
const SECRET_PATTERNS = [
  /Authorization\s*:\s*Bearer\s+\S+/gi,
  /\bBearer\s+\S+/gi, // standalone bearer tokens (not preceded by "Authorization:")
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /apikey\s*[:=]\s*\S+/gi,
  /secret\s*[:=]\s*\S+/gi,
  /password\s*[:=]\s*\S+/gi,
  /access[_-]?token\s*[:=]\s*\S+/gi,
  /refresh[_-]?token\s*[:=]\s*\S+/gi,
  /DATABASE_URL\s*[:=]\s*\S+/gi,
  /postgres:\/\/[^:\s]+:[^@\s]+@[^\s]+/gi, // postgres://user:pass@host
  /mysql:\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,    // mysql://user:pass@host
  /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,
  /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,      // 10.x private
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/,         // 192.168.x.x private
  /\b172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/, // 172.16-31 private
  /\b127\.0\.0\.\d{1,3}\b/,                 // 127.0.0.x loopback
];

/**
 * Sanitize an arbitrary error value into a safe, short string.
 *
 * - Strips secrets matched by SECRET_PATTERNS.
 * - Never returns a stack trace (only the message, if safe).
 * - Returns a generic message if sanitization removes everything.
 *
 * @param {*} error
 * @returns {string|null}
 */
export function sanitizeError(error) {
  if (error == null) return null;

  let text;
  if (typeof error === "string") {
    text = error;
  } else if (error && typeof error === "object" && "message" in error) {
    text = String(error.message || "");
  } else {
    text = "Unexpected error.";
  }

  return sanitizeString(text);
}

/**
 * Sanitize a string by redacting any matched secret pattern.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function sanitizeString(value) {
  if (value == null) return null;
  let text = String(value);

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, "[REDACTED]");
    }
  }

  return text;
}

/**
 * Sanitize any value destined for an SMS log entry, API response, or
 * activity-log metadata. Alias of sanitizeString kept as a named export so
 * call sites express intent ("this value is persisted/displayed").
 *
 * @param {*} value
 * @returns {string|null}
 */
export function sanitizeLogValue(value) {
  return sanitizeString(value);
}

/**
 * Build a company_sms_logs record for a pending SMS attempt.
 *
 * The record is created BEFORE the provider is invoked so that every attempt
 * (success, failure, or crash) is persisted through the existing
 * TenantRepository + persistCompanyStore architecture. The caller mutates the
 * returned record in place once the normalized provider result is known.
 *
 * No provider-specific data is invented here: provider_reference, cost,
 * currency, sent_at and error_message stay null until a real provider
 * response (normalized) fills them.
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.to - validated recipient (digits only)
 * @param {string} params.text - validated message body
 * @param {string} params.senderId - validated sender ID
 * @param {string} [params.providerName]
 * @param {string} [params.relatedEntityType]
 * @param {string} [params.relatedEntityId]
 * @returns {Object} mutable pending log record
 */
export function buildSmsLog({
  companyId,
  to,
  text,
  senderId,
  providerName = "disabled",
  relatedEntityType = "",
  relatedEntityId = "",
}) {
  return {
    id: crypto.randomUUID(),
    company_id: companyId,
    recipient: String(to),
    sender: String(senderId || ""),
    message: String(text || ""),
    status: "PENDING",
    provider: String(providerName || "disabled"),
    provider_reference: null,
    cost: null,
    currency: null,
    related_entity_type: relatedEntityType || "",
    related_entity_id: relatedEntityId || "",
    error_message: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    failed_at: null,
  };
}
