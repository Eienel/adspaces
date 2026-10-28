import { estimatedCpmUsdc } from "@adspaces/shared";
import { notFound } from "next/navigation";
import { SegmentBooker } from "@/components/segment-booker";
import { compact } from "@/lib/format";
import { getListing, segmentAvailability } from "@/lib/listings";
import { isUuid } from "@/lib/session";

// Availability changes as bookings land, so keep this short.
export const revalidate = 30;

export function generateStaticParams() {
  return [];
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const l = await getListing(id);
  if (!l || l.status !== "active") notFound();
  const { cycles, taken } = await segmentAvailability(l.id);
  const totalPerDay = l.segments.reduce((s, x) => s + x.pricePerDayUsdc, 0);
  const cpm = estimatedCpmUsdc(totalPerDay, l.seller.estDailyViews);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="panel space-y-5">
          <div className="flex items-center gap-3">
            {l.seller.avatarUrl && <img src={l.seller.avatarUrl} alt="" className="h-12 w-12 rounded-full" />}
            <div>
              <div className="text-lg font-semibold">
                {l.seller.name} {l.seller.verified && <span className="text-sky-400">✓</span>}
              </div>
              <a href={`https://x.com/${l.seller.handle}`} target="_blank" className="text-sm muted hover:underline">
                @{l.seller.handle}
              </a>
            </div>
          </div>
          <SegmentBooker
            listingId={l.id}
            sellerId={l.seller.id}
            bannerUrl={l.originalBannerUrl ?? l.seller.bannerUrl}
            cycles={cycles.map((c) => c.toISOString())}
            minWeeks={l.minWeeks}
            maxWeeks={l.maxWeeks}
            blocked={l.blockedCategories}
            segments={l.segments.map((s) => ({ id: s.id, idx: s.idx, shape: s.shape, x: s.x, y: s.y, w: s.w, h: s.h, pricePerDayUsdc: s.pricePerDayUsdc, taken: [...(taken.get(s.id) ?? [])] }))}
          />
        </div>
      </div>
      <aside className="panel h-fit space-y-3">
        <h1 className="text-xl font-bold">{l.title}</h1>
        {l.description && <p className="whitespace-pre-wrap text-sm muted">{l.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Followers" value={compact(l.seller.followersCount)} />
          <Stat label="Est. views/day" value={`~${compact(l.seller.estDailyViews)}`} />
          <Stat label="Ad slots" value={String(l.segments.length)} />
          <Stat label="Whole-banner CPM" value={cpm === null ? "—" : `$${cpm.toFixed(2)}`} />
        </div>
        {!!l.categories.length && <p className="text-xs muted">Audience: {l.categories.join(", ")}</p>}
        {!!l.blockedCategories.length && <p className="text-xs muted">Won&apos;t run: {l.blockedCategories.join(", ")}</p>}
        <p className="text-xs muted">
          Bookings run in whole weeks, Monday to Monday (UTC). View estimates are modelled from public X metrics, not exact profile-visit counts.
        </p>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-black/20 p-3">
      <div className="text-xs muted">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
