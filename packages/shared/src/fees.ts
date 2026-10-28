/** Fee math. Rounding always favors the seller (fee is floored). See docs/04-payments-escrow.md. */
export const BPS_DENOMINATOR = 10_000;

export function computeFee(amountMicro: number, feeBps: number): number {
  if (!Number.isSafeInteger(amountMicro) || amountMicro < 0) throw new Error("amount must be a non-negative integer");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > BPS_DENOMINATOR) throw new Error("feeBps must be 0..10000");
  // Split to avoid overflow past 2^53 on large amounts.
  const q = Math.floor(amountMicro / BPS_DENOMINATOR);
  const r = amountMicro % BPS_DENOMINATOR;
  return q * feeBps + Math.floor((r * feeBps) / BPS_DENOMINATOR);
}

export function splitPayment(amountMicro: number, feeBps: number): { fee: number; payout: number } {
  const fee = computeFee(amountMicro, feeBps);
  return { fee, payout: amountMicro - fee };
}

export function bookingTotal(pricePerDayMicro: number, days: number): number {
  if (!Number.isInteger(days) || days < 1) throw new Error("days must be a positive integer");
  const total = pricePerDayMicro * days;
  if (!Number.isSafeInteger(total)) throw new Error("total too large");
  return total;
}

/**
 * Platform fee by booking size (ADR-0014): bigger bookings pay a lower %. Max 2.5%, min 0.75%.
 * `minUsdcMicro` is inclusive. Keep this table in sync with docs/04-payments-escrow.md and the home page.
 */
export const FEE_TIERS: readonly { minUsdcMicro: number; feeBps: number }[] = [
  { minUsdcMicro: 500_000_000, feeBps: 75 },
  { minUsdcMicro: 100_000_000, feeBps: 150 },
  { minUsdcMicro: 0, feeBps: 250 },
];

export function feeBpsForAmount(amountMicro: number): number {
  return FEE_TIERS.find((t) => amountMicro >= t.minUsdcMicro)!.feeBps;
}

/** Beta limit per booking while escrow is custodial (ADR-0015). Override with MAX_BOOKING_USDC. */
export const DEFAULT_MAX_BOOKING_USDC = 1_000;
