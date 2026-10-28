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

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

// Price tags hung on the banner proof: [text, position, colours, tilt, arrival delay].
const TAGS = [
  ["$18/day", "-top-5 left-[18%]", "bg-[var(--lime)] text-[var(--dark)]", "-7deg", "1350ms"],
  ["$9/day", "-bottom-5 right-[8%]", "bg-white text-[var(--dark)]", "6deg", "1450ms"],
] as const;

const TAPE = ["Ad space available", "Paid in USDC escrow", "One ad or three", "Your blue check stays"];

const STEPS = [
  ["Connect X", "See your real banner and choose how many ad slots it has.", "var(--lavender)"],
  ["Get booked", "Businesses book slots, or you offer slots to ads on the board.", "var(--mint)"],
  ["Weekly banner", "Every Monday we build one combined banner for you to upload.", "var(--peach)"],
  ["Get paid", "We check it at random times and release USDC when the week ends.", "var(--lime)"],
] as const;

export default async function Home() {
  const { listings, campaigns } = await latest();
  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Hero. Signature: "ad space" is an empty slot in the headline that fills with lime and gets stamped. */}
      <section className="grid items-center gap-14 pt-4 sm:pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <h1 className="display lines">
            <span className="line">
              <span data-line>Your X banner</span>
            </span>
            <span className="line pt-[0.12em]">
              <span data-line style={{ "--i": 1 } as Vars}>
                is{" "}
                <span className="slot-word">
                  <em>ad space</em>
                </span>
                .
                <span data-stamp aria-hidden className="stamp ml-[0.35em] -translate-y-[0.35em] align-middle font-[family-name:var(--font-sans)] text-[11px] leading-none text-[var(--green)] sm:px-3 sm:py-1.5 sm:text-[17px]">
                  Booked
                </span>
              </span>
            </span>
          </h1>
          <p data-load className="mt-7 max-w-xl text-base font-medium muted sm:text-lg" style={{ "--d": "450ms" } as Vars}>
            Split your banner into ad slots and rent them to businesses, one ad or three at a time. Payment waits in USDC escrow and is
            released when we&apos;ve verified your banner stayed up. Changing your banner doesn&apos;t affect your blue checkmark.
          </p>
          <div data-load className="mt-8 flex flex-wrap gap-3" style={{ "--d": "550ms" } as Vars}>
            <Link href="/dashboard" className="btn btn-lg">
              I&apos;m a creator
            </Link>
            <Link href="/business" className="btn-ghost btn-lg">
              I&apos;m a business
            </Link>
          </div>
        </div>

        {/* The banner as a print proof: flat poster blue, crop marks, price tags hung on its slots. */}
        <div data-load className="relative mx-3 rotate-[1.5deg] sm:mx-6" style={{ "--d": "300ms" } as Vars}>
          <div className="crop rounded-[var(--radius-lg)] bg-[var(--sky)] p-4 text-[var(--dark)] shadow-[var(--shadow-card)] sm:p-6">
            <BannerPreview
              imageUrl={null}
              segments={[
                { idx: 0, x: 0, y: 0, w: 1000, h: 500, label: "Your ad here", sublabel: "Slot 1", state: "selected" },
                { idx: 1, x: 1000, y: 0, w: 500, h: 500, label: "Slot 2" },
              ]}
            />
            <div className="mt-3 flex justify-between text-[11px] font-semibold tracking-[0.12em] uppercase sm:text-xs">
              <span>1500 × 500</span>
              <span>2 slots</span>
            </div>
          </div>
          {TAGS.map(([text, pos, look, tilt, d]) => (
            <span key={text} aria-hidden className={`drift absolute ${pos}`}>
              <span className={`tag deal ${look}`} style={{ "--tilt": tilt, "--d": d } as Vars}>
                {text}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* One tape per page, like the "Ad space available" tag on unsold slots. */}
      <div className="tape" aria-hidden>
        <div className="tape-band">
        <div className="tape-track">
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-8 pr-8">
              {TAPE.map((t) => (
                <span key={t} className="flex items-center gap-8">
                  {t} <span className="text-[var(--green)]">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
        </div>
      </div>

      {/* How it works: the four steps are one banner split into four slots that get booked as you scroll. */}
      <section className="band band-dark band-round">
        <div className="mx-auto max-w-6xl">
          <div className="eyebrow text-[var(--on-dark-muted)]">How it works</div>
          <h2 className="section-title mt-4 max-w-3xl">
            Four slots, <em>one week</em>.
          </h2>
          <div className="strip mt-12">
            {STEPS.map(([t, d, fill], i) => (
              <div key={t} style={{ "--i": i, "--fill": fill } as Vars}>
                <span aria-hidden className="strip-fill" />
                <div className="strip-ink relative">
                  <div className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-70">Slot {i + 1}</div>
                  <div className="mt-6 font-[family-name:var(--font-serif)] text-4xl tracking-tight sm:mt-10">{t}</div>
                  <div className="mt-3 text-[15px] font-medium opacity-80">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-10">
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
          <div className="slot-empty">No banners listed yet. Be the first.</div>
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
            <div className="slot-empty border-[var(--on-dark)]/30 text-[var(--on-dark-muted)]">No open ads yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
