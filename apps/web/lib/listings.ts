import "server-only";
import { listings, users } from "@adspaces/db";
import { listingInputSchema, usdcToMicro, type ListingQuery } from "@adspaces/shared";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { cacheKey, cached, invalidate } from "./cache";
import { db } from "./db";
import { HttpError } from "./session";

export const PAGE_SIZE = 24;

const listingColumns = {
  id: listings.id,
  title: listings.title,
  description: listings.description,
  pricePerDayUsdc: listings.pricePerDayUsdc,
  minDays: listings.minDays,
  maxDays: listings.maxDays,
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

export type ListingView = Awaited<ReturnType<typeof getListing>> & {};

export async function searchListings(q: ListingQuery) {
  const key = await cacheKey("listings", JSON.stringify(q));
  return cached(key, 30, async () => {
    const where: SQL[] = [eq(listings.status, "active")];
    if (q.q) {
      const pat = `%${q.q.replace(/[%_]/g, "")}%`;
      where.push(or(ilike(listings.title, pat), ilike(users.handle, pat), ilike(users.name, pat))!);
    }
    if (q.category) where.push(sql`${q.category} = any(${listings.categories})`);
    if (q.minFollowers) where.push(gte(users.followersCount, q.minFollowers));
    if (q.maxPriceUsdc) where.push(lte(listings.pricePerDayUsdc, usdcToMicro(q.maxPriceUsdc)));
    const order = {
      newest: desc(listings.createdAt),
      price_asc: asc(listings.pricePerDayUsdc),
      price_desc: desc(listings.pricePerDayUsdc),
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

export async function getListing(id: string) {
  const [row] = await db()
    .select(listingColumns)
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.id, id));
  return row ?? null;
}

export async function getListingBySeller(sellerId: string) {
  const [row] = await db().select().from(listings).where(eq(listings.sellerId, sellerId));
  return row ?? null;
}

/** Create or update the caller's single listing, enforcing the valuation price cap (ADR-0007). */
export async function upsertMyListing(userId: string, raw: unknown) {
  const input = listingInputSchema.parse(raw);
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, "Unknown user");
  if (!user.walletPubkey) throw new HttpError(400, "Link a Solana wallet first so you can get paid");
  const price = usdcToMicro(input.pricePerDayUsdc);
  if (price <= 0) throw new HttpError(400, "Price must be greater than 0");
  if (price > user.maxPricePerDayUsdc) {
    throw new HttpError(400, `Price exceeds your profile's cap of ${(user.maxPricePerDayUsdc / 1e6).toFixed(2)} USDC/day`);
  }
  const values = {
    title: input.title,
    description: input.description,
    pricePerDayUsdc: price,
    minDays: input.minDays,
    maxDays: input.maxDays,
    categories: input.categories,
    blockedCategories: input.blockedCategories,
  };
  const [row] = await db()
    .insert(listings)
    .values({ sellerId: userId, ...values })
    .onConflictDoUpdate({ target: listings.sellerId, set: values })
    .returning();
  await invalidate("listings");
  return row!;
}

export async function setMyListingStatus(userId: string, status: "active" | "paused") {
  await db().update(listings).set({ status }).where(eq(listings.sellerId, userId));
  await invalidate("listings");
}
