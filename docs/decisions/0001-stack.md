# ADR-0001: Tech stack — Next.js + Postgres + Redis monorepo

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner (asked for "fast and can handle ~100k traffic at once"), Claude

## Context
We need to ship an MVP fast, in one language, and the system must handle traffic spikes (~100k concurrent visitors) when a big account shares the site.

## Decision
- **TypeScript everywhere**, **pnpm workspaces + Turborepo** monorepo.
- **Next.js (App Router)** for UI + API, deployed on **Vercel** (CDN, ISR, serverless autoscaling).
- **Postgres** (Neon or Supabase) through **Drizzle ORM** (lightweight, SQL-first, works with serverless drivers).
- **Redis (Upstash)** for caching hot reads, rate limiting, and locks.
- **apps/worker**: a long-running Node process (Railway/Fly/Render) for jobs that need schedules and secrets (verification, payments).
- **Vitest** for tests, **zod** for validation.

## Alternatives considered
- Separate API (Fastify/Go) + SPA: more moving parts; no real performance need at this stage.
- Prisma: heavier runtime, weaker fit for serverless/edge than Drizzle.

## Consequences
- Read traffic scales on the CDN; the DB sees mostly writes and cache misses.
- The worker is a separate deploy target to run and monitor.
