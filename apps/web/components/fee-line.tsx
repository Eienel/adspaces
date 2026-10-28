import { feeBpsForAmount, microToUsdc, splitPayment } from "@adspaces/shared";

/** "Platform fee 2.5% · creator receives $X" for a total (tiered, ADR-0014), plus the beta-cap warning. */
export function FeeLine({ totalMicro, maxBookingUsdc }: { totalMicro: number; maxBookingUsdc: number }) {
  if (!Number.isFinite(totalMicro) || totalMicro <= 0) return null;
  const bps = feeBpsForAmount(totalMicro);
  const { payout } = splitPayment(totalMicro, bps);
  const over = totalMicro > maxBookingUsdc * 1_000_000;
  return (
    <div className="text-xs">
      <span className="muted">
        Platform fee {bps / 100}% · creator receives ${microToUsdc(payout)}
      </span>
      {over && <div className="mt-1 text-[var(--bad)]">During the beta, bookings are capped at ${maxBookingUsdc.toLocaleString("en-US")}.</div>}
    </div>
  );
}
