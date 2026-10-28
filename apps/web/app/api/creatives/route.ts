import { creatives } from "@adspaces/db";
import { CREATIVE_HEIGHT, CREATIVE_MAX_BYTES, CREATIVE_WIDTH } from "@adspaces/shared";
import { dHash, imageSize } from "@adspaces/shared/phash";
import { randomUUID } from "node:crypto";
import { rateLimit } from "@/lib/cache";
import { db } from "@/lib/db";
import { HttpError, requireUserId, route } from "@/lib/session";
import { storeImage } from "@/lib/storage";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

/** Upload an ad creative (must be 1500x500). Stores the image and its perceptual hash (ADR-0005). */
export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await rateLimit(`creative:${userId}`);
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach an image file");
  if (file.size > CREATIVE_MAX_BYTES) throw new HttpError(400, "Image must be under 2 MB");
  const data = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await imageSize(data);
  } catch {
    throw new HttpError(400, "That file isn't a valid image");
  }
  const contentType = TYPES[meta.format];
  if (!contentType) throw new HttpError(400, "Use PNG, JPEG or WebP");
  if (meta.width !== CREATIVE_WIDTH || meta.height !== CREATIVE_HEIGHT) {
    throw new HttpError(400, `Banner must be exactly ${CREATIVE_WIDTH}x${CREATIVE_HEIGHT}px (got ${meta.width}x${meta.height})`);
  }
  const ext = meta.format === "jpeg" ? "jpg" : meta.format;
  const imageUrl = await storeImage(`${randomUUID()}.${ext}`, data, contentType);
  const [row] = await db()
    .insert(creatives)
    .values({ advertiserId: userId, imageUrl, phash: await dHash(data), width: meta.width, height: meta.height })
    .returning({ id: creatives.id, imageUrl: creatives.imageUrl });
  return Response.json(row);
});
