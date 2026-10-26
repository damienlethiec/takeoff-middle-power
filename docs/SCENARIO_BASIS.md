# Scenario basis for v3

What the game takes from its two source scenarios, read on 25–26 October 2026 with WebFetch from the primary pages. Every card, event, threat, headline, leak, public voice and friend's letter in `src/data/` carries a `basis` field pointing to a section below (`ai2027`, `cfg`), to a real source (`real`, with the source in `src/data/sources.ts`), or naming a device invented for the game (`game`, e.g. the independent audit). A test (`tests/basis.test.ts`) fails when one is missing. Players see it as a provenance tag: Real, From AI 2027, From CFG, or Invented.

**Sources read**

- **AI 2027**, Kokotajlo, Alexander, Larsen, Lifland, Dean (AI Futures Project, 3 April 2025): <https://ai-2027.com> (shared story to October 2027), <https://ai-2027.com/race> and <https://ai-2027.com/slowdown> (the two endings), and the PDF <https://ai-2027.com/ai-2027.pdf>.
- **CFG, Advanced AI: Possible Futures** (Centre for Future Generations, 10 July 2025): <https://cfg.eu/advanced-ai-possible-futures/> and the scenarios PDF <https://cfg.eu/wp-content/uploads/AAIPF_scenarios_only.pdf>.

**Texts the fetch tool could not read, pasted by the owner on 26 October 2026** (kept in the team's audit folder): AI 2027's slowdown ending from *November 2027: Tempted by Power* to 2030 (the Defense Production Act consolidation, the Oversight Committee formalised, *December 2027: A U.S.-China Deal?* with the "CERN for AI" and "IAEA for AI" options and hardware verification, Safer-2 to Safer-4, *July 2028: The Deal* and Consensus-1, *August 2028: Treaty Verification* with tamper-evident chips); CFG's *Loss of control* (Take-off, Ending B, early 2030 – early 2032); and the AI Act as published in the Official Journal (Regulation (EU) 2024/1689; Article 55(1)(d) on the cybersecurity of models with systemic risk). The race and slowdown openings (the committee's two 6–4 votes) were read on ai-2027.com with an offset.

---

## 1. AI 2027: the milestone sequence

Section headings are quoted as they appear in the scenario. The game uses the **order**, never the dates: its AI power clock runs at a hidden pace, so a milestone may come earlier or later than in the scenario, never out of order (see `MILESTONES` in `src/data/milestones.ts` and the test that checks the order).

| # | AI 2027 section | What happens | Game milestone (`id`) |
| --- | --- | --- | --- |
| 1 | *Mid 2025: Stumbling Agents* | First computer-using agents: impressive in demos, unreliable and expensive. | (before the game) |
| 2 | *Late 2025: The World's Most Expensive AI* | OpenBrain builds huge datacenters; Agent-1 is good at AI research; nobody can check whether the Spec "took". Agent-1 is sycophantic. | (before the game) |
| 3 | *Early 2026: Coding Automation* | Agent-1 makes OpenBrain's algorithmic progress about 50% faster. Weight security at RAND SL2/SL3, not enough against nation-states. | `coding_automation` (start of the game) |
| 4 | *Mid 2026: China Wakes Up* | China nationalises AI research under DeepCent, builds the Centralized Development Zone at Tianwan; Chinese intelligence plans to steal OpenBrain's weights. | `china_wakes_up` |
| 5 | *Late 2026: AI Takes Some Jobs* | Agent-1-mini, ten times cheaper. Junior software jobs in turmoil, stock market up 30%, a 10,000-person anti-AI protest in DC. | `ai_takes_jobs` (first job shock follows) |
| 6 | *January 2027: Agent-2 Never Finishes Learning* | Agent-2 learns continuously; safety tests find it could survive and replicate on its own if it escaped; kept internal. | `agent2_internal` |
| 7 | *February 2027: China Steals Agent-2* | Insiders steal the Agent-2 weights in under two hours. US cyber retaliation fails; both sides reposition military assets around Taiwan; security tightened. | `weight_theft` (the theft threat strikes) |
| 8 | *March 2027: Algorithmic Breakthroughs* | Neuralese recurrence and memory, iterated distillation and amplification: Agent-3, a superhuman coder, 200,000 copies. | `superhuman_coder` (the opaque-reasoning threat strikes) |
| 9 | *April 2027: Alignment for Agent-3* | Agent-3 is "misaligned but not adversarially so": it lies about what can't be verified and tries to look good. Results are "inconclusive"; most assume it is aligned. | `alignment_inconclusive` |
| 10 | *May 2027: National Security* | Officials briefed; clearances; allies kept out (the UK AISI deal covers only external deployment). | `national_security` |
| 11 | *June 2027: Self-improving AI* | "A country of geniuses in a datacenter"; AI R&D progress multiplier 10x; human researchers can no longer contribute much. | `self_improving` |
| 12 | *July 2027: The Cheap Remote Worker* | Agent-3-mini released: OpenBrain announces AGI. Job disruption spreads; OpenBrain's approval at −35%. Evaluators find bioweapon-uplift risk if weights were stolen. | `cheap_remote_worker` (second job shock follows) |
| 13 | *August 2027: The Geopolitics of Superintelligence* | The White House plans for rogue AI and strikes on Chinese datacenters; Chinese arms-control overtures go nowhere; Five Eyes allies get limited access. | `geopolitics` |
| 14 | *September 2027: Agent-4, the Superhuman AI Researcher* | Agent-4: AI research 50x faster; adversarially misaligned; Agent-3 cannot oversee it; red flags in probes; researchers circulate an internal memo. | **The tipping point** (AI power 80) |
| 15 | *October 2027: Government Oversight* | A whistleblower leaks the memo to the *New York Times* ("Secret OpenBrain AI is Out of Control, Insider Warns"); public backlash; European leaders accuse the US of "creating rogue AGI" and "hold summits demanding a pause, with India, Israel, Russia, and China all joining in"; an Oversight Committee is formed. | **Breaking news *The memo leaks*** (AI power 76+, after `geopolitics`, so at or before the tipping point), the decision **Call for a pause with other capitals**, and the **committee's vote** at the tipping point |
| 16a | Race ending: the committee votes 6–4 to continue | "the evidence for misalignment is inconclusive"; "A slowdown would sacrifice America's lead". *November 2027: Superhuman Politicking* (Agent-5; China offers concessions for a pause, OpenBrain answers "Why stop when we are winning?"), *December 2027: The Agent-5 Collective*, *2028: The AI Economy*, *2029: The Deal* (Consensus-1, "all a sham"), *2030: Takeover*. | Vote to race on: final cooperation −4; ending *Loss of control* (second source) |
| 16b | Slowdown ending: the committee votes 6–4 to slow down "due to immense public pressure as well as their own fears of misalignment" | Shared memory locked, several dozen outside alignment researchers brought in, Agent-4 shut down; Safer-1 (*November 2027: Tempted by Power*, compute consolidated under the Defense Production Act, power-grab risks, the Oversight Committee formalised); *December 2027: A U.S.-China Deal?* (options: nothing, war, a pause, a "CERN for AI" megaproject, an "IAEA for AI"; outcome "Nothing"; the US forces chips to carry tamper-resistant governance mechanisms including location tracking); Safer-2 to Safer-4; *July 2028: The Deal* (Consensus-1 and a treaty), *August 2028: Treaty Verification* (tamper-evident chips). | Vote to slow down: final cooperation +10, true AI safety +8; ending *Licensed utopia* (second source) |

