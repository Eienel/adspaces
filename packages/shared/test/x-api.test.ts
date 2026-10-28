import { describe, expect, it } from "vitest";
import { XApiBannerSource, bannerImageUrl, getUsersByIds, signalsFromPosts } from "../src/x-api";

function fakeFetch(handler: (url: string) => unknown) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify(handler(url)), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("x api", () => {
  it("batches user lookups by 100", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => String(i));
    const { f, calls } = fakeFetch((url) => ({
      data: new URL(url).searchParams.get("ids")!.split(",").map((id) => ({ id, username: id, name: id })),
    }));
    const users = await getUsersByIds("tok", ids, f);
    expect(users).toHaveLength(150);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("user.fields=profile_banner_url");
  });

  it("banner source maps missing banners to null and omits unknown users", async () => {
    const { f } = fakeFetch(() => ({
      data: [
        { id: "1", username: "a", name: "a", profile_banner_url: "https://pbs.twimg.com/profile_banners/1/123" },
        { id: "2", username: "b", name: "b" },
      ],
    }));
    const map = await new XApiBannerSource("tok", f).getBanners(["1", "2", "3"]);
    expect(map.get("1")).toBe("https://pbs.twimg.com/profile_banners/1/123");
    expect(map.get("2")).toBeNull();
    expect(map.has("3")).toBe(false);
  });

  it("computes valuation signals", () => {
    const s = signalsFromPosts(
      { id: "1", username: "a", name: "a", verified_type: "blue", public_metrics: { followers_count: 1000, following_count: 0, tweet_count: 0, listed_count: 0 } },
      [
        { id: "p1", public_metrics: { like_count: 10, retweet_count: 5, reply_count: 3, quote_count: 2, impression_count: 1000 } },
        { id: "p2", public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0 } },
        { id: "p3", public_metrics: { like_count: 20, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 3000 } },
      ],
    );
    expect(s).toEqual({ followers: 1000, avgImpressions: 2000, engagementRate: 40 / 4000, verified: true });
  });

  it("normalizes banner image URLs", () => {
    expect(bannerImageUrl("https://pbs.twimg.com/profile_banners/1/123")).toBe("https://pbs.twimg.com/profile_banners/1/123/1500x500");
    expect(bannerImageUrl("https://pbs.twimg.com/profile_banners/1/123/600x200")).toBe("https://pbs.twimg.com/profile_banners/1/123/600x200");
  });
});
