# Developer notes

The exact rules behind the main tab, for whoever codes the MVP. All numbers are starting values to tune with the simulation script. Louis's conventions apply: gauges 0–100; effects small ±5, medium ±10, big ±20; costs 1–3.

## State

| Key | Name shown | Visible? | Start |
| --- | --- | --- | --- |
| `capability` | Capability | Yes, ±10 error bar | 20 (tipping point at 80) |
| `concentration` | Power concentration | Yes | 50 |
| `apparentAlignment` | Apparent alignment | Yes, error bar ±15 (±5 with AI Office; doubled by opaque reasoning) | 60 |
| `trueAlignment` | True alignment | Hidden | 50 |
| `verification` | Verification readiness | Yes | 0 |
| `tension` | Geopolitical tension | Yes | 40 |
| `misuse` | Misuse risk | Yes | 10 |
| `publicPressure` | Public pressure | Yes | 20 |
| `coalition` | Coalition | Yes, 0–3 | 0 |
| `gdp`, `approval` | GDP, Approval | Yes, always on screen | 50 each |
| `takeoffSpeed` | Takeoff speed | Hidden | Drawn: slow 25%, steady 50%, fast 25% |
| `eu.economy`, `eu.culture`, `eu.state` | Human influence in Europe | Hidden | 80 each |
| `pc`, `budget` | Political Capital, Budget | Yes | 6 PC *(rebalanced, was 4)*, 3 Budget |

Other state: `quarter` (1–16, shown as Q1 2027 to Q4 2030), `revealUntil`, `asmlTokens` (2), `pending` (effects due next quarter), flags `aiOffice`, `openModels`, `oversightMandate`, `flexicurity`, `weightSecurity`, `firedEvents`, `warningShotPrepared`, `internalNotes`; after the end: `plan`, `planOdds`, `labRestraint`, `ending`.

**Decision log.** Every card, actor action and event appends `{ quarter, id, actor, visibleDeltas, hiddenDeltas, briefing }`. The situation report and the final debrief are generated from it.

## Quarter loop

1. **Income** (from Q2; Q1 starts with 6 PC, 3 Budget): no base PC *(rebalanced, was +1)*; PC +1 if publicPressure ≥ 50; concern bubbles are the main PC source. Budget +1. Coalition upkeep: **1 PC per coalition level** *(tuned, was −1 if coalition ≥ 1)*; partners you cannot pay for drift away (coalition −1 until the upkeep is payable). Apply `pending`.
2. **Clock runs** (about 10 s). Spawn 1–3 concern bubbles; each click gives PC +1 (max +2 per quarter). Ticker lines and internal notes arrive.
3. **Actors:** labs report progress (apparentAlignment +1) and consolidate (concentration **+1** *(tuned, was +2)*). The US tightens chip controls once when tension ≥ 60 (tension +3, news line).
4. **Drift:**
   - capability +2 / +4 / +6 for slow / steady / fast, +1 if tension ≥ 60
   - trueAlignment −1 (−2 if tension ≥ 60); tension +1, **or −1 when coalition ≥ 2** *(tuned: coalition diplomacy)*
   - eu.economy −2, **−4 once capability ≥ 35**; eu.culture −1, **−2 once capability ≥ 35**; eu.state −1, **−2 once capability ≥ 50** *(tuned)*. Economy and state halved with `oversightMandate` (rounding alternates by quarter so the average is exactly half)
   - misuse **+1 while capability < 40** *(tuned)*, +2 once capability ≥ 40, **+1 more once open models are funded** *(tuned)*
   - gdp +1 (+1 more if capability ≥ 50); approval −1 once capability ≥ 50 unless `flexicurity`
   - publicPressure +1 every quarter, +2 once capability ≥ 50 *(rebalanced, was +1 once capability ≥ 50)*
5. **Events:** check in list order; at most one per quarter, each once. The clock stops on the event screen.
6. **Situation report:** deltas since last quarter with their levels and causes (from the log), plan odds on current course, new notes. What is new comes first (events, actor moves, delayed card effects, a drift whose wording changed because a threshold was crossed); the routine drift and the labs' regular moves are folded into one background line.
7. **Decision:** one card or pass. The preview shows visible deltas, costs, dependencies and information gains (error bars narrowed, notes that become readable, the audit window, computed from the state before and after) before confirming; the briefing after. A locked card shows its lock reason, not a preview. Notes about later quarters (upkeep, delayed effects) are left out of the last decision.
8. **End check:** capability ≥ 80 → tipping point. After Q16 → slow-world ending. Léa at Q1, Q6, Q11 and the end.

