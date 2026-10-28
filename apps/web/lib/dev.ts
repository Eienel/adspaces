import "server-only";
import { users } from "@adspaces/db";
import { storeImage } from "@adspaces/shared/server";
import { eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "./db";
import { DEV_MODE } from "./env";
import { HttpError } from "./session";
import { valuationFields } from "./user-sync";

export function requireDev() {
  if (!DEV_MODE) throw new HttpError(404, "Not found");
}

/** A colourful fake banner so dev creators have "current banner" art. */
async function fakeBanner(handle: string, hue: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,35%)"/><stop offset="1" stop-color="hsl(${hue + 90},70%,55%)"/></linearGradient></defs>
    <rect width="1500" height="500" fill="url(#g)"/>
    <circle cx="1250" cy="120" r="220" fill="#fff" fill-opacity="0.12"/>
    <circle cx="300" cy="420" r="160" fill="#000" fill-opacity="0.15"/>
    <text x="750" y="270" font-family="sans-serif" font-size="72" font-weight="800" fill="#fff" text-anchor="middle">@${handle}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Dev login: create (or reuse) a fake X user. Follower counts are derived from the handle so they're stable. */
export async function devSignIn(rawHandle: string): Promise<{ id: string; handle: string; name: string }> {
  requireDev();
  const handle = rawHandle.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9_]{2,15}$/.test(handle)) throw new Error("Handle must be 2–15 letters, numbers or _");
  const xId = `dev:${handle}`;
  const [existing] = await db().select().from(users).where(eq(users.xId, xId));
  if (existing) return { id: existing.id, handle, name: existing.name };

  const h = createHash("sha256").update(handle).digest();
  const followers = 1_000 + (h.readUInt32BE(0) % 200_000);
  const bannerUrl = await storeImage(`${randomUUID()}.png`, await fakeBanner(handle, h[4]! % 360), "banners");
  const [row] = await db()
    .insert(users)
    .values({
      xId,
      handle,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      bannerUrl,
      ...valuationFields({ followers, avgImpressions: Math.round(followers * 0.3), engagementRate: 0.02, verified: h[5]! % 2 === 0 }),
    })
    .returning();
  return { id: row!.id, handle, name: row!.name };
}
