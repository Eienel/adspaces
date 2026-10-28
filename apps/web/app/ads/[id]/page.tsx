import { SHAPE_LABEL } from "@adspaces/shared";
import { notFound } from "next/navigation";
import { OfferForm } from "@/components/offer-form";
import { SignInLink } from "@/components/user-menu";
import { getCampaign } from "@/lib/campaigns";
import { publicConfig } from "@/lib/env";
import { displayName, usd } from "@/lib/format";
import { getListingBySeller, segmentAvailability } from "@/lib/listings";
import { currentUserId, isUuid } from "@/lib/session";

export default async function AdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const c = await getCampaign(id);
  if (!c) notFound();
  const userId = await currentUserId();
  const listing = userId ? await getListingBySeller(userId) : null;
  const avail = listing ? await segmentAvailability(listing.id) : null;
  const matching =
    listing && avail && listing.status === "active"
      ? listing.segments
          .filter((s) => s.shape === c.shape && s.pricePerDayUsdc <= c.maxPricePerDayUsdc)
          .map((s) => ({ id: s.id, idx: s.idx, shape: s.shape, pricePerDayUsdc: s.pricePerDayUsdc, taken: [...(avail.taken.get(s.id) ?? [])] }))
      : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="panel space-y-4">
        <img src={c.creativeUrl} alt="" className="w-full rounded-[var(--radius-sm)] bg-black/30 object-contain" />
        <h1 className="text-2xl font-bold">{c.title}</h1>
        <div className="text-sm muted">by {displayName(c.business)}</div>
        {c.brief && <p className="whitespace-pre-wrap text-sm">{c.brief}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip">{SHAPE_LABEL[c.shape]}</span>
          <span className="chip">{c.adCategory}</span>
          <span className="chip">
            {c.weeks} {c.weeks === 1 ? "week" : "weeks"}
          </span>
          <span className="chip">up to {usd(c.maxPricePerDayUsdc)}/day</span>
          {c.audience.map((a) => (
            <span key={a} className="chip muted">
              {a}
            </span>
          ))}
        </div>
      </div>
      <aside className="panel h-fit space-y-4">
        <h2 className="font-semibold">Offer your banner slot</h2>
        {c.status !== "open" ? (
          <p className="text-sm muted">This ad is closed.</p>
        ) : !userId ? (
          <SignInLink label="Sign in with X to offer a slot" next={`/ads/${c.id}`} />
        ) : userId === c.business.id ? (
          <p className="text-sm muted">This is your ad.</p>
        ) : !listing ? (
          <p className="text-sm muted">
            List your banner first on the <a className="text-[var(--accent)]" href="/dashboard">creator dashboard</a>.
          </p>
        ) : (
          <OfferForm campaignId={c.id} weeks={c.weeks} segments={matching} cycles={avail!.cycles.map((x) => x.toISOString())} maxPricePerDayUsdc={c.maxPricePerDayUsdc} maxBookingUsdc={publicConfig.maxBookingUsdc} />
        )}
      </aside>
    </div>
  );
}
