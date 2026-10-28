/**
 * Solana Pay transfer-request URLs (spec: https://docs.solanapay.com/spec).
 * Built by hand to avoid pulling a Solana SDK into the shared package.
 */
import { microToUsdc } from "./money";

export interface TransferRequest {
  recipient: string;
  amountMicro: number;
  splToken: string;
  reference: string;
  label?: string;
  message?: string;
  memo?: string;
}

export function buildTransferRequestUrl(r: TransferRequest): string {
  const params = new URLSearchParams();
  params.set("amount", microToUsdc(r.amountMicro).replace(/\.?0+$/, "") || "0");
  params.set("spl-token", r.splToken);
  params.set("reference", r.reference);
  if (r.label) params.set("label", r.label);
  if (r.message) params.set("message", r.message);
  if (r.memo) params.set("memo", r.memo);
  return `solana:${r.recipient}?${params.toString()}`;
}

export function bookingMemo(bookingId: string): string {
  return `adspaces:${bookingId}`;
}
