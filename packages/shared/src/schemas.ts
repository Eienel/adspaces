/** Shared zod schemas for API input validation (used by web API routes and forms). */
import { z } from "zod";
import { isCycleStart } from "./cycles";
import { LAYOUT_IDS, SEGMENT_SHAPES } from "./segments";

export const CATEGORIES = [
  "crypto",
  "defi",
  "nft",
  "gaming",
  "ai",
  "tech",
  "finance",
  "lifestyle",
  "sports",
  "music",
  "gambling",
  "adult",
  "politics",
  "other",
] as const;
export const categorySchema = z.enum(CATEGORIES);

/** Decimal string with up to 6 decimals, e.g. "25" or "12.50". */
export const usdcAmountString = z.string().trim().regex(/^\d+(\.\d{1,6})?$/, "Enter an amount like 25 or 12.50");

export const layoutSchema = z.enum(LAYOUT_IDS);
export const shapeSchema = z.enum(SEGMENT_SHAPES);

export const listingInputSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().max(1000).default(""),
    layout: layoutSchema,
    /** One USDC/day price per segment, left to right. */
    segmentPrices: z.array(usdcAmountString).min(1).max(3),
    minWeeks: z.coerce.number().int().min(1).max(52),
    maxWeeks: z.coerce.number().int().min(1).max(52),
    categories: z.array(categorySchema).max(5).default([]),
    blockedCategories: z.array(categorySchema).default([]),
    showAvailableTag: z.boolean().default(true),
  })
  .refine((v) => v.maxWeeks >= v.minWeeks, { message: "maxWeeks must be ≥ minWeeks", path: ["maxWeeks"] });
export type ListingInput = z.infer<typeof listingInputSchema>;

export const listingQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: categorySchema.optional(),
  shape: shapeSchema.optional(),
  minFollowers: z.coerce.number().int().min(0).optional(),
  maxPriceUsdc: usdcAmountString.optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "followers_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

const cycleDate = z.coerce.date().refine(isCycleStart, "Bookings start on a Monday 00:00 UTC");

/** Business books a creator's segment (origin business_request). */
export const bookingRequestSchema = z.object({
  segmentId: z.string().uuid(),
  creativeId: z.string().uuid(),
  cycleStart: cycleDate,
  weeks: z.coerce.number().int().min(1).max(52),
  adCategory: categorySchema,
  campaignId: z.string().uuid().optional(),
});
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

/** Creator offers one of their segments to an open ad (origin creator_offer). */
export const offerSchema = z.object({
  campaignId: z.string().uuid(),
  segmentId: z.string().uuid(),
  cycleStart: cycleDate,
});

export const campaignInputSchema = z.object({
  title: z.string().trim().min(3).max(80),
  brief: z.string().trim().max(1000).default(""),
  creativeId: z.string().uuid(),
  adCategory: categorySchema,
  audience: z.array(categorySchema).max(5).default([]),
  maxPricePerDayUsdc: usdcAmountString,
  weeks: z.coerce.number().int().min(1).max(52),
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const campaignQuerySchema = z.object({
  shape: shapeSchema.optional(),
  category: categorySchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export const bookingActionSchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "mark_live"]),
});

export const CREATIVE_MAX_BYTES = 5 * 1024 * 1024;
