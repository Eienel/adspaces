# ADR-0015: $1,000 beta cap per booking + escrow solvency check

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner (chose $1,000)

## Context
Escrow is custodial (ADR-0003) and unaudited. Limit the damage of a bug or key leak during the beta.

## Decision
- `MAX_BOOKING_USDC` (default 1000) enforced when a booking is requested or offered (`apps/web/lib/bookings.ts → priceBooking`). The UI warns before submitting.
- The worker compares the escrow wallet's USDC balance with what the platform owes (paid, unsettled bookings + late payments to refund) on every run and logs `ALERT escrow balance below what is owed` if short (`apps/worker/src/jobs/solvency.ts`). Monitoring only.

## Consequences
Big advertisers must split campaigns. Raise the cap after the on-chain escrow (ADR-0006) or an audit.
