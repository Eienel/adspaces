/** Banner segments (ADR-0010). One X banner (1500x500) can hold several ads, laid out by the creator. */
export const BANNER_W = 1500;
export const BANNER_H = 500;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SEGMENT_SHAPES = ["full", "half", "third", "two_thirds"] as const;
export type SegmentShape = (typeof SEGMENT_SHAPES)[number];

/** Exact creative size (px) for each shape. */
export const SHAPE_SIZE: Record<SegmentShape, { w: number; h: number }> = {
  full: { w: 1500, h: 500 },
  half: { w: 750, h: 500 },
  third: { w: 500, h: 500 },
  two_thirds: { w: 1000, h: 500 },
};

export const SHAPE_LABEL: Record<SegmentShape, string> = {
  full: "Full banner (1500×500)",
  half: "Half (750×500)",
  third: "Third (500×500)",
  two_thirds: "Two-thirds (1000×500)",
};

export const LAYOUT_IDS = ["full", "halves", "thirds", "main_side", "side_main"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const LAYOUT_LABEL: Record<LayoutId, string> = {
  full: "1 ad — whole banner",
  halves: "2 ads — halves",
  thirds: "3 ads — thirds",
  main_side: "2 ads — big left, small right",
  side_main: "2 ads — small left, big right",
};

const LAYOUT_SHAPES: Record<LayoutId, SegmentShape[]> = {
  full: ["full"],
  halves: ["half", "half"],
  thirds: ["third", "third", "third"],
  main_side: ["two_thirds", "third"],
  side_main: ["third", "two_thirds"],
};

export interface LayoutSegment {
  idx: number;
  shape: SegmentShape;
  rect: Rect;
}

/** Segments of a layout, left to right, tiling the banner exactly. */
export function layoutSegments(layout: LayoutId): LayoutSegment[] {
  let x = 0;
  return LAYOUT_SHAPES[layout].map((shape, idx) => {
    const { w, h } = SHAPE_SIZE[shape];
    const seg = { idx, shape, rect: { x, y: 0, w, h } };
    x += w;
    return seg;
  });
}

/**
 * Approximate area of the banner covered by the profile picture on X (bottom-left).
 * Heuristic; tune with real screenshots. Shown as a warning in the editor.
 */
export const AVATAR_ZONE: Rect = { x: 40, y: 330, w: 300, h: 170 };

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Which shape an uploaded image fits (aspect ratio within 2%), or null. */
export function shapeForSize(width: number, height: number): SegmentShape | null {
  if (!width || !height) return null;
  const ratio = width / height;
  for (const s of SEGMENT_SHAPES) {
    const target = SHAPE_SIZE[s].w / SHAPE_SIZE[s].h;
    if (Math.abs(ratio - target) / target <= 0.02 && width >= SHAPE_SIZE[s].w * 0.5) return s;
  }
  return null;
}

/** All segment prices > 0 and their sum within the creator's valuation cap (ADR-0007/0010). */
export function checkSegmentPrices(pricesMicro: number[], capMicro: number): string | null {
  if (pricesMicro.some((p) => !Number.isSafeInteger(p) || p <= 0)) return "Every segment needs a price above 0";
  const total = pricesMicro.reduce((a, b) => a + b, 0);
  if (total > capMicro) return `Segment prices add up to more than your cap`;
  return null;
}
