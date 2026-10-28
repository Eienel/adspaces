import Link from "next/link";
import { BannerPreview } from "@/components/banner-preview";
import { CampaignCard } from "@/components/campaign-card";
import { FeeTable } from "@/components/fee-table";
import { ListingCard } from "@/components/listing-card";
import { listOpenCampaigns } from "@/lib/campaigns";
import { searchListings } from "@/lib/listings";

// Static + revalidated: served from the CDN under heavy traffic.
export const revalidate = 60;

async function latest() {
  try {
    const [l, c] = await Promise.all([searchListings({ sort: "newest", page: 1 }), listOpenCampaigns({ page: 1 })]);
    return { listings: l.items.slice(0, 6), campaigns: c.items.slice(0, 3) };
  } catch (err) {
    console.warn("home: data unavailable", String(err));
    return { listings: [], campaigns: [] };
  }
}

export default async function Home() {
  const { listings, campaigns } = await latest();
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Your X banner is <span className="text-[var(--accent)]">ad space</span>.
          </h1>
          <p className="text-lg muted">
            Split your banner into ad slots and rent them to businesses, one ad or three at a time. Payment waits in USDC escrow and is
            released when we&apos;ve verified your banner stayed up. Changing your banner doesn&apos;t affect your blue checkmark.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn">
              I&apos;m a creator
            </Link>
            <Link href="/business" className="btn-ghost">
              I&apos;m a business
            </Link>
          </div>
        </div>
        <BannerPreview
          imageUrl={null}
          segments={[
            { idx: 0, x: 0, y: 0, w: 1000, h: 500, label: "Your ad here", sublabel: "$18/day", state: "selected" },
            { idx: 1, x: 1000, y: 0, w: 500, h: 500, label: "Slot 2", sublabel: "$9/day" },
          ]}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["1. Connect X", "See your real banner and choose how many ad slots it has."],
          ["2. Get booked", "Businesses book slots, or you offer slots to ads on the board."],
          ["3. Weekly banner", "Every Monday we build one combined banner for you to upload."],
          ["4. Get paid", "We check it at random times and release USDC when the week ends."],
        ].map(([t, d]) => (
          <div key={t} className="panel">
            <div className="font-semibold">{t}</div>
            <div className="mt-1 text-sm muted">{d}</div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Simple fees</h2>
          <p className="text-sm muted">Free to list and free to browse. We take a small cut only when a booking pays out, and less on bigger deals.</p>
        </div>
        <FeeTable />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest banners</h2>
          <Link href="/listings" className="text-sm text-[var(--accent)]">
            See all →
          </Link>
        </div>
        {listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="panel text-center muted">No banners listed yet. Be the first.</div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Open ads looking for banners</h2>
          <Link href="/ads" className="text-sm text-[var(--accent)]">
            Ad board →
          </Link>
        </div>
        {campaigns.length ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <div className="panel text-center muted">No open ads yet.</div>
        )}
      </section>
    </div>
  );
}
