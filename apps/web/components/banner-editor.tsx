"use client";

import { CATEGORIES, LAYOUT_IDS, LAYOUT_LABEL, SHAPE_LABEL, layoutSegments, microToUsdc, usdcToMicro, type LayoutId } from "@adspaces/shared";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BannerPreview } from "@/components/banner-preview";
import { api } from "@/lib/client";

interface Initial {
  title: string;
  description: string;
  layout: LayoutId;
  minWeeks: number;
  maxWeeks: number;
  categories: string[];
  blockedCategories: string[];
  showAvailableTag: boolean;
  status: "active" | "paused";
  segments: { idx: number; pricePerDayUsdc: number }[];
}

function safeMicro(v: string): number {
  try {
    return usdcToMicro(v || "0");
  } catch {
    return NaN;
  }
}

/** Creator's banner editor: pick a layout over their real banner, price each segment within their cap. */
export function BannerEditor(props: { initial: Initial | null; capMicro: number; bannerUrl: string | null; canList: boolean; locked: boolean }) {
  const router = useRouter();
  const init = props.initial;
  const [layout, setLayout] = useState<LayoutId>(init?.layout ?? "halves");
  const [prices, setPrices] = useState<Record<LayoutId, string[]>>(() => {
    const even = (n: number) => Array(n).fill(microToUsdc(Math.floor(props.capMicro / n / 10_000) * 10_000));
    const out = Object.fromEntries(LAYOUT_IDS.map((id) => [id, even(layoutSegments(id).length)])) as Record<LayoutId, string[]>;
    if (init) out[init.layout] = init.segments.map((s) => microToUsdc(s.pricePerDayUsdc));
    return out;
  });
  const [title, setTitle] = useState(init?.title ?? "");
  const [description, setDescription] = useState(init?.description ?? "");
  const [minWeeks, setMinWeeks] = useState(init?.minWeeks ?? 1);
  const [maxWeeks, setMaxWeeks] = useState(init?.maxWeeks ?? 4);
  const [categories, setCategories] = useState<string[]>(init?.categories ?? []);
  const [blocked, setBlocked] = useState<string[]>(init?.blockedCategories ?? ["gambling", "adult"]);
  const [showTag, setShowTag] = useState(init?.showAvailableTag ?? true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const segs = layoutSegments(layout);
  const current = prices[layout];
  const total = useMemo(() => current.reduce((s, p) => s + safeMicro(p), 0), [current]);
  const over = !(total <= props.capMicro);

  const toggle = (list: string[], set: (v: string[]) => void, c: string) => set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/listings", {
        method: "POST",
        json: { title, description, layout, segmentPrices: current, minWeeks, maxWeeks, categories, blockedCategories: blocked, showAvailableTag: showTag },
      });
      setMsg({ ok: true, text: "Saved" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "active" | "paused") {
    await api("/api/listings/mine", { method: "PATCH", json: { status } });
    router.refresh();
  }

  async function uploadBase(file: File) {
    const form = new FormData();
    form.set("file", file);
    try {
      await api("/api/listings/base", { method: "POST", body: form });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <BannerPreview
        imageUrl={props.bannerUrl}
        showAvatarZone
        segments={segs.map((s, i) => ({ idx: s.idx, ...s.rect, label: `Slot ${i + 1}`, sublabel: `$${current[i] || "0"}/day` }))}
      />
      <p className="-mt-3 text-xs muted">
        Your current banner with the ad slots on top. The red circle is roughly where your profile picture covers the banner on X;
        ads placed there will be partly hidden.
      </p>

      <div>
        <label className="label">How many ads, and where</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {LAYOUT_IDS.map((id) => (
            <button
              type="button"
              key={id}
              disabled={props.locked && id !== init?.layout}
              onClick={() => setLayout(id)}
              className={`rounded-[var(--radius-sm)] border p-2 text-left text-xs transition disabled:opacity-40 ${layout === id ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:bg-white/5"}`}
            >
              <div className="relative mb-2 aspect-[3/1] w-full rounded bg-white/5">
                {layoutSegments(id).map((s) => (
                  <div key={s.idx} className="absolute inset-y-0 border border-white/40 bg-white/10" style={{ left: `${(s.rect.x / 1500) * 100}%`, width: `${(s.rect.w / 1500) * 100}%` }} />
                ))}
              </div>
              {LAYOUT_LABEL[id]}
            </button>
          ))}
        </div>
        {props.locked && <p className="mt-2 text-xs muted">Layout is locked while you have open bookings.</p>}
      </div>

      <div className="space-y-2">
        <label className="label">Price per slot (USDC per day)</label>
        <div className="grid gap-3 sm:grid-cols-3">
          {segs.map((s, i) => (
            <div key={`${layout}-${i}`}>
              <div className="mb-1 text-xs muted">
                Slot {i + 1} · {SHAPE_LABEL[s.shape]}
              </div>
              <input
                className="input"
                inputMode="decimal"
                value={current[i] ?? ""}
                onChange={(e) => setPrices({ ...prices, [layout]: current.map((p, j) => (j === i ? e.target.value : p)) })}
              />
            </div>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full ${over ? "bg-[var(--bad)]" : "bg-[var(--accent)]"}`} style={{ width: `${Math.min(100, (total / props.capMicro) * 100) || 0}%` }} />
        </div>
        <p className={`text-xs ${over ? "text-[var(--bad)]" : "muted"}`}>
          ${Number.isNaN(total) ? "?" : microToUsdc(total)} of your ${microToUsdc(props.capMicro)}/day cap. The cap comes from your estimated
          profile views; all slots together can&apos;t exceed it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Crypto-native audience, 50k followers" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Min weeks</label>
            <input className="input" type="number" min={1} value={minWeeks} onChange={(e) => setMinWeeks(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Max weeks</label>
            <input className="input" type="number" min={1} value={maxWeeks} onChange={(e) => setMaxWeeks(Number(e.target.value))} />
          </div>
        </div>
      </div>
      <div>
        <label className="label">About your audience</label>
        <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <Chips label="My audience" selected={categories} onToggle={(c) => toggle(categories, setCategories, c)} />
      <Chips label="Never run ads about" selected={blocked} onToggle={(c) => toggle(blocked, setBlocked, c)} danger />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showTag} onChange={(e) => setShowTag(e.target.checked)} />
        Show a small “Ad space available” tag on unsold slots
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={busy || !props.canList || over}>
          {init ? "Save banner" : "Publish banner"}
        </button>
        {init && (
          <button type="button" className="btn-ghost" onClick={() => setStatus(init.status === "active" ? "paused" : "active")}>
            {init.status === "active" ? "Pause listing" : "Resume listing"}
          </button>
        )}
        {init && (
          <label className="btn-ghost cursor-pointer">
            Replace base art
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBase(e.target.files[0])} />
          </label>
        )}
        {!props.canList && <span className="text-sm muted">Link a payout wallet first.</span>}
        {msg && <span className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

function Chips(props: { label: string; selected: string[]; onToggle: (c: string) => void; danger?: boolean }) {
  return (
    <div>
      <label className="label">{props.label}</label>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const on = props.selected.includes(c);
          return (
            <button type="button" key={c} onClick={() => props.onToggle(c)} className={`chip ${on ? (props.danger ? "border-[var(--bad)] text-[var(--bad)]" : "chip-on") : "muted"}`}>
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
