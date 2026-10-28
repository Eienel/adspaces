/**
 * Image storage shared by web + worker. Server-only.
 * Vercel Blob when BLOB_READ_WRITE_TOKEN is set (required on Vercel); otherwise a local dir served by
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

export async function storeImage(name: string, data: Uint8Array, prefix = "images"): Promise<string> {
  if (!SAFE_NAME.test(name)) throw new Error(`Unsafe file name ${name}`);
  const contentType = contentTypeFor(name)!;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${prefix}/${name}`, Buffer.from(data), { access: "public", contentType });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is required on Vercel");
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
