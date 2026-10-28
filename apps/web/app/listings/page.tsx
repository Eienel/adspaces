import { CATEGORIES, listingQuerySchema } from "@adspaces/shared";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { searchListings } from "@/lib/listings";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Browse({ searchParams }: Props) {
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = listingQuerySchema.safeParse(flat);
  const q = parsed.success ? parsed.data : listingQuerySchema.parse({});
  const { items, hasMore } = await searchListings(q);
  const pageHref = (page: number) => `/listings?${new URLSearchParams({ ...(flat as Record<string, string>), page: String(page) })}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse banners</h1>
      <form className="panel grid gap-3 sm:grid-cols-5" method="get">
        <div className="sm:col-span-2">
          <label className="label">Search</label>
          <input name="q" defaultValue={q.q} placeholder="handle, name or title" className="input" />
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
        <div>
          <label className="label">Max $/day</label>
          <input name="maxPriceUsdc" defaultValue={q.maxPriceUsdc} inputMode="decimal" className="input" />
        </div>
        <div>
          <label className="label">Sort</label>
          <select name="sort" defaultValue={q.sort} className="input">
            <option value="newest">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="followers_desc">Followers</option>
          </select>
        </div>
        <div className="sm:col-span-5 flex justify-end">
          <button className="btn">Apply</button>
        </div>
      </form>

      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.id} l={l} />
          ))}
        </div>
      ) : (
        <div className="panel text-center muted">No banners match these filters.</div>
      )}

      <div className="flex justify-between">
        {q.page > 1 ? <Link className="btn-ghost" href={pageHref(q.page - 1)}>← Prev</Link> : <span />}
        {hasMore && <Link className="btn-ghost" href={pageHref(q.page + 1)}>Next →</Link>}
      </div>
    </div>
  );
}
