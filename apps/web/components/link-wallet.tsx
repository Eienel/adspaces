"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

/** Proves wallet ownership by signing a one-time nonce message, then links it to the account. */
export function LinkWallet({ linked }: { linked: string | null }) {
  const { publicKey, signMessage } = useWallet();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = publicKey?.toBase58();

  async function link() {
    if (!publicKey || !signMessage) return setError("This wallet can't sign messages");
    setBusy(true);
    setError(null);
    try {
      const { nonce, message } = await api<{ nonce: string; message: string }>("/api/wallet/challenge", { method: "POST" });
      const sig = await signMessage(new TextEncoder().encode(message));
      await api("/api/wallet/link", { method: "POST", json: { pubkey: publicKey.toBase58(), signature: bs58.encode(sig), nonce } });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm">
        {linked ? (
          <>
            Payout wallet: <code className="break-all rounded bg-black/30 px-1">{linked}</code>
          </>
        ) : (
          <span className="muted">No wallet linked. You need one to get paid.</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <WalletMultiButton />
        {current && current !== linked && (
          <button className="btn" onClick={link} disabled={busy}>
            {busy ? "Check your wallet…" : linked ? "Use this wallet instead" : "Link this wallet"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
