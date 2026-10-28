# ADR-0016: Run the worker on a GitHub Actions schedule (free)

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner (chose the free stack)

## Context
The worker must run every few minutes. Vercel Hobby cron is daily only; always-on hosts cost ~$5/month. The repo is public, so GitHub Actions minutes are free.

## Decision
`.github/workflows/worker.yml` runs `pnpm --filter @adspaces/worker start -- --once` every 5 minutes (+ manual trigger), with `concurrency: worker` so runs never overlap. It's gated by the repo variable `WORKER_ENABLED=true`. `--once` does one pass of every job and exits; it exits non-zero only if the database is unreachable. Secrets come from GitHub Actions secrets. The worker uses `BLOB_READ_WRITE_TOKEN` (no Vercel OIDC outside Vercel).
`ci.yml` runs typecheck + tests (with a Postgres service) on every push.

## Consequences
- Scheduled runs can lag 5–15 minutes and are paused after 60 days without repo activity. Jobs are idempotent, so this only delays payments/checks.
- Moving to an always-on worker later is just `pnpm --filter @adspaces/worker start` on any host.
