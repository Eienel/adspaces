# ADR-0017: Embedded wallets via Privy (proposed)

- **Status:** Proposed. Evaluate in a dedicated session, behind dev mode.
- **Date:** 2026-10-28
- **Deciders:** Owner (suggested Privy or Turnkey for easier wallet logins)

## Context
Today users need a browser wallet (Phantom etc.) to link payouts (creators) or sign in and pay (businesses). That's friction for non-crypto businesses and some creators.

## Options
- **Privy** (owned by Stripe since 2025): drop-in React SDK with social/email login plus **embedded Solana wallets** created automatically. Free "Developer" tier: 0–499 MAU, 50K signatures and $1M transaction volume/month. Next tiers $299/mo (to 2,499 MAU) and $499/mo (to 9,999 MAU). Sources: https://privy.io/pricing, https://costbench.com/software/web3-wallet-sdk/privy.
- **Turnkey:** lower-level key-management API. More flexible, more code to write (we'd build the login UI and wallet flows ourselves).
- **Keep wallet-adapter** (current): no vendor cost; worst UX for non-crypto users.

## Proposed decision
Prefer **Privy**, used **only for wallets** at first:
- Creators keep "Sign in with X" (Auth.js, the banner must be theirs) and get a Privy embedded wallet for payouts instead of installing Phantom.
- Businesses can sign in with **email/Google via Privy** and get an embedded Solana wallet to pay USDC (fund via an on-ramp or transfer). External wallets still work.
- Keep Auth.js as the session system and map Privy users to `users` by verified Privy JWT (server-side verification), so bookings/escrow code doesn't change. The Blink SDK (ADR-0009) is reported to integrate alongside Privy.

## Open questions (check in Privy docs before building)
- Does Privy's X login use Privy's own X app (would it save our X API cost for login)? Can we read `profile_banner_url` through it? Unverified.
- MAU pricing jump at 500 users ($0 → $299/mo): fine for beta, budget for growth.
- Must stay testable at $0: Privy's dev/test mode or keep dev login as the fallback (CLAUDE.md rule).

## Consequences
Big UX win for businesses. Adds a vendor dependency and a pricing cliff at 500 MAU.
