# v2 workstreams

The v2 changes are specified in `docs/V2_SPEC.md` (team-approved, 25 Oct 2026; decisions at the end of that file take precedence). Four workstreams build it in parallel. Each owns files; touch someone else's files only for a one-line hook, and say so in your report.

| Workstream | Branch | Owns | Builds |
| --- | --- | --- | --- |
| Engine & economy | `v2-engine` | `src/engine/**` (except `types.ts`/`api.ts`, see below), `src/data/*.ts` (not `src/data/copy/`), `scripts/sim.ts`, `tests/` engine tests, `docs/DEVELOPER_NOTES.md` | Phase 3 economy and deck; acts, unlocks, context cards, dashboard selection, notices, tips triggers, concerns, risk track, advisor, trajectory, income view, journal, Léa history (engine side); report causes |
| Main screen | `v2-screen` | `src/ui/app.ts`, `src/ui/map.ts`, `src/ui/format.ts`, `src/ui/screens/decision.ts`, `src/ui/screens/moments.ts`, `src/ui/styles.css`, `tests/ui/` for these | Risks strip, trajectory bar, advisor panel, dashboard 4→5→6 + "More indicators", card faces and preview info gains, real-cost line, sticky actions, pressure on the map, report v2, briefing consequences, news feeds by quarter, concerns as explanation bubbles |
| Onboarding | `v2-onboarding` | `src/ui/screens/opening.ts`, new `src/ui/onboarding/**` (tips, journal, Léa history, notices, act transitions, skip-to-decision, next-decision cue) | Phase 1 UI. Hooks into `app.ts` through a small, clearly marked block (`// v2-onboarding hooks`) |
| Content & sources | `v2-content` | `src/data/copy/**`, `src/data/sources.ts`, the `alreadyReal`/`source` fields in `src/data/events.ts` and `src/data/cards.ts`, `docs/FACT_CHECK.md` | All v2 player-facing words: intro, acts, tips, concerns, risk stages, unlock reasons, indicator intros, causes, advisor templates, sourced real-world costs; 2025+ sources |

**Contract.** `src/engine/types.ts`, `src/engine/api.ts` and `src/data/copy/types.ts` are the shared contract. Additive changes only, kept minimal, listed in your final report. Stubs in `src/engine/index.ts` return safe defaults until the engine workstream implements them.

**Integration.** Branch `v2` collects everything (`https://damienlethiec.github.io/takeoff-middle-power/preview/v2/`). Phase 0 bug fixes land on `main` in parallel: before your final push, merge `origin/v2` into your branch and resolve conflicts on your own files.

**Done means:** `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run a11y` pass, and for the engine, `npm run sim` within the targets of `docs/V2_SPEC.md`. Accessibility rules in `CLAUDE.md` apply to every UI change.

## Shared ids (engine triggers them, content writes their words)

**Tips** (`TipCopy.id`), at most one shown per quarter, in this priority when several are due:

| id | Shown when |
| --- | --- |
| `tip_clock` | Q1, as the clock first runs: the quarter, the clock, pausing |
| `tip_decision` | Q1 decision: one decision per quarter, the two currencies, previews |
| `tip_hidden` | First internal note or first time the alignment error bar matters: labs' reports vs what is true; true values revealed at the end |
| `tip_trajectory` | Q2: the "Where the superpowers are heading" bar |
| `tip_risks` | First risk appears on the risk track: telegraphed crises and being prepared |
| `tip_coalition` | Coalition card unlocked |
| `tip_pressure` | Public pressure indicator introduced: what it is, +1 PC when high |
| `tip_misuse` | Misuse indicator introduced: open models vs misuse |
| `tip_context` | First context card offered: it disappears after two quarters |
| `tip_human_influence` | Act 3 opens: GDP can rise while people lose control; measuring it |
| `tip_tipping` | Capability reaches 70: what happens at 80 |

**Concern themes**: `jobs`, `safety`, `misuse`, `power`, `war`, `general` (see `ConcernCopy`). Regions `eu`, `us`, `cn`; most concerns are European.

**Risks**: one `RiskCopy` per `EventId`.

**Unlock reasons**: one `UnlockCopy` per card that is not available from Q1 (`coalition`, `weight_security`, `flexicurity`, `asml`, `open_models`, `cyber_defence`, `measure`, `oversight_mandate`) and per context card (`emergency_summit`, `joint_attribution`).

**Indicator intros**: one `IndicatorIntroCopy` per `DashboardKey` that can be introduced after the opening four (`coalition`, `publicPressure`, `misuse`, `concentration`, `gdp`, `approval`).

**Acts**: `ACTS` 1–3 (title, beat). **Intro**: `INTRO`, exactly two screens.

**Engine-owned words**: report causes and sentences, advisor recommendations, card texts of the new cards. The content workstream may suggest rewording in its report; it does not edit engine files.
