/**
 * Weekly cycle job (ADR-0010). At each cycle's cutoff (Saturday 12:00 UTC):
 *  1. cancel bookings for that cycle that are still unpaid (requested/accepted),
 *  2. build one composite banner per listing from all funded/live bookings covering the cycle.
 * Idempotent: compositions are unique per (listing, cycle).
 */
import { bannerCompositions, bookings, creatives, listings, segments } from "@adspaces/db";
import { WEEK_MS, cycleCutoff, cycleStart, transition } from "@adspaces/shared";
import { composeBanner, regionSignature } from "@adspaces/shared/server";
import { and, desc, eq, inArray, lt, lte, notExists, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import type { JobContext } from "../context";

const covers = (c: Date) =>
  and(lte(bookings.cycleStart, c), sql`${bookings.cycleStart} + ${bookings.weeks} * interval '7 days' > ${c.toISOString()}::timestamptz`);

export async function runCycle(ctx: JobContext): Promise<number> {
  const now = ctx.now();
  const current = cycleStart(now);
  let composed = 0;
  for (const c of [current, new Date(current.getTime() + WEEK_MS)]) {
    if (now < cycleCutoff(c)) continue;
    await cancelUnpaid(ctx, c);
    composed += await composeCycle(ctx, c);
  }
  return composed;
}

async function cancelUnpaid(ctx: JobContext, c: Date) {
  for (const status of ["requested", "accepted"] as const) {
    const rows = await ctx.db
      .update(bookings)
      .set({ status: transition(status, "cancel") })
      .where(and(eq(bookings.status, status), lte(bookings.cycleStart, c)))
      .returning({ id: bookings.id });
    if (rows.length) ctx.log("cancelled unpaid bookings at cutoff", { status, count: rows.length, cycle: c.toISOString() });
  }
}

async function composeCycle(ctx: JobContext, c: Date): Promise<number> {
  const { db } = ctx;
  const due = await db
    .selectDistinct({ listingId: bookings.listingId })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["funded", "live"]),
        covers(c),
        notExists(
          db
            .select({ one: sql`1` })
            .from(bannerCompositions)
            .where(and(eq(bannerCompositions.listingId, bookings.listingId), eq(bannerCompositions.cycleStart, c))),
        ),
      ),
    );

  let n = 0;
  for (const { listingId } of due) {
    try {
      const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
      const segs = await db.select().from(segments).where(and(eq(segments.listingId, listingId), eq(segments.active, true))).orderBy(segments.idx);
      const running = await db
        .select({ booking: bookings, creativeUrl: creatives.imageUrl })
        .from(bookings)
        .innerJoin(creatives, eq(creatives.id, bookings.creativeId))
        .where(and(eq(bookings.listingId, listingId), inArray(bookings.status, ["funded", "live"]), covers(c)));

      const fills = await Promise.all(
        segs.map(async (s) => {
          const b = running.find((r) => r.booking.segmentId === s.id);
          return { segment: s, rect: { x: s.x, y: s.y, w: s.w, h: s.h }, creative: b ? await ctx.loadImage(b.creativeUrl) : null };
        }),
      );
      const base = listing!.originalBannerUrl ? await ctx.loadImage(listing!.originalBannerUrl).catch(() => null) : null;
      const png = await composeBanner({ base, showTag: listing!.showAvailableTag, segments: fills });
      const signatures = Object.fromEntries(await Promise.all(fills.map(async (f) => [f.segment.id, await regionSignature(png, f.rect)] as const)));
      const contentHash = createHash("sha256").update(png).digest("hex");

      // Same image as last week → reuse its URL so the creator sees "no change needed".
      const [prev] = await db
        .select()
        .from(bannerCompositions)
        .where(and(eq(bannerCompositions.listingId, listingId), lt(bannerCompositions.cycleStart, c)))
        .orderBy(desc(bannerCompositions.cycleStart))
        .limit(1);
      const imageUrl = prev?.contentHash === contentHash ? prev.imageUrl : await ctx.storeImage(`${randomUUID()}.png`, png);

      const inserted = await db
        .insert(bannerCompositions)
        .values({ listingId, cycleStart: c, imageUrl, contentHash, segmentSignatures: signatures, bookingIds: running.map((r) => r.booking.id) })
        .onConflictDoNothing()
        .returning({ id: bannerCompositions.id });
      if (inserted.length) {
        n++;
        ctx.log("composed banner", { listingId, cycle: c.toISOString(), ads: running.length, unchanged: prev?.contentHash === contentHash });
      }
    } catch (err) {
      ctx.log("compose failed", { listingId, err: String(err) });
    }
  }
  return n;
}
