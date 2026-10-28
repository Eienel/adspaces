CREATE TYPE "public"."booking_origin" AS ENUM('business_request', 'creator_offer');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('requested', 'accepted', 'funded', 'live', 'completed', 'refunded', 'disputed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."banner_layout" AS ENUM('full', 'halves', 'thirds', 'main_side', 'side_main');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."segment_shape" AS ENUM('full', 'half', 'third', 'two_thirds');--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"creative_id" uuid NOT NULL,
	"shape" "segment_shape" NOT NULL,
	"ad_category" text NOT NULL,
	"audience" text[] DEFAULT '{}'::text[] NOT NULL,
	"max_price_per_day_usdc" bigint NOT NULL,
	"weeks" integer NOT NULL,
	"status" "campaign_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banner_compositions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"cycle_start" timestamp with time zone NOT NULL,
	"image_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"segment_signatures" jsonb NOT NULL,
	"booking_ids" uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"creative_id" uuid NOT NULL,
	"campaign_id" uuid,
	"origin" "booking_origin" NOT NULL,
	"ad_category" text NOT NULL,
	"cycle_start" timestamp with time zone NOT NULL,
	"weeks" integer NOT NULL,
	"end_at" timestamp with time zone,
	"amount_usdc" bigint NOT NULL,
	"fee_bps" integer NOT NULL,
	"payment_reference" text,
	"accepted_at" timestamp with time zone,
	"funding_tx" text,
	"payer_wallet" text,
	"funded_at" timestamp with time zone,
	"live_at" timestamp with time zone,
	"approved_banner_url" text,
	"next_check_at" timestamp with time zone,
	"settlement_kind" text,
	"settlement_tx" text,
	"settlement_valid_height" bigint,
	"settled_at" timestamp with time zone,
	"status" "booking_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_payment_reference_unique" UNIQUE("payment_reference"),
	CONSTRAINT "bookings_funding_tx_unique" UNIQUE("funding_tx")
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"shape" "segment_shape" NOT NULL,
	"image_url" text NOT NULL,
	"phash" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"layout" "banner_layout" DEFAULT 'full' NOT NULL,
	"original_banner_url" text,
	"show_available_tag" boolean DEFAULT true NOT NULL,
	"min_weeks" integer DEFAULT 1 NOT NULL,
	"max_weeks" integer DEFAULT 4 NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"blocked_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_price_per_day_usdc" bigint DEFAULT 0 NOT NULL,
	"shapes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"shape" "segment_shape" NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"w" integer NOT NULL,
	"h" integer NOT NULL,
	"price_per_day_usdc" bigint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"x_id" text,
	"handle" text,
	"name" text NOT NULL,
	"avatar_url" text,
	"banner_url" text,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"wallet_pubkey" text,
	"x_refresh_token_enc" text,
	"business_name" text,
	"business_url" text,
	"avg_impressions" integer DEFAULT 0 NOT NULL,
	"engagement_rate_bps" integer DEFAULT 0 NOT NULL,
	"reported_daily_views" integer,
	"est_daily_views" integer DEFAULT 0 NOT NULL,
	"max_price_per_day_usdc" bigint DEFAULT 1000000 NOT NULL,
	"metrics_synced_at" timestamp with time zone,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_x_id_unique" UNIQUE("x_id"),
	CONSTRAINT "users_wallet_pubkey_unique" UNIQUE("wallet_pubkey")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"observed_banner_url" text,
	"hash_distance" integer,
	"pass" boolean NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "wallet_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"pubkey" text,
	"nonce" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "wallet_challenges_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_business_id_users_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_compositions" ADD CONSTRAINT "banner_compositions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_challenges" ADD CONSTRAINT "wallet_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_status_created_idx" ON "ad_campaigns" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "campaigns_business_idx" ON "ad_campaigns" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "compositions_listing_cycle_uq" ON "banner_compositions" USING btree ("listing_id","cycle_start");--> statement-breakpoint
CREATE INDEX "bookings_status_next_check_idx" ON "bookings" USING btree ("status","next_check_at");--> statement-breakpoint
CREATE INDEX "bookings_status_end_idx" ON "bookings" USING btree ("status","end_at");--> statement-breakpoint
CREATE INDEX "bookings_segment_cycle_idx" ON "bookings" USING btree ("segment_id","cycle_start");--> statement-breakpoint
CREATE INDEX "bookings_listing_cycle_idx" ON "bookings" USING btree ("listing_id","cycle_start");--> statement-breakpoint
CREATE INDEX "bookings_seller_idx" ON "bookings" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_advertiser_idx" ON "bookings" USING btree ("advertiser_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_campaign_idx" ON "bookings" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_seller_uq" ON "listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listings_status_price_idx" ON "listings" USING btree ("status","min_price_per_day_usdc");--> statement-breakpoint
CREATE INDEX "listings_status_created_idx" ON "listings" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "segments_listing_idx" ON "segments" USING btree ("listing_id","active");--> statement-breakpoint
CREATE INDEX "verifications_booking_idx" ON "verifications" USING btree ("booking_id","checked_at");