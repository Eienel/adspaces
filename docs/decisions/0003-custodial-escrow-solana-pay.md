# ADR-0003: Phase-1 escrow is custodial (platform wallet + Solana Pay)

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner ("we may not have money to deploy a program yet — platform custody or another workaround"), Claude

## Context
The owner wants escrow protection **and** a platform fee. A custom Solana program costs ~1–3 SOL rent to deploy on mainnet and should be audited before holding money. The budget isn't there yet.

## Decision
- Advertisers pay USDC to a **platform escrow wallet** using a **Solana Pay** transfer request with a unique per-booking `reference` key.
- The worker detects payment by `reference`, then later **releases** (seller payout + fee to treasury) or **refunds** from the escrow wallet.
- The treasury is a **Squads multisig** (already deployed, free to use).
- All payment logic goes behind the `PaymentsProvider` interface so ADR-0006 (on-chain escrow) can replace it without touching the app.

## Alternatives considered
- **Direct P2P payment** (advertiser → seller): no protection, and no reliable fee collection.
- **Per-booking Squads multisig** (advertiser + seller + platform, 2-of-3): non-custodial with no deploy, but heavy UX (every party signs) and per-booking rent. Possible Phase-2 option.
- **Streamflow/other existing escrow protocols:** possible, but extra protocol fees and a dependency; revisit later.

## Consequences
- Zero deploy cost; ship now.
- We custody user funds → security (hot key) and legal (money transmission) risk; mitigations in 07-security-legal.md.
- Migrate to ADR-0006 before scaling real volume.
