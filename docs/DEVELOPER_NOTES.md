# Developer notes (v3)

Exact rules and numbers of the v3 game, and every tuning change with its reason. Player-facing design: [V3_SPEC.md](V3_SPEC.md). Scenario sources: [SCENARIO_BASIS.md](SCENARIO_BASIS.md). Every number below lives in `src/data/tuning.ts`; this page explains them. The v1 and v2 notes are in the git history of this file.

## State

`GameState` (`src/engine/types.ts`). Visible: `aiPower`, `cooperation`, `confidence.estimate` and `confidence.margin`, `cohesion`, `europeAi` (`open` / `dependent`), `influence`, `coalition` (0–3), `inspections` (0–3), the hand, threats and their stages. Hidden until the end: `confidence.truth` and `pace`. Invariant, enforced after every change (`settleConfidence`): `|estimate − truth| ≤ margin`, margin in [3, 30]. When the margin narrows, the estimate is pulled toward the truth: that is how oversight reveals it.

Start: AI power 18, Cooperation 52, Confidence truth 52 / estimate 55 ± 15, Cohesion 66, Influence 6, Europe's AI Dependent.

## A round (six months)

`startRound` (see the flow at the top of `src/engine/api.ts`):

1. **Influence**: +2 base, +1 if Cohesion ≥ 60, −1 if Cohesion < 35, +1 with coalition level 2, minus card penalties due this round; at least 1; capped at 10.
2. **AI power** rises by `base × (1 + 0.07 × (AI power − 20) / 10) ± 1.2`, base 3.6 / 5.6 / 7.6 for a slow / steady / fast pace (drawn 40% / 33% / 27%). AI speeds up AI research, so the rise grows with AI power.
3. **Drift**: Cooperation −1 (−2 once AI power ≥ 60); Cohesion −1 once AI power ≥ 60, and −1 more while Cooperation is in the Rupture zone; true Confidence −1 once AI power ≥ 60; the labs' reports push the estimate +2. (Current values in `tuning.ts` and in "Tuning changes for v4" below.)
   **AI weighs on jobs (v4, `jobDrift`)**: Cohesion also loses `round(min(2, (AI power − 35) / 25) × factor)` a round (0 below 47 or so, 1 from about 48, 2 from about 73); the factor is 1, −0.5 once flexicurity is played, −0.25 per answer that protects workers (Léa's "Speed it up", the union's "Tax the agents" and "Guarantee it"; `WORKER_ANSWERS` in `src/data/social.ts`), at least 0.25. Recorded as "AI takes over more work".
   **Social events (v4, `social`)**: one a round, a second with chance `min(0.75, 0.3 + 0.25 × unrest)`, where `unrest = max(0, (60 − Cohesion) / 20) + max(0, (AI power − 40) / 30)` (public values only). Drawn among the 25 events of `src/data/social.ts` whose condition holds (some need AI to take jobs, the Rupture zone or Europe's AI Open), never twice a game; weights `1 + 0.5 × unrest` for bad news, `1.6 + 0.5 × protections` for good news. Sizes: small 2, medium 3, large 4 (Cohesion, sometimes Cooperation, or "verified" for AI safety, which narrows the uncertainty like oversight). A job event's hit is softened by 1 per protection, never below 1. They draw from their own seeded stream (seed and round), so the main generator's draws are unchanged; the first comes early in the six months, a second later.
4. **AI 2027 milestones** are reached strictly in the scenario's order (`src/data/milestones.ts`): by AI power threshold (28, 34, 42, 58, 62, 66, 70, 75, 80), or when their threat strikes (the weight theft, the superhuman coder via opaque reasoning). Some carry an effect: China wakes up (Cooperation −2), AI takes jobs (Cohesion −2), Agent-2 kept internal (margin +2), alignment declared (estimate +4), national security (margin +2), geopolitics (Cooperation −4).
5. **Threats** grow in three stages from public values only (stages never go back): theft by `AI power + 0.4 × (50 − Cooperation)` at 28 / 36 / 42; opaque reasoning by AI power at 45 / 50 / 55; AI incident by AI power at 52 / 57 / 62 (only after opaque reasoning has struck); ransomware by `0.5 × AI power + 25 if Europe's AI is Open` at 32 / 40 / 48; silicon blackmail appears with the oversight mandate while Dependent, then grows one stage a round. A threat strikes at the earliest the round after it became imminent.
6. **One event at most**: the next AI 2027 milestone's threat if ripe, else a job shock (first at AI power 40 after "AI takes jobs", second at 70 after "the cheap remote worker"), else the AI incident (chance per round `0.2 + 0.02 × (60 − true Confidence)`, between 8% and 85%: it shows as "possible"), else silicon blackmail, else ransomware.
7. **The tipping point**: AI power ≥ 80, from round 6, and only once every earlier AI 2027 milestone has been reached; otherwise AI power stops at 79. The round in which it is reached is the last round of decisions.
8. **Map content**: milestone headlines, then threat-stage headlines, then a world headline from the pool when there is room (two at most); one or two public voices; a leak every two or three rounds from round 2; a friend's letter on the schedule of `letters.schedule` (rounds 1 Léa, 2 Malik, 3 your mother, 5 Léa, 6 Malik, 7 your mother, 9 Léa). Letters move no gauge and draw their variant from their own seeded stream (seed and round); the main generator still makes one unused draw at rounds 1, 4 and 8 (`letters.legacyDraws`, where Léa's letters drew before 26 Oct) so seeded games are unchanged. Each pool is picked from public values only (see `src/data/letters.ts`).

