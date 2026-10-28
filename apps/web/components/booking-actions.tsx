"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type Action = "accept" | "decline" | "cancel" | "mark_live";
const LABELS: Record<Action, string> = {
  accept: "Accept",
  decline: "Decline",
  cancel: "Cancel request",
  mark_live: "I've set the banner — check now",
};

export function BookingActions({ id, actions }: { id: string; actions: Action[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!actions.length) return null;

  async function run(action: Action) {
    setBusy(action);
    setError(null);
    try {
      await api(`/api/bookings/${id}`, { method: "POST", json: { action } });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button key={a} className={a === "decline" || a === "cancel" ? "btn-ghost" : "btn"} disabled={!!busy} onClick={() => run(a)}>
            {busy === a ? "…" : LABELS[a]}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
