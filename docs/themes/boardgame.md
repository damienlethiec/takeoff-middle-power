# Theme exploration 3: the illustrated board game

Branch `theme-boardgame` (preview: https://damienlethiec.github.io/takeoff-middle-power/preview/theme-boardgame/). An exploration, not merged.

## The idea in five lines

1. Playtesters found the "situation room" too technical: this look says "family board game about Europe and AI" instead.
2. A warm, light table (sand with a faint felt texture); every panel is cream card stock with a thick edge and a soft shadow.
3. The decisions are real playing cards: an illustrated band per family (Diplomacy, Oversight & security, Research & chips, At home), the cost as a gold coin, a selected card lifted off the table and tilted.
4. The gauges are board tracks of ten squares with a pawn on the value and little goal flags; Influence is a gold coin.
5. The map is a board: flat country tiles on a light sea, the US, Europe and China tinted, pins as white standees with a coloured rim.

## How it is built (CSS/token-first)

- `src/ui/theme-boardgame.css`, loaded after `styles.css` (`src/main.ts`): it re-sets the tokens and restyles the pieces. Removing that one import brings the old look back; the theme touches almost nothing else, so it rebases easily.
- **Fonts** (self-hosted, Fontsource, latin + latin-ext for Polish/German/Spanish/French): **Fredoka** (variable, rounded display: titles, numbers, buttons) and **Nunito** (variable, very readable body and labels). Newsreader stays for letters, voices and requests (the people speaking). `font-src 'self'` unchanged.
- **Tokens**: `--night` #f3e6cb (the table), `--deck` #fffaf0 (card stock), `--ink` #2e2433, `--mute` #665446. The colour tokens used for text are dark, text-safe tones (US/labs `--cap` #9a4508, Europe `--align` EU blue #1f5aa6, China/danger `--rival` #b1301f, public `--concern` #7442b8, `--good` #236a33, `--warn` #825307), each ≥ 5:1 on every surface. Bright `*-fill` tones (#f39a2b, #3f80db, #e2584b, #9b6ee0, #4fae63) are for shapes only (tracks, tiles, pawns, bands); gold coin #f6c445 with dark text. Family colours: diplomacy blue, oversight green-teal, research purple, home brown-orange.
- **Illustrations** (inline SVG, `src/ui/boardgame.ts`, all `aria-hidden`): the four family pictures (round table, shield with a tick, chip with a spark, house with a heart) and the landing's box art (a small board with three tiles, three pawns, a die and coins). The map's tiles come from the existing dot data: rows drawn solid, then rounded and lifted by one SVG filter (`#bg-tile` in `map.ts`'s defs). Character portraits become round tokens with a white rim; the friends' backgrounds are warm pastels.
- Markup touched: the card's band (`decide.ts`, decorative, the family name comes from the existing catalog key `family.<id>`), the box art on the landing (`intro.ts`), the map filter (`map.ts`), `theme-color` in `index.html`. No new player-facing string.
- Reduced motion: a selected card stays lifted (a state, not a motion); hover bobs are off.

## Screenshots (`docs/screenshots/theme-boardgame/`)

`desktop-intro-1.png` (landing), `desktop-main-threats.png` (main: gauges, board, news), `desktop-map-group.png`, `desktop-consequences.png`, `desktop-decision-preview.png` (cards, two selected), `desktop-card-details.png`, `desktop-request.png`, `desktop-breaking-choice.png`, `desktop-postcard.png`, `desktop-help.png`, `desktop-ending.png`, `mobile-intro-1.png`, `mobile-main.png`, `mobile-decision.png`, `mobile-request.png`.

## Checks

`npm run a11y`: no axe violation at all (serious, critical or minor, contrast included) on every screen of the three runs (keyboard, 200% zoom with reduced motion, phone), and the keyboard-only games complete. Lint, typecheck and unit tests pass.

## Pros

- Reads at once as a game, friendly and un-intimidating for families; the metaphors carry meaning (a pawn moving on a track, a coin you spend, a card you lift).
- Card families become recognisable at a glance by colour and picture; the cost coin is the most visible thing on a card.
- Light and warm, high contrast, larger body text: easier to read in daylight and for older players.
- Cheap and reversible: one CSS file, one small SVG module, a few lines of markup.

## Cons and risks

- Fredoka is wider than the condensed face it replaces: the header is tight at 1280 px (the "Clock running" word is hidden below 1400 px; the pause button still shows the state). Long languages need a check with `?lang=de` / `?lang=pl`.
- Less "urgent": the sense of a crisis room is gone; Breaking news and threats lean on red and stripes to keep some tension.
- The map tiles are a filter over a dot grid: good from afar, a little blobby up close (small islands merge or vanish).
- A light theme lowers the drama of the ending; the ending page is the least transformed screen.

## What full illustration would cost

- An illustrator's pass (a few days): one picture per card (about 25 cards) instead of one per family, a hand-drawn board map (real coastlines, Brussels, the labs as buildings), proper standees for threats (a thief, a virus, a lab), a box-art illustration for the landing, illustrated endings (ten small scenes).
- In code: card art as SVG files (or optimised WebP) loaded by id, a `basis`-free decorative layer; around 1 to 2 days of integration and a check of weight (aim < 300 KB of art in total) and of contrast on illustrated backgrounds.
