# v3 build notes

Built overnight on 25–26 October 2026 on branch `v3`, from [V3_SPEC.md](V3_SPEC.md). Preview: <https://damienlethiec.github.io/takeoff-middle-power/preview/v3/>. Rules and numbers: [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md). What the game takes from its sources: [SCENARIO_BASIS.md](SCENARIO_BASIS.md).

## What was built

**Engine (rewritten).** `src/engine/types.ts` and `api.ts` define the v3 contract: `createInitialState → startRound → resolveEvent → (report, hand, advisor, preview) → playCard ×0–2 → endRound`, then `ending`. The model is the spec's: the AI power clock (tipping point at 80, never before round 6, hidden pace), Cooperation with three zones, Confidence as an estimate ± margin around a hidden truth, Cohesion, Europe's AI badge, one resource (Influence). AI 2027's milestones are reached in the scenario's order; threats grow in three stages from public values; one event per round at most; leaks every two or three rounds; Léa's letters with random variants; the ten CFG endings decided by one gauge and a safety net, with a one-sentence explanation, the reveal and counterfactuals. The engine is pure and seeded.

**Content.** `src/data/`: 12 cards and 2 opportunities (`cards.ts`), 5 threats and 7 Breaking news events (`threats.ts`), 12 AI 2027 milestones (`milestones.ts`), 14 world headlines and 15 public voices (`mapcontent.ts`), 6 leaks with two versions each (`leaks.ts`), 13 Léa letters plus 20 ending letters (`lea.ts`), the 10 endings and 5 worlds (`endings.ts`), copy and tips (`copy.ts`), sources (`sources.ts`). Every piece of content has a `basis`.

**UI (rewritten on the v2 shell).** Kept: the dot-matrix map and its drawing, the modal and live-region layer (`modal.ts`, `a11y.ts`), the look (tokens, fonts, paper letters). New: the main screen (header with date, round and Influence with next income and why; a full-width map; four gauges with targets, floors and threat markers; the heading line; a dock when the clock stops), threat icons, Europe's AI badge, Léa's portrait and leaks as real buttons over the map, headline banners and public voices where they happen (a news strip under the map on phones), Breaking news, the report on demand, the decision screen (hand, chief of staff, up to two cards, before → after preview with the heading line), letters, journal, help with the tutorial and shortcut switches, coach marks at first use, and the end screen. Léa's portrait is an original SVG avatar with four expressions (hopeful, worried, relieved, sad).

**Removed.** The v2 engine, data, screens, onboarding module, tests, strategies and screenshots; `docs/V2_WORKSTREAMS.md`. GDP, approval, misuse, concentration, verification and public pressure no longer exist as numbers; the trajectory bar, risk strip, side feeds, acts, dashboard and the superpowers' plan choice are gone.

**Validation tooling.** `tests/` (Vitest, 72 tests: rules, AI 2027 order, basis on all content, hidden values never leak, endings, content limits, balance sample, rendering helpers), `e2e/game.spec.ts` (Playwright: whole games at both paces and the key interactions), `scripts/a11y/run.mjs` (keyboard-only games with axe on every screen, three runs: 1280×800 with intro and tutorial, 640×400 at reduced motion, 390×844), `scripts/sim.ts` and `scripts/strategies.ts`, `scripts/shots.mjs` (screenshots in `docs/screenshots/v3/`).

## Decisions on unclear points

