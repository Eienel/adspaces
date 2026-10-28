import { requestBooking } from "@/lib/bookings";
import { rateLimit } from "@/lib/cache";
import { requireUserId, route } from "@/lib/session";

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await rateLimit(`booking:${userId}`);
  return Response.json(await requestBooking(userId, await req.json()));
});
