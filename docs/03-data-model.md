# 03 — Data Model

Source of truth: `packages/db/src/schema.ts`. Keep this doc in sync.

## Tables
| Table | Key columns |
|---|---|
| `users` | id (uuid), x_id (unique), handle, name, avatar_url, followers_count, verified, wallet_pubkey (unique, nullable), avg_impressions, engagement_rate_bps, est_daily_views, banner_url, reported_daily_views, max_price_per_day_usdc, metrics_synced_at, is_admin, created_at |
| `listings` | id, seller_id → users (**unique**: one listing per seller), title, description, price_per_day_usdc (integer, **micro-USDC**, 6 decimals), min_days, max_days, categories text[], blocked_categories text[], status (`active`/`paused`), created_at, updated_at |
| `creatives` | id, advertiser_id → users, image_url, phash (hex), width, height, created_at |
| `bookings` | id, listing_id, seller_id, advertiser_id, creative_id, ad_category, days, start_at, end_at, amount_usdc (micro), fee_bps, payment_reference (unique pubkey), accepted_at, funding_tx, payer_wallet, funded_at, live_at, approved_banner_url, next_check_at, settlement_kind, settlement_tx, settlement_valid_height, settled_at, status, created_at, updated_at |
| `verifications` | id, booking_id, checked_at, observed_banner_url, hash_distance, pass (bool), error |
| `wallet_challenges` | id, user_id, nonce, expires_at (for wallet linking) |

**Money is always an integer in micro-USDC** (1 USDC = 1_000_000). Never use floats for money.

## Booking state machine
Implemented in `packages/shared/src/booking.ts` (`canTransition`, `transition`).

```
requested ──accept──▶ accepted ──fund──▶ funded ──go_live──▶ live ──complete──▶ completed
    │                    │                  │                  │
    ├─decline─▶ declined │                  │                  ├─fail────▶ refunded
    └─cancel──▶ cancelled└─cancel─▶ cancelled└─expire─▶ refunded└─dispute─▶ disputed ──resolve_release─▶ completed
                                                                                    └─resolve_refund──▶ refunded
```
- `funded → refunded` (expire): the seller never put the banner up within the grace window (default 24h).
- Terminal states: `completed`, `refunded`, `declined`, `cancelled`.

## Notes
- `bookings.next_check_at` drives the verifier; the worker claims rows with `FOR UPDATE SKIP LOCKED` so several workers can run.
- `settlement_tx` is stored **before** sending (see 04-payments-escrow.md), so retries never double-pay.
- One active booking (accepted/funded/live/disputed) per seller at a time, enforced in `apps/web/lib/bookings.ts`.
