import "server-only";
import { bookings, creatives, listings, users, verifications } from "@adspaces/db";
import { bookingRequestSchema, bookingTotal, transition, type BookingEvent } from "@adspaces/shared";
import { Keypair } from "@solana/web3.js";
import { aliasedTable, and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "./db";
import { PLATFORM_FEE_BPS } from "./env";
import { HttpError } from "./session";

const ACTIVE = ["accepted", "funded", "live", "disputed"] as const;

export async function requestBooking(advertiserId: string, raw: unknown) {
  const input = bookingRequestSchema.parse(raw);
  const [listing] = await db().select().from(listings).where(eq(listings.id, input.listingId));
  if (!listing || listing.status !== "active") throw new HttpError(404, "Listing not available");
  if (listing.sellerId === advertiserId) throw new HttpError(400, "You can't book your own banner");
  if (input.days < listing.minDays || input.days > listing.maxDays) {
    throw new HttpError(400, `Booking must be ${listing.minDays}–${listing.maxDays} days`);
  }
  if (listing.blockedCategories.includes(input.adCategory)) {
    throw new HttpError(400, `This seller doesn't accept ${input.adCategory} ads`);
  }
  const [creative] = await db()
    .select()
    .from(creatives)
    .where(and(eq(creatives.id, input.creativeId), eq(creatives.advertiserId, advertiserId)));
  if (!creative) throw new HttpError(400, "Upload a creative first");

  const [row] = await db()
    .insert(bookings)
    .values({
      listingId: listing.id,
      sellerId: listing.sellerId,
      advertiserId,
      creativeId: creative.id,
      adCategory: input.adCategory,
      days: input.days,
      startAt: input.startAt,
      amountUsdc: bookingTotal(listing.pricePerDayUsdc, input.days),
      feeBps: PLATFORM_FEE_BPS,
      status: "requested",
    })
    .returning();
  return row!;
}

type Action = "accept" | "decline" | "cancel" | "mark_live";

/** All user-driven booking changes. Authorization + state machine in one place. */
export async function actOnBooking(userId: string, bookingId: string, action: Action) {
  const [b] = await db().select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) throw new HttpError(404, "Booking not found");
  const isSeller = b.sellerId === userId;
  const isAdvertiser = b.advertiserId === userId;
  if (!isSeller && !isAdvertiser) throw new HttpError(404, "Booking not found");

  const apply = async (event: BookingEvent, extra: Partial<typeof bookings.$inferInsert> = {}) => {
    let next;
    try {
      next = transition(b.status, event);
    } catch {
      throw new HttpError(409, `Can't ${action} a ${b.status} booking`);
    }
    const [row] = await db()
      .update(bookings)
      .set({ status: next, ...extra })
      .where(and(eq(bookings.id, b.id), eq(bookings.status, b.status)))
      .returning();
    if (!row) throw new HttpError(409, "Booking changed, refresh and try again");
    return row;
  };

  switch (action) {
    case "accept": {
      if (!isSeller) throw new HttpError(403, "Only the seller can accept");
      const busy = await db()
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.sellerId, userId), inArray(bookings.status, [...ACTIVE])))
        .limit(1);
      if (busy.length) throw new HttpError(409, "You already have an active booking on your banner");
      // Solana Pay reference: a random public key only used to find the payment on-chain.
      return apply("accept", { paymentReference: Keypair.generate().publicKey.toBase58(), acceptedAt: new Date() });
    }
    case "decline":
      if (!isSeller) throw new HttpError(403, "Only the seller can decline");
      return apply("decline");
    case "cancel":
      if (!isAdvertiser) throw new HttpError(403, "Only the advertiser can cancel");
      return apply("cancel");
    case "mark_live": {
      if (!isSeller) throw new HttpError(403, "Only the seller can do this");
      if (b.status !== "funded" && b.status !== "live") throw new HttpError(409, "Booking isn't funded yet");
      // Ask the worker to check right away.
      const [row] = await db().update(bookings).set({ nextCheckAt: new Date() }).where(eq(bookings.id, b.id)).returning();
      return row!;
    }
  }
}

const sellers = aliasedTable(users, "sellers");
const advertisers = aliasedTable(users, "advertisers");

const bookingColumns = {
  booking: bookings,
  creative: { imageUrl: creatives.imageUrl },
  seller: { id: sellers.id, handle: sellers.handle, avatarUrl: sellers.avatarUrl, walletPubkey: sellers.walletPubkey },
  advertiser: { id: advertisers.id, handle: advertisers.handle, avatarUrl: advertisers.avatarUrl },
};

function bookingQuery() {
  return db()
    .select(bookingColumns)
    .from(bookings)
    .innerJoin(creatives, eq(creatives.id, bookings.creativeId))
    .innerJoin(sellers, eq(sellers.id, bookings.sellerId))
    .innerJoin(advertisers, eq(advertisers.id, bookings.advertiserId));
}

export async function getBookingForUser(userId: string, id: string) {
  const [row] = await bookingQuery().where(
    and(eq(bookings.id, id), or(eq(bookings.sellerId, userId), eq(bookings.advertiserId, userId))),
  );
  if (!row) return null;
  const checks = await db()
    .select()
    .from(verifications)
    .where(eq(verifications.bookingId, id))
    .orderBy(desc(verifications.checkedAt))
    .limit(50);
  return { ...row, checks };
}

export async function listMyBookings(userId: string) {
  return bookingQuery()
    .where(or(eq(bookings.sellerId, userId), eq(bookings.advertiserId, userId)))
    .orderBy(desc(bookings.createdAt))
    .limit(100);
}
