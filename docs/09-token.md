# 09 — AdSpaces Token (Phase 4, proposed)

> Status: **idea / proposed** (ADR-0008). Nothing is built. Needs legal review before any work.

## Idea (owner, 2026-10-28)
Launch an AdSpaces token on **Meteora DBC (Dynamic Bonding Curve)** and **burn tokens based on how viral an ad gets**.

## Sketch
- **Launch:** Meteora DBC pool (the bonding curve graduates to a Meteora AMM pool when it fills). No custom program needed; launched through Meteora's existing on-chain program/SDK.
- **Funding the burn:** part of platform fees (e.g. 20–50% of fee revenue, configurable) **buys back** the token on the market, then burns it. Burns are therefore backed by real revenue.
- **Virality score per booking** decides how much of that booking's buyback budget gets burned (vs. kept in treasury), or a bonus burn for top performers. Possible signals:
  - Clicks on a **tracked short link / QR code** in the creative (`ads.adspaces.xyz/<code>`), which we can measure exactly.
  - Seller's impressions during the booking vs. their baseline (X API post `public_metrics`).
  - Mentions of the advertiser's handle/cashtag during the booking.
- **Transparency:** each burn tx is linked to its booking(s) on a public "burn log" page.

## Possible utilities (to decide)
- Pay in the token for a discount on fees.
- Stake for featured listings / priority.
- Seller reputation boosts.

## Risks
- **Legal:** a token tied to platform revenue (buyback-and-burn) may be treated as a security in some jurisdictions. **Lawyer first.**
- Gaming virality (bots clicking links) → dedupe, bot filtering, caps.
- The token price can distract from the core product; launch only after product-market fit.
