import "server-only";
import { adCampaigns, bannerCompositions, bookings, creatives, listings, segments, users, verifications } from "@adspaces/db";
import {
  bookingRequestSchema,
  bookingTotal,
  cycleStart,
  feeBpsForAmount,
  isBookable,
  offerSchema,
  rangesOverlap,
  transition,
  type BookingEvent,
} from "@adspaces/shared";
import { Keypair } from "@solana/web3.js";
import { aliasedTable, and, desc, eq, inArray, lte, ne, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { MAX_BOOKING_MICRO, MAX_BOOKING_USDC } from "./env";
import { HOLDING } from "./listings";
import { HttpError } from "./session";

/** Price a booking: tiered fee (ADR-0014) and the beta cap (ADR-0015). */
function priceBooking(pricePerDayMicro: number, weeks: number) {
  const amountUsdc = bookingTotal(pricePerDayMicro, 7 * weeks);
  if (amountUsdc > MAX_BOOKING_MICRO) {
    throw new HttpError(400, `During the beta, bookings are capped at $${MAX_BOOKING_USDC.toLocaleString("en-US")}. Try fewer weeks.`);
  }
  return { amountUsdc, feeBps: feeBpsForAmount(amountUsdc) };
}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/** Throws if the segment is already held for any of these weeks. */
async function assertFree(q: Tx | ReturnType<typeof db>, segmentId: string, start: Date, weeks: number, exceptId?: string) {
  const held = await q
    .select({ cycleStart: bookings.cycleStart, weeks: bookings.weeks })
    .from(bookings)
    .where(and(eq(bookings.segmentId, segmentId), inArray(bookings.status, [...HOLDING]), exceptId ? ne(bookings.id, exceptId) : undefined));
  if (held.some((h) => rangesOverlap(h.cycleStart, h.weeks, start, weeks))) {
    throw new HttpError(409, "That segment is already booked for some of those weeks");
  }
}

async function loadSegment(segmentId: string) {
  const [row] = await db()
    .select({ segment: segments, listing: listings })
    .from(segments)
    .innerJoin(listings, eq(listings.id, segments.listingId))
    .where(eq(segments.id, segmentId));
  if (!row || !row.segment.active || row.listing.status !== "active") throw new HttpError(404, "Segment not available");
  return row;
}

/** A business books a creator's segment (origin business_request). The creator then accepts. */
export async function requestBooking(advertiserId: string, raw: unknown) {
  const input = bookingRequestSchema.parse(raw);
  const { segment, listing } = await loadSegment(input.segmentId);
  if (listing.sellerId === advertiserId) throw new HttpError(400, "You can't book your own banner");
  if (input.weeks < listing.minWeeks || input.weeks > listing.maxWeeks) {
    throw new HttpError(400, `This creator takes bookings of ${listing.minWeeks}–${listing.maxWeeks} weeks`);
  }
  if (!isBookable(input.cycleStart, new Date())) throw new HttpError(400, "Booking for that week has closed (cutoff is Saturday 12:00 UTC)");
  if (listing.blockedCategories.includes(input.adCategory)) throw new HttpError(400, `This creator doesn't accept ${input.adCategory} ads`);
  const [creative] = await db().select().from(creatives).where(and(eq(creatives.id, input.creativeId), eq(creatives.advertiserId, advertiserId)));
  if (!creative) throw new HttpError(400, "Upload your ad image first");
  if (creative.shape !== segment.shape) throw new HttpError(400, `This segment needs a ${segment.shape.replace("_", "-")} image`);
  if (input.campaignId) {
    const [c] = await db().select({ id: adCampaigns.id }).from(adCampaigns).where(and(eq(adCampaigns.id, input.campaignId), eq(adCampaigns.businessId, advertiserId)));
    if (!c) throw new HttpError(400, "Unknown ad");
  }
  const price = priceBooking(segment.pricePerDayUsdc, input.weeks);
  await assertFree(db(), segment.id, input.cycleStart, input.weeks);

  const [row] = await db()
    .insert(bookings)
    .values({
      segmentId: segment.id,
      listingId: listing.id,
      sellerId: listing.sellerId,
      advertiserId,
      creativeId: creative.id,
      campaignId: input.campaignId ?? null,
      origin: "business_request",
      adCategory: input.adCategory,
      cycleStart: input.cycleStart,
      weeks: input.weeks,
      ...price,
    })
    .returning();
  return row!;
}

/** A creator offers one of their segments to an open ad (origin creator_offer). The business then accepts. */
export async function offerToCampaign(sellerId: string, raw: unknown) {
  const input = offerSchema.parse(raw);
  const [campaign] = await db().select().from(adCampaigns).where(eq(adCampaigns.id, input.campaignId));
  if (!campaign || campaign.status !== "open") throw new HttpError(404, "This ad isn't open any more");
  if (campaign.businessId === sellerId) throw new HttpError(400, "That's your own ad");
  const { segment, listing } = await loadSegment(input.segmentId);
  if (listing.sellerId !== sellerId) throw new HttpError(403, "That isn't your segment");
  if (segment.shape !== campaign.shape) throw new HttpError(400, `This ad needs a ${campaign.shape.replace("_", "-")} segment`);
  if (segment.pricePerDayUsdc > campaign.maxPricePerDayUsdc) throw new HttpError(400, "Your segment price is above this ad's budget");
  if (listing.blockedCategories.includes(campaign.adCategory)) throw new HttpError(400, "You've blocked this ad category on your banner");
  if (!isBookable(input.cycleStart, new Date())) throw new HttpError(400, "Booking for that week has closed (cutoff is Saturday 12:00 UTC)");
  const dup = await db()
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.campaignId, campaign.id), eq(bookings.segmentId, segment.id), eq(bookings.status, "requested")));
  if (dup.length) throw new HttpError(409, "You've already offered this segment to this ad");
  const price = priceBooking(segment.pricePerDayUsdc, campaign.weeks);
  await assertFree(db(), segment.id, input.cycleStart, campaign.weeks);

  const [row] = await db()
    .insert(bookings)
    .values({
      segmentId: segment.id,
      listingId: listing.id,
      sellerId,
      advertiserId: campaign.businessId,
      creativeId: campaign.creativeId,
      campaignId: campaign.id,
      origin: "creator_offer",
      adCategory: campaign.adCategory,
      cycleStart: input.cycleStart,
      weeks: campaign.weeks,
      ...price,
    })
    .returning();
  return row!;
}

