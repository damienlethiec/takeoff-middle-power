# Takeoff: Middle Power v2 Changes Spec

Oct 25, 2026 · @Damien

## Summary

The first playable version works: the reveal, the superpowers' odds, the "not prepared" debrief and the card preview all landed. But players hit three walls, and the fixes below target them in this order:

1. **Too much at once.** Ten gauges, three hidden values, two currencies and eleven cards from the first minute.
2. **Choices feel weightless.** Most effects are hidden or delayed, events arrive without warning, so players cannot see why a choice matters or what it changed.
3. **The economy starves and repeats.** Budget runs out, Political Capital only comes from bubbles, and the same card can be bought again and again (one run bought the audit 8 times).

**Four principles for v2**

- **Progressive complexity.** Start with 4 indicators and 4 cards. Every new mechanic arrives with a story beat and a one-screen tip.
- **Telegraph, then reveal.** Every crisis is announced one or two quarters ahead as a visible risk, so preparing has a concrete reason. What stays hidden is how ready the AIs really are, not the existence of the threat.
- **Every decision shows its consequence.** Key effects on the card face, an advisor who explains the stakes, and a trajectory bar that moves when you act.
- **Fewer, sharper cards.** Use limits, cooldowns and levels instead of endless repeats; a few context cards that appear when the situation calls for them.

The work ships in five phases, each on its own branch with a playable preview, and merges only when tests, the balance simulation and the accessibility check pass. Phase 0 (bugs) starts first; the team's decisions are recorded at the end.

## Critical review of the feedback

Most of the feedback is right, and several points are confirmed in the code. A few need nuance, and one comes from a balance change we made ourselves.

**Our own mistake first.** After the first version, we removed the base Political Capital income so that concern bubbles would matter. Playtesters felt it immediately ("no quarterly PC increase", "our bot went broke without bubbles"). Political Capital will come automatically again in phase 3, and bubbles will explain public concern instead of paying out.

