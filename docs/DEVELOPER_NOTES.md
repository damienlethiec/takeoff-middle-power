# Developer notes (v3)

Exact rules and numbers of the v3 game, and every tuning change with its reason. Player-facing design: [V3_SPEC.md](V3_SPEC.md). Scenario sources: [SCENARIO_BASIS.md](SCENARIO_BASIS.md). Every number below lives in `src/data/tuning.ts`; this page explains them. The v1 and v2 notes are in the git history of this file.

## State

`GameState` (`src/engine/types.ts`). Visible: `aiPower`, `cooperation`, `confidence.estimate` and `confidence.margin`, `cohesion`, `europeAi` (`open` / `dependent`), `influence`, `coalition` (0–3), `inspections` (0–3), the hand, threats and their stages. Hidden until the end: `confidence.truth` and `pace`. Invariant, enforced after every change (`settleConfidence`): `|estimate − truth| ≤ margin`, margin in [3, 30]. When the margin narrows, the estimate is pulled toward the truth: that is how oversight reveals it.

Start: AI power 18, Cooperation 52, Confidence truth 52 / estimate 55 ± 15, Cohesion 66, Influence 6, Europe's AI Dependent.

## A round (six months)

`startRound` (see the flow at the top of `src/engine/api.ts`):

1. **Influence**: +2 base, +1 if Cohesion ≥ 60, −1 if Cohesion < 35, +1 with coalition level 2, minus card penalties due this round; at least 1; capped at 10.
2. **AI power** rises by `base × (1 + 0.07 × (AI power − 20) / 10) ± 1.2`, base 3.6 / 5.6 / 7.6 for a slow / steady / fast pace (drawn 40% / 33% / 27%). AI speeds up AI research, so the rise grows with AI power.
3. **Drift**: Cooperation −1 (−2 once AI power ≥ 60); Cohesion −1 once AI power ≥ 60, and −1 more while Cooperation is in the Rupture zone; true Confidence −1 once AI power ≥ 60; the labs' reports push the estimate +2.
4. **AI 2027 milestones** are reached strictly in the scenario's order (`src/data/milestones.ts`): by AI power threshold (28, 34, 42, 58, 62, 66, 70, 75, 80), or when their threat strikes (the weight theft, the superhuman coder via opaque reasoning). Some carry an effect: China wakes up (Cooperation −2), AI takes jobs (Cohesion −2), Agent-2 kept internal (margin +2), alignment declared (estimate +4), national security (margin +2), geopolitics (Cooperation −4).
5. **Threats** grow in three stages from public values only (stages never go back): theft by `AI power + 0.4 × (50 − Cooperation)` at 28 / 36 / 42; opaque reasoning by AI power at 45 / 50 / 55; AI incident by AI power at 52 / 57 / 62 (only after opaque reasoning has struck); ransomware by `0.5 × AI power + 25 if Europe's AI is Open` at 32 / 40 / 48; silicon blackmail appears with the oversight mandate while Dependent, then grows one stage a round. A threat strikes at the earliest the round after it became imminent.
6. **One event at most**: the next AI 2027 milestone's threat if ripe, else a job shock (first at AI power 40 after "AI takes jobs", second at 70 after "the cheap remote worker"), else the AI incident (chance per round `0.2 + 0.02 × (60 − true Confidence)`, between 8% and 85%: it shows as "possible"), else silicon blackmail, else ransomware.
7. **The tipping point**: AI power ≥ 80, from round 6, and only once every earlier AI 2027 milestone has been reached; otherwise AI power stops at 79. The round in which it is reached is the last round of decisions.
8. **Map content**: milestone headlines, then threat-stage headlines, then a world headline from the pool when there is room (two at most); one or two public voices; a leak every two or three rounds from round 2; Léa's letter at rounds 1, 4 and 8.

Then the player may read the report (at most three changes with a cause, routine drift left out, and the threats that moved), and play up to two cards (`playCard`), never the same card twice in a round. `endRound` ends the game at the tipping point or after round 12.

## Events (Breaking news)

