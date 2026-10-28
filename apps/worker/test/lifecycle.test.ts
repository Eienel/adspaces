/**
 * End-to-end worker lifecycle against a real Postgres (fake chain, dev banner source, in-memory images).
 * Run with TEST_DATABASE_URL pointing at a migrated, disposable database. Skipped otherwise.
 */
import { bannerCompositions, bookings, createDb, creatives, listings, segments, users } from "@adspaces/db";
import { layoutSegments, type PaymentsProvider, type PreparedTx } from "@adspaces/shared";
import { composeBanner } from "@adspaces/shared/server";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DevBannerSource } from "../src/banner-sources";
import { DEFAULT_JOB_CONFIG, type JobContext } from "../src/context";
import { runCycle } from "../src/jobs/cycle";
import { watchPayments } from "../src/jobs/payments";
import { settleBookings } from "../src/jobs/settle";
import { verifyBanners } from "../src/jobs/verify";

const url = process.env.TEST_DATABASE_URL;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CYCLE = new Date("2026-11-09T00:00:00Z"); // Monday

async function art(seed: number, w: number, h: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="hsl(${seed * 67},70%,45%)"/>
    <circle cx="${w * (0.2 + (seed % 5) * 0.15)}" cy="${h / 2}" r="${h / 3}" fill="white"/>
    <rect x="${w * (0.75 - (seed % 3) * 0.2)}" y="${h * 0.1}" width="${w / 6}" height="${h * 0.8}" fill="black"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
/** What X does to an uploaded banner. */
const reencode = (png: Uint8Array) => sharp(png).jpeg({ quality: 70 }).toBuffer();

class FakePayments implements PaymentsProvider {
  paid = new Map<string, string>(); // reference → payer
  sent: { kind: string; recipient: string; amount: number; bookingId: string }[] = [];
  private n = 0;
  async findPayment({ reference, amountMicro }: { reference: string; amountMicro: number }) {
    const payer = this.paid.get(reference);
    return payer ? { signature: `fund-${reference}`, payer, amountMicro } : null;
  }
  async prepareSettlement(a: { kind: string; recipient: string; amountMicro: number; bookingId: string }): Promise<PreparedTx> {
    this.sent.push({ kind: a.kind, recipient: a.recipient, amount: a.amountMicro, bookingId: a.bookingId });
    return { signature: `settle-${++this.n}`, serialized: new Uint8Array(), lastValidBlockHeight: 1 };
  }
  async send() {}
  async txStatus() {
    return "confirmed" as const;
  }
}

describe.skipIf(!url)("worker lifecycle: multi-ad banner, weekly cycle", () => {
  const db = url ? createDb(url, { max: 2 }) : (undefined as never);
  let clock: Date;
  let payments: FakePayments;
  let images: Map<string, Uint8Array>;
  let ctx: JobContext;

  beforeEach(async () => {
    await db.execute(sql`truncate verifications, banner_compositions, bookings, ad_campaigns, segments, creatives, listings, wallet_challenges, users cascade`);
    clock = new Date("2026-11-04T10:00:00Z"); // Wednesday before the cycle
    payments = new FakePayments();
    images = new Map();
    ctx = {
      db,
      payments,
      banners: new DevBannerSource(db),
      loadImage: async (u) => {
        const img = images.get(u);
        if (!img) throw new Error(`no image ${u}`);
        return img;
      },
      storeImage: async (name, data) => {
        images.set(`mem://${name}`, data);
        return `mem://${name}`;
      },
      now: () => clock,
      random: () => 0.5, // checks every 12h
      config: { ...DEFAULT_JOB_CONFIG },
      log: () => {},
    };
  });
  afterAll(async () => {
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  const advanceTo = (iso: string) => (clock = new Date(iso));
  const advance = (ms: number) => (clock = new Date(clock.getTime() + ms));
  const get = async (id: string) => (await db.select().from(bookings).where(eq(bookings.id, id)))[0]!;
  const setBanner = async (png: Uint8Array) => {
    const key = `mem://banner-${images.size}.jpg`;
    images.set(key, await reencode(png));
    await db.update(users).set({ bannerUrl: key }).where(eq(users.handle, "alice"));
  };

  async function seed() {
    images.set("mem://alice-original.png", await art(9, 1500, 500));
    const [alice] = await db.insert(users).values({ xId: "dev:alice", handle: "alice", name: "Alice", walletPubkey: "AliceWallet" }).returning();
    const [listing] = await db
      .insert(listings)
      .values({ sellerId: alice!.id, title: "Thirds", layout: "thirds", originalBannerUrl: "mem://alice-original.png" })
      .returning();
    const segs = await db
      .insert(segments)
      .values(layoutSegments("thirds").map((s) => ({ listingId: listing!.id, idx: s.idx, shape: s.shape, ...s.rect, pricePerDayUsdc: 1_000_000 })))
      .returning();
    const book = async (i: number, seed: number) => {
      const [biz] = await db.insert(users).values({ name: `Biz${i}`, walletPubkey: `Biz${i}Wallet` }).returning();
      images.set(`mem://ad${i}.png`, await art(seed, 500, 500));
      const [cr] = await db.insert(creatives).values({ advertiserId: biz!.id, shape: "third", imageUrl: `mem://ad${i}.png`, phash: "x", width: 500, height: 500 }).returning();
      const [b] = await db
        .insert(bookings)
        .values({
          segmentId: segs[i]!.id,
          listingId: listing!.id,
          sellerId: alice!.id,
          advertiserId: biz!.id,
          creativeId: cr!.id,
          origin: "business_request",
          adCategory: "crypto",
          cycleStart: CYCLE,
          weeks: 1,
          amountUsdc: 7_000_000,
          feeBps: 1000,
          paymentReference: `Ref${i}`,
          acceptedAt: clock,
          status: "accepted",
        })
        .returning();
      return b!;
    };
    const b0 = await book(0, 1);
    const b1 = await book(1, 2); // never pays
    const b2 = await book(2, 3);
    return { listing: listing!, segs, b0, b1, b2 };
  }

  it("two ads share a banner; one gets swapped out → that one is refunded, the other is paid", async () => {
    const { listing, b0, b1, b2 } = await seed();
    payments.paid.set("Ref0", "Biz0Wallet");
    payments.paid.set("Ref2", "Biz2Wallet");
    expect(await watchPayments(ctx)).toBe(2);
    expect((await get(b0.id)).nextCheckAt!.getTime()).toBe(CYCLE.getTime()); // no API spend before the cycle

    expect(await runCycle(ctx)).toBe(0); // before cutoff
    advanceTo("2026-11-07T13:00:00Z"); // after Saturday 12:00 cutoff
    expect(await runCycle(ctx)).toBe(1);
    expect((await get(b1.id)).status).toBe("cancelled"); // unpaid at cutoff
    const [comp] = await db.select().from(bannerCompositions).where(eq(bannerCompositions.listingId, listing.id));
    expect(comp!.bookingIds.sort()).toEqual([b0.id, b2.id].sort());
    expect(Object.keys(comp!.segmentSignatures)).toHaveLength(3);
    expect(await runCycle(ctx)).toBe(0); // idempotent

    expect(await verifyBanners(ctx)).toBe(0); // nothing due until Monday
    await setBanner(images.get(comp!.imageUrl)!);
    advanceTo("2026-11-09T00:30:00Z");
    expect(await verifyBanners(ctx)).toBe(2);
    expect((await get(b0.id)).status).toBe("live");
    expect((await get(b2.id)).status).toBe("live");

    for (let i = 0; i < 4; i++) {
      advance(12 * HOUR);
      await verifyBanners(ctx);
    }
    // Day 2: creator swaps Biz2's ad (right third) for their own art.
    const segsSorted = layoutSegments("thirds");
    const tampered = await composeBanner({
      base: images.get("mem://alice-original.png")!,
      showTag: true,
      segments: segsSorted.map((s) => ({ rect: s.rect, creative: s.idx === 0 ? images.get("mem://ad0.png")! : s.idx === 2 ? images.get("mem://alice-original.png")! : null })),
    });
    await setBanner(tampered);
    for (let i = 0; i < 12; i++) {
      advance(12 * HOUR);
      await verifyBanners(ctx);
    }
    expect(clock > (await get(b0.id)).endAt!).toBe(true);

    await settleBookings(ctx);
    await settleBookings(ctx);
    expect((await get(b0.id)).status).toBe("completed");
    expect((await get(b2.id)).status).toBe("refunded");
    expect(payments.sent).toEqual(
      expect.arrayContaining([
        { kind: "release", recipient: "AliceWallet", amount: 7_000_000, bookingId: b0.id },
        { kind: "refund", recipient: "Biz2Wallet", amount: 7_000_000, bookingId: b2.id },
      ]),
    );
    await settleBookings(ctx);
    expect(payments.sent).toHaveLength(2); // idempotent
  });

  it("banner never set → refunded after the cycle's grace period", async () => {
    const { b0 } = await seed();
    payments.paid.set("Ref0", "Biz0Wallet");
    await watchPayments(ctx);
    advanceTo("2026-11-07T13:00:00Z");
    await runCycle(ctx);
    advanceTo("2026-11-09T00:30:00Z");
    for (let i = 0; i < 26; i++) {
      await verifyBanners(ctx);
      await settleBookings(ctx);
      advance(HOUR);
    }
    expect((await get(b0.id)).status).toBe("refunded");
    expect(payments.sent).toEqual([{ kind: "refund", recipient: "Biz0Wallet", amount: 7_000_000, bookingId: b0.id }]);
  });

  it("a payment that lands after the cutoff cancelled the booking is refunded", async () => {
    const { b1 } = await seed();
    advanceTo("2026-11-07T13:00:00Z");
    await runCycle(ctx);
    expect((await get(b1.id)).status).toBe("cancelled");
    payments.paid.set("Ref1", "Biz1Wallet"); // too late
    await watchPayments(ctx);
    await settleBookings(ctx);
    await settleBookings(ctx);
    const b = await get(b1.id);
    expect(b.status).toBe("cancelled");
    expect(b.settledAt).not.toBeNull();
    expect(payments.sent).toEqual([{ kind: "refund", recipient: "Biz1Wallet", amount: 7_000_000, bookingId: b1.id }]);
  });
});