All conditions are read on the values before drift. Every gauge is clamped 0–100, coalition 0–3, PC and Budget ≥ 0; deltas record what was actually applied.

**Expected pace:** steady takeoff reaches 80 around Q15 on drift alone, fast around Q10; slow never does. In practice a stolen model (+5) and high tension (+1 per quarter) bring steady games to Q13–14 (simulation).

## The policy deck

| id | Cost | Available when | Visible effects | Hidden effects | Limit |
| --- | --- | --- | --- | --- | --- |
| `coalition` | 3 PC + 1 PC/quarter upkeep per level | tension < 70 | coalition +1 | — | Up to level 3 |
| `host_verification` | 2 Budget + 1 PC | Always | verification +15 if `aiOffice`, else +7; tension +5 | — | Repeatable |
| `asml` | 2 PC + 1 token | capability ≥ 30 | tension +15; choose: model access (gdp +5) or lab safety commitment | Safety commitment: trueAlignment +5 | 2 tokens |
| `ai_office` | 2 Budget | Always | Error bars narrow (capability ±5, alignment ±5); all internal notes readable, including past ones | — | Once |
| `measure` | 1 Budget + 1 PC | No audit running (quarter > `revealUntil`) *(tuned)* | Shows eu scores for 3 quarters (`revealUntil` = quarter + 3); internal notes readable meanwhile, this quarter's included | — | Repeatable, one audit at a time |
| `open_models` | 2 Budget | Always | concentration −15; misuse +10 | eu.economy +5 | Once |
| `oversight_mandate` | 3 PC | Always | gdp −5 | Halves economy and state drift; enables silicon blackmail | Once |
| `flexicurity` | 3 PC | capability ≥ 30 | No approval drift | Léa's retrained variant; PC −1 next quarter | Once |
| `weight_security` | 2 PC | `weight_theft` not fired | concentration +5 | Prepared weight theft | Once |
| `fund_alignment` | 2 Budget | Always | — | trueAlignment +6 | Repeatable |
| `cyber_defence` *(added)* | 2 Budget | Always | misuse −10; gdp −2 | Prepared ransomware wave | Once |

## The events

| id | Actor | Trigger | Prepared if | Prepared effects | Unprepared effects |
| --- | --- | --- | --- | --- | --- |
| `warning_shot` | The AI systems | trueAlignment < 50 and capability ≥ 65 | coalition ≥ 1 and verification ≥ 30 | publicPressure +15; tension −10; verification +10; apparentAlignment −10 *(added)*; `warningShotPrepared` on | publicPressure +10 *(rebalanced, was +5)* |
| `weight_theft` | China | tension ≥ 50 and capability ≥ 40 | `weightSecurity` | tension +5 | capability +5; tension +20; publicPressure +5 *(added)*; trueAlignment −3; `exportControls` on |
| `opaque_reasoning` | AI systems and labs | capability ≥ 70 | `aiOffice` | Error bar unchanged; apparentAlignment −5 *(added)* | Alignment error bar doubles |
| `silicon_blackmail` | US frontier labs | concentration ≥ 60 and `oversightMandate` | `openModels` | None: stand firm | Choice: give in (concentration +10) or hold firm (gdp −15) |
| `ransomware` | Open-source collective | misuse ≥ 40 | `cyberDefence` (Cyber shield card, settled) | gdp −3 | gdp −10, approval −10, publicPressure +10 *(added)*; choice: emergency ban (misuse −20, concentration +10) or defence spending (Budget −2, misuse −10) |

## The tipping point

1. One free last decision.
2. Plan weights (minimum 1), then a seeded weighted draw; store the odds for the debrief.
   - `verified_slowdown`: 5 + 0.6 × verification + 0.3 × publicPressure + 10 × coalition + 15 if `warningShotPrepared` − 0.2 × tension
   - `shut_down`: 2, + 0.3 × publicPressure if publicPressure ≥ 60 *(rebalanced, was 70)*, + 10 if the warning shot fired and trueAlignment < 40
   - `fight_china`: 10 + 0.5 × tension
   - `race`: max(5, 25 − 0.2 × publicPressure − 0.1 × verification)
3. If `race`: lab restraint with probability 20% + publicPressure ÷ 4 %; if yes, trueAlignment +8.
4. **Aftermath** *(added)*: right after the choice, Europe's human influence drops by 25 on each organ if `race`, 10 if `fight_china` (economy and state halved with `oversightMandate`), logged as hidden deltas. Without it a fast game ended with "people still run things" next to *Loss of control*.

