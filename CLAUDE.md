# Takeoff: Europe’s Next Move (repo `takeoff-middle-power`) — notes for coding agents

A Plague Inc.-style browser game about AI governance for the general public. The player is the EU's AI Envoy over 10 rounds of six months (H1 2027–H2 2031; 12 until 26 Oct). v4, on v3's model: four gauges on top, **AI capabilities** (the clock, tipping point at 80), **AI safety** (what is verified and what the labs claim, e.g. "40–57"; the truth lies in between and is revealed at the end), **US–China cooperation** (Pause / Race / Rupture) and **Social cohesion**; Europe's AI badge (Open / Dependent) at the end of the "Heading for…" line under them; one resource, Influence, with **no cap on cards a round** (as many as Influence covers). During each six months a live **news feed** fills up, the map groups the round's items per region, and characters arrive with **requests** (free of Influence, answered left or right). The game ships in English (the default) and in French, German, Spanish and Polish (`docs/I18N.md`); English is the source; the team discusses in French.

## Read first

- `docs/V4_SPEC.md`: the game as built (v4) and what changed from v3. Source of truth for intent, with `docs/V3_SPEC.md` for the model and the endings. `docs/SPEC.md` points to both.
- `docs/SCENARIO_BASIS.md`: what the game takes from AI 2027, CFG and Europe 2031, section by section. Read it before writing content.
- `docs/DEVELOPER_NOTES.md`: exact rules and numbers, plus every tuning change and why.
- `docs/V4_BUILD_NOTES.md`: how v4 was built, decisions, realism notes, known issues (v3's in `docs/V3_BUILD_NOTES.md`).
- `src/engine/types.ts` and `src/engine/api.ts`: the contract between engine and UI. The round flow is documented at the top of `api.ts`.

## Layout

- `src/engine/`: pure functions only. No DOM, no `Math.random` (use the seeded RNG stored in `GameState.rng`), never mutate inputs.
- `src/data/`: declarative content (cards, requests in `requests/` one file per character, `characters.ts`, threats and events, milestones, headlines and voices, leaks, endings, the friends back home (`friends.ts`, `letters.ts`), copy, sources). **All numbers live in `src/data/tuning.ts`.**
- `src/i18n/`: translations: `en.json` (generated, do not edit), `fr.json`, `de.json`, `es.json`, `pl.json`; the runtime (`index.ts`: `t`, `tn`, `th`, `tr`), the content walk (`content.ts`), the engine's sentence templates (`templates.ts`), the matcher and the pseudo-locale. The language picker is `src/ui/lang.ts`.
- `src/ui/`: string-template DOM rendering, controller in `app.ts` (gauges, heading line, clock, dock), the map in `map.ts`, the news feed in `feed.ts`, the heading line in `outlook.ts`, one file per screen in `screens/` (`decide.ts` draws the decisions in place of the map; `request.ts` the request card). The UI imports the real engine directly (`src/main.ts`).
- `scripts/sim.ts`: seeded simulation of games per strategy (`scripts/strategies.ts`), 100 games each by default.
- `scripts/shots.mjs`: screenshots of every screen at 1280×800 and 390×844, on the production build (`node scripts/shots.mjs docs/screenshots/v4`).
- `tests/`: Vitest.

## Commands

```sh
npm run dev       # local server at /takeoff-middle-power/
npm test          # unit tests
npm run sim       # balance check: ending distribution per strategy (100 games each; never more unless the owner asks)
npm run build     # typecheck + production build
npm run test:e2e  # whole games and v4's key interactions in Chromium (Playwright, production build)
npm run i18n:extract  # regenerate src/i18n/en.json after changing any player-facing string
npm run i18n:check    # per language: coverage, errors (unknown keys, placeholders), warnings
npm run a11y      # axe on every screen + whole games played with the keyboard alone, on the production build (A11Y_PORT if 5176 is busy; never run playwright install here)
```

## Rules of the house

- **Balance changes go through the simulation.** Run `npm run sim` before and after (runs are capped at 100 games a strategy, the default, unless the owner asks for a long pass: the machine is shared); record the change, the old value and the reason in the "Tuning changes" table of `docs/DEVELOPER_NOTES.md`. Targets (printed by the sim): passive good endings < 15%, random 15–30%, thoughtful 55–80%, every ending ≥ 2% for some strategy, cooperation-only and home-first clearly worse than thoughtful, no card above 20% of a thoughtful player's plays, no tipping point before round 6.
- **Refactors must not change behaviour**: the seeded `npm run sim` output (100 games, the default and the cap unless the owner asks for more) must stay byte-identical before and after.
- **Every real-world fact shown to players needs a source** (`src/data/sources.ts`), checked against the primary source. Fiction (OpenBrain, DeepCent, future events) must never be presented as real.
- **Realism**: every card, request, event, threat, headline, voice, leak and friend's letter carries a `basis` from one of the three scenarios (`ai2027` for AI 2027, `cfg` for CFG's Advanced AI: Possible Futures, `e2031` for Europe 2031, Juijn et al., June 2026: a chapter heading or recommendation), `real`, or `game` for a device invented for the game such as the independent audit, with a precise reference; `tests/basis.test.ts` fails without one. Players see it as a provenance tag (Real / From AI 2027 / From CFG / From Europe 2031 / Invented, `provenanceOf` in `src/data/basis.ts`). Europe 2031's story (Atlas, Helios, Zimo, every event after June 2026) is fiction like the others; its prologue's figures (June 2026) are cited to its site. Europe's policies act on Europe's ground (its AI Office, compute, market, money, mediation once asked), never directly on the hidden alignment of US or Chinese models, and they carry real blowback. AI 2027 milestones are reached in the scenario's order (dates may move with the hidden pace, never the order). Effect directions follow the scenarios; sizes are tuned by the sim. List any stretch in the build notes' Realism notes.
- Hidden values (the true AI safety, the AI pace) never appear in visible deltas, previews, the heading line, the pace hint or the advisor (tests check this by varying the truth); only what is verified and what the labs claim are shown, and advisor text contains no numbers. Only the independent audit card shows the truth, by the player's choice.
- **Every new player-facing string goes through the catalog** (`docs/I18N.md`): in `src/ui`, `t('ui.area.name', 'English', vars)` (`tn` for plurals, `th` with HTML parts), with string literals; content stays English in `src/data` and is shown through `tr()`; a sentence the engine composes needs its template in `src/i18n/templates.ts`. Then run `npm run i18n:extract`. The engine stays English (never translate inside it). Sources stay in English, marked "(in English)". Text-length rules apply to English; translations aim at ≤ 1.6× (warned). Layout must tolerate ~30% longer text (wrap, never cut meaning): check with `?lang=xx`.
- Keep player text short and plain: card texts ≤ 25 words; requests ≤ 40 words, answer labels ≤ 5 words (tests enforce them). Every request answer costs something visible, no answer widens AI safety's uncertainty, and no request duplicates a policy card.
- **Fonts are self-hosted** via Fontsource npm packages (`src/ui/fonts.css`; team decision of 26 Oct, for GDPR): the production CSP has `font-src 'self'` and the game makes no third-party request. Never load fonts or anything else from a CDN.
- **Security**: content is static, but treat every string reaching `innerHTML` as untrusted: escape it, render only http(s) URLs as links, keep `rel="noopener"` on `target="_blank"`. CI permissions stay least-privilege and third-party actions stay pinned to commit SHAs. See `docs/AUDIT.md`.

