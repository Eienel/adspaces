import { requireUserId, route } from "@/lib/session";
import { linkWallet } from "@/lib/wallet";

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  return Response.json(await linkWallet(userId, await req.json()));
});
