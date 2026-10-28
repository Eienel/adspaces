/** AES-256-GCM for secrets at rest (X refresh tokens, ADR-0013). Server-only. Key: 32 bytes, base64. */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(b64: string): Buffer {
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENC_KEY must be 32 bytes, base64 (openssl rand -base64 32)");
  return k;
}

export function encryptSecret(plain: string, keyB64: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(keyB64), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(blob: string, keyB64: string): string {
  const [v, iv, tag, ct] = blob.split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unknown secret format");
  const d = createDecipheriv("aes-256-gcm", key(keyB64), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}
