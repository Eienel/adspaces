/** Postgres schema. Keep docs/03-data-model.md in sync. Money columns are integer micro-USDC. */
import { BOOKING_STATUSES } from "@adspaces/shared";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const money = (name: string) => bigint(name, { mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const bookingStatus = pgEnum("booking_status", BOOKING_STATUSES);
export const listingStatus = pgEnum("listing_status", ["active", "paused"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  xId: text("x_id").notNull().unique(),
  handle: text("handle").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  followersCount: integer("followers_count").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  walletPubkey: text("wallet_pubkey").unique(),
  // Valuation (ADR-0007)
  avgImpressions: integer("avg_impressions").notNull().default(0),
  engagementRateBps: integer("engagement_rate_bps").notNull().default(0),
  reportedDailyViews: integer("reported_daily_views"),
  estDailyViews: integer("est_daily_views").notNull().default(0),
  maxPricePerDayUsdc: money("max_price_per_day_usdc").notNull().default(1_000_000),
  metricsSyncedAt: timestamp("metrics_synced_at", { withTimezone: true }),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    pricePerDayUsdc: money("price_per_day_usdc").notNull(),
    minDays: integer("min_days").notNull().default(1),
    maxDays: integer("max_days").notNull().default(30),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    blockedCategories: text("blocked_categories").array().notNull().default(sql`'{}'::text[]`),
    status: listingStatus("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // One listing per seller: a profile has one banner.
    uniqueIndex("listings_seller_uq").on(t.sellerId),
    index("listings_status_price_idx").on(t.status, t.pricePerDayUsdc),
    index("listings_status_created_idx").on(t.status, t.createdAt),
  ],
);

export const creatives = pgTable("creatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertiserId: uuid("advertiser_id")
    .notNull()
    .references(() => users.id),
  imageUrl: text("image_url").notNull(),
  phash: text("phash").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: createdAt(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    adCategory: text("ad_category").notNull(),
    days: integer("days").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    amountUsdc: money("amount_usdc").notNull(),
    feeBps: integer("fee_bps").notNull(),
    paymentReference: text("payment_reference").unique(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    fundingTx: text("funding_tx").unique(),
    payerWallet: text("payer_wallet"),
    fundedAt: timestamp("funded_at", { withTimezone: true }),
    liveAt: timestamp("live_at", { withTimezone: true }),
    approvedBannerUrl: text("approved_banner_url"),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    // Settlement is idempotent: we sign first, store the signature + expiry height, then send.
    settlementKind: text("settlement_kind"),
    settlementTx: text("settlement_tx"),
    settlementValidHeight: bigint("settlement_valid_height", { mode: "number" }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    status: bookingStatus("status").notNull().default("requested"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bookings_status_next_check_idx").on(t.status, t.nextCheckAt),
    index("bookings_status_end_idx").on(t.status, t.endAt),
    index("bookings_seller_idx").on(t.sellerId, t.createdAt),
    index("bookings_advertiser_idx").on(t.advertiserId, t.createdAt),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    observedBannerUrl: text("observed_banner_url"),
    hashDistance: integer("hash_distance"),
    pass: boolean("pass").notNull(),
    error: text("error"),
  },
  (t) => [index("verifications_booking_idx").on(t.bookingId, t.checkedAt)],
);

export const walletChallenges = pgTable("wallet_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  nonce: text("nonce").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Creative = typeof creatives.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
