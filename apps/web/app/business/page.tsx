import { users } from "@adspaces/db";
import { SHAPE_LABEL } from "@adspaces/shared";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { BookingList } from "@/components/booking-list";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { CampaignStatusButton } from "@/components/campaign-status-button";
import { SignInLink } from "@/components/user-menu";
import { listMyBookings } from "@/lib/bookings";
import { myCampaigns } from "@/lib/campaigns";
import { db } from "@/lib/db";
import { usd } from "@/lib/format";
import { currentUserId } from "@/lib/session";

export default async function BusinessPortal() {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-bold">Advertise on X banners</h1>
        <p className="text-sm muted">Sign in with a Solana wallet or your X account to post ads and book banner slots.</p>
        <SignInLink next="/business" />
      </div>
    );
  }
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [campaigns, bookings] = await Promise.all([myCampaigns(userId), listMyBookings(userId)]);
  const mine = bookings.filter((b) => b.booking.advertiserId === userId);
  const offers = mine.filter((b) => b.booking.status === "requested" && b.booking.origin === "creator_offer");
  const toPay = mine.filter((b) => b.booking.status === "accepted");
  const spent = mine.filter((b) => ["funded", "live", "completed"].includes(b.booking.status)).reduce((s, b) => s + b.booking.amountUsdc, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Business portal</h1>
        <div className="flex gap-2">
          <Link href="/listings" className="btn-ghost">
            Browse banners
          </Link>
          <Link href="/business/ads/new" className="btn">
            Post an ad
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open ads" value={String(campaigns.filter((c) => c.status === "open").length)} />
        <Stat label="Waiting for your payment" value={String(toPay.length)} />
        <Stat label="Committed" value={usd(spent)} />
      </div>

      <section className="panel space-y-3">
        <h2 className="font-semibold">Business profile</h2>
        <BusinessProfileForm name={user.businessName ?? ""} url={user.businessUrl ?? ""} />
      </section>

      {toPay.length > 0 && <BookingList title="Accepted: pay to confirm" rows={toPay} me={userId} />}
      <BookingList title="Offers from creators" rows={offers} me={userId} empty="No offers yet. Creators with a matching slot can offer it to your open ads." />

      <section className="panel space-y-3">
        <h2 className="font-semibold">Your ads</h2>
        {!campaigns.length && <p className="text-sm muted">You haven&apos;t posted an ad yet.</p>}
        <div className="divide-y divide-[var(--border)]">
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 py-3">
              <img src={c.creativeUrl} alt="" className="h-12 rounded-lg object-cover" />
              <div className="min-w-40 flex-1">
                <Link href={`/ads/${c.id}`} className="font-medium hover:underline">
                  {c.title}
                </Link>
                <div className="text-xs muted">
                  {SHAPE_LABEL[c.shape]} · up to {usd(c.maxPricePerDayUsdc)}/day · {c.weeks}w · {c.offers} offer{c.offers === 1 ? "" : "s"}
                </div>
              </div>
              <CampaignStatusButton id={c.id} status={c.status} />
            </div>
          ))}
        </div>
      </section>

      <BookingList title="All your bookings" rows={mine.filter((b) => !["requested", "accepted"].includes(b.booking.status) || b.booking.origin === "business_request")} me={userId} />
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