The odds shown during play (forecast, previews) use the same formula on the current state. Previews mask the card's hidden effects before computing `oddsAfter`.

## The endings

| Situation | Good ending if | Otherwise |
| --- | --- | --- |
| No tipping point, concentration < 60: Plateau | `ransomware` not fired or prepared: A bright winter | Decentralised mayhem |
| No tipping point, concentration ≥ 60: Big AI | (`silicon_blackmail` prepared, held firm or not fired) and eu.economy ≥ 40: The agent economy | Silicon blackmail |
| `verified_slowdown` or `shut_down`: Diplomacy | verification ≥ 50, concentration ≤ 70, trueAlignment ≥ 35: Licensed utopia | Unstable pause |
| `fight_china`: Arms race | coalition ≥ 1 and tension ≤ 70: Multipolar world | Hot war |
| `race`: Take-off | trueAlignment ≥ 60: The cognitive revolution | Loss of control |

**Epilogue:** overall human influence = average of the three eu scores; bands ≥ 60, 30–59, < 30.

**Léa:** Q1 by takeoffSpeed; Q6 by eu.economy ≥ **65** *(tuned, was 60: with 60 almost every game got the same variant)*; Q11 by `flexicurity`; end by overall human influence ≥ 50, plus one line per ending.

## Engine implementation notes

- **Quarter numbering.** `createInitialState` starts at quarter 1; `endQuarter` advances the quarter; `startQuarter` runs the current one (and does nothing if it already ran). No income in Q1.
- **Order inside `startQuarter`:** snapshot `quarterStart` → income, upkeep, pending → actors → drift → first eligible event → news → internal notes. The situation report compares with `quarterStart`, so the player's own decision (taken at the end of the previous quarter) is not counted as a change.
- **Events:** prepared is checked at fire time; visible and hidden effects apply at fire time; choice effects apply in `resolveEvent`. `endQuarter` and `playCard` refuse to run while an event is pending.
- **Tipping point:** `endQuarter` sets phase `tipping` and resets `decidedThisQuarter`; `playCard` then costs nothing (an ASML token is still used); `runTippingPoint` draws the plan, lab restraint and aftermath, and resolves the ending.
- **News:** each quarter shows 2–4 public lines. First the lines tied to what changed (the world's reaction to last quarter's decision, the US chip controls, capability/tension/pressure milestones crossed this quarter, the event), then ambient lines, one per pool (labs' safety claims, China, US government, jobs once capability ≥ 50, public pressure, misuse, open models, tension, Europe's economy, the AI systems, mid- and late-game lines). Each template is used at most once per game.
- **Internal notes:** 0–2 per quarter from pools whose conditions read the hidden state: the gap between apparent and true alignment, China's intentions, lab insiders by takeoff speed, misuse signals, who really decides in Europe, early signs of the warning shot. `readable` = `aiOffice` or quarter ≤ `revealUntil`.
- **Randomness:** mulberry32, state in `GameState.rng`; used for the takeoff speed, news and notes selection, the plan draw and lab restraint.
- **Content** lives in `src/data` (cards, events, news, notes, gauges, plans, endings, Léa, tuning). All numbers above are in `src/data/tuning.ts`.

## Tuning changes from the starting values (simulation, 25 Oct)

Each change was made to hit the MVP criteria with `npm run sim` (2,000 seeded games per strategy). Marked *(tuned)* or *(added)* above.

