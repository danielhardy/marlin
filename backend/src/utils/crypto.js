// ./utils/crypto.js
import crypto from "crypto";
import dotenv from "dotenv";

// Set environment variable;
dotenv.config({ path: `./.env.${process.env.NODE_ENV || "development"}` });

const ENCRYPTION_KEY = Buffer.from(
  process.env.PLAID_TOKEN_ENCRYPTION_KEY,
  "base64"
); // 32 bytes
const IV_LENGTH = 12; // For AES-GCM

/**
 * Encrypts a given string using AES-256-GCM.
 *
 * @param {string} text - The plaintext string to encrypt.
 * @returns {Promise<string>} A promise that resolves with the encrypted string
 * formatted as "iv:authTag:encryptedData" in base64.
 */
export async function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  return (
    iv.toString("base64") + ":" + authTag.toString("base64") + ":" + encrypted
  );
}

/**
 * Decrypts a string encrypted with AES-256-GCM using the corresponding key and IV.
 *
 * @param {string} encrypted - The encrypted string formatted as "iv:authTag:encryptedData" in base64.
 * @returns {Promise<string>} A promise that resolves with the decrypted plaintext string.
 */
export async function decrypt(encrypted) {
  const [ivB64, tagB64, data] = encrypted.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