## Accessibility (required for every UI change)

The game must be playable with a keyboard alone and with a screen reader, and comfortable for people sensitive to motion.

- Every interactive element is a real `<button>` or `<a>` (never a clickable `div`), reachable with Tab in a logical order, with a visible focus style and an accessible name (`aria-label` when it has no text).
- Map interactions (threat icons, the region groups and their lists, the leak in the US group, the friends' letter envelopes in their region's group) are real HTML buttons laid over the map, with names that contain their visible text; Tab goes from a group into its list and Escape returns to it. Europe's AI badge is a button on the heading line. Feed items are buttons; headlines and voices are also announced through the live region.
- The decisions are a region in place of the map (not a dialog): focus lands on a card, Escape returns to the map. Request answers are buttons named by what they move; ← → look at an answer, a second press answers.
- Modals and overlays: move focus in when they open, trap it while open, close with Escape when closing is allowed, and return focus to the trigger.
- Announce what changes without being looked at (new round, headlines, events, gauge changes, Influence gained) through an `aria-live` region, politely and without flooding.
- Never convey meaning by colour alone (gains/losses also carry + / − and words); text contrast at least WCAG AA (4.5:1, 3:1 for large text).
- Respect `prefers-reduced-motion`: no pulsing, flashing or flying animations; state changes stay visible.
- Keyboard shortcuts (Space to pause, Enter to continue, N news, ? help; ← → in a request) must not fire while focus is in a text field or on another button, and must be listed on screen.
- Check with the end-to-end tests and an automated audit (axe) before merging.

## Branches and previews

Team decision (26 Oct): **work directly on `main` in small, green commits**. Every push to `main` deploys the public site at https://damienlethiec.github.io/takeoff-middle-power/, so push only after `npm run lint`, `npx tsc --noEmit -p .` and `npm test` pass, after rebasing on the latest `main`. For a risky change only, use a short-lived branch: it is built and published at `https://damienlethiec.github.io/takeoff-middle-power/preview/<branch>/`; share that link, merge when it plays well, then delete the branch (which removes its preview).
