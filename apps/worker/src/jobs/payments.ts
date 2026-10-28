/** Watch accepted bookings for their Solana Pay payment (ADR-0003). */
import { bookings } from "@adspaces/db";
import { transition } from "@adspaces/shared";
import { and, eq, isNotNull, lt } from "drizzle-orm";
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
      const updated = await db
        .update(bookings)
        .set({
          status: transition("accepted", "fund"),
          fundingTx: payment.signature,
          payerWallet: payment.payer,
          fundedAt: now,
          // Seller now needs to set the banner; first check soon.
          nextCheckAt: new Date(now.getTime() + 5 * 60 * 1000),
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

  // Cancel accepted bookings that were never paid.
  const cutoff = new Date(ctx.now().getTime() - ctx.config.paymentWindowMs);
  await db
    .update(bookings)
    .set({ status: transition("accepted", "cancel") })
    .where(and(eq(bookings.status, "accepted"), lt(bookings.acceptedAt, cutoff)));

  return funded;
}
