# ADR-0017: Visual design: "layout sheet" concept, self-hosted OFL fonts

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** owner + Design session

## Context
The owner wants the web app to feel like blink.cash and wisprflow.ai, but to be its own, eye-catching design,
not a copy. blink.cash uses ABC Diatype, a paid font (trial licence on their site). The app must also build and
run at $0 without network access (ADR-0013).

## Decision
- Concept: the site is a **print layout sheet of ad space**. It uses dot-grid paper, dashed slots with crop
  marks, a "Booked" stamp, hang-tag prices, one "Ad space available" tape, and the steps drawn as one four-slot
  banner. The reference sites supply materials only (Wispr: paper, serif, colour bands; Blink: pop colour,
  pills, play). Details are in `docs/11-design-system.md`.
- Fonts: **EB Garamond** (display) and **Figtree** (UI), both SIL OFL. They are self-hosted as variable woff2
  in `apps/web/public/fonts/` with their licence texts. They are not loaded from Google Fonts or `next/font/google`.
- Motion: CSS only (keyframes + scroll timelines), with reduced motion showing the finished state. No animation library.

## Alternatives considered
- Copy blink.cash's sky-blue glass hero 1:1. Rejected by the owner as too derivative. It was also weak for dense
  app pages such as the dashboard and forms.
- ABC Diatype. It is a paid licence. Inter Tight was tried as a free look-alike and dropped when the concept moved
  to the serif + sans pairing.
- `next/font/google`. It needs network access at build time, which breaks offline/$0 builds.
- GSAP/Framer Motion. That is an extra dependency for effects CSS now does natively.

## Consequences
- The whole look is in `globals.css` tokens + a handful of concept classes. New UI should reuse them.
- Scroll-linked effects only run in browsers with `animation-timeline` (Chrome/Edge, Safari 26). Others show
  the static, finished design.
- About 110 KB of fonts are served from `public/` (Latin only). Other scripts fall back to system fonts.
