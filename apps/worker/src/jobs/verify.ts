/** Banner verification (ADR-0005, docs/05-verification.md). */
import { bookings, creatives, users, verifications } from "@adspaces/db";
import { bannerImageUrl, transition } from "@adspaces/shared";
import { dHash, hammingDistance } from "@adspaces/shared/phash";
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

  const rows = await db
    .select({ booking: bookings, sellerXId: users.xId, creativeHash: creatives.phash })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.sellerId))
    .innerJoin(creatives, eq(creatives.id, bookings.creativeId))
    .where(
      inArray(
        bookings.id,
        claimed.map((c) => c.id),
      ),
    );

  let banners: Map<string, string | null>;
  let apiError: string | null = null;
  try {
    banners = await ctx.banners.getBanners([...new Set(rows.map((r) => r.sellerXId))]);
  } catch (err) {
    banners = new Map();
    apiError = `banner lookup failed: ${String(err)}`;
  }

  const hashCache = new Map<string, string>();
  for (const { booking: b, sellerXId, creativeHash } of rows) {
    let pass = false;
    let distance: number | null = null;
    let error: string | null = apiError;
    const observed = apiError ? undefined : banners.get(sellerXId);

    if (!apiError) {
      if (observed === undefined) {
        // User missing from the response: suspended, deleted or protected → counts as a failed check.
        error = null;
      } else if (observed === null) {
        pass = false;
      } else if (observed === b.approvedBannerUrl) {
        pass = true;
        distance = 0;
      } else {
        try {
          let hash = hashCache.get(observed);
          if (!hash) {
            hash = await dHash(await ctx.fetchImage(bannerImageUrl(observed)));
            hashCache.set(observed, hash);
          }
          distance = hammingDistance(hash, creativeHash);
          pass = distance <= ctx.config.phashThreshold;
        } catch (err) {
          error = `image fetch/hash failed: ${String(err)}`;
        }
      }
    }

    await db.insert(verifications).values({
      bookingId: b.id,
      checkedAt: now,
      observedBannerUrl: observed ?? null,
      hashDistance: distance,
      pass,
      error,
    });

    if (b.status === "funded") {
      if (pass) {
        const endAt = new Date(now.getTime() + b.days * 24 * 60 * 60 * 1000);
        await db
          .update(bookings)
          .set({
            status: transition("funded", "go_live"),
            liveAt: now,
            endAt,
            approvedBannerUrl: observed!,
            nextCheckAt: nextCheckAt(ctx),
          })
          .where(and(eq(bookings.id, b.id), eq(bookings.status, "funded")));
        ctx.log("booking live", { bookingId: b.id });
      } else {
        await db
          .update(bookings)
          .set({ nextCheckAt: new Date(now.getTime() + ctx.config.fundedRecheckMs) })
          .where(eq(bookings.id, b.id));
      }
    } else {
      const next = nextCheckAt(ctx);
      await db
        .update(bookings)
        .set({
          nextCheckAt: b.endAt && next >= b.endAt ? null : next,
          ...(pass && observed ? { approvedBannerUrl: observed } : {}),
        })
        .where(eq(bookings.id, b.id));
    }
  }
  return rows.length;
}
