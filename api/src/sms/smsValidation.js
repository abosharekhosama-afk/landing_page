import { smsValidationError } from "./providers/SmsProvider.js";

/**
 * Phone number normalization and validation for the SMS subsystem.
 *
 * Accepts E.164 numbers and the Egyptian/local formats already used
 * elsewhere in this codebase (see orders.js `normalizePhone`).
 */

const E164_REGEX = /^\+[1-9]\d{4,14}$/;

/**
 * Normalize and validate a recipient phone number.
 *
 * Accepts:
 *   - E.164 (+15551234567, +970599999999)
 *   - Egyptian formats (970 / 972 prefix) — consistent with orders.js
 *   - Local leading-zero formats (0599999999)
 *
 * Returns the normalized E.164 form (without + prefix) for storage, OR
 * the normalized digits if no country code is given.
 *
 * @param {string} value
 * @param {string} [name="recipient"]
 * @returns {string} normalized phone string
 * @throws {Error} statusCode 400 if invalid
 */
export function validateRecipient(value, name = "recipient") {
  if (value == null || typeof value !== "string" || !value.trim()) {
    throw smsValidationError(`${name} is required.`);
  }

  const trimmed = value.trim();

  // Reject anything containing obviously dangerous or non-phone characters.
  // Allow +, digits, spaces, dashes, parentheses only.
  if (!/^[+()\d\s-]+$/.test(trimmed)) {
    throw smsValidationError(`${name} contains invalid characters.`);
  }

  // E.164
  if (E164_REGEX.test(trimmed)) {
    return trimmed.slice(1); // strip + for storage
  }

  // Strip everything except digits
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    throw smsValidationError(`${name} is not a valid phone number.`);
  }

  // Egyptian formats (mirror orders.js normalizePhone convention):
  // 970 / 972 prefix → strip to 9 digits
  if (digits.startsWith("970") || digits.startsWith("972")) {
    const rest = digits.slice(3);
    if (rest.length !== 9) throw smsValidationError(`${name} is not a valid Egyptian number.`);
    return rest;
  }

  // Leading zero
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (rest.length < 7 || rest.length > 12) {
      throw smsValidationError(`${name} is not a valid phone number.`);
    }
    return rest;
  }

  // Bare digits with reasonable length
  if (digits.length >= 7 && digits.length <= 12) {
    return digits;
  }

  throw smsValidationError(`${name} is not a valid phone number.`);
}

/**
 * Validate an SMS message.
 * @param {string} value
 * @returns {string} trimmed message
 * @throws {Error} statusCode 400
 */
export function validateMessage(value) {
  if (value == null || typeof value !== "string" || !value.trim()) {
    throw smsValidationError("Message is required.");
  }
  const trimmed = value.trim();
  // Reasonable maximum — GSM 03.38 single-SMS is ~160 chars; we allow longer
  // to support multi-part SMS but cap at a safe application limit.
  if (trimmed.length > 1600) {
    throw smsValidationError(`Message exceeds maximum length of 1600 characters.`);
  }
  return trimmed;
}

/**
 * Validate an SMS sender ID.
 * @param {string} value
 * @returns {string} trimmed sender
 * @throws {Error} statusCode 400
 */
export function validateSender(value) {
  if (value == null) {
    throw smsValidationError("Sender is required.");
  }
  const raw = String(value);
  // Reject CR/LF injection and control characters BEFORE trimming — a sender
  // ID must never smuggle line breaks past validation (header injection).
  if (/[\r\n\t\0-\x1f\x7f]/.test(raw)) {
    throw smsValidationError("Sender contains invalid characters.");
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw smsValidationError("Sender is required.");
  }
  if (trimmed.length > 11) {
    throw smsValidationError("Sender ID exceeds 11 characters.");
  }
  return trimmed;
}

/**
 * Validate the full SMS input envelope.
 * @param {{to: string, message: string, sender: string}} input
 * @returns {{to: string, text: string, senderId: string}}
 * @throws {Error} statusCode 400
 */
export function validateSmsInput(input = {}) {
  if (!input) throw smsValidationError("Input is required.");
  const to = validateRecipient(input.to);
  const text = validateMessage(input.message);
  const senderId = validateSender(input.sender);
  return { to, text, senderId };
}
