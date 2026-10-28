# 07 — Security & Legal Notes

> Not legal advice. Get a lawyer before mainnet launch with real money.

## Keys & secrets
- `ESCROW_WALLET_SECRET` lives **only** in the worker's environment, never in the web app or the browser.
- Treasury = Squads multisig. Sweep fees regularly; keep the escrow hot-wallet balance limited to in-flight bookings.
- `.env` is git-ignored; `.env.example` documents every variable.
- `AUTH_SECRET` signs sessions; rotate if leaked.

## App security
- All mutations require an authenticated session and check ownership (seller can only accept their listings, etc.).
- Wallet linking: server issues a nonce; user signs `AdSpaces wallet link\nnonce:<n>`; server verifies the ed25519 signature (tweetnacl) and the expiry.
- Payment detection validates mint, recipient, amount, and finality — never trusts client-reported tx signatures.
- Uploads: enforce image type/size/dimensions; store in object storage (Vercel Blob / S3), not the DB.
- Rate limit auth and write endpoints.

## Legal / compliance (to resolve before real-money launch)
- **Custody:** holding funds for others (ADR-0003) may trigger money-transmitter / VASP rules depending on jurisdiction. Moving to the on-chain escrow program (ADR-0006) cuts this risk.
- **Sanctions:** consider screening wallets (e.g. a Chainalysis/TRM free sanctions API) before payout.
- **Ad disclosure:** sellers should follow X's paid partnership policies and local advertising law (e.g. FTC endorsement guides).
- **Prohibited ads:** content policy + creative moderation (gambling, scams, adult, etc.). Sellers can block categories.
- **Terms of Service & privacy policy** needed before launch.
