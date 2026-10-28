# ADR-0010: Segmented banners + weekly cycles + composite banners

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner ("multiple ads on 1 banner depending on user choice"; chose weekly cycles and the "Ad space available" tag), Claude

## Context
One banner should hold several ads, split however the creator chooses. With different start/end dates per ad, the banner would need to change several times a week. That burdens creators and makes verification messy.

## Decision
- **Layouts** on the 1500×500 canvas (`packages/shared/src/segments.ts`): `full`, `halves`, `thirds`, `main_side`, `side_main`. Each segment has a **shape** (`full` 1500×500, `half` 750×500, `third` 500×500, `two_thirds` 1000×500), and creatives must match it (detected by aspect ratio, normalized to exact pixels).
- **Price per segment**; the **sum ≤ the creator's valuation cap** (ADR-0007).
- **Weekly cycles** (`cycles.ts`): bookings are whole weeks starting **Monday 00:00 UTC**. **Cutoff: Saturday 12:00 UTC.** Unpaid bookings are cancelled then, and the worker **composes one banner** per listing from all paid ads covering that week. Empty segments show the creator's original art plus an optional "Ad space available · adspaces" tag.
- **Verification per segment:** each booking compares a **region signature** (64-bit dHash + mean RGB) of *its own* rectangle in the live banner with the composite's. One missing ad doesn't fail the others. The mean colour stops flat-colour images from matching each other, which dHash alone can't do.
- Grace: 24h after the cycle starts; otherwise the ad's business is refunded. If the composite is identical to last week's, it's reused and the creator sees "no change needed".
- Layout changes are blocked while a banner has open bookings. Old segments are deactivated, not deleted (history keeps working).

## Alternatives considered
- Independent dates per segment: frequent banner changes, more verification edge cases.
- One composite per booking change (no cycles): same problem.

## Consequences
- Businesses can book at most ~1.5 days ahead of a Monday. Fine for a weekly product.
- The worker needs image storage (shared `storage.ts`: Vercel Blob or a local dir).
