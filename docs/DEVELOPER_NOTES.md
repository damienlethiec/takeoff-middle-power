# Developer notes (v3)

Exact rules and numbers of the v3 game, and every tuning change with its reason. Player-facing design: [V3_SPEC.md](V3_SPEC.md). Scenario sources: [SCENARIO_BASIS.md](SCENARIO_BASIS.md). Every number below lives in `src/data/tuning.ts`; this page explains them. The v1 and v2 notes are in the git history of this file.

## State

`GameState` (`src/engine/types.ts`). Visible: `aiPower`, `cooperation`, `confidence.estimate` and `confidence.margin`, `cohesion`, `europeAi` (`open` / `dependent`), `influence`, `coalition` (0–3), `inspections` (0–3), the hand, threats and their stages. Hidden until the end: `confidence.truth` and `pace`. Invariant, enforced after every change (`settleConfidence`): `|estimate − truth| ≤ margin`, margin in [3, 30]. When the margin narrows, the estimate is pulled toward the truth: that is how oversight reveals it.

Start: AI power 18, Cooperation 52, Confidence truth 52 / estimate 55 ± 15, Cohesion 66, Influence 6, Europe's AI Dependent.

## A round (six months)

`startRound` (see the flow at the top of `src/engine/api.ts`):

1. **Influence**: +2 base, +1 if Cohesion ≥ 60, −1 if Cohesion < 35, +1 with coalition level 2, minus card penalties due this round; at least 1; capped at 10.
2. **AI power** rises by `base × (1 + 0.15 × (AI power − 20) / 10) ± 1.2`, base 4.0 / 5.8 / 7.2 for a slow / steady / fast pace (drawn 40% / 33% / 27%). AI speeds up AI research, so the rise grows with AI power (0.07, 3.6 / 5.6 / 7.6 until the rebalancing of 26 Oct). A steady pace tips around round 8, a fast one at 6–7, a slow one in about one game in ten (round 10); about 63% of all games tip.
3. **Drift**: Cooperation 0, −1 once AI power ≥ 60 (a slow grind: big moves come from crises and events); Cohesion −3 while Cooperation is in the Rupture zone (AI's weight on jobs is `jobDrift` below); true AI safety −1 once AI power ≥ 60 (the verified part drops with it); the labs' reports push the claim +1. (Current values in `tuning.ts` and in "Tuning changes for v4" below.)
   **AI weighs on jobs (v4, `jobDrift`)**: Cohesion also loses `round(min(2, (AI power − 35) / 25) × factor)` a round (0 below 47 or so, 1 from about 48, 2 from about 73); the factor is 1, −0.5 once flexicurity is played, −0.25 per answer that protects workers (Léa's "Speed it up", the union's "Tax the agents" and "Guarantee it"; `WORKER_ANSWERS` in `src/data/social.ts`), at least 0.25. Recorded as "AI takes over more work".
   **Social events (v4, `social`)**: one a round, a second with chance `min(0.75, 0.3 + 0.25 × unrest)`, where `unrest = max(0, (60 − Cohesion) / 20) + max(0, (AI power − 40) / 30)` (public values only). Drawn among the 25 events of `src/data/social.ts` whose condition holds (some need AI to take jobs, the Rupture zone or Europe's AI Open), never twice a game; weights `1 + 0.5 × unrest` for bad news, `1.6 + 0.5 × protections` for good news. Sizes: small 2, medium 3, large 4 (Cohesion, sometimes Cooperation, or "verified" for AI safety, which narrows the uncertainty like oversight). A job event's hit is softened by 1 per protection, never below 1. They draw from their own seeded stream (seed and round), so the main generator's draws are unchanged; the first comes early in the six months, a second later.
4. **AI 2027 milestones** are reached strictly in the scenario's order (`src/data/milestones.ts`): by AI power threshold (28, 34, 42, 58, 62, 66, 70, 75, 80), or when their threat strikes (the weight theft, the superhuman coder via opaque reasoning). Some carry an effect: China wakes up (Cooperation −2), AI takes jobs (Cohesion −2), Agent-2 kept internal (margin +2), alignment declared (estimate +4), national security (margin +2), geopolitics (Cooperation −4, and the Five Eyes headline: Washington shares its AI with London and Ottawa; a coalition at level 1 wavers, Influence −2 at once, `fiveEyes`). A theft cut short by weight security shows its milestone as "cut short".
5. **Threats** grow in three stages from public values only (stages never go back): theft by `AI power + 0.4 × (50 − Cooperation)` at 28 / 33 / 38; opaque reasoning by AI power at 45 / 48 / 51; AI incident by AI power at 50 / 54 / 58 (only after opaque reasoning has struck); ransomware by `0.6 × AI power + 15 if Europe's AI is Open` at 32 / 37 / 42 (a Dependent Europe meets it from about AI power 53); bioweapon uplift by `AI power + 3 if Open` at 66 / 69 / 72, after self-improving AI; silicon blackmail appears with the oversight mandate while Dependent, or when Europe protests the US chip-tool ban, then grows one stage a round. A threat strikes at the earliest the round after it became imminent.
6. **One event at most**: the next AI 2027 milestone's threat if ripe; else **the memo leaks** (first round with AI power ≥ 76 after the geopolitics milestone, so at or before the tipping point); else a job shock (first at AI power 40 after "AI takes jobs", second at 70 after "the cheap remote worker"); else a crisis that is not a threat, each once a game (the **US chip-tool ban** after the ASML lever or in the Rupture zone once the theft struck; a **Taiwan Strait crisis** in the Rupture zone once the theft struck, from AI power 50; the superpowers' **open-model ban** when Europe's AI is Open, outside the Rupture zone, from AI power 55); else the AI incident (chance per round `0.3 + 0.02 × (60 − true Confidence)`, between 8% and 85%: it shows as "possible"; it rarely finds a free slot: see the rebalancing notes), else silicon blackmail, else ransomware, else bioweapon uplift.
7. **The tipping point**: AI power ≥ 80, from round 6, and only once every earlier AI 2027 milestone has been reached; otherwise AI power stops at 79. The round in which it is reached is the last round of decisions.
8. **Map content**: milestone headlines, then threat-stage headlines, then a world headline from the pool when there is room (two at most); one or two public voices; a leak round every two or three rounds from round 2, where the next leak comes if its AI 2027 milestone has been reached (sycophant: the start; could replicate: Agent-2 kept internal; hides mistakes: alignment inconclusive; performs for testers: national security), else the round stays quiet; a friend's letter on the schedule of `letters.schedule` (rounds 1 Léa, 2 Malik, 3 your mother, 5 Léa, 6 Malik, 7 your mother, 9 Léa). Letters move no gauge and draw their variant from their own seeded stream (seed and round); the main generator still makes one unused draw at rounds 1, 4 and 8 (`letters.legacyDraws`, where Léa's letters drew before 26 Oct) so seeded games are unchanged. Each pool is picked from public values only (see `src/data/letters.ts`).

Then the player may read the report (at most three changes with a cause, routine drift left out, and the threats that moved), and play up to two cards (`playCard`), never the same card twice in a round. `endRound` ends the game at the tipping point or after the last round (`TUNING.rounds`: 10 since 26 Oct, was 12).

## Events (Breaking news)

| Event | Prepared by | Unprepared | Prepared |
| --- | --- | --- | --- |
| Model theft | Weight security standards | AI power +5, Cooperation −15 | Cut short: AI power +2, Cooperation −6; with a coalition, *Joint attribution* opens |
| Opaque reasoning | AI Office capacity | Margin × 1.5 | Margin × 1.2 |
| AI incident | Coalition level 1 and inspections level 1 | Estimate −10, Cohesion −5, Cooperation +3 | Cooperation +10; either way the *AI security summit* opens (Europe leads it only if prepared) |
| Ransomware wave | Cyber shield | Cohesion −15 | Cohesion −3 |
| Silicon blackmail | Europe's AI Open | Give in (Europe's AI locked Dependent, open models gone) or hold firm (Cohesion −10) | Nothing |
| Bioweapon uplift | Lead a global biosecurity pact | Cohesion −6 | Cohesion −1 |
| Job shock 1 and 2 | Back flexicurity in member states | Cohesion −5 | Cohesion −1 |
| The memo leaks | Inspection accord (level 2) | Cohesion −3, margin +4 (Europe had seen only older models) | Cohesion −3. Either way: flag `memo_public`, the *Call for a pause* opens, the Oversight Committee will vote |
| US chip-tool ban (choice) | none | Comply: Cohesion −4, Cooperation −3; protest: silicon blackmail grows a stage | |
| Taiwan Strait crisis | none | Cooperation −5, Cohesion −4, AI power −2 | |
| Open-model ban (choice) | none | Join: Europe's AI → Dependent, Cohesion −2; keep them open: Cooperation −4, ransomware grows a stage | |