type Action = "accept" | "decline" | "cancel" | "mark_live" | "dev_fund";

/** All user-driven booking changes. The proposer's counterparty accepts/declines; status changes go through transition(). */
export async function actOnBooking(userId: string, bookingId: string, action: Action) {
  const [b] = await db().select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b || (b.sellerId !== userId && b.advertiserId !== userId)) throw new HttpError(404, "Booking not found");
  const proposer = b.origin === "business_request" ? b.advertiserId : b.sellerId;
  const counterparty = proposer === b.sellerId ? b.advertiserId : b.sellerId;

  const next = (event: BookingEvent) => {
    try {
      return transition(b.status, event);
    } catch {
      throw new HttpError(409, `Can't ${action.replace("_", " ")} a ${b.status} booking`);
    }
  };
  const save = async (q: Tx | ReturnType<typeof db>, set: Partial<typeof bookings.$inferInsert>) => {
    const [row] = await q.update(bookings).set(set).where(and(eq(bookings.id, b.id), eq(bookings.status, b.status))).returning();
    if (!row) throw new HttpError(409, "Booking changed, refresh and try again");
    return row;
  };

  switch (action) {
    case "accept": {
      if (userId !== counterparty) throw new HttpError(403, "Waiting for the other side to accept");
      const status = next("accept");
      if (!isBookable(b.cycleStart, new Date())) throw new HttpError(409, "Too late for that week (cutoff is Saturday 12:00 UTC)");
      return db().transaction(async (tx) => {
        // Lock the segment so two accepts for the same weeks can't both succeed.
        await tx.select({ id: segments.id }).from(segments).where(eq(segments.id, b.segmentId)).for("update");
        await assertFree(tx, b.segmentId, b.cycleStart, b.weeks, b.id);
        // Solana Pay reference: a random public key only used to find the payment on-chain.
        return save(tx, { status, paymentReference: Keypair.generate().publicKey.toBase58(), acceptedAt: new Date() });
      });
    }
    case "decline":
      if (userId !== counterparty) throw new HttpError(403, "Only the other side can decline");
      return save(db(), { status: next("decline") });
    case "cancel":
      if (b.status === "requested" && userId !== proposer) throw new HttpError(403, "Decline it instead");
      if (b.status === "accepted" && userId !== b.advertiserId) throw new HttpError(403, "Only the business can cancel before paying");
      return save(db(), { status: next("cancel") });
    case "mark_live": {
      if (userId !== b.sellerId) throw new HttpError(403, "Only the creator can do this");
      if (b.status !== "funded" && b.status !== "live") throw new HttpError(409, "Booking isn't paid yet");
      if (new Date() < b.cycleStart) throw new HttpError(409, "Your banner week hasn't started yet (Monday 00:00 UTC)");
      // Check every running ad on this banner right away.
      await db()
        .update(bookings)
        .set({ nextCheckAt: new Date() })
        .where(and(eq(bookings.listingId, b.listingId), inArray(bookings.status, ["funded", "live"]), lte(bookings.cycleStart, new Date())));
      return b;
    }
    case "dev_fund": {
      // $0 dev mode only (route is guarded): pretend the business paid.
      if (userId !== b.advertiserId) throw new HttpError(403, "Only the business pays");
      const [payer] = await db().select({ wallet: users.walletPubkey }).from(users).where(eq(users.id, userId));
      const now = new Date();
      return save(db(), {
        status: next("fund"),
        fundingTx: `dev-fund-${randomUUID()}`,
        payerWallet: payer?.wallet ?? "dev-payer",
        fundedAt: now,
        nextCheckAt: b.cycleStart > now ? b.cycleStart : now,
      });
    }
  }
}

