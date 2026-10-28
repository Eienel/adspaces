/**
 * Apply migrations (used by `pnpm --filter @adspaces/db migrate` and the Vercel build).
 * Unlike `drizzle-kit migrate`, this prints the real error, and which env var/host it used.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { databaseLikeVars, databaseUrlVar } from "./url";

// Direct (non-pooled) connection first; prefixed names (e.g. ADSPACES_DATABASE_URL) also work.
const name = databaseUrlVar("direct");
if (!name) {
  console.error("[migrate] No database URL found. Expected DATABASE_URL (or DATABASE_URL_UNPOOLED / POSTGRES_URL, optionally with a prefix).");
  const seen = databaseLikeVars();
  console.error(`[migrate] Database-like env vars visible to this build: ${seen.length ? seen.join(", ") : "none"}`);
  console.error("[migrate] On Vercel: Storage → your Neon database → Connect project, with Production AND Preview ticked, then redeploy.");
  process.exit(1);
}

const url = process.env[name]!;
let host = "?";
try {
  host = new URL(url).host;
} catch {
  console.error(`[migrate] ${name} is not a valid URL.`);
  process.exit(1);
}

console.log(`[migrate] Using ${name} (${host})`);
const client = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 20 });
try {
  await migrate(drizzle(client), { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });
  console.log("[migrate] Database is up to date.");
  await client.end();
} catch (err) {
  const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string } };
  console.error(`[migrate] Failed: ${e.message ?? String(err)}${e.code ? ` (${e.code})` : ""}`);
  if (e.cause?.message) console.error(`[migrate] Cause: ${e.cause.message}${e.cause.code ? ` (${e.cause.code})` : ""}`);
  await client.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
