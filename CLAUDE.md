# AdSpaces — Agent Guide

**Read `docs/README.md` first.** It indexes the full plan, architecture and decisions.

## Before you start
1. Read `docs/roadmap.md` and the newest file in `docs/log/`.
2. Check `docs/decisions/` before changing a library, protocol, data shape or business rule.

## While working
- Non-trivial decision → new ADR in `docs/decisions/` (copy `template.md`, next number).
- Keep `docs/03-data-model.md` in sync with `packages/db/src/schema.ts`.
- Money = integer micro-USDC (`bigint`/`number` ≤ 2^53), never floats. Use `packages/shared/src/fees.ts`.
- Booking status changes go through `transition()` in `packages/shared/src/booking.ts`.
- Secrets (escrow key, X bearer token) belong in `apps/worker` only — never in client code.
- `@adspaces/shared/server` (sharp, crypto, fs) is server-only; client components import `@adspaces/shared` only.
- Styling lives in CSS tokens at the top of `apps/web/app/globals.css`; restyle there first.
- Everything must stay testable at $0 (dev mode, ADR-0013). Don't add features that only work with live X/Solana.

## When done
- Tick `docs/roadmap.md`, write/update `docs/log/YYYY-MM-DD-*.md` (done / next / open questions).

## Commands
```bash
pnpm install
pnpm typecheck      # all packages
pnpm test           # vitest across packages
pnpm lint
pnpm --filter @adspaces/web dev
pnpm --filter @adspaces/worker dev
pnpm --filter @adspaces/db generate   # drizzle migrations
pnpm --filter @adspaces/worker run-at <ISO time>   # run worker jobs once with a pretend clock (dev)
```
