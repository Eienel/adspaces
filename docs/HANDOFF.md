# HANDOFF — current state (read this first)

> A living document. **Every session updates it before ending** so the next session (human or agent) can continue cold.
> History lives in `log/`, decisions in `decisions/`, the plan in `roadmap.md`. This page is just "where are we now".

_Last updated: 2026-10-28, end of session 3 (launch-ready beta)_

## One-line summary
AdSpaces = marketplace where X creators split their **banner into ad slots** and rent them to businesses for **USDC on Solana**. Payment goes into a **platform escrow wallet** (custodial, no Solana program). A worker **verifies each slot** in the creator's live banner and pays out (minus a 0.75–2.5% fee) or refunds.

## Branch & repo
- Repo `Eienel/adspaces` (public). Work branch: **`claude/pensive-faraday-5frreq`** (also the GitHub default branch right now). Always pull it first.
- Monorepo: `apps/web` (Next.js 16), `apps/worker` (jobs), `packages/shared` (domain logic), `packages/db` (Drizzle/Postgres).

## What works today (tested)
| Area | Status | Where |
|---|---|---|
| Sign in with X (OAuth 2.0) | built, **untested with a real X app** | `apps/web/auth.ts` |
| Wallet sign-in (businesses) + dev login ($0) | tested e2e | `auth.ts`, `lib/wallet.ts`, `lib/dev.ts` |
| Creator banner editor: layouts, slot prices ≤ valuation cap | tested e2e | `components/banner-editor.tsx`, `lib/listings.ts` |
| Business booking a slot / creator offering a slot to an ad (ad board) | tested e2e | `lib/bookings.ts`, `lib/campaigns.ts` |
| Weekly cycle: Saturday 12:00 UTC cutoff → composite banner | tested (worker tests + e2e) | `apps/worker/src/jobs/cycle.ts` |
| Per-slot verification (dHash + colour) | tested | `jobs/verify.ts`, `packages/shared/src/compose.ts` |
| Escrow settlement (release with fee / refund), idempotent | tested with fake chain; **real Solana untested** | `jobs/settle.ts`, `src/solana-payments.ts` |
| $0 dev mode (fake X, simulated payments/banners, `run-at` clock) | tested | ADR-0013, README |
| Tiered fees 2.5/1.5/0.75% + $1,000 beta cap | tested (unit + live e2e) | `packages/shared/src/fees.ts`, `apps/web/lib/bookings.ts` |
| **Live staging demo** (dev mode) | https://web-6wfa.vercel.app, live e2e passes | `docs/12-vercel-preview.md` |
| Worker on GitHub Actions (every 5 min) | workflow written + linted, **not yet enabled** (needs secrets + `WORKER_ENABLED=true`) | `.github/workflows/worker.yml` |
| Escrow solvency alert | tested | `apps/worker/src/jobs/solvency.ts` |

## Parallel sessions (2026-10-28)
Two sessions are running at once. To avoid merge conflicts:
| Session | Branch | Owns |
|---|---|---|
| **Launch** (session 3) | `claude/pensive-faraday-5frreq` | backend + launch: `apps/worker/**`, `.github/**`, `packages/**`, `apps/web/lib/**`, `apps/web/app/api/**`, `apps/web/instrumentation.ts`, `docs/**` (except the design section below) |
| **Design** (new) | `claude/design-restyle` (branch off the latest `claude/pensive-faraday-5frreq`) | the look: `apps/web/app/globals.css`, `apps/web/app/layout.tsx` (header/footer **styling**), `apps/web/app/page.tsx` (home), `apps/web/components/**` (visual markup/classes only), fonts/assets in `apps/web/public/**`, plus `docs/11-design-system.md` (new) |

Rules for the design session:
- Don't change logic, props, data fetching, API calls or `lib/**`. Restyle with classes/markup only. If a component needs new data, note it in `docs/11-design-system.md` for the launch session.
- Keep the existing text content (fees, beta cap, terms links), restyled.
- Use CSS tokens in `globals.css` for every colour/radius/font, so future tweaks stay one place.
- Browse https://blink.cash and https://wspr.ai with Playwright first (network access is Full). Record what you copy (palette, fonts, spacing, motion) in `docs/11-design-system.md`.
- Before finishing: `pnpm typecheck` + `pnpm --filter @adspaces/web build`, screenshots (desktop + mobile), push your branch, and update the "Design" row here.
- Merging: whichever session finishes second merges the other branch (`git merge`, no rebase) and resolves conflicts in favour of design for styling and launch for logic.

