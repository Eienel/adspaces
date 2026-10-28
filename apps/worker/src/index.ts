/** AdSpaces worker: payment watcher, banner verifier, settlement, metrics sync. */
import { createDb } from "@adspaces/db";
import { XApiBannerSource } from "@adspaces/shared";
import { Connection } from "@solana/web3.js";
import { DEFAULT_JOB_CONFIG, type JobContext } from "./context";
import { loadEnv } from "./env";
import { syncSellerMetrics } from "./jobs/metrics";
import { watchPayments } from "./jobs/payments";
import { settleBookings } from "./jobs/settle";
import { verifyBanners } from "./jobs/verify";
import { CustodialSolanaPayProvider } from "./solana-payments";

const env = loadEnv();

const ctx: JobContext = {
  db: createDb(env.databaseUrl, { max: 5 }),
  payments: new CustodialSolanaPayProvider(new Connection(env.solanaRpcUrl, "confirmed"), env),
  banners: new XApiBannerSource(env.xBearerToken),
  fetchImage: async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`image ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
  now: () => new Date(),
  random: Math.random,
  config: {
    ...DEFAULT_JOB_CONFIG,
    checksPerDay: env.checksPerDay,
    phashThreshold: env.phashThreshold,
    metricsSyncDays: env.metricsSyncDays,
  },
  log: (msg, extra) => console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra })),
};

const jobs: [string, () => Promise<number>][] = [
  ["payments", () => watchPayments(ctx)],
  ["verify", () => verifyBanners(ctx)],
  ["settle", () => settleBookings(ctx)],
  ["metrics", () => syncSellerMetrics(ctx, env.xBearerToken)],
];

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
  ctx.log("worker started", { tickMs: env.tickMs });
  while (!stopping) {
    await tick();
    await new Promise((r) => setTimeout(r, env.tickMs));
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => (stopping = true));
void main();
