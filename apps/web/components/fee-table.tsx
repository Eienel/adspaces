import { FEE_TIERS } from "@adspaces/shared";

/** The tiered platform fee (ADR-0014), rendered from the same table the code charges. */
export function FeeTable() {
  const tiers = [...FEE_TIERS].sort((a, b) => a.minUsdcMicro - b.minUsdcMicro);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiers.map((t, i) => {
        const from = t.minUsdcMicro / 1e6;
        const to = tiers[i + 1] ? tiers[i + 1]!.minUsdcMicro / 1e6 : null;
        return (
          <div key={t.feeBps} className="panel text-center">
            <div className="text-3xl font-bold">{t.feeBps / 100}%</div>
            <div className="mt-1 text-sm muted">{to === null ? `bookings of $${from}+` : from === 0 ? `bookings under $${to}` : `bookings $${from}–$${to - 0.01}`}</div>
          </div>
        );
      })}
    </div>
  );
}
