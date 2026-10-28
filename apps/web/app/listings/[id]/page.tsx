import { estimatedCpmUsdc } from "@adspaces/shared";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { compact, usd } from "@/lib/format";
import { getListing } from "@/lib/listings";
import { isUuid } from "@/lib/session";

export const revalidate = 60;

// Rendered on first request, then cached and revalidated (ISR).
export function generateStaticParams() {
  return [];
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const l = await getListing(id);
  if (!l || l.status !== "active") notFound();
  const cpm = estimatedCpmUsdc(l.pricePerDayUsdc, l.seller.estDailyViews);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="panel overflow-hidden p-0">
          <div className="aspect-[3/1] bg-gradient-to-r from-[#1d2033] to-[#2a2050]">
            {l.seller.bannerUrl && <img src={`${l.seller.bannerUrl}/1500x500`} alt="Current banner" className="h-full w-full object-cover" />}
          </div>
          <div className="flex items-center gap-3 p-5">
            {l.seller.avatarUrl && <img src={l.seller.avatarUrl} alt="" className="h-14 w-14 rounded-full" />}
            <div>
              <div className="text-lg font-semibold">
                {l.seller.name} {l.seller.verified && <span className="text-sky-400">✓</span>}
              </div>
              <a href={`https://x.com/${l.seller.handle}`} target="_blank" className="text-sm muted hover:underline">
                @{l.seller.handle}
              </a>
            </div>
          </div>
        </div>
        <div className="panel space-y-3">
          <h1 className="text-xl font-bold">{l.title}</h1>
          {l.description && <p className="whitespace-pre-wrap text-sm muted">{l.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Followers" value={compact(l.seller.followersCount)} />
            <Stat label="Est. views/day" value={`~${compact(l.seller.estDailyViews)}`} />
            <Stat label="Est. CPM" value={cpm === null ? "—" : `$${cpm.toFixed(2)}`} />
            <Stat label="Booking length" value={`${l.minDays}–${l.maxDays} days`} />
          </div>
          {!!l.categories.length && <p className="text-xs muted">Audience: {l.categories.join(", ")}</p>}
          {!!l.blockedCategories.length && <p className="text-xs muted">Won&apos;t run: {l.blockedCategories.join(", ")}</p>}
          <p className="text-xs muted">View estimates are modelled from public X metrics, not exact profile-visit counts.</p>
        </div>
      </div>
      <aside className="panel h-fit space-y-4">
        <div>
          <div className="text-3xl font-bold">{usd(l.pricePerDayUsdc)}</div>
          <div className="text-sm muted">USDC per day</div>
        </div>
        <BookingForm
          listingId={l.id}
          sellerId={l.seller.id}
          pricePerDayMicro={l.pricePerDayUsdc}
          minDays={l.minDays}
          maxDays={l.maxDays}
          blocked={l.blockedCategories}
        />
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <div className="text-xs muted">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
