import { listingQuerySchema } from "@adspaces/shared";
import { rateLimit } from "@/lib/cache";
import { searchListings, upsertMyListing } from "@/lib/listings";
import { requireUserId, route } from "@/lib/session";

export const GET = route(async (req: Request) => {
  const q = listingQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json(await searchListings(q), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
});

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await rateLimit(`listing:${userId}`);
  return Response.json(await upsertMyListing(userId, await req.json()));
});
