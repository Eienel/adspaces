import { microToUsdc } from "@adspaces/shared";

export const usd = (micro: number) => `$${microToUsdc(micro)}`;

export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function shortKey(k: string): string {
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}
