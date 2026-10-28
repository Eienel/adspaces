# ADR-0006: On-chain escrow program (planned, Phase 3)

- **Status:** Proposed
- **Date:** 2026-10-28

## Context
Custodial escrow (ADR-0003) carries security and legal risk. A trust-minimized escrow is the long-term goal.

## Decision (planned)
An Anchor program `adspaces_escrow`:
- `initialize_config(fee_bps, treasury, oracle)` — admin only.
- `fund(booking_id, amount)` — advertiser moves USDC into a PDA vault `["vault", booking_id]`.
- `release(booking_id)` — oracle only; splits vault → seller ATA (amount − fee) + treasury ATA (fee).
- `refund(booking_id)` — oracle only; vault → advertiser.
- Optional `advertiser_reclaim` after a long timeout, if the oracle disappears.
Implemented as `EscrowProgramProvider` behind `PaymentsProvider`.

## Consequences
- Devnet deploy is free; mainnet needs ~1–3 SOL rent + an **audit**.
- The oracle key still decides release/refund (trusted verifier), but it can't steal funds: it can only send to the booking's seller/treasury or back to the advertiser.
