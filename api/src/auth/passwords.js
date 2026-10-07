import crypto from "node:crypto";

const SCRYPT_VERSION = "1";
const SCRYPT_KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 1024;

function scrypt(password, salt, keyLength) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function isPasswordHash(value) {
  return typeof value === "string" && value.startsWith(`scrypt$${SCRYPT_VERSION}$`);
}

export async function hashPassword(password) {
  const input = String(password || "");
  if (input.length > MAX_PASSWORD_LENGTH) {
    throw new Error("Password is too long.");
  }

  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(input, salt, SCRYPT_KEY_LENGTH);
  return [
    "scrypt",
    SCRYPT_VERSION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, storedPassword) {
  const input = String(password || "");
  const stored = String(storedPassword || "");
  if (input.length > MAX_PASSWORD_LENGTH) return false;

  if (isPasswordHash(stored)) {
    try {
      const [, version, encodedSalt, encodedHash] = stored.split("$");
      if (version !== SCRYPT_VERSION || !encodedSalt || !encodedHash) return false;
      const salt = Buffer.from(encodedSalt, "base64url");
      const expected = Buffer.from(encodedHash, "base64url");
      if (!salt.length || !expected.length) return false;
      const actual = await scrypt(input, salt, expected.length);
      return crypto.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // Backward compatibility for existing EB Chemical records. New credentials
  // are always hashed; this branch can be removed after a controlled migration.
  const actual = Buffer.from(input);
  const expected = Buffer.from(stored);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
