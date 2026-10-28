import "server-only";
import { bannerCompositions, bookings, listings, segments, users } from "@adspaces/db";
import {
  bannerImageUrl,
  checkSegmentPrices,
  coversCycle,
  layoutSegments,
  listingInputSchema,
  upcomingCycles,
  usdcToMicro,
  type ListingQuery,
} from "@adspaces/shared";
import { loadImage, storeImage } from "@adspaces/shared/server";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { cacheKey, cached, invalidate } from "./cache";
import { db } from "./db";
import { HttpError } from "./session";

export const PAGE_SIZE = 24;
/** Statuses that hold a segment for their weeks. */
export const HOLDING = ["accepted", "funded", "live", "disputed"] as const;
const OPEN = ["requested", ...HOLDING] as const;

const listingColumns = {
  id: listings.id,
  title: listings.title,
  description: listings.description,
  layout: listings.layout,
  originalBannerUrl: listings.originalBannerUrl,
  minWeeks: listings.minWeeks,
  maxWeeks: listings.maxWeeks,
  minPricePerDayUsdc: listings.minPricePerDayUsdc,
  shapes: listings.shapes,
  categories: listings.categories,
  blockedCategories: listings.blockedCategories,
  status: listings.status,
  createdAt: listings.createdAt,
  seller: {
    id: users.id,
    handle: users.handle,
    name: users.name,
    avatarUrl: users.avatarUrl,
    bannerUrl: users.bannerUrl,
    followersCount: users.followersCount,
    verified: users.verified,
    estDailyViews: users.estDailyViews,
  },
};

export async function searchListings(q: ListingQuery) {
  const key = await cacheKey("listings", JSON.stringify(q));
  return cached(key, 30, async () => {
    const where: SQL[] = [eq(listings.status, "active")];
    if (q.q) {
      const pat = `%${q.q.replace(/[%_]/g, "")}%`;
      where.push(or(ilike(listings.title, pat), ilike(users.handle, pat), ilike(users.name, pat))!);
    }
    if (q.category) where.push(sql`${q.category} = any(${listings.categories})`);
    if (q.shape) where.push(sql`${q.shape} = any(${listings.shapes})`);
    if (q.minFollowers) where.push(gte(users.followersCount, q.minFollowers));
    if (q.maxPriceUsdc) where.push(lte(listings.minPricePerDayUsdc, usdcToMicro(q.maxPriceUsdc)));
    const order = {
      newest: desc(listings.createdAt),
      price_asc: asc(listings.minPricePerDayUsdc),
      price_desc: desc(listings.minPricePerDayUsdc),
      followers_desc: desc(users.followersCount),
    }[q.sort];
    const rows = await db()
      .select(listingColumns)
      .from(listings)
      .innerJoin(users, eq(users.id, listings.sellerId))
      .where(and(...where))
      .orderBy(order, desc(listings.id))
      .limit(PAGE_SIZE + 1)
      .offset((q.page - 1) * PAGE_SIZE);
    return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
  });
}
export type ListingCardData = Awaited<ReturnType<typeof searchListings>>["items"][number];

export async function getListing(id: string) {
  const [row] = await db().select(listingColumns).from(listings).innerJoin(users, eq(users.id, listings.sellerId)).where(eq(listings.id, id));
  if (!row) return null;
  return { ...row, segments: await activeSegments(row.id) };
}

export async function getListingBySeller(sellerId: string) {
  const [row] = await db().select().from(listings).where(eq(listings.sellerId, sellerId));
  if (!row) return null;
  return { ...row, segments: await activeSegments(row.id) };
}

export function activeSegments(listingId: string) {
  return db().select().from(segments).where(and(eq(segments.listingId, listingId), eq(segments.active, true))).orderBy(segments.idx);
}

/** segmentId → list of upcoming cycle ISO strings that are already held by a booking. */
export async function segmentAvailability(listingId: string, weeksAhead = 8) {
  const cycles = upcomingCycles(new Date(), weeksAhead);
  const held = await db()
    .select({ segmentId: bookings.segmentId, cycleStart: bookings.cycleStart, weeks: bookings.weeks })
    .from(bookings)
    .where(and(eq(bookings.listingId, listingId), inArray(bookings.status, [...HOLDING])));
  const taken = new Map<string, Set<string>>();
  for (const h of held) {
    for (const c of cycles) {
      if (coversCycle(h.cycleStart, h.weeks, c)) {
        if (!taken.has(h.segmentId)) taken.set(h.segmentId, new Set());
        taken.get(h.segmentId)!.add(c.toISOString());
      }
    }
  }
  return { cycles, taken };
}

