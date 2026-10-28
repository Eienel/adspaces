import { rateLimit } from "@/lib/cache";
import { requireUserId, route } from "@/lib/session";
import { createChallenge } from "@/lib/wallet";

export const POST = route(async () => {
  const userId = await requireUserId();
  await rateLimit(`wallet:${userId}`);
  return Response.json(await createChallenge(userId));
});
