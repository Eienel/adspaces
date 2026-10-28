import { z } from "zod";
import { setMyListingStatus } from "@/lib/listings";
import { requireUserId, route } from "@/lib/session";

export const PATCH = route(async (req: Request) => {
  const userId = await requireUserId();
  const { status } = z.object({ status: z.enum(["active", "paused"]) }).parse(await req.json());
  await setMyListingStatus(userId, status);
  return Response.json({ status });
});
