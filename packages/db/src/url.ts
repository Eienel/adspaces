/**
 * Find the Postgres URL. Vercel/Neon integrations may add a custom prefix (e.g. ADSPACES_DATABASE_URL),
 * so we also accept any env var *ending* in a known name.
 */
const POOLED = ["DATABASE_URL", "POSTGRES_URL"];
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

function find(suffixes: string[], env: NodeJS.ProcessEnv): string | null {
  for (const s of suffixes) if (env[s]) return s;
  for (const s of suffixes) {
    const k = Object.keys(env).find((key) => key.endsWith(`_${s}`) && env[key]);
    if (k) return k;
  }
  return null;
}

/** Env var name to use: pooled for the app, direct (unpooled) first for migrations. */
export function databaseUrlVar(kind: "pooled" | "direct" = "pooled", env = process.env): string | null {
  return kind === "direct" ? (find(DIRECT, env) ?? find(POOLED, env)) : (find(POOLED, env) ?? find(DIRECT, env));
}

export function databaseUrl(kind: "pooled" | "direct" = "pooled", env = process.env): string | undefined {
  const k = databaseUrlVar(kind, env);
  return k ? env[k] : undefined;
}

/** Names (never values) of env vars that look database-related, for error messages. */
export function databaseLikeVars(env = process.env): string[] {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|^PG|NEON/i.test(k)).sort();
}
