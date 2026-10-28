/** Settlement rule based on verification uptime. See docs/05-verification.md. */
export const SETTLEMENT_DEFAULTS = {
  releaseUptime: 0.9,
  refundUptime: 0.5,
  minChecks: 1,
};

export type SettlementDecision = "release" | "refund" | "dispute";

export interface CheckResult {
  pass: boolean;
  /** Checks that errored (X API down, etc.) are ignored. */
  error?: string | null;
}

export function uptime(checks: CheckResult[]): { ratio: number; counted: number } {
  const counted = checks.filter((c) => !c.error);
  if (counted.length === 0) return { ratio: 0, counted: 0 };
  return { ratio: counted.filter((c) => c.pass).length / counted.length, counted: counted.length };
}

export function decideSettlement(checks: CheckResult[], cfg = SETTLEMENT_DEFAULTS): SettlementDecision {
  const { ratio, counted } = uptime(checks);
  if (counted < cfg.minChecks) return "dispute";
  if (ratio >= cfg.releaseUptime) return "release";
  if (ratio < cfg.refundUptime) return "refund";
  return "dispute";
}
