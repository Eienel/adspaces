import "server-only";
import { put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Local fallback for dev/self-hosting. On Vercel the filesystem is read-only, so Blob is required there. */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? ".uploads");
const SAFE_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp)$/;

/** Store an uploaded creative and return its public URL. */
export async function storeImage(name: string, data: Buffer, contentType: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`creatives/${name}`, data, { access: "public", contentType });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is required on Vercel");
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return `/api/uploads/${name}`;
}

export async function readLocalImage(name: string): Promise<Buffer | null> {
  if (!SAFE_NAME.test(name)) return null;
  return readFile(path.join(UPLOAD_DIR, name)).catch(() => null);
}
