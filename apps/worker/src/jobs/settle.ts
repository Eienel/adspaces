/**
 * Settlement (docs/04-payments-escrow.md). Idempotent protocol:
 *   1. decide kind → prepare signed tx → compare-and-set signature onto the booking → send
 *   2. later ticks poll the signature: confirmed → final status; expired/failed → clear and retry.
 * A crash between steps can never double-pay: a new tx is only prepared when no signature is stored.
 */
import { bookings, users, verifications, type Booking } from "@adspaces/db";
import { GO_LIVE_GRACE_MS, decideSettlement, transition, type BookingEvent, type SettlementKind } from "@adspaces/shared";
import { and, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { JobContext } from "../context";

type Plan = { kind: SettlementKind; event: BookingEvent } | { dispute: true };

async function planFor(ctx: JobContext, b: Booking): Promise<Plan> {
  if (b.status === "funded") return { kind: "refund", event: "expire" };
  if (b.status === "disputed") {
    // Set by an admin resolving the dispute (Phase 2 UI).
    return b.settlementKind === "release"
      ? { kind: "release", event: "resolve_release" }
      : { kind: "refund", event: "resolve_refund" };
  }
  const checks = await ctx.db
    .select({ pass: verifications.pass, error: verifications.error })
    .from(verifications)
    .where(and(eq(verifications.bookingId, b.id), gte(verifications.checkedAt, b.liveAt!)));
  const decision = decideSettlement(checks);
  if (decision === "dispute") return { dispute: true };
  return decision === "release" ? { kind: "release", event: "complete" } : { kind: "refund", event: "fail" };
}

function eventFor(b: Booking): BookingEvent {
  const kind = b.settlementKind as SettlementKind;
  if (b.status === "funded") return "expire";
  if (b.status === "disputed") return kind === "release" ? "resolve_release" : "resolve_refund";
  return kind === "release" ? "complete" : "fail";
}

export async function settleBookings(ctx: JobContext): Promise<number> {
  const { db } = ctx;
  const now = ctx.now();
  const graceCutoff = new Date(now.getTime() - GO_LIVE_GRACE_MS);

  const due = await db
    .select({ booking: bookings, sellerWallet: users.walletPubkey })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.sellerId))
    .where(
      and(
        isNull(bookings.settledAt),
        or(
          and(eq(bookings.status, "live"), lte(bookings.endAt, now)),
          and(eq(bookings.status, "funded"), lte(bookings.fundedAt, graceCutoff)),
          and(eq(bookings.status, "disputed"), isNotNull(bookings.settlementKind)),
        ),
      ),
    )
    .limit(100);

  let done = 0;
  for (const { booking: b, sellerWallet } of due) {
    try {
      if (b.settlementTx) {
        const status = await ctx.payments.txStatus(b.settlementTx, b.settlementValidHeight ?? 0);
        if (status === "confirmed") {
          const updated = await db
            .update(bookings)
            .set({ status: transition(b.status, eventFor(b)), settledAt: now, nextCheckAt: null })
            .where(and(eq(bookings.id, b.id), eq(bookings.settlementTx, b.settlementTx)))
            .returning({ id: bookings.id });
          if (updated.length) done++;
          ctx.log("booking settled", { bookingId: b.id, kind: b.settlementKind, tx: b.settlementTx });
        } else if (status === "expired" || status === "failed") {
          ctx.log(`settlement tx ${status}; will retry`, { bookingId: b.id, tx: b.settlementTx });
          await db
            .update(bookings)
            .set({ settlementTx: null, settlementValidHeight: null })
            .where(and(eq(bookings.id, b.id), eq(bookings.settlementTx, b.settlementTx)));
        }
        continue;
      }

      const plan = await planFor(ctx, b);
      if ("dispute" in plan) {
        await db
          .update(bookings)
          .set({ status: transition("live", "dispute"), nextCheckAt: null })
          .where(and(eq(bookings.id, b.id), eq(bookings.status, "live")));
        ctx.log("booking disputed (uptime between thresholds)", { bookingId: b.id });
        continue;
      }

      const recipient = plan.kind === "release" ? sellerWallet : b.payerWallet;
      if (!recipient) {
        ctx.log("cannot settle: missing recipient wallet", { bookingId: b.id, kind: plan.kind });
        continue;
      }
      const tx = await ctx.payments.prepareSettlement({
        kind: plan.kind,
        bookingId: b.id,
        recipient,
        amountMicro: b.amountUsdc,
        feeBps: b.feeBps,
      });
      // Compare-and-set: only the worker that stores its signature first may send.
      const claimed = await db
        .update(bookings)
        .set({ settlementKind: plan.kind, settlementTx: tx.signature, settlementValidHeight: tx.lastValidBlockHeight })
        .where(and(eq(bookings.id, b.id), isNull(bookings.settlementTx), isNull(bookings.settledAt)))
        .returning({ id: bookings.id });
      if (!claimed.length) continue;
      await ctx.payments.send(tx);
      ctx.log("settlement sent", { bookingId: b.id, kind: plan.kind, tx: tx.signature });
    } catch (err) {
      ctx.log("settlement error", { bookingId: b.id, err: String(err) });
    }
  }
  return done;
}
