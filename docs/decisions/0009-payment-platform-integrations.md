# ADR-0009: Third-party payment platforms & Blinks (evaluating)

- **Status:** Proposed — evaluation pending
- **Date:** 2026-10-28
- **Deciders:** Owner (asked to check **blink.cash**), Claude

## Context
The owner would like a ready-made payment platform if a good one exists, e.g. **blink.cash**.

## Findings so far
- **blink.cash:** not evaluated yet. The build session's network policy blocked the domain and web search returned nothing about it. **TODO:** allow the domain or share its docs, then check: Solana + USDC support? Escrow/hold-and-release? Payout API? Fees? Custody model? KYC?
- **Solana Actions / Blinks** (https://solana.com/solutions/actions): an open standard. Our API returns a transaction; wallets render it as a "blink" that unfurls in X posts. Very good fit for an X-native product: a seller or advertiser could share "Pay for this booking" as a link on X. No third party is needed; it works on top of the current custodial flow (same `reference` key detection).

## Decision (for now)
- Keep the `PaymentsProvider` interface as the integration point, so any platform becomes one adapter in `apps/worker` + one payment UI component.
- Plan a **Solana Action endpoint** (`/api/actions/bookings/[id]/pay`) in Phase 2 that returns the same USDC transfer the web UI builds.
- Revisit blink.cash once it can be reviewed; record the result here.

## Consequences
- No lock-in today; a platform can be added without touching booking logic.