The crises that are not threats set `<id>_done` and `<id>_<choice>` flags (for the news). The job shocks also show in the feed and on the map as a social item with the jobs icon (Rotterdam, then Warsaw; `JOB_SHOCK_PLACE` in `src/data/social.ts`); their effect is the event's, applied once.

## The Oversight Committee (AI 2027, October 2027)

Once the memo has leaked (`memo_public`), the committee votes at the tipping point, from public values only: 4 votes to slow down, +1 for the leaked memo, +1 for Europe's pause call (`pause_call`), +1 when verified AI safety is below 30 ("nobody outside can vouch for it"; 50 until 26 Oct, when nearly every player got this vote for free), −1 in the Rupture zone (hawks). Six or more of ten: slow down, the final US–China cooperation moves +10 and the true AI safety +8 (outside alignment researchers, Agent-4 shut down); else race on, cooperation −4 (China's offer of a pause refused). Flags `committee_slowdown` / `committee_race`. The heading line already counts the vote as it stands; the Why? dialog and the end screen show it with its reasons.

## Cards

| Card | Cost | Effect | Uses | Arrives |
| --- | --- | --- | --- | --- |
| Diplomatic talks | 1 | Cooperation +3, Cohesion −2; rests the next round | 3 | Round 1 |
| Push for inspections: Test the labs' models in Europe → Inspection accord → Joint inspectorate | 2 / 3 / 3 | Margin −8 (−10 with the AI Office); from the accord: Cooperation +2, truth +3, Influence −1 next round. The accord and the inspectorate need an AI incident, the summit, or Cooperation 60+ | 3 levels | Round 1 |
| AI Office capacity | 2 | Margin × 0.5, Cohesion −1; softens opaque reasoning; leaks +2 oversight | 1 | Round 1 |
| Fund alignment research | 2 | Truth +5 (+4 more with inspections level 2), estimate +2 | 3 | Round 2 |
| Middle-power coalition | 2 / 2 / 3 | Cooperation +2; level 2: Influence +1 a round | 3 levels | Round 3 |
| Independent audit (a game device) | 1 | Estimate set to the truth; the true value shown for 2 rounds | 2 | Round 4 |
| Push to use the ASML lever | 2 | Safety: margin −8; or access: Cohesion +6. Cooperation −2; Washington answers with the chip-tool ban | 2 | AI power 35 |
| Weight security standards | 1 | Cuts a theft short; Europe's AI → Dependent unless Europe funded open models; Cohesion −2 | 1 | Theft threat seen |
| Fund open models | 2 | Europe's AI → Open, Cohesion +6; ransomware pressure +15 | 1 | Round 2 |
| Back flexicurity in member states | 3 | Cohesion +10; softens job shocks; Influence −1 for 2 rounds | 1 | AI takes jobs milestone |
| Cyber shield for hospitals and grids | 2 | Protects against ransomware; Cohesion +3; Influence −1 for 2 rounds | 1 | Ransomware threat seen |
| Human oversight mandate | 2 | Cohesion +6; labs withhold models: Europe's AI → Dependent unless Europe funded open models; silicon blackmail threat if Dependent | 1 | Round 6 |
| A CERN for AI on Europe's gigafactories | 3 | Margin −8, Cohesion −3 | 1 | Round 3 |
| Fund chips that prove where they run | 3 | Cooperation +2, margin −3, Influence −1 next round | 1 | AI power 50 |
| Push for a licensing treaty | 3 | Margin −6, truth +6, Cooperation +2, Cohesion −2; only with Cooperation 60+ | 1 | Pause zone and (the summit or inspections level 2) |
| Lead a global biosecurity pact | 2 | Protects against bioweapon uplift; Cooperation +2, Cohesion −1 | 1 | Bioweapon threat seen |
| *AI security summit* | 1 | Cooperation +10 (Europe prepared for the incident) or +5, margin −5, truth +4 | 2 rounds | Any AI incident |
| *Joint attribution with allies* | 1 | Cooperation +3 | 2 rounds | Theft, with a coalition |
| *Call for a pause with other capitals* | 2 | Cooperation +2, one committee vote to slow down, Influence −2 next round | 2 rounds | The memo leaks |

