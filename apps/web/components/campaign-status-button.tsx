"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function CampaignStatusButton({ id, status }: { id: string; status: "open" | "closed" }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        await api(`/api/campaigns/${id}`, { method: "PATCH", json: { status: status === "open" ? "closed" : "open" } });
        router.refresh();
      }}
    >
      {status === "open" ? "Close ad" : "Reopen ad"}
    </button>
  );
}
