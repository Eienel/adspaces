import { CATEGORIES, SEGMENT_SHAPES, SHAPE_LABEL, campaignQuerySchema } from "@adspaces/shared";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign-card";
import { listOpenCampaigns } from "@/lib/campaigns";

export default async function AdBoard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = Object.fromEntries(Object.entries(await searchParams).filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string>;
  const parsed = campaignQuerySchema.safeParse(sp);
  const q = parsed.success ? parsed.data : campaignQuerySchema.parse({});
  const { items, hasMore } = await listOpenCampaigns(q);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ad board</h1>
          <p className="text-sm muted">Businesses looking for banner slots. Creators: offer a matching slot and get booked.</p>
        </div>
        <Link href="/business/ads/new" className="btn-ghost">
          Post an ad
        </Link>
      </div>
      <form className="panel grid gap-3 sm:grid-cols-3" method="get">
        <div>
          <label className="label">Slot size</label>
          <select name="shape" defaultValue={q.shape ?? ""} className="input">
            <option value="">Any</option>
            {SEGMENT_SHAPES.map((s) => (
              <option key={s} value={s}>
                {SHAPE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select name="category" defaultValue={q.category ?? ""} className="input">
            <option value="">Any</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end justify-end">
          <button className="btn">Apply</button>
        </div>
      </form>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="panel text-center muted">No open ads match.</div>
      )}
      {hasMore && (
        <Link className="btn-ghost" href={`/ads?${new URLSearchParams({ ...sp, page: String(q.page + 1) })}`}>
          More →
        </Link>
      )}
    </div>
  );
}
