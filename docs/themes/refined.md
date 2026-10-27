# Theme exploration: "Situation room, simplified" (branch `theme-refined`)

Preview: https://damienlethiec.github.io/takeoff-middle-power/preview/theme-refined/

## The idea

1. Keep the identity (dark navy room, the dot-matrix map, Big Shoulders for the big numbers and headlines) but make it calm enough for people who are not AI experts.
2. Labels speak plainly: body font, sentence case, no monospace capitals (the monospace stays only for keyboard keys).
3. Bigger type, more room: each gauge shows its name and its number first (38 px, in its colour); subtitles and captions come second, in grey.
4. One colour per gauge, everywhere it appears (icon, number, bar, card effects, the map, the news); green and red only for good and bad; everything else is neutral, including the interface's own accent (focus, selection, the main button are ink).
5. Frames only on what can be pressed: surfaces (gauges, map, news, panels, modals) lose their borders; buttons, cards and answers keep a 3:1 outline.

## Token changes (`src/ui/styles.css` `:root`, its rules at the end of `src/ui/styles.css` since 27 Oct)

| Token | Before | After |
|---|---|---|
| `--g-ai` (AI progress) | `--cap` #f4a62a, also the US, the Race zone, datelines, Europe's AI "Dependent" | #f4a62a, only AI progress (and the labs on the map, which drive it) |
| `--g-safety` (AI safety) | `--align` #5ed1c2, also Europe, "you", focus, primary buttons, links, selection | #5ed1c2, only AI safety |
| `--g-coop` (US–China cooperation) | none (white pointer) | #82b2ff (new): its icon, number, pointer and end bar |
| `--g-cohesion` (Social cohesion) | `--concern` #b99cff, also Influence and requests | #c3a6ff, only cohesion (and protests, social events) |
| `--accent` | teal | ink (#edf1f8): focus ring, selected card, primary button, links |
| `--align`, `--cap`, `--concern`, `--rival` | role colours | aliases: accent, AI progress, cohesion, bad |
| Influence | purple | neutral ink (a resource, not a gauge) |
| Status | green, red, amber "warn", orange Race | green good, red bad; Race and the plateaus neutral (the word says it); amber kept only for attention marks (a tip's target) |
| Map | US amber, China red, Europe teal | land neutral; US and Chinese labs both glow amber with AI progress; Europe light grey; region labels white |
| Surfaces | `--night` #0f1729, `--deck` #16213a, `--deck-2` #1d2a47, 1px frames everywhere | #0e1526, #151f35, #1d2843; no frames on surfaces, soft `--rule` separators |
| Scales | ad hoc | spacing `--s1..--s5` (4, 8, 12, 16, 24), radius `--r-s/m/l` (8, 12, 16) |
| Type | body 15 px; mono 10–12 px capitals for labels | body 16 px; labels 13–15 px sentence case; gauge names 15.5 px bold; numbers 38 px |

Markup changes: only the four gauge icons get a class (`gi-<gauge>`, `src/ui/fx.ts`) so they wear their colour everywhere, (the theme's rules first lived in `src/ui/refined.css`, loaded after `styles.css`; on adoption, 27 Oct, they moved to the end of `styles.css`, order kept). No logic, no new strings. The end page's call to action (inline styles in `ending.ts`) is restyled from CSS.

## Screenshots (`docs/screenshots/theme-refined/`)

| Screen | Before | After |
|---|---|---|
| Landing | `before-desktop-intro-1.png` | `desktop-intro-1.png` |
| Main, round 2 (desktop) | `before-desktop-main-threats.png` | `desktop-main-threats.png` |
| Decisions | `before-desktop-decision.png` | `desktop-decision.png`, `desktop-decision-preview.png` |
| Request | `before-desktop-request.png` | `desktop-request.png` |
| Ending | `before-desktop-ending.png` | `desktop-ending.png` |
| Main (phone) | `before-mobile-main.png` | `mobile-main.png` |
| Request (phone) | `before-mobile-request.png` | `mobile-request.png` |

Also: `desktop-main.png` (round 1), `desktop-last-round.png` (all four gauges), `desktop-card-details.png`, `desktop-breaking-choice.png`, `desktop-postcard.png`, `desktop-help.png`, `mobile-intro-1.png`, `mobile-decision.png`, `mobile-ending.png`.

Checked: `npm run a11y` (three keyboard-only games, 20 screens, axe): no serious or critical violation; lint, typecheck, unit tests green.

## For the general public

Pros
- Reads like an app, not a terminal: no small monospace capitals, plain sentence-case labels.
- The four gauges are learnable by colour: the same orange, teal, blue and violet on the gauge, on each card's effects and on the map; red and green always mean bad and good.
- Less visual noise: fewer frames and accents, so threats (red) and the one main button stand out.
- Same layout and behaviour, so nothing to relearn for playtesters; the change is CSS only (easy to merge or drop).

Cons
- Less "war room" drama: the map and the decisions feel quieter; US vs China no longer read as rival colours.
- Bigger type takes room: the AI progress caption wraps to two lines at 1280 px, and the map is a little shorter.
- The white main button is strong but plain; the brand loses its teal signature.
- Adopted on 27 Oct: the rules now sit at the end of `styles.css` (same order, same result). A later clean-up can fold each override into the rule it refines.
