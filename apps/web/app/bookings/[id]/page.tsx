import { bookingMemo, buildTransferRequestUrl, splitPayment } from "@adspaces/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/booking-actions";
import { PayPanel } from "@/components/pay-panel";
import { StatusBadge } from "@/components/status-badge";
import { SignInButton } from "@/components/user-menu";
import { getBookingForUser } from "@/lib/bookings";
import { publicConfig } from "@/lib/env";
import { usd } from "@/lib/format";
import { currentUserId, isUuid } from "@/lib/session";

const STEPS = ["requested", "accepted", "funded", "live", "completed"] as const;

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) return <div className="panel text-center"><SignInButton /></div>;
  if (!isUuid(id)) notFound();
  const data = await getBookingForUser(userId, id);
  if (!data) notFound();
  const { booking: b, creative, seller, advertiser, checks } = data;
  const isSeller = b.sellerId === userId;
  const { fee, payout } = splitPayment(b.amountUsdc, b.feeBps);
  const stepIndex = STEPS.indexOf(b.status as (typeof STEPS)[number]);
  const explorer = (sig: string) => `https://solscan.io/tx/${sig}${publicConfig.cluster === "devnet" ? "?cluster=devnet" : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Banner on <a href={`https://x.com/${seller.handle}`} target="_blank" className="hover:underline">@{seller.handle}</a>
        </h1>
        <StatusBadge status={b.status} />
      </div>

      {stepIndex >= 0 && (
        <ol className="grid grid-cols-5 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-lg py-2 ${i <= stepIndex ? "bg-[var(--accent)]/20 text-white" : "bg-white/5 muted"}`}>
              {s}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="panel space-y-3">
            <h2 className="font-semibold">Creative</h2>
            <img src={creative.imageUrl} alt="Ad creative" className="aspect-[3/1] w-full rounded-xl object-cover" />
            {isSeller && (b.status === "funded" || b.status === "live") && (
              <a href={creative.imageUrl} download className="btn-ghost">
                Download creative
              </a>
            )}
          </div>

          {/* Next step for whoever needs to act */}
          {b.status === "requested" && (
            <div className="panel space-y-3">
              <p className="text-sm">{isSeller ? `@${advertiser.handle} wants to book your banner.` : "Waiting for the seller to accept."}</p>
              <BookingActions id={b.id} actions={isSeller ? ["accept", "decline"] : ["cancel"]} />
            </div>
          )}
          {b.status === "accepted" && !isSeller && b.paymentReference && publicConfig.escrowWallet && (
            <div className="panel space-y-3">
              <h2 className="font-semibold">Pay {usd(b.amountUsdc)} USDC into escrow</h2>
              <PayPanel
                bookingId={b.id}
                escrow={publicConfig.escrowWallet}
                mint={publicConfig.usdcMint}
                reference={b.paymentReference}
                amountMicro={b.amountUsdc}
                solanaPayUrl={buildTransferRequestUrl({
                  recipient: publicConfig.escrowWallet,
                  amountMicro: b.amountUsdc,
                  splToken: publicConfig.usdcMint,
                  reference: b.paymentReference,
                  label: "AdSpaces",
                  message: `Banner on @${seller.handle} for ${b.days} days`,
                  memo: bookingMemo(b.id),
                })}
              />
              <BookingActions id={b.id} actions={["cancel"]} />
            </div>
          )}
          {b.status === "accepted" && isSeller && <div className="panel text-sm">Waiting for @{advertiser.handle} to pay into escrow.</div>}
          {b.status === "funded" && (
            <div className="panel space-y-3 text-sm">
              {isSeller ? (
                <>
                  <p>
                    Payment is in escrow. Download the creative, set it as your X header image, then press the button. You have
                    24 hours, after which the advertiser is refunded.
                  </p>
                  <BookingActions id={b.id} actions={["mark_live"]} />
                </>
              ) : (
                <p>Paid. Waiting for @{seller.handle} to put your banner up (max 24h, otherwise you&apos;re refunded).</p>
              )}
            </div>
          )}
          {b.status === "live" && b.endAt && (
            <div className="panel text-sm">
              Live until <b>{b.endAt.toUTCString()}</b>. We check the banner at random times.
              {isSeller && " Keep it up until then to get paid."}
            </div>
          )}

          <div className="panel space-y-3">
            <h2 className="font-semibold">Verification log</h2>
            {!checks.length && <p className="text-sm muted">No checks yet.</p>}
            <table className="w-full text-left text-sm">
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--border)]">
                    <td className="py-2">{c.checkedAt.toUTCString()}</td>
                    <td>{c.error ? <span className="muted">skipped (X API error)</span> : c.pass ? <span className="text-emerald-400">✓ banner matched</span> : <span className="text-red-400">✗ not found</span>}</td>
                    <td className="text-right muted">{c.hashDistance !== null && `distance ${c.hashDistance}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel h-fit space-y-2 text-sm">
          <Row k="Seller" v={<Link href={`https://x.com/${seller.handle}`}>@{seller.handle}</Link>} />
          <Row k="Advertiser" v={`@${advertiser.handle}`} />
          <Row k="Length" v={`${b.days} days`} />
          <Row k="Category" v={b.adCategory} />
          <Row k="Total" v={usd(b.amountUsdc)} />
          <Row k={`Platform fee (${b.feeBps / 100}%)`} v={usd(fee)} />
          <Row k="Seller receives" v={usd(payout)} />
          {b.fundingTx && <Row k="Payment" v={<a className="text-[var(--accent)]" href={explorer(b.fundingTx)} target="_blank">view tx</a>} />}
          {b.settledAt && b.settlementTx && (
            <Row k={b.settlementKind === "release" ? "Payout" : "Refund"} v={<a className="text-[var(--accent)]" href={explorer(b.settlementTx)} target="_blank">view tx</a>} />
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
