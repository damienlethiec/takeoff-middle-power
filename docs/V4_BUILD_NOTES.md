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
12. **A living world** (owner's request): AI weighs on jobs every round (Social cohesion erodes as capabilities rise, softened by flexicurity and by the answers that protect workers); 25 **social events** (strikes, protests, scandals, layoffs, good news) in European cities, one or two a round, different each game, in the feed ("Strike · Paris, France · in this story", why it matters, what it changed), in Europe's group with an icon by kind and as a mark at their city; the two job shocks also at their city with the jobs icon. The map dims Europe's dots as Social cohesion falls, shows hotspots at the cities of bad news, sends a ripple from the labs when capabilities jump by 6 or more, and lights up a partner that joins. The gauges glide through the six months, step at each social event, and show the change briefly ("+3", "−4") at the start of the six months, at each social event, request, breaking news and decision.
13. **Header and gauges** (owner's requests): a "?" by Influence opens what it is, what each round brings (from `TUNING.influence`), next round's breakdown and how to earn more; the gauges' changes lose their tick and cross (sign and colour; "better" or "worse" in their description); the line under the heading that repeated the decisions' effects is gone (the feed's decision items carry them).

**Validation tooling.** `tests/` (Vitest: rules, AI 2027 order, basis on all content including requests, hidden values, request rules, content limits, balance sample, UI helpers); `e2e/game.spec.ts` (Playwright on the production build: whole games at both paces; decisions in place of the map with the preview and Escape; a request answered by click and one with ← →; the feed; map groups with Tab into their list; Léa's letter; Why? and Europe's AI; threats; a clock that always resumes when a tip, a leak and a request coincide; the tutorial); `scripts/a11y/run.mjs` (keyboard-only games on the production build with axe on every screen, at 1280×800 with intro and tutorial, 640×400 with reduced motion, 390×844); `scripts/shots.mjs` (every screen at 1280×800 and 390×844).

## Decisions

1. **Requests are free of Influence** and **both answers cost something visible** (a test checks every answer); a hidden gain in real safety shows as "Real safety up (not shown)", and an answer whose cost is a hidden loss of real safety always carries a visible cost too. At most one a round (two with a follow-up), 6 to 10 a game (tests enforce it).
2. **Request choice**: a request tied to a milestone reached this round or to a growing threat comes first; otherwise a seeded draw, never twice in a game.
3. **Looking before answering**: the first ← / → highlights an answer, moves focus to it and announces it; the second takes it. Dragging the card leans it toward a side and answers past a threshold. Clicking an answer button answers at once (it already says what it moves).
4. **Requests never widen AI safety's uncertainty**: only the labs' reports, opaque reasoning and secrecy milestones do (a test checks every answer, now or delayed).
5. **The heading line says "If you confirm:" only when the selection changes the world or a goal's status**; otherwise the gauges alone show the preview.
6. **Europe's AI is always on the line** (not only on a plateau), as "If AI stalls: [Europe’s AI: Dependent]" ("decided by" on a plateau), so its tip can show from round 2.
7. **No stop between rounds**: the consequences stay on screen about 1.6 s (much shorter with reduced motion: the gauges jump instead of moving), then the clock runs; the player can pause. "See how it ends" waits.
8. **Léa's letters dialog is gone**: the letter is in the feed in full (earlier ones under Earlier). Since 26 Oct the end screen has the three friends' epilogues instead of her last letter (decision 17).
9. **Map groups**: one per region, at a fixed spot nudged off the threat icons; hover opens the list on desktop, a click pins it, Tab goes from the group into its list, Escape closes it and returns to the group; the list never covers its group (it scrolls if it fits neither below nor above).
10. **Tablets keep the feed beside the map** (768 px and up); below 768 px the feed goes under the map and shows the whole round.
11. **The engine's `journal()` was removed** (nothing used it). `report()` stays: the engine tests use it to check hidden values, and the feed's "What changed" is built from the same changes. `trends()` was removed too (26 Oct): nothing drew it once the sparklines were gone.
12. **The accessibility harness and the screenshots run on the production build** (with its CSP; axe is injected with `bypassCSP`): under Playwright's fake clock, the dev server left text unstyled for a while.
13. **Social events read public values only** (Social cohesion, AI capabilities, the zone, Europe's AI, the protections the player chose) and draw from their own seeded stream (from the seed and the round): the rest of the game's draws do not move, and a test checks that the hidden truth never changes which events come. Never twice a game; the first comes early in the six months (before most requests and breaking news), a second later.
14. **Steps on the gauges**: each social event moves its gauge at its time; the drift glides over the six months. When a request or breaking news stops the clock, the gauges catch up with the whole six months (so the dialog's "before" matches the gauges); social events still to come then appear in the feed and on the map at their time without a step on the gauges. The change shown by a gauge ("+3") is decorative (`aria-hidden`): each social event is announced once, politely, with its changes in words ("Social cohesion down 3"); requests, breaking news and decisions keep their own announcements. With reduced motion the change simply appears and goes, hotspots are steady, there is no ripple.
15. **"Verified" social events** (independent testers publish a deep check) narrow AI safety's uncertainty like oversight does (stopping short of the truth), so they never reveal the hidden value.
16. **Fonts are self-hosted** (26 Oct; reverses the team decision of 25 Oct to stay on Google Fonts): loading them from Google sends every player's IP address to Google, which a German court held unlawful without consent (LG München I, 20 Jan 2022, 3 O 17493/20). Fontsource npm packages, same families, weights and Newsreader's optical sizes; CSP `font-src 'self'`, no third-party request. See `docs/AUDIT.md` S11.
17. **Three friends back home replace Léa alone** (team decision, 26 Oct): Léa (Social cohesion), your mother (AI safety as lived) and Malik (capabilities, US–China cooperation, Europe's AI), the pro-AI voice. Seven letters on a fixed schedule, each opening its round as a postcard, pools picked from public values only, one epilogue each per ending, two new requests each for your mother and Malik. Letters move no gauge and draw their variant from their own seeded stream; the main generator keeps one unused draw at rounds 1, 4 and 8, where Léa's letters drew before, so the seeded simulation stayed byte-identical. The feed keeps the item kind `lea` for any friend's letter (a historical name, to keep the UI contract stable).

## Requests: kept and dropped

v4 takes the reactive request cards of the team's hybrid prototype: **46 cards** (43 plus 3 follow-ups; 50 since the friends' four of 26 Oct) from **11 characters**: the US envoy (6), China's delegate (7), OpenBrain's CEO (5), an independent evaluator (5), a union leader (2), an open-model founder (5), the EU cyber and intelligence chief (6), Japan's minister for the middle powers (2), a journalist (6), Léa (3) and OpenBrain's own model (3). Each keeps its basis (an AI 2027 or CFG section, or a source in `sources.ts`) and its sourced *Learn more*; 13 sources came with them.

**Dropped: the 18 that duplicated a v3 policy card** (or, for one, the silicon blackmail Breaking news), so the same decision is never both a card and a request. The full list, from the hybrid's `src/data/requests/` (61 cards; v4 keeps 43 of them and adds 3 follow-ups), with what each duplicated:

| Hybrid request | Character | What it asked | Duplicated |
| --- | --- | --- | --- |
| `cn_talks` | China's delegate | Host regular AI talks in Geneva | Diplomatic talks |
| `us_asml` | US envoy | Stop ASML servicing in China | Use the ASML lever |
| `pt_chip_leverage` | Japan's minister | Pool the coalition's chip leverage to demand safety terms | Use the ASML lever (its safety option) |
| `rs_ai_office` | Evaluator | A hundred more testers for the AI Office | AI Office capacity |
| `rs_alignment_fund` | Evaluator | A European programme on honest AI | Fund alignment research |
| `rs_inspections` | Evaluator | A European team to inspect labs on site | Offer to host inspections (level 1) |
| `rs_accord` | Evaluator | An accord putting inspectors in US and Chinese labs | Offer to host inspections (level 2, *Inspection accord*) |
| `rs_after_incident` | Evaluator | Inspectors now, after an unprepared AI incident | Offer to host inspections |
| `un_flexicurity` | Union leader | Danish-style flexicurity before the layoffs | Flexicurity reform |
| `un_human_signoff` | Union leader | A human signs every decision that changes a life | Human oversight mandate |
| `os_fund_open` | Open-model founder | Fund open European models | Fund open models |
| `sc_cyber_shield` | Cyber chief | Shield hospitals and grids from AI-written attacks | Cyber shield for hospitals and grids |
| `sc_weight_security` | Cyber chief | Strict security rules on frontier labs | Weight security standards |
| `pt_coalition` | Japan's minister | Form a coalition of middle powers | Middle-power coalition (level 1) |
| `pt_one_voice` | Japan's minister | The coalition speaks with one voice | Middle-power coalition (level 2) |
| `pt_summit` | Japan's minister | An emergency inspection summit after a caught incident | Emergency inspection summit |
| `pt_attribution` | Japan's minister | Attribute the theft together | Joint attribution with allies |
| `ob_ultimatum` | OpenBrain's CEO | Drop the rules or AI services stop | The silicon blackmail Breaking news (give in / hold firm) |

The test `no request duplicates a policy card` checks that none of these 18 ids comes back, and fails if an answer's label is a policy card's name.

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
8. **The map's Europe** is drawn as geographic Europe (Ireland to Ukraine), without Iceland (a few dots alone in the Atlantic read as a stray line), Greenland, the Caucasus, Anatolia, the Levant, Cyprus, Svalbard or French Guiana. It is a picture of where things happen, not a political map; the game's "Europe" is the EU's seat.
9. **The pace hint** ("tipping in ~2–4 rounds") uses visible values only; a test checks that the hidden pace never changes it.
10. **Social events are the story's** ("in this story" in their label): a city, a headline of 15 words or fewer and one line on why it matters. Each rests on a real precedent, cited as "Real precedent: …" and checked by reading its primary page on 26 October 2026 (the 2023 WGA contract's AI rules; SAG-AFTRA's 2024 video game strike over AI replicas; Klarna's AI assistant doing the work of 700 agents, Feb 2024; data centres at 21% of Ireland's metered electricity in 2023, CSO; the Commission's proceedings against TikTok after Romania's 24 November 2024 vote, IP/24/6487 (the page shows no date; the reference is from December 2024); Amnesty's *Xenophobic machines* on the Dutch benefits scandal, Oct 2021; Lund University's MASAI results, 20% more cancers found and 44% less reading work, Aug 2023 (the Lancet page could not be fetched; the university's release was read); ECMWF's AI forecasts operational since 25 February 2025; the Council's platform work rules, 14 October 2024, "the right to contest automated decisions"; the IDAIS-Venice statement, September 2024, AI safety as "a global public good"), or on an AI 2027 or CFG section (no "Real precedent" then). The events themselves (a Frankfurt bank cutting 3,000 jobs, Dubliners protesting, Malmö's screening) are fiction set after today; the cities and numbers in them are ours.
11. **Effect directions**: strikes, protests, scandals and layoffs lower Social cohesion; good news raises it; chip smuggling lowers US–China cooperation (CFG's arms race), a joint scientists' call raises it (IDAIS), independent tests raise what is verified. Bad news weighs more when Social cohesion is low or AI capabilities high (AI 2027's anti-AI protests follow the job losses); good news weighs more once the player protects workers. Sizes are first values for the simulation.
12. **AI weighs on jobs continuously**: AI 2027 has junior software jobs in turmoil (*Late 2026*) and job disruption spreading with the cheap remote worker (*July 2027*); the game turns that into a small loss every round past AI capabilities ~47, besides the two shocks. Flexicurity and the worker answers soften it (Europe 2031's flexicurity recommendation, CFG's job guarantees and agent taxes).
13. **The job shocks' cities** (Rotterdam, Warsaw) come from their Breaking news scenes ("a logistics firm in Rotterdam", "protesters fill squares from Lisbon to Warsaw").

14. **The three friends are fiction** set after today, like the story's social events; each letter and request carries a basis. Stretches: Léa's, your mother's and Malik's lives are ours. Malik works at an unnamed San Francisco lab that is two months ahead of DeepCent, i.e. OpenBrain in all but name. His Chinese colleague losing his visa reads CFG's arms race ("AI becomes the ultimate national security asset"); AI 2027 tells of tighter lab security and the race, not of visas. Your mother's hospital AI (scans, notes, triage) extends what is real today (Lund University's MASAI trial: 20% more cancers found, 44% less reading work, Aug 2023) into the story; her near miss is AI 2027's *April 2027* (models that say what sounds right, alignment "inconclusive") seen from a ward, not an event of the scenario. The epilogues retell each ending's CFG story at home (e.g. *Hot war*: a datacentre struck, *Licensed utopia*: medicines checked by inspectors).
15. **Two requests bend the envoy's role**: the EU does not approve a French hospital's pilot (your mother asks for "a nod from Brussels"), and visa fast-tracks are national. Both are the envoy's influence, not a legal power; Malik's "Paris office" request rests on CFG's *Big AI* (three US firms with about 85% of the market by mid-2027).
## Simulation (v4)

*To be filled by the balancing pass*: final `npm run sim` table for v4 against the targets in CLAUDE.md, and the requests and uncertainty checks. The tuning history is in DEVELOPER_NOTES, "Tuning changes for v4".

## Known issues

1. **Not playtested with the target audience** (as for v3). A game is now busier: requests and the feed add reading; the 10-minute target needs checking.
2. **Texts need Louis's review**: the 46 requests and their reactions, the new tips, the leaks' advice, the Why? section on Europe's AI, and the realism notes above.
3. **Social events after a stop**: when a request or breaking news stops the clock, the gauges catch up with the whole six months, so a social event that comes later in the round shows in the feed and on the map without its own step on the gauges (see Decisions 14). The first event of a round comes early to keep this rare.
4. **Phones**: the map is small (its icons are compact; their names are in their accessible labels and lists); the header can wrap to two lines when another control is added (a sound switch is in progress); the decision cards scroll under a sticky Confirm bar.
5. **The decision screen on desktop** uses about half its height when the hand is small (three or four cards).
6. **Requests' left and right have no fixed convention** (which side goes along varies by card); the answers' labels say it.
7. **The accessibility harness** presses N a second time (with a log line) when it lands while Help is still closing, about one run in three on the phone; not reproduced by hand.
8. **The e2e tests find gauges by their names only**, as the gauge cards' markup was being redesigned during the finishing pass.
9. **Social cohesion's balance is first values**: `TUNING.jobDrift` and `TUNING.social` were set so the targets still pass; the final tuning pass should look at how often bad news comes late in a game and whether flexicurity is now worth more.
10. **Two e2e tests can time out on a busy machine**: "the clock always resumes" (a request can open between reading the phase and checking the pause button) and the save test's tab click (a request covers the feed); both pass when re-run alone.
