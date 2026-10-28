# 01 — Scope

## MVP (Phase 1) — in scope
- Sign in with X (OAuth 2.0); sync handle, name, avatar, follower count, verified flag.
- Link a Solana wallet by signing a message (SIWS-style).
- Seller listings: price per day (USDC), min/max days, categories, blocked categories, description.
- Browse/search listings (filter by followers, price, category; sort), paginated and cached.
- Booking flow: request (with creative upload) → accept/decline → fund escrow → go live → verify → complete/refund.
- Solana escrow program: config (fee bps, treasury, oracle), fund, release (seller + fee split), refund.
- Verification worker: fetch the seller's current banner, perceptual-hash compare against the creative, log every check.
- Settlement worker: on booking end, if checks pass → `release`, otherwise → `refund` (or flag `disputed` in borderline cases).
- Profile valuation: estimated daily views → max price/day cap on listings (08-profile-valuation.md).
- Basic dashboard for sellers (incoming requests, earnings) and advertisers (bookings, verification history).

## Phase 2
- Disputes UI + admin console (creative moderation, manual resolve).
- Pro-rata / streaming payouts (pay per verified day).
- Ratings and reputation for both sides.
- Notifications (email, X DM).
- Advertiser analytics: profile visit estimates, screenshot proofs.
- Tracked short links / QR codes in creatives (click counts → virality score, needed for Phase 4).
- Admin-reviewed analytics screenshots to raise a seller's price cap.

## Phase 3
- Mainnet launch after a **program audit**.
- Bulk campaigns (book many banners at once).

## Phase 4
- AdSpaces token on Meteora DBC with fee-funded, virality-weighted buyback-and-burn (09-token.md, ADR-0008). Legal review first.
- Other surfaces: pinned posts, bio links, other platforms.
- Fiat on-ramp.

## Explicitly out of scope (for now)
- Changing the banner automatically on the seller's behalf (needs v1.1 write scope; risky and policy-sensitive). The seller sets it manually.
- Holding user funds off-chain (custodial). See ADR-0003.
- A token in the MVP (planned for Phase 4, see 09-token.md).
