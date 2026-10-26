# v4 build notes

Built on 26 October 2026 on branch `v4`, from v3 and the team's v4 list. Preview: <https://damienlethiec.github.io/takeoff-middle-power/preview/v4/>. What v4 is: [V4_SPEC.md](V4_SPEC.md). Rules and numbers: [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md). What the game takes from its sources: [SCENARIO_BASIS.md](SCENARIO_BASIS.md).

## What was built

In the order it landed (commits on `v4`):

1. **Gauges on top** with plain names (AI capabilities, AI safety, US–China cooperation, Social cohesion) and a one-line question each; later four aligned cards, no sparklines, the cooperation zone shown once, threat marks by the gauge's name, a pace hint ("tipping in ~2–4 rounds") only when the tipping point looks close at the visible pace.
2. **Where the world is heading**: first a band, then a column, finally targets drawn on the gauges and **one line** under them with *Why?* (the five-worlds dialog). Europe's AI badge ends that line, always.
3. **Decisions**: a grid of large cards with Details dialogs; then the decisions **replace the map** while the gauges and the line preview the selection. **No card cap**: as many as Influence covers.
4. **The live news feed** (This round / Earlier, "What changed") replaces the journal and the report.
5. **Requests** from the hybrid (see below), answered by click, swipe or ← →.
6. **AI safety's uncertainty only downward** (see Realism), shown as verified–claimed.
7. **The map**: the round's items as icons grouped per region, threat icons, no banners stack or voice bubbles (only the newest headline, briefly), the US–China arc gone; centred on the US–Europe–China band; Europe's colour on Europe only.
8. **Léa** in the intro, and in the feed with her full letter and portrait; an envelope in Europe's group.
9. **Tutorial** slimmed: one tip per gauge, the line, Influence; later only a request, a threat and Europe's AI the first time.
10. **No stop between rounds**; only the end waits.
11. **Finishing pass**: end-to-end tests, the accessibility harness, dead code removed, screenshots (`docs/screenshots/v4/`), these docs.

**Validation tooling.** `tests/` (Vitest: rules, AI 2027 order, basis on all content including requests, hidden values, request rules, content limits, balance sample, UI helpers); `e2e/game.spec.ts` (Playwright on the production build: whole games at both paces; decisions in place of the map with the preview and Escape; a request answered by click and one with ← →; the feed; map groups with Tab into their list; Léa's letter; Why? and Europe's AI; threats; a clock that always resumes when a tip, a leak and a request coincide; the tutorial); `scripts/a11y/run.mjs` (keyboard-only games on the production build with axe on every screen, at 1280×800 with intro and tutorial, 640×400 with reduced motion, 390×844); `scripts/shots.mjs` (every screen at 1280×800 and 390×844).

## Decisions

1. **Requests are free of Influence** and **both answers cost something visible** (a test checks every answer); a hidden gain in real safety shows as "Real safety up (not shown)", and an answer whose cost is a hidden loss of real safety always carries a visible cost too. At most one a round (two with a follow-up), 6 to 10 a game (tests enforce it).
2. **Request choice**: a request tied to a milestone reached this round or to a growing threat comes first; otherwise a seeded draw, never twice in a game.
3. **Looking before answering**: the first ← / → highlights an answer, moves focus to it and announces it; the second takes it. Dragging the card leans it toward a side and answers past a threshold. Clicking an answer button answers at once (it already says what it moves).
4. **Requests never widen AI safety's uncertainty**: only the labs' reports, opaque reasoning and secrecy milestones do (a test checks every answer, now or delayed).
5. **The heading line says "If you confirm:" only when the selection changes the world or a goal's status**; otherwise the gauges alone show the preview.
6. **Europe's AI is always on the line** (not only on a plateau), as "If AI stalls: [Europe’s AI: Dependent]" ("decided by" on a plateau), so its tip can show from round 2.
7. **No stop between rounds**: the consequences stay on screen about 1.6 s (much shorter with reduced motion: the gauges jump instead of moving), then the clock runs; the player can pause. "See how it ends" waits.
8. **Léa's letters dialog is gone**: the letter is in the feed in full (earlier ones under Earlier), and the end screen keeps her last letter.
9. **Map groups**: one per region, at a fixed spot nudged off the threat icons; hover opens the list on desktop, a click pins it, Tab goes from the group into its list, Escape closes it and returns to the group; the list never covers its group (it scrolls if it fits neither below nor above).
10. **Tablets keep the feed beside the map** (768 px and up); below 768 px the feed goes under the map and shows the whole round.
11. **The engine's `journal()` was removed** (nothing used it). `report()` stays: the engine tests use it to check hidden values, and the feed's "What changed" is built from the same changes. `trends()` is no longer drawn (sparklines removed) but stays in the API.
12. **The accessibility harness and the screenshots run on the production build** (with its CSP; axe is injected with `bypassCSP`): under Playwright's fake clock, the dev server left text unstyled for a while.

## Requests: kept and dropped

