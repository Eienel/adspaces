# 00 — Vision

## Problem
- X profiles with real audiences have a big, always-visible piece of real estate, the **banner/header image**, that earns nothing.
- Advertisers (crypto projects especially) already pay influencers for posts. Posts scroll away in hours. A banner shows to **every profile visitor** for days or weeks.
- Today these deals happen in DMs with no trust: advertisers pay and hope, or sellers put the banner up and hope to get paid.

## Solution
AdSpaces is a trust layer plus marketplace:
1. **Sellers** sign in with X, list their banner with a daily price and rules (e.g. "no gambling ads").
2. **Advertisers** browse by followers, niche and price, upload a creative and request a booking.
3. Seller accepts → advertiser funds a **Solana USDC escrow** → seller sets the banner.
4. AdSpaces **checks the banner automatically** at random times during the booking.
5. At the end, the escrow **releases** funds to the seller minus the platform fee. If the seller didn't keep the banner up, the advertiser is **refunded**.

## Users
- **Seller** (creator/KOL): wants passive income with minimal effort.
- **Advertiser** (project/brand/agency): wants cheap, verifiable impressions and proof of delivery.
- **Platform admin**: moderates creatives and resolves disputes.

## Why it works
- Changing a banner **does not** remove the X blue checkmark (see [06-x-platform-notes.md](06-x-platform-notes.md)), so sellers lose nothing by taking part.
- Escrow plus automated checks removes the counterparty risk that kills DM deals.

## Business model
- Platform fee in basis points (bps), taken on-chain at release. Default placeholder **10% (1000 bps)**, configurable in the program config. *Owner to confirm.*
- Later: featured listings, analytics subscriptions for advertisers.
