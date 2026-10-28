# ADR-0012: Businesses can sign in with a Solana wallet

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Owner (chose "X login or wallet")

## Decision
Auth.js Credentials provider `solana`. `/api/wallet/login-challenge` stores a nonce for the pubkey. The user signs `walletLoginMessage(nonce)`, the server verifies the ed25519 signature, burns the nonce (single-use, 10 min TTL), then finds or creates the user by `wallet_pubkey`. `users.x_id` is nullable. Creators still need X, because the banner must be theirs.

## Consequences
- No email system needed. A wallet already linked to a creator signs into that creator's account (same person).
