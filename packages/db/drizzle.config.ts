import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/url";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Migrations need a direct (non-pooled) connection; the Neon integration on Vercel provides DATABASE_URL_UNPOOLED.
  dbCredentials: { url: databaseUrl("direct") ?? "postgres://postgres:postgres@localhost:5432/adspaces" },
});
