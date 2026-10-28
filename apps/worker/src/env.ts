function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? Number(v) : fallback;
}

export function loadEnv() {
  return {
    databaseUrl: required("DATABASE_URL"),
    xBearerToken: required("X_BEARER_TOKEN"),
    solanaRpcUrl: required("SOLANA_RPC_URL"),
    usdcMint: required("USDC_MINT"),
    escrowSecret: required("ESCROW_WALLET_SECRET"),
    treasuryWallet: required("TREASURY_WALLET"),
    checksPerDay: num("VERIFY_CHECKS_PER_DAY", 4),
    phashThreshold: num("PHASH_MATCH_THRESHOLD", 10),
    metricsSyncDays: num("METRICS_SYNC_DAYS", 7),
    tickMs: num("WORKER_TICK_MS", 30_000),
  };
}
export type Env = ReturnType<typeof loadEnv>;
