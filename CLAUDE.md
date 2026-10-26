# Takeoff: Middle Power — notes for coding agents

A Plague Inc.-style browser game about AI governance for the general public. The player is the EU's AI Envoy over 12 rounds of six months (H1 2027–H2 2032). v3 model: an AI power clock (tipping point at 80), Cooperation (Pause / Race / Rupture), Confidence in AI (estimate ± margin, truth revealed at the end), Cohesion, Europe's AI badge, and one resource, Influence. All game text is in English; the team discusses in French.

## Read first

- `docs/V3_SPEC.md`: player-facing design (what the game must feel like). Source of truth for intent. `docs/SPEC.md` points to it.
- `docs/SCENARIO_BASIS.md`: what the game takes from AI 2027 and CFG, section by section. Read it before writing content.
- `docs/DEVELOPER_NOTES.md`: exact rules and numbers, plus every tuning change and why.
- `docs/V3_BUILD_NOTES.md`: how v3 was built, decisions on open points, realism notes, known issues.
- `src/engine/types.ts` and `src/engine/api.ts`: the contract between engine and UI. The round flow is documented at the top of `api.ts`.

## Layout

- `src/engine/`: pure functions only. No DOM, no `Math.random` (use the seeded RNG stored in `GameState.rng`), never mutate inputs.
- `src/data/`: declarative content (cards, threats and events, milestones, headlines and voices, leaks, endings, Léa, copy, sources). **All numbers live in `src/data/tuning.ts`.**
- `src/ui/`: string-template DOM rendering, controller in `app.ts`, one file per screen in `screens/`. The UI imports the real engine directly (`src/main.ts`).
- `scripts/sim.ts`: seeded simulation of thousands of games per strategy (`scripts/strategies.ts`: passive, random, thoughtful, cooperation-only, home-first, advised).
- `scripts/shots.mjs`: screenshots of every screen at 1280×800 and 390×844 (`node scripts/shots.mjs docs/screenshots/v3`).
- `tests/`: Vitest.

## Commands

```sh
npm run dev       # local server at /takeoff-middle-power/
npm test          # unit tests
npm run sim       # balance check: ending distribution per strategy
npm run build     # typecheck + production build
npm run test:e2e  # whole games in Chromium (Playwright)
npm run a11y      # axe on every screen + whole games played with the keyboard alone (needs Playwright's Chromium)
```

## Rules of the house

- **Balance changes go through the simulation.** Run `npm run sim` before and after; record the change, the old value and the reason in the "Tuning changes" table of `docs/DEVELOPER_NOTES.md`. Targets (printed by the sim): passive good endings < 15%, random 15–30%, thoughtful 55–80%, every ending ≥ 2% for some strategy, cooperation-only and home-first clearly worse than thoughtful, no card above 20% of a thoughtful player's plays, no tipping point before round 6.
- **Refactors must not change behaviour**: the seeded `npm run sim` output must stay byte-identical.
- **Every real-world fact shown to players needs a source** (`src/data/sources.ts`), checked against the primary source. Fiction (OpenBrain, DeepCent, future events) must never be presented as real.
- **Realism**: every card, event, threat, headline, voice, leak and Léa letter carries a `basis` (`ai2027`, `cfg` or `real`, with a precise reference; `tests/basis.test.ts` fails without one). AI 2027 milestones are reached in the scenario's order (dates may move with the hidden pace, never the order). Effect directions follow the scenarios; sizes are tuned by the sim. List any stretch in the build notes' Realism notes.
- Hidden values (the true Confidence, the AI pace) never appear in visible deltas, previews, the heading line or the advisor (tests check this by varying the truth); advisor text contains no numbers. Only the independent audit card shows the truth, by the player's choice.
- Keep player text short and plain: card texts ≤ 25 words.
- Changes to Louis's cards or events are flagged as "Changed from Louis's draft" in the spec.
- **Fonts stay on Google Fonts** (team decision, 25 Oct): don't self-host them; the production CSP allows `fonts.googleapis.com` and `fonts.gstatic.com` only.
- **Security**: content is static, but treat every string reaching `innerHTML` as untrusted: escape it, render only http(s) URLs as links, keep `rel="noopener"` on `target="_blank"`. CI permissions stay least-privilege and third-party actions stay pinned to commit SHAs. See `docs/AUDIT.md`.

## Accessibility (required for every UI change)

The game must be playable with a keyboard alone and with a screen reader, and comfortable for people sensitive to motion.

- Every interactive element is a real `<button>` or `<a>` (never a clickable `div`), reachable with Tab in a logical order, with a visible focus style and an accessible name (`aria-label` when it has no text).
- Map interactions (threat icons, Europe's AI badge, Léa's portrait, leaks) are real HTML buttons laid over the map, with names that contain their visible text; headlines and voices are announced through the live region.
- Modals and overlays: move focus in when they open, trap it while open, close with Escape when closing is allowed, and return focus to the trigger.
- Announce what changes without being looked at (new round, headlines, events, gauge changes, Influence gained) through an `aria-live` region, politely and without flooding.
- Never convey meaning by colour alone (gains/losses also carry + / − and words); text contrast at least WCAG AA (4.5:1, 3:1 for large text).
- Respect `prefers-reduced-motion`: no pulsing, flashing or flying animations; state changes stay visible.
- Keyboard shortcuts (Space to pause, Enter to continue, J journal, ? help) must not fire while focus is in a text field or on another button, and must be listed on screen.
- Check with the end-to-end tests and an automated audit (axe) before merging.

## Branches and previews

Every branch is built and published automatically: `main` at https://damienlethiec.github.io/takeoff-middle-power/, any other branch at `https://damienlethiec.github.io/takeoff-middle-power/preview/<branch>/`. Work on a branch, share the preview link, merge to `main` when it plays well. Deleting a branch removes its preview.
