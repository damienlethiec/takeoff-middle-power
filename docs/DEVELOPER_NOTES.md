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
| `pc`, `budget` | Political Capital, Budget | Yes | 4 PC, 3 Budget |

Other state: `quarter` (1–16, shown as Q1 2027 to Q4 2030), `revealUntil`, `asmlTokens` (2), `pending` (effects due next quarter), flags `aiOffice`, `openModels`, `oversightMandate`, `flexicurity`, `weightSecurity`, `firedEvents`, `warningShotPrepared`, `internalNotes`; after the end: `plan`, `planOdds`, `labRestraint`, `ending`.

**Decision log.** Every card, actor action and event appends `{ quarter, id, actor, visibleDeltas, hiddenDeltas, briefing }`. The situation report and the final debrief are generated from it.

## Quarter loop

1. **Income:** PC +1, +1 if publicPressure ≥ 50, −1 if coalition ≥ 1 (upkeep). Budget +1. Apply `pending`.
2. **Clock runs** (about 10 s). Spawn 1–3 concern bubbles; each click gives PC +1 (max +2 per quarter). Ticker lines and internal notes arrive.
3. **Actors:** labs report progress (apparentAlignment +1) and consolidate (concentration +2). The US tightens chip controls once when tension ≥ 60 (tension +3, news line).
4. **Drift:**
   - capability +2 / +4 / +6 for slow / steady / fast, +1 if tension ≥ 60
   - trueAlignment −1 (−2 if tension ≥ 60); tension +1
   - eu.economy −2, eu.culture −1, eu.state −1 (economy and state halved with `oversightMandate`)
   - misuse +2 once capability ≥ 40
   - gdp +1 (+1 more if capability ≥ 50); approval −1 once capability ≥ 50 unless `flexicurity`
   - publicPressure +1 once capability ≥ 50
5. **Events:** check in list order; at most one per quarter, each once. The clock stops on the event screen.
6. **Situation report:** deltas since last quarter with their causes (from the log), plan odds on current course, new notes.
7. **Decision:** one card or pass. The preview shows visible deltas, costs and dependencies before confirming; the briefing after.
8. **End check:** capability ≥ 80 → tipping point. After Q16 → slow-world ending. Léa at Q1, Q6, Q11 and the end.

**Expected pace:** steady takeoff reaches 80 around Q15, fast around Q10; slow never does.

## The policy deck

| id | Cost | Available when | Visible effects | Hidden effects | Limit |
| --- | --- | --- | --- | --- | --- |
| `coalition` | 2 PC + 1 PC/quarter upkeep | tension < 70 | coalition +1 | — | Up to level 3 |
| `host_verification` | 2 Budget | Always | verification +15 if `aiOffice`, else +7; tension +5 | — | Repeatable |
| `asml` | Free (token) | capability ≥ 30 | tension +15; choose: model access (gdp +5) or lab safety commitment | Safety commitment: trueAlignment +5 | 2 tokens |
| `ai_office` | 2 Budget | Always | Error bars narrow; internal notes readable | — | Once |
| `measure` | 1 Budget + 1 PC | Always | Shows eu scores for 3 quarters; internal notes readable meanwhile | — | Repeatable |
| `open_models` | 2 Budget | Always | concentration −15; misuse +10 | eu.economy +5 | Once |
| `oversight_mandate` | 2 PC | Always | gdp −5 | Halves economy and state drift; enables silicon blackmail | Once |
| `flexicurity` | 2 PC | capability ≥ 30 | No approval drift | Léa's retrained variant; PC −1 next quarter | Once |
| `weight_security` | 1 PC | `weight_theft` not fired | concentration +5 | Prepared weight theft | Once |
| `fund_alignment` | 2 Budget | Always | — | trueAlignment +6 | Repeatable |

## The events

