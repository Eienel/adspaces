import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { dHash, hammingDistance, isMatch } from "../src/phash";

/** Synthetic 1500x500 banner: diagonal gradient + some shapes, distinct per seed. */
async function banner(seed: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="hsl(${seed * 67},80%,30%)"/><stop offset="1" stop-color="hsl(${seed * 67 + 120},80%,70%)"/></linearGradient></defs>
    <rect width="1500" height="500" fill="url(#g)"/>
    <circle cx="${300 + seed * 150}" cy="250" r="180" fill="white"/>
    <rect x="${1100 - seed * 120}" y="80" width="250" height="340" fill="black"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("dHash", () => {
  it("matches the same image after X-style re-encoding and resizing", async () => {
    const original = await banner(1);
    const reencoded = await sharp(original).resize(600, 200).jpeg({ quality: 60 }).toBuffer();
    const [a, b] = await Promise.all([dHash(original), dHash(reencoded)]);
    expect(isMatch(a, b)).toBe(true);
  });
  it("does not match a different image", async () => {
    const [a, b] = await Promise.all([dHash(await banner(1)), dHash(await banner(4))]);
    expect(hammingDistance(a, b)).toBeGreaterThan(10);
  });
  it("hamming distance basics", () => {
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });
});
