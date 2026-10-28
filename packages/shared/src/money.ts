/** USDC has 6 decimals. All money in AdSpaces is integer micro-USDC. */
export const USDC_DECIMALS = 6;
export const MICRO_PER_USDC = 1_000_000;

/** Parse a user-entered decimal string like "12.5" into micro-USDC. Throws on invalid input. */
export function usdcToMicro(value: string | number): number {
  const str = typeof value === "number" ? value.toString() : value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(str)) throw new Error(`Invalid USDC amount: ${value}`);
  const [whole = "0", frac = ""] = str.split(".");
  const micro = Number(whole) * MICRO_PER_USDC + Number(frac.padEnd(6, "0"));
  if (!Number.isSafeInteger(micro)) throw new Error(`USDC amount too large: ${value}`);
  return micro;
}

/** Format micro-USDC as a decimal string with 2–6 decimals, e.g. 12500000 → "12.50". */
export function microToUsdc(micro: number): string {
  const whole = Math.floor(micro / MICRO_PER_USDC);
  const frac = (micro % MICRO_PER_USDC).toString().padStart(6, "0").replace(/0{1,4}$/, "");
  return `${whole}.${frac.padEnd(2, "0")}`;
}
