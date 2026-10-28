import "server-only";
import { adCampaigns, bookings, creatives, users } from "@adspaces/db";
import { campaignInputSchema, usdcToMicro, type SegmentShape } from "@adspaces/shared";
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { cacheKey, cached, invalidate } from "./cache";
import { db } from "./db";
import { HttpError } from "./session";

const PAGE = 24;

const campaignColumns = {
  id: adCampaigns.id,
  title: adCampaigns.title,
  brief: adCampaigns.brief,
  shape: adCampaigns.shape,
  adCategory: adCampaigns.adCategory,
  audience: adCampaigns.audience,
  maxPricePerDayUsdc: adCampaigns.maxPricePerDayUsdc,
  weeks: adCampaigns.weeks,
  status: adCampaigns.status,
  createdAt: adCampaigns.createdAt,
  creativeUrl: creatives.imageUrl,
  business: { id: users.id, handle: users.handle, businessName: users.businessName, name: users.name, walletPubkey: users.walletPubkey, avatarUrl: users.avatarUrl },
};

function base() {
  return db().select(campaignColumns).from(adCampaigns).innerJoin(creatives, eq(creatives.id, adCampaigns.creativeId)).innerJoin(users, eq(users.id, adCampaigns.businessId));
}

export async function createCampaign(businessId: string, raw: unknown) {
  const input = campaignInputSchema.parse(raw);
  const [creative] = await db().select().from(creatives).where(and(eq(creatives.id, input.creativeId), eq(creatives.advertiserId, businessId)));
  if (!creative) throw new HttpError(400, "Upload the ad image first");
  const [row] = await db()
    .insert(adCampaigns)
    .values({
      businessId,
      title: input.title,
      brief: input.brief,
      creativeId: creative.id,
      shape: creative.shape,
      adCategory: input.adCategory,
      audience: input.audience,
      maxPricePerDayUsdc: usdcToMicro(input.maxPricePerDayUsdc),
      weeks: input.weeks,
    })
    .returning();
  await invalidate("campaigns");
  return row!;
}

export async function listOpenCampaigns(q: { shape?: SegmentShape; category?: string; page: number }) {
  return cached(await cacheKey("campaigns", JSON.stringify(q)), 30, async () => {
    const where: SQL[] = [eq(adCampaigns.status, "open")];
    if (q.shape) where.push(eq(adCampaigns.shape, q.shape));
    if (q.category) where.push(sql`(${adCampaigns.adCategory} = ${q.category} or ${q.category} = any(${adCampaigns.audience}))`);
    const rows = await base().where(and(...where)).orderBy(desc(adCampaigns.createdAt)).limit(PAGE + 1).offset((q.page - 1) * PAGE);
    return { items: rows.slice(0, PAGE), hasMore: rows.length > PAGE };
  });
}
export type CampaignCardData = Awaited<ReturnType<typeof listOpenCampaigns>>["items"][number];

export async function getCampaign(id: string) {
  const [row] = await base().where(eq(adCampaigns.id, id));
  return row ?? null;
}

export async function myCampaigns(businessId: string) {
  return db()
    .select({ ...campaignColumns, offers: count(bookings.id) })
    .from(adCampaigns)
    .innerJoin(creatives, eq(creatives.id, adCampaigns.creativeId))
    .innerJoin(users, eq(users.id, adCampaigns.businessId))
    .leftJoin(bookings, eq(bookings.campaignId, adCampaigns.id))
    .where(eq(adCampaigns.businessId, businessId))
    .groupBy(adCampaigns.id, creatives.id, users.id)
    .orderBy(desc(adCampaigns.createdAt));
}

export async function setCampaignStatus(businessId: string, id: string, status: "open" | "closed") {
  const rows = await db().update(adCampaigns).set({ status }).where(and(eq(adCampaigns.id, id), eq(adCampaigns.businessId, businessId))).returning({ id: adCampaigns.id });
  if (!rows.length) throw new HttpError(404, "Ad not found");
  await invalidate("campaigns");
}
