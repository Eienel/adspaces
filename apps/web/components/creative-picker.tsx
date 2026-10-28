"use client";

import { SHAPE_LABEL, SHAPE_SIZE, type SegmentShape } from "@adspaces/shared";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface Creative {
  id: string;
  imageUrl: string;
  shape: SegmentShape;
}

/** Pick an existing ad image of the right shape, or upload a new one. */
export function CreativePicker({ shape, value, onChange }: { shape: SegmentShape; value: string | null; onChange: (c: Creative | null) => void }) {
  const [items, setItems] = useState<Creative[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChange(null);
    api<Creative[]>(`/api/creatives?shape=${shape}`).then(setItems, () => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("shape", shape);
      const c = await api<Creative>("/api/creatives", { method: "POST", body: form });
      setItems((xs) => [c, ...xs]);
      onChange(c);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const { w, h } = SHAPE_SIZE[shape];
  return (
    <div className="space-y-2">
      <label className="label">
        Ad image · {SHAPE_LABEL[shape]}
      </label>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => onChange(c)}
            className={`overflow-hidden rounded-[var(--radius-sm)] border-2 ${value === c.id ? "border-[var(--accent)]" : "border-transparent"}`}
          >
            <img src={c.imageUrl} alt="" className="h-16 object-cover" style={{ aspectRatio: `${w}/${h}` }} />
          </button>
        ))}
        <label className="flex h-16 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--border)] px-4 text-xs muted hover:bg-white/5">
          {busy ? "Uploading…" : "+ Upload"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <p className="text-xs muted">
        Any {w}×{h} (or same proportions) PNG, JPEG or WebP up to 5 MB.
      </p>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
    </div>
  );
}