**Cards that can fail** (v4, playtests of 26 Oct; `TUNING.failure`). Diplomatic and external cards work with a chance read from public values only; domestic cards that spend Europe's own money, and Europe's own testing (inspections level 1), always work. Chance = `base` + zone and cohesion modifiers + coalition levels, kept within 0.15–0.95; the card shows it in words: **Likely to work** (≥ 0.75), **Uncertain** (≥ 0.5), **Long shot** (below), with what makes it easier or harder ("harder in a rupture", "Europe holds together", "your allies add weight").

| Card | Base | Modifiers |
| --- | --- | --- |
| Diplomatic talks | 0.75 | Pause +0.15, Rupture −0.30 |
| Coalition of middle powers | 0.75 | Cohesion 60+ +0.10, below 45 −0.25 |
| Inspection accord, joint inspection agency (levels 2–3) | 0.65 | Pause +0.15, Rupture −0.30 |
| Push to use the ASML lever | 0.70 | Cohesion 60+ +0.10, below 45 −0.25 |
| Pact against bioweapons | 0.80 | Rupture −0.30 |
| Call for a pause with other capitals | 0.65 | +0.10 per coalition level |
| Licensing treaty | 0.55 | +0.10 per coalition level |

On failure the Influence is spent and nothing else happens: no effect, no level climbed, no blowback (no rest for the talks, no chip-tool ban after the ASML lever, no Influence penalty), and the card can be tried again in a later round (not twice in one). `s.played` marks it `failed`; the feed gives one plain sentence (`failure` on the card, with its basis) as a headline and the decision as "did not work"; the end screen lists it as such. Each roll draws from its own stream (seed, round, card, uses), so the game's other draws never move and a reload gives the same result. `preview()`, the decision screen's affordability (`playCard(…, { assumeSuccess: true })`) and the tests' `play()` helper assume success; the advisor weighs a card by its chance, the thoughtful strategy by the words on the card (Likely 0.85, Uncertain 0.6, Long shot 0.3).

**Oversight** (to read leaks): AI Office 2, each inspection level 1, an audit 1. Leak levels in order: 1, 1, 2, 2. A leak's text says whether the labs are overconfident (estimate − truth ≥ 6) or not.

## Requests: which side means yes

