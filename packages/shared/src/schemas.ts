/** Shared zod schemas for API input validation (used by web API routes and forms). */
import { z } from "zod";

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

export const listingInputSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().max(1000).default(""),
    pricePerDayUsdc: usdcAmountString,
    minDays: z.coerce.number().int().min(1).max(365),
    maxDays: z.coerce.number().int().min(1).max(365),
    categories: z.array(categorySchema).max(5).default([]),
    blockedCategories: z.array(categorySchema).default([]),
  })
  .refine((v) => v.maxDays >= v.minDays, { message: "maxDays must be ≥ minDays", path: ["maxDays"] });
export type ListingInput = z.infer<typeof listingInputSchema>;

export const listingQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: categorySchema.optional(),
  minFollowers: z.coerce.number().int().min(0).optional(),
  maxPriceUsdc: usdcAmountString.optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "followers_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const bookingRequestSchema = z.object({
  listingId: z.string().uuid(),
  creativeId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365),
  startAt: z.coerce.date(),
  adCategory: categorySchema,
});
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingActionSchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "mark_live"]),
});

/** Required creative dimensions (X header is 1500x500, 3:1). */
export const CREATIVE_WIDTH = 1500;
export const CREATIVE_HEIGHT = 500;
export const CREATIVE_MAX_BYTES = 2 * 1024 * 1024;
