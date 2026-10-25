# Developer notes

The exact rules behind the main tab, for whoever codes the MVP. All numbers are starting values to tune with the simulation script. Louis's conventions apply: gauges 0–100; effects small ±5, medium ±10, big ±20; costs 1–3.

## State

| Key | Name shown | Visible? | Start |
| --- | --- | --- | --- |
| `capability` | Capability | Yes, ±10 error bar | 20 (tipping point at 80) |
| `concentration` | Power concentration | Yes | 50 |
| `apparentAlignment` | Apparent alignment | Yes, error bar ±15 (±5 with AI Office; doubled by opaque reasoning) | 60 |
| `trueAlignment` | True alignment | Hidden | **Drawn: 45, 55 or 65, equally likely** *(v2, was 50)* |
| `verification` | Verification readiness | Yes | 0 |
| `tension` | Geopolitical tension | Yes | 40 |
| `misuse` | Misuse risk | Yes | 10 |
| `publicPressure` | Public pressure | Yes | 20 |
| `coalition` | Coalition | Yes, 0–3 | 0 |
| `gdp`, `approval` | GDP, Approval | Yes, compact line under the currencies | 50 each |
| `takeoffSpeed` | Takeoff speed | Hidden | Drawn: slow 25%, steady 50%, fast 25% |
| `eu.economy`, `eu.culture`, `eu.state` | Human influence in Europe | Hidden | 80 each |
| `pc`, `budget` | Political Capital, Budget | Yes | **4 PC, 5 Budget** *(v2, was 6 and 3)*; both capped at 8 |

Other state: `quarter` (1–16, shown as Q1 2027 to Q4 2030), `revealUntil`, `asmlTokens` (2), `pending` (effects due next quarter), flags `aiOffice`, `openModels`, `oversightMandate`, `flexicurity`, `weightSecurity`, `cyberDefence`, `exportControls`, `warningShotPrepared`, `alignmentErrorDoubled`, `firedEvents`; after the end: `tipping` (plan, odds, lab restraint), `ending`.

