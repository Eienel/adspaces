# AdSpaces Docs — Start Here

This folder is the **source of truth** for AdSpaces. Any human or AI agent working on this repo should read it before changing code, and **update it as part of every change**.

## What is AdSpaces?
A marketplace where X (Twitter) users rent out their **profile banner (header image)** to advertisers. Advertisers pay in **USDC on Solana** into an **escrow program**. The platform checks automatically that the banner is actually live for the booked period, then releases payment to the seller minus a platform fee.

## Index
| File | What it covers |
|---|---|
| [00-vision.md](00-vision.md) | Problem, users, value proposition |
| [01-scope.md](01-scope.md) | MVP vs later phases, out of scope |
| [02-architecture.md](02-architecture.md) | Components, data flow, scaling to ~100k concurrent users |
| [03-data-model.md](03-data-model.md) | Tables and the booking state machine |
| [04-payments-escrow.md](04-payments-escrow.md) | Solana escrow program, fee math, flows |
| [05-verification.md](05-verification.md) | How we prove a banner was actually used |
| [06-x-platform-notes.md](06-x-platform-notes.md) | Blue-tick finding, X API pricing/endpoints, policy risks |
| [07-security-legal.md](07-security-legal.md) | Keys, custody, X ToS, ad disclosure, compliance |
| [roadmap.md](roadmap.md) | Phased checklist — **keep updated** |
| [decisions/](decisions/) | Architecture Decision Records (ADRs) — one per meaningful choice |
| [log/](log/) | Dated build log — one entry per work session |

## Rules for working in this repo (humans + agents)
1. **Read** `roadmap.md` and the latest file in `log/` first to see where things stand.
2. **Any non-trivial decision** (library, protocol, data shape, business rule) → add an ADR in `decisions/` using `decisions/template.md`. Number them sequentially. Never rewrite an accepted ADR; supersede it with a new one.
3. **End every session** with a new or updated `log/YYYY-MM-DD-*.md`: what was done, what's next, open questions.
4. **Tick boxes** in `roadmap.md` when work lands.
5. If code and docs disagree, the docs are wrong or the code is wrong — fix one of them in the same change.

## Repo map
```
apps/web          Next.js app (UI + API routes)
apps/worker       Background jobs: banner verification + escrow settlement
packages/shared   Domain logic: types, zod schemas, booking state machine, fee math, image hashing
packages/db       Drizzle ORM schema + migrations (Postgres)
programs/escrow   Solana Anchor program (Rust) — USDC escrow with platform fee
docs/             You are here
```