## Session 3 result (launch-ready beta): done
All items shipped: fee tiers, beta cap, `/terms` + `/privacy`, prod guards (web + worker), worker `--once` + GitHub Actions + CI, launch runbook, ADR-0014..0017. Details: `log/2026-10-28-session-3.md`.

## Vercel
**Live staging demo:** https://web-6wfa.vercel.app (dev mode: Neon with isolated preview copies, public Blob, `DEV_LOGIN=1` + `ALLOW_DEV_LOGIN=1`). Pushes to `claude/pensive-faraday-5frreq` deploy production; other branches get preview URLs. `vercel-build` = migrate + build. Re-run the live e2e:
```bash
cd apps/web && BASE=https://web-6wfa.vercel.app E2E_HANDLE=newname NODE_USE_ENV_PROXY=1 node scripts/e2e.mjs
```

## Next
1. **Redesign (being done in parallel by the Design session, see above)** to feel like https://blink.cash and https://wspr.ai. When it's pushed, merge `claude/design-restyle` per the rules above. The owner set network access to Full for new sessions, so **browse both sites with Playwright first** (screenshots, fonts, colours, spacing, motion). Then restyle: tokens at the top of `apps/web/app/globals.css`, layout chrome in `app/layout.tsx`, home hero in `app/page.tsx`.
2. Evaluate the **Blink SDK** (blink.cash) for the payment step (ADR-0009), now that the site is reachable.
3. Owner launch steps: `docs/10-launch-runbook.md` (X app + first credit purchase → $20 bonus, wallets, Vercel prod env, GitHub secrets + `WORKER_ENABLED`, $1 smoke test).
4. Evaluate **Privy** embedded wallets (ADR-0017, proposed): easier wallets for businesses/creators; keep dev login for $0 testing.

## How to run (zero cost)
See README → "Run with zero X credits". Short version:
```bash
pnpm install
```
```bash
cp .env.example .env   # DATABASE_URL, AUTH_SECRET; DEV_LOGIN=1, BANNER_SOURCE=dev, PAYMENTS_PROVIDER=dev
```
```bash
pnpm --filter @adspaces/db migrate && pnpm --filter @adspaces/web dev
```

## Tests
```bash
pnpm typecheck && pnpm --filter @adspaces/shared test
```
```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5433/adspaces_test pnpm --filter @adspaces/worker test
```
Local Postgres in the cloud container: data dir `/var/lib/postgresql/adspaces-test`, port 5433:
```bash
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/adspaces-test -o '-p 5433 -k /tmp' -l /var/lib/postgresql/adspaces-test/log start"
```

## Gotchas (learned the hard way)
- `@adspaces/shared/server` (sharp, fs, crypto) is **server-only**. Client components import `@adspaces/shared`.
- `updated_at` uses the real clock. Don't use it in job logic tested with a pretend clock (use `cycle_start`, `accepted_at`).
- postgres-js can't bind a raw `Date` in a `sql` template; pass `date.toISOString()` with `::timestamptz`.
- `next start` doesn't serve files added to `public/` after build, so images go through `/api/uploads/[name]` (local) or Vercel Blob.
- Killing the dev server with `pkill -f "next start"` also kills your own shell. Use `ps aux | grep "[n]ext-server"`.
- Scratchpad dirs can lose permissions, so keep Postgres data under `/var/lib/postgresql`.
- dHash alone can't tell flat colours apart. That's why signatures include mean RGB.
- New Vercel Blob stores have **no** `BLOB_READ_WRITE_TOKEN`; they use `BLOB_STORE_ID` + OIDC (works on Vercel only). The GitHub worker needs a read-write token created manually.
- Node's `fetch` ignores `HTTPS_PROXY` in the cloud sandbox: use `NODE_USE_ENV_PROXY=1` for scripts that call the live site.
- `drizzle-kit migrate` swallows errors; use `pnpm --filter @adspaces/db migrate` (our script).

## Open questions for the owner
- Treasury address (Squads multisig recommended).
- Privy (ADR-0017): go/no-go after reading its docs; pricing jumps to $299/mo past 499 MAU.
- Should the "Ad space available" tag include a short URL?
