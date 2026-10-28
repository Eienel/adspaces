import { replaceBaseArt } from "@/lib/listings";
import { requireUserId, route } from "@/lib/session";

export const runtime = "nodejs";

/** Replace the creator's base art (shown in unsold segments). */
export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  return Response.json(await replaceBaseArt(userId, (await req.formData()).get("file")));
});
