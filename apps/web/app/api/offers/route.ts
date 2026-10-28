import { offerToCampaign } from "@/lib/bookings";
import { rateLimit } from "@/lib/cache";
import { requireUserId, route } from "@/lib/session";

/** A creator offers one of their segments to an open ad. */
export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await rateLimit(`offer:${userId}`);
  return Response.json(await offerToCampaign(userId, await req.json()));
});
