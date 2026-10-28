# 06 — X Platform Notes

## Does changing the banner remove the blue checkmark? **No.**
Per X Help ("About verified accounts"), only changes to **profile photo, display name, or username (@handle)** cause a temporary loss of the checkmark pending review. **The header/banner image is not on that list.**
- Source: https://help.x.com/managing-your-account/about-x-verified-accounts (checked 2026-10-28)
- Caveat: X says it may remove checkmarks at any time. **Re-check this page periodically** and log the date here.

## X API facts we rely on (checked 2026-10-28)
- `profile_banner_url` is a valid v2 `user.fields` value on `/2/users/:id`, `/2/users?ids=`, `/2/users/by/username/:username`, `/2/users/me`. Data dictionary: https://docs.x.com/x-api/fundamentals/data-dictionary
- Batch lookup: up to 100 users per request.
- Pricing: pay-per-use is the default; **User read ≈ $0.010 per resource returned**. https://docs.x.com/x-api/getting-started/pricing
- OAuth 2.0 (PKCE) login with scopes `users.read tweet.read offline.access`.

## What owners need to do
1. Create an app at https://developer.x.com, enable OAuth 2.0 (type: Web App), callback `https://<domain>/api/auth/callback/twitter` (and `http://localhost:3000/...` for dev).
2. Put `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` in `.env`.
3. Create an app-only **Bearer token** for the worker → `X_BEARER_TOKEN`; buy API credits.

## Policy risks
- X's rules on paid partnerships / ad disclosure may apply to banner ads. We should require sellers to follow X's paid-partnership rules and may show a "#ad" suggestion. See 07-security-legal.md.
- We never auto-change banners and never scrape; we use only the official API.
