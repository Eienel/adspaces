"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function BusinessProfileForm({ name, url }: { name: string; url: string }) {
  const router = useRouter();
  const [businessName, setName] = useState(name);
  const [businessUrl, setUrl] = useState(url);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me", { method: "PATCH", json: { businessName, businessUrl } });
      setMsg({ ok: true, text: "Saved" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label className="label">Business name</label>
        <input className="input" value={businessName} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Website</label>
        <input className="input" value={businessUrl} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      </div>
      <button className="btn">Save</button>
      {msg && <p className={`text-sm sm:col-span-3 ${msg.ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>{msg.text}</p>}
    </form>
  );
}
