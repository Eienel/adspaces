import { shapeSchema } from "@adspaces/shared";
import { rateLimit } from "@/lib/cache";
import { myCreatives, uploadCreative } from "@/lib/creatives";
import { requireUserId, route } from "@/lib/session";

export const runtime = "nodejs";

/** Upload an ad image (shape detected from aspect ratio; optional `shape` field enforces one). */
export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await rateLimit(`creative:${userId}`);
  const form = await req.formData();
  const expected = form.get("shape") ? shapeSchema.parse(form.get("shape")) : null;
  return Response.json(await uploadCreative(userId, form.get("file"), expected));
});

/** My ad images, optionally filtered by shape (for picking one when booking). */
export const GET = route(async (req: Request) => {
  const userId = await requireUserId();
  const shape = new URL(req.url).searchParams.get("shape");
  return Response.json(await myCreatives(userId, shape ? shapeSchema.parse(shape) : undefined));
});
