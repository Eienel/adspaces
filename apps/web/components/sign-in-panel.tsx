"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { api } from "@/lib/client";

/** X login for creators; wallet login for businesses (ADR-0012); dev login in $0 mode (ADR-0013). */
export function SignInPanel({ devMode, next }: { devMode: boolean; next: string }) {
  const { publicKey, signMessage } = useWallet();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function walletLogin() {
    if (!publicKey || !signMessage) return setError("This wallet can't sign messages");
    setBusy("wallet");
    setError(null);
    try {
      const pubkey = publicKey.toBase58();
      const { nonce, message } = await api<{ nonce: string; message: string }>("/api/wallet/login-challenge", { method: "POST", json: { pubkey } });
      const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));
      const res = await signIn("solana", { pubkey, signature, nonce, redirect: false });
      if (res?.error) throw new Error("Wallet sign-in failed");
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function devLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy("dev");
    setError(null);
    const res = await signIn("dev", { handle, redirect: false });
    if (res?.error) {
      setError("Dev login failed (handle: 2–15 letters, numbers or _)");
      setBusy(null);
    } else window.location.href = next;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="panel space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Creators</div>
        <h2 className="text-lg font-semibold">Rent out your banner</h2>
        <p className="text-sm muted">Sign in with X so businesses know the banner is really yours. We only read your public profile.</p>
        <button className="btn w-full" onClick={() => signIn("twitter", { callbackUrl: next })}>
          Sign in with 𝕏
        </button>
      </div>
      <div className="panel space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-2)]">Businesses</div>
        <h2 className="text-lg font-semibold">Advertise on banners</h2>
        <p className="text-sm muted">Connect a Solana wallet (Phantom, Solflare, Backpack) and sign a message. No password, no gas.</p>
        <div className="flex flex-wrap items-center gap-3">
          <WalletMultiButton />
          {publicKey && (
            <button className="btn" onClick={walletLogin} disabled={!!busy}>
              {busy === "wallet" ? "Check your wallet…" : "Sign in with wallet"}
            </button>
          )}
        </div>
        <p className="text-xs muted">Have an X account? You can use “Sign in with 𝕏” as a business too.</p>
      </div>
      {devMode && (
        <form onSubmit={devLogin} className="panel space-y-3 border-dashed md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--warn)]">Dev mode · no X API needed</div>
          <p className="text-sm muted">Creates a fake X account with a generated banner and follower count. Disabled in production.</p>
          <div className="flex gap-3">
            <input className="input max-w-xs" placeholder="handle, e.g. alice" value={handle} onChange={(e) => setHandle(e.target.value)} />
            <button className="btn" disabled={!!busy || !handle}>
              {busy === "dev" ? "…" : "Dev login"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-[var(--bad)] md:col-span-2">{error}</p>}
    </div>
  );
}
