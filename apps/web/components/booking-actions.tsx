"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type Action = "accept" | "decline" | "cancel" | "mark_live" | "dev_fund" | "dev_set_banner";
const LABELS: Record<Action, string> = {
  accept: "Accept",
  decline: "Decline",
  cancel: "Cancel",
  mark_live: "I've set the banner — check now",
  dev_fund: "Dev: simulate payment",
  dev_set_banner: "Dev: simulate “I uploaded it to X”",
};

/** Buttons for booking actions. dev_* call the $0 dev-mode endpoint (404 unless DEV_LOGIN=1). */
export function BookingActions({ id, actions, compositionId }: { id: string; actions: Action[]; compositionId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!actions.length) return null;

  async function run(action: Action) {
    setBusy(action);
    setError(null);
    try {
      if (action === "dev_fund") await api("/api/dev", { method: "POST", json: { action: "fund", bookingId: id } });
      else if (action === "dev_set_banner") await api("/api/dev", { method: "POST", json: { action: "set_banner", compositionId } });
      else await api(`/api/bookings/${id}`, { method: "POST", json: { action } });
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
          <button
            key={a}
            className={a === "decline" || a === "cancel" ? "btn-ghost" : a.startsWith("dev_") ? "btn-ghost border-dashed border-[var(--warn)] text-[var(--warn)]" : "btn"}
            disabled={!!busy}
            onClick={() => run(a)}
          >
            {busy === a ? "…" : LABELS[a]}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
    </div>
  );
}