Then the player may read the report (at most three changes with a cause, routine drift left out, and the threats that moved), and play up to two cards (`playCard`), never the same card twice in a round. `endRound` ends the game at the tipping point or after the last round (`TUNING.rounds`: 10 since 26 Oct, was 12).

## Events (Breaking news)

| Event | Prepared by | Unprepared | Prepared |
| --- | --- | --- | --- |
| Model theft | Weight security standards | AI power +5, Cooperation −15 | Cooperation −3; with a coalition, *Joint attribution* opens |
| Opaque reasoning | AI Office capacity | Margin × 2 | Nothing |
| AI incident | Coalition level 1 and inspections level 2 | Estimate −10, Cohesion −5 | Cooperation +10; *Emergency inspection summit* opens |
| Ransomware wave | Cyber shield | Cohesion −15 | Cohesion −3 |
| Silicon blackmail | Europe's AI Open | Give in (Europe's AI locked Dependent, open models gone) or hold firm (Cohesion −10) | Nothing |
| Job shock 1 and 2 | Flexicurity reform | Cohesion −5 | Cohesion −1 |

The job shocks also show in the feed and on the map as a social item with the jobs icon (Rotterdam, then Warsaw; `JOB_SHOCK_PLACE` in `src/data/social.ts`); their effect is the event's, applied once.

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

## Requests: which side means yes

One convention for every request (26 Oct): **right goes along with the request, left refuses it or puts it off**. Each answer declares it (`stance: 'accept'` on `right`, `stance: 'refuse'` on `left`) and `tests/requests.test.ts` fails otherwise. When the request offers two courses ("Expose them publicly, or deal with it quietly?"), the one the character asks for first, or plainly wants, is the accepting one. Adopting it swapped the sides of 21 cards (each answer kept its effects and label) and reworded Léa's AI-friend question so that "yes" means the age limit she wants. Effects did not change, but the strategies that pick a side blindly did: quick sim (100 games a strategy) passive (always left, now always refusing) 0% → 0% good, random 22% → 16%, saver 60% → 59%; thoughtful, cooperation-only, home-first and advised unchanged; every target still passes.

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

## Tuning changes for v4

v4 changed three rules (requests, no cap on cards a round, AI safety uncertainty only downward); these are the numbers retuned after them. Simulation as above, plus a `saver` strategy (keeps its Influence for a burst, then plays like the thoughtful player) and two new checks: 6–10 requests a game, and the thoughtful player's AI safety uncertainty at the end (median ≤ 30).

