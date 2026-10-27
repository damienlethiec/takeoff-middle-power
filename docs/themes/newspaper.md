# Theme exploration: "The newspaper of the future"

Branch `theme-newspaper` (27 Oct), preview: https://damienlethiec.github.io/takeoff-middle-power/preview/theme-newspaper/

## The idea in five lines

1. The game is already told through news, letters and requests: let it look like a European daily from 2027–2031 instead of a situation room.
2. The header is the paper's masthead ("Takeoff" in blackletter, the half-year as the issue date, the clock and Influence in its ears); the four gauges are the front page's markets strip.
3. The map is an engraved plate (land in ink hatching, muted region tints); the news is a column of briefs with kickers; Breaking news is the front-page splash.
4. Requests are interviews (a black-and-white photo, a pull quote), decisions are typed memo cards with a red "Played" rubber stamp, tips are the editor's sticky notes.
5. The friends' letters are real postcards (airmail border, perforated stamp, postmark, their handwriting); the ending is the "Final edition".

## How it is built

- One stylesheet, `src/ui/theme-newspaper.css`, loaded after `styles.css` (`src/main.ts`): it redefines the tokens, then restyles each part. Layout logic and behaviour are untouched.
- Markup changes, kept minimal: the logo reads `Takeoff` (not `TAKEOFF`: blackletter capitals are unreadable), the ending gets a masthead with "Final edition" (`ui.end.edition`, translated in fr/de/es/pl), the favicon and `theme-color` are paper.
- `tests/i18n.test.ts`: the latin-ext check now looks for Source Serif 4 instead of Newsreader.

### Fonts (self-hosted, Fontsource, every face with latin-ext but the masthead)

| Role | Face |
| --- | --- |
| Masthead (the one word "Takeoff") | UnifrakturMaguntia 400 |
| Headlines, values, region names | Playfair Display 700 / 900 / 700 italic |
| Body text | Source Serif 4 (variable, optical sizes) |
| Kickers, labels, buttons, numbers | Libre Franklin 500–800 (replaces the monospace) |
| The friends' handwriting (postcard, ending) | Caveat 500 / 600 |

Polish, German, Spanish and French diacritics checked with `?lang=pl` (screenshot `desktop-main-threats-pl.png`).

### Tokens (light only)

| Token | Value | Use |
| --- | --- | --- |
| `--night` / `--deck` / `--deck-2` | `#f3eee2` / `#fbf8f1` / `#ebe4d3` | newsprint, a lighter sheet, a shaded box |
| `--ink` / `--mute` | `#1b1813` / `#585045` | text (14:1 and 6.3:1 on the darkest paper) |
| `--edge` / `--rule` | `#7a705f` / `#c9bfa9` | control outlines (≥ 3:1) / hairlines |
| `--accent` (= `--rival`, `--crit`) | `#a8231b` | the paper's red: kickers, Breaking, danger, China |
| `--cap` / `--align` / `--concern` / `--good` / `--warn` | `#8f4a00` / `#0b6158` / `#5e3a8c` / `#2b6a33` / `#7a5600` | the gauges' colours as ink, each ≥ 5:1 on every paper tone |
| `--focus` | `#1747c2` | the focus ring, a blue nothing else uses |
| `--highlight` | `#f6e39a` | a highlighter pen: selected, looked at, hovered |
| `--hand-ink` | `#1d3a6b` | the friends' fountain pen |

No dark variant: the light paper is the look; a dark "night edition" would need its own palette pass (not cheap).

### Accessibility

`npm run a11y` (axe on every screen in the three runs, keyboard-only games, reduced motion at 200% zoom, phone): 0 serious or critical violations. Gains and losses keep their + / − and ✓ / ✗; the zone and status chips keep their words. The rotations (sticky note, photo) are dropped with reduced motion. No drop caps on game text (a story can start with "AI" or "L'IA"): the lede's first line is set in small capitals instead.

## Screenshots (`docs/screenshots/theme-newspaper/`)

Desktop 1280×800: `desktop-intro-1` (landing), `desktop-intro-2`, `desktop-main`, `desktop-main-threats`, `desktop-main-threats-pl`, `desktop-decision`, `desktop-decision-preview`, `desktop-card-details`, `desktop-request`, `desktop-request-outcome`, `desktop-breaking`, `desktop-postcard`, `desktop-tip`, `desktop-help`, `desktop-ending` (full page).
Phone 390×844: `mobile-intro-1`, `mobile-main`, `mobile-main-full`, `mobile-decision`, `mobile-request`, `mobile-postcard`, `mobile-ending`.

## For the general public: pros and cons

**Pros**
- Familiar: everyone knows how to read a front page. Headline, kicker, brief and letter tell the player what each item is before they read it, which the dark console did with colour codes and monospace labels.
- Less technical, less "military": no dashboard of a control room, the gauges become a markets strip that people skim daily.
- The story-telling devices (news, postcards, interviews) finally look like what they are; the friends' handwritten postcards are the warmest moment of the game.
- Calm and readable: black serif on paper, high contrast, larger body text; good for long sessions and for older players.
- Distinctive and shareable (the blackletter masthead, the "Final edition" ending reads like a front page to screenshot).

**Cons**
- A newspaper can feel slow or old-fashioned to younger players used to games; less "Plague Inc." tension (no glow, no dark map lighting up).
- Serif text at small sizes (chips, captions) is a little less crisp on low-resolution screens; we kept the small UI text in Libre Franklin for that reason.
- The blackletter masthead is decorative and hard to read for some; it only ever says "Takeoff" (the title is also in the tab and in the page's accessible name).
- The hatched map is quieter: events on the map draw less attention than the glowing dots of the console look.
- More fonts (five families): a heavier first load, all self-hosted.
