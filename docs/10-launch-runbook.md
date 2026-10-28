# 10 — Launch runbook (real money, beta)

Step-by-step for the owner to go from the **staging demo** (`docs/12-vercel-preview.md`) to a **real launch**.
Costs: ~$0/month on free tiers + a first X API credit purchase + ~0.05 SOL. Do the steps in order.

> Beta safety: bookings are capped at **$1,000** (ADR-0015). Fees are **2.5% / 1.5% / 0.75%** by booking size (ADR-0014).
> Escrow is custodial: the platform's escrow wallet holds advertisers' USDC until each week ends (ADR-0003).

## 1. X developer app (login + banner checks)
1. Go to https://developer.x.com → Developer Console → create a project + app.
2. **User authentication settings** → OAuth 2.0, type **Web App**. Callback URL: `https://<your-domain>/api/auth/callback/twitter`. Website: your domain.
3. Copy the **OAuth 2.0 Client ID and Secret** → Vercel env `AUTH_TWITTER_ID`, `AUTH_TWITTER_SECRET`.
4. **Billing:** add a card and make the **first credit purchase** (the minimum shown in the console). Since 2026-10-13 X grants a one-time **$20 bonus only after this first purchase** (some developers report $5). Turning on auto-recharge can earn a match of up to $50. Credits expire after 3 months. Check the console for the current terms.
5. **App bearer token** (Keys and tokens) → GitHub secret `X_BEARER_TOKEN` (used as fallback + weekly metrics).

Cost estimate: login ≈ 1 user read; banner checks use the creator's own token (`BANNER_SOURCE=owned`, reportedly ≈$0.001 each), 2 checks/day per creator with live ads.

## 2. Solana wallets
1. **Escrow wallet** (holds bookings in flight): on your computer run
   ```bash
   pnpm --filter @adspaces/worker setup-escrow
   ```
   It prints `ESCROW_WALLET_SECRET` (keep secret!) and `NEXT_PUBLIC_ESCROW_WALLET`. Send it ~0.05 SOL (fees + token-account rent), set `SOLANA_RPC_URL` + `USDC_MINT` (mainnet `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) in your local `.env`, and run the command again to create its USDC account.
2. **Treasury** (receives fees): create a **Squads multisig** (https://squads.so, free) or use a separate wallet you control. Use its address as `TREASURY_WALLET`.
3. **RPC:** create a free **Helius** account → mainnet RPC URL → `SOLANA_RPC_URL` (the public RPC is rate-limited).

## 3. Vercel (web app)
In the project → Settings → Environment Variables (**Production**):
| Name | Value |
|---|---|
| `AUTH_SECRET` | **new** random string (`openssl rand -base64 32`), not the staging one |
| `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` | from step 1 |
| `TOKEN_ENC_KEY` | `openssl rand -base64 32` (**same value** in GitHub secrets) |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | your Helius URL (or a separate public-facing key) |
| `NEXT_PUBLIC_USDC_MINT` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `NEXT_PUBLIC_ESCROW_WALLET` | from step 2 |
| `MAX_BOOKING_USDC` | `1000` |

**Delete** `DEV_LOGIN` and `ALLOW_DEV_LOGIN` from Production (keep them on Preview if you want a demo there). Neon + Blob stay connected. Redeploy. The app refuses to start if a required value is missing; the reason is in Vercel → Logs (`[startup] Missing required env…`).
Vercel Hobby is for non-commercial use: switch to **Pro** once you charge fees.

## 4. GitHub Actions (background worker, free)
Repo → Settings → Secrets and variables → Actions.
- **Secrets:** `DATABASE_URL` (copy from Vercel → Neon, use the *unpooled* one), `ESCROW_WALLET_SECRET`, `TREASURY_WALLET`, `SOLANA_RPC_URL`, `X_BEARER_TOKEN`, `AUTH_TWITTER_ID`, `AUTH_TWITTER_SECRET`, `TOKEN_ENC_KEY`, `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob → create a read-write token; GitHub can't use Vercel's automatic login).
- **Variables:** `WORKER_ENABLED` = `true` (the workflow does nothing until this is set). Optional: `BANNER_SOURCE` (default `owned`), `PAYMENTS_PROVIDER` (default `solana`).
- Then Actions → **worker** → Run workflow once and read the log: you should see `worker started` and `escrow ok`.
The schedule runs every ~5 minutes (GitHub may delay it). It is disabled automatically after 60 days without commits; re-enable in the Actions tab.

## 5. Smoke test with real money ($1)
1. Creator account: sign in with X, link a wallet, list a banner with one slot at **$0.15/day** (≈$1/week).
2. Business account (another browser/wallet): book that slot for next week, creator accepts, business pays ~$1 USDC.
3. Watch: booking → **paid** within ~10 min (worker log: `booking funded`).
4. Saturday after 12:00 UTC the creator's dashboard shows the combined banner; upload it to X on Monday, press "I've set the banner".
5. After the week: creator receives $0.975, treasury $0.025. Check both on https://solscan.io.

## 6. Every week (operations)
- Check the worker log for `ALERT escrow balance below what is owed`: if it appears, **pause** (set `WORKER_ENABLED=false`) and investigate.
- Resolve `disputed` bookings (admin UI is Phase 2; for now edit `settlement_kind` to `release`/`refund` in Neon and the worker settles it).
- Sweep nothing: fees already go straight to the treasury at payout.

## Legal (before scaling)
`/terms` and `/privacy` are plain-language beta pages, **not legal advice**. Holding user funds can be regulated; see `docs/07-security-legal.md`. Talk to a lawyer before raising the cap.
