import { users } from "@adspaces/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId, route } from "@/lib/session";

const businessSchema = z.object({
  businessName: z.string().trim().min(2).max(60),
  businessUrl: z.union([z.literal(""), z.string().trim().url().max(200)]).default(""),
});

/** Update the caller's business profile. */
export const PATCH = route(async (req: Request) => {
  const userId = await requireUserId();
  const input = businessSchema.parse(await req.json());
  await db().update(users).set({ businessName: input.businessName, businessUrl: input.businessUrl || null }).where(eq(users.id, userId));
  return Response.json(input);
});
