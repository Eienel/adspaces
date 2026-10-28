import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

export * from "./schema";
export { databaseUrl } from "./url";
export { schema };

export type Db = ReturnType<typeof createDb>;

/**
 * Create a Drizzle client. In serverless (web), point DATABASE_URL at a pooled endpoint
 * (Neon "-pooler" host / PgBouncer); `prepare: false` keeps it compatible with transaction pooling.
 */
export function createDb(url = databaseUrl("pooled"), opts: { max?: number } = {}) {
  if (!url) throw new Error("DATABASE_URL is not set (see docs/12-vercel-preview.md)");
  const client = postgres(url, { max: opts.max ?? 5, prepare: false });
  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as { __adspacesDb?: Db };

/** Process-wide singleton (survives Next.js dev hot reloads). */
export function getDb(): Db {
  globalForDb.__adspacesDb ??= createDb();
  return globalForDb.__adspacesDb;
}