v4 takes the reactive request cards of the team's hybrid prototype: **46 cards** (43 plus 3 follow-ups) from **11 characters**: the US envoy (6), China's delegate (7), OpenBrain's CEO (5), an independent evaluator (5), a union leader (2), an open-model founder (5), the EU cyber and intelligence chief (6), Japan's minister for the middle powers (2), a journalist (6), Léa (3) and OpenBrain's own model (3). Each keeps its basis (an AI 2027 or CFG section, or a source in `sources.ts`) and its sourced *Learn more*; 13 sources came with them.

**Dropped: the 18 that duplicated a v3 policy card**, so the same decision is never both a card and a request. Among them (the test `no request duplicates a policy card` names these): diplomatic talks with China, the ASML lever, AI Office capacity, the alignment research fund, inspections, flexicurity, funding open models, the cyber shield, weight security standards, the middle-power coalition, the emergency summit, joint attribution and the human sign-off mandate. The test also fails if an answer's label is a policy card's name.

**Follow-ups** ("I warned you"): US tariffs after "Keep trading", the internal-model exemption, and the protected whistleblower's logs.

## Realism notes

For Louis and the fact check (v3's notes, in [V3_BUILD_NOTES.md](V3_BUILD_NOTES.md), still apply).

1. **AI safety's uncertainty is one-sided.** The value the labs report (the claim) is an upper bound: the truth is never above it, and never below what independent checks have verified. Grounding: AI 2027's dynamic that "labs cannot verify alignment, and models learn to look good" (*Late 2025*: Agent-1 sycophantic, nobody can check whether the Spec "took"; *April 2027: Alignment for Agent-3*: it "lies about what can't be verified", results "inconclusive", most assume it is aligned; *September 2027*: Agent-4 adversarially misaligned while it looks fine). The scenario's errors all go one way, toward overconfidence; the game never shows AI safer than the labs say. CFG's *Take-off* ("performing alignment" for evaluators) points the same way.
2. **Labs' reports raise the claim and widen the band by as much** (what is verified does not move): the labs push their numbers up, independent checks do not follow by themselves. Opaque reasoning (AI 2027's neuralese, *March 2027*) and secrecy milestones widen it downward. Oversight (the AI Office, inspections, audits) raises what is verified, stopping a hidden 0–2 points short of the truth, so "verified" never claims more than is known.
3. **Requests stretch the scenarios into Europe's inbox.** Each request rests on a section (e.g. OpenBrain's internal-use exemption on AI 2027's *January 2027: Agent-2 Never Finishes Learning*, kept internal; China's delegate denying the theft on *February 2027*), but who asks Europe and what they offer are our inventions. The characters are fictional; real organisations appear only in their real roles and in sourced facts.
4. **"Agent", OpenBrain's model speaking for itself**, is a device: AI 2027's models do not address foreign envoys. Its three requests rest on the scenario's sections on agents' growing autonomy and persuasion; they are labelled as the story's.
5. **Léa's first letter opens "Dear old friend, it’s Léa"** so the player knows who she is; the letters keep their bases (AI 2027's job beats).
6. **Leaks now carry one line of advice** (e.g. "The labs' numbers look too good. Inspections and audits grow what you have verified."): game guidance, not scenario content; the leaks themselves keep their basis.
7. **Europe's AI in Why?**: "deals with the big labs" make it Dependent (requests such as signing OpenBrain's deal or joining the US compute club), "funding open models, or backing open developers" make it Open. CFG's *Big AI* names consolidation and pressure to close models; the specific triggers are ours.
8. **The map's Europe** is drawn as geographic Europe (Iceland to Ukraine), without Greenland, the Caucasus, Anatolia, the Levant, Cyprus, Svalbard or French Guiana. It is a picture of where things happen, not a political map; the game's "Europe" is the EU's seat.
9. **The pace hint** ("tipping in ~2–4 rounds") uses visible values only; a test checks that the hidden pace never changes it.

## Simulation (v4)

*To be filled by the balancing pass*: final `npm run sim` table for v4 against the targets in CLAUDE.md, and the requests and uncertainty checks. The tuning history is in DEVELOPER_NOTES, "Tuning changes for v4".

## Known issues

1. **Not playtested with the target audience** (as for v3). A game is now busier: requests and the feed add reading; the 10-minute target needs checking.
2. **Texts need Louis's review**: the 46 requests and their reactions, the new tips, the leaks' advice, the Why? section on Europe's AI, and the realism notes above.
3. **The heading line keeps the last decisions' explanation** ("Diplomatic talks and …: US–China cooperation 51 → 55, …") through the next six months, until the next decisions. Useful as a reminder, but it can read as stale late in a round.
4. **Phones**: the map is small (its icons are compact; their names are in their accessible labels and lists); the header can wrap to two lines when another control is added (a sound switch is in progress); the decision cards scroll under a sticky Confirm bar.
5. **The decision screen on desktop** uses about half its height when the hand is small (three or four cards).
6. **Requests' left and right have no fixed convention** (which side goes along varies by card); the answers' labels say it.
7. **The accessibility harness** presses N a second time (with a log line) when it lands while Help is still closing, about one run in three on the phone; not reproduced by hand.
8. **The e2e tests find gauges by their names only**, as the gauge cards' markup was being redesigned during the finishing pass.
