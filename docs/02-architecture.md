# 02 — Architecture

## Components
```
            ┌───────────────────────── Vercel (CDN + serverless) ─────────────────────────┐
 Browser ──▶│ apps/web  (Next.js App Router)                                               │
 (wallet)   │  - pages: /, /listings, /listings/[id], /dashboard, /bookings/[id]           │
            │  - API routes: /api/auth/*, /api/listings, /api/bookings, /api/wallet/link   │
            └───────┬───────────────────────────────┬──────────────────────────────────────┘
                    │                               │
              Postgres (Neon/Supabase,         Redis (Upstash)
              pooled; Drizzle ORM)             cache · rate-limit · locks
                    │                               │
            ┌───────┴───────────────────────────────┴───────┐
            │ apps/worker (long-running Node process)        │
            │  - payment watcher  (Solana RPC, Solana Pay ref)│
            │  - banner verifier  (X API v2 batch lookup)     │
            │  - settlement       (USDC payout / refund)      │
            └───────┬──────────────────────────┬─────────────┘
                    │                          │
              X API v2 (/2/users)        Solana RPC (Helius/Triton/public)
```

## Data flow: happy-path booking
1. Advertiser requests a booking → `bookings.status = requested` (creative uploaded, pHash stored).
2. Seller accepts → `accepted`. The server creates a Solana Pay transfer request with a unique `reference` pubkey and amount.
3. Advertiser pays in their wallet → the payment watcher finds the tx by `reference`, validates amount/mint/recipient → `funded`.
4. Seller sets the banner and clicks "I've set it" → immediate verification → `live` when it matches.
5. Verifier re-checks at random times until `end_at`. Each check is a row in `verifications`.
6. At `end_at`, settlement computes the uptime ratio → `release` (seller payout minus fee) or `refund` → `completed` / `refunded`. Borderline → `disputed` for admin review.

## Scaling to ~100k concurrent visitors
- **Read-heavy pages** (home, browse, listing detail) are server-rendered with **ISR / `revalidate`** and served from the CDN; most traffic never touches Postgres.
- **Hot queries** (browse filters) are cached in Redis with short TTLs and invalidated on listing writes.
- **Postgres** goes through a pooled connection (Neon serverless driver / PgBouncer). Indexes on `listings(status, price)`, `bookings(status, end_at)`, etc.
- **Rate limiting** on writes and auth endpoints (Upstash ratelimit).
- **The worker is decoupled** from web traffic. It batches X lookups (100 users/request) and uses Postgres `FOR UPDATE SKIP LOCKED` so several workers can run safely.
- Stateless web tier → scales horizontally on Vercel with no changes.

## Key interfaces (swap points)
- `BannerSource` (packages/shared): `getBanners(xUserIds) → Map<id, bannerUrl|null>`. Implementations: `XApiBannerSource`, `MockBannerSource`.
- `PaymentsProvider` (packages/shared): `createPaymentRequest`, `findPayment`, `release`, `refund`. Implementations: `CustodialSolanaPayProvider` (now), `EscrowProgramProvider` (later, see ADR-0006).
