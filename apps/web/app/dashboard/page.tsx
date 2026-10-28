import { users } from "@adspaces/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { BookingActions } from "@/components/booking-actions";
import { LinkWallet } from "@/components/link-wallet";
import { ListingForm } from "@/components/listing-form";
import { StatusBadge } from "@/components/status-badge";
import { SignInButton } from "@/components/user-menu";
import { listMyBookings } from "@/lib/bookings";
import { db } from "@/lib/db";
import { compact, usd } from "@/lib/format";
import { getListingBySeller } from "@/lib/listings";
import { currentUserId } from "@/lib/session";

export default async function Dashboard() {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-bold">Sign in to continue</h1>
        <p className="text-sm muted">AdSpaces uses your X account so advertisers know the banner is really yours.</p>
        <SignInButton />
      </div>
    );
  }
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [listing, bookings] = await Promise.all([getListingBySeller(userId), listMyBookings(userId)]);
  const incoming = bookings.filter((b) => b.booking.sellerId === userId);
  const outgoing = bookings.filter((b) => b.booking.advertiserId === userId);
  const earned = incoming.filter((b) => b.booking.status === "completed").reduce((s, b) => s + b.booking.amountUsdc, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Followers" value={compact(user.followersCount)} />
        <Stat label="Est. profile views/day" value={`~${compact(user.estDailyViews)}`} />
        <Stat label="Your max price/day" value={usd(user.maxPricePerDayUsdc)} />
        <Stat label="Completed bookings (gross)" value={usd(earned)} />
      </div>

      <section className="panel space-y-3">
        <h2 className="font-semibold">Payout wallet</h2>
        <LinkWallet linked={user.walletPubkey} />
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">My banner listing</h2>
          {listing && (
            <Link href={`/listings/${listing.id}`} className="text-sm text-[var(--accent)]">
              View public page →
            </Link>
          )}
        </div>
        <p className="text-xs muted">
          Your price cap is based on estimated profile views from your public X metrics (followers, recent post impressions,
          engagement). It refreshes weekly.
        </p>
        <ListingForm initial={listing} capMicro={user.maxPricePerDayUsdc} canList={!!user.walletPubkey} />
      </section>

      <BookingTable title="Requests for my banner" rows={incoming} me={userId} />
      <BookingTable title="Banners I've booked" rows={outgoing} me={userId} />
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

function BookingTable({ title, rows, me }: { title: string; rows: Awaited<ReturnType<typeof listMyBookings>>; me: string }) {
  return (
    <section className="panel space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {!rows.length && <p className="text-sm muted">Nothing yet.</p>}
      <div className="divide-y divide-[var(--border)]">
        {rows.map(({ booking: b, creative, seller, advertiser }) => {
          const isSeller = b.sellerId === me;
          const other = isSeller ? advertiser : seller;
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-4 py-3">
              <img src={creative.imageUrl} alt="" className="aspect-[3/1] w-36 rounded-lg object-cover" />
              <div className="min-w-40 flex-1">
                <Link href={`/bookings/${b.id}`} className="font-medium hover:underline">
                  {isSeller ? "From" : "On"} @{other.handle}
                </Link>
                <div className="text-xs muted">
                  {b.days} days · {usd(b.amountUsdc)} · {b.adCategory}
                </div>
              </div>
              <StatusBadge status={b.status} />
              {isSeller && b.status === "requested" && <BookingActions id={b.id} actions={["accept", "decline"]} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