const sellers = aliasedTable(users, "sellers");
const advertisers = aliasedTable(users, "advertisers");
const party = (t: typeof users) => ({ id: t.id, handle: t.handle, name: t.name, businessName: t.businessName, walletPubkey: t.walletPubkey, avatarUrl: t.avatarUrl });

function bookingQuery() {
  return db()
    .select({
      booking: bookings,
      creative: { imageUrl: creatives.imageUrl, shape: creatives.shape },
      segment: { idx: segments.idx, shape: segments.shape, x: segments.x, y: segments.y, w: segments.w, h: segments.h },
      listing: { id: listings.id, layout: listings.layout, originalBannerUrl: listings.originalBannerUrl },
      campaign: { id: adCampaigns.id, title: adCampaigns.title },
      seller: party(sellers),
      advertiser: party(advertisers),
    })
    .from(bookings)
    .innerJoin(creatives, eq(creatives.id, bookings.creativeId))
    .innerJoin(segments, eq(segments.id, bookings.segmentId))
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .leftJoin(adCampaigns, eq(adCampaigns.id, bookings.campaignId))
    .innerJoin(sellers, eq(sellers.id, bookings.sellerId))
    .innerJoin(advertisers, eq(advertisers.id, bookings.advertiserId));
}
export type BookingRow = Awaited<ReturnType<ReturnType<typeof bookingQuery>["where"]>>[number];

export async function getBookingForUser(userId: string, id: string) {
  const [row] = await bookingQuery().where(and(eq(bookings.id, id), or(eq(bookings.sellerId, userId), eq(bookings.advertiserId, userId))));
  if (!row) return null;
  const [checks, [composition]] = await Promise.all([
    db().select().from(verifications).where(eq(verifications.bookingId, id)).orderBy(desc(verifications.checkedAt)).limit(50),
    db()
      .select()
      .from(bannerCompositions)
      .where(and(eq(bannerCompositions.listingId, row.listing.id), eq(bannerCompositions.cycleStart, cycleStart(new Date()) > row.booking.cycleStart ? cycleStart(new Date()) : row.booking.cycleStart))),
  ]);
  return { ...row, checks, composition: composition ?? null };
}

export async function listMyBookings(userId: string) {
  return bookingQuery()
    .where(or(eq(bookings.sellerId, userId), eq(bookings.advertiserId, userId)))
    .orderBy(desc(bookings.createdAt))
    .limit(200);
}
