import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getRawKey(): Buffer {
  const value = process.env.FILEBRIDGE_KMS_KEY;
  if (!value) {
    throw new Error("FILEBRIDGE_KMS_KEY is not set");
  }
  return parseKeyMaterial(value);
}

export function parseKeyMaterial(value: string): Buffer {
  const trimmed = value.trim();
  const hex = trimmed.length === KEY_LENGTH * 2 && /^[0-9a-fA-F]+$/.test(trimmed);
  const key = hex ? Buffer.from(trimmed, "hex") : Buffer.from(trimmed, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("FILEBRIDGE_KMS_KEY must be 32 bytes (64 hex chars or base64)");
  }
  return key;
}

export function encryptSecret(plaintext: string, key = getRawKey()): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string, key = getRawKey()): string {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid secret payload");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
