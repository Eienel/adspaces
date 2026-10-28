# Roadmap

Tick items as they land. Each item should map to code + docs.

## Phase 0 — Foundations
- [x] Validate core assumption: banner change does not remove the blue tick (06-x-platform-notes.md)
- [x] Confirm X API v2 exposes `profile_banner_url` + pricing
- [x] Docs folder, ADRs 0001–0006, CLAUDE.md
- [ ] Monorepo scaffold (pnpm + turbo, TS strict, lint, vitest)

## Phase 1 — MVP (devnet)
- [ ] `packages/shared`: booking state machine, fee math, zod schemas, dHash, settlement rule
- [ ] `packages/shared`: profile valuation + price cap (ADR-0007)
- [ ] `packages/db`: Drizzle schema + migrations
- [ ] Web: sign in with X, user upsert
- [ ] Web: wallet connect + signed-nonce wallet link
- [ ] Web: create/edit/browse listings (cached)
- [ ] Web: booking request with creative upload, accept/decline
- [ ] Web: Solana Pay payment request (QR + wallet button)
- [ ] Worker: payment watcher (reference lookup → funded)
- [ ] Worker: banner verifier (X API batch + dHash)
- [ ] Worker: settlement (release / refund / dispute)
- [ ] Dashboards: seller & advertiser
- [ ] Deploy: Vercel (web) + Railway/Fly (worker) + Neon + Upstash
- [ ] Owner: X developer app, API credits, treasury Squads multisig, decide fee %

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