| Change | Starting value | Now | Why |
| --- | --- | --- | --- |
| Labs consolidate | concentration +2 / quarter | +1 | With +2 concentration reached ~82 by Q16: a Plateau (concentration < 60) was unreachable even with open models |
| Coalition upkeep | −1 PC if coalition ≥ 1 | −1 PC per level; unpaid partners leave | PC never constrained the prepared path and concern bubbles were worthless. Now a prepared player who never clicks bubbles drops from 95% to ~77% good endings |
| Coalition diplomacy | — | tension −1 instead of +1 per quarter at coalition ≥ 2 | The spec says tension falls with coalition diplomacy; no rule did it |
| Human influence drift | −2 / −1 / −1 | economy −2 → −4 from capability 35; culture −1 → −2 from 35; state −1 → −2 from 50 | A passive slow game kept the economy above 40 and got the good Big AI ending; the low epilogue band was unreachable |
| Aftermath at the tipping point | — | race −25, fight −10 on each organ | Epilogues contradicted take-off endings |
| Misuse drift | +2 from capability 40 | +1 before 40, +2 after, +1 more with open models | The ransomware wave never fired in slow worlds, so *Decentralised mayhem* was unreachable |
| Ransomware prepared | misuse < 60 at trigger (proposal) | new card **Cyber shield for hospitals and grids** (2 Budget, once: misuse −10, GDP −2) | The wave fires when misuse crosses 40 in small steps, so "misuse < 60" was always true and the unprepared variant unreachable. Settled with a dedicated card rather than overloading weight security |
| Incidents and public pressure | — | weight theft unprepared +5, ransomware unprepared +10 | The spec says public pressure rises with incidents; otherwise it barely moved |
| Apparent alignment | — | prepared warning shot −10, prepared opaque reasoning −5 | The spec says it falls when internal reports leak; Europe's inspectors and testers are how they leak |
| Capability error bar | ±10 | ±10, ±5 with AI Office | The AI Office card says "error bar narrows" |
| Léa Q6 | eu.economy ≥ 60 | ≥ 65 | With 60 nearly every game showed the same scene |
| Political Capital income (rebalance 2) | +1 PC per quarter, start 4 | no base PC, start 6 | Even with upkeep, players sat on 10–12 unused PC by Q8. PC now comes from concern bubbles (max 2 per quarter) and high public pressure, so clicking bubbles matters |
| PC costs (rebalance 2) | coalition 2, oversight 2, flexicurity 2, weight security 1, ASML free, host verification 0 PC | 3, 3, 3, 2, 2 PC per token, host verification 2 Budget + 1 PC | Makes political choices compete with each other |
| Public pressure drift (rebalance 2) | +1 once capability ≥ 50 | +1 every quarter, +2 once capability ≥ 50; unprepared warning shot +10 (was +5) | Pressure never passed 50, so its PC bonus and "shut it all down" were dead rules |
| Shut it all down threshold (rebalance 2) | pressure ≥ 70 | ≥ 60 | Pressure still rarely reaches 70 |
| Measure human influence (phase 0, B3) | repeatable every quarter | locked while an audit runs ("An audit is already running (until Qx YYYY)") | It could be bought 7–8 times a game, each play revealing nothing new, and the debrief repeated it. Sim: only the random player buys it; good endings passive 0% → 0%, random 20.4% → 20.6%, prepared 81.5% → 81.5%; every ending still reached (lowest best share 1.1%) |

**Simulation results after rebalance 2** (passive / random / prepared): good endings 0% / 21% / 82%; PC left at Q8 6 / 2 / 1; public pressure reaches 50 in 0% / 48% / 56% of games; every ending reached in at least 1.4% of games by some strategy; tipping point in 76% of games (slow worlds never), steady games at Q13–14, fast at Q10. After the phase 0 audit lock: unchanged for passive and prepared; random 20.6% good; lowest best share of an ending 1.1% (The cognitive revolution).

## Tech

- GitHub repo, Vite + TypeScript, no framework, Vitest for tests, deployed on GitHub Pages: `main` at `/takeoff-middle-power/`, every other branch at `/takeoff-middle-power/preview/<branch>/` (BASE_PATH set in `.github/workflows/deploy.yml`; deleting a branch removes its preview).
- `engine/` holds pure functions only (no DOM): the `EngineApi` in `src/engine/api.ts` (`createInitialState(seed)`, `startQuarter`, `collectBubble`, `resolveEvent(state, option?)`, `playCard(state, id, option?)`, `previewCard(state, id, option?)`, `pass`, `endQuarter`, `runTippingPoint`, `debrief`, views and labels), plus `resolveEnding(state)` and a seeded random generator (`rng.ts`). `previewCard` applies the card to a copy and returns the visible deltas only; odds after the card are computed with the hidden effects masked.
- `data/` is declarative: cards, events, actor rules, plans, endings, news, internal notes and Léa's scenes as typed objects with `effects`, `hiddenEffects`, `availableWhen`, `preparedWhen`, `actor`, `briefing`, `debrief` and `source`. Conditions are `{ key, op, value }` combined with `all` / `any`.
- `ui/`: the clock, map, gauges with "rises when / falls when" popovers, the two feeds, the situation report and the debrief all render from the state and the log.
- `sim.ts` runs 2,000 seeded games each for a passive, a random and a prepared player and prints the ending distribution, to check the success criteria.
