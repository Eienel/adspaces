/** Postgres schema. Keep docs/03-data-model.md in sync. Money columns are integer micro-USDC. */
import { BOOKING_STATUSES, LAYOUT_IDS, SEGMENT_SHAPES } from "@adspaces/shared";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const money = (name: string) => bigint(name, { mode: "number" });
const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const bookingStatus = pgEnum("booking_status", BOOKING_STATUSES);
export const listingStatus = pgEnum("listing_status", ["active", "paused"]);
export const campaignStatus = pgEnum("campaign_status", ["open", "closed"]);
export const layoutEnum = pgEnum("banner_layout", LAYOUT_IDS);
export const shapeEnum = pgEnum("segment_shape", SEGMENT_SHAPES);
export const bookingOrigin = pgEnum("booking_origin", ["business_request", "creator_offer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** X user id. Null for businesses that signed in with a wallet only. Dev logins use "dev:<handle>". */
  xId: text("x_id").unique(),
  handle: text("handle"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  followersCount: integer("followers_count").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  walletPubkey: text("wallet_pubkey").unique(),
  /** Encrypted X OAuth refresh token (ADR-0013) for cheap owned-read banner checks. */
  xRefreshTokenEnc: text("x_refresh_token_enc"),
  // Business profile (ADR-0011)
  businessName: text("business_name"),
  businessUrl: text("business_url"),
  // Valuation (ADR-0007)
  avgImpressions: integer("avg_impressions").notNull().default(0),
  engagementRateBps: integer("engagement_rate_bps").notNull().default(0),
  reportedDailyViews: integer("reported_daily_views"),
  estDailyViews: integer("est_daily_views").notNull().default(0),
  maxPricePerDayUsdc: money("max_price_per_day_usdc").notNull().default(1_000_000),
  metricsSyncedAt: ts("metrics_synced_at"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A creator's banner (one per creator), split into segments. */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    layout: layoutEnum("layout").notNull().default("full"),
    /** Snapshot of the creator's own banner art, used for empty segments. */
    originalBannerUrl: text("original_banner_url"),
    showAvailableTag: boolean("show_available_tag").notNull().default(true),
    minWeeks: integer("min_weeks").notNull().default(1),
    maxWeeks: integer("max_weeks").notNull().default(4),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    blockedCategories: text("blocked_categories").array().notNull().default(sql`'{}'::text[]`),
    // Denormalized from active segments for fast browse/sort.
    minPricePerDayUsdc: money("min_price_per_day_usdc").notNull().default(0),
    shapes: text("shapes").array().notNull().default(sql`'{}'::text[]`),
    status: listingStatus("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("listings_seller_uq").on(t.sellerId),
    index("listings_status_price_idx").on(t.status, t.minPricePerDayUsdc),
    index("listings_status_created_idx").on(t.status, t.createdAt),
  ],
);

/** A bookable region of a banner. Old segments are deactivated (not deleted) when the layout changes. */
export const segments = pgTable(
  "segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    idx: integer("idx").notNull(),
    shape: shapeEnum("shape").notNull(),
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    w: integer("w").notNull(),
    h: integer("h").notNull(),
    pricePerDayUsdc: money("price_per_day_usdc").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("segments_listing_idx").on(t.listingId, t.active)],
);

export const creatives = pgTable("creatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertiserId: uuid("advertiser_id")
    .notNull()
    .references(() => users.id),
  shape: shapeEnum("shape").notNull(),
  imageUrl: text("image_url").notNull(),
  phash: text("phash").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: createdAt(),
});

/** An ad a business posts on the ad board (ADR-0011). Creators can offer segments to it. */
export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    brief: text("brief").notNull().default(""),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => creatives.id),
    shape: shapeEnum("shape").notNull(),
    adCategory: text("ad_category").notNull(),
    audience: text("audience").array().notNull().default(sql`'{}'::text[]`),
    maxPricePerDayUsdc: money("max_price_per_day_usdc").notNull(),
    weeks: integer("weeks").notNull(),
    status: campaignStatus("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("campaigns_status_created_idx").on(t.status, t.createdAt), index("campaigns_business_idx").on(t.businessId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => segments.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    advertiserId: uuid("advertiser_id")
      .notNull()
      .references(() => users.id),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => creatives.id),
    campaignId: uuid("campaign_id").references(() => adCampaigns.id),
    origin: bookingOrigin("origin").notNull(),
    adCategory: text("ad_category").notNull(),
    cycleStart: ts("cycle_start").notNull(),
    weeks: integer("weeks").notNull(),
    endAt: ts("end_at"),
    amountUsdc: money("amount_usdc").notNull(),
    feeBps: integer("fee_bps").notNull(),
    paymentReference: text("payment_reference").unique(),
    acceptedAt: ts("accepted_at"),
    fundingTx: text("funding_tx").unique(),
    payerWallet: text("payer_wallet"),
    fundedAt: ts("funded_at"),
    liveAt: ts("live_at"),
    approvedBannerUrl: text("approved_banner_url"),
    nextCheckAt: ts("next_check_at"),
    // Settlement is idempotent: we sign first, store the signature + expiry height, then send.
    settlementKind: text("settlement_kind"),
    settlementTx: text("settlement_tx"),
    settlementValidHeight: bigint("settlement_valid_height", { mode: "number" }),
    settledAt: ts("settled_at"),
    status: bookingStatus("status").notNull().default("requested"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bookings_status_next_check_idx").on(t.status, t.nextCheckAt),
    index("bookings_status_end_idx").on(t.status, t.endAt),
    index("bookings_segment_cycle_idx").on(t.segmentId, t.cycleStart),
    index("bookings_listing_cycle_idx").on(t.listingId, t.cycleStart),
    index("bookings_seller_idx").on(t.sellerId, t.createdAt),
    index("bookings_advertiser_idx").on(t.advertiserId, t.createdAt),
    index("bookings_campaign_idx").on(t.campaignId),
  ],
);

/** The combined banner image for one listing and one weekly cycle (ADR-0010). */
export const bannerCompositions = pgTable(
  "banner_compositions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    cycleStart: ts("cycle_start").notNull(),
    imageUrl: text("image_url").notNull(),
    /** sha256 of the PNG; equal to last week's → creator needn't change anything. */
    contentHash: text("content_hash").notNull(),
    /** segment id → region signature (see packages/shared/src/compose.ts). */
    segmentSignatures: jsonb("segment_signatures").$type<Record<string, string>>().notNull(),
    bookingIds: uuid("booking_ids").array().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("compositions_listing_cycle_uq").on(t.listingId, t.cycleStart)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    checkedAt: ts("checked_at").notNull().defaultNow(),
    observedBannerUrl: text("observed_banner_url"),
    hashDistance: integer("hash_distance"),
    pass: boolean("pass").notNull(),
    error: text("error"),
  },
  (t) => [index("verifications_booking_idx").on(t.bookingId, t.checkedAt)],
);

/** One-time nonces for wallet linking (user_id set) and wallet sign-in (pubkey set). */
export const walletChallenges = pgTable("wallet_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  pubkey: text("pubkey"),
  nonce: text("nonce").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
});

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Segment = typeof segments.$inferSelect;
export type Creative = typeof creatives.$inferSelect;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BannerComposition = typeof bannerCompositions.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
