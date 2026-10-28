# HANDOFF — current state (read this first)

> A living document. **Every session updates it before ending** so the next session (human or agent) can continue cold.
> History lives in `log/`, decisions in `decisions/`, the plan in `roadmap.md`. This page is just "where are we now".

_Last updated: 2026-10-28, session 3 (in progress)_

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

## Parallel sessions (2026-10-28)
Two sessions are running at once. To avoid merge conflicts:
| Session | Branch | Owns |
|---|---|---|
| **Launch** (session 3) | `claude/pensive-faraday-5frreq` | backend + launch: `apps/worker/**`, `.github/**`, `packages/**`, `apps/web/lib/**`, `apps/web/app/api/**`, `apps/web/instrumentation.ts`, `docs/**` (except the design section below) |
| **Design** (done, ready to merge) | `claude/design-restyle` (branch off the latest `claude/pensive-faraday-5frreq`) | the look: `apps/web/app/globals.css`, `apps/web/app/layout.tsx` (header/footer **styling**), `apps/web/app/page.tsx` (home), `apps/web/components/**` (visual markup/classes only), fonts/assets in `apps/web/public/**`, plus `docs/11-design-system.md` (new) |

Rules for the design session:
- Don't change logic, props, data fetching, API calls or `lib/**`. Restyle with classes/markup only. If a component needs new data, note it in `docs/11-design-system.md` for the launch session.
- Keep the existing text content (fees, beta cap, terms links), restyled.
- Use CSS tokens in `globals.css` for every colour/radius/font, so future tweaks stay one place.
- Browse https://blink.cash and https://wspr.ai with Playwright first (network access is Full). Record what you copy (palette, fonts, spacing, motion) in `docs/11-design-system.md`.
- Before finishing: `pnpm typecheck` + `pnpm --filter @adspaces/web build`, screenshots (desktop + mobile), push your branch, and update the "Design" row here.
- Merging: whichever session finishes second merges the other branch (`git merge`, no rebase) and resolves conflicts in favour of design for styling and launch for logic.

**Design result (2026-10-28):** restyle done on `claude/design-restyle`. Concept "layout sheet" (dot-grid paper, dashed slots + crop marks, "Booked" stamp, hang-tag prices, one "Ad space available" tape). Serif EB Garamond + Figtree, self-hosted. See `docs/11-design-system.md` and ADR-0017; screenshots in `docs/design-screenshots/`. Typecheck + web build pass, no horizontal scroll at 390px. Besides the assigned files, it made class-only colour fixes in `app/bookings/[id]`, `app/dashboard`, `app/listings/[id]` and `app/ads/[id]` pages (they hard-coded dark-theme colours). New UI: use the tokens, and avoid `text-white` / `bg-white/x` on paper.

## In progress (session 3: launch-ready beta)
Plan: `/root/.claude/plans/…` is not in the repo, so the plan is copied here:
- [x] Fee tiers by booking size: <$100 → 2.5%, $100–499 → 1.5%, ≥$500 → 0.75% (`packages/shared/src/fees.ts` `feeBpsForAmount`), tests added
- [x] Use tiers + **$1,000 beta cap** (`MAX_BOOKING_USDC`) in `apps/web/lib/bookings.ts`; fee line in booking/offer forms (`components/fee-line.tsx`); fee table on home (`components/fee-table.tsx`)
- [ ] Worker `--once` mode + `.github/workflows/worker.yml` (cron every 5 min, free because the repo is public) + `ci.yml`
- [~] Production guards: web startup check done (`apps/web/instrumentation.ts`); worker guard pending
- [x] `/terms` + `/privacy` beta pages, footer links
- [ ] `docs/10-launch-runbook.md` (X app, Neon, Solana wallets, Vercel, GitHub secrets, $1 smoke test)
- [ ] ADR-0014 (fees), ADR-0015 (beta cap), ADR-0016 (GitHub Actions worker); update 04/06/00 docs

## Next after that
1. **Redesign: done** on `claude/design-restyle` (see "Design result" above). Merge it. The second reference site is **wisprflow.ai**; wspr.ai is a parked domain.
2. Evaluate the **Blink SDK** (blink.cash) for the payment step (ADR-0009), now that the site is reachable.
3. Owner launch steps (see the runbook once written): X app + first credit purchase ($20 bonus), Neon, escrow wallet + SOL, Vercel, GitHub secrets.

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
- Styling: colours are tokens in `globals.css` on a light paper theme. `text-white` / `bg-white/5` / `bg-black/30` (from the old dark theme) are invisible or muddy now. Use `--sand`, `--panel-2`, `--muted`, `--on-dark`.
- `next dev` generates `apps/web/AGENTS.md` (untracked). Don't commit it; `agentRules: false` in `next.config.ts` turns it off.
- In Playwright, `waitForURL('**/dashboard')` also matches `/signin?next=/dashboard`. Use a pathname predicate.

## Open questions for the owner
- Treasury address (Squads multisig recommended).
- Should the "Ad space available" tag include a short URL?
