# Takeoff: Middle Power — notes for coding agents

A Plague Inc.-style browser game about AI governance. The player is the EU's AI Envoy over 16 quarters (Q1 2027–Q4 2030). All game text is in English; the team discusses in French.

## Read first

- `docs/SPEC.md`: player-facing design (what the game must feel like). Source of truth for intent.
- `docs/DEVELOPER_NOTES.md`: exact rules and numbers, plus every tuning change and why.
- `src/engine/types.ts` and `src/engine/api.ts`: the contract between engine and UI. The quarter flow is documented at the top of `api.ts`.

## Layout

- `src/engine/`: pure functions only. No DOM, no `Math.random` (use the seeded RNG stored in `GameState.rng`), never mutate inputs.
- `src/data/`: declarative content (cards, events, news, notes, endings, Léa, sources). **All numbers live in `src/data/tuning.ts`.**
- `src/ui/`: string-template DOM rendering, controller in `app.ts`, one file per screen in `screens/`. `src/engine-source.ts` switches between the real engine and `ui/mockEngine.ts`.
- `scripts/sim.ts`: seeded simulation of thousands of games per strategy (passive, random, prepared).
- `tests/`: Vitest.

## Commands

```sh
npm run dev       # local server at /takeoff-middle-power/
npm test          # unit tests
npm run sim       # balance check: ending distribution per strategy
npm run build     # typecheck + production build
```

## Rules of the house

- **Balance changes go through the simulation.** Run `npm run sim` before and after; record the change, the old value and the reason in the "Tuning changes" table of `docs/DEVELOPER_NOTES.md`. Targets: passive rarely wins (< 20%), a prepared player usually wins (> 60%), all 10 endings reachable.
- **Refactors must not change behaviour**: the seeded `npm run sim` output must stay byte-identical.
- **Every real-world fact shown to players needs a source** (`src/data/sources.ts`), checked against the primary source. Fiction (OpenBrain, DeepCent, future events) must never be presented as real.
- Hidden values (true alignment, takeoff speed, human influence in Europe) never appear in visible deltas, previews or advisor notes; advisor notes contain no numbers.
- Keep player text short and plain: card texts ≤ 25 words.
- Changes to Louis's cards or events are flagged as "Changed from Louis's draft" in the spec.

## Branches and previews

Every branch is built and published automatically: `main` at https://damienlethiec.github.io/takeoff-middle-power/, any other branch at `https://damienlethiec.github.io/takeoff-middle-power/preview/<branch>/`. Work on a branch, share the preview link, merge to `main` when it plays well. Deleting a branch removes its preview.
