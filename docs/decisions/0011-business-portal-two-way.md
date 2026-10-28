# ADR-0011: Business portal and two-way matching

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner (chose "both: post ads + book")

## Decision
- Businesses get `/business`: profile, posted ads (`ad_campaigns`), offers received, bookings to pay.
- **Two booking origins** (`bookings.origin`):
  - `business_request`: a business books a creator's slot → the **creator** accepts.
  - `creator_offer`: a creator offers a slot to an open ad on the **ad board** (`/ads`) → the **business** accepts. The slot shape must match, and the slot price must be ≤ the ad's max price/day.
- Either way, the business pays after acceptance (same escrow flow). Rule: the proposer's counterparty accepts or declines.
- A slot can't have overlapping held bookings (accepted/funded/live/disputed). Accept locks the segment row (`SELECT … FOR UPDATE`).
- Anyone can be both creator and business; there's no account type.

## Consequences
- More states in UI copy (who's waiting on whom). Logic stays in `apps/web/lib/bookings.ts → actOnBooking`.
