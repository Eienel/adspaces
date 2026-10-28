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
  const missing = required.filter((k) => !process.env[k]);
  // New Vercel Blob stores use BLOB_STORE_ID + OIDC instead of a read-write token.
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) missing.push("BLOB_STORE_ID (connect a Vercel Blob store)");
  if (!Object.keys(process.env).some((k) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && process.env[k])) missing.unshift("DATABASE_URL");
  if (missing.length) {
    // Shows up in Vercel → Logs. Every request fails until this is fixed, on purpose.
    console.error(`[startup] Missing required env in production: ${missing.join(", ")}`);
    throw new Error(`Missing required env in production: ${missing.join(", ")} (see docs/10-launch-runbook.md)`);
  }
}
