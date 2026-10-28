import type { Db } from "@adspaces/db";
import type { BannerSource, PaymentsProvider } from "@adspaces/shared";

export interface JobConfig {
  checksPerDay: number;
  phashThreshold: number;
  /** Re-check interval while a funded booking waits for the seller to set the banner. */
  fundedRecheckMs: number;
  /** Unpaid accepted bookings are cancelled after this long. */
  paymentWindowMs: number;
  metricsSyncDays: number;
}

export const DEFAULT_JOB_CONFIG: JobConfig = {
  checksPerDay: 4,
  phashThreshold: 10,
  fundedRecheckMs: 60 * 60 * 1000,
  paymentWindowMs: 72 * 60 * 60 * 1000,
  metricsSyncDays: 7,
};

export interface JobContext {
  db: Db;
  payments: PaymentsProvider;
  banners: BannerSource;
  /** Download an image (banner) as bytes. */
  fetchImage: (url: string) => Promise<Uint8Array>;
  now: () => Date;
  config: JobConfig;
  log: (msg: string, extra?: Record<string, unknown>) => void;
  /** 0..1 random source (injectable for tests). */
  random: () => number;
}

/** Random next check time: mean interval = 24h / checksPerDay, jittered ±50% so sellers can't predict it. */
export function nextCheckAt(ctx: Pick<JobContext, "now" | "config" | "random">): Date {
  const mean = (24 * 60 * 60 * 1000) / ctx.config.checksPerDay;
  return new Date(ctx.now().getTime() + mean * (0.5 + ctx.random()));
}
