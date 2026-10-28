import { layoutSegments } from "@adspaces/shared";
import Link from "next/link";
import { BannerPreview } from "@/components/banner-preview";
import { compact, usd } from "@/lib/format";
import type { ListingCardData } from "@/lib/listings";

export function ListingCard({ l }: { l: ListingCardData }) {
  const segs = layoutSegments(l.layout);
  return (
    <Link href={`/listings/${l.id}`} className="panel lift block overflow-hidden p-0">
      <BannerPreview
        className="rounded-none"
        imageUrl={l.originalBannerUrl ?? l.seller.bannerUrl}
        segments={segs.length > 1 ? segs.map((s) => ({ idx: s.idx, ...s.rect, state: "dim" as const })) : []}
      />
      <div className="space-y-2.5 p-5">
        <div className="flex items-center gap-2">
          {l.seller.avatarUrl && <img src={l.seller.avatarUrl} alt="" className="h-8 w-8 rounded-full" />}
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {l.seller.name} {l.seller.verified && <span className="text-[var(--accent-2)]">✓</span>}
            </div>
            <div className="truncate text-xs muted">@{l.seller.handle}</div>
          </div>
        </div>
        <div className="truncate font-[family-name:var(--font-serif)] text-xl tracking-tight">{l.title}</div>
        <div className="flex items-end justify-between">
          <div className="text-xs muted">
            {compact(l.seller.followersCount)} followers · ~{compact(l.seller.estDailyViews)} views/day
            <br />
            {segs.length} ad {segs.length === 1 ? "slot" : "slots"}
          </div>
          <div className="text-right">
            <div className="font-[family-name:var(--font-serif)] text-2xl leading-none">from {usd(l.minPricePerDayUsdc)}</div>
            <div className="text-xs muted">per day</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