| id | Actor | Trigger | Prepared if | Prepared effects | Unprepared effects |
| --- | --- | --- | --- | --- | --- |
| `warning_shot` | The AI systems | trueAlignment < 50 and capability ≥ 65 | coalition ≥ 1 and verification ≥ 30 | publicPressure +15; tension −10; verification +10; `warningShotPrepared` on | publicPressure +5 |
| `weight_theft` | China | tension ≥ 50 and capability ≥ 40 | `weightSecurity` | tension +5 | capability +5; tension +20; trueAlignment −3 |
| `opaque_reasoning` | AI systems and labs | capability ≥ 70 | `aiOffice` | Error bar unchanged | Alignment error bar doubles |
| `silicon_blackmail` | US frontier labs | concentration ≥ 60 and `oversightMandate` | `openModels` | None: stand firm | Choice: give in (concentration +10) or hold firm (gdp −15) |
| `ransomware` | Open-source collective | misuse ≥ 40 | Open point for Louis: proposed misuse < 60 at trigger time | gdp −3 | gdp −10, approval −10; choice: emergency ban (misuse −20, concentration +10) or defence spending (Budget −2, misuse −10) |

## The tipping point

1. One free last decision.
2. Plan weights (minimum 1), then a seeded weighted draw; store the odds for the debrief.
   - `verified_slowdown`: 5 + 0.6 × verification + 0.3 × publicPressure + 10 × coalition + 15 if `warningShotPrepared` − 0.2 × tension
   - `shut_down`: 2, + 0.3 × publicPressure if publicPressure ≥ 70, + 10 if the warning shot fired and trueAlignment < 40
   - `fight_china`: 10 + 0.5 × tension
   - `race`: max(5, 25 − 0.2 × publicPressure − 0.1 × verification)
3. If `race`: lab restraint with probability 20% + publicPressure ÷ 4 %; if yes, trueAlignment +8.

## The endings

| Situation | Good ending if | Otherwise |
| --- | --- | --- |
| No tipping point, concentration < 60: Plateau | `ransomware` not fired or prepared: A bright winter | Decentralised mayhem |
| No tipping point, concentration ≥ 60: Big AI | (`silicon_blackmail` prepared, held firm or not fired) and eu.economy ≥ 40: The agent economy | Silicon blackmail |
| `verified_slowdown` or `shut_down`: Diplomacy | verification ≥ 50, concentration ≤ 70, trueAlignment ≥ 35: Licensed utopia | Unstable pause |
| `fight_china`: Arms race | coalition ≥ 1 and tension ≤ 70: Multipolar world | Hot war |
| `race`: Take-off | trueAlignment ≥ 60: The cognitive revolution | Loss of control |

**Epilogue:** overall human influence = average of the three eu scores; bands ≥ 60, 30–59, < 30.

**Léa:** Q1 by takeoffSpeed; Q6 by eu.economy ≥ 60; Q11 by `flexicurity`; end by overall human influence ≥ 50, plus one line per ending.

## Tech

- GitHub repo, Vite + TypeScript, no framework, Vitest for tests, deployed on GitHub Pages (base `/takeoff/`).
- `engine/` holds pure functions only (no DOM): `createInitialState(seed)`, `startQuarter(state)`, `playCard(state, id, option?)`, `previewCard(state, id)`, `resolveEventChoice(state, eventId, option)`, `endQuarter(state)`, `choosePlan(state, rng)`, `resolveEnding(state)`, plus a seeded random generator. `previewCard` runs `playCard` on a copy and returns the visible deltas only.
- `data/` is declarative: cards, events, actor rules, plans, endings, news, internal notes and Léa's scenes as typed objects with `effects`, `hiddenEffects`, `availableWhen`, `preparedWhen`, `actor`, `briefing`, `debrief` and `source`. Conditions are `{ key, op, value }` combined with `all` / `any`.
- `ui/`: the clock, map, gauges with "rises when / falls when" popovers, the two feeds, the situation report and the debrief all render from the state and the log.
- `sim.ts` runs 2,000 seeded games each for a passive, a random and a prepared player and prints the ending distribution, to check the success criteria.