One convention for every request (26 Oct): **right goes along with the request, left refuses it or puts it off**. Each answer declares it (`stance: 'accept'` on `right`, `stance: 'refuse'` on `left`) and `tests/requests.test.ts` fails otherwise. When the request offers two courses ("Expose them publicly, or deal with it quietly?"), the one the character asks for first, or plainly wants, is the accepting one. Adopting it swapped the sides of 21 cards (each answer kept its effects and label) and reworded Léa's AI-friend question so that "yes" means the age limit she wants. Effects did not change, but the strategies that pick a side blindly did: quick sim (100 games a strategy) passive (always left, now always refusing) 0% → 0% good, random 22% → 16%, saver 60% → 59%; thoughtful, cooperation-only, home-first and advised unchanged; every target still passes.

**Costs are spread (26 Oct, playtests: "too many requests and decisions harm Social cohesion").** An answer may cost Influence (`effects.influence`, spent at once; shown as a number, "Influence −1", before and after answering, like a card's cost): political capital spent in Washington, Beijing or the member states. 16 answers lost their Cohesion cost for Influence, US–China cooperation, a growing threat or Europe's AI, each where its `why` already said so (no `why` changed): `us_security_pact` and `cn_joint_research`, `cn_watch_chips`, `rs_memo`, `sc_warned`, `jn_logs` (right: the Cohesion cost dropped, the cooperation cost, Dependent badge or growing theft stays); Influence −1 instead of Cohesion on `us_strike_support` and `us_compute_club` (left), `cn_nuclear`, `cn_pause_offer`, `rs_look_inside`, `os_safer_releases`, `pt_back_channel`, `pt_joint_tests` (right), `ob_safety_report` and `ai_draft_laws` (left). Requests with a Cohesion cost on a side: 42 of 48 → 26. US–China cooperation moves in smaller steps on requests too (about two thirds of before; crisis-linked answers such as backing Washington's strike keep the larger moves). Cards: alignment research and the coalition no longer cost Cohesion (their texts never said so; alignment's down chip now reads "Labs adopt little without inspectors").

## Previews, the heading line and the advisor

- `preview(s, picks)` plays the cards on a copy whose truth is replaced by the estimate, so a preview never depends on the hidden value (tested). After a real play, the estimate may differ from the preview when a narrower margin pulls it toward the truth: that is information the player earned.
- **Effects in words before deciding, numbers after** (playtests of 26 Oct: players computed their moves from the exact numbers). Card faces and details, the selection's preview on the gauges ("up some" by the value; AI safety "verified up some" or "claim up a little"; ghost marks still on the bars), the toggle announcement and request answers (chips and the buttons' accessible names) say each gauge move as a direction and a size: **a little** for at most `TUNING.effectWords.little` (3), **some** up to `.some` (7), **a lot** beyond (`src/data/effects.ts`, `tests/effects.test.ts`). Influence stays a number (a resource). After Confirm or an answer, the gauges' deltas, the feed, the reaction card and the announcements show numbers as before. Goals and floors (a world's thresholds) stay numbers. A request answer's chip carries the move it stands for (`chip.move`, never shown) so the simulation's players weigh it as before: the seeded `npm run sim` stayed byte-identical (the strategies keep ignoring a delayed effect that ends on a gauge move, as the numeric chips' regex did: see the rebalancing backlog).
- `heading(s)`: at the tipping point or while AI power can still reach it, the world is the current Cooperation zone; from round 4, when `AI power + last rise × rounds left × 1.15 < 80`, it is the plateau world given by Europe's AI badge (public values only). Goal and floor per world:

| World | Decides | Safety net |
| --- | --- | --- |
| Pause (Cooperation 60+) | Confidence 60 | Cohesion 42 |
| Race (30–59) | Confidence 62 | Cohesion 47 |
| Rupture (< 30) | Cohesion 82 | Confidence 60 |
| Plateau, open models | Cohesion 60 | Confidence 40 |
| Plateau, big labs (Big AI) | Cohesion 60, and Europe's AI Open | Confidence 40 |

  "Met" in the heading uses the whole band for Confidence: yes if estimate − margin ≥ target, no if estimate + margin < target, else uncertain.
- `advisor(s)`: weighs each gauge by how far it is from what the heading's world needs (the low end of the Confidence band), scores each playable card through the public preview plus what the card text says (protection against a visible threat, hidden safety gain, Influence lost later), and recommends the best value per Influence. Its words carry no numbers (tested).

## The end

At the tipping point, the final Cooperation is drawn within ±2 of the current value (suspense near the borders), the Oversight Committee's vote moves it (+10 or −4, once the memo has leaked), and its zone picks the world; without a tipping point, AI power at the end does (below 70 the Plateau, from 70 Big AI, `plateau.bigAiFrom`; 60 until 26 Oct). The ending is good when the deciding gauge reaches its target and the safety net its floor, **using the true Confidence**; in Big AI, Europe's AI must also be Open (CFG's agent economy). `ending(s)` builds the one-sentence explanation, the four gauges with target and floor, the reveal (truth vs estimate, pace, unread leaks), up to two "what would have changed it" lines (a calmer zone, the shortfall, an unprepared threat), the decisions with their chips, and the threats.

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
| Cards can fail (`failure`), playtests of 26 Oct | always worked | talks, coalition, inspection accord, ASML lever, bioweapons pact, pause call, licensing treaty work with a chance from public values (above) | Playtesters found the game too easy and one asked that actions can fail. Not rebalanced (owner's decision: a rebalancing pass follows). | `npm run sim`, 100 games: thoughtful 38% → 31% good, advised 34% → 35%, home-first 25% → 24%, saver 37% → 37%, random 13% → 13%, passive 0% → 0%, cooperation-only 0% → 0%. Thoughtful's plays fail 7.7% of the time (talks 66 of 298, coalition 19 of 93, ASML 12 of 48); talks reach 21.6% of its plays (retries count). *Licensed utopia* falls below 2% for every strategy. |
| **Rebalancing of 26 Oct** (owner's decisions: the takeoff is a frequent outcome; US–China cooperation is a slow grind outside crises; costs spread away from Social cohesion; land in the targets). Each row below is part of one pass, measured together (`npm run sim`, 100 games a strategy; before: thoughtful 31%, random 13%) | | | | |
| AI pace (`pace.accel`, `pace.base`) | 0.07; 3.6 / 5.6 / 7.6 | 0.15; 4.0 / 5.8 / 7.2 | Owner: the takeoff should be frequent (it was 58% of games, all of them steady or fast, none slow; tipping worlds almost never won). AI 2027: AI speeds up AI research, so a stronger acceleration; the fast base is lower since acceleration now carries it. | Tipping in 63% of all games (slow 12%, steady 100% around round 8, fast 100% at 6–7); never before round 6. |
| Big AI from (`plateau.bigAiFrom`) | 60 | 70 | Slow games now end at AI capabilities 65–79: at 60 nearly every plateau was Big AI and *Slower AI, shared by all* vanished. | Both gradual worlds stay (*Slower AI* 19%, *A fair economy* 19% at best). |
| Cooperation drift (`drift.cooperation`) | −1 a round (−2 from AI 60) | 0 (−1 from AI 60) | Owner: cooperation moves slowly outside crises. With smaller steps from cards, the old drift would have pushed every game into the Rupture. The race still heats up: China wakes up (−2), geopolitics (−4), the theft, Taiwan, the committee. | |
| Cooperation steps of cards: talks, coalition, accord and joint agency, chip verification, licensing treaty, biosecurity pact, joint attribution, pause call | +6, +3, +3, +4, +3, +3, +5, +4 | +3, +2, +2, +2, +2, +2, +3, +2 | Playtester: "+3 or more sounds unrealistic short of a miracle or catastrophe". Big moves stay with crises and events (theft −15 / −6, incident, summit +10 / +5, Taiwan −5, the committee +10 / −4). Talks now match their text ("trust rises a little"). | Thoughtful ends at cooperation 49 (was 56); the Pause comes mostly through the committee. |
| Cooperation steps of requests (data, `src/data/requests/`) | up to ±8 (±10 backing Washington's strike) | about two thirds (±2 to ±5; ±7 for the strike) | Same reason; listed in "Requests: costs are spread" above. | |
| Costs spread away from Social cohesion: `effects.influence` on request answers (engine), 16 answers changed, alignment and coalition lose their Cohesion cost (`cards.alignment.cohesion`, `cards.coalition.cohesion`) | Cohesion the default price (42 of 48 requests); alignment −1, coalition −1 | Influence, cooperation, a threat or Europe's AI where the `why` says so (26 of 48 keep a Cohesion cost); 0, 0 | Owner and playtesters: "too many requests and decisions harm Social cohesion". Directions unchanged; no `why` changed. | |
| Cohesion drift past AI 60 (`drift.cohesionHigh`) | −1 | 0 | Counted AI's weight on jobs twice since `jobDrift` (which grows with AI capabilities) was added. | |
| True AI safety lost a round past AI 60 (`drift.truth`) | −2 | −1 | With the faster clock the late game is harder anyway; at −2 the hidden value fell faster than any of Europe's levers could lift it, so the tipping worlds were decided by the clock, not by the player's work. AI 2027's direction kept. | |
| Alignment research (`cards.alignment.truth`) | +3 | +5 (+4 more with the accord) | Owner: a good ending must come from the player's work on AI safety. Europe's own lever on its own ground (independent alignment teams); the gap between thoughtful (truth 60 at the end) and random (54) and saver (57) comes mostly from it. | |
| Committee: doubt vote (`committee.doubtBelow`) | verified below 50 | below 30 | Nearly every player had verified AI safety below 50, so the memo plus doubt slowed the committee down for free (+8 true AI safety, +10 cooperation): the vote rewarded neglecting oversight. Now the slowdown comes from Europe's pause call (with the memo), or from egregious blindness. | Committee slows down: thoughtful 49% → 19% of games (with its pause call), random 41% → 10%; passive 1% → 27% (it verifies nothing, so doubt votes, and it still loses on the true AI safety). |
| Pause call's chance (`failure.cards.pause_call.base`) | 0.55 | 0.65 | It is now the player's way to the committee's slowdown; at 0.55 without a coalition it was a long shot exactly where it matters. | |
| Targets (`worlds`): Pause, Race, Rupture | AI safety 64 / Cohesion 45 (68 / 45 before the pass); 68 / 55 (75 / 55); Cohesion 82 / AI safety 65 | 60 / 42; 62 / 47; 82 / 60 | Sized to what Europe's levers can now reach before a takeoff around round 7–8 (thoughtful true AI safety 60 at the end, random 54, passive 47). The race stays harder than the pause (higher bar and floor); the rupture's floor lets a strong Europe hold a divided world (*A divided world that holds*, 0% before). | Every ending ≥ 2% for some strategy. |
| AI incident (`threats.incident.stages`, `chanceBase`) | 52 / 57 / 62; 0.2 | 50 / 54 / 58; 0.3 | To give the warning shot (and the summit) a chance in a faster game. It still almost never strikes: one event a round, and the milestones' threats, job shocks, crises and the memo come first in the late rounds (see backlog). | Incident struck in 0–1% of games, as before. |
| Job drift softened by flexicurity (`jobDrift.flexicurity`) | −0.5 of the factor | −0.75 | Acting early must matter: retraining early saves Cohesion every later round. | |
| Requests (`requests.maxPerGame`, `minRate`) | 10, 0.9 | 8, 1 | Short games (a takeoff in round 6) got only 5 requests; a request is now due whenever the game is behind one a round, and the cap of 8 keeps rounds without a request common in long games. | 6–8 requests in every game; 14.3% of rounds without one in the requests test's 300 thoughtful games (floor back to 10%). |
| Strategies (`scripts/strategies.ts`) | read request answers by the exact move behind each chip; delayed effects ending on a gauge move counted for nothing; aims at Pause 71 / Race 81 / Cohesion 56 / 64 (hard-coded) | read every answer in words (a little ≈ 2, some ≈ 5, a lot ≈ 10), delayed effects in words too, Influence as a number; aims derived from `TUNING.worlds`; the thoughtful player values the pause call when the heading's committee vote is one vote short | Backlog item 10: play like the people they stand for. | |
| Card-share target (`scripts/sim.ts`) | every try counted | only plays that worked | A failed try is a roll of the dice, not a choice to prefer a card; retries of failed talks pushed them over 20%. The sim also prints the share of tries that failed. | Talks 18.4% of the thoughtful player's plays that worked (7.9% of tries failed). |

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

### After the rebalancing of 26 Oct (`npm run sim`, 100 games a strategy)

| Strategy | Good endings | Tipping point | Notes |
| --- | --- | --- | --- |
| Passive | 0% | 67% | *The rivalry turns to war* 39%, *A Europe held hostage* 32% |
| Random | 21% | 66% | wins 31% of slow games, 13–14% of tipping games |
| Thoughtful | 57% | 60% | slow 88%, steady 34%, fast 35%; true AI safety 60.5 at the end; talks 18.4% of plays that worked |
| Cooperation-only | 6% | 65% | pause reached through its pause calls, lost on AI safety and Cohesion |
| Home-first (no diplomacy) | 38% | 62% | *A divided world that holds* 13%, never wins a fast game |
| Advised (one card a round) | 39% | 59% | plateaus 86%, tipping worlds 0–9% |
| Saver (bursts) | 48% | 60% | steady 20%, fast 22%: fewer rounds of alignment research and talks |

| Target | Result |
| --- | --- |
| passive good endings < 15% | PASS 0% |
| random good endings 15–30% | PASS 21% |
| thoughtful good endings 55–80% | PASS 57% |
| every ending ≥ 2% for some strategy | PASS (lowest *Powerful AI in every hand* 4%) |
| cooperation-only clearly worse than thoughtful (−20 pts) | PASS 6% vs 57% |
| home-first clearly worse than thoughtful (−15 pts) | PASS 38% vs 57% |
| thoughtful: no card above 20% of its plays that worked | PASS talks 18.4% |
| saver clearly worse than thoughtful (−10 pts) | **FAIL** 48% vs 57% (−9 pts) |
| 6–10 requests a game | PASS 100% (6–8) |
| thoughtful: AI safety uncertainty at the end ≤ 30 (median) | PASS ±22 |
| tipping point never before round 6 | PASS earliest round 6 |
| AI takes off in 50–70% of games (new) | PASS 62.7% (slow 11.9%, steady 100%, fast 100%) |

Levers tried and dropped (one sim each): alignment research with four uses at +4 (thoughtful 56%, saver 48%); shorter theft and ransomware windows (28 / 32 / 36, 32 / 36 / 40: thoughtful 53%, saver 50%); a thoughtful player reading the middle of the AI safety band with stronger weights (54%, 47%). The saver gap sits at the edge of a 100-game sample's noise; the faster clock shortened the saving phase (the saver plays like the thoughtful player from AI capabilities 70, now reached by round 6–7).

### Rebalancing backlog (owner's decision, 26 Oct: rebalance at the end, not now)

Ideas kept for the final pass, in this order, each checked with `npm run sim` at 100 games:

1. **Done (26 Oct rebalancing).** **Speed AI capabilities up a little** so a steady pace tips around rounds 7–8 (today ~9.5) and a slow pace gets close to the tipping point by the end; keep "never before round 6".
2. **Partly done:** Big AI from 70 and slow games reaching 65–79 make the plateau a Big AI world more often (an Open Europe needed); advised and saver still win 86% of slow games. **Make plateau worlds harder** (slow-pace games that end by timeout in H2 2031): today advised and saver win all of them.
3. **Home-first done** (38% vs 57%); **saver open** (48% vs 57%, −9 pts). Then check that **home-first** (−15 pts) and **saver** (−10 pts) fall clearly below thoughtful again, and that every ending stays ≥ 2% (*The race pays off* is at the edge).
4. **Done** (8 requests at most, a request due whenever the game is behind one a round; 14.3% of rounds without one). Restore the requests test's "rounds without a request" floor from 8% to 10%.
5. **Done** (21%). Watch random (15–30%): it sat at the floor (15%) before the switch to ten rounds.
6. **Open:** not run in this pass. Run the a11y harness (`npm run a11y`) once at the end: its seeded games (3, 4, 9) now play different draws.
7. **Measured in the 26 Oct rebalancing** (sizes kept). **Living world (26 Oct, content pass):** headlines and voices now draw from their own seeded stream (no longer from the game's generator), so every seeded game after round 1 plays different requests and events than before; at 100 games the targets did not move beyond noise (thoughtful 68% → 65%, random 20% → 16%, home-first 59% → 56%). New social events and requests carry provisional sizes (listed below as they land); check them in the final pass.
8. **Measured in the 26 Oct rebalancing** (sizes kept; the recently-seen memory not measured). **Living world: what moves gauges (provisional, check in the final pass).**
   - *Social events* (sizes from `TUNING.social.size`): new bad news: `se_outsourcing` (jobs, cohesion − medium), `se_travel_agents` (jobs, − small), `se_ai_degrees` (− small, AI capabilities 50+), `se_memo_protest` (− small, after the memo), `se_grid_blackout` (− medium, Rupture and 50+), `se_lobby_leak` (− small, Dependent from round 4), `se_forint_deepfake` (− small, 35+), `se_pause_smuggling` (cooperation − small, Pause); new good news: `se_pause_rally` (+ small, after the pause call), `se_inspectors_test` (verified + small, Pause with inspections), `se_shared_tests` (cooperation + small, Pause), `se_companion_ages` (+ small, 45+), `se_reskilling` (+ small, retraining), `se_open_tax_office` (+ small, Open), `se_scam_classes` (+ small, 40+). Replaced with the same size and gate: `se_lorry_drivers` → `se_office_march`; `se_energy_bills` → `se_grid_blackout` (gate now Rupture and AI capabilities 50+). The pool grew from 25 to 39, so each event comes less often; the Pause world now has its own news (two good, one bad).
   - *Requests*: removed as duplicates of new decision cards: `rs_compute_pledge` (weight 2, true AI safety +10: the strongest safety answer), `sc_biosecurity`, `us_licence_treaty`. New: `cn_watch_chips` (Rupture, round 6+, coalition 1+: cooperation +6, cohesion −3, Europe's AI Dependent / cooperation −4). Changed: `mk_visa` right answer cooperation +2 → 0 with a later true AI safety +2, gate maxCoop 50 → 59 (it never came to thoughtful players); `cn_joint_research` needs cooperation 35+ (no joint research in a Rupture); `cn_tools` is no longer first in line when China wakes up (`priority: false`; it came in 92% of thoughtful games); `rs_memo` now comes after the memo leak (outside tests: verified uncertainty −4, cooperation −2, cohesion −1 / take their word) instead of calling for a pause at the tipping point (AI −3, claim −4, cooperation +3, cohesion −2); `jn_memo` comes before the leak, from the geopolitics milestone (uncertainty −5, cohesion −2, cooperation −2; was −6, −3, +2 at the tipping point), and excludes `rs_memo`.
   - *Sanity run after this pass* (`npm run sim`, 100 games, on top of the core pass 9473f11, both unbalanced): passive 0%, random 22%, thoughtful **45%** (target 55–80%), cooperation-only 3%, home-first 42%, advised 41%, saver 43%; *The cognitive revolution* and *A divided world that holds* below 2% for every strategy. Not split between the two passes (the owner caps the runs); on this side the likeliest cause is the removed `rs_compute_pledge` (true AI safety +10, drawn twice as often as others).
   - *Recently-seen memory*: real players' games weigh items seen in their last two games at 0.25 (`TUNING.news.recentWeight`), social events and requests included, which shifts which gauge-moving items come; the seeded simulation passes no memory. Measure it in the final pass with `playGame(seed, strategy, recent)` chained over consecutive seeds if it matters.

9. **Done for the numbers** (targets sized to the new levers, the committee's doubt vote narrowed to below 30, alignment research +5; the bioweapon uplift and the AI incident still almost never strike: one event a round, and the late rounds are full). **Structural content rewrite (26 Oct, audit of the decisions, threats, events and endings; owner's decisions).** Direction and rule changes, all with provisional sizes in `tuning.ts`, none rebalanced. Quick sim (100 games a strategy) after them: passive 0%, random 13%, thoughtful 38%, cooperation-only 0% (was 4–8%), home-first 25%, advised 34%, saver 37%; *The cognitive revolution* and *A divided world that holds* fell below 2% for every strategy; tipping worlds are almost never won (thoughtful: steady pace 9%, fast 0%). The balance guardrail in `tests/balance.test.ts` was relaxed (thoughtful > 0.3, random > 0.03) until this pass. To look at, in this order:
   - **Hidden AI safety lost Europe's direct gains.** Inspections no longer add truth +6 a level (only +3 from the accord, under a deal), the ASML lever no longer adds truth +8, alignment research gives +3 (+4 more with the accord) instead of +6, open models no longer cost −6. The tipping worlds' targets (Pause 68, Race 75) were sized with those gains: lower them, or raise the in-access gains (accord, licensing treaty +6, summit +4, the committee's slowdown +8), or slow the truth's drift (−2 a round past AI power 60).
   - **The committee vote** moves the final cooperation +10 / −4 and the truth +8 on a slowdown (4 base votes, +1 memo, +1 pause call, +1 verified below 50, −1 Rupture; 6 needed). The pause call is rarely played by the strategies (thoughtful 8%); "doubt" alone often decides the vote. Check whether the vote should need the pause call more, and whether +1 for low verified rewards neglecting oversight.
   - **Big AI needs an Open Europe** (`plateau.bigAiFrom` 60): slow games split between Plateau and Big AI; random players rarely end Open (random 13%). Check the 60 threshold, and that open models (once, cost 2) are not a must-play.
   - **Inspections**: accord and inspectorate gated (incident, summit or Pause zone), costs 2 / 3 / 3 and Influence −1 next round; cooperation 0 then +3. **Coalition** +3 a level (was +6), **talks** +6 (was +8).
   - **Partial protections**: a prepared theft now costs AI power +2 and cooperation −6 (was −3 only); the AI Office leaves opaque reasoning at margin ×1.2 (was no effect).
   - **Blowback**: the ASML lever triggers the US chip-tool ban (comply: Cohesion −4, cooperation −3; protest: silicon blackmail grows); the oversight mandate turns Europe Dependent unless it funded open models, and no longer slows AI (−2 removed); the Five Eyes headline costs a level-1 coalition Influence −2; the pause call and chip verification cost Influence −2 / −1 next round.
   - **New crises**: Taiwan (Rupture, Cooperation −5, Cohesion −4, AI power −2), the open-model ban (Open Europe: join or keep), the memo (Cohesion −3, margin +4 without an accord), bioweapon uplift (rare: strikes in 1–5% of games). Home-first meets the chip-tool ban (83%) and Taiwan (45%) often: it hurts the *Multipolar world* (Cohesion 82).
   - **Ransomware** reaches a Dependent Europe (0.6 × AI power, +15 if Open; was 0.5 and +25). **Incident**: unprepared Cooperation +3; the summit opens after any incident (+5, or +10 when prepared); prepared needs inspections level 1 (was 2).
   - **New cards** with first sizes: CERN for AI (3, margin −8, Cohesion −3, round 3), chips that prove where they run (3, Cooperation +4, margin −3, AI power 50), licensing treaty (3, Pause only), biosecurity pact (2), pause call (2). Open models arrive in round 2 (were after the first job shock), flexicurity with *AI takes jobs*.
   - **Leaks** wait for their milestone and the DeepCent leak is cut: fewer leaks a game; levels 1, 1, 2, 2.
   - **Fewer requests**: the living-world pass removed `rs_compute_pledge`, `sc_biosecurity` and `us_licence_treaty` (duplicates of the CERN for AI, biosecurity and licensing cards) and its own Five Eyes headline (the milestone has one): check the "6–10 requests a game" and "rounds without a request" guardrails.
   - The strategies were taught the new rules (event choices, Europe's AI weighted 8 when heading for Big AI, the committee's world change scored): check they still play like the people they stand for.
10. **Done:** the strategies read every answer in words and delayed effects the same way. **Effects in words (26 Oct, playtests):** the strategies still weigh request answers by the exact move behind each chip (`chip.move`), while players now see only a direction and a size before deciding. Consider rounding the strategies' view to the word scale (a little ≈ 2, some ≈ 5, a lot ≈ 10) so they play like the people they stand for. They also keep a historical quirk: a delayed effect ending on a gauge move ("Later: Social cohesion down a little") counts for nothing, while one ending on "more/less verified" counts ±2; make it consistent.
11. **Done:** pause call 0.65, the card-share check counts plays that worked, *The pause holds* 7%. **Cards can fail (26 Oct, playtests):** thoughtful 38% → 31% good (target 55–80%), saver now above thoughtful (37%), talks 21.6% of thoughtful's plays (> 20%: failed talks are retried), *Licensed utopia* below 2% everywhere (the licensing treaty and the pause call are long shots without a coalition). Levers: the bases in `TUNING.failure.cards` (talks 0.75, coalition 0.75, accord 0.65, pause call and treaty 0.55), a partial effect on failure instead of nothing, or a cheaper retry. Check that diplomacy stays worth trying in a rupture (talks are a long shot there, where they matter most).

## Final simulation of v3 (2,000 games per strategy; historical)

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
