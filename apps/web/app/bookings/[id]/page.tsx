import { CYCLE_GRACE_MS, bookingMemo, buildTransferRequestUrl, cycleCutoff, cycleEnd, layoutSegments, splitPayment } from "@adspaces/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BannerPreview } from "@/components/banner-preview";
import { BookingActions } from "@/components/booking-actions";
import { PayPanel } from "@/components/pay-panel";
import { StatusBadge } from "@/components/status-badge";
import { SignInLink } from "@/components/user-menu";
import { getBookingForUser } from "@/lib/bookings";
import { DEV_MODE, publicConfig } from "@/lib/env";
import { displayName, fmtCycle, usd } from "@/lib/format";
import { currentUserId, isUuid } from "@/lib/session";

const STEPS = ["requested", "accepted", "funded", "live", "completed"] as const;
const STEP_LABEL: Record<(typeof STEPS)[number], string> = { requested: "requested", accepted: "accepted", funded: "paid", live: "live", completed: "paid out" };
const utc = (d: Date) => d.toUTCString().replace(":00 GMT", " UTC");

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) return <div className="panel text-center"><SignInLink next={`/bookings/${id}`} /></div>;
  if (!isUuid(id)) notFound();
  const data = await getBookingForUser(userId, id);
  if (!data) notFound();
  const { booking: b, creative, segment, listing, seller, advertiser, campaign, checks } = data;
  const isSeller = b.sellerId === userId;
  const proposer = b.origin === "business_request" ? b.advertiserId : b.sellerId;
  const { fee, payout } = splitPayment(b.amountUsdc, b.feeBps);
  const stepIndex = STEPS.indexOf(b.status as (typeof STEPS)[number]);
  const explorer = (sig: string) => `https://solscan.io/tx/${sig}${publicConfig.cluster === "devnet" ? "?cluster=devnet" : ""}`;
  const realTx = (sig: string | null) => sig && !sig.startsWith("dev-");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Slot {segment.idx + 1} on{" "}
          <a href={`https://x.com/${seller.handle}`} target="_blank" className="hover:underline">
            @{seller.handle}
          </a>
        </h1>
        <StatusBadge status={b.status} />
      </div>

      {stepIndex >= 0 && (
        <ol className="grid grid-cols-5 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-full py-2 font-semibold ${i <= stepIndex ? "bg-[var(--accent)] text-[var(--on-dark)]" : "bg-[var(--sand)] muted"}`}>
              {STEP_LABEL[s]}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="panel space-y-3">
            <h2 className="font-semibold">Where the ad goes</h2>
            <BannerPreview
              imageUrl={listing.originalBannerUrl}
              segments={layoutSegments(listing.layout).map((s) => ({
                idx: s.idx,
                ...s.rect,
                state: s.idx === segment.idx ? ("selected" as const) : ("dim" as const),
                imageUrl: s.idx === segment.idx ? creative.imageUrl : null,
              }))}
            />
          </div>

          {b.status === "requested" && (
            <div className="panel space-y-3">
              <p className="text-sm">
                {userId === proposer
                  ? `Waiting for ${isSeller ? displayName(advertiser) : `@${seller.handle}`} to accept.`
                  : isSeller
                    ? `${displayName(advertiser)} wants this slot.`
                    : `@${seller.handle} offered this slot for your ad${campaign ? ` “${campaign.title}”` : ""}.`}
              </p>
              <BookingActions id={b.id} actions={userId === proposer ? ["cancel"] : ["accept", "decline"]} />
            </div>
          )}

          {b.status === "accepted" && !isSeller && b.paymentReference && (
            <div className="panel space-y-3">
              <h2 className="font-semibold">Pay {usd(b.amountUsdc)} USDC into escrow</h2>
              <p className="text-sm muted">Pay before {utc(cycleCutoff(b.cycleStart))} or the booking is cancelled.</p>
              {publicConfig.escrowWallet ? (
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
                    message: `Slot ${segment.idx + 1} on @${seller.handle}, ${b.weeks} week(s)`,
                    memo: bookingMemo(b.id),
                  })}
                />
              ) : (
                !DEV_MODE && <p className="text-sm text-[var(--bad)]">Payments aren&apos;t configured (NEXT_PUBLIC_ESCROW_WALLET).</p>
              )}
              <BookingActions id={b.id} actions={[...(DEV_MODE ? (["dev_fund"] as const) : []), "cancel"]} />
            </div>
          )}
          {b.status === "accepted" && isSeller && (
            <div className="panel text-sm">
              Waiting for {displayName(advertiser)} to pay (deadline {utc(cycleCutoff(b.cycleStart))}).
            </div>
          )}
          {b.status === "funded" && (
            <div className="panel space-y-2 text-sm">
              {isSeller ? (
                <p>
                  Paid. On Saturday after 12:00 UTC your combined banner for {fmtCycle(b.cycleStart).toLowerCase()} appears on your{" "}
                  <Link className="text-[var(--accent)]" href="/dashboard">dashboard</Link>. Upload it to X by {utc(new Date(b.cycleStart.getTime() + CYCLE_GRACE_MS))}.
                </p>
              ) : (
                <p>
                  Paid. Your ad goes into @{seller.handle}&apos;s banner for {fmtCycle(b.cycleStart).toLowerCase()}. If it isn&apos;t up by{" "}
                  {utc(new Date(b.cycleStart.getTime() + CYCLE_GRACE_MS))} you&apos;re refunded automatically.
                </p>
              )}
            </div>
          )}
          {b.status === "live" && (
            <div className="panel text-sm">
              Live until <b>{utc(b.endAt ?? cycleEnd(b.cycleStart, b.weeks))}</b>. We check this slot at random times.
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
                    <td className="py-2">{utc(c.checkedAt)}</td>
                    <td>
                      {c.error ? (
                        <span className="muted">skipped ({c.error.split(":")[0]})</span>
                      ) : c.pass ? (
                        <span className="text-[var(--ok)]">✓ ad visible</span>
                      ) : (
                        <span className="text-[var(--bad)]">✗ ad not found</span>
                      )}
                    </td>
                    <td className="text-right muted">{c.hashDistance !== null && `distance ${c.hashDistance}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel h-fit space-y-2 text-sm">
          <Row k="Creator" v={`@${seller.handle}`} />
          <Row k="Business" v={displayName(advertiser)} />
          {campaign && <Row k="Ad" v={<Link href={`/ads/${campaign.id}`}>{campaign.title}</Link>} />}
          <Row k="Starts" v={fmtCycle(b.cycleStart)} />
          <Row k="Length" v={`${b.weeks} week${b.weeks === 1 ? "" : "s"}`} />
          <Row k="Category" v={b.adCategory} />
          <Row k="Total" v={usd(b.amountUsdc)} />
          <Row k={`Platform fee (${b.feeBps / 100}%)`} v={usd(fee)} />
          <Row k="Creator receives" v={usd(payout)} />
          {b.fundingTx && <Row k="Payment" v={realTx(b.fundingTx) ? <a className="text-[var(--accent)]" href={explorer(b.fundingTx)} target="_blank">view tx</a> : "simulated (dev)"} />}
          {b.settledAt && b.settlementTx && (
            <Row k={b.settlementKind === "release" ? "Payout" : "Refund"} v={realTx(b.settlementTx) ? <a className="text-[var(--accent)]" href={explorer(b.settlementTx)} target="_blank">view tx</a> : "simulated (dev)"} />
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
