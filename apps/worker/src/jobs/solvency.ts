/**
 * Escrow solvency check (ADR-0015). The platform owes every paid-but-unsettled booking its full amount.
 * If the escrow wallet holds less than that, something is badly wrong (bug, key leak): log loudly.
 * Monitoring only: it never moves money.
 */
import { bookings } from "@adspaces/db";
import { and, inArray, isNotNull, isNull, or, eq, sum } from "drizzle-orm";
import type { JobContext } from "../context";

export async function owedMicro(ctx: Pick<JobContext, "db">): Promise<number> {
  const [row] = await ctx.db
    .select({ total: sum(bookings.amountUsdc) })
    .from(bookings)
    .where(
      and(
        isNull(bookings.settledAt),
        or(inArray(bookings.status, ["funded", "live", "disputed"]), and(eq(bookings.status, "cancelled"), isNotNull(bookings.fundingTx))),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function checkSolvency(ctx: JobContext, balanceMicro: () => Promise<number>): Promise<"ok" | "short"> {
  const [owed, balance] = await Promise.all([owedMicro(ctx), balanceMicro()]);
  if (balance < owed) {
    ctx.log("ALERT escrow balance below what is owed", { balanceMicro: balance, owedMicro: owed, shortMicro: owed - balance });
    return "short";
  }
  ctx.log("escrow ok", { balanceMicro: balance, owedMicro: owed });
  return "ok";
}
