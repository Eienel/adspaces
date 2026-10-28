# ADR-0007: Estimated profile value caps listing price

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner (idea), Claude (model)

## Context
The owner wants each profile's price capped by its value, judged by profile views. The X API doesn't expose profile visit counts.

## Decision
Estimate daily profile visits from API-available signals (followers, recent post impressions, engagement, verified), optionally overridden by an admin-reviewed analytics screenshot. Max price/day = estimated visits/1000 × max CPM. Listing prices are validated against that cap. See 08-profile-valuation.md.

## Alternatives considered
- No cap (free market): allows scams and spam listings.
- Follower count only: easy to game with bought followers; ignores reach.

## Consequences
- The heuristics need tuning once we have real data; constants are centralized.
- Profile sync reads the user + ~10 recent posts (≈ $0.11 per sync with pay-per-use pricing). Synced at every login and **weekly** by the worker for sellers with active listings (`METRICS_SYNC_DAYS=7`).
