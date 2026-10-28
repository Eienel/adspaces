/**
 * Minimal X API v2 client (fetch-based, no deps). See docs/06-x-platform-notes.md.
 * Pay-per-use: every user/post returned costs money, so request only what you need.
 */
import type { BannerSource } from "./interfaces";
import type { ProfileSignals } from "./valuation";

export const X_API_BASE = "https://api.x.com/2";
export const X_USER_FIELDS = "profile_banner_url,profile_image_url,public_metrics,verified,verified_type";

export interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  profile_banner_url?: string;
  verified?: boolean;
  verified_type?: "blue" | "business" | "government" | "none";
  public_metrics?: { followers_count: number; following_count: number; tweet_count: number; listed_count: number };
}

export interface XPost {
  id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

export class XApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

async function xGet<T>(path: string, token: string, f: Fetch = fetch): Promise<T> {
  const res = await f(`${X_API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new XApiError(res.status, `X API ${res.status}: ${await res.text().catch(() => "")}`);
  return (await res.json()) as T;
}

export function isVerified(u: Pick<XUser, "verified" | "verified_type">): boolean {
  return Boolean(u.verified) || (u.verified_type !== undefined && u.verified_type !== "none");
}

/** Lookup up to 100 users per call; batches automatically. */
export async function getUsersByIds(token: string, ids: string[], f: Fetch = fetch): Promise<XUser[]> {
  const out: XUser[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const body = await xGet<{ data?: XUser[] }>(
      `/users?ids=${chunk.join(",")}&user.fields=${X_USER_FIELDS}`,
      token,
      f,
    );
    out.push(...(body.data ?? []));
  }
  return out;
}

export async function getMe(userToken: string, f: Fetch = fetch): Promise<XUser> {
  const body = await xGet<{ data: XUser }>(`/users/me?user.fields=${X_USER_FIELDS}`, userToken, f);
  return body.data;
}

export async function getRecentPosts(token: string, xUserId: string, max = 20, f: Fetch = fetch): Promise<XPost[]> {
  const body = await xGet<{ data?: XPost[] }>(
    `/users/${xUserId}/tweets?max_results=${Math.min(100, Math.max(5, max))}&exclude=retweets,replies&tweet.fields=public_metrics`,
    token,
    f,
  );
  return body.data ?? [];
}

/** Turn a user + recent posts into valuation signals (ADR-0007). */
export function signalsFromPosts(user: XUser, posts: XPost[]): ProfileSignals {
  const withImpr = posts.filter((p) => (p.public_metrics?.impression_count ?? 0) > 0);
  const impressions = withImpr.reduce((s, p) => s + (p.public_metrics?.impression_count ?? 0), 0);
  const engagements = withImpr.reduce((s, p) => {
    const m = p.public_metrics!;
    return s + m.like_count + m.retweet_count + m.reply_count + m.quote_count;
  }, 0);
  return {
    followers: user.public_metrics?.followers_count ?? 0,
    avgImpressions: withImpr.length ? Math.round(impressions / withImpr.length) : 0,
    engagementRate: impressions > 0 ? engagements / impressions : 0,
    verified: isVerified(user),
  };
}

/** Official X API banner source (ADR-0005). Unknown/suspended users are simply absent from the map. */
export class XApiBannerSource implements BannerSource {
  constructor(
    private bearerToken: string,
    private f: Fetch = fetch,
  ) {}

  async getBanners(xUserIds: string[]): Promise<Map<string, string | null>> {
    const users = await getUsersByIds(this.bearerToken, xUserIds, this.f);
    return new Map(users.map((u) => [u.id, u.profile_banner_url ?? null]));
  }
}

/** Test/dev banner source. */
export class MockBannerSource implements BannerSource {
  constructor(public banners: Map<string, string | null> = new Map()) {}
  async getBanners(xUserIds: string[]): Promise<Map<string, string | null>> {
    return new Map(xUserIds.filter((id) => this.banners.has(id)).map((id) => [id, this.banners.get(id)!]));
  }
}

/** X serves several banner sizes; 1500x500 matches our canvas. Non-X URLs (dev mode, uploads) are returned as-is. */
export function bannerImageUrl(profileBannerUrl: string): string {
  if (!profileBannerUrl.includes("pbs.twimg.com/profile_banners/")) return profileBannerUrl;
  return /\/\d+x\d+$/.test(profileBannerUrl) ? profileBannerUrl : `${profileBannerUrl}/1500x500`;
}