v2 state: `act` (1–3), `unlockedCards`, `contextCards` (`{ id, until, reason }`), `cardLastPlayed` (for cooldowns), `dashboard` (`cap`, stable `slots`, `milestones`: the engine's sticky memory of beats, introduced indicators and risks that appeared), `notices` (rebuilt every quarter), `tipsShown` and `tipLog`, `concerns` (rebuilt every quarter), `leaLetters`, `history` (one record per decision, with the report the player saw), `oddsHistory` (public odds after each decision, event and moving drift, with a cause).

**Decision log.** Every card, actor action and event appends `{ quarter, id, actor, visibleDeltas, hiddenDeltas, briefing }`. The situation report and the final debrief are generated from it.

## Quarter loop

1. **Income** (from Q2): **+2 Budget and +2 PC; +1 PC if publicPressure ≥ 50; −1 PC if approval < 30; neither currency goes above 8** *(v2)*. No coalition upkeep *(v2)*. Apply `pending`. `nextIncome(state)` shows next quarter's income and why.
2. **Clock runs** (about 10 s). 1–3 concern bubbles (1, +1 from pressure 35, +1 from 50); clicking one explains a public worry and pays nothing *(v2)*. Ticker lines and internal notes arrive.
3. **Actors:** labs report progress (apparentAlignment +1) and consolidate (concentration +1). The US tightens chip controls once when tension ≥ 60 (tension +3, news line). **Two quarters after a successful model theft, the US widens export controls on its own (tension +5)** *(v2)*. Joint attribution with allies averts the next of these two escalations, once.
4. **Drift** (one log entry per cause, so each report line has its own cause):
   - capability +2 / +4 / +6 for slow / steady / fast, +1 if tension ≥ 60
   - trueAlignment −1 (−2 if tension ≥ 60); tension +1, or −1 when coalition ≥ 2 (coalition diplomacy)
   - eu.economy −2, −4 once capability ≥ 35; eu.culture −1, −2 once capability ≥ 35; eu.state −1, −2 once capability ≥ 50. Economy and state halved with `oversightMandate` (rounding alternates by quarter so the average is exactly half)
   - misuse +1 while capability < 40, +2 once capability ≥ 40, +1 more once open models are funded
   - `economy`: gdp +1 (+1 more if capability ≥ 50); `layoffs`: approval −1 once capability ≥ 50 unless `flexicurity`; `public_concern`: publicPressure +1, +2 once capability ≥ 50
5. **Events:** check in list order; at most one per quarter, each once. The clock stops on the event screen. A prepared warning shot offers the **Emergency inspection summit**, any theft attempt offers **Joint attribution with allies**, each for 2 quarters *(v2)*.
6. **Employment shocks** *(v2)*: the first time capability reaches 40 and 70 (after the event, so a stolen model can trigger one): approval −5 (−2 with flexicurity), public pressure +5.
7. **Story beats** *(v2)*: acts open and cards unlock (below); at most one indicator joins the dashboard; risks that appear are recorded; thresholds crossed (pressure 50, tension 60, capability 70, approval below 30) become notices. Then news, internal notes, concerns, and Léa's letter at Q1, Q6 and Q11.
8. **Situation report:** the 1–3 headline lines (absolute level, delta, real cause, what the level means for winning), then the changes, the background line, the risks that moved and the trajectory's last change.
9. **Decision:** one card or pass. The preview shows visible deltas, costs, dependencies, information gains (computed from the state before and after) and the sourced real-world cost; a locked card shows only its lock reason; notes about later quarters are left out when no quarter follows. The briefing adds what the decision will matter for ("Ready if a theft is attempted").
10. **End check:** capability ≥ 80 → tipping point. After Q16 → slow-world ending. Léa's last letter at the end.

All conditions are read on the values before drift. Every gauge is clamped 0–100, coalition 0–3, PC and Budget ≥ 0 (and gains stop at 8); deltas record what was actually applied.

**Expected pace:** steady takeoff reaches 80 around Q15 on drift alone, fast around Q10; slow never does. In practice a stolen model (+5) and high tension (+1 per quarter) bring steady games to Q13–15 (simulation).

## Acts, unlocks and the dashboard (v2)

Complexity grows with the story, never with the calendar alone (`src/data/progress.ts`, numbers in `TUNING.progress`). A beat happens once; at most one act-opening or indicator-bearing beat per quarter.

| Beat | When | Opens | Cards unlocked | Indicator |
| --- | --- | --- | --- | --- |
| Start | Q1 | Act 1 "A seat at the table" | AI Office capacity, Offer to host verification, Diplomatic talks, Fund alignment research | Capability, apparent alignment, verification, tension |
| Partners call Brussels | Q2 | — | Middle-power coalition | Coalition, the quarter after its first level |
| Labs' networks probed | The model-theft risk appears (tension ≥ 45 or capability ≥ 30) | — | Weight security standards | — |
| First wave of AI layoffs | The first employment shock (capability 40); slow worlds: Q6 with its own news line | Act 2 "The race goes public" | Flexicurity reform, Use the ASML lever | Public pressure |
| First AI-enabled cyberattack | Act 2 open and misuse ≥ 25; fallback Q9 | — | Fund open-weight models, Cyber shield | Misuse risk |
| Léa's Q6 letter | Act 2 open (not the same quarter) and Q6+ | Act 3 "Who decides?" | Measure human influence, Human oversight mandate | — (human influence stays hidden) |

**Dashboard (handoff 06).** 4 opening indicators; each new one adds a slot (cap 5, then 6), at most one per quarter, only in `startQuarter` (frozen during the decision). Concentration becomes relevant with the oversight mandate, open models or concentration ≥ 60. At 6, a newcomer takes the slot of the least relevant non-opening indicator (full coalition 30, misuse after the wave 20, concentration 40 or 80 while blackmail looms, pressure 60, coalition 50, misuse 70); other slots keep their positions. GDP and approval are always secondary.

## The policy deck

| id | Cost | Available when | Visible effects | Hidden effects | Limit |
| --- | --- | --- | --- | --- | --- |
| `coalition` | **3 / 4 / 5 PC** (levels: Middle-power coalition, Wider coalition, Middle-power pact) | tension < 70 | coalition +1, **tension −4** | — | 3 levels |
| `diplomatic_talks` *(v2)* | 2 PC + 1 Budget | tension ≥ 35; 2 quarters of rest after each round | tension −6 | — | 3 |
| `host_verification` | **2 Budget + 1 PC / 3 Budget / 3 Budget + 1 PC** (Offer to host verification, Inspection accord, Joint inspectorate) | verification < 100 | verification +15 if `aiOffice`, else +7; tension +5 | — | 3 levels |
| `asml` | 2 PC + 1 token | capability ≥ 30 | tension +15; choose: model access (gdp +5) or lab safety commitment | Safety commitment: trueAlignment +5 | 2 tokens |
| `ai_office` | 2 Budget | Always | Error bars narrow (capability ±5, alignment ±5); all internal notes readable, including past ones | — | Once |
| `measure` | 1 Budget + 1 PC | No audit running (quarter > `revealUntil`) | Shows eu scores for 3 quarters (`revealUntil` = quarter + 3); internal notes readable meanwhile | — | **2**, one at a time |
| `open_models` | 2 Budget | Always | concentration −15; misuse +10 | eu.economy +5 | Once |
| `oversight_mandate` | 3 PC | Always | gdp −5 | Halves economy and state drift; enables silicon blackmail | Once |
| `flexicurity` | 3 PC | capability ≥ 30 | No approval drift; employment shocks cost approval −2 instead of −5 | Léa's retrained variant; PC −1 next quarter | Once |
| `weight_security` | 2 PC | `weight_theft` not fired | concentration +5 | Prepared weight theft | Once |
| `fund_alignment` | **2 / 3 / 4 Budget** | Always | — | trueAlignment **+6 / +5 / +4** | **3** |
| `cyber_defence` | 2 Budget | Always | misuse −10; gdp −2 | Prepared ransomware wave | Once |
| `emergency_summit` *(v2, context)* | 2 PC | 2 quarters after a prepared warning shot | verification +10; +10 weight on the verified slowdown | — | Once |
| `joint_attribution` *(v2, context)* | 1 PC | 2 quarters after a theft attempt; coalition ≥ 1 | tension −5; averts the next US export-control escalation | — | Once |

Every card has a use limit; levelled cards show the next level's name and cost. Cards not yet unlocked are not in `cardViews`; unlocked but locked or unaffordable cards stay with their reason. Card faces carry up to three chips (visible effects as they apply now, an information chip, "+ hidden effect"), the crises they prepare for (from the risk table), the unlock reason and a "New" flag the quarter they arrive.

## The events

| id | Actor | Trigger | Prepared if | Prepared effects | Unprepared effects |
| --- | --- | --- | --- | --- | --- |
| `warning_shot` | The AI systems | trueAlignment < 50 and capability ≥ 65 | coalition ≥ 1 and verification ≥ 30 | publicPressure +15; tension −10; verification +10; apparentAlignment −10; `warningShotPrepared` on; offers the summit | publicPressure +10 |
| `weight_theft` | China | tension ≥ 50 and capability ≥ 40 | `weightSecurity` | tension +5; offers joint attribution | capability +5; tension +20; publicPressure +5; trueAlignment −3; `exportControls` on; offers joint attribution; US escalation two quarters later |
| `opaque_reasoning` | AI systems and labs | capability ≥ 70 | `aiOffice` | Error bar unchanged; apparentAlignment −5 | Alignment error bar doubles |
| `silicon_blackmail` | US frontier labs | concentration ≥ 60 and `oversightMandate` | `openModels` | None: stand firm | Choice: give in (concentration +10) or hold firm (gdp −15) |
| `ransomware` | Open-source collective | misuse ≥ 40 | `cyberDefence` | gdp −3 | gdp −10, approval −10, publicPressure +10; choice: emergency ban (misuse −20, concentration +10) or defence spending (Budget −2, misuse −10) |

## The risk track (v2)

`riskViews(state)` reads public values only (gauges, flags, coalition, fired events): never true alignment, human influence or the takeoff speed. A risk appears once (and stays), then its stage follows the distance of each public target: imminent within the `imminent` margin of every target, rising within the `rising` margin, else watch (`TUNING.risks.margins`: capability 12 / 6, tension 8 / 4, misuse 8 / 4, concentration 8 / 4). "Prepared" reuses the event's own `preparedWhen`.

| Risk | Appears | Targets | Prepared by |
| --- | --- | --- | --- |
| Model theft | tension ≥ 45 or capability ≥ 30 | tension 50, capability 40 | Weight security standards |
| AI incident (`possible`: it also depends on hidden true alignment) | capability ≥ 50 | capability 65 | Coalition + verification 30 |
| Opaque reasoning | capability ≥ 55 | capability 70 | AI Office capacity |
| Silicon blackmail | Oversight mandate | concentration 60 | Open models |
| Ransomware wave | misuse ≥ 25 | misuse 40 | Cyber shield |

## Advisor, trajectory, tips, concerns, journal (v2)

- **Advisor** (`advisor`): the first affordable, available card from: preparing the most urgent unprepared risk that is rising or imminent (if its answer is unaffordable, it says so and recommends nothing), a context card on offer, preparing a risk on watch, talks or coalition when tension ≥ 50, the AI Office, a first partner, inspections below 45, a second partner, flexicurity from capability 30, alignment research, talks from tension 40, the coalition up to 3. The second becomes the alternative. Words in `ADVISOR_TEXT`/`ADVISOR_REASON` (copy templates override them); no numbers, no hidden values.
- **Trajectory** (`trajectory`): public odds now, the most likely plan, and the last movement in `oddsHistory` (largest plan change of at least 1 point) with its cause (`card.did`, the event's short label, a layoff wave, "the race went on").
- **Tips** (`tip`, `markTipShown`): the highest-priority due tip not yet shown (order in `docs/V2_WORKSTREAMS.md`), one per quarter except Q1 (the clock tip, then the decision tip).
- **Concerns**: themes from public values (jobs from capability 40, misuse from 25, war from tension 55, power from concentration 60, safety always), words from copy `CONCERNS`, not repeating last quarter's.
- **History and journal**: `playCard`/`pass` record the report as the player saw it and the decision; `endQuarter` records "No decision" if none was taken. `journal` adds the quarter's events, Léa's letter and the tips shown.

## The tipping point

1. One free last decision.
2. Plan weights (minimum 1), then a seeded weighted draw; store the odds for the debrief.
   - `verified_slowdown`: 5 + 0.6 × verification + 0.3 × publicPressure + 10 × coalition + 15 if `warningShotPrepared` **+ 10 after an emergency inspection summit** *(v2)* − 0.2 × tension
   - `shut_down`: 2, + 0.3 × publicPressure if publicPressure ≥ 60, + 10 if the warning shot fired and trueAlignment < 40
   - `fight_china`: 10 + 0.5 × tension
   - `race`: max(5, 25 − 0.2 × publicPressure − 0.1 × verification)
3. If `race`: lab restraint with probability 20% + publicPressure ÷ 4 %; if yes, trueAlignment +8.
4. **Aftermath**: right after the choice, Europe's human influence drops by 25 on each organ if `race`, 10 if `fight_china` (economy and state halved with `oversightMandate`), logged as hidden deltas.

**The odds shown during play (`planOdds`: trajectory, forecast, previews) leave out the one hidden term** (the shut-down bonus that reads true alignment) *(v2)*; the real draw in `runTippingPoint` includes it, and the debrief shows those real odds.

## The endings

| Situation | Good ending if | Otherwise |
| --- | --- | --- |
| No tipping point, concentration < 60: Plateau | `ransomware` not fired or prepared: A bright winter | Decentralised mayhem |
| No tipping point, concentration ≥ 60: Big AI | (`silicon_blackmail` prepared, held firm or not fired) and eu.economy ≥ 40: The agent economy | Silicon blackmail |
| `verified_slowdown` or `shut_down`: Diplomacy | verification ≥ **45**, concentration ≤ 70, trueAlignment ≥ **47** *(v2, were 50 and 35)*: Licensed utopia | Unstable pause |
| `fight_china`: Arms race | coalition ≥ 1 and tension ≤ 70: Multipolar world | Hot war |
| `race`: Take-off | trueAlignment ≥ 60: The cognitive revolution | Loss of control |

The ending text and its "why" line are built from the reasons that held in this game (phase 0, B4). **Epilogue:** overall human influence = average of the three eu scores; bands ≥ 60, 30–59, < 30.

**Léa:** Q1 by takeoffSpeed; Q6 by eu.economy ≥ 65; Q11 by `flexicurity`; end by overall human influence ≥ 50, plus one line per ending. Each letter is stored in `leaLetters` when delivered, exactly once.

## Engine implementation notes

- **Quarter numbering.** `createInitialState` starts at quarter 1; `endQuarter` advances the quarter; `startQuarter` runs the current one (and does nothing if it already ran). No income in Q1.
- **Order inside `startQuarter`:** snapshot `quarterStart`, clear notices, expire context cards → income, pending → actors → drift → odds (if they moved) → first eligible event (and its context card) → employment shocks → beats → dashboard → risks → threshold notices → news → internal notes → concerns → Léa. The situation report compares with `quarterStart`, so the player's own decision is not counted as a change.
- **Report causes:** `CAUSE_TEXT` (`src/data/causes.ts`) for entries touching several indicators, then the copy's `CAUSES` (by drift branch), then the entry title. A drift is routine when the same entry ran last quarter with the same wording; regular lab moves are routine too.
- **Events:** prepared is checked at fire time; visible and hidden effects apply at fire time; choice effects apply in `resolveEvent`. `endQuarter` and `playCard` refuse to run while an event is pending.
- **Tipping point:** `endQuarter` sets phase `tipping` and resets `decidedThisQuarter`; `playCard` then costs nothing (an ASML token is still used); `runTippingPoint` draws the plan, lab restraint and aftermath, and resolves the ending.
- **News:** each quarter shows 2–4 public lines. Story lines first (the event, story beats, layoff waves, within the maximum), then the world's reaction to last quarter's decision, US moves, milestones, then ambient lines, one per pool. Each template is used at most once per game.
- **Internal notes:** 0–2 per quarter from pools whose conditions read the hidden state. `readable` = `aiOffice` or quarter ≤ `revealUntil`.
- **Randomness:** mulberry32, state in `GameState.rng`; used for the takeoff speed, the starting true alignment, news, notes and concerns selection, the plan draw and lab restraint.
- **Content** lives in `src/data` (cards, events, news, notes, gauges, plans, endings, Léa, progress, causes, tuning); player-facing v2 words in `src/data/copy` (the engine falls back to its own words when a copy entry is missing). All numbers are in `src/data/tuning.ts`.

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

### v2 changes (simulation, 25 Oct; `npm run sim`, 2,000 games per strategy)

Starting values come from docs/V2_SPEC.md; the changes below were needed to hit its balance targets.

| Change | Old value | Now | Why |
| --- | --- | --- | --- |
| Starting currencies | 6 PC, 3 Budget | 4 PC, 5 Budget | Spec phase 3 |
| Income | no base PC, +1 Budget; +1 PC at pressure 50+ | +2 PC, +2 Budget; +1 PC at pressure 50+; −1 PC below approval 30; cap 8 | Spec phase 3: budget starvation, a planning horizon, no hoarding |
| Coalition upkeep | 1 PC per level per quarter, unpaid partners leave | none; levels cost 3 / 4 / 5 PC and lower tension by 4 | Spec phase 3 / team decision 3 |
| Concern bubbles | +1 PC each, max 2 per quarter | nothing (they explain) | Team decision 7 |
| Host verification | repeatable, 2 Budget + 1 PC | 3 levels: 2 Budget + 1 PC / 3 Budget / 3 Budget + 1 PC | Spec phase 3 (limits instead of repeats) |
| Fund alignment research | repeatable, 2 Budget, +6 | 3 uses, 2 / 3 / 4 Budget, +6 / +5 / +4 | Spec phase 3 |
| Measure human influence | repeatable (one audit at a time) | 2 uses | Spec phase 3 |
| Diplomatic talks | — | 2 PC + 1 Budget, tension −6, 3 uses, 2 quarters of rest, tension 35+ | Spec phase 3 (handoff 07) |
| Context cards | — | summit (2 PC, verification +10, +10 slowdown weight); joint attribution (1 PC, tension −5, averts the next US escalation); 2 quarters each | Spec phase 3 |
| US escalation after a stolen model | — | tension +5 two quarters later, unless averted | Gives joint attribution something to prevent: an unprepared theft already sets export controls, so the chip-control rule could never fire again |
| Employment shocks | — | capability 40 and 70: approval −5 (−2 with flexicurity), pressure +5 | Spec phase 3 |
| Starting true alignment | 50 | 45 / 55 / 65, equally likely | Spec phase 3 (replay variety) |
| Utopia: verification needed | 50 | 45 | With three levels, the most a player can build is 45 (with the AI Office): at 50 a fully prepared player only won the deal when a warning shot or a summit added 10 (prepared 67%, with 30% unstable pauses all caused by verification 45) |
| Utopia: true alignment needed | 35 | 47 | With verification at 45 the prepared player reached 97% good endings (target below 90%: winning should take thought). At 47 the hidden draw matters: a world that starts at 45 needs all three rounds of alignment research or a lab safety commitment. Prepared 91% → 72% |
| Shown plan odds | included the hidden shut-down term | public terms only; the real draw keeps it | A hidden value must never move what the player sees (trajectory bar, previews) |

**Simulation results v2** (passive / random / prepared): good endings 0.8% / 28.9% / 71.7% (targets < 20%, 15–35%, 60–90%); every ending reached by some strategy, the rarest at 3.1% (Decentralised mayhem); prepared card variety: no card above 20.8% of its plays (host verification); tension at the tipping point 26.6 with eager talks vs 37.8 without (fight China still 12.9%); a prepared player was never short of the card it wanted (0.0 per game); every game reaches act 3; tipping point in 76% of games, steady games at Q14–15, fast at Q10. Full output: `npm run sim`.

## Tech

- GitHub repo, Vite + TypeScript, no framework, Vitest for tests, deployed on GitHub Pages: `main` at `/takeoff-middle-power/`, every other branch at `/takeoff-middle-power/preview/<branch>/` (BASE_PATH set in `.github/workflows/deploy.yml`; deleting a branch removes its preview).
- `engine/` holds pure functions only (no DOM): the `EngineApi` in `src/engine/api.ts` (`createInitialState(seed)`, `startQuarter`, `collectBubble`, `resolveEvent(state, option?)`, `playCard(state, id, option?)`, `previewCard(state, id, option?)`, `pass`, `endQuarter`, `runTippingPoint`, `debrief`, views and labels), plus `resolveEnding(state)` and a seeded random generator (`rng.ts`). `previewCard` applies the card to a copy and returns the visible deltas only; odds after the card are computed with the hidden effects masked.
- `data/` is declarative: cards, events, actor rules, plans, endings, news, internal notes and Léa's scenes as typed objects with `effects`, `hiddenEffects`, `availableWhen`, `preparedWhen`, `actor`, `briefing`, `debrief` and `source`. Conditions are `{ key, op, value }` combined with `all` / `any`.
- `ui/`: the clock, map, gauges with "rises when / falls when" popovers, the two feeds, the situation report and the debrief all render from the state and the log.
- `scripts/sim.ts` runs 2,000 seeded games for each strategy of `scripts/strategies.ts` (passive, random, prepared, prepared with eager talks, prepared without talks; shared with the tests) and prints the ending distribution, card variety, money shortages, tension at the tipping point and a PASS/FAIL line per balance target of docs/V2_SPEC.md.
