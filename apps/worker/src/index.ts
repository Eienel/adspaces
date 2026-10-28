/** AdSpaces worker: weekly cycle, payment watcher, banner verifier, settlement, metrics sync. */
import { createDb } from "@adspaces/db";
import { XApiBannerSource, type BannerSource, type PaymentsProvider } from "@adspaces/shared";
import { loadImage, storeImage } from "@adspaces/shared/server";
import { Connection } from "@solana/web3.js";
import { sql } from "drizzle-orm";
import { DevBannerSource, OwnedTokenBannerSource } from "./banner-sources";
import { DEFAULT_JOB_CONFIG, type JobContext } from "./context";
import { DevPaymentsProvider } from "./dev-payments";
import { loadEnv } from "./env";
import { runCycle } from "./jobs/cycle";
import { syncSellerMetrics } from "./jobs/metrics";
import { watchPayments } from "./jobs/payments";
import { settleBookings } from "./jobs/settle";
import { verifyBanners } from "./jobs/verify";
import { CustodialSolanaPayProvider } from "./solana-payments";

const env = loadEnv();
const once = process.argv.includes("--once");

// Never simulate payments in production by accident (ADR-0013).
if (process.env.NODE_ENV === "production" && env.paymentsProvider === "dev" && process.env.ALLOW_DEV_PAYMENTS !== "1") {
  throw new Error("PAYMENTS_PROVIDER=dev in production. Set PAYMENTS_PROVIDER=solana (or ALLOW_DEV_PAYMENTS=1 for a staging demo).");
}
const db = createDb(env.databaseUrl, { max: 5 });

const appSource = env.xBearerToken ? new XApiBannerSource(env.xBearerToken) : null;
const banners: BannerSource =
  env.bannerSource === "dev"
    ? new DevBannerSource(db)
    : env.bannerSource === "owned"
      ? new OwnedTokenBannerSource(db, { clientId: env.xClientId, clientSecret: env.xClientSecret, encKey: env.tokenEncKey }, appSource)
      : appSource!;

const payments: PaymentsProvider =
  env.paymentsProvider === "solana" ? new CustodialSolanaPayProvider(new Connection(env.solanaRpcUrl, "confirmed"), env) : new DevPaymentsProvider();

const ctx: JobContext = {
  db,
  payments,
  banners,
  loadImage,
  storeImage: (name, data) => storeImage(name, data, "banners"),
  now: () => new Date(),
  random: Math.random,
  config: { ...DEFAULT_JOB_CONFIG, checksPerDay: env.checksPerDay, metricsSyncDays: env.metricsSyncDays },
  log: (msg, extra) => console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra })),
};

const jobs: [string, () => Promise<number>][] = [
  ["payments", () => watchPayments(ctx)],
  ["cycle", () => runCycle(ctx)],
  ["verify", () => verifyBanners(ctx)],
  ["settle", () => settleBookings(ctx)],
];
if (env.xBearerToken) jobs.push(["metrics", () => syncSellerMetrics(ctx, env.xBearerToken!)]);

let stopping = false;
async function tick() {
  for (const [name, run] of jobs) {
    if (stopping) return;
    try {
      const n = await run();
      if (n) ctx.log(`job ${name}`, { processed: n });
    } catch (err) {
      ctx.log(`job ${name} crashed`, { err: String(err) });
    }
  }
}

async function main() {
  ctx.log("worker started", { once, tickMs: env.tickMs, bannerSource: env.bannerSource, payments: env.paymentsProvider });
  if (env.paymentsProvider === "dev") ctx.log("WARNING: dev payments — no real money moves. Use PAYMENTS_PROVIDER=solana outside dev.");
  // Fail fast (non-zero exit) only if the database is unreachable; job errors are logged and retried next tick.
  await db.execute(sql`select 1`);
  if (once) {
    // One pass for schedulers like GitHub Actions cron (ADR-0016).
    await tick();
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
    return;
  }
  while (!stopping) {
    await tick();
    await new Promise((r) => setTimeout(r, env.tickMs));
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => (stopping = true));
main().then(
  () => process.exit(0),
  (err) => {
    ctx.log("worker failed to start", { err: String(err) });
    process.exit(1);
  },
);
