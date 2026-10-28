# ADR-0014: Platform fee tiered by booking size (2.5% → 0.75%)

- **Status:** Accepted (supersedes the 10% placeholder)
- **Date:** 2026-10-28
- **Deciders:** Owner ("7.5% screams horrible"; max 2.5%, min 0.75%, by booking size)

## Decision
`FEE_TIERS` in `packages/shared/src/fees.ts`, chosen per booking with `feeBpsForAmount(amount)`:
| Booking total | Fee |
|---|---|
| under $100 | 2.5% (250 bps) |
| $100–$499.99 | 1.5% (150 bps) |
| $500+ | 0.75% (75 bps) |
The fee is stored on the booking (`fee_bps`) at creation, so changing tiers never affects existing deals. Taken at payout only (refunds pay back the full amount). Rounding favours the creator (fee floored).
The home page fee table and `/terms` render from `FEE_TIERS`, so they can't drift.

## Consequences
Low take rate. Revenue depends on volume. Solana network fees for payouts/refunds are paid by the escrow wallet (fractions of a cent).
