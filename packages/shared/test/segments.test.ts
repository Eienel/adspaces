import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { composeBanner, regionSignature, signatureDistance, signaturesMatch } from "../src/compose";
import { decryptSecret, encryptSecret } from "../src/crypto";
import { coversCycle, cycleCutoff, cycleEnd, cycleStart, isBookable, rangesOverlap, upcomingCycles } from "../src/cycles";
import { AVATAR_ZONE, BANNER_H, BANNER_W, LAYOUT_IDS, checkSegmentPrices, intersects, layoutSegments, shapeForSize } from "../src/segments";

describe("segments", () => {
  it("every layout tiles the banner exactly", () => {
    for (const id of LAYOUT_IDS) {
      const segs = layoutSegments(id);
      expect(segs.reduce((s, x) => s + x.rect.w * x.rect.h, 0)).toBe(BANNER_W * BANNER_H);
      expect(segs.at(-1)!.rect.x + segs.at(-1)!.rect.w).toBe(BANNER_W);
      for (let i = 1; i < segs.length; i++) expect(intersects(segs[i - 1]!.rect, segs[i]!.rect)).toBe(false);
    }
    expect(layoutSegments("main_side").map((s) => s.shape)).toEqual(["two_thirds", "third"]);
  });
  it("detects shapes by aspect ratio", () => {
    expect(shapeForSize(1500, 500)).toBe("full");
    expect(shapeForSize(3000, 1000)).toBe("full");
    expect(shapeForSize(750, 500)).toBe("half");
    expect(shapeForSize(1000, 1000)).toBe("third");
    expect(shapeForSize(1000, 500)).toBe("two_thirds");
    expect(shapeForSize(900, 400)).toBeNull();
    expect(shapeForSize(150, 50)).toBeNull(); // too small
  });
  it("enforces the cap on the sum of segment prices", () => {
    expect(checkSegmentPrices([2_000_000, 3_000_000], 5_000_000)).toBeNull();
    expect(checkSegmentPrices([2_000_000, 3_000_001], 5_000_000)).toMatch(/cap/);
    expect(checkSegmentPrices([0, 1], 5_000_000)).toMatch(/above 0/);
  });
  it("flags the avatar zone on the left segment only", () => {
    const [left, mid] = layoutSegments("thirds");
    expect(intersects(left!.rect, AVATAR_ZONE)).toBe(true);
    expect(intersects(mid!.rect, AVATAR_ZONE)).toBe(false);
  });
});

describe("cycles", () => {
  const wed = new Date("2026-11-04T15:00:00Z"); // Wednesday
  it("finds Monday 00:00 UTC", () => {
    expect(cycleStart(wed).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(cycleStart(new Date("2026-11-02T00:00:00Z")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(cycleStart(new Date("2026-11-08T23:59:59Z")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });
  it("cutoff is Saturday 12:00 UTC before the cycle", () => {
    expect(cycleCutoff(new Date("2026-11-09T00:00:00Z")).toISOString()).toBe("2026-11-07T12:00:00.000Z");
  });
  it("lists bookable cycles", () => {
    const [first, second] = upcomingCycles(wed, 2);
    expect(first!.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(second!.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    const satAfternoon = new Date("2026-11-07T13:00:00Z");
    expect(upcomingCycles(satAfternoon, 1)[0]!.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(isBookable(new Date("2026-11-09T00:00:00Z"), satAfternoon)).toBe(false);
    expect(isBookable(new Date("2026-11-10T00:00:00Z"), wed)).toBe(false); // not a Monday
  });
  it("overlap and coverage", () => {
    const a = new Date("2026-11-09T00:00:00Z");
    const b = new Date("2026-11-16T00:00:00Z");
    expect(rangesOverlap(a, 1, b, 1)).toBe(false);
    expect(rangesOverlap(a, 2, b, 1)).toBe(true);
    expect(coversCycle(a, 2, b)).toBe(true);
    expect(coversCycle(a, 1, b)).toBe(false);
    expect(cycleEnd(a, 2).toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });
});

async function art(seed: number, w: number, h: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="hsl(${seed * 67},70%,45%)"/>
    <circle cx="${w * (0.2 + (seed % 5) * 0.15)}" cy="${h / 2}" r="${h / 3}" fill="white"/>
    <rect x="${w * (0.75 - (seed % 3) * 0.2)}" y="${h * 0.1}" width="${w / 6}" height="${h * 0.8}" fill="black"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("composite banners", () => {
  it("each segment's signature survives X-style re-encoding, and swapping one segment fails only that one", async () => {
    const segs = layoutSegments("thirds");
    const base = await art(9, 1500, 500);
    const ads = [await art(1, 500, 500), null, await art(3, 500, 500)];
    const composite = await composeBanner({ base, showTag: true, segments: segs.map((s, i) => ({ rect: s.rect, creative: ads[i] ?? null })) });
    const expected = await Promise.all(segs.map((s) => regionSignature(composite, s.rect)));

    const asOnX = await sharp(composite).resize(1500, 500).jpeg({ quality: 70 }).toBuffer();
    for (const [i, s] of segs.entries()) {
      expect(signaturesMatch(await regionSignature(asOnX, s.rect), expected[i]!), `segment ${i}`).toBe(true);
    }

    // Creator replaces the right-hand ad with something else.
    const other = await art(6, 500, 500);
    const tampered = await composeBanner({
      base,
      showTag: true,
      segments: segs.map((s, i) => ({ rect: s.rect, creative: i === 2 ? other : (ads[i] ?? null) })),
    });
    const results = await Promise.all(segs.map(async (s, i) => signaturesMatch(await regionSignature(tampered, s.rect), expected[i]!)));
    expect(results).toEqual([true, true, false]);
  });

  it("flat colours of different hue don't match", async () => {
    const red = await sharp({ create: { width: 1500, height: 500, channels: 3, background: "#e11" } }).png().toBuffer();
    const blue = await sharp({ create: { width: 1500, height: 500, channels: 3, background: "#11e" } }).png().toBuffer();
    const rect = { x: 0, y: 0, w: 1500, h: 500 };
    const d = signatureDistance(await regionSignature(red, rect), await regionSignature(blue, rect));
    expect(d.hamming).toBe(0); // dHash alone can't tell them apart…
    expect(d.color).toBeGreaterThan(100); // …colour can.
  });
});

describe("secret encryption", () => {
  it("round-trips and rejects tampering", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const blob = encryptSecret("refresh-token-123", key);
    expect(decryptSecret(blob, key)).toBe("refresh-token-123");
    const parts = blob.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecret(parts.join(":"), key)).toThrow();
  });
});
