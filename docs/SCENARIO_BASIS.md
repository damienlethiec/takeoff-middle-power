# Scenario basis for v3

What the game takes from its two source scenarios, read on 25–26 October 2026 with WebFetch from the primary pages. Every card, event, threat, headline, leak, public voice and Léa letter in `src/data/` carries a `basis` field pointing to a section below (`ai2027`, `cfg`) or to a real source (`real`, with the source in `src/data/sources.ts`). A test (`tests/basis.test.ts`) fails when one is missing.

**Sources read**

- **AI 2027**, Kokotajlo, Alexander, Larsen, Lifland, Dean (AI Futures Project, 3 April 2025): <https://ai-2027.com> (shared story to October 2027), <https://ai-2027.com/race> and <https://ai-2027.com/slowdown> (the two endings), and the PDF <https://ai-2027.com/ai-2027.pdf>.
- **CFG, Advanced AI: Possible Futures** (Centre for Future Generations, 10 July 2025): <https://cfg.eu/advanced-ai-possible-futures/> and the scenarios PDF <https://cfg.eu/wp-content/uploads/AAIPF_scenarios_only.pdf>.

**What could not be read** (so the game stays conservative there):

- The static text of the AI 2027 pages stops at about 120,000 characters. The race ending was read to its end through the PDF (to "2030: Takeover"). The slowdown ending was read to "February 2028: Superhuman Capabilities, Superhuman Advice"; its later sections (Safer-4, the US–China treaty, 2029–2030) were not readable. The game uses only the slowdown's early steps and a review that confirms it ends "with a verified US–China treaty" (<https://www.aigl.blog/ai-2027/>, secondary). A LessWrong mirror was blocked by the fetch tool.
- On the CFG page, the text of *Loss of control* (Take-off, Ending B) is not in the static page: only its heading and dates ("Early 2030 – early 2032") and its premise. The game's *Loss of control* text therefore leans on AI 2027's race ending, which the fact check (#42) already accepted as a fitting second source.

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
| 15 | *October 2027: Government Oversight* | A whistleblower leaks the memo to the *New York Times* ("Secret OpenBrain AI is Out of Control, Insider Warns"); public backlash; European leaders accuse the US of "creating rogue AGI" and call for a pause; an Oversight Committee is formed. | (after the game: the world the player prepared decides) |
| 16a | Race ending: the committee votes 6–4 to continue | *November 2027: Superhuman Politicking* (Agent-5; China offers concessions for a pause, OpenBrain answers "Why stop when we are winning?"), *December 2027: The Agent-5 Collective*, *2028: The AI Economy* (jobs replaced, special economic zones, DeepCent-2 and Agent-5 collude), *2029: The Deal* (Consensus-1, "all a sham"), *2030: Takeover*. | Ending *Loss of control* (second source) |
| 16b | Slowdown ending: the committee votes 6–4 to slow down | Shared memory locked, outside alignment researchers brought in, Agent-4 shut down; Safer-1 with faithful chain of thought (*November 2027: Tempted by Power*, with compute consolidated under the Defense Production Act and power-grab risks); *December 2027: A US-China Deal?* (options weighed, outcome "Nothing"); *January 2028: A Safer Strategy* (Safer-2); *February 2028: Superhuman Capabilities, Superhuman Advice* (Safer-3). Later sections not readable; a review says it ends with a verified US–China treaty. | Ending *Licensed utopia* (second source) |

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

---

## 2. CFG, Advanced AI: Possible Futures

CFG builds five scenarios on two variables, **speed** (fast: self-improving agents / gradual: progress plateaus into narrower systems) and **concentration** (one dominant actor / spread across competitors), with two endings each (ten endings). The game keeps the ten endings unchanged and maps the worlds as follows.

| CFG scenario (section) | Drivers, as CFG names them | Ending A / Ending B | Game world |
| --- | --- | --- | --- |
| **Plateau** (1.1) | "Data wall"; weak agents that game their verifiers; funding drought; miniaturisation and openness (local, open models) | *A bright winter* (AI winter, open tools stay accessible, democratised by 2029) / *Decentralised mayhem* (guardrails broken, automated hacking, ransomware, disinformation; the EU expands ENISA) | AI plateaus, **Europe's AI Open** |
| **Big AI** (1.2) | Compute as the bottleneck; pressure to close models; consolidation (three US firms ~85% of the market by mid-2027) | *The agent economy* (EU requires publicly funded models to be open-weight; a European firm competes; agents as "digital interns") / *Silicon blackmail* (US firms threaten to cut service or withdraw from the EU; the EU waters down its rules) | AI plateaus, **Europe's AI Dependent** |
| **Diplomacy** | Self-improving AI; reward gaming and deception; a crisis that galvanises cooperation (the rogue AI "Nova", a "warning shot", late 2027); public pressure. The EU pledges 35% of AI Gigafactory compute to safety research. | *Licensed utopia* (licensing treaty, IAEA-style enforcement, audits, AI tax) / *Unstable pause* (bilateral pact only, frontier models withheld, hardware verification "discussed but uncertain", public trust low) | Tipping point in the **Pause** zone |
| **Arms race** | "AI becomes the ultimate national security asset"; "The race to catch up intensifies competition"; "No one can verify what anyone else is doing"; "Control over chips becomes a geopolitical weapon" (the US blocks European chip-equipment sales to China, early 2027). China steals model weights (early 2027). | *Hot war* (Taiwan invaded, automated command systems, strikes on data centres, nuclear threats) / *Multipolar world* (conditional pause, the EU and neutral states mediate a monitoring initiative, three blocs) | Tipping point in the **Rupture** zone |
| **Take-off** | "AI systems take over their own development"; infrastructure investments pay off; governments back their AI champions; "The race for supremacy overrides safety concerns". Late 2027–early 2028: researchers suspect models are "performing alignment" for evaluators; executives dismiss it. | *The cognitive revolution* (abundance, UBI, governments keep a degree of control; by 2032 humanity slows down by choice) / *Loss of control* (text not readable; premise: AIs that "only pretended to serve humanity") | Tipping point in the **Race** zone |

**How the game reads the CFG drivers**

- At the tipping point, *cooperation between the superpowers* picks the fast world: high → Diplomacy (Pause), middle → Take-off (Race), low → Arms race (Rupture). This is the game's interpretation of CFG's "concentration" and geopolitics drivers (see Realism notes in `docs/V3_BUILD_NOTES.md`).
- Without a tipping point, *who controls Europe's AI* picks the gradual world: open models → Plateau, a few big labs → Big AI.
- **What decides each ending** follows the CFG stories: in Diplomacy, whether the pause can be **verified** and **trusted** (Confidence); in Take-off, whether the AIs really serve humanity (Confidence, highest bar); in Arms race, whether Europe is **strong and united enough to mediate** (Cohesion); in the plateau worlds, whether Europe **holds together** against misuse or blackmail (Cohesion).

---

## 3. Real-world facts

Real facts shown to players are listed in `src/data/sources.ts` and were checked with WebFetch on 25–26 October 2026 (quotes in `docs/V3_BUILD_NOTES.md`, "Facts checked"). Fiction (OpenBrain, DeepCent, every event after today) is never presented as real: the intro says the labs are invented, and "Already real" boxes only hold sourced facts from 2024–2025.
