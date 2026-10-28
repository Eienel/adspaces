import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { searchListings } from "@/lib/listings";

// Static + revalidated: served from the CDN under heavy traffic.
export const revalidate = 60;

async function latest() {
  try {
    return (await searchListings({ sort: "newest", page: 1 })).items.slice(0, 6);
  } catch (err) {
    console.warn("home: listings unavailable", String(err));
    return [];
  }
}

export default async function Home() {
  const items = await latest();
  return (
    <div className="space-y-14">
      <section className="space-y-5 pt-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your X banner is <span className="text-[var(--accent)]">ad space</span>.
        </h1>
        <p className="mx-auto max-w-2xl text-lg muted">
          Rent your profile banner to advertisers. Payment is held in USDC escrow and released automatically once we
          verify your banner stayed up. Changing your banner does not affect your blue checkmark.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard" className="btn">
            List my banner
          </Link>
          <Link href="/listings" className="btn-ghost">
            Browse banners
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. List", "Sign in with X, link a Solana wallet and set your daily price."],
          ["2. Get booked", "Advertisers upload a 1500×500 creative and pay into escrow in USDC."],
          ["3. Get paid", "Set the banner. We check it at random times and release payment at the end."],
        ].map(([t, d]) => (
          <div key={t} className="panel">
            <div className="font-semibold">{t}</div>
            <div className="mt-1 text-sm muted">{d}</div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest banners</h2>
          <Link href="/listings" className="text-sm text-[var(--accent)]">
            See all →
          </Link>
        </div>
        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="panel text-center muted">No listings yet. Be the first.</div>
        )}
      </section>
    </div>
  );
}
