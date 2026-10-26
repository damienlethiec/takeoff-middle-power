# Takeoff: Middle Power v3 Spec

Oct 26, 2026 · @Damien

## Why v3

**Audience and goal.** The game is for the general public. Its job is to raise awareness: after 10 minutes, a player should understand that AI is advancing fast, that safety, cooperation between superpowers and a society that holds together all matter, and that a middle power like Europe has real but limited levers.

**What went wrong.** v1 and v2 built a policy simulator for strategists, then added explanation on top of it: an advisor, a risk strip, the meaning of each level, tips. Players still had to read 10 indicators, 3 hidden values, 2 currencies and 13 levelled cards. Each pass made the screen more crowded. v3 simplifies the core instead of explaining it.

**Principles**

1. **One model on screen.** An AI clock, a cooperation heading and two pillars. The gauges are also the endings: what you see is what decides.
2. **A balancing act.** Every card helps something and costs something else, visible at a glance.
3. **Feel it.** Threats grow on the map, events hit the gauges in front of you, headlines appear where things happen.
4. **Learn by playing.** The intro sets the stakes and the goal; each part of the screen is explained the first time it matters.
5. **Clear endings.** Every ending says in one sentence which gauge decided it and by how much.

**What stays.** The EU seat, the US–China race, the ten CFG endings, Léa, real sources, accessibility, the tests, the simulation and the deployment.

## The model

The whole game state the player sees fits in five things. Numbers below are starting values, tuned with the simulation.

| On screen | What it is | How it moves |
| --- | --- | --- |
| **AI power** (the clock) | How close AI is to the **tipping point**: the moment it can do AI research by itself. Tipping point at 80 | Rises every round at a pace drawn at the start (slow, steady or fast, hidden until the end). A few cards and events nudge it. No tipping point before round 6 |
| **Cooperation** (the heading) | Trust between the US and China. Three zones: **Pause** (60+), **Race** (30–59), **Rupture** (below 30). The zone at the tipping point sets the kind of world | Slides down each round as the race heats up; diplomacy lifts it, pressure tactics lower it |
| **Confidence in AI** (pillar) | How far we can trust the AI systems: an **estimate with a margin**, e.g. 62 ± 15. The true value always lies inside the margin and is revealed at the end | Labs' reports push the estimate up; safety work raises the true value; oversight narrows the margin |
| **Cohesion** (pillar) | Whether European society holds: jobs, trust in institutions, misuse, who holds power | Erodes as AI disrupts work; social and security measures lift it |
| **Europe's AI** (badge on the map) | **Open** or **Dependent**: does Europe run models it controls, or rely on a few big labs? | Flips with specific cards (funding open models makes it Open; deals with big labs make it Dependent). Starts Dependent |

**Time.** 12 rounds of six months, from early 2027 to late 2032. The game ends at the tipping point, or after round 12 if AI never gets there.

**One resource: Influence.** It replaces Budget and Political Capital. You earn it every round, and how much depends on your position: +2 base, +1 when Cohesion is 60+ (the public backs you), −1 when Cohesion falls below 35 (crisis at home), +1 from coalition level 2 (allies share the load). Cap 10. The counter always shows next round's income and why. Every card costs 1 to 4. You can play **as many cards per round as your Influence covers** (v4: the two-card limit is gone), each card once, so spending is itself a choice.

**The confidence margin** keeps the game's core lesson without a ghost value on screen. You never know exactly how trustworthy the AIs are; you only know a range. Investing in oversight narrows it. To be safe, keep the whole range above the target, not just the middle.

**The heading line.** One sentence under the gauges, updated every round, tells the player where the world is going and what will decide it: *Heading: Race. Goal: Confidence 75 (you: 62 ± 15).* Hovering a card shows how it would change that sentence.

## The ten endings

The ten endings are the CFG's, unchanged. Two questions pick the world; in each world, **one gauge decides** whether it goes well, and the other pillar acts as a **safety net** that must not collapse.

> **Numbers.** The zones, targets and floors below are the current values of `TUNING.zones` and `TUNING.worlds` in `src/data/tuning.ts`, which is the source of truth (the first draft had Pause 65 and Rupture 85; the simulation moved them, see the tuning tables in [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md)). Where this v3 spec and [V4_SPEC.md](V4_SPEC.md) differ (Confidence is now *AI safety*, shown as verified–claimed), v4's spec supersedes.