| Change | Old | New | Why | Result |
| --- | --- | --- | --- | --- |
| Uncertainty cap (`confidence.maxMargin`) | 100 (stopgap; 30 in v3) | 40 | With no real cap the band grew all game (thoughtful ±31 median, ±73 at p90; passive ±74): "could be as low as" fell toward 0 and said nothing. | Thoughtful ±24 median; the cap binds mostly for players who build no oversight (passive, cooperation-only). |
| Labs' reports (`drift.labReports`) | +2 a round (reported value and uncertainty) | +1 | At +2 the reports alone widened the band by 24 over a game, more than any oversight card could narrow. | Together with the two rows around it: thoughtful 75.3% (was 78.1%). |
| Opaque reasoning, unprepared (`threats.opaque.marginFactor`) | × 2 | × 1.5 | Doubling a band that only goes downward made it absurd (±30 → ±60) late in the game. | |
| Forced requests (`requests.minRate`) | 0.6 | 0.9 | Short games (tipping point in round 6 or 7) got only 5 requests in 2–3% of games. | 6–10 in all but 2 of 14,000 games (5, a tipping point in round 6 with no request in round 1). |
| Strategies and the advisor read AI safety by its verified part | The "margin" line (now the verified part, before → after) was subtracted, and request chips were read by the word "certain" | A rise of the verified part counts as a gain (and the claim line is then ignored); request chips are read by their numbers "(a → b)" | A bug since the uncertainty went downward-only: inspections (verified +12) scored as a loss, and "less certain" chips could hide a verified gain. Chip and preview wording now follow the verified part: "AI safety: more verified (41 → 56)". | Quick sim (n=200 a strategy, all other rows unchanged): thoughtful 75.3% → 85.7%, home-first 83.8% → 82.3%. |
| Rupture erodes Cohesion (`drift.cohesionRupture`) | −1 a round | −3 | Home-first (no diplomacy) beat the thoughtful player: requests add Cohesion, so the Multipolar world's 82 was easy. CFG's arms race hits Europe hard (sanctions, energy, cyberattacks). | Quick sim (n=200) with the two rows below: home-first 60.0%, thoughtful 76.5% (target −15 pts met). Multipolar world still reached (home-first ~17%). |
| True AI safety lost a round past AI capabilities 60 (`drift.truth`) | −1 | −2 | AI 2027: alignment gets harder as capabilities grow (Agent-3, Agent-4). Brings the thoughtful player back under 80% and weighs on players who neglect oversight. The verified part drops with it (the uncertainty widens by as much). | See above. |
| Pause world's AI safety target (`worlds.pause.target`) | 65 | 68 | After the advisor fix the Pause was the easy road (*Licensed utopia* 42% of a thoughtful player's games). | See above. Random 25.0%, passive 0.0%, cooperation-only 0.5%, advised 48.0%; saver 73.5% (not yet −10 pts below thoughtful: next pass). |
| AI weighs on jobs (`jobDrift`, new) | none (Cohesion only −1 a round past AI power 60, and the two job shocks) | `from 35, per 25, max 2`; flexicurity −0.5, each worker answer −0.25, factor ≥ 0.25 | Owner: Social cohesion barely moved; AI 2027's agents take office work bit by bit, not only in two shocks. First values (30 / 15 / 3 cost random 11 points of good endings). | Per game (n=300): passive −6.2, random −4.1, thoughtful −3.1 Cohesion. |
| Social events (`social`, new) | none | 1 a round, second at `0.3 + 0.25 × unrest` (≤ 0.75); bad news weight `1 + 0.5 × unrest`, good news `1.6 + 0.5 × protections`; sizes 2 / 3 / 4; job events softened 1 per protection | Owner: the world should feel alive, with small, frequent, varied events. First values (weights 1 / 1, sizes 2 / 3 / 5) made passive lose 11 Cohesion to events alone; good news had to weigh more since bad news is larger. | ~13.4 events a game (half good); net Cohesion per game passive −6.6, random −1.8, thoughtful −0.1. Quick sim (n=400, with `jobDrift`): random 20.8%, thoughtful 72.5%, all targets but the saver's (then new) passed. |
| Saver target in the sim | Saver no better than thoughtful | Saver at least 10 points below thoughtful | Owner's decision: with no cap on cards a round, acting early must matter (threat windows, compounding effects, the Influence cap). | |
| Threat windows: theft (`threats.theft.stages`), opaque reasoning (`threats.opaque.stages`), ransomware (`threats.ransomware.stages`) | 28 / 36 / 42; 45 / 50 / 55; 32 / 40 / 48 | 28 / 33 / 38; 45 / 48 / 51; 32 / 37 / 42 | After the Social cohesion mechanics (008c176) the saver was 70.5% vs thoughtful 73.0%: holding Influence for a burst cost almost nothing. Shorter windows between "seen" and "imminent" reward preparing early; the first stage (when the threat appears) is unchanged. A lower Influence cap (7 or 8) was tried: it hurt the thoughtful player as much as the saver. | Quick sim (n=200 a strategy): passive 0.0%, random 21.0%, thoughtful 77.0%, cooperation-only 0.0%, home-first 56.0%, advised 46.0%, saver 63.5%; every target passes (every ending ≥ 2%: lowest *The race pays off* 3.0%, thoughtful). |
| Friends' requests (new, 26 Oct): your mother (`mum_triage_pilot`, `mum_near_miss`) and Malik (`mk_visa`, `mk_paris_office`) | 46 requests from 11 characters | 50 from 13 | The three friends back home replace Léa as the game's human heart; each gets personal requests. Effects sized like Léa's (2–3 points, a later cost on the tempting side). | Quick sim (100 games a strategy), before → after: random 16% → 15%, thoughtful 74% → 73%, passive, cooperation-only, home-first, advised and saver unchanged (0, 0, 57, 43, 59%); every target passes. |
| Rounds (`rounds`), user decision of 26 Oct | 12 (H1 2027–H2 2032) | 10 (H1 2027–H2 2031) | A shorter game (five years). Only what the round count and the end year require changed: copy, the progress bar, the ending's year (now the year the game ended, "The world in 2030"), tests. **No other number was retuned: rebalancing to follow.** The requests test's "rounds without a request" floor was relaxed from 10% to 8% (9.7% now) until then. | Sim before rebalancing below. |

