import "server-only";
import { users } from "@adspaces/db";
import {
  estimateDailyProfileViews,
  getRecentPosts,
  maxPricePerDayMicro,
  signalsFromPosts,
  type ProfileSignals,
  type XUser,
} from "@adspaces/shared";
import { encryptSecret } from "@adspaces/shared/server";
import { db } from "./db";
import { TOKEN_ENC_KEY } from "./env";

function valuationFields(signals: ProfileSignals) {
  return {
    followersCount: signals.followers,
    verified: signals.verified,
    avgImpressions: signals.avgImpressions,
    engagementRateBps: Math.round(signals.engagementRate * 10_000),
    estDailyViews: estimateDailyProfileViews(signals),
    maxPricePerDayUsdc: maxPricePerDayMicro(signals),
    metricsSyncedAt: new Date(),
  };
}

/**
 * Upsert the AdSpaces user for an X profile at sign-in and refresh valuation signals (ADR-0007).
 * The refresh token is stored encrypted (if TOKEN_ENC_KEY is set) for cheap owned-read banner checks (ADR-0013).
 */
export async function upsertUserFromX(profile: XUser, accessToken?: string, refreshToken?: string): Promise<string> {
  let posts: Awaited<ReturnType<typeof getRecentPosts>> = [];
  if (accessToken) {
    try {
      posts = await getRecentPosts(accessToken, profile.id, 10);
    } catch (err) {
      console.warn("recent posts fetch failed", String(err));
    }
  }
  const fields = {
    handle: profile.username,
    name: profile.name,
    avatarUrl: profile.profile_image_url ?? null,
    bannerUrl: profile.profile_banner_url ?? null,
    ...valuationFields(signalsFromPosts(profile, posts)),
    ...(refreshToken && TOKEN_ENC_KEY ? { xRefreshTokenEnc: encryptSecret(refreshToken, TOKEN_ENC_KEY) } : {}),
  };
  const [row] = await db()
    .insert(users)
    .values({ xId: profile.id, ...fields })
    .onConflictDoUpdate({ target: users.xId, set: fields })
    .returning({ id: users.id });
  return row!.id;
}

export { valuationFields };
