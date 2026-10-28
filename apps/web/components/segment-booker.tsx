"use client";

import { CATEGORIES, SHAPE_LABEL, microToUsdc, type SegmentShape } from "@adspaces/shared";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BannerPreview } from "@/components/banner-preview";
import { CreativePicker } from "@/components/creative-picker";
import { SignInLink } from "@/components/user-menu";
import { api } from "@/lib/client";

export interface BookableSegment {
  id: string;
  idx: number;
  shape: SegmentShape;
  x: number;
  y: number;
  w: number;
  h: number;
  pricePerDayUsdc: number;
  /** ISO cycle starts already taken. */
  taken: string[];
}

interface Props {
  listingId: string;
  sellerId: string;
  bannerUrl: string | null;
  segments: BookableSegment[];
  cycles: string[];
  minWeeks: number;
  maxWeeks: number;
  blocked: string[];
}

const weekLabel = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Business picks a slot on the banner, a start week, length and an ad image → booking request. */
export function SegmentBooker(p: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState(p.segments.find((s) => s.taken.length < p.cycles.length)?.idx ?? 0);
  const seg = p.segments.find((s) => s.idx === selected)!;
  const [weeks, setWeeks] = useState(p.minWeeks);
  const [start, setStart] = useState<string>("");
  const [category, setCategory] = useState<string>(CATEGORIES.find((c) => !p.blocked.includes(c)) ?? "other");
  const [creative, setCreative] = useState<{ id: string; imageUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startIdx = p.cycles.indexOf(start);
  const runFree = (i: number) => p.cycles.slice(i, i + weeks).length === weeks && p.cycles.slice(i, i + weeks).every((c) => !seg.taken.includes(c));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!creative) return setError("Add your ad image");
    if (!start) return setError("Pick a start week");
    setBusy(true);
    setError(null);
    try {
      const b = await api<{ id: string }>("/api/bookings", {
        method: "POST",
        json: { segmentId: seg.id, creativeId: creative.id, cycleStart: start, weeks, adCategory: category },
      });
      router.push(`/bookings/${b.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <BannerPreview
        imageUrl={p.bannerUrl}
        onSelect={setSelected}
        segments={p.segments.map((s) => ({
          idx: s.idx,
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          state: s.idx === selected ? "selected" : s.taken.length >= p.cycles.length ? "booked" : "free",
          label: `$${microToUsdc(s.pricePerDayUsdc)}/day`,
          sublabel: SHAPE_LABEL[s.shape].split(" ")[0],
          imageUrl: s.idx === selected ? creative?.imageUrl : null,
        }))}
      />
      {status !== "loading" && !session?.user ? (
        <SignInLink label="Sign in to book this banner" />
      ) : session?.user.id === p.sellerId ? (
        <p className="text-sm muted">This is your banner.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Start week (Mondays, UTC)</label>
            <div className="flex flex-wrap gap-2">
              {p.cycles.map((c, i) => {
                const ok = runFree(i);
                return (
                  <button type="button" key={c} disabled={!ok} onClick={() => setStart(c)} className={`chip ${start === c ? "chip-on" : ""} disabled:line-through disabled:opacity-40`}>
                    {weekLabel(c)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs muted">Crossed-out weeks are already booked for this slot. Payment is due by Saturday 12:00 UTC before the week starts.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                Weeks ({p.minWeeks}–{p.maxWeeks})
              </label>
              <input className="input" type="number" min={p.minWeeks} max={p.maxWeeks} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Ad category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.filter((c) => !p.blocked.includes(c)).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <CreativePicker shape={seg.shape} value={creative?.id ?? null} onChange={setCreative} />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs muted">Total</div>
              <div className="text-2xl font-bold">${microToUsdc(seg.pricePerDayUsdc * 7 * (weeks || 0))}</div>
              <div className="text-xs muted">USDC · {weeks} {weeks === 1 ? "week" : "weeks"}</div>
            </div>
            <button className="btn" disabled={busy || startIdx < 0 || !runFree(startIdx)}>
              {busy ? "Sending…" : "Request booking"}
            </button>
          </div>
          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
          <p className="text-xs muted">You pay only after the creator accepts. Funds sit in escrow and are refunded if your slot isn&apos;t shown.</p>
        </form>
      )}
    </div>
  );
}
