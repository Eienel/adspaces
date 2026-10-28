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

// Hero notes, like blink's floating chips: [text, position, colours, tilt, arrival delay].
const STICKERS = [
  ["Your ad here · $18/day", "top-[14%] left-[5%]", "bg-[var(--lime)] text-[var(--dark)]", "-6deg", "650ms"],
  ["Verified ✓", "top-[8%] right-[14%]", "bg-[var(--pink)] text-[var(--dark)]", "-3deg", "720ms"],
  ["Slot 2 · $9/day", "top-[30%] right-[4%]", "bg-white text-[var(--dark)]", "5deg", "790ms"],
  ["Paid in USDC", "top-[52%] left-[3%]", "bg-[var(--dark)] text-white", "4deg", "860ms"],
] as const;

const STEPS = [
  ["1. Connect X", "See your real banner and choose how many ad slots it has.", "bg-[var(--lavender)]", "-rotate-2"],
  ["2. Get booked", "Businesses book slots, or you offer slots to ads on the board.", "bg-[var(--mint)]", "rotate-1"],
  ["3. Weekly banner", "Every Monday we build one combined banner for you to upload.", "bg-[var(--peach)]", "-rotate-1"],
  ["4. Get paid", "We check it at random times and release USDC when the week ends.", "bg-[var(--lime)]", "rotate-2"],
] as const;

export default async function Home() {
  const { listings, campaigns } = await latest();
  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Hero: blink's sky gradient + glass card + floating stickers, wispr's serif headline. */}
      <section className="band-sky relative -mt-4 overflow-hidden rounded-[2.5rem] px-4 pt-16 pb-10 sm:rounded-[3.5rem] sm:px-10 sm:pt-24 sm:pb-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          {STICKERS.map(([text, pos, look, tilt, delay]) => (
            <span key={text} className={`drift absolute ${pos}`}>
              <span className={`sticker sticker-in block ${look}`} style={{ "--tilt": tilt, "--d": delay } as React.CSSProperties}>
                {text}
              </span>
            </span>
          ))}
        </div>
        <div className="panel-glass relative mx-auto max-w-4xl px-5 py-10 text-center sm:px-12 sm:py-14">
          <h1 className="display lines text-white">
            <span className="line">
              <span data-line>Your X banner is</span>
            </span>
            <span className="line">
              <span data-line style={{ "--i": 1 } as React.CSSProperties}>
                <em>ad space</em>.
              </span>
            </span>
          </h1>
          <p data-load className="mx-auto mt-6 max-w-2xl text-base font-medium text-white/90 sm:text-xl" style={{ "--d": "420ms" } as React.CSSProperties}>
            Split your banner into ad slots and rent them to businesses, one ad or three at a time. Payment waits in USDC escrow and is
            released when we&apos;ve verified your banner stayed up. Changing your banner doesn&apos;t affect your blue checkmark.
          </p>
          <div data-load className="mt-8 flex flex-wrap justify-center gap-3" style={{ "--d": "500ms" } as React.CSSProperties}>
            <Link href="/dashboard" className="btn-white btn-lg">
              I&apos;m a creator
            </Link>
            <Link href="/business" className="btn btn-lg">
              I&apos;m a business
            </Link>
          </div>
        </div>
        <div data-open className="relative mx-auto mt-8 max-w-3xl sm:mt-10">
          <BannerPreview
            className="ring-4 ring-white/40"
            imageUrl={null}
            segments={[
              { idx: 0, x: 0, y: 0, w: 1000, h: 500, label: "Your ad here", sublabel: "$18/day", state: "selected" },
              { idx: 1, x: 1000, y: 0, w: 500, h: 500, label: "Slot 2", sublabel: "$9/day" },
            ]}
          />
        </div>
      </section>

      {/* How it works: wispr's dark band with tilted colour cards. */}
      <section className="band band-dark band-round">
        <div className="mx-auto max-w-6xl">
          <div className="eyebrow text-center text-[var(--on-dark-muted)]">How it works</div>
          <h2 className="section-title mt-4 text-center">
            Four steps, <em>every week</em>.
          </h2>
          <div className="reveal mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d, bg, tilt], i) => (
              <div key={t} style={{ "--i": i } as React.CSSProperties} className={`${bg} ${tilt} rounded-[var(--radius-lg)] p-6 text-[var(--dark)] transition-[rotate] duration-[var(--t-ui)] hover:rotate-0 sm:min-h-56`}>
                <div className="font-[family-name:var(--font-serif)] text-3xl tracking-tight">{t}</div>
                <div className="mt-3 text-[15px] font-medium text-black/75">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="text-center">
          <h2 className="section-title">
            Simple <em>fees</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl muted">Free to list and free to browse. We take a small cut only when a booking pays out, and less on bigger deals.</p>
        </div>
        <FeeTable />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-4xl sm:text-5xl">Latest banners</h2>
          <Link href="/listings" className="btn-ghost">
            See all →
          </Link>
        </div>
        {listings.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="panel-sand text-center muted">No banners listed yet. Be the first.</div>
        )}
      </section>

      <section className="band band-green band-round">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-4xl sm:text-5xl">
              Open ads <em>looking for banners</em>
            </h2>
            <Link href="/ads" className="btn-white">
              Ad board →
            </Link>
          </div>
          {campaigns.length ? (
            <div className="grid gap-5 text-[var(--text)] sm:grid-cols-3">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-xl)] bg-white/10 p-6 text-center text-[var(--on-dark-muted)]">No open ads yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
