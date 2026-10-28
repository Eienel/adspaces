"use client";

import { createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

interface Props {
  bookingId: string;
  solanaPayUrl: string;
  escrow: string;
  mint: string;
  reference: string;
  amountMicro: number;
}

/**
 * Advertiser pays into escrow (ADR-0003). Either scan the Solana Pay QR with a mobile wallet,
 * or pay with the connected browser wallet. The worker detects the payment by its reference key.
 */
export function PayPanel({ bookingId, solanaPayUrl, escrow, mint, reference, amountMicro }: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(solanaPayUrl, { margin: 1, width: 220 }).then(setQr, () => setQr(null));
  }, [solanaPayUrl]);

  // Poll for the worker to mark the booking funded.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  async function pay() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const mintKey = new PublicKey(mint);
      const from = getAssociatedTokenAddressSync(mintKey, publicKey);
      const to = getAssociatedTokenAddressSync(mintKey, new PublicKey(escrow));
      const transfer = createTransferCheckedInstruction(from, mintKey, to, publicKey, BigInt(amountMicro), 6);
      // Solana Pay: the reference key is attached as a read-only, non-signer account.
      transfer.keys.push({ pubkey: new PublicKey(reference), isSigner: false, isWritable: false });
      const memo = new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(`adspaces:${bookingId}`) });
      const tx = new Transaction().add(transfer, memo);
      setSig(await sendTransaction(tx, connection));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
      <div className="space-y-2 text-center">
        {qr ? <img src={qr} alt="Solana Pay QR" className="rounded-xl bg-white p-1" /> : <div className="h-[220px] rounded-xl bg-white/5" />}
        <div className="text-xs muted">Scan with Phantom / Solflare mobile</div>
      </div>
      <div className="space-y-3">
        <p className="text-sm">Or pay with a browser wallet:</p>
        <div className="flex flex-wrap items-center gap-3">
          <WalletMultiButton />
          {publicKey && (
            <button className="btn" onClick={pay} disabled={busy || !!sig}>
              {busy ? "Confirm in wallet…" : sig ? "Sent" : "Pay now"}
            </button>
          )}
        </div>
        {sig && (
          <p className="text-sm text-emerald-400">
            Payment sent. Waiting for finalization (~15s); this page updates automatically.
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-xs muted">
          Funds are held in AdSpaces escrow until the booking ends, then released to the seller (minus the platform fee) or
          refunded to you if the banner wasn&apos;t kept up.
        </p>
      </div>
    </div>
  );
}
