# 12 — Vercel preview / staging (dev mode, $0)

Goal: a live link to click around the app (and the design session's work) **without** X API credits or real money.
Every push to a branch gets its own preview URL.

## One-time setup (≈10 minutes)
1. **Import the repo:** vercel.com → Add New → Project → import `Eienel/adspaces`.
   - **Root Directory:** `apps/web` (click Edit next to it). Leave "Include files outside the root directory" **on**.
   - Framework: Next.js (auto). Build/Install commands: leave default. `apps/web/package.json` has a `vercel-build` script that runs DB migrations, then `next build`.
2. **Database:** in the project → Storage → Create → **Neon (Postgres)**, free plan → connect to the project (all environments). This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
3. **Image storage:** Storage → Create → **Blob** → connect. This sets `BLOB_READ_WRITE_TOKEN`.
4. **Environment variables** (Settings → Environment Variables, tick Production **and** Preview):

| Name | Value (staging demo) |
|---|---|
| `AUTH_SECRET` | any long random string (e.g. from https://generate-secret.vercel.app/32) |
| `DEV_LOGIN` | `1` |
| `ALLOW_DEV_LOGIN` | `1` (allows dev login on a production build; **remove for the real launch**) |
| `AUTH_TWITTER_ID` | `placeholder` (until the real X app exists) |
| `AUTH_TWITTER_SECRET` | `placeholder` |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` |

5. **Deploy** (Deployments → Redeploy, or push any commit). Open the URL → `/signin` → **Dev login**.

## What works in the demo
Everything except real X login and real payments: dev login (creators), wallet login (businesses, use a devnet wallet), banner editor, ad board, bookings, "Dev: simulate payment". Weekly banners need the worker. Run `pnpm --filter @adspaces/worker run-at <time>` locally against the same Neon `DATABASE_URL` (+ `BLOB_READ_WRITE_TOKEN`) to fast-forward a week.

## Branches
- Production branch = the repo's default branch (`claude/pensive-faraday-5frreq` for now).
- `claude/design-restyle` (design session) gets its own Preview URL on every push: Vercel → Deployments → filter by branch.
- Preview deployments share the same Neon DB unless you enable Neon branching. Fine for a demo.

## Going live later
Follow `docs/10-launch-runbook.md` (written in session 3): remove `DEV_LOGIN`/`ALLOW_DEV_LOGIN`, add the real X app keys, `TOKEN_ENC_KEY`, `NEXT_PUBLIC_ESCROW_WALLET` (mainnet) and the GitHub Actions worker secrets. The app refuses to start in production if these are missing (`apps/web/instrumentation.ts`). Note: Vercel's Hobby plan is for non-commercial use; move to Pro when you start earning.
