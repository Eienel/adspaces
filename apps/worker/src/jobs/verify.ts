/** Per-segment banner verification (ADR-0005, ADR-0010, docs/05-verification.md). */
import { bannerCompositions, bookings, segments, users, verifications } from "@adspaces/db";
import { bannerImageUrl, cycleEnd, cycleStart, transition } from "@adspaces/shared";
import { regionSignature, signatureDistance, signaturesMatch } from "@adspaces/shared/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { nextCheckAt, type JobContext } from "../context";

const CLAIM_MS = 10 * 60 * 1000;

export async function verifyBanners(ctx: JobContext, limit = 300): Promise<number> {
  const { db } = ctx;
  const now = ctx.now();

  // Claim due bookings by pushing next_check_at forward so concurrent workers skip them.
  const claimed = await db
    .update(bookings)
    .set({ nextCheckAt: new Date(now.getTime() + CLAIM_MS) })
    .where(
      inArray(
        bookings.id,
        sql`(select id from bookings where status in ('funded','live') and next_check_at <= ${now.toISOString()}::timestamptz
             order by next_check_at limit ${limit} for update skip locked)`,
      ),
    )
    .returning({ id: bookings.id });
  if (!claimed.length) return 0;

  const current = cycleStart(now);
  const rows = await db
    .select({ booking: bookings, sellerXId: users.xId, segment: segments, composition: bannerCompositions })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.sellerId))
    .innerJoin(segments, eq(segments.id, bookings.segmentId))
    .leftJoin(bannerCompositions, and(eq(bannerCompositions.listingId, bookings.listingId), eq(bannerCompositions.cycleStart, current)))
    .where(inArray(bookings.id, claimed.map((c) => c.id)));

  // Not started yet → come back at the cycle start without spending an API call.
  const due = [];
  for (const r of rows) {
    if (now < r.booking.cycleStart) {
      await db.update(bookings).set({ nextCheckAt: r.booking.cycleStart }).where(eq(bookings.id, r.booking.id));
    } else due.push(r);
  }
  if (!due.length) return 0;

  let banners = new Map<string, string | null>();
  let apiError: string | null = null;
  try {
    banners = await ctx.banners.getBanners([...new Set(due.map((r) => r.sellerXId).filter((x): x is string => !!x))]);
  } catch (err) {
    apiError = `banner lookup failed: ${String(err)}`;
  }

  const images = new Map<string, Promise<Uint8Array>>();
  const load = (url: string) => {
    if (!images.has(url)) images.set(url, ctx.loadImage(bannerImageUrl(url)));
    return images.get(url)!;
  };

  for (const { booking: b, sellerXId, segment: s, composition } of due) {
    let pass = false;
    let distance: number | null = null;
    let error: string | null = apiError;
    const observed = apiError || !sellerXId ? undefined : banners.get(sellerXId);
    const expected = composition?.segmentSignatures[s.id];

    if (!error && !expected) {
      error = "no composite banner for this cycle";
    } else if (!error) {
      if (observed === undefined || observed === null) {
        pass = false; // no banner, or creator suspended/protected/missing → failed check
      } else if (observed === b.approvedBannerUrl) {
        pass = true;
        distance = 0;
      } else {
        try {
          const sig = await regionSignature(await load(observed), { x: s.x, y: s.y, w: s.w, h: s.h });
          distance = signatureDistance(sig, expected!).hamming;
          pass = signaturesMatch(sig, expected!);
        } catch (err) {
          error = `image fetch/hash failed: ${String(err)}`;
        }
      }
    }

    await db.insert(verifications).values({ bookingId: b.id, checkedAt: now, observedBannerUrl: observed ?? null, hashDistance: distance, pass, error });

    if (b.status === "funded") {
      if (pass) {
        await db
          .update(bookings)
          .set({
            status: transition("funded", "go_live"),
            liveAt: now,
            endAt: cycleEnd(b.cycleStart, b.weeks),
            approvedBannerUrl: observed!,
            nextCheckAt: nextCheckAt(ctx),
          })
          .where(and(eq(bookings.id, b.id), eq(bookings.status, "funded")));
        ctx.log("booking live", { bookingId: b.id });
      } else {
        await db.update(bookings).set({ nextCheckAt: new Date(now.getTime() + ctx.config.fundedRecheckMs) }).where(eq(bookings.id, b.id));
      }
    } else {
      const next = nextCheckAt(ctx);
      await db
        .update(bookings)
        .set({ nextCheckAt: b.endAt && next >= b.endAt ? null : next, ...(pass && observed ? { approvedBannerUrl: observed } : {}) })
        .where(eq(bookings.id, b.id));
    }
  }
  return due.length;
}