| Feedback | Verdict | Why | Phase |
| --- | --- | --- | --- |
| Too complex from the start; complexity should grow | **Agree** | 10 gauges and 11 cards on Q1 is the main barrier. Matches the handoff brief's 4 → 5 → 6 indicators | 1 |
| Live the first two years as a tutorial | **Nuance** | Eight of sixteen quarters as a tutorial is half the game. Proposed: 2027 is a guided first year, 2028 builds up, 2029–30 are the crises | 1 |
| Hard to see the concrete impact of actions and the reasons for choices | **Agree, top priority** | Confirmed: most card effects are hidden or only matter when an event fires, and events arrive unannounced. Fix with telegraphed threats, effects on card faces, an advisor and a moving trajectory | 2 |
| Choices don't visibly change the trajectory | **Agree** | The odds bar exists but is buried in the decision panel. Make it the always-visible heart of the screen | 2 |
| PC should come anyway; clicking a bubble could explain | **Agree** | Restore automatic income; bubbles become explanations of public concern, with no PC on click (team decision) | 3 |
| Few ways to reduce tension; coalition blocked at tension 70 | **Agree** | Confirmed: no card lowers tension directly. Coalition only cools tension from level 2. Add Diplomatic talks and a visible tension effect on the coalition | 3 |
| Same decision can be picked again and again | **Agree** | Confirmed: an audit was bought 8 times and the debrief repeated it 8 times. Use limits, cooldowns and levels | 0, 3 |
| No budget after a few turns; how to earn more? | **Agree** | Budget +1 per quarter against cards costing 2. Show next income, raise it, make the source explicit | 3 |
| Hide decisions that can't be made | **Agree, partly** | Hide cards not yet unlocked; keep unaffordable unlocked cards visible but clearly greyed, with "next quarter" or the reason | 1 |
| Real prices in euros, realistic numbers | **Nuance** | Gameplay needs small abstract units. Decided: costs stay abstract, with a sourced real-world cost line in the preview where one exists | 4 |
| Too much news; hard to see what's new | **Agree** | Group by quarter, highlight new items, collapse older ones | 4 |
| Feel pressure rising visually | **Agree** | Pressure on the map (tint, protests, alarms) and threshold markers on gauges | 2 |
| US–China tension is different from other criteria; useful? | **Keep, change its form** | It drives the "fight China" outcome and weight theft. Keep it among the four opening indicators, give it real tools (talks, coalition levels) and a stronger arc on the map | 1 |
| Goal and forecast unclear | **Agree** | Replace both with an advisor that recommends one action and says why | 2 |
| "If AI took off now" is unclear | **Agree on the wording, keep the idea** | It is the trajectory. Rename it "Where the superpowers are heading" and explain it once | 2 |
| Confirm button not always visible | **Agree** | Sticky action bar in the decision screen | 0 |
| Léa icon too small | **Agree** | Bigger labelled icon, plus her message history | 0 |
| Cut Q1 to 3–4 cards, effects on the card face | **Agree** | Core of phase 1 and 2 | 1, 2 |
| Shorter intro, "AI is grown, not built" framing | **Agree** | Two screens; avoid "alignment problem" jargon until a tip introduces it | 1 |
| Situation report: absolute levels, scoring, varied text | **Agree** | Confirmed: the report shows only deltas and the same lines every quarter | 0, 2 |
| Use recent sources (2025 or newer) | **Agree where it exists** | Keep a source when it is still the primary one (ASML's monopoly), add a recent one alongside | 4 |
| Getting to the first decision takes too long | **Agree** | "Next decision" cue, a skip-to-decision control and a shorter first quarter | 1 |

## Review of the Balance Spec v2 and the handoff brief

**The handoff brief (seven comments).** All seven are sound and we adopt them as written: information gains in previews (01), accurate causes (02), paused consistency (03), next-decision cue and skip (04), Léa's icon and history (05), 4 → 5 → 6 indicators (06), a way to reduce tension (07).

**The Balance Spec v2.** It is careful work, and its principles are better than our current economy. But it was written without the repository and describes an earlier 10-round model with different names, so implementing it literally would mean a second engine. We take its ideas, not its structure.

| Proposal | Decision | Reason |
| --- | --- | --- |
| Income +2 per quarter for both currencies, caps of 8, no debt | **Adopt** | Fixes budget starvation and gives a planning horizon. Caps stop hoarding |
| Use limits and cooldowns per card | **Adopt** | Fixes repeated cards. Combined with levels (phase 3) |
| Diplomatic talks: 2 PC + 1 Budget, tension −6, 3 uses, 2-quarter cooldown, needs tension 35+ | **Adopt** | Exactly what comment 07 needs; bounded so it cannot erase conflict risk |
| Coalition with an upfront cost and no upkeep; tension −8 when formed | **Adapt** | Keep our 3 levels (they light up partners on the map), drop the upkeep, show a tension drop at each level |
| Employment shocks at capability 40 and 70 | **Adopt** | Makes jobs and approval concrete, gives Léa and flexicurity a clear role |
| Secure infrastructure covers both theft and ransomware | **Decline** | We now have two separate cards (weight security, cyber shield); merging them would undo Louis's settled point |
| Safety estimate with a private offset after the AI Office | **Defer** | Elegant, but adds a concept at the moment we are cutting concepts. Revisit after the onboarding playtest |
| Hidden true alignment drawn at 45/55/65 | **Adopt** | Adds replay variety at no UI cost |
| 10 rounds instead of 16 quarters | **Decline for now** | Our acts structure (guided 2027, then build-up, then crises) needs the time. We shorten the clock instead (open question 1) |
| Rename the state (Influence, Funding, Treaty readiness...) | **Decline** | Same concepts, different words: we keep Political Capital, Budget and Verification readiness so the spec, tests and game stay in sync |
| Its balance numbers (Appendix B) | **Not reusable** | They validate the reference model, not our game. Our own simulation re-checks every change |

## Phase 0: bug fixes

No design change, ships first. Items marked **confirmed** were reproduced with the real engine (seed 5, auditing every quarter).

| # | Bug | Status | Fix |
| --- | --- | --- | --- |
| B1 | Report says "+1 Public pressure — AI adoption lifts GDP" | **Confirmed**: one drift entry carries both effects | One cause per effect: pressure "Growing public concern about AI", GDP "AI adoption lifts growth" (handoff 02) |
| B2 | Situation report identical every quarter | **Confirmed**: Q1 2027 to Q1 2028 print the same lines | Show absolute levels next to deltas, group routine drift under "Background", lead with what is new this quarter |
| B3 | Same audit bought 8 times; debrief repeats it 8 times | **Confirmed** (7 times in our run) | Interim cap: measure once per 3 quarters; debrief groups repeats ("Measured human influence ×3"). Full limits in phase 3 |
| B4 | Ending text hedges ("nobody could check, or the AIs…, or…") | **Confirmed** | Build the ending text from the conditions that actually failed in this run |
| B5 | Coalition preview shows "+12% verified slowdown" when tension is 70+ and it cannot be played | To reproduce | Locked cards show the lock reason, not a preview of odds |
| B6 | "Next quarter upkeep" shown on the last decision | To reproduce | Hide future-quarter notes when no quarter follows |
| B7 | AI Office preview says "No visible change" | **Confirmed** (handoff 01) | List information gains from the real effect: error bars ±10 → ±5 and ±15 → ±5, number of notes unlocked now |
| B8 | Capability 23 on the dashboard, 24 in its panel when paused | To reproduce | Gauges animate during the clock; panel and tile must read the same settled value (handoff 03) |
| B9 | Confirm button off-screen on smaller screens | To reproduce | Sticky action bar (Confirm, Pass) always in view |
| B10 | Stray "████" in the intro, nested scrollbars, unlabelled buttons | Re-check | Part may already be fixed by the accessibility pass; fix what remains |
| B11 | Léa's icon too small | **Confirmed** | Labelled "Léa" icon, 44 px target, opens her full message history (handoff 05) |

## Phase 1: onboarding and progressive complexity

**Two-screen intro.** Screen 1: the world in 2027, with the "AI is grown, not built" framing (nobody writes these systems line by line; they are grown from data, and what they learn is hard to check). Screen 2: your role, the two currencies, and how a quarter works. The words "alignment" and "true alignment" wait for the first tip that needs them. Returning players can skip straight to Q1.

**First decision fast.** Q1's clock lasts 5 seconds instead of 10. A permanent cue reads "Next decision: end of quarter", with a "Skip to decision" button that runs the same quarter faster through the same steps (no extra rewards; uncollected bubbles are lost, and the button says so).

**Three acts.** Complexity grows with the story, not with the calendar alone: each act opens on a story beat that justifies the new mechanic.

| Act | Opens when | New indicators | New cards | What the player learns |
| --- | --- | --- | --- | --- |
| 1. A seat at the table | Start (2027) | Capability, Apparent alignment, Verification readiness, Tension | AI Office capacity, Offer to host verification, Diplomatic talks, Fund alignment research | The clock, one decision per quarter, preparing before a crisis, that labs' safety reports may not be the truth |
|  | Partners call Brussels (Q2) | Coalition (from the first level) | Middle-power coalition | Allies make a deal more likely and cool tension |
|  | Intelligence warns that labs' networks are being probed | — | Weight security standards | A telegraphed threat and how to prepare for it |
| 2. The race goes public | First wave of AI layoffs (capability 40) | Public pressure | Flexicurity reform, Use the ASML lever | Pressure brings Political Capital; jobs and approval |
|  | First AI-enabled cyberattack in the news | Misuse risk (replaces the least relevant one if the cap is reached) | Fund open-weight models, Cyber shield | Openness against misuse |
| 3. Who decides? | Léa's Q6 letter or a story on AI running firms | — (human influence stays hidden) | Measure human influence, Human oversight mandate | GDP can rise while people lose control |

**Indicator cap (handoff 06).** 4 indicators in act 1, 5 from the first new indicator, 6 at most. GDP and Approval move to a compact line under the currencies. Everything else stays in a "More indicators" drawer. Indicators keep their positions, never reshuffle during a choice, and each new one arrives with a one-line "why it matters now".

**Cards.** Cards not yet unlocked are hidden. A new card arrives with a "New" badge and a one-line reason ("Unlocked because partners are calling"). Unlocked but unaffordable cards stay visible, greyed, with "Affordable next quarter" or the missing amount.

**Tips.** At most one tip per quarter, each a single screen tied to what just happened. All tips, past situation reports, events and Léa's letters are re-readable in a Journal. A "Tutorial on/off" setting for returning players.

## Phase 2: make decisions and their consequences visible

This is the phase that answers "I can't see what my choices do". It changes no rule, only what the player can see and understand.

**1. Risk track: telegraph every crisis.** A "Risks" strip on the main screen lists each crisis once it becomes possible, with three stages driven only by public values:

| Risk | Appears when | Stages (Watch → Rising → Imminent) follow | Shows "Prepared" when |
| --- | --- | --- | --- |
| Model theft | Intelligence notes probing (tension 40+) | Tension and capability approaching 50 / 40 | Weight security standards |
| AI incident (warning shot) | Capability 50 | Capability approaching 65 | Coalition and verification 30+ |
| Opaque reasoning | Capability 55 | Capability approaching 70 | AI Office capacity |
| Silicon blackmail | Human oversight mandate played | Concentration approaching 60 | Open models funded |
| Ransomware wave | Misuse 25 | Misuse approaching 40 | Cyber shield |

The warning shot also depends on true alignment, which stays hidden: the risk shows "Possible", never "Certain". Preparing becomes a visible, concrete reason to pick a card.

**2. Card faces show their effect.** Each card shows its cost, one or two effect chips ("Tension −6", "Verification +15"), a "Prepares for: Model theft" tag when relevant, and "+ hidden effect" when it has one. The preview keeps the full detail, including information gains such as narrower error bars and notes unlocked (handoff 01).

**3. An advisor instead of Goal and Forecast.** One short recommendation per quarter, with its reason and an alternative: "China is probing lab networks. Weight security standards would make a theft fail. Alternative: talks to cool tension first." It reads only what the player could know, and it can be ignored. It explains, it does not play for you.

**4. The trajectory, always in view.** "Where the superpowers are heading" becomes a slim bar at the top of the screen (verified slowdown, shut down, fight, race). After each decision it animates and labels the change: "Verified slowdown +6%: you hosted inspections." A first-time tip explains it once: if AI starts improving itself, this is what the US and China would probably do.

**5. Pressure you can feel.** On the map, protest markers over Europe grow with public pressure, the US–China arc thickens and reddens with tension, glitch markers appear with misuse. Gauges show threshold ticks with their meaning (capability 80 "AI improves itself", pressure 50 "+1 PC per quarter", tension 60 "the race speeds up"). Crossing a threshold triggers a short alert.

**6. A situation report that tells a story.** It opens with the 1–3 things that matter this quarter, with absolute levels ("Tension 58, +4: China accused OpenBrain of espionage"), then the risks that moved, then the trajectory change. Routine drift is folded under "Background". Sentences come from varied templates and every number has its real cause (bug B1).

**7. Consequences told back.** The briefing after a card says what changed now and what it will matter for ("Ready if a theft is attempted"). When an event fires, the screen names the decision that prepared you, or the one that was missing.

## Phase 3: economy and deck rework

All numbers below are starting values, tuned with the simulation before merging.

**Income you can plan with.** The header always shows next quarter's income and why ("+2 Budget · +1 PC, +1 because public pressure is high").

|  | Now | v2 |
| --- | --- | --- |
| Budget | Start 3, +1 per quarter | Start 5, +2 per quarter, cap 8 |
| Political Capital | Start 6, no base income, +1 if pressure 50+, bubbles +1 (max 2) | Start 4, +2 per quarter, +1 if pressure 50+, −1 if approval below 30, cap 8. All automatic |
| Concern bubbles | Only source of PC | No PC on click. They show where concern is rising on the map; clicking one explains it in one line ("Teachers in Lyon worry AI tutors will replace them") |
| Coalition upkeep | 1 PC per level every quarter | None: each level costs more upfront |

**No more endless repeats.** Every card has a use limit. Cards that make sense several times become levels with their own name and rising cost.

| Card | Cost | Limit | Change |
| --- | --- | --- | --- |
| Middle-power coalition | 3 / 4 / 5 PC | 3 levels | No upkeep; tension −4 at each level, shown on the card; level 2+ still cools tension every quarter |
| Diplomatic talks (**new**) | 2 PC + 1 Budget | 3 uses, 2-quarter cooldown | Tension −6; needs tension 35+. Bounded: it slows escalation, it cannot remove conflict risk |
| Offer to host verification → Inspection accord → Joint inspectorate | 2 Budget + 1 PC / 3 Budget / 3 Budget + 1 PC | 3 levels | Same verification effect per level (+15 with AI Office, +7 without); level names tell the story |
| Fund alignment research | 2 / 3 / 4 Budget | 3 uses | Diminishing returns: hidden +6 / +5 / +4 |
| Measure human influence | 1 Budget + 1 PC | 2 uses, cannot stack | Lasts 3 quarters |
| Use the ASML lever | 2 PC + a token | 2 tokens | Unchanged |
| AI Office, open models, oversight mandate, flexicurity, weight security, cyber shield | Unchanged | Once | Unchanged |

**Context cards: opportunities that come and go.** Two cards appear only when the situation creates them, for two quarters, then disappear. They make choices depend on the moment, as testers asked.

- **Emergency inspection summit** (after a prepared warning shot; 2 PC): verification +10 and a bigger push towards a verified slowdown. The world is listening; use the window.
- **Joint attribution with allies** (after a model theft, needs a coalition; 1 PC): tension −5 and no US export-control escalation this time.

**Concrete social effects.** Employment shocks when capability first reaches 40 and 70: approval −5 and public pressure +5, softened to approval −2 by flexicurity (from the Balance Spec v2). Jobs, approval, Léa and pressure become one visible story.

**Replay variety.** True alignment starts at 45, 55 or 65 (hidden), so the same choices don't always lead to the same ending.

## Phase 4: readability, sources and realism

**News you can follow.** Both feeds open on "This quarter": at most three items, new ones marked, the rest behind "More". Earlier quarters fold under their date. Internal notes get an unread count, and the redacted style is redrawn so it no longer looks like stray characters.

**Recent sources.** Every "Already real" fact and every opening fact gets a 2025-or-later source where one exists. When the primary source is older but still the right one (the alignment-faking paper, ASML's monopoly), we keep it and add a recent confirmation next to it. Every new citation goes through the same fact-check as the first version (primary source, quoted claim, date checked).

**Euros: our recommendation.** Real prices on every card would add false precision: the game's costs mix money, political attention and time, and the real price of "hosting verification" does not exist yet. Decided: abstract Budget and PC stay on cards, and the preview adds a "What this costs in the real world" line only where a sourced figure exists (for example, the EU's actual spending on AI factories or the AI Office's staffing). This keeps the game honest and still grounds it.

## Validation and shipping

**Order.** Phase 0 first. Then phase 3 (engine and economy) and phase 2 (what the player sees) in parallel, since they touch different code. Phase 1 (acts and unlocks) builds on both. Phase 4 last.

**Each phase** lives on its own branch with a playable preview, and merges only when unit tests, the end-to-end games, the accessibility check and the balance simulation pass. Balance changes are recorded with old value, new value and reason in the Developer notes.

**Balance targets (simulation, 2,000 games per strategy)**

| Measure | Target |
| --- | --- |
| Good endings, passive player | Below 20% |
| Good endings, random player | 15–35% |
| Good endings, prepared player | Above 60%, below 90% (winning should take thought) |
| Every ending reachable | At least 1% for some strategy |
| Card variety, prepared player | No card above 25% of its decisions |
| Talks strategy | Average tension at the tipping point at least 10 points lower than without, and "fight China" still possible |
| Money | A prepared player is short of resources for the card it wants at most twice per game |

**Player targets (three people who have never played)**

- First decision within one minute of pressing Start.
- A full game in about 15 minutes.
- Each can name one decision that changed the superpowers' trajectory, and explain in their own words why their ending happened.

**Roles.** Damien iterates on the game. Marcin reviews the economy and diplomacy numbers. Louis reviews texts, events, risk warnings and Léa. The launch post (what we built, why, how to play, what changed after the playtests) runs in parallel.

## Team decisions (25 Oct)

1. **Game length:** 16 quarters, with a shorter first clock and a "Skip to decision" button.
2. **Costs:** abstract Budget and PC on cards, plus a sourced "real-world cost" line in the preview where a real figure exists. No euro prices on cards.
3. **Coalition:** three levels with an escalating cost and no upkeep (partners keep lighting up on the map).
4. **Tension:** stays one of the four opening indicators, as the handoff brief asks, and gets a stronger form on the map: the US–China arc thickens and reddens as it rises. Now that the player has tools to lower it (Diplomatic talks, coalition levels), hiding the number would hide the effect of those tools.
5. **Tutorial:** one tip per quarter during 2027, then one at each new mechanic. No separate tutorial mode.
6. **Safety estimate after the AI Office:** revisit after the onboarding playtest.
7. **Political Capital:** comes automatically every quarter. Concern bubbles no longer give PC on click: they show where public concern comes from, and clicking one explains it.
