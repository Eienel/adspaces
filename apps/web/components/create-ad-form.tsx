"use client";

import { CATEGORIES, SEGMENT_SHAPES, SHAPE_LABEL, type SegmentShape } from "@adspaces/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreativePicker } from "@/components/creative-picker";
import { api } from "@/lib/client";

/** Business posts an ad to the ad board; creators with a matching slot can offer it. */
export function CreateAdForm() {
  const router = useRouter();
  const [shape, setShape] = useState<SegmentShape>("half");
  const [creative, setCreative] = useState<{ id: string } | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [adCategory, setAdCategory] = useState("crypto");
  const [audience, setAudience] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState("10");
  const [weeks, setWeeks] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!creative) return setError("Add your ad image");
    setBusy(true);
    setError(null);
    try {
      await api("/api/campaigns", {
        method: "POST",
        json: { title, brief, creativeId: creative.id, adCategory, audience, maxPricePerDayUsdc: maxPrice, weeks },
      });
      router.push("/business");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="label">Slot size you want</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEGMENT_SHAPES.map((s) => (
            <button type="button" key={s} onClick={() => setShape(s)} className={`chip py-2 ${shape === s ? "chip-on" : "muted"}`}>
              {SHAPE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <CreativePicker shape={shape} value={creative?.id ?? null} onChange={setCreative} />
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Launch week for our DEX" />
      </div>
      <div>
        <label className="label">Brief for creators</label>
        <textarea className="input min-h-20" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Who you want to reach, anything creators should know" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Ad category</label>
          <select className="input" value={adCategory} onChange={(e) => setAdCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Max USDC / day per slot</label>
          <input className="input" inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">Weeks</label>
          <input className="input" type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label">Audiences you want</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button type="button" key={c} onClick={() => setAudience(audience.includes(c) ? audience.filter((x) => x !== c) : [...audience, c])} className={`chip ${audience.includes(c) ? "chip-on" : "muted"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "Posting…" : "Post ad"}
      </button>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
    </form>
  );
}
