"use client";

import { SHAPE_LABEL, microToUsdc, type SegmentShape } from "@adspaces/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeeLine } from "@/components/fee-line";
import { api } from "@/lib/client";

interface MySegment {
  id: string;
  idx: number;
  shape: SegmentShape;
  pricePerDayUsdc: number;
  taken: string[];
}

/** Creator offers one of their matching slots to a business's ad. */
export function OfferForm(p: { campaignId: string; weeks: number; segments: MySegment[]; cycles: string[]; maxPricePerDayUsdc: number; maxBookingUsdc: number }) {
  const router = useRouter();
  const [segmentId, setSegmentId] = useState(p.segments[0]?.id ?? "");
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const seg = p.segments.find((s) => s.id === segmentId);

  if (!p.segments.length) {
    return (
      <p className="text-sm muted">
        You don&apos;t have a free slot of this shape at or under this budget. <Link className="link text-[var(--accent)]" href="/dashboard">Edit your banner layout →</Link>
      </p>
    );
  }

  const free = (i: number) => !!seg && p.cycles.slice(i, i + p.weeks).length === p.weeks && p.cycles.slice(i, i + p.weeks).every((c) => !seg.taken.includes(c));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const b = await api<{ id: string }>("/api/offers", { method: "POST", json: { campaignId: p.campaignId, segmentId, cycleStart: start } });
      router.push(`/bookings/${b.id}`);
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Your slot</label>
        <select className="input" value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
          {p.segments.map((s) => (
            <option key={s.id} value={s.id}>
              Slot {s.idx + 1} · {SHAPE_LABEL[s.shape]} · ${microToUsdc(s.pricePerDayUsdc)}/day
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Start week</label>
        <div className="flex flex-wrap gap-2">
          {p.cycles.map((c, i) => (
            <button type="button" key={c} disabled={!free(i)} onClick={() => setStart(c)} className={`chip ${start === c ? "chip-on" : ""} disabled:line-through disabled:opacity-40`}>
              {new Date(c).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
            </button>
          ))}
        </div>
      </div>
      {seg && (
        <p className="text-sm">
          Booking total <b>${microToUsdc(seg.pricePerDayUsdc * 7 * p.weeks)}</b>
        </p>
      )}
      {seg && (
        <FeeLine totalMicro={seg.pricePerDayUsdc * 7 * p.weeks} maxBookingUsdc={p.maxBookingUsdc} />
      )}
      <button className="btn" disabled={busy || !start}>
        {busy ? "Sending…" : "Offer my slot"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>{msg.text}</p>}
    </form>
  );
}
