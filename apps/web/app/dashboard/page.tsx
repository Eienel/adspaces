import { users } from "@adspaces/db";
import { cycleStart } from "@adspaces/shared";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { BannerEditor } from "@/components/banner-editor";
import { BookingActions } from "@/components/booking-actions";
import { BookingList } from "@/components/booking-list";
import { LinkWallet } from "@/components/link-wallet";
import { SignInLink } from "@/components/user-menu";
import { listMyBookings } from "@/lib/bookings";
import { db } from "@/lib/db";
import { DEV_MODE } from "@/lib/env";
import { compact, fmtCycle, usd } from "@/lib/format";
import { compositionsFor, getListingBySeller, segmentAvailability } from "@/lib/listings";
import { currentUserId } from "@/lib/session";

export default async function CreatorDashboard() {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-bold">Rent out your banner</h1>
        <p className="text-sm muted">Sign in with X so businesses know the banner is really yours.</p>
        <SignInLink next="/dashboard" />
      </div>
    );
  }
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  if (!user.xId) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-bold">Creator tools need X</h1>
        <p className="text-sm muted">You signed in with a wallet, which works for businesses. To rent out a banner, sign in with X.</p>
        <Link className="btn" href="/business">
          Go to business portal
        </Link>
      </div>
    );
  }

  const [listing, bookings] = await Promise.all([getListingBySeller(userId), listMyBookings(userId)]);
  const mine = bookings.filter((b) => b.booking.sellerId === userId);
  const open = mine.filter((b) => ["requested", "accepted", "funded", "live", "disputed"].includes(b.booking.status));
  const earned = mine.filter((b) => b.booking.status === "completed").reduce((s, b) => s + b.booking.amountUsdc, 0);
  const comps = listing ? await compositionsFor(listing.id) : [];
  const avail = listing ? await segmentAvailability(listing.id, 6) : null;
  const thisWeek = cycleStart(new Date());
  const paid = mine.find((b) => ["funded", "live"].includes(b.booking.status));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Followers" value={compact(user.followersCount)} />
        <Stat label="Est. profile views/day" value={`~${compact(user.estDailyViews)}`} />
        <Stat label="Your banner cap" value={`${usd(user.maxPricePerDayUsdc)}/day`} />
        <Stat label="Completed (gross)" value={usd(earned)} />
      </div>

      {comps.map((c) => {
        const current = c.cycleStart.getTime() === thisWeek.getTime();
        const unchanged = comps.length > 1 && comps[0]!.contentHash === comps[1]!.contentHash && c === comps[0];
        return (
          <section key={c.id} className="panel space-y-3 border-[var(--accent)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {current ? "This week's banner" : "Next week's banner"} · {fmtCycle(c.cycleStart)}
              </h2>
              <span className="text-xs muted">{c.bookingIds.length} ad{c.bookingIds.length === 1 ? "" : "s"}</span>
            </div>
            <img src={c.imageUrl} alt="Your banner for this week" className="aspect-[3/1] w-full rounded-[var(--radius)] object-cover" />
            <p className="text-sm muted">
              {unchanged
                ? "Same as last week, no change needed."
                : current
                  ? "Set this as your X header image now, then press the button so we check it."
                  : "Set this as your X header image on Monday 00:00 UTC (you have 24h). Businesses are refunded if it isn't up."}
            </p>
            <div className="flex flex-wrap gap-2">
              <a className="btn-ghost" href={c.imageUrl} download>
                Download banner
              </a>
              {paid && (
                <BookingActions id={paid.booking.id} compositionId={c.id} actions={[...(DEV_MODE ? (["dev_set_banner"] as const) : []), ...(current ? (["mark_live"] as const) : [])]} />
              )}
            </div>
          </section>
        );
      })}

      <section className="panel space-y-3">
        <h2 className="font-semibold">Payout wallet</h2>
        <LinkWallet linked={user.walletPubkey} />
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your banner & ad slots</h2>
          {listing && (
            <Link href={`/listings/${listing.id}`} className="text-sm text-[var(--accent)]">
              Public page →
            </Link>
          )}
        </div>
        <BannerEditor
          initial={listing ? { ...listing, segments: listing.segments.map((s) => ({ idx: s.idx, pricePerDayUsdc: s.pricePerDayUsdc })) } : null}
          capMicro={user.maxPricePerDayUsdc}
          bannerUrl={listing?.originalBannerUrl ?? user.bannerUrl}
          canList={!!user.walletPubkey}
          locked={open.length > 0}
        />
      </section>

      {listing && avail && (
        <section className="panel space-y-3 overflow-x-auto">
          <h2 className="font-semibold">Upcoming weeks</h2>
          <table className="w-full text-center text-xs">
            <thead>
              <tr>
                <th className="py-1 text-left font-medium muted">Slot</th>
                {avail.cycles.map((c) => (
                  <th key={c.toISOString()} className="font-medium muted">
                    {c.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listing.segments.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="py-2 text-left">Slot {s.idx + 1}</td>
                  {avail.cycles.map((c) => {
                    const booked = avail.taken.get(s.id)?.has(c.toISOString());
                    return (
                      <td key={c.toISOString()}>
                        <span className={`inline-block h-3 w-3 rounded-full ${booked ? "bg-[var(--accent)]" : "bg-[var(--sand)]"}`} title={booked ? "Booked" : "Free"} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs muted">
            Filled dots are booked. Want more bookings? <Link className="text-[var(--accent)]" href="/ads">Offer your free slots to ads on the board →</Link>
          </p>
        </section>
      )}

      <BookingList title="Requests & offers" rows={mine.filter((b) => b.booking.status === "requested")} me={userId} empty="No pending requests." />
      <BookingList title="All bookings on your banner" rows={mine.filter((b) => b.booking.status !== "requested")} me={userId} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel">
      <div className="text-xs muted">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
