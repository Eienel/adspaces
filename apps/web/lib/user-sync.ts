import "server-only";
import { users } from "@adspaces/db";
import {
  estimateDailyProfileViews,
  getRecentPosts,
  maxPricePerDayMicro,
  signalsFromPosts,
  type XUser,
} from "@adspaces/shared";
import { db } from "./db";

/**
 * Upsert the AdSpaces user for an X profile at sign-in and refresh valuation signals (ADR-0007).
 * Recent posts are read with the user's own token; failures fall back to follower-only signals.
 */
export async function upsertUserFromX(profile: XUser, accessToken?: string): Promise<string> {
  let posts: Awaited<ReturnType<typeof getRecentPosts>> = [];
  if (accessToken) {
    try {
      posts = await getRecentPosts(accessToken, profile.id, 10);
    } catch (err) {
      console.warn("recent posts fetch failed", String(err));
    }
  }
  const signals = signalsFromPosts(profile, posts);
  const fields = {
    handle: profile.username,
    name: profile.name,
    avatarUrl: profile.profile_image_url ?? null,
    bannerUrl: profile.profile_banner_url ?? null,
    followersCount: signals.followers,
    verified: signals.verified,
    avgImpressions: signals.avgImpressions,
    engagementRateBps: Math.round(signals.engagementRate * 10_000),
    estDailyViews: estimateDailyProfileViews(signals),
    maxPricePerDayUsdc: maxPricePerDayMicro(signals),
    metricsSyncedAt: new Date(),
  };
  const [row] = await db()
    .insert(users)
    .values({ xId: profile.id, ...fields })
    .onConflictDoUpdate({ target: users.xId, set: fields })
    .returning({ id: users.id });
  return row!.id;
}