/** Download the creator's current banner (public image, no API cost) as the base art for empty segments. */
async function snapshotBanner(bannerUrl: string | null): Promise<string | null> {
  if (!bannerUrl) return null;
  try {
    const png = await sharp(await loadImage(bannerImageUrl(bannerUrl))).resize(1500, 500, { fit: "cover" }).png().toBuffer();
    return await storeImage(`${randomUUID()}.png`, png, "banners");
  } catch (err) {
    console.warn("banner snapshot failed", String(err));
    return null;
  }
}

/** Create or update the caller's banner listing + segments, enforcing the valuation cap (ADR-0007, ADR-0010). */
export async function upsertMyListing(userId: string, raw: unknown) {
  const input = listingInputSchema.parse(raw);
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, "Unknown user");
  if (!user.xId) throw new HttpError(400, "Sign in with X to list your banner");
  if (!user.walletPubkey) throw new HttpError(400, "Link a Solana wallet first so you can get paid");
  const layout = layoutSegments(input.layout);
  if (input.segmentPrices.length !== layout.length) throw new HttpError(400, `This layout has ${layout.length} segments`);
  const prices = input.segmentPrices.map(usdcToMicro);
  const priceError = checkSegmentPrices(prices, user.maxPricePerDayUsdc);
  if (priceError) throw new HttpError(400, `${priceError} of $${(user.maxPricePerDayUsdc / 1e6).toFixed(2)}/day`);

  const fields = {
    title: input.title,
    description: input.description,
    layout: input.layout,
    minWeeks: input.minWeeks,
    maxWeeks: input.maxWeeks,
    categories: input.categories,
    blockedCategories: input.blockedCategories,
    showAvailableTag: input.showAvailableTag,
    minPricePerDayUsdc: Math.min(...prices),
    shapes: [...new Set(layout.map((s) => s.shape))],
  };
  const existing = await getListingBySeller(userId);
  const original = existing?.originalBannerUrl ?? (await snapshotBanner(user.bannerUrl));

  const row = await db().transaction(async (tx) => {
    let listingId = existing?.id;
    if (!listingId) {
      const [created] = await tx.insert(listings).values({ sellerId: userId, originalBannerUrl: original, ...fields }).returning();
      listingId = created!.id;
    } else {
      await tx.update(listings).set({ ...fields, originalBannerUrl: original }).where(eq(listings.id, listingId));
    }
    const layoutChanged = !existing || existing.layout !== input.layout || existing.segments.length !== layout.length;
    if (layoutChanged) {
      if (existing) {
        const open = await tx.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.listingId, listingId), inArray(bookings.status, [...OPEN]))).limit(1);
        if (open.length) throw new HttpError(409, "You have open bookings. Change the layout after they finish.");
        await tx.update(segments).set({ active: false }).where(eq(segments.listingId, listingId));
      }
      await tx.insert(segments).values(layout.map((s, i) => ({ listingId: listingId!, idx: s.idx, shape: s.shape, ...s.rect, pricePerDayUsdc: prices[i]! })));
    } else {
      for (const [i, s] of existing.segments.entries()) {
        await tx.update(segments).set({ pricePerDayUsdc: prices[i]! }).where(eq(segments.id, s.id));
      }
    }
    return { id: listingId };
  });
  await invalidate("listings");
  return row;
}

export async function setMyListingStatus(userId: string, status: "active" | "paused") {
  await db().update(listings).set({ status }).where(eq(listings.sellerId, userId));
  await invalidate("listings");
}

export async function replaceBaseArt(userId: string, file: unknown) {
  if (!(file instanceof File)) throw new HttpError(400, "Attach an image file");
  const listing = await getListingBySeller(userId);
  if (!listing) throw new HttpError(400, "Create your listing first");
  const png = await sharp(Buffer.from(await file.arrayBuffer())).resize(1500, 500, { fit: "cover" }).png().toBuffer().catch(() => {
    throw new HttpError(400, "That file isn't a valid image");
  });
  const url = await storeImage(`${randomUUID()}.png`, png, "banners");
  await db().update(listings).set({ originalBannerUrl: url }).where(eq(listings.id, listing.id));
  return { originalBannerUrl: url };
}

/** The composite banner for a listing's current and next cycle (for the creator dashboard). */
export async function compositionsFor(listingId: string) {
  return db().select().from(bannerCompositions).where(eq(bannerCompositions.listingId, listingId)).orderBy(desc(bannerCompositions.cycleStart)).limit(2);
}
