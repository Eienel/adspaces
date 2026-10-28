# ADR-0002: Payments on Solana in USDC

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner

## Context
Crypto payments were a requirement. Prices should be stable and fees tiny, since many deals will be small ($20–$500).

## Decision
**Solana + USDC (SPL token).** Wallets via `@solana/wallet-adapter` (Phantom, Solflare, Backpack). Develop on **devnet**, with the USDC mint set by env (`USDC_MINT`).
- Mainnet USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Devnet: use a test mint we create, or Circle's devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.

## Alternatives considered
- Base/EVM: also cheap, but the owner prefers Solana; Solana is strong on crypto-Twitter.
- Ethereum mainnet: gas too high for small deals.

## Consequences
- All amounts are stored as integer micro-USDC (6 decimals).
- Solana Pay gives us payment requests and on-chain detection without custom programs (see ADR-0003).
