import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Migrations need a direct (non-pooled) connection; the Neon integration on Vercel provides DATABASE_URL_UNPOOLED.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/adspaces" },
});
