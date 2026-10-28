import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { HttpError } from "./session";

/** Redis is optional in dev; without it caching/rate limiting are no-ops. */
const redis =
  process.env.REDIS_URL && process.env.REDIS_TOKEN
    ? new Redis({ url: process.env.REDIS_URL, token: process.env.REDIS_TOKEN })
    : null;

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (!redis) return load();
  const hit = await redis.get<T>(key).catch(() => null);
  if (hit !== null && hit !== undefined) return hit;
  const value = await load();
  await redis.set(key, value, { ex: ttlSeconds }).catch(() => {});
  return value;
}

/** Bump a namespace version to invalidate every key built with `cacheKey(ns, …)`. */
export async function invalidate(ns: string) {
  await redis?.incr(`v:${ns}`).catch(() => {});
}

export async function cacheKey(ns: string, ...parts: string[]): Promise<string> {
  const v = redis ? ((await redis.get<number>(`v:${ns}`).catch(() => 0)) ?? 0) : 0;
  return `${ns}:${v}:${parts.join(":")}`;
}

const limiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl" })
  : null;

export async function rateLimit(id: string) {
  if (!limiter) return;
  const { success } = await limiter.limit(id);
  if (!success) throw new HttpError(429, "Too many requests, slow down");
}
