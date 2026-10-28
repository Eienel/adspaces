/**
 * Image storage shared by web + worker. Server-only.
 * Vercel Blob when connected (BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID; required on Vercel); otherwise a local dir served by
 * the web app at /api/uploads/<name> (dev / self-hosting). Both apps must use the same UPLOAD_DIR.
 */
import { put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? path.join(tmpdir(), "adspaces-uploads"));
}

const SAFE_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp)$/;
const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export function contentTypeFor(name: string): string | undefined {
  return TYPES[name.split(".").pop() ?? ""];
}

/**
 * Vercel Blob is configured either with a read-write token (classic) or, for newer stores, BLOB_STORE_ID +
 * Vercel's OIDC token (set automatically on Vercel; @vercel/blob picks it up).
 */
export function blobConfigured(env = process.env): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID);
}

export async function storeImage(name: string, data: Uint8Array, prefix = "images"): Promise<string> {
  if (!SAFE_NAME.test(name)) throw new Error(`Unsafe file name ${name}`);
  const contentType = contentTypeFor(name)!;
  if (blobConfigured()) {
    const blob = await put(`${prefix}/${name}`, Buffer.from(data), { access: "public", contentType });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("Vercel Blob isn't connected (need BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)");
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), data);
  return `/api/uploads/${name}`;
}

export async function readLocalImage(name: string): Promise<Buffer | null> {
  if (!SAFE_NAME.test(name)) return null;
  return readFile(path.join(uploadDir(), name)).catch(() => null);
}

/** Load image bytes from a stored URL (absolute, or relative /api/uploads/... read from disk). */
export async function loadImage(url: string): Promise<Uint8Array> {
  if (url.startsWith("/api/uploads/")) {
    const local = await readLocalImage(url.slice("/api/uploads/".length));
    if (!local) throw new Error(`Missing local image ${url}`);
    return local;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}
