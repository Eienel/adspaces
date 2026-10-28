import { bannerCompositions, listings, users } from "@adspaces/db";
import { loadImage, storeImage } from "@adspaces/shared/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { actOnBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireDev } from "@/lib/dev";
import { HttpError, requireUserId, route } from "@/lib/session";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("fund"), bookingId: z.string().uuid() }),
  z.object({ action: z.literal("set_banner"), compositionId: z.string().uuid() }),
]);

/**
 * $0 dev mode helpers (ADR-0013). 404 unless DEV_LOGIN=1.
 *  - fund: pretend the business paid into escrow
 *  - set_banner: pretend the creator uploaded the composite to X (re-encoded as JPEG, like X does)
 */
export const POST = route(async (req: Request) => {
  requireDev();
  const userId = await requireUserId();
  const input = schema.parse(await req.json());
  if (input.action === "fund") return Response.json(await actOnBooking(userId, input.bookingId, "dev_fund"));

  const [row] = await db()
    .select({ imageUrl: bannerCompositions.imageUrl })
    .from(bannerCompositions)
    .innerJoin(listings, eq(listings.id, bannerCompositions.listingId))
    .where(and(eq(bannerCompositions.id, input.compositionId), eq(listings.sellerId, userId)));
  if (!row) throw new HttpError(404, "Composite not found");
  const jpg = await sharp(await loadImage(row.imageUrl)).jpeg({ quality: 75 }).toBuffer();
  const bannerUrl = await storeImage(`${randomUUID()}.jpg`, jpg, "banners");
  await db().update(users).set({ bannerUrl }).where(eq(users.id, userId));
  return Response.json({ bannerUrl });
});
