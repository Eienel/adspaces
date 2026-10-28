import { z } from "zod";
import { setCampaignStatus } from "@/lib/campaigns";
import { HttpError, isUuid, requireUserId, route } from "@/lib/session";

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await requireUserId();
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, "Ad not found");
  const { status } = z.object({ status: z.enum(["open", "closed"]) }).parse(await req.json());
  await setCampaignStatus(userId, id, status);
  return Response.json({ status });
});
