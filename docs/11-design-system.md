# 11 — Design system

The look of the web app. Owned by the Design session (see HANDOFF "Parallel sessions"). Every colour, radius,
font and motion value is a CSS token at the top of `apps/web/app/globals.css`. Restyle there first.

Screenshots: `docs/design-screenshots/` (before/after, desktop 1440 and mobile 390).

## 1. Concept: "the layout sheet"

AdSpaces sells **empty space on a banner**, so the site is drawn as a print layout sheet waiting for ads:

| Motif | Where | Why |
|---|---|---|
| **Dot-grid paper** | page background (`--grid-dot`, `--grid-size`) | A cutting mat or layout pad: space to be filled |
| **Dashed slot + crop marks** (`.slot-word`, `.crop`) | hero headline, banner proof, banner previews, empty states (`.slot-empty`) | An ad slot is a dashed frame. Unsold things look unsold |
| **"Booked" stamp** (`.stamp`) | hero | The product's core action, shown as an ink stamp |
| **Hang tags** (`.tag`, `.tag-v`) | prices on the hero proof, fee tiers hanging from a line | Prices look like price tags, with a punched hole |
| **"Ad space available" tape** (`.tape`) | once on the home page | Takes up the product's own "Ad space available" tag on unsold slots |
| **Steps as one banner** (`.strip`) | "How it works" | The four steps are four slots of one banner that get *booked* (fill with colour) as you scroll |

**Signature moment** (the one loud move): on load, "ad space" in the headline is an empty dashed slot. It fills
with lime from left to right, and then a green **BOOKED** stamp lands beside it.

The reference sites only supply *materials*. None of their layouts or copy is reproduced:
- from **wisprflow.ai**: warm paper, a serif display face with italic accents, deep-green and near-black rounded
  colour bands, a bordered nav box with segmented tabs, a lavender call-to-action with an ink outline.
- from **blink.cash**: pop colour (electric lime, poster blue, pastel cards), ink pill buttons, playful tilt,
  floating notes (here they became hang tags), slow eased motion.

## 2. What was measured on the reference sites (2026-10-28, Playwright, 1440 + 390)

### blink.cash
- Page: vertical gradient `#56a4ff` (17%) → `#64ddff` (102%). Text `#0c0c0d`, muted Twitter-grey `#536471`.
- Type: ABC Diatype (Regular/Medium/Bold/Heavy, **paid trial licence**, so not used here). h1 80px / lh 1.02 /
  tracking −0.8px. h2 64–68px, tracking −0.01em. Body 16–24px.
- Hero: centred glass card (`rgba(255,255,255,.1)`, `backdrop-filter: blur(22px)`, radius 32px,
  shadow `0 3px 18px rgba(0,0,0,.08)`), 3D objects around it.
- Buttons: pills, 52–56px tall, padding 26–28px. White with shadow `0 3px 9px rgba(0,0,0,.12)`, or black.
  The nav is a glass pill (`white/15`, inset highlight) with a black active tab.
- Cards: white, radius 20px, ring `black/6`, shadow `0 30px 70px -42px rgba(12,12,13,.4)`.
  Lime feature cards `#eaff03`, radius 40px, overlapping and tilted. Dark cards: gradient `#26262a → #0c0c0d`.
- Notes/chips: radius 14px, shadow `0 12px 28px -12px rgba(0,0,0,.4)`, white, `#111` or `#e11d48`.
- Motion: `blob-float` (translateY −14px, ease-in-out), `blob-orbit` (±8° over 20s), testimonial `marquee` 90s
  linear. The header fades to `white/15` with blur on scroll (0.3s).

### wisprflow.ai
- Page `#ffffeb` (cream), ink `#1a1a1a`, muted `rgba(26,26,26,.7)`, sand `#e4e4d0`, hairline `#d1d1c1`.
- Type: **EB Garamond** 400 for every heading (96px h1, lh 0.95, tracking −0.03em, one phrase in *italic*).
  **Figtree** 500–600 for the UI and body text. Both are OFL, so both are used here.
- Colour bands: deep green `#034f46` and `#1a1a1a`, with 80px radius on the corners that meet the page.
  Sand blocks with 32px radius.
- Nav: box 912px wide, 72px tall, 2px `#e4e4d0` border, radius 10px. Segmented tabs on a sand track
  (pill radius). The CTA is lavender `#f0d7ff` with a 2px ink border and radius 8px.
- Testimonial cards in lavender, coral `#ff6c4c`, peach `#ffa946`, pink `#ffbcf2` and mint, tilted.
- Motion: a logo ticker (40s linear) and scroll-pinned feature stages.

(The owner first wrote "wspr.ai", which is a parked Namecheap domain. The intended site is wisprflow.ai.)

## 3. Tokens (summary; the source of truth is `globals.css`)