| Event | Prepared by | Unprepared | Prepared |
| --- | --- | --- | --- |
| Model theft | Weight security standards | AI power +5, Cooperation −15 | Cooperation −3; with a coalition, *Joint attribution* opens |
| Opaque reasoning | AI Office capacity | Margin × 2 | Nothing |
| AI incident | Coalition level 1 and inspections level 2 | Estimate −10, Cohesion −5 | Cooperation +10; *Emergency inspection summit* opens |
| Ransomware wave | Cyber shield | Cohesion −15 | Cohesion −3 |
| Silicon blackmail | Europe's AI Open | Give in (Europe's AI locked Dependent, open models gone) or hold firm (Cohesion −10) | Nothing |
| Job shock 1 and 2 | Flexicurity reform | Cohesion −5 | Cohesion −1 |

## Cards

| Card | Cost | Effect | Uses | Arrives |
| --- | --- | --- | --- | --- |
| Diplomatic talks | 1 | Cooperation +8, Cohesion −2; rests the next round | 3 | Round 1 |
| Offer to host inspections → Inspection accord → Joint inspectorate | 2 / 2 / 3 | Estimate +8, truth +6, margin −4 (−6 with the AI Office), Cooperation −4 | 3 levels | Round 1 |
| AI Office capacity | 2 | Margin × 0.5, Cohesion −1; protects against opaque reasoning; leaks +2 oversight | 1 | Round 1 |
| Fund alignment research | 2 | Truth +6, estimate +2, Cohesion −1 | 3 | Round 2 |
| Middle-power coalition | 2 / 2 / 3 | Cooperation +6, Cohesion −1; level 2: Influence +1 a round | 3 levels | Round 3 |
| Independent audit | 1 | Estimate set to the truth; the true value shown for 2 rounds | 2 | Round 4 |
| Use the ASML lever | 2 | Safety: estimate +10, truth +8; or access: Cohesion +8. Cooperation −12 | 2 | AI power 35 |
| Weight security standards | 1 | Protects against theft; Europe's AI → Dependent; Cohesion −2 | 1 | Theft threat seen |
| Fund open models | 2 | Europe's AI → Open, Cohesion +6, estimate and truth −6; ransomware pressure +25 | 1 | First job shock |
| Flexicurity reform | 3 | Cohesion +10; softens job shocks; Influence −1 for 2 rounds | 1 | First job shock |
| Cyber shield for hospitals and grids | 2 | Protects against ransomware; Cohesion +3; Influence −1 for 2 rounds | 1 | Ransomware threat seen |
| Human oversight mandate | 2 | Cohesion +6, AI power −2; silicon blackmail threat if Dependent | 1 | Round 6 |
| *Emergency inspection summit* | 1 | Cooperation +10, estimate and truth +5 | 2 rounds | Prepared AI incident |
| *Joint attribution with allies* | 1 | Cooperation +5 | 2 rounds | Theft, with a coalition |

**Oversight** (to read leaks): AI Office 2, each inspection level 1, an audit 1. Leak levels in order: 1, 1, 2, 2, 3, 3. A leak's text says whether the labs are overconfident (estimate − truth ≥ 6) or not.

## Previews, the heading line and the advisor

- `preview(s, picks)` plays the cards on a copy whose truth is replaced by the estimate, so a preview never depends on the hidden value (tested). After a real play, the estimate may differ from the preview when a narrower margin pulls it toward the truth: that is information the player earned.
- `heading(s)`: at the tipping point or while AI power can still reach it, the world is the current Cooperation zone; from round 4, when `AI power + last rise × rounds left × 1.15 < 80`, it is the plateau world given by Europe's AI badge (public values only). Goal and floor per world:

| World | Decides | Safety net |
| --- | --- | --- |
| Pause (Cooperation 60+) | Confidence 65 | Cohesion 45 |
| Race (30–59) | Confidence 75 | Cohesion 55 |
| Rupture (< 30) | Cohesion 82 | Confidence 65 |
| Plateau, open models | Cohesion 60 | Confidence 40 |
| Plateau, big labs | Cohesion 60 | Confidence 40 |

  "Met" in the heading uses the whole band for Confidence: yes if estimate − margin ≥ target, no if estimate + margin < target, else uncertain.
- `advisor(s)`: weighs each gauge by how far it is from what the heading's world needs (the low end of the Confidence band), scores each playable card through the public preview plus what the card text says (protection against a visible threat, hidden safety gain, Influence lost later), and recommends the best value per Influence. Its words carry no numbers (tested).

## The end

