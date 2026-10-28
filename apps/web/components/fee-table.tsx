import { FEE_TIERS } from "@adspaces/shared";

/** The tiered platform fee (ADR-0014), rendered from the same table the code charges. */
export function FeeTable() {
  const tiers = [...FEE_TIERS].sort((a, b) => a.minUsdcMicro - b.minUsdcMicro);
  const looks = ["bg-[var(--lime)]", "bg-[var(--panel)]", "bg-[var(--lavender)]"];
  const tilts = ["-rotate-3", "rotate-2", "-rotate-1"];
  return (
    <div className="relative">
      {/* The line the tags hang from. */}
      <div aria-hidden className="absolute inset-x-0 top-0 hidden border-t-2 border-[var(--dark)] sm:block" />
      <div className="reveal grid gap-8 sm:grid-cols-3 sm:gap-6">
        {tiers.map((t, i) => {
          const from = t.minUsdcMicro / 1e6;
          const to = tiers[i + 1] ? tiers[i + 1]!.minUsdcMicro / 1e6 : null;
          return (
            <div key={t.feeBps} className="flex flex-col items-center" style={{ "--i": i } as React.CSSProperties}>
              <div aria-hidden className="hidden h-6 w-0.5 bg-[var(--dark)] sm:block" />
              <div className={`w-full max-w-[260px] origin-top drop-shadow-[0_18px_22px_rgb(0_0_0/0.16)] ${tilts[i % 3]}`}>
                <div className={`tag-v ${looks[i % 3]}`}>
                  <div className="font-[family-name:var(--font-serif)] text-6xl tracking-tight">{t.feeBps / 100}%</div>
                  <div className="mt-2 text-sm font-semibold">{to === null ? `bookings of $${from}+` : from === 0 ? `bookings under $${to}` : `bookings $${from}–$${to - 0.01}`}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
