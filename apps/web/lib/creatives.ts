import "server-only";
import { creatives } from "@adspaces/db";
import { CREATIVE_MAX_BYTES, SHAPE_LABEL, SHAPE_SIZE, shapeForSize, type SegmentShape } from "@adspaces/shared";
import { dHash, imageSize, normalizeCreative, storeImage } from "@adspaces/shared/server";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./session";

/** Upload an ad image. Its shape is detected from the aspect ratio and it's resized to the exact segment size. */
export async function uploadCreative(userId: string, file: unknown, expected?: SegmentShape | null) {
  if (!(file instanceof File)) throw new HttpError(400, "Attach an image file");
  if (file.size > CREATIVE_MAX_BYTES) throw new HttpError(400, "Image must be under 5 MB");
  const data = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await imageSize(data);
  } catch {
    throw new HttpError(400, "That file isn't a valid image");
  }
  if (!["png", "jpeg", "webp"].includes(meta.format)) throw new HttpError(400, "Use PNG, JPEG or WebP");
  const shape = shapeForSize(meta.width, meta.height);
  if (!shape) {
    throw new HttpError(400, `Image must match a segment shape: ${Object.values(SHAPE_LABEL).join(", ")} (got ${meta.width}×${meta.height})`);
  }
  if (expected && shape !== expected) throw new HttpError(400, `This segment needs a ${SHAPE_LABEL[expected]} image, got ${SHAPE_LABEL[shape]}`);
  const png = await normalizeCreative(data, shape);
  const imageUrl = await storeImage(`${randomUUID()}.png`, png, "creatives");
  const [row] = await db()
    .insert(creatives)
    .values({ advertiserId: userId, shape, imageUrl, phash: await dHash(png), width: SHAPE_SIZE[shape].w, height: SHAPE_SIZE[shape].h })
    .returning({ id: creatives.id, imageUrl: creatives.imageUrl, shape: creatives.shape });
  return row!;
}

export async function myCreatives(userId: string, shape?: SegmentShape) {
  return db()
    .select({ id: creatives.id, imageUrl: creatives.imageUrl, shape: creatives.shape })
    .from(creatives)
    .where(and(eq(creatives.advertiserId, userId), shape ? eq(creatives.shape, shape) : undefined))
    .orderBy(desc(creatives.createdAt))
    .limit(50);
}
