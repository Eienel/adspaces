# ADR-0005: Banner verification = X API v2 + perceptual hash, random checks

- **Status:** Accepted
- **Date:** 2026-10-28

## Context
We must prove the banner was actually displayed. X re-encodes images, so byte comparison fails.

## Decision
- Fetch `profile_banner_url` via the official X API v2 (batch `/2/users?ids=`), behind a `BannerSource` interface.
- Compare images with a **64-bit difference hash (dHash)** computed with `sharp`; Hamming distance ≤ threshold (default 10) = match. Fast path: same URL as last approved check = match.
- Check at **random times** (default 4/day) and log every check; settle on the uptime ratio.

## Alternatives considered
- Scraping profile pages: against X ToS, fragile.
- Screenshots via headless browser: expensive, fragile, needs login.
- Asking the seller to auto-post a proof tweet: weaker, and annoying.

## Consequences
- ~$0.01 per check (pay-per-use API). Cheap compared with fees.
- Threshold needs tuning with real banners.
