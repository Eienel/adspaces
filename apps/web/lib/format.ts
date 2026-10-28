import { microToUsdc } from "@adspaces/shared";

export const usd = (micro: number) => `$${microToUsdc(micro)}`;

export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function shortKey(k: string): string {
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/** How to show any account: @handle for X users, business name or wallet otherwise. */
export function displayName(u: { handle?: string | null; businessName?: string | null; name?: string | null; walletPubkey?: string | null }): string {
  if (u.businessName) return u.businessName;
  if (u.handle) return `@${u.handle}`;
  if (u.walletPubkey) return shortKey(u.walletPubkey);
  return u.name ?? "Unknown";
}

export const fmtCycle = (d: Date) =>
  `Week of ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
