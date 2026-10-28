import { z } from "zod";
import { rateLimit } from "@/lib/cache";
import { route } from "@/lib/session";
import { createLoginChallenge } from "@/lib/wallet";

/** Step 1 of wallet sign-in: get a one-time message to sign. Step 2 is signIn("solana", …). */
export const POST = route(async (req: Request) => {
  const { pubkey } = z.object({ pubkey: z.string().min(32).max(44) }).parse(await req.json());
  await rateLimit(`login:${pubkey}`);
  return Response.json(await createLoginChallenge(pubkey));
});
