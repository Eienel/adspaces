/** Refresh seller valuation signals (ADR-0007). Costs ~1 user read + ~10 post reads per seller per sync. */
import { listings, users } from "@adspaces/db";
import { estimateDailyProfileViews, getRecentPosts, getUsersByIds, maxPricePerDayMicro, signalsFromPosts } from "@adspaces/shared";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { JobContext } from "../context";

export async function syncSellerMetrics(ctx: JobContext, bearerToken: string, limit = 50): Promise<number> {
  const { db } = ctx;
  const stale = new Date(ctx.now().getTime() - ctx.config.metricsSyncDays * 24 * 60 * 60 * 1000);
  const sellers = await db
    .select({ id: users.id, xId: users.xId, reportedDailyViews: users.reportedDailyViews })
    .from(users)
    .innerJoin(listings, eq(listings.sellerId, users.id))
    .where(and(eq(listings.status, "active"), or(isNull(users.metricsSyncedAt), lt(users.metricsSyncedAt, stale))))
    .limit(limit);
  if (!sellers.length) return 0;

  const xUsers = new Map((await getUsersByIds(bearerToken, sellers.map((s) => s.xId))).map((u) => [u.id, u]));
  let n = 0;
  for (const s of sellers) {
    const xu = xUsers.get(s.xId);
    if (!xu) continue;
    try {
      const signals = signalsFromPosts(xu, await getRecentPosts(bearerToken, s.xId, 10));
      const withReported = { ...signals, reportedProfileVisitsPerDay: s.reportedDailyViews };
      await db
        .update(users)
        .set({
          handle: xu.username,
          name: xu.name,
          avatarUrl: xu.profile_image_url ?? null,
          bannerUrl: xu.profile_banner_url ?? null,
          followersCount: signals.followers,
          verified: signals.verified,
          avgImpressions: signals.avgImpressions,
          engagementRateBps: Math.round(signals.engagementRate * 10_000),
          estDailyViews: estimateDailyProfileViews(withReported),
          maxPricePerDayUsdc: maxPricePerDayMicro(withReported),
          metricsSyncedAt: ctx.now(),
        })
        .where(eq(users.id, s.id));
      n++;
    } catch (err) {
      ctx.log("metrics sync failed", { userId: s.id, err: String(err) });
    }
  }
  return n;
}
