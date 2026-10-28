# AdSpaces

Rent out your X (Twitter) banner to advertisers. Payment is held in USDC escrow on Solana and released once the banner is verified to have stayed up.

> **Start with [`docs/README.md`](docs/README.md)**: plan, architecture, decisions and build log. Agents: also read [`CLAUDE.md`](CLAUDE.md).

## Repo
| Path | What |
|---|---|
| `apps/web` | Next.js app: UI + API |
| `apps/worker` | Background jobs: payments, banner verification, settlement |
| `packages/shared` | Domain logic (fees, booking state machine, valuation, X API client, image hashing) |
| `packages/db` | Drizzle schema + migrations (Postgres) |
| `docs/` | Everything you need to know |

## Run locally
Requirements: Node ≥ 22.12, pnpm 10, Postgres.

```bash
pnpm install
```
```bash
cp .env.example .env   # then fill it in (X app keys, AUTH_SECRET, DATABASE_URL, ...)
```
```bash
pnpm --filter @adspaces/db migrate
```
```bash
pnpm --filter @adspaces/worker setup-escrow   # generates the escrow wallet; run again after funding it
```
```bash
pnpm --filter @adspaces/web dev
```
```bash
pnpm --filter @adspaces/worker dev
```

## Tests
```bash
pnpm typecheck && pnpm test
```
Worker lifecycle tests need a disposable, migrated database:
```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5432/adspaces_test pnpm --filter @adspaces/worker test
```
