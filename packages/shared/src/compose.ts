/**
 * Composite banners + per-segment signatures (ADR-0010). Server-only (sharp).
 * A region signature = 64-bit dHash (structure) + mean RGB (colour), so flat-colour ads can't match each other.
 */
import sharp, { type OverlayOptions, type Sharp } from "sharp";
import { dHash, hammingDistance } from "./phash";
import { BANNER_H, BANNER_W, SHAPE_SIZE, type Rect, type SegmentShape } from "./segments";

export interface SegmentFill {
  rect: Rect;
  /** Ad creative for this segment, or null for an empty segment. */
  creative: Uint8Array | null;
}

export interface ComposeInput {
  /** Creator's original banner art (any size; cropped to 1500x500). */
  base: Uint8Array | null;
  segments: SegmentFill[];
  /** Draw an "Advertise here" tag on empty segments. */
  showTag: boolean;
  tagText?: string;
}

async function normalizeBanner(img: Uint8Array): Promise<Sharp> {
  return sharp(img).flatten({ background: "#000000" }).resize(BANNER_W, BANNER_H, { fit: "cover" });
}

function tagSvg(rect: Rect, text: string): Buffer {
  const w = Math.min(rect.w - 24, 12 + text.length * 9);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34">
      <rect width="${w}" height="34" rx="17" fill="#000" fill-opacity="0.65"/>
      <text x="${w / 2}" y="22" font-family="sans-serif" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${text}</text>
    </svg>`,
  );
}

/** Build the 1500x500 PNG the creator sets as their X banner. */
export async function composeBanner(input: ComposeInput): Promise<Buffer> {
  const base = input.base
    ? await (await normalizeBanner(input.base)).png().toBuffer()
    : await sharp({ create: { width: BANNER_W, height: BANNER_H, channels: 3, background: "#1d2033" } }).png().toBuffer();

  const layers: OverlayOptions[] = [];
  for (const s of input.segments) {
    if (s.creative) {
      const img = await sharp(s.creative).flatten({ background: "#000" }).resize(s.rect.w, s.rect.h, { fit: "cover" }).png().toBuffer();
      layers.push({ input: img, left: s.rect.x, top: s.rect.y });
    } else if (input.showTag) {
      const text = input.tagText ?? "Ad space available · adspaces";
      const svg = tagSvg(s.rect, text);
      const meta = await sharp(svg).metadata();
      layers.push({ input: svg, left: s.rect.x + s.rect.w - (meta.width ?? 0) - 12, top: s.rect.y + 16 });
    }
  }
  return sharp(base).composite(layers).png().toBuffer();
}

/** Resize an uploaded creative to the exact pixel size of its shape. */
export async function normalizeCreative(img: Uint8Array, shape: SegmentShape): Promise<Buffer> {
  const { w, h } = SHAPE_SIZE[shape];
  return sharp(img).flatten({ background: "#000" }).resize(w, h, { fit: "cover" }).png().toBuffer();
}

/** Signature of one region of a banner (banner is first normalized to 1500x500). Format: 16 hex dHash + 6 hex RGB. */
export async function regionSignature(banner: Uint8Array, rect: Rect): Promise<string> {
  const region = await (await normalizeBanner(banner)).extract({ left: rect.x, top: rect.y, width: rect.w, height: rect.h }).png().toBuffer();
  const [hash, stats] = await Promise.all([dHash(region), sharp(region).stats()]);
  const rgb = stats.channels
    .slice(0, 3)
    .map((c) => Math.round(c.mean).toString(16).padStart(2, "0"))
    .join("");
  return hash + rgb;
}

export async function regionSignatures(banner: Uint8Array, rects: Rect[]): Promise<string[]> {
  return Promise.all(rects.map((r) => regionSignature(banner, r)));
}

export const SIGNATURE_DEFAULTS = { maxHamming: 10, maxColorDistance: 40 };

export function signatureDistance(a: string, b: string): { hamming: number; color: number } {
  const hamming = hammingDistance(a.slice(0, 16), b.slice(0, 16));
  const ca = [0, 2, 4].map((i) => parseInt(a.slice(16 + i, 18 + i), 16));
  const cb = [0, 2, 4].map((i) => parseInt(b.slice(16 + i, 18 + i), 16));
  const color = Math.sqrt(ca.reduce((s, v, i) => s + (v - cb[i]!) ** 2, 0));
  return { hamming, color };
}

export function signaturesMatch(a: string, b: string, cfg = SIGNATURE_DEFAULTS): boolean {
  const d = signatureDistance(a, b);
  return d.hamming <= cfg.maxHamming && d.color <= cfg.maxColorDistance;
}
