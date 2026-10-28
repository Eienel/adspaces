# 04 — Payments & Escrow

## Current approach (Phase 1): custodial escrow via Solana Pay — see ADR-0003
There's no money yet to deploy an on-chain program, so the platform holds escrowed USDC in a platform-controlled wallet. Nothing custom is deployed; we only use the existing SPL Token program.

### Wallets
- **Escrow deposit wallet** (`ESCROW_WALLET`): receives advertiser payments. Its key is held by the worker (env `ESCROW_WALLET_SECRET`) so it can pay out. Keep the balance low by sweeping fees to the treasury.
- **Treasury** (`TREASURY_WALLET`): receives platform fees. **Should be a Squads multisig** (free to use, already deployed) so no single leaked key can drain revenue.

### Flow
1. **Payment request:** on `accept`, the server generates a random `reference` keypair (only the pubkey is stored) and builds a Solana Pay URL:
   `solana:<ESCROW_WALLET>?amount=<usdc>&spl-token=<USDC_MINT>&reference=<ref>&label=AdSpaces&memo=booking:<id>`
   The advertiser's wallet (Phantom/Solflare/Backpack) signs a normal USDC transfer.
2. **Detection:** the worker calls `getSignaturesForAddress(reference)` and validates the tx: correct mint, recipient ATA, amount ≥ expected, confirmed/finalized. → booking `funded`, `funding_tx` saved.
3. **Release:** `payout = amount - fee`; the worker sends `payout` USDC to the seller's linked wallet and `fee` to the treasury.
4. **Refund:** the worker sends `amount` back to the paying wallet (the source owner of the funding tx).
5. Every payout/refund tx signature is stored in `settlement_tx`. **Idempotency:** settlement takes a row lock and checks `settlement_tx IS NULL` first.

### Fee math (`packages/shared/src/fees.ts`)
- `fee = floor(amount * fee_bps / 10_000)`, `payout = amount - fee` (rounding always favors the seller).
- `fee_bps` is copied onto the booking at creation, so later fee changes don't affect existing deals.
- Default `PLATFORM_FEE_BPS=1000` (10%) — **placeholder, owner to decide.**

### Costs
- Solana tx fee ≈ 0.000005 SOL. Creating a recipient's USDC token account if missing ≈ 0.002 SOL of rent (paid by the escrow wallet; it needs a small SOL balance).

### Risks of custody (accepted for now)
- A hot-key compromise exposes escrowed funds → keep balances low, monitor, sweep fees to multisig.
- Regulatory: holding funds for others may count as money transmission in some places. See 07-security-legal.md.

## Future approach (Phase 3): on-chain escrow program — see ADR-0006
An Anchor program with `initialize_config(fee_bps, treasury, oracle)`, `fund(booking_id, amount)` into a PDA vault, `release` (seller + fee split), `refund`, callable only by the oracle key. It's the same `PaymentsProvider` interface, so the web app and worker don't change. Devnet deploy is free (faucet SOL). A mainnet deploy needs about 1–3 SOL of rent (recoverable) **plus an audit** before holding real money.