At the tipping point, the final Cooperation is drawn within ±2 of the current value (suspense near the borders), and its zone picks the world; without a tipping point, Europe's AI badge does. The ending is good when the deciding gauge reaches its target and the safety net its floor, **using the true Confidence**. `ending(s)` builds the one-sentence explanation, the four gauges with target and floor, the reveal (truth vs estimate, pace, unread leaks), up to two "what would have changed it" lines (a calmer zone, the shortfall, an unprepared threat), the decisions with their chips, and the threats.

## Tuning changes from the V3 spec's first draft

Simulation: `npm run sim`, 2,000 seeded games per strategy (`scripts/strategies.ts`). Strategies read only what the UI shows.

| Change | Spec draft / first value | Now | Why |
| --- | --- | --- | --- |
| Card costs | Talks 2, inspections 3, AI Office 3, alignment 3, coalition 3/4/5, audit 2, weight security 2, open models 3, flexicurity 4, cyber shield 3, oversight 3, summit 2 | 1, 2/2/3, 2, 2, 2/2/3, 1, 1, 2, 3, 2, 2, 1 | With +2 to +4 Influence a round, a thoughtful player could play about 7 cards a game: one card a round, never two, and one or two gauges always starved (0% good endings in tipping worlds). Now about 14 cards a game, and no card above 20% of the plays. |
| Starting Influence | (not in the spec; first value 3) | 6 | Same reason; it also makes round 1's two-card tip true in practice. |
| Cohesion cost of cards | Talks −3, AI Office −2, alignment −2, coalition −2 | −2, −1, −1, −1 | Cohesion collapsed in every strategy (end values 5–35). |
| Cohesion drift | (first value −2 a round, −3 past AI power 50) | 0, −1 past AI power 60, −1 more in the Rupture zone | Same; the Rupture erosion is new (see below). |
| Rupture erodes Cohesion | (none) | −1 a round while Cooperation < 30 | Without it, ignoring diplomacy and only building Cohesion ("home-first") won 89% (a dominant strategy). CFG's Arms race hits Europe too (sanctions on its chip-equipment firms). |
| Cooperation drift | (first value −3 a round) | −1, −2 past AI power 60 | The Pause was out of reach for a thoughtful player (0–5%). |
| Job shocks | −8, or −3 with flexicurity | −5, or −1 | Two shocks took most of the Cohesion slack of the Race floor. |
| Rupture target | Cohesion 85, Confidence 65 | Cohesion 82, Confidence 65 | At 85 the *Multipolar world* was never reached (< 2% for any strategy); at 80 home-first won 67%. |
| Start values | (first values Cohesion 62 / 64, truth 50) | Cohesion 66, truth 52 | Random good endings were 12–15%, below the 15–30% target. |
| Pace weights | (first value 30% / 40% / 30%) | 40% / 33% / 27% | Same reason: plateau worlds are the calmest (CFG: a plausible scenario). |
| Random strategy | 0–2 cards a round | 1–2 cards a round | A naive human clicks a card most rounds; with 0 the "random" player left half its Influence unspent. |

## Final simulation (2,000 games per strategy)

| Strategy | Good endings | Notes |
| --- | --- | --- |
| Passive | 0.0% | Silicon blackmail 39%, Hot war 61% |
| Random | 23.0% | 14.8 cards a game |
| Thoughtful | 78.4% | Plateau 100%, tipping worlds 64%; 14.1 cards a game, top card talks 18.7% |
| Cooperation-only | 0.0% | Unstable pause 60%: Cooperation without Confidence fails |
| Home-first (no diplomacy) | 62.3% | Bright winter 40%, Multipolar world 22%, Hot war 38% |
| Advised (one card a round, the chief of staff's) | 42.8% | |

Every ending ≥ 2% for some strategy (lowest: *The cognitive revolution* 3.6%, thoughtful). Earliest tipping point: round 6.

## Tech

TypeScript, Vite, no framework. The engine is pure (`structuredClone` on every write). The UI renders string templates; every string reaching `innerHTML` goes through `esc()`; links are http(s) only with `rel="noopener noreferrer"`. Tests: Vitest (`tests/`), Playwright end-to-end (`e2e/`), a keyboard-only axe harness (`scripts/a11y/`), screenshots (`scripts/shots.mjs`).
