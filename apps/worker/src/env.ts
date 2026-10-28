function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? Number(v) : fallback;
}

function oneOf<T extends string>(name: string, values: readonly T[], fallback: T): T {
  const v = (process.env[name] ?? fallback) as T;
  if (!values.includes(v)) throw new Error(`${name} must be one of ${values.join(", ")}`);
  return v;
}

export function loadEnv() {
  const bannerSource = oneOf("BANNER_SOURCE", ["dev", "owned", "app"] as const, "dev");
  const paymentsProvider = oneOf("PAYMENTS_PROVIDER", ["dev", "solana"] as const, "dev");
  const solana = paymentsProvider === "solana";
  return {
    databaseUrl: required("DATABASE_URL"),
    bannerSource,
    paymentsProvider,
    /** App bearer token: required for BANNER_SOURCE=app, optional fallback for owned, enables metrics sync. */
    xBearerToken: bannerSource === "app" ? required("X_BEARER_TOKEN") : process.env.X_BEARER_TOKEN || null,
    xClientId: bannerSource === "owned" ? required("AUTH_TWITTER_ID") : "",
    xClientSecret: bannerSource === "owned" ? required("AUTH_TWITTER_SECRET") : "",
    tokenEncKey: bannerSource === "owned" ? required("TOKEN_ENC_KEY") : "",
    solanaRpcUrl: solana ? required("SOLANA_RPC_URL") : "",
    usdcMint: solana ? required("USDC_MINT") : "",
    escrowSecret: solana ? required("ESCROW_WALLET_SECRET") : "",
    treasuryWallet: solana ? required("TREASURY_WALLET") : "",
    checksPerDay: num("VERIFY_CHECKS_PER_DAY", 2),
    metricsSyncDays: num("METRICS_SYNC_DAYS", 7),
    tickMs: num("WORKER_TICK_MS", 30_000),
  };
}
export type Env = ReturnType<typeof loadEnv>;