### Ten rounds, before rebalancing (26 Oct, `npm run sim`, 100 games a strategy)

Only `rounds` changed (12 → 10); every other number as in the table above. Before → after (before: the friends' requests row above): passive 0% → 0%, random 15% → 20%, thoughtful 73% → 68%, cooperation-only 0% → 8%, home-first 57% → 59%, advised 43% → 43%, saver 59% → 60%.

| Target | Result |
| --- | --- |
| passive good endings < 15% | PASS 0.0% |
| random good endings 15–30% | PASS 20.0% |
| thoughtful good endings 55–80% | PASS 68.0% |
| every ending ≥ 2% for some strategy | PASS (lowest *The race pays off* 2.0%) |
| cooperation-only clearly worse than thoughtful (−20 pts) | PASS 8.0% vs 68.0% |
| home-first clearly worse than thoughtful (−15 pts) | **FAIL** 59.0% vs 68.0% |
| thoughtful: no card above 20% of its plays | PASS talks 17.3% |
| saver clearly worse than thoughtful (−10 pts) | **FAIL** 60.0% vs 68.0% |
| 6–10 requests a game | PASS 100% |
| thoughtful: AI safety uncertainty at the end ≤ 30 (median) | PASS ±22 |
| tipping point never before round 6 | PASS earliest round 6 |

What moved: a slow pace never reaches the tipping point in ten rounds (AI capabilities end around 56–64), and its plateau worlds are easy (advised and saver win 100% of their slow games); a steady pace now tips around round 9.5, a fast one around 7.2, so tipping worlds come late and leave less time to prepare (advised wins 3% of steady games, 0% of fast ones). Slow games stop at AI 2027's *alignment inconclusive* or *national security* milestone (the order holds; the later ones are simply not reached).

### Rebalancing backlog (owner's decision, 26 Oct: rebalance at the end, not now)

Ideas kept for the final pass, in this order, each checked with `npm run sim` at 100 games:

1. **Speed AI capabilities up a little** so a steady pace tips around rounds 7–8 (today ~9.5) and a slow pace gets close to the tipping point by the end; keep "never before round 6".
2. **Make plateau worlds harder** (slow-pace games that end by timeout in H2 2031): today advised and saver win all of them.
3. Then check that **home-first** (−15 pts) and **saver** (−10 pts) fall clearly below thoughtful again, and that every ending stays ≥ 2% (*The race pays off* is at the edge).
4. Restore the requests test's "rounds without a request" floor from 8% to 10%.
5. Watch random (15–30%): it sat at the floor (15%) before the switch to ten rounds.
6. Run the a11y harness (`npm run a11y`) once at the end: its seeded games (3, 4, 9) now play different draws.

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
