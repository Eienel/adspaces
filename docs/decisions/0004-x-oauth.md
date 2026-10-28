# ADR-0004: Login with X via Auth.js (OAuth 2.0)

- **Status:** Accepted
- **Date:** 2026-10-28

## Context
Sellers must prove they own the X account whose banner they sell. X login gives us that for free.

## Decision
- **Auth.js (next-auth v5)** with the built-in **Twitter/X provider (OAuth 2.0 + PKCE)**, scopes `users.read tweet.read offline.access`.
- JWT session strategy (stateless, scales on serverless). On sign-in we upsert `users` by `x_id`.
- Wallets are **linked separately** via a signed nonce message, not used for login.

## Alternatives considered
- Wallet-first login (SIWS): doesn't prove X account ownership.
- Hand-rolled OAuth: more code, more bugs.

## Consequences
- One AdSpaces account = one X account. Advertisers also log in with X (simple, and gives a public identity).
