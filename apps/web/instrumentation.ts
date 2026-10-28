/**
 * Runs once when the Next.js server starts (not during `next build`). Refuses to serve a misconfigured
 * production app: missing secrets, or dev mode switched on by accident.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const devAllowed = process.env.DEV_LOGIN === "1" && process.env.ALLOW_DEV_LOGIN === "1";
  if (process.env.DEV_LOGIN === "1" && !devAllowed) {
    throw new Error("DEV_LOGIN=1 in production. Remove it (or set ALLOW_DEV_LOGIN=1 for a staging demo).");
  }
  const required = ["AUTH_SECRET", "AUTH_TWITTER_ID", "AUTH_TWITTER_SECRET"];
  if (!devAllowed) required.push("NEXT_PUBLIC_ESCROW_WALLET", "TOKEN_ENC_KEY");
  if (process.env.VERCEL) required.push("BLOB_READ_WRITE_TOKEN");
  const missing = required.filter((k) => !process.env[k]);
  if (!Object.keys(process.env).some((k) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && process.env[k])) missing.unshift("DATABASE_URL");
  if (missing.length) throw new Error(`Missing required env in production: ${missing.join(", ")} (see docs/10-launch-runbook.md)`);
}
