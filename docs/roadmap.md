# Roadmap

Tick items as they land. Each item should map to code + docs.

## Phase 0 — Foundations
- [x] Validate core assumption: banner change does not remove the blue tick (06-x-platform-notes.md)
- [x] Confirm X API v2 exposes `profile_banner_url` + pricing
- [x] Docs folder, ADRs 0001–0006, CLAUDE.md
- [x] Monorepo scaffold (pnpm + turbo, TS strict, lint, vitest)

## Phase 1 — MVP (devnet)
- [x] `packages/shared`: booking state machine, fee math, zod schemas, dHash, settlement rule
- [x] `packages/shared`: profile valuation + price cap (ADR-0007)
- [x] `packages/db`: Drizzle schema + migrations
- [x] Web: sign in with X, user upsert
- [x] Web: wallet connect + signed-nonce wallet link
- [x] Web: create/edit/browse listings (cached)
- [x] Web: booking request with creative upload, accept/decline
- [x] Web: Solana Pay payment request (QR + wallet button)
- [x] Worker: payment watcher (reference lookup → funded)
- [x] Worker: banner verifier (X API batch + dHash)
- [x] Worker: settlement (release / refund / dispute)
- [x] Dashboards: seller & advertiser
- [ ] Live devnet test with real X app + wallets (code done, untested against real X/Solana)
- [ ] Deploy: Vercel (web) + Railway/Fly (worker) + Neon + Upstash
- [ ] Owner: X developer app, API credits, treasury Squads multisig, decide fee %

## Phase 1b — Segments & businesses (session 2)
- [x] Segment layouts + per-segment pricing within the cap (ADR-0010)
- [x] Weekly cycles, cutoff, composite banner job
- [x] Per-segment verification (region signatures)
- [x] Business portal, ad board, creator offers, two-way accept (ADR-0011)
- [x] Wallet sign-in for businesses (ADR-0012)
- [x] $0 dev mode: dev login, simulated payments/banners, `run-at` clock helper (ADR-0013)
- [x] Owned-token banner source with encrypted refresh tokens (ADR-0013), untested against real X
- [ ] Restyle to match blink.cash / wspr.ai (blocked: sites not reachable from the build session; need screenshots or network access)
- [ ] Notifications when it's someone's turn (accept / pay / upload banner)

## Phase 2 — Trust & growth
- [ ] Admin console: creative moderation, dispute resolution
- [ ] Pro-rata payouts
- [ ] Ratings / reputation
- [ ] Notifications (email / X DM)
- [ ] Sanctions screening on payout wallets
- [ ] Solana Action / Blink endpoint to pay for bookings from X (ADR-0009)
- [ ] Evaluate blink.cash as a payment platform (ADR-0009)
- [ ] Tracked short links / QR in creatives → virality score
- [ ] Analytics-screenshot review to raise price caps

## Phase 3 — Mainnet & scale
- [ ] Anchor escrow program (ADR-0006) + tests on devnet
- [ ] Audit, mainnet deploy, migrate `PaymentsProvider`
- [ ] Bulk campaigns, analytics

## Phase 4 — Token (proposed, ADR-0008)
- [ ] Legal opinion on token + buyback-and-burn
- [ ] Token launch on Meteora DBC
- [ ] Fee-funded buyback-and-burn job weighted by virality score
- [ ] Public burn log page
