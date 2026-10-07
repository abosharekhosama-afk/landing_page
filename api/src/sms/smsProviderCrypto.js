/**
 * SMS provider secret encryption.
 * AES-256-GCM; production never falls back to a development/default key.
 */
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:v1:";
const DEFAULT_SECRET_FIELDS = new Set([
  "apiKey", "api_key", "apiSecret", "api_secret", "password", "token",
  "accessToken", "access_token", "clientSecret", "client_secret", "username",
  "account", "sender",
]);

function isProduction() {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
}

function getEncryptionKey() {
  const envKey = String(process.env.SMS_ENCRYPTION_KEY || "").trim();
  if (!envKey) {
    if (isProduction()) {
      throw new Error("SMS_ENCRYPTION_KEY is required in production.");
    }
    return crypto.createHash("sha256").update("local-development-sms-key").digest();
  }
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(envKey)) {
    return Buffer.from(envKey.replace(/^0x/, ""), "hex");
  }
  return crypto.createHash("sha256").update(envKey, "utf8").digest();
}

export function encryptSecret(value) {
  if (value === null || value === undefined) return null;
  const plaintext = String(value);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

export function decryptSecret(value) {
  if (value === null || value === undefined || value === "") return null;
  const input = String(value);
  try {
    const encoded = input.startsWith(PREFIX) ? input.slice(PREFIX.length) : input;
    const combined = Buffer.from(encoded, "base64");
    if (combined.length <= IV_LENGTH + AUTH_TAG_LENGTH) throw new Error("Invalid encrypted secret");
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (error) {
    // A plaintext value is never silently accepted as a decrypted secret.
    if (isProduction()) throw new Error("Unable to decrypt SMS provider secret.");
    return null;
  }
}

function shouldEncrypt(key, fields) {
  return fields.has(key) || DEFAULT_SECRET_FIELDS.has(key);
}

export function encryptSecrets(secrets, secretFieldNames = DEFAULT_SECRET_FIELDS) {
  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) return secrets;
  const fields = new Set(secretFieldNames || []);
  for (const key of DEFAULT_SECRET_FIELDS) fields.add(key);
  const result = {};
  for (const [key, value] of Object.entries(secrets)) {
    if (value === null || value === undefined || value === "") {
      result[key] = value;
    } else if (shouldEncrypt(key, fields)) {
      result[key] = String(value).startsWith(PREFIX) ? String(value) : encryptSecret(value);
    } else {
      // encrypted_secrets is a secret-only container: every value is encrypted.
      result[key] = encryptSecret(value);
    }
  }
  return result;
}

export function decryptSecrets(encryptedData) {
  if (!encryptedData || typeof encryptedData !== "object" || Array.isArray(encryptedData)) return encryptedData;
  const result = {};
  for (const [key, value] of Object.entries(encryptedData)) {
    if (value === null || value === undefined || value === "") result[key] = value;
    else result[key] = decryptSecret(value);
  }
  return result;
}

export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString("hex");
}

export function testEncryption() {
  const value = "test-api-key-12345";
  return decryptSecret(encryptSecret(value)) === value;
}

export default { encryptSecret, decryptSecret, encryptSecrets, decryptSecrets, generateEncryptionKey, testEncryption };
