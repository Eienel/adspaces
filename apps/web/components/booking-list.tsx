import Link from "next/link";
import { BookingActions } from "@/components/booking-actions";
import { StatusBadge } from "@/components/status-badge";
import type { BookingRow } from "@/lib/bookings";
import { displayName, fmtCycle, usd } from "@/lib/format";

/** Bookings table for dashboards. Shows accept/decline when it's this user's turn. */
export function BookingList({ title, rows, me, empty = "Nothing yet." }: { title: string; rows: BookingRow[]; me: string; empty?: string }) {
  return (
    <section className="panel space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {!rows.length && <p className="text-sm muted">{empty}</p>}
      <div className="divide-y divide-[var(--border)]">
        {rows.map(({ booking: b, creative, segment, seller, advertiser, campaign }) => {
          const isSeller = b.sellerId === me;
          const proposer = b.origin === "business_request" ? b.advertiserId : b.sellerId;
          const myTurn = b.status === "requested" && proposer !== me;
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-4 py-3">
              <img src={creative.imageUrl} alt="" className="h-12 rounded-[var(--radius-sm)] border border-[var(--border)] object-cover" style={{ aspectRatio: `${segment.w}/${segment.h}` }} />
              <div className="min-w-40 flex-1">
                <Link href={`/bookings/${b.id}`} className="font-medium hover:underline">
                  {isSeller ? `${displayName(advertiser)} → slot ${segment.idx + 1}` : `Slot ${segment.idx + 1} on @${seller.handle}`}
                </Link>
                <div className="text-xs muted">
                  {fmtCycle(b.cycleStart)} · {b.weeks}w · {usd(b.amountUsdc)}
                  {campaign?.title && ` · “${campaign.title}”`}
                  {b.origin === "creator_offer" && " · offered by creator"}
                </div>
              </div>
              <StatusBadge status={b.status} />
              {myTurn && <BookingActions id={b.id} actions={["accept", "decline"]} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
