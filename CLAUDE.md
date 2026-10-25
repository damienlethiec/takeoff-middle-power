# Takeoff: Middle Power — notes for coding agents

A Plague Inc.-style browser game about AI governance. The player is the EU's AI Envoy over 16 quarters (Q1 2027–Q4 2030). All game text is in English; the team discusses in French.

## Read first

- `docs/SPEC.md`: player-facing design (what the game must feel like). Source of truth for intent.
- `docs/DEVELOPER_NOTES.md`: exact rules and numbers, plus every tuning change and why.
- `src/engine/types.ts` and `src/engine/api.ts`: the contract between engine and UI. The quarter flow is documented at the top of `api.ts`.

## Layout

- `src/engine/`: pure functions only. No DOM, no `Math.random` (use the seeded RNG stored in `GameState.rng`), never mutate inputs.
- `src/data/`: declarative content (cards, events, news, notes, endings, Léa, sources). **All numbers live in `src/data/tuning.ts`.**
- `src/ui/`: string-template DOM rendering, controller in `app.ts`, one file per screen in `screens/`. The UI imports the real engine directly (`src/main.ts`).
- `scripts/sim.ts`: seeded simulation of thousands of games per strategy (passive, random, prepared).
- `tests/`: Vitest.

## Commands

```sh
npm run dev       # local server at /takeoff-middle-power/
npm test          # unit tests
npm run sim       # balance check: ending distribution per strategy
npm run build     # typecheck + production build
npm run a11y      # axe on every screen + whole games played with the keyboard alone (needs Playwright's Chromium)
```

## Rules of the house

- **Balance changes go through the simulation.** Run `npm run sim` before and after; record the change, the old value and the reason in the "Tuning changes" table of `docs/DEVELOPER_NOTES.md`. Targets: passive rarely wins (< 20%), a prepared player usually wins (> 60%), all 10 endings reachable.
- **Refactors must not change behaviour**: the seeded `npm run sim` output must stay byte-identical.
- **Every real-world fact shown to players needs a source** (`src/data/sources.ts`), checked against the primary source. Fiction (OpenBrain, DeepCent, future events) must never be presented as real.
- Hidden values (true alignment, takeoff speed, human influence in Europe) never appear in visible deltas, previews or advisor notes; advisor notes contain no numbers.
- Keep player text short and plain: card texts ≤ 25 words.
- Changes to Louis's cards or events are flagged as "Changed from Louis's draft" in the spec.
- **Fonts stay on Google Fonts** (team decision, 25 Oct): don't self-host them; the production CSP allows `fonts.googleapis.com` and `fonts.gstatic.com` only.
- **Security**: content is static, but treat every string reaching `innerHTML` as untrusted: escape it, render only http(s) URLs as links, keep `rel="noopener"` on `target="_blank"`. CI permissions stay least-privilege and third-party actions stay pinned to commit SHAs. See `docs/AUDIT.md`.

## Accessibility (required for every UI change)

The game must be playable with a keyboard alone and with a screen reader, and comfortable for people sensitive to motion.

- Every interactive element is a real `<button>` or `<a>` (never a clickable `div`), reachable with Tab in a logical order, with a visible focus style and an accessible name (`aria-label` when it has no text).
- Map interactions (concern bubbles, Léa's pin, event pins) must have a keyboard and screen-reader equivalent.
- Modals and overlays: move focus in when they open, trap it while open, close with Escape when closing is allowed, and return focus to the trigger.
- Announce what changes without being looked at (new quarter, event, gauge changes, PC gained) through an `aria-live` region, politely and without flooding.
- Never convey meaning by colour alone (gains/losses also carry + / − and words); text contrast at least WCAG AA (4.5:1, 3:1 for large text).
- Respect `prefers-reduced-motion`: no pulsing, flashing or flying animations; state changes stay visible.
- Keyboard shortcuts (Space to pause, Enter to confirm) must not fire while focus is in a text field or on another button, and must be listed on screen.
- Check with the end-to-end tests and an automated audit (axe) before merging.

## Branches and previews

Every branch is built and published automatically: `main` at https://damienlethiec.github.io/takeoff-middle-power/, any other branch at `https://damienlethiec.github.io/takeoff-middle-power/preview/<branch>/`. Work on a branch, share the preview link, merge to `main` when it plays well. Deleting a branch removes its preview.