1. **Influence numbers (open point 1)**: the spec's formula as decided (+2 base, +1 Cohesion 60+, −1 below 35, +1 coalition level 2, cap 10), with a floor of 1 (the spec says income is "between +1 and +4"). The economy is balanced through card costs and a starting Influence of 6, not the income formula.
2. **Europe's AI can flip back (open point 4)**: weight security standards make it Dependent again; giving in to silicon blackmail locks it to Dependent and removes *Fund open models*.
3. **Intro facts (open point 5)**: one fact per screen, both re-checked (Anthropic, March 2025; European Commission GPAI guidelines).
4. **Léa's portrait (open point 3)**: a simple stylised avatar drawn in SVG by us.
5. **When the tipping point is reached** during a round, that round's decisions are the last; the ending follows. The zone is read after them, with a ±2 suspense draw.
6. **The decisive Confidence is the true value** (the spec's ending sentence names "Confidence was 62 ± 8"; the build shows "Confidence was 62 (you saw 70 ± 15)"). Keeping the whole band above the target guarantees it, as the spec's margin paragraph says.
7. **Independent audit** sets the estimate to the truth when played, and shows the truth for two rounds (this round and the next).
8. **Inspections** raise the true Confidence too (+6, estimate +8): inspectors find problems that get fixed. Level 2 with a coalition prepares for the AI incident.
9. **One event per round**: an AI 2027 milestone threat first, then job shocks, the incident, blackmail, ransomware; a threat strikes at the earliest the round after it became imminent, so the player always gets a warning round.
10. **Order gating**: the tipping point waits for every earlier AI 2027 milestone (AI power stops at 79). Theft and opaque reasoning are milestones that always happen; being prepared changes their effect, not their occurrence.
11. **Heading line in slow games**: from round 4, when visible AI power cannot reach 80 by round 12 at its last visible rise (+15%), the heading switches to the plateau world given by the badge. This uses public values only, but it lets an attentive player infer a slow pace; accepted.
12. **The report** lists at most three changes with their cause, sorted by size; routine drift is not listed ("A quiet six months" when nothing else moved). The consequences after Confirm are shown once, on the heading line and the gauges, then a "Start H2 2028" button (no second summary screen).
13. **Keyboard**: Space pauses, Enter presses the dock's main button, J opens the journal, ? the help; the single-key ones can be turned off in Help (WCAG 2.1.4).
14. **Tutorial tips** are dialogs placed next to what they explain (focus moves in, Enter or Escape closes). Tips triggered while the tutorial is off are still listed in the journal.
15. **The random strategy plays one or two cards a round** (see DEVELOPER_NOTES): with zero allowed, half its Influence went unspent, which no human player does.
16. **Two extra sim strategies**: *home-first* (no diplomacy, only Europe's own society and safety) to guard against a dominant non-cooperative strategy, and *advised* (follows the chief of staff, one card a round).

## Final simulation (2,000 games per strategy, `npm run sim`)

| Target | Result | |
| --- | --- | --- |
| Passive good endings < 15% | 0.0% | PASS |
| Random good endings 15–30% | 23.0% | PASS |
| Thoughtful good endings 55–80% | 78.4% | PASS |
| Every ending ≥ 2% for some strategy | lowest: *The cognitive revolution* 3.6% | PASS |
| Cooperation-only clearly worse | 0.0% vs 78.4% | PASS |
| Home-first (no diplomacy) clearly worse | 62.3% vs 78.4% | PASS |
| No card above 20% of a thoughtful player's plays | talks 18.7% | PASS |
| Tipping point never before round 6 | earliest round 6 | PASS |

Endings reached (best share across strategies): A bright winter 39.8%, Decentralised mayhem 11.6%, The agent economy 7.0%, Silicon blackmail 39.6%, Licensed utopia 35.0%, Unstable pause 60.4%, The cognitive revolution 3.6%, Loss of control 52.6%, Multipolar world 22.4%, Hot war 60.9%. Advised (one card a round from the chief of staff): 42.8%. Average game: tipping point at round 7.4 (fast) or 9.9 (steady); slow games plateau.

## Realism notes

For Louis and the fact check. Each is an interpretation or a stretch of the source scenarios.

1. **Dates are stretched.** AI 2027 reaches the superhuman AI researcher in September 2027; the game's tipping point comes between H2 2029 and H2 2032 (or never). The order of AI 2027's milestones is kept; the authors stress their own uncertainty ("Our uncertainty continues to increase"). The intro does not claim AI 2027's dates.
2. **The theft can fail.** In AI 2027 it succeeds (February 2027). In the game, weight security standards make it fail: the attempt (the milestone) still happens. RAND (2024) supports that better security makes theft harder.
3. **Opaque reasoning** stands for AI 2027's "neuralese recurrence and memory" (March 2027); the game's effect (the margin doubles) is our reading of "can't verify".
4. **The AI incident** is CFG's *Diplomacy* "Nova" warning shot (late 2027), not an AI 2027 event; AI 2027 only says Agent-2 could replicate if it escaped. It is ordered after opaque reasoning, and its chance depends on the hidden Confidence (our device).
5. **Leaks before the tipping point.** AI 2027's misalignment memo leaks in October 2027, after Agent-4 (our tipping point). The game spreads leaks across the run (Agent-1's sycophancy, Agent-2's escape risk, Agent-3's lies, CFG's "performing alignment", the memo, DeepCent's doubts) as glimpses of the same gap.
6. **The worlds at the tipping point**: CFG builds its five worlds on speed and concentration; the game picks the fast world by the US–China Cooperation zone (Pause → Diplomacy, Race → Take-off, Rupture → Arms race) and the slow world by Europe's AI badge (Open → Plateau, Dependent → Big AI). This mapping is ours (it was the spec's).
7. **What decides each world** is our reading of the CFG stories: Confidence for Diplomacy and Take-off (a verifiable pause; AIs that "only pretended to serve humanity"), Cohesion for Arms race (Europe able to mediate in *Multipolar world*) and for both plateaus.
8. **The Rupture zone erodes Europe's Cohesion** (−1 a round). CFG's Arms race hits Europe through sanctions on its chip-equipment firms; the size is a game choice, added to stop a dominant "ignore diplomacy" strategy.
9. **Inspections cost Cooperation** ("Beijing sees pressure"): the spec's choice; CFG's Diplomacy and Arms race both stress that verification is contested.
10. **Diplomatic talks** are sourced to CFG's *Multipolar world* (the EU and neutral states mediate) and illustrated by the real Biden–Xi agreement on human control of nuclear weapons (November 2024). AI 2027's own arms-control overtures "go nowhere"; the game lets Europe do better.
11. **Alignment research**: AI 2027's slowdown ending relies on outside alignment researchers brought into the lab; Europe funding independent teams is a stretch of that (the AISI Alignment Project, a real UK fund, is the cost line).
12. **Job shocks** follow AI 2027's two job beats (late 2026 junior coders; July 2027's cheap remote worker), moved to Europe. The real fact shown is US data (Stanford, 2025).
13. **The silicon blackmail threat** comes from CFG's *Big AI*, Ending B; the game triggers it with the human oversight mandate (a new European rule), where CFG's trigger is stronger EU data-protection rules.
14. **Loss of control**'s text leans on AI 2027's race ending (the CFG text of this ending could not be read; its premise matches).
15. **The ending story of *Licensed utopia*** cites both CFG Diplomacy, Ending A, and AI 2027's slowdown; the slowdown's later sections (the treaty) could not be read and are only known from a secondary review.
16. **Headlines and voices** are fiction set after today, each tied to a section; a few use real 2024–2025 facts as their basis (Stanford's study, the AI Act's human oversight article, Anthropic's misuse report), without presenting the voice itself as real.

## Facts checked (WebFetch, 25–26 October 2026)

All real facts shown to players are in `src/data/sources.ts`:

- Anthropic, *Tracing the thoughts of a large language model* (27 Mar 2025): "aren't programmed directly by humans", "we don't understand how models do most of the things they do". Intro 1.
- European Commission, GPAI guidelines: obligations "entered into application on 2 August 2025"; enforcement powers "From 2 August 2026", "including with fines". Intro 2.
- Anthropic, AI-orchestrated espionage (13 Nov 2025): Chinese state-sponsored group "with high confidence", about 30 targets, AI did "80-90%", succeeded "in a small number of cases". Theft.
- Meinke et al., arXiv 2412.04984 (Dec 2024): models "exfiltrate what they believe to be their model weights to external servers". AI incident.
- Korbak et al., arXiv 2507.11473 (15 Jul 2025): 41 authors; "CoT monitorability may be fragile". Opaque reasoning.
- Anthropic, misuse report (27 Aug 2025): "at least 17 distinct organizations, including in healthcare". Ransomware.
- Meta, Llama 4 Acceptable Use Policy: rights not granted to EU-domiciled individuals and companies for the multimodal models. Silicon blackmail.
- Stanford Digital Economy Lab, Chandar and Chen (seminar page, Sep 2025): "early-career workers (ages 22-25) in the most AI-exposed occupations have experienced a 13 percent relative decline in employment". Job shocks.
- White House press gaggle (17 Nov 2024): Biden and Xi agreed on "the need to maintain human control over the decision to use nuclear weapons". Talks.
- IAEA, GC(68)/5: Nuclear Verification €171.4 million in 2025. Inspections.
- European Commission, AI Office: "the ability to conduct evaluations of GPAI models". AI Office.
- UK AISI, The Alignment Project (30 Jul 2025): "over £15 million". Alignment research.
- Europe 2031, summary: coalition with "Norway, the UK, Canada, Japan and South Korea"; "A flexicurity model, like the Danish example"; "The only card Europe still holds is ASML". Coalition, flexicurity, ASML.
- UK AISI, pre-deployment evaluation of o1 (18 Dec 2024): UK and US AISIs jointly evaluated o1 before release. Audit.
- RAND RR-A2849-1 (30 May 2024): securing weights against the most capable actors "will require significantly more investment over the coming years". Weight security.
- European Commission, OpenEuroLLM (3 Feb 2025): €37.4 million. Open models.
- European Commission (12 Jun 2025): €145.5 million for cybersecurity, €30 million for hospitals and healthcare providers. Cyber shield.
- EU AI Act, Article 14(1) (AI Act Service Desk): high-risk systems "can be effectively overseen by natural persons". Oversight mandate.
- Council of the EU (19 Jul 2021): Microsoft Exchange compromise; activities "undertaken from the territory of China". Joint attribution.

## Not verified

- The Stanford paper itself (its publication page was blocked by the fetch tool); the fact is quoted from Stanford's own seminar page.
- The gov.uk Bletchley Declaration page was blocked: no Bletchley fact is used (the emergency summit card has no real-world example).
- AI 2027's slowdown ending after February 2028 and CFG's *Loss of control* text (see SCENARIO_BASIS.md).

## Known issues

1. **Not playtested with the target audience.** The spec's five-person playtest (four questions, about 10 minutes, first decision within a minute) is still to do. A game currently takes about 7–12 rounds of 8 seconds plus decisions; the tutorial adds a few tips in rounds 1–2.
2. **Balance edges.** The thoughtful player wins every plateau game (slow pace): plateau worlds may be too easy once understood. *Home-first* (no diplomacy) still wins 62%, mostly in plateaus and fast games ending in a *Multipolar world*; the message "cooperation matters" is weaker in fast games. *The cognitive revolution* is rare (3.6% at best). The *Independent audit* and the *Human oversight mandate* are rarely worth it for the simulated thoughtful player.
3. **Texts need Louis's review**: card names and texts, Léa's 33 letters (her voice was rewritten from v2), the stretches listed in Realism notes. Each headline banner stays about 3 seconds; with ×2 speed some may pass quickly (all are in the journal and announced to screen readers).
4. The map shows the whole world in a tall box (lots of southern ocean on desktop); on phones the map is small and its icons are compact (names in their accessible labels and dialogs).
