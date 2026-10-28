import { SHAPE_LABEL } from "@adspaces/shared";
import Link from "next/link";
import type { CampaignCardData } from "@/lib/campaigns";
import { displayName, usd } from "@/lib/format";

export function CampaignCard({ c }: { c: CampaignCardData }) {
  return (
    <Link href={`/ads/${c.id}`} className="panel block space-y-3 transition hover:border-[var(--accent)]">
      <img src={c.creativeUrl} alt="" className="max-h-40 w-full rounded-[var(--radius-sm)] bg-black/30 object-contain" />
      <div>
        <div className="truncate font-semibold">{c.title}</div>
        <div className="text-xs muted">by {displayName(c.business)}</div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="chip">{SHAPE_LABEL[c.shape]}</span>
        <span className="chip">{c.adCategory}</span>
        <span className="chip">{c.weeks} {c.weeks === 1 ? "week" : "weeks"}</span>
      </div>
      <div className="text-sm">
        Pays up to <b>{usd(c.maxPricePerDayUsdc)}</b>/day
      </div>
    </Link>
  );
}
