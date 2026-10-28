/**
 * Dev helper: run the cycle/verify/settle jobs once with a pretend clock, so you can walk through a
 * whole week in minutes with dev mode. Usage: pnpm --filter @adspaces/worker run-at 2026-11-07T13:00:00Z
 */
import { createDb } from "@adspaces/db";
import { loadImage, storeImage } from "@adspaces/shared/server";
import { DevBannerSource } from "../banner-sources";
import { DEFAULT_JOB_CONFIG, type JobContext } from "../context";
import { DevPaymentsProvider } from "../dev-payments";
import { runCycle } from "../jobs/cycle";
import { settleBookings } from "../jobs/settle";
import { verifyBanners } from "../jobs/verify";

const db = createDb(process.env.DATABASE_URL, { max: 2 });
const at = new Date(process.argv[2]!);
const ctx: JobContext = {
  db,
  payments: new DevPaymentsProvider(),
  banners: new DevBannerSource(db),
  loadImage,
  storeImage: (n, d) => storeImage(n, d, "banners"),
  now: () => at,
  random: Math.random,
  config: DEFAULT_JOB_CONFIG,
  log: (msg, extra) => console.log("  worker:", msg, JSON.stringify(extra ?? {})),
};
console.log("cycle:", await runCycle(ctx), "verify:", await verifyBanners(ctx), "settle:", await settleBookings(ctx));
process.exit(0);
