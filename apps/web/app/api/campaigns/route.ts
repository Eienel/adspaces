import { campaignQuerySchema } from "@adspaces/shared";
import { rateLimit } from "@/lib/cache";
import { createCampaign, listOpenCampaigns } from "@/lib/campaigns";
import { requireUserId, route } from "@/lib/session";

export const GET = route(async (req: Request) => {
  const q = campaignQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json(await listOpenCampaigns(q), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
});

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await rateLimit(`campaign:${userId}`);
  return Response.json(await createCampaign(userId, await req.json()));
});
