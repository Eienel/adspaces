import Link from "next/link";
import { compact, usd } from "@/lib/format";
import type { searchListings } from "@/lib/listings";

type Item = Awaited<ReturnType<typeof searchListings>>["items"][number];

export function ListingCard({ l }: { l: Item }) {
  return (
    <Link href={`/listings/${l.id}`} className="panel block overflow-hidden p-0 transition hover:border-[var(--accent)]">
      <div className="aspect-[3/1] bg-gradient-to-r from-[#1d2033] to-[#2a2050]">
        {l.seller.bannerUrl && <img src={`${l.seller.bannerUrl}/600x200`} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          {l.seller.avatarUrl && <img src={l.seller.avatarUrl} alt="" className="h-8 w-8 rounded-full" />}
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {l.seller.name} {l.seller.verified && <span className="text-sky-400">✓</span>}
            </div>
            <div className="truncate text-xs muted">@{l.seller.handle}</div>
          </div>
        </div>
        <div className="truncate text-sm">{l.title}</div>
        <div className="flex items-end justify-between">
          <div className="text-xs muted">
            {compact(l.seller.followersCount)} followers · ~{compact(l.seller.estDailyViews)} views/day
          </div>
          <div className="text-right">
            <div className="font-bold">{usd(l.pricePerDayUsdc)}</div>
            <div className="text-xs muted">per day</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
