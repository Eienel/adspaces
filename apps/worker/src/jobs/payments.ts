/** Watch accepted bookings for their Solana Pay payment (ADR-0003). */
import { bookings } from "@adspaces/db";
import { transition } from "@adspaces/shared";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import type { JobContext } from "../context";

export async function watchPayments(ctx: JobContext): Promise<number> {
  const { db } = ctx;
  const pending = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, "accepted"), isNotNull(bookings.paymentReference)))
    .limit(200);

  let funded = 0;
  for (const b of pending) {
    try {
      const payment = await ctx.payments.findPayment({ reference: b.paymentReference!, amountMicro: b.amountUsdc });
      if (!payment) continue;
      const now = ctx.now();
      const firstCheck = new Date(Math.max(now.getTime() + 5 * 60 * 1000, b.cycleStart.getTime()));
      const updated = await db
        .update(bookings)
        .set({
          status: transition("accepted", "fund"),
          fundingTx: payment.signature,
          payerWallet: payment.payer,
          fundedAt: now,
          nextCheckAt: firstCheck,
        })
        .where(and(eq(bookings.id, b.id), eq(bookings.status, "accepted")))
        .returning({ id: bookings.id });
      if (updated.length) {
        funded++;
        ctx.log("booking funded", { bookingId: b.id, tx: payment.signature });
      }
    } catch (err) {
      ctx.log("payment lookup failed", { bookingId: b.id, err: String(err) });
    }
  }

  // Payments that land after a booking was cancelled at the cutoff are recorded so settlement refunds them.
  const recent = new Date(ctx.now().getTime() - 14 * 24 * 60 * 60 * 1000);
  const cancelled = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, "cancelled"), isNotNull(bookings.paymentReference), isNull(bookings.fundingTx), gt(bookings.cycleStart, recent)))
    .limit(100);
  for (const b of cancelled) {
    const payment = await ctx.payments.findPayment({ reference: b.paymentReference!, amountMicro: b.amountUsdc }).catch(() => null);
    if (!payment) continue;
    await db.update(bookings).set({ fundingTx: payment.signature, payerWallet: payment.payer, fundedAt: ctx.now() }).where(eq(bookings.id, b.id));
    ctx.log("late payment on cancelled booking; will refund", { bookingId: b.id });
  }
  return funded;
}
