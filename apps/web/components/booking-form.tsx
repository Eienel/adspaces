"use client";

import { CATEGORIES, CREATIVE_HEIGHT, CREATIVE_WIDTH, microToUsdc } from "@adspaces/shared";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignInButton } from "@/components/user-menu";
import { api } from "@/lib/client";

interface Props {
  listingId: string;
  sellerId: string;
  pricePerDayMicro: number;
  minDays: number;
  maxDays: number;
  blocked: string[];
}

export function BookingForm({ listingId, sellerId, pricePerDayMicro, minDays, maxDays, blocked }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [days, setDays] = useState(minDays);
  const [category, setCategory] = useState<string>(CATEGORIES.find((c) => !blocked.includes(c)) ?? "other");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") return null;
  if (!session?.user) return <SignInButton label="Sign in with 𝕏 to book" />;
  if (session.user.id === sellerId) return <p className="text-sm muted">This is your listing.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Upload your banner creative");
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const creative = await api<{ id: string }>("/api/creatives", { method: "POST", body: form });
      const booking = await api<{ id: string }>("/api/bookings", {
        method: "POST",
        json: { listingId, creativeId: creative.id, days, startAt: new Date().toISOString(), adCategory: category },
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">
          Creative ({CREATIVE_WIDTH}×{CREATIVE_HEIGHT}px, PNG/JPEG/WebP, &lt; 2 MB)
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="input"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        {preview && <img src={preview} alt="preview" className="mt-2 aspect-[3/1] w-full rounded-xl object-cover" />}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Days ({minDays}–{maxDays})</label>
          <input
            type="number"
            min={minDays}
            max={maxDays}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label className="label">Ad category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {CATEGORIES.filter((c) => !blocked.includes(c)).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs muted">Total</div>
          <div className="text-xl font-bold">${microToUsdc(pricePerDayMicro * (days || 0))} USDC</div>
        </div>
        <button className="btn" disabled={busy}>
          {busy ? "Sending…" : "Request booking"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs muted">
        You only pay after the seller accepts. Funds are held in escrow and refunded if the banner isn&apos;t kept up.
      </p>
    </form>
  );
}
