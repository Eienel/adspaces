# 08 — Profile Valuation & Price Cap

## Idea (owner, 2026-10-28)
A profile's worth is judged by **profile views**, so each profile has a **maximum price per day** based on its value. This stops absurd listings and gives advertisers fair pricing.

## Constraint: profile views aren't in the public X API
Profile visit counts appear only in the owner's own X analytics (Premium). As far as we know, the X API v2 doesn't expose them (**re-verify periodically**; if it ever does, switch `ProfileSignals.profileVisitsPerDay` to the real value). So we **estimate** them.

## Model (implemented in `packages/shared/src/valuation.ts`)
Inputs (`ProfileSignals`), all available via the X API v2 or our own data:
- `followers` — `public_metrics.followers_count`
- `avgImpressions` — mean `public_metrics.impression_count` of the seller's recent ~20 posts
- `engagementRate` — (likes+reposts+replies+quotes) / impressions over those posts
- `verified` — blue checkmark
- `reportedProfileVisitsPerDay` (optional) — from an **analytics screenshot reviewed by an admin**; when present and approved, it replaces the estimate

Steps:
1. **Estimated daily profile visits** = `max(followers × 0.002, avgImpressions × 0.01)`, then × 1.1 if verified, × (0.75 to 1.5) by engagement quality. (Starting heuristics; tune with real data.)
2. **Max price/day** = `visits/1000 × MAX_CPM_USDC` (default $25 CPM), floored at a $1/day minimum and rounded to cents.
3. A listing's `price_per_day_usdc` must be ≤ `max_price_per_day_usdc`, which is stored on the user and recomputed on profile sync.

All constants live in `VALUATION_DEFAULTS` so they can be tuned in one place.

## Also shown to advertisers
- Estimated daily views and estimated CPM for each listing ("$X per 1k views") → helps compare listings.

## Anti-gaming
- Recent-post impressions are hard to fake cheaply, but bought followers/engagement exist → the engagement-quality factor caps low-quality profiles. Phase 2: outlier detection, reputation.
