/**
 * End-to-end worker lifecycle against a real Postgres (fake chain + fake X).
 * Run with TEST_DATABASE_URL pointing at a migrated, disposable database. Skipped otherwise.
 */
import { bookings, createDb, creatives, listings, users, verifications } from "@adspaces/db";
import { MockBannerSource, type PaymentsProvider, type PreparedTx } from "@adspaces/shared";
import { dHash } from "@adspaces/shared/phash";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_JOB_CONFIG, type JobContext } from "../src/context";
import { watchPayments } from "../src/jobs/payments";
import { settleBookings } from "../src/jobs/settle";
import { verifyBanners } from "../src/jobs/verify";

const url = process.env.TEST_DATABASE_URL;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function bannerPng(seed: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500">
    <rect width="1500" height="500" fill="hsl(${seed * 67},70%,40%)"/>
    <circle cx="${300 + seed * 150}" cy="250" r="180" fill="white"/>
    <rect x="${1100 - seed * 120}" y="80" width="250" height="340" fill="black"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

class FakePayments implements PaymentsProvider {
  paid = new Map<string, { payer: string; amount: number }>();
  sent: { sig: string; kind: string; recipient: string; amount: number }[] = [];
  statuses = new Map<string, "confirmed" | "pending">();
  private n = 0;
  async findPayment({ reference }: { reference: string }) {
    const p = this.paid.get(reference);
    return p ? { signature: `fund-${reference}`, payer: p.payer, amountMicro: p.amount } : null;
  }
  async prepareSettlement(a: { kind: string; recipient: string; amountMicro: number }): Promise<PreparedTx> {
    const sig = `settle-${++this.n}`;
    this.sent.push({ sig, kind: a.kind, recipient: a.recipient, amount: a.amountMicro });
    return { signature: sig, serialized: new Uint8Array(), lastValidBlockHeight: 100 };
  }
  async send(tx: PreparedTx) {
    this.statuses.set(tx.signature, "confirmed");
  }
  async txStatus(sig: string) {
    return this.statuses.get(sig) ?? "pending";
  }
}

describe.skipIf(!url)("worker lifecycle", () => {
  const db = url ? createDb(url, { max: 2 }) : (undefined as never);
  let clock = new Date("2026-11-01T00:00:00Z");
  let payments: FakePayments;
  let banners: MockBannerSource;
  let images: Map<string, Buffer>;
  let ctx: JobContext;

  beforeEach(async () => {
    await db.execute(sql`truncate verifications, bookings, creatives, listings, wallet_challenges, users cascade`);
    clock = new Date("2026-11-01T00:00:00Z");
    payments = new FakePayments();
    banners = new MockBannerSource();
    images = new Map();
    ctx = {
      db,
      payments,
      banners,
      fetchImage: async (u) => {
        const img = images.get(u);
        if (!img) throw new Error(`no image ${u}`);
        return img;
      },
      now: () => clock,
      random: () => 0.5,
      config: { ...DEFAULT_JOB_CONFIG },
      log: () => {},
    };
  });
  afterAll(async () => {
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  async function seedAcceptedBooking(days = 2) {
    const [seller] = await db.insert(users).values({ xId: "100", handle: "seller", name: "Seller", walletPubkey: "SellerWallet" }).returning();
    const [adv] = await db.insert(users).values({ xId: "200", handle: "adv", name: "Adv" }).returning();
    const [listing] = await db.insert(listings).values({ sellerId: seller!.id, title: "My banner", pricePerDayUsdc: 10_000_000 }).returning();
    const creativePng = await bannerPng(1);
    const [creative] = await db
      .insert(creatives)
      .values({ advertiserId: adv!.id, imageUrl: "https://cdn/creative.png", phash: await dHash(creativePng), width: 1500, height: 500 })
      .returning();
    const [booking] = await db
      .insert(bookings)
      .values({
        listingId: listing!.id,
        sellerId: seller!.id,
        advertiserId: adv!.id,
        creativeId: creative!.id,
        adCategory: "crypto",
        days,
        startAt: clock,
        amountUsdc: days * 10_000_000,
        feeBps: 1000,
        paymentReference: "Ref1",
        acceptedAt: clock,
        status: "accepted",
      })
      .returning();
    // X re-encodes the creative when the seller uploads it as a banner.
    images.set("https://pbs/banner-ok/1500x500", await sharp(creativePng).resize(1000, 333).jpeg({ quality: 70 }).toBuffer());
    images.set("https://pbs/banner-other/1500x500", await bannerPng(4));
    return booking!;
  }

  const get = async (id: string) => (await db.select().from(bookings).where(eq(bookings.id, id)))[0]!;
  const advance = (ms: number) => (clock = new Date(clock.getTime() + ms));

  it("happy path: pay → live → checks pass → release with fee split", async () => {
    const b = await seedAcceptedBooking(2);
    expect(await watchPayments(ctx)).toBe(0);
    payments.paid.set("Ref1", { payer: "AdvWallet", amount: 20_000_000 });
    expect(await watchPayments(ctx)).toBe(1);
    expect((await get(b.id)).status).toBe("funded");

    banners.banners.set("100", "https://pbs/banner-ok");
    advance(10 * 60 * 1000);
    await verifyBanners(ctx);
    const live = await get(b.id);
    expect(live.status).toBe("live");
    expect(live.endAt!.getTime() - live.liveAt!.getTime()).toBe(2 * DAY);

    for (let i = 0; i < 12; i++) {
      advance(6 * HOUR);
      await verifyBanners(ctx);
    }
    const checks = await db.select().from(verifications).where(eq(verifications.bookingId, b.id));
    expect(checks.length).toBeGreaterThan(5);
    expect(checks.every((c) => c.pass)).toBe(true);

    await settleBookings(ctx); // prepares + sends release
    expect(payments.sent).toEqual([{ sig: "settle-1", kind: "release", recipient: "SellerWallet", amount: 20_000_000 }]);
    await settleBookings(ctx); // sees confirmation
    const done = await get(b.id);
    expect(done.status).toBe("completed");
    expect(done.settlementTx).toBe("settle-1");
    await settleBookings(ctx);
    expect(payments.sent).toHaveLength(1); // idempotent
  });

  it("seller swaps the banner mid-booking → refund", async () => {
    const b = await seedAcceptedBooking(2);
    payments.paid.set("Ref1", { payer: "AdvWallet", amount: 20_000_000 });
    await watchPayments(ctx);
    banners.banners.set("100", "https://pbs/banner-ok");
    advance(10 * 60 * 1000);
    await verifyBanners(ctx);
    banners.banners.set("100", "https://pbs/banner-other");
    for (let i = 0; i < 12; i++) {
      advance(6 * HOUR);
      await verifyBanners(ctx);
    }
    await settleBookings(ctx);
    await settleBookings(ctx);
    expect(payments.sent[0]).toMatchObject({ kind: "refund", recipient: "AdvWallet", amount: 20_000_000 });
    expect((await get(b.id)).status).toBe("refunded");
  });

  it("banner never set → refund after grace period", async () => {
    const b = await seedAcceptedBooking(1);
    payments.paid.set("Ref1", { payer: "AdvWallet", amount: 10_000_000 });
    await watchPayments(ctx);
    banners.banners.set("100", null);
    for (let i = 0; i < 26; i++) {
      advance(HOUR);
      await verifyBanners(ctx);
      await settleBookings(ctx);
    }
    expect((await get(b.id)).status).toBe("refunded");
    expect(payments.sent[0]).toMatchObject({ kind: "refund", recipient: "AdvWallet" });
  });

  it("X API outage is logged as errors and does not fail the seller", async () => {
    const b = await seedAcceptedBooking(1);
    payments.paid.set("Ref1", { payer: "AdvWallet", amount: 10_000_000 });
    await watchPayments(ctx);
    banners.banners.set("100", "https://pbs/banner-ok");
    advance(10 * 60 * 1000);
    await verifyBanners(ctx);
    ctx.banners = { getBanners: async () => Promise.reject(new Error("503")) };
    for (let i = 0; i < 6; i++) {
      advance(6 * HOUR);
      await verifyBanners(ctx);
    }
    await settleBookings(ctx);
    await settleBookings(ctx);
    expect((await get(b.id)).status).toBe("completed");
  });
});
