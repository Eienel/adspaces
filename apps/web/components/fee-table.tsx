import { FEE_TIERS } from "@adspaces/shared";

/** The tiered platform fee (ADR-0014), rendered from the same table the code charges. */
export function FeeTable() {
  const tiers = [...FEE_TIERS].sort((a, b) => a.minUsdcMicro - b.minUsdcMicro);
  return (
    <div className="reveal grid gap-4 sm:grid-cols-3">
      {tiers.map((t, i) => {
        const from = t.minUsdcMicro / 1e6;
        const to = tiers[i + 1] ? tiers[i + 1]!.minUsdcMicro / 1e6 : null;
        return (
          <div key={t.feeBps} className="panel py-8 text-center" style={{ "--i": i } as React.CSSProperties}>
            <div className="font-[family-name:var(--font-serif)] text-6xl tracking-tight">{t.feeBps / 100}%</div>
            <div className="mt-2 text-sm font-medium muted">{to === null ? `bookings of $${from}+` : from === 0 ? `bookings under $${to}` : `bookings $${from}–$${to - 0.01}`}</div>
          </div>
        );
      })}
    </div>
  );
}
