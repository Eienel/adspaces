/**
 * 64-bit difference hash (dHash) for comparing banners to creatives. Server-only (uses sharp).
 * Robust to re-encoding/resizing, which X always does. See ADR-0005.
 */
import sharp from "sharp";

export async function dHash(image: Buffer | Uint8Array): Promise<string> {
  const { data } = await sharp(image)
    .flatten({ background: "#ffffff" })
    .grayscale()
    .resize(9, 8, { fit: "fill", kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * 9 + x]!;
      const right = data[y * 9 + x + 1]!;
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

export const DEFAULT_MATCH_THRESHOLD = 10;

export function isMatch(a: string, b: string, threshold = DEFAULT_MATCH_THRESHOLD): boolean {
  return hammingDistance(a, b) <= threshold;
}

export async function imageSize(image: Buffer | Uint8Array): Promise<{ width: number; height: number; format: string }> {
  const meta = await sharp(image).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format ?? "unknown" };
}