| Group | Tokens |
|---|---|
| Paper | `--bg #ffffeb`, `--panel #fffdf9`, `--panel-2 #f5f4f0`, `--sand #e4e4d0`, `--border`, `--border-strong #d1d1c1`, `--grid-dot`, `--grid-size 22px` |
| Ink | `--text/--dark #1a1a1a`, `--muted` (66% ink), `--on-dark #ffffeb`, `--on-dark-muted` |
| Brand | `--accent #034f46` (links, selected borders, progress), `--accent-2 #1d9bf0` (verified tick), `--lime #eaff03`, `--sky #5cb2ff`, `--green`, `--lavender`, `--mint`, `--peach`, `--coral`, `--pink` |
| Status | `--ok`, `--warn`, `--bad` (dark enough for cream) |
| Shape | `--radius-sm 10px` (inputs, nav box), `--radius 16px` (panels), `--radius-lg 24px` (tags, strip), `--radius-xl 32px`, `--radius-band 80px`, `--pill` |
| Depth | `--shadow-card`, `--shadow-pop`, `--blur 22px` (nav only) |
| Type | `--font-serif` EB Garamond, `--font-sans` Figtree, `--tracking-display −0.03em` |
| Motion | `--ease` (quint out), `--ease-expo`, `--ease-in-out`, `--t-press 140ms`, `--t-hover 180ms`, `--t-ui 240ms`, `--t-reveal 800ms`, `--stagger-line`, `--stagger-item` |

Fonts are self-hosted in `apps/web/public/fonts/` (variable woff2, Latin subset, from Fontsource; OFL texts
next to them), so builds and dev mode need no network (ADR-0013, $0). The two Garamond files are preloaded in
`layout.tsx`.

## 4. Components (classes in `globals.css`)

- **Surfaces:** `.panel` (paper card), `.panel-sand`, `.panel-dark`, `.slot-empty` (empty state = dashed slot),
  `.band` + `.band-dark` / `.band-green` + `.band-round` (full-bleed colour sections; `body { overflow-x: clip }`
  stops the 100vw bands from causing horizontal scroll).
- **Buttons:** `.btn` (ink pill, primary), `.btn-ghost` (paper pill), `.btn-white` (on dark bands), `.btn-cta`
  (lavender + ink outline, only "Sign in"), `.btn-lg`. The Solana wallet button is restyled to match `.btn`.
- **Forms:** `.input` (paper, lavender focus ring), `.label`, `.chip` / `.chip-on`.
- **Type:** all `h1`/`h2` are serif. Inside `.panel` they switch back to sans, because there they are UI labels.
  `main h1` is scaled up because pages still set `text-2xl` from the old sans design. `.display`,
  `.section-title`, `.eyebrow`, `.link`.
- **Nav:** `.nav-box`, `.nav-tabs` / `.nav-tab` / `.nav-tab-on` (`components/site-nav.tsx` highlights the current
  section with `usePathname`, purely visual).
- **Concept pieces:** `.crop`, `.slot-word`, `.stamp`, `.tag`, `.tag-v`, `.tape` / `.tape-band` / `.tape-track`,
  `.strip` / `.strip-fill` / `.strip-ink`.
- **Status badges** use the card palette: requested = peach, paid = lavender, live = lime, completed = mint,
  disputed = red.
- **Banner previews:** the placeholder is an ink→green gradient. A selected slot gets a lime dashed border and
  ring, a booked slot a peach one.

## 5. Motion

Rules taken from the taste-skill motion study (github.com/Leonxlnx/taste-skill, `references/motion.md`), adapted:
- The page is complete without motion. Every animation sits inside `prefers-reduced-motion: no-preference`, so
  reduced motion shows the finished state.
- **Strong ease-outs** (quint/expo out). In-out only for the wipe and the slot fill. Never ease-in or overshoot.
- **Load sequence over by ~1.5s, nothing waits for JS:** headline lines rise out of a bottom-edge mask
  (`clip-path`, not `overflow`, so the stamp may poke out); lead and buttons rise at 450–550ms; the banner proof
  arrives; the slot fills (750–1350ms); the stamp lands (1250ms, 260ms); the tags are dealt (1350–1450ms).
  The header never animates.
- **Scroll motion uses CSS scroll timelines only** (`animation-timeline: view()` inside `@supports`). There are no
  scroll listeners, and browsers without support show the finished state, so nothing can stay blank. It is used
  on two sections: the step slots fill (`.strip-fill`, with the text ink swapping from cream to dark), and the fee
  tags rise in order (`.reveal`). The hero tags drift less than 8%.
- **One loop per page:** the tape marquee (38s linear). It pauses on hover and is off under reduced motion.
  There are no endless floating shapes.
- **Press feedback:** `scale(.97)` at 140ms. Hover effects only under `(hover: hover) and (pointer: fine)`.
  Only linked cards lift (`.lift`).

## 6. Files touched (Design session)

`app/globals.css`, `app/layout.tsx` (chrome, logo mark, font preload), `app/page.tsx` (home),
`components/**` (classes/markup only, plus the new `site-nav.tsx`), `public/fonts/**`.
Class-only edits in four pages outside the assignment, needed because they hard-coded dark-theme colours
(`text-white`, `bg-white/5`, `text-sky-400`, `bg-black/20`): `app/bookings/[id]/page.tsx` (step chips),
`app/dashboard/page.tsx` (calendar dots), `app/listings/[id]/page.tsx`, `app/ads/[id]/page.tsx`.
No logic, props, data fetching or `lib/` changes.

## 7. Notes for the launch session

- No component needs new data.
- New UI should use the tokens/classes above. Avoid `text-white`, `bg-white/x` and `bg-black/x` on paper; use
  `--sand`, `--panel-2` or `--muted` instead.
- An empty list should use `.slot-empty`. A success/error line should use `text-[var(--ok)]` / `text-[var(--bad)]`.
- `next dev` writes `apps/web/AGENTS.md` (untracked). Set `agentRules: false` in `next.config.ts` (launch-owned)
  to stop it.
