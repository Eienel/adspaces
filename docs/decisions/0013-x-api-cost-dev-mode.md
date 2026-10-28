# ADR-0013: X API cost strategy + $0 dev mode

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner ("don't have money for X API credits at the moment")

## Context
The X API is pay-per-use (no free tier for new apps). We need to build and test with $0, and run cheaply at launch.

## Decision
1. **Dev mode** (`DEV_LOGIN=1`; refuses `NODE_ENV=production` unless `ALLOW_DEV_LOGIN=1`):
   - "Dev login" creates a fake X user with a generated banner and stable follower count.
   - Dev buttons simulate "business paid" and "creator uploaded the banner" (re-encoded as JPEG like X).
   - Worker: `BANNER_SOURCE=dev` (reads `users.banner_url`) and `PAYMENTS_PROVIDER=dev` (fake instant settlements).
   - `pnpm --filter @adspaces/worker run-at <ISO time>` runs the jobs with a pretend clock, so a whole week plays out in minutes.
2. **Launch cheaply**, as reported by third-party guides (re-verify on X's pricing page):
   - X gives a one-time ~$20 credit when you add a card.
   - Reading your *own* account ("owned read", `/2/users/me`) costs ~$0.001 vs $0.01 per user.
3. **`BANNER_SOURCE=owned`:** at X login we store the creator's refresh token **encrypted** (AES-256-GCM, `TOKEN_ENC_KEY`). The worker refreshes it (X rotates tokens; the new one is saved), reads `/2/users/me?user.fields=profile_banner_url`, and falls back to the app bearer token if that fails.
4. Banner *images* on pbs.twimg.com are public, so downloading them is free. Default checks are 2/day.
5. Metrics sync (valuation) only runs when `X_BEARER_TOKEN` is set; otherwise valuations update at each login.

## Consequences
- The whole product is testable at $0. Real X behaviour (OAuth, rate limits, token rotation) is still untested until credentials exist.