```
End of the game (tipping point reached, or after round 12)
├─ Tipping point reached → Cooperation zone at that moment
│   ├─ Pause (Cooperation 60+)      Decides: Confidence 60+  Safety net: Cohesion 42+   ✓ Licensed utopia      ✗ Unstable pause
│   ├─ Race (Cooperation 30–59)     Decides: Confidence 62+  Safety net: Cohesion 47+   ✓ Cognitive revolution ✗ Loss of control
│   └─ Rupture (Cooperation < 30)   Decides: Cohesion 82+    Safety net: Confidence 60+ ✓ Multipolar world     ✗ Hot war
└─ AI plateaus → Europe's AI badge
    ├─ Open                         Decides: Cohesion 60+    Safety net: Confidence 40+ ✓ A bright winter      ✗ Decentralised mayhem
    └─ Dependent (big labs)         Decides: Cohesion 60+    Safety net: Confidence 40+ ✓ The agent economy    ✗ Silicon blackmail
```

**How to read it.** At the tipping point, the cooperation zone sets the world: the superpowers pause, race or break apart. If AI never reaches the tipping point, Europe's AI badge sets the world. Then the deciding gauge must reach its target and the safety net its floor; if either fails, the bad ending of that world follows.

**Why these targets.** The calmer the world, the easier a good ending: a plateau is the least dangerous world, a rupture the most. Getting the superpowers to cooperate is rewarded twice: a lower bar and a better ending. Targets are ambitious but the gauges are lively, so a good game can reach them. All numbers are tuned with the simulation (26 Oct rebalancing: Pause 60 / 42, Race 62 / 47, Rupture 82 / 60, against AI safety's true value).

| World | Good ending if | Otherwise | What the bad ending tells |
| --- | --- | --- | --- |
| Plateau, open | Cohesion 60+ and Confidence 40+ | *Decentralised mayhem* | Powerful tools in everyone's hands, misused or unreliable |
| Plateau, big labs | Cohesion 60+ and Confidence 40+ | *Silicon blackmail* | A few labs hold the keys and nobody can check them |
| Pause | Confidence 60+ and Cohesion 42+ | *Unstable pause* | A pause nobody can verify, or that society rejects |
| Race | Confidence 62+ and Cohesion 47+ | *Loss of control* | Untrustworthy AI, or people losing their grip on an AI-run economy |
| Rupture | Cohesion 82+ and Confidence 60+ | *Hot war* | No strong Europe to mediate, or an AI incident that escalates |

**Every ending explains itself in one sentence**, built from the gauge that decided it: *"The superpowers raced. Confidence was 62 ± 8, below the 75 a race needs: loss of control."* A little randomness near the zone borders and at the tipping point keeps suspense, never more than a few points.

## The cards

**Rule: every card helps something and costs something else.** Besides its Influence price, each card has at least one visible downside: a gauge going down, a threat growing, or less Influence in the next rounds. No card is "free", none is useless.

**On the card face (the index)**, at a glance: name, Influence cost, green chips for what goes up, red chips for what goes down, and a "Protects against" tag when it prepares for a threat. Example: *Flexicurity reform · 4 Influence · Cohesion +10 · Influence −1 for 2 rounds · Protects against job shocks.*

**Opening a card** shows the full proposal: what Europe would actually do (≤ 60 words), a real-world example with its source, a sourced real-world cost line where one exists, and its levels if it has any. The preview shows each change as before → after ("Cooperation 48 → 56") and how the heading line would change.

**As many cards per round as your Influence covers** (v4), each once. The chief of staff (advisor) appears only on this screen, with one recommendation and its reason.

**The deck** (first draft, to tune; 12 cards plus 2 opportunities):

| Card | Cost | Goes up | Goes down | Uses | Arrives |
| --- | --- | --- | --- | --- | --- |
| Diplomatic talks | 2 | Cooperation +8 | Cohesion −3 (seen as soft on rivals) | 3, one round of rest | Round 1 |
| Offer to host inspections → Inspection accord → Joint inspectorate | 3 | Confidence +8, margin narrows | Cooperation −4 (Beijing sees pressure) | 3 levels | Round 1 |
| AI Office capacity | 3 | Confidence margin halved; inspections stronger | Cohesion −2 (money diverted) | Once | Round 1 |
| Fund alignment research | 3 | True Confidence +6 (estimate +2) | Cohesion −2 | 3 | Round 2 |
| Middle-power coalition | 3 / 4 / 5 | Cooperation +6 | Cohesion −2 (compromises with partners) | 3 levels | Round 3 |
| Independent audit | 2 | Shows the true Confidence for 2 rounds | No gauge gain: you spend a turn learning | 2 | Round 4 |
| Use the ASML lever | 2 | Safety concession: Confidence +10, or model access: Cohesion +8 | Cooperation −12 | 2 | AI power 35 |
| Weight security standards | 2 | Protects against model theft | Europe's AI → Dependent, Cohesion −2 | Once | When the theft threat appears |
| Fund open models | 3 | Europe's AI → Open, Cohesion +6 | Confidence −6, misuse threat grows | Once | First job shock |
| Flexicurity reform | 4 | Cohesion +10, softens job shocks | Influence −1 for 2 rounds (unions) | Once | First job shock |
| Cyber shield for hospitals and grids | 3 | Protects against the ransomware wave, Cohesion +3 | Influence −1 for 2 rounds | Once | When the ransomware threat appears |
| Human oversight mandate | 3 | Cohesion +6, AI power −2 | Silicon blackmail threat appears | Once | Round 6 |
| *Emergency inspection summit* | 2 | Cooperation +10, Confidence +5 | — (an opportunity) | 2 rounds only | After an AI incident you were prepared for |
| *Joint attribution with allies* | 1 | Cooperation +5, no US escalation | — (an opportunity) | 2 rounds only | After a model theft, with a coalition |

Cards appear progressively: three in round 1, then one or two at a time when the story makes them relevant, each introduced by the tutorial the first time.

## Threats and events on the map

**Threats grow where they would strike.** An alert icon appears on the map where a crisis is brewing and grows in three stages (watch, rising, imminent), each announced by a headline. The gauge it would hit carries a small marker of the expected damage ("Cohesion −15 if unprepared"), which turns green once you are protected. Clicking the icon explains the threat and points to the card that protects against it. Stages follow public values only.

| Threat | Where on the map | Grows with | Protected by | If unprepared | If prepared |
| --- | --- | --- | --- | --- | --- |
| Model theft | China | Low cooperation, rising AI power | Weight security standards | AI power +5, Cooperation −15 | Theft fails: Cooperation −3 |
| AI incident (an AI tries to escape) | A US lab | AI power above 50 (the timing also depends on hidden safety, so it shows as "possible") | Coalition and Inspection accord (level 2) | Confidence estimate −10 (the truth leaks), Cohesion −5 | The world rallies: Cooperation +10, and the *Emergency inspection summit* opportunity |
| Opaque reasoning | US and Chinese labs | AI power above 55 | AI Office capacity | Confidence margin doubles | Margin unchanged |
| Ransomware wave | Europe | Open models and AI power | Cyber shield | Cohesion −15 | Cohesion −3 |
| Silicon blackmail | Europe | Human oversight mandate while Europe's AI is Dependent | Fund open models (Europe's AI Open) | Give in (Europe's AI locked Dependent) or hold firm (Cohesion −10) | Europe stands firm at no cost |

**Job shocks** are events without a threat stage: when AI power first reaches 40 and 70, a wave of layoffs hits Cohesion (−8, or −3 with flexicurity). They are announced on the map over Europe.

**When an event strikes**, the icon bursts on the map (a short animation, reduced-motion friendly), then a **Breaking news** screen shows the headline, a two-line scene, the impact on each gauge (before → after), whether you were prepared and by which card, and an "Already real" fact with its source.

**News inside the map, not beside it.** The side feeds go. Each round, one or two headlines appear as banners near where they happen, and public concerns float as short voices over the regions ("Teachers in Lyon worry about AI tutors"); both are kept in the round's journal. Internal notes become rarer **leaks**: a dramatic moment every two or three rounds that hints at the gap between what labs say and the truth. The more you invest in oversight, the more leaks you can read.

## A round, and the main screen

**A round, step by step**

1. **Influence arrives** (between +1 and +4 depending on your position, with the reason shown on the counter).
2. **Six months play on the map** in about 8 seconds: AI power ticks up, threats grow, headlines and public voices appear where things happen. An event stops the clock for its Breaking news screen.
3. **The clock stops and the player takes the lead.** Two buttons: **See what changed** (the report, on demand) and **Make my decisions**. Nothing opens by itself.
4. **The report**, when opened, fits on one screen: the heading line, at most three changes with their real cause ("Cooperation 52 → 47: China accused OpenBrain of espionage"), and the threats that moved. Routine drift is not listed.
5. **The decision screen**: the hand, the chief of staff's recommendation, as many cards as your Influence covers, then Confirm.
6. **Consequences on the map**, once: gauges move, partners light up, the US–China arc tightens or relaxes, a threat icon turns green, and the heading line updates with a short reason. This is the only recap: no second summary screen.

**The main screen** keeps four things only:

- **The map**, large: threat icons, headline banners, public voices, Europe's AI badge, coalition partners, the US–China arc and Léa's portrait over Lyon.
- **The gauges**: the AI power clock with its tipping point at 80, then Cooperation (with its three zones), Confidence (estimate and margin) and Cohesion, each with the target of the current world marked on it.
- **The heading line** under the gauges: *Heading: Race. Goal: Confidence 75 (you: 62 ± 15).*
- **The header**: date and round ("H1 2028 · Round 3 of 12"), Influence, the journal and help buttons.

GDP, approval, misuse, concentration and verification no longer appear as numbers: they live inside the pillars, the threats and the headlines.

## Intro, tutorial and Léa

**Intro: two screens, then play.**

1. **The world today.** AI is grown, not built: nobody writes these systems line by line, and what they learn is hard to check. They are improving fast. Three stakes, in plain words: will AI do what we intend, will the superpowers race or talk, will our societies hold? One or two real facts with recent sources.
2. **You.** You are the EU's AI Envoy. Europe cannot stop the race, but it can shape it with Influence and policies. **Your goal:** when AI reaches the tipping point, have AI we can trust, superpowers who talk, and a society that holds. The calmer the world, the easier a good ending. A **Skip** button takes returning players straight to round 1.

**Tutorial at first use.** No front-loaded manual. Each element is explained the first time it matters, with a short coach mark pointing at it, one at a time: the clock and the tipping point, Influence, the first card and its chips, the heading line, the Cooperation zones, the Confidence margin, the first threat icon, the first Breaking news, Europe's AI badge, the first leak, playing several cards in a round. The tutorial can be switched off, and every tip stays readable in the journal.

**Léa.**

- **A portrait**: an original illustrated character, never a photo of a real person, with a few expressions (hopeful, worried, relieved) matching her mood. Her portrait sits on the map over Lyon and opens her letters.
- **Letters at rounds 1, 4 and 8, and at the end.** Each depends on the state of the world (Cohesion, job shocks, the world reached) and comes in **several variants picked at random**, so two games don't tell the same story.
- **A rewrite of her voice**: first person, short, concrete details of her life as a translator in Lyon, no policy jargon, and an ending letter that always matches the ending reached. Louis reviews every variant.

## The end screen

The player must leave knowing why the story ended this way and what would have changed it.

1. **The ending**: its name, a short story of the world in 2032, and Léa's last letter.
2. **Why, in one sentence**, from the gauge that decided: *"The superpowers raced. Confidence was 62, below the 75 a race needs: loss of control."*
3. **The four gauges at the end**, with the world's target and floor drawn on them, so the decisive gap is visible.
4. **The reveal**: the true Confidence next to the estimate the player saw ("you saw 70 ± 15, the truth was 58"), the AI pace that was drawn, and the leaks you could not read.
5. **What would have changed it**: the one or two choices with the biggest effect, e.g. *"With Cooperation above 60 at the tipping point, the superpowers would have paused, and Confidence 68 would have been enough."*
6. **Your decisions, in order**, each with its plus and minus, and the threats you were or were not ready for.
7. **Play again**, with a different AI pace and different Léa letters.

## What we keep and what we remove

| Keep | Change | Remove |
| --- | --- | --- |
| The map and its look, the EU seat, OpenBrain and DeepCent | 16 quarters → 12 rounds of six months | GDP, Approval, Misuse, Concentration, Verification and Public pressure as separate numbers |
| The ten CFG endings | Budget + Political Capital → one Influence, up to 2 cards per round | The "Where the superpowers are heading" bar (the Cooperation zones replace it) |
| The five crises with prepared and unprepared versions | Hidden true alignment → Confidence estimate with a margin, truth revealed at the end | Side news and internal-notes columns (replaced by headlines on the map and leaks) |
| Léa, real sources and the fact-check process | Risk strip → threat icons on the map and markers on gauges | The automatic report and the second recap after a decision |
| Accessibility, tests, simulation, previews per branch | Advisor only in the decision screen | Acts, the 4 → 5 → 6 dashboard and the many hidden-value placeholders |
| The journal, the help, the tutorial switch | Tips at first use instead of one per quarter | Card levels everywhere (kept only for inspections and the coalition) |

The engine is rewritten around the new model; the UI shell, map, accessibility layer, content pipeline and test infrastructure are reused. The v2 game stays online on `main` until v3 is validated by playtests.

## Realism

The game must stay close to the scenarios it is built on: **AI 2027** for the story (OpenBrain, DeepCent, the stolen weights, AI that speeds up AI research, warning signs of misalignment) and **CFG, Advanced AI: Possible Futures** for the worlds and what drives them. Players should leave with an accurate picture of these projections, not with a game invention.

- **Every card, event, threat and headline says where it comes from.** A `basis` field in the data: `ai2027`, `cfg` or `real`, with a precise reference ("AI 2027, theft of the model weights, early 2027"). A test fails on any content without a basis. Game devices (thresholds, costs, the safety-net rule) are not content and need none.
- **Milestones come in AI 2027's order; their dates may vary** with the hidden AI pace. A milestone can arrive earlier or later than in the scenario, never out of order. The build takes the sequence from the AI 2027 text itself, not from memory.
- **Effects follow the scenarios' cause and effect.** A theft speeds up the race and lowers Cooperation; warning signs of misalignment lower Confidence once they are public; the worlds and what decides them follow the CFG drivers. The size of an effect is a game choice tuned by the simulation; its direction is not.
- **Realism notes.** The build notes list every place where the build interpreted or stretched the scenarios, for Louis and the fact-check to review.

## Validation

**Simulation targets** (2,000 seeded games per strategy):

| Measure | Target |
| --- | --- |
| Passive player, good endings | Below 15% |
| Random player, good endings | 15–30% |
| Thoughtful player, good endings | 55–80% |
| Every one of the 10 endings | Reached in at least 2% of games by some strategy |
| Cooperation-only strategy | Clearly worse than a balanced one (no single dominant strategy) |
| Card variety, thoughtful player | No card above 20% of its plays |
| Game length | 12 rounds, or the tipping point from round 6 on |

**Playtests with the target audience**, before any polish: five people who know little about AI safety, playing alone without help. We watch and note where they hesitate, then ask four questions:

1. In your own words, why did your game end this way?
2. Name one decision that changed the outcome.
3. What is the tipping point, and why does it matter?
4. What surprised you about AI safety?

**Success:** at least four of five answer 1 and 2 correctly, a game takes about 10 minutes, and the first decision comes within one minute of pressing Start.

## Open points

1. **Influence numbers**: base income and its modifiers (+2 base, Cohesion 60+ / below 35, coalition level 2), cap (10?) and card costs, to settle with the simulation and Marcin.
2. **The deck**: the twelve cards above are a first draft. Louis to review names, texts and the plus/minus of each against his original deck.
3. **Léa's portrait**: illustration style and who draws it (an illustrator, or a simple stylised avatar we make ourselves).
4. **Europe's AI badge**: can it flip back to Dependent after funding open models (for example, if silicon blackmail is given in to)?
5. **Real facts in the intro**: the content team picks one or two recent, primary-sourced facts for each intro screen.
6. **Build plan**: once this spec is approved, v3 is built on its own branch (`v3`) with its preview, then playtested before replacing `main`.
