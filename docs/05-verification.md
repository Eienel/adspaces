# 05 — Banner Verification

## Goal
Prove, with an auditable log, that the seller's X banner showed the advertiser's creative for the booked period.

## How
1. **Banner URL source:** X API v2 user lookup with `user.fields=profile_banner_url`. Batch endpoint `GET /2/users?ids=...` (up to 100 ids/request). Confirmed in the docs (see 06-x-platform-notes.md).
2. **Fast path:** if the observed `profile_banner_url` equals the URL already approved for this booking → pass with no image download.
3. **Image compare:** otherwise download the banner (append `/1500x500`), compute a **perceptual hash** (64-bit dHash via `sharp`; code in `packages/shared/src/phash.ts`) and compare its Hamming distance to the creative's hash. X re-encodes uploads, so exact byte equality never works; pHash survives re-compression/resizing.
   - `distance ≤ 10` (of 64) → match. The threshold lives in `PHASH_MATCH_THRESHOLD` and is tuned with real samples.
4. Each check writes a `verifications` row (observed URL, distance, pass, error).

## Schedule & cost
- X API is **pay-per-use, about $0.01 per user read** (2026 pricing). We check each live booking at random times, **4× per day by default** (`VERIFY_CHECKS_PER_DAY`), so sellers can't predict and swap. 1 booking × 7 days ≈ 28 reads ≈ $0.28 — tiny next to the fee.
- Batching 100 users/request cuts request count, not per-resource cost.

## Settlement rule
- `uptime = passed_checks / total_checks` (errors don't count either way).
- `uptime ≥ 0.9` → release · `uptime < 0.5` → refund · in between → `disputed` (admin decides). The thresholds are in shared config.
- Phase 2: pro-rata payouts (pay for the verified share).

## Edge cases
- **Banner removed / null:** check fails.
- **X API down / rate-limited:** recorded as an error, not counted; retried with backoff.
- **Seller account suspended or protected:** check fails; flagged.
- **Seller swaps the banner between checks:** random timing makes this unreliable for them; Phase 2 can raise the frequency for low-reputation sellers.
- **Creative aspect ratio:** we require 1500×500 (3:1) uploads so the hash compares like with like.
