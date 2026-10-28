# 03 — Data Model

Source of truth: `packages/db/src/schema.ts`. Keep this doc in sync. Migrations were re-squashed into a single `0000` on 2026-10-28 (nothing was deployed).

## Tables
| Table | Key columns |
|---|---|
| `users` | id, x_id (unique, **nullable**: wallet-only businesses; dev logins use `dev:<handle>`), handle (nullable), name, avatar_url, banner_url, followers_count, verified, wallet_pubkey (unique), x_refresh_token_enc, business_name, business_url, valuation fields (avg_impressions, engagement_rate_bps, reported_daily_views, est_daily_views, max_price_per_day_usdc, metrics_synced_at), is_admin |
| `listings` | one per creator: id, seller_id (unique), title, description, **layout**, original_banner_url (base art), show_available_tag, min_weeks, max_weeks, categories[], blocked_categories[], min_price_per_day_usdc + shapes[] (denormalized for browse), status |
| `segments` | id, listing_id, idx, **shape**, x, y, w, h, price_per_day_usdc, active (old layouts are deactivated, not deleted) |
| `creatives` | id, advertiser_id, **shape**, image_url (normalized to exact size), phash, width, height |
| `ad_campaigns` | id, business_id, title, brief, creative_id, shape, ad_category, audience[], max_price_per_day_usdc, weeks, status (`open`/`closed`) |
| `bookings` | id, **segment_id**, listing_id, seller_id, advertiser_id, creative_id, campaign_id?, **origin** (`business_request`/`creator_offer`), ad_category, **cycle_start** (Monday 00:00 UTC), **weeks**, end_at, amount_usdc, fee_bps, payment_reference, accepted_at, funding_tx, payer_wallet, funded_at, live_at, approved_banner_url, next_check_at, settlement_kind, settlement_tx, settlement_valid_height, settled_at, status |
| `banner_compositions` | id, listing_id, cycle_start (unique together), image_url, content_hash, segment_signatures (jsonb: segment id → region signature), booking_ids[] |
| `verifications` | id, booking_id, checked_at, observed_banner_url, hash_distance, pass, error |
| `wallet_challenges` | id, user_id? (wallet linking), pubkey? (wallet login), nonce, expires_at, used_at |

**Money is always an integer in micro-USDC** (1 USDC = 1_000_000). Never use floats for money.
Booking amount = `segment price/day × 7 × weeks`.

## Booking state machine
Implemented in `packages/shared/src/booking.ts` (`canTransition`, `transition`).

```
requested ──accept──▶ accepted ──fund──▶ funded ──go_live──▶ live ──complete──▶ completed
    │                    │                  │                  │
    ├─decline─▶ declined │                  │                  ├─fail────▶ refunded
    └─cancel──▶ cancelled└─cancel─▶ cancelled└─expire─▶ refunded└─dispute─▶ disputed ──resolve_release─▶ completed
                                                                                    └─resolve_refund──▶ refunded
```
- Who accepts: the counterparty of whoever proposed (see ADR-0011).
- At the Saturday 12:00 UTC cutoff, `requested`/`accepted` bookings for that week are cancelled. A payment that still lands afterwards is recorded and refunded (status stays `cancelled`, `settled_at` set).
- `funded → refunded` (expire): ad not visible within 24h of the cycle start.
- `funded → live` on the first passing check at/after the cycle start; `end_at = cycle_start + weeks × 7d`.
- Terminal states: `completed`, `refunded`, `declined`, `cancelled`.

## Notes
- `bookings.next_check_at` drives the verifier; the worker claims rows with `FOR UPDATE SKIP LOCKED`.
- `settlement_tx` is stored **before** sending (see 04-payments-escrow.md), so retries never double-pay.
- A segment can't have overlapping held bookings (accepted/funded/live/disputed); accept locks the segment row.