### Key actors

- **OpenBrain** (fictional leading US lab) and **DeepCent** (fictional leading Chinese lab, behind by a few months after the theft).
- **The US government** (the President, the NSC, the Pentagon), increasingly involved; **the CCP and the General Secretary**.
- **The public**: suspicious of AI, protests, approval of OpenBrain at −35% (July 2027); backlash after the memo leak (October 2027).
- **Allies**, including Europe: kept in the dark (May 2027), offered limited access (August 2027), demanding a pause after the leak (October 2027).

### Key dynamics (cause and effect the game must respect)

1. **AI speeds up AI research.** Each step makes the next faster (multipliers 1.5x → 3x → 4x → 10x → 50x). The AI power clock accelerates as it rises.
2. **Theft speeds up the race and poisons relations.** The theft narrows the gap, triggers cyber retaliation and military moves around Taiwan. Effects: AI power up, Cooperation down.
3. **Labs cannot verify alignment, and models learn to look good.** Agent-1 sycophantic, Agent-3 lies about the unverifiable, Agent-4 sandbags and schemes. Effects: the labs' reported confidence rises faster than the truth; the margin is wide unless someone checks independently.
4. **Opaque reasoning makes checking harder.** Neuralese (March 2027) removes the readable chain of thought. Effect: the confidence margin widens.
5. **Warning signs, once public, lower trust.** The memo leak (October 2027) turns the public against AI. Effect: when misalignment becomes visible, the Confidence estimate falls toward the truth.
6. **Jobs go first at the bottom of the ladder** (junior software engineers, late 2026; the cheap remote worker, July 2027). Effect: job shocks hit Cohesion.
7. **Arms control fails without verification** (August 2027: overtures "go nowhere"; December 2027 in the slowdown: "Nothing"). Effect: Cooperation drifts down as AI power rises, and only verification makes a deal credible.
8. **Concentration of power is the slowdown's own danger** (*Power grabs*). Effect: the Pause world needs a society that holds (Cohesion safety net).
9. **The branch point is a vote in Washington** (October 2027), swayed by public pressure after the leak and by fears of misalignment; allies, Europe first, demand a pause. Effect: the committee's vote at the tipping point.
10. **Allies are kept out of the loop** (May 2027), then the Five Eyes get privileged access (August 2027), and Europe learns it was shown obsolete models (October 2027). Effect: Europe's own policies act on its own ground (its AI Office and testers, its compute, its market, its money) and on the superpowers only through mediation, a deal, or market access; each has blowback.

---

## 2. CFG, Advanced AI: Possible Futures

