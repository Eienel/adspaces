"use client";

import { CATEGORIES, microToUsdc } from "@adspaces/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

interface Initial {
  title: string;
  description: string;
  pricePerDayUsdc: number;
  minDays: number;
  maxDays: number;
  categories: string[];
  blockedCategories: string[];
  status: "active" | "paused";
}

export function ListingForm({ initial, capMicro, canList }: { initial: Initial | null; capMicro: number; canList: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? microToUsdc(initial.pricePerDayUsdc) : "");
  const [minDays, setMinDays] = useState(initial?.minDays ?? 1);
  const [maxDays, setMaxDays] = useState(initial?.maxDays ?? 30);
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? []);
  const [blocked, setBlocked] = useState<string[]>(initial?.blockedCategories ?? ["gambling", "adult"]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, c: string) =>
    set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/listings", {
        method: "POST",
        json: { title, description, pricePerDayUsdc: price, minDays, maxDays, categories, blockedCategories: blocked },
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

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Crypto-native audience, 50k followers" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Price / day (USDC)</label>
          <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25" />
          <p className="mt-1 text-xs muted">Your cap: ${microToUsdc(capMicro)}/day</p>
        </div>
        <div>
          <label className="label">Min days</label>
          <input className="input" type="number" min={1} value={minDays} onChange={(e) => setMinDays(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Max days</label>
          <input className="input" type="number" min={1} value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value))} />
        </div>
      </div>
      <Chips label="My audience" all={CATEGORIES} selected={categories} onToggle={(c) => toggle(categories, setCategories, c)} />
      <Chips label="Never run ads about" all={CATEGORIES} selected={blocked} onToggle={(c) => toggle(blocked, setBlocked, c)} danger />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={busy || !canList}>
          {initial ? "Save listing" : "Publish listing"}
        </button>
        {initial && (
          <button type="button" className="btn-ghost" onClick={() => setStatus(initial.status === "active" ? "paused" : "active")}>
            {initial.status === "active" ? "Pause listing" : "Resume listing"}
          </button>
        )}
        {!canList && <span className="text-sm muted">Link a wallet first.</span>}
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

function Chips(props: { label: string; all: readonly string[]; selected: string[]; onToggle: (c: string) => void; danger?: boolean }) {
  return (
    <div>
      <label className="label">{props.label}</label>
      <div className="flex flex-wrap gap-2">
        {props.all.map((c) => {
          const on = props.selected.includes(c);
          return (
            <button
              type="button"
              key={c}
              onClick={() => props.onToggle(c)}
              className={`rounded-full border px-3 py-1 text-xs ${
                on ? (props.danger ? "border-red-400 text-red-300" : "border-[var(--accent)] text-white") : "border-[var(--border)] muted"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