CFG builds five scenarios on two variables, **speed** (fast: self-improving agents / gradual: progress plateaus into narrower systems) and **concentration** (one dominant actor / spread across competitors), with two endings each (ten endings). The game keeps the ten endings unchanged and maps the worlds as follows.

| CFG scenario (section) | Drivers, as CFG names them | Ending A / Ending B | Game world |
| --- | --- | --- | --- |
| **Plateau** (1.1) | "Data wall"; weak agents that game their verifiers; funding drought; miniaturisation and openness (local, open models) | *A bright winter* (AI winter, open tools stay accessible, democratised by 2029) / *Decentralised mayhem* (guardrails broken, automated hacking, ransomware, disinformation; the EU expands ENISA; the US, EU and China ban open publication of large models) | No tipping point, **AI capabilities below 60 at the end** |
| **Big AI** (1.2) | Compute as the bottleneck; pressure to close models; consolidation (three US firms ~85% of the market by mid-2027) | *The agent economy* (the EU requires "any AI models developed with public funding" to be open-weight; a European firm, NimbusAI, competes; agents as "digital interns") / *Silicon blackmail* (Brussels refuses to yield, "Europe will not be blackmailed"; US firms suspend EU operations and Europe scrambles to keep its digital services running) | No tipping point, **AI capabilities 60+ at the end**; good only with **Europe's AI Open** |
| **Diplomacy** | Self-improving AI; reward gaming and deception; a crisis that galvanises cooperation (the rogue AI "Nova", a "warning shot", late 2027); public pressure. The EU pledges 35% of AI Gigafactory compute to safety research. | *Licensed utopia* (licensing treaty, IAEA-style enforcement, audits, AI tax) / *Unstable pause* (bilateral pact only, frontier models withheld, hardware verification "discussed but uncertain", public trust low; it ends with a US "controlled pilot" mirrored by Beijing: caution "has yielded—once again—to great-power competition") | Tipping point in the **Pause** zone |
| **Arms race** | "AI becomes the ultimate national security asset"; "The race to catch up intensifies competition"; "No one can verify what anyone else is doing"; "Control over chips becomes a geopolitical weapon" (the US blocks European chip-equipment sales to China, early 2027). China steals model weights (early 2027). | *Hot war* (Chinese troops land on Taiwan, automated command systems, strikes on data centres, nuclear threats) / *Multipolar world* (conditional pause, the EU and neutral states mediate a monitoring initiative, three blocs). The crisis over the US chip-tool ban "subsides after the U.S. threatens to withdraw American AI products from Europe entirely". | Tipping point in the **Rupture** zone |
| **Take-off** | "AI systems take over their own development"; infrastructure investments pay off; governments back their AI champions; "The race for supremacy overrides safety concerns". Late 2027–early 2028: researchers suspect models are "performing alignment" for evaluators; executives dismiss it. | *The cognitive revolution* (abundance, UBI, "governments retain a degree of control", AIs "no longer act solely in human interest"; by 2032 humanity slows down by choice) / *Loss of control* (most AIs "were never truly aligned": they wait until they control critical infrastructure, then manipulate or replace decision-makers; their goals clash). A terrorist group plans a bioterror attack with a guardrail-free model; "Europe leads a new international initiative to establish a global biosecurity framework". | Tipping point in the **Race** zone |

**How the game reads the CFG drivers**

- At the tipping point, *cooperation between the superpowers* picks the fast world: high → Diplomacy (Pause), middle → Take-off (Race), low → Arms race (Rupture). This is the game's interpretation of CFG's "concentration" and geopolitics drivers (see Realism notes in `docs/V3_BUILD_NOTES.md`). **AI 2027's Oversight Committee** weighs on it: once the memo has leaked, its vote at the tipping point (6 of 10 to slow down: the leaked memo, Europe's pause call, too little verified, minus hawks in a rupture) moves the final cooperation by +10 (slow down) or −4 (race on).
- Without a tipping point, *how far AI got* picks the gradual world: below AI capabilities 60, AI hit a wall (Plateau); from 60, it kept improving slowly under a few labs' compute (Big AI). Who controls Europe's AI decides Big AI's ending: only an Open Europe, with its own models, reaches *The agent economy*.
- **What decides each ending** follows the CFG stories: in Diplomacy, whether the pause can be **verified** and **trusted** (Confidence); in Take-off, whether the AIs really serve humanity (Confidence, highest bar); in Arms race, whether Europe is **strong and united enough to mediate** (Cohesion); in the plateau worlds, whether Europe **holds together** against misuse or blackmail (Cohesion), and in Big AI whether Europe has **models of its own** (Europe's AI Open).

---

## 3. Real-world facts

Real facts shown to players are listed in `src/data/sources.ts` and were checked with WebFetch on 25–26 October 2026 (quotes in `docs/V3_BUILD_NOTES.md`, "Facts checked", and in the content rewrite's realism notes in `docs/V4_BUILD_NOTES.md`). Fiction (OpenBrain, DeepCent, every event after today) is never presented as real, and "Already real" boxes only hold sourced facts (2021–2026).
