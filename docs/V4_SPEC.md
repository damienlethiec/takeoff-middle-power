# Takeoff: Europe’s Next Move (v4) Spec, as built

Oct 26, 2026 · @Damien

v4 keeps v3's model (the AI clock, the cooperation zones, the two pillars, the ten CFG endings, one Influence) and changes how it reads and how it plays. This spec describes the game as built on the `v4` branch; [V3_SPEC.md](V3_SPEC.md) stays the reference for the model and the endings, and [V4_BUILD_NOTES.md](V4_BUILD_NOTES.md) lists the decisions, realism notes and known issues.

## Why v4

v3 simplified the model, but its screen still asked the player to find things: the gauges sat beside the map, the heading line was a sentence to decode, the news lived in a journal and a report behind buttons, the decisions covered the whole screen, and between rounds the player mostly waited. v4 aims at the same audience (the general public, a 10-minute game) with four changes:

1. **Read the world at a glance.** The gauges sit on top with plain names; the targets are drawn on them; one line under them says where the world is heading.
2. **Things happen while you watch.** A live news feed and a map of the round's items replace the journal and the report.
3. **People ask you things.** Characters arrive with requests during the six months: a quick left-or-right choice that costs something either way.
4. **Decide with the world in view.** The cards take the map's place while the gauges stay visible and preview the selection.

## What changed from v3

| v3 | v4 |
| --- | --- |
| Title *Takeoff: Middle Power* | *Takeoff: Europe’s Next Move* |
| 12 rounds of six months, H1 2027–H2 2032 | **10 rounds**, H1 2027–H2 2031 (user decision, 26 Oct; rebalancing to follow) |
| Gauges beside the map: AI power, Cooperation, Confidence in AI, Cohesion | Gauges on top, four aligned cards: **AI capabilities**, **AI safety**, **US–China cooperation**, **Social cohesion**, each with a one-line question ("Does AI do what we intend?") |
| Confidence as an estimate ± margin (the truth could be above or below) | **AI safety as verified and claimed**: "40–57", a solid bar up to what is verified and a hatched part up to what the labs claim. The truth is never above the claim and never below what is verified (see Realism) |
| The heading line, "Heading: Race. Goal: Confidence 75 (you: 62 ± 15)" | Targets drawn on the gauges ("goal 75 · short", "floor 55 · on track") and one line: **"Heading for [Race]: AI safety must reach 75 [short] · If AI stalls: [Europe’s AI: Dependent] · Why?"** |
| Europe's AI badge on the map | The badge ends the heading line, always, as a chip like the world's |
| Up to two cards a round | **As many cards as Influence covers**, each once a round |
| Journal and report screens; "See what changed" | A **live news feed** beside the map (under it on phones): This round / Earlier, "What changed" on top when the six months end |
| Headline banners and voice bubbles over the map; Léa's portrait over Lyon; a leak button | The round's items as **small icons grouped per region**, each group opening its list; only the newest headline shows briefly as a banner |
| A full-screen decision dialog | **Decisions replace the map** (and the feed) while the gauges and the line stay in view and preview the selection |
| A stop between rounds ("Start H2 2027") | No stop: after Confirm the gauges move and the next six months begin (the player can pause). Only the end waits ("See how it ends") |
| No requests | **Requests**: about 48 cards from 13 characters, answered left or right; asking is free, the cost is in the answer (sometimes Influence) |
| Léa's letters in a dialog | Léa's **letter in full in the feed** with her small portrait, "Letter from Léa, your friend in Lyon", and an envelope in Europe's map group |

## The main screen

From top to bottom:

- **The header**: the title, the date and round ("H1 2028 · Round 3 of 10" with a 10-step progress bar), pause and speed (×1, ×2), the phase in words ("Clock running", "A request", "Your decisions"), Influence with next round's income and its reasons and a "?" (what Influence is, what each round brings, how to earn more), and Help.
- **The four gauges**, one card each, the same rows aligned across them: the gauge's icon (the same as on the cards' effects), name and "?", the value with this round's change and a status chip, the bar with its marks, one caption.
  - *AI capabilities*: the clock; the tipping point at 80 is a hatched zone. When the tipping point looks at most four rounds away (visible values only), "tipping in ~2–4 rounds".
  - *AI safety*: verified–claimed ("40–56"), the goal when it is the deciding gauge, caption "Verified 40 · labs claim 56 · goal 75".
  - *US–China cooperation*: three zones (Rupture, Race, Pause); the current one outlined on the bar and named by its status chip ("Race", in the zone's colour, its tooltip and description saying what changes it: "Pause from 60, Rupture below 30"); the caption keeps the range ("30–59"). A selection that would change the zone shows on the chip, dashed ("Race → Pause").
  - *Social cohesion*: its floor or goal ("Floor 55: never fall below"). It erodes a little every round as AI takes over more work (flexicurity and the answers that protect workers soften it) and moves with the social events.
  - The gauges glide through the six months and step at each social event; a change shows briefly by the gauge ("+3", "−4": sign and colour, "better" or "worse" in words for screen readers) when a round, a social event, a request, breaking news or the decisions move it.
  - A threat aimed at a gauge shows as a small mark by its name ("⚠ −15", "ready").
- **The heading line** (see above). *Why?* opens the five-worlds dialog.
- **The map** (left) and **the news feed** (right; under the map below 768 px).
- **The dock** when the clock has stopped: one sentence and one button ("Make my decisions", Enter).

## A round (six months)

1. **Influence arrives** and is announced with its reasons.
2. **The clock runs** (about 8 seconds at ×1). Headlines, AI 2027 milestones, threats, public voices, a leak every two or three rounds, a friend's letter (after its postcard) appear in the feed and as icons in their region's group on the map. Threat icons grow in three stages where they would strike.
3. **A request may arrive** (at most one a round, two when a follow-up is due): the clock stops, the character's card opens, the player answers, the clock resumes.
4. **Breaking news may strike**: the clock stops for its screen (impact before → after, prepared or not, an "Already real" fact), then resumes. Two at most a round, one after the other: when a scenario event (a milestone's threat, the memo, a job shock, a crisis) comes, the AI incident or bioweapon uplift can still strike later in the same six months; such a round has one request at most, before them.
5. **The clock stops.** "What changed" (the three biggest changes with their cause) tops the feed. Nothing opens by itself; the dock offers "Make my decisions".
6. **Decisions** (below), then **consequences**: the gauges move and show their change, the decisions enter the feed with what they changed, and the next six months begin.
7. The game ends at the **tipping point** (capabilities 80, never before round 6) or after **round 10** (H2 2031; 12 rounds to H2 2032 until 26 Oct): "See how it ends".

## Requests

A character arrives during the six months with a short request (≤ 40 words) and two answers (left and right; no fixed convention on which side goes along). Asking is free: **the cost is in the answer**, and both answers cost something visible (a gauge, a growing threat, Europe's AI, the coalition, a delayed effect announced on the card, or, since 26 Oct, Influence spent at once: political capital, shown as a number like a card's cost). Costs are spread: Social cohesion is no longer the default price of an answer (playtests of 26 Oct).

- **Characters** (all fictional; OpenBrain and DeepCent are AI 2027's): Dana Whitfield (US envoy), Li Wen (China's delegate in Geneva), Marcus Hale (OpenBrain's CEO), Dr Ines Moreau (independent evaluator), Katrin Vogel (union leader), Tomas Novak (open-model collective), General Aurélie Brandt (EU cyber and intelligence), Minister Hana Sato (Japan and the middle powers), Sam Okafor (journalist), the three friends back home (Léa, your mother, Malik), and "Agent", OpenBrain's frontier model speaking for itself.
- **Which comes**: first a request tied to a milestone reached this round or to a growing threat, else a seeded draw; none in round 1 (27 Oct, learnability: a first game shows only AI capabilities and AI safety then), 5 to 10 a game; never the same one twice. Three **follow-ups** come back on an earlier answer ("I warned you").
- **On the card**: the character's portrait, name and role, the request, "Free of Influence", the two answers with their effects as chips in words ("Social cohesion: down a little"; the reaction after answering shows the numbers), "If AI tipped now" when an answer would change the world, and **Learn more** (a sourced fact or the scenario passage it echoes).
- **Answering**: click an answer, swipe the card, or press ← / → once to look (the answer is highlighted and announced) and again to answer. The card **turns over in place** (27 Oct; there is no separate reaction window): your answer, the character's reaction and what changed (numbers), for 4 seconds, then it closes by itself and the clock resumes; a click or tap on it, Enter or its small Continue button closes it sooner, and a mouse resting on it holds it (a thin bar runs out meanwhile). It is announced politely to screen readers; with reduced motion the content simply changes, without the turn. Requests, answers and reactions stay in the feed.
- Requests never widen the AI safety uncertainty (only events and the labs' reports do).

## Decisions

"Make my decisions" replaces the map and the feed with the decisions; the header, the gauges and the heading line stay.

- **The hand** (compact cards, 27 Oct; owner's feedback: cards were cut on small screens, of uneven sizes, and the four family columns confused): **one grid of cards all the same size**, about three columns on a laptop, two on a tablet, a list on a phone (6 to 9 cards visible at 1280×800, more on a bigger window; a bigger hand scrolls inside the panel, never the page; a small hand, as in round 1, gets a panel only as tall as its cards, the bar right under them, while the right column keeps its height). Each card shows its **name**, its **cost**, a **one-line purpose** (≤ 12 words, `short` in `src/data/cards.ts`) and **all its effects as icons**: the gauge's icon with 1 to 3 arrows (↑ a little, ↑↑ some, ↑↑↑ a lot; ↓ the same down; AI safety by its verified part), the hidden real safety as a dashed magnifier with "?" and one arrow (never a size), Influence as a number ("−1", "×2" for two rounds), Europe's AI as "→ Open", a protection as a shield and the threat's short name, a risk as a warning sign; effects that come only with the inspection accord (or from the coalition's level 2) share one dashed group behind the accord's mark ("L2"). Cards that can fail add their chance in a word. Tags at the foot: Recommended, New (arrived this round), Opportunity with rounds left, and for a card that cannot be played now "Too expensive" or "Not now" (with a lock). Never colour alone: arrows, signs, icons and words carry the meaning; screen readers hear one sentence per effect ("US–China cooperation: up a little") and the mouse gets it as a tooltip.
- **Order**: the chief of staff's recommended card first, then the playable ones, then the ones that cost too much; cards waiting for something else (a pause, an accord, a round of rest) sit behind one line, "Not available yet (n)", that opens them. The order is set when the decisions open, so cards never move while the player selects.
- **Details**, a real button with its word on every card, opens a dialog centred in the window (a long card scrolls inside it; a bottom sheet on a phone): the full proposal, the effects in words beside their icons, the card's other conditions and side effects ("Only in a pause", "Inspections sharper"), its levels, what to ask for (the ASML lever's choice is made here), the chance and its reasons, the real-world example and cost with sources, the provenance tag and its basis. Escape or a click outside closes it and focus returns to the card's Details. Selecting is done on the card itself, not in Details.
- **The chief of staff** gives one recommendation, in words, without numbers, in the right column (on a phone, a line over the cards, "Your chief of staff: recommends …", that opens).
- **Select** any number of cards Influence covers by clicking the cards (each is a toggle button, aria-pressed; announced when the decisions open: "Play as many as your Influence allows"; the Influence tip and Help explain it) (the hand shows what is still affordable). The selection **previews on the real gauges** in words ("up some" by the value: effects read as a direction and a size, a little / some / a lot, before deciding, and as numbers after Confirm; a dotted mark on the bar, the targets dashed where they would move) and in the line ("If you confirm: Heading for [Race] → [Pause]") only when the world or a goal's status would change; Europe's AI chip shows "Dependent → Open".
- **Diplomacy can fail** (playtests of 26 Oct): the talks, the coalition, the inspection accord and joint agency, the ASML lever, the pact against bioweapons, the pause call and the licensing treaty show their odds in words, never as a number: **Likely to work**, **Uncertain** or **Long shot**, with what makes them easier or harder now (talks are easier in a pause and a long shot in a rupture; the coalition and the ASML lever need a Europe that holds together; the pause call and the treaty need allies). The preview shows a card working and warns when it may not. If it fails, the Influence is spent and nothing else happens; a headline in the feed says why in one plain sentence ("The Geneva talks broke up: neither side trusts what the other says it is building."), the decision reads "did not work", and the card can be tried again in a later round. Cards that spend Europe's own money, and Europe's own testing, always work.
- **Active threats** are listed in the right column, under the chief of staff ("Prepared if you confirm"), then the selection's notes.
- **One bar at the bottom**, on one line: Influence left, **Back to the map** (Escape), **Play no card**, **Confirm** (n cards, cost). On a phone it stays at the bottom of the screen on two rows.

## The news feed

- **This round**: every item as it appears, newest first, each a button with an icon and a type ("Headline", "AI 2027 milestone", "Threat", "Heard in Europe", "Leak", "Breaking news", "Request · Li Wen", "Letter from Malik, your old flatmate in San Francisco", "Strike · Paris, France · in this story", "Your decision"), and what it changed.
- **Social events**: one or two a round, different each game, in a European city: strikes, protests, scandals, layoffs (the two job shocks too) and good news, each with a headline, one line on why it matters (a real precedent, or the scenario it echoes) and what it changed. Bad news comes more often when Social cohesion is low or AI capabilities high.
- **What changed** tops it when the six months end; **Earlier** holds past rounds by date, each with its own "What changed".
- **The map shows where things happen; the feed tells you what happened** (27 Oct). Choosing a feed item shows it on the map (its threat lights up, or its region's group opens with the item highlighted; announced: "Shown on the map: Europe"). Choosing a map item finds its story here: the feed switches to its tab, opens its "+N more" fold if needed, scrolls to it (smoothly, unless reduced motion), highlights it with a brief glow (a steady highlight with reduced motion) and **moves focus to it**, so keyboard and screen-reader players follow. The leak opens to be read instead. **N** jumps to the feed.

## The map

A dot-matrix world centred on the US–Europe–China band (Europe's colour covers Europe only), with the labs pulsing faster as capabilities rise, coalition partners lighting up around Europe (briefly brighter as each joins), protests over European cities and Europe's dots dimming as Social cohesion falls, and a soft ripple from the labs when AI capabilities jump.

- **Threat icons** where the threat would strike, larger at each stage, green with a check once Europe is prepared; each opens what protects Europe.
- **Groups**: the round's items as small icons by type, one group per region (the US, Europe, China) with a count. Hover or click opens its list (Tab goes into it, Escape closes it). A friend's letter is an envelope, first in its region's group (Europe for Léa and your mother, the US for Malik); the leak is in the US group and opens from there. While a request is open, the character's group is marked "Request".
- **Social events** join Europe's group with an icon by kind (a briefcase for jobs, a picket sign, a megaphone, an alarm, a spark for good news) and a mark at their city: bad news is a hotspot that pulses gently (steady with reduced motion), good news glows.
- Only the newest headline shows briefly as a banner by its group.

## Friends back home (26 Oct)

Léa used to be the game's human heart; she had become one feed item among others. Team decision of 26 October: **three friends back home**, each the human face of one part of the world, introduced on the intro's last screen with their portraits ("the people you're doing this for", one line each):

- **Léa**, your old friend, a translator in Lyon: her job, the fear of being replaced → **Social cohesion**. Her letters are v3's, kept.
- **Your mother**, a retired nurse in Lyon who still helps at her old hospital: AI arriving in the wards, trust, then a near miss or an inspection → **AI safety as lived**.
- **Malik**, your old flatmate, an engineer at an AI lab in San Francisco: he sees progress from inside (→ **AI capabilities**), lives the US–China rivalry up close (a Chinese colleague without a visa, chips under guard, fear of conflict → **US–China cooperation**), and left Europe because it had no job like his (→ **Europe's AI**). The honest pro-AI voice: not a villain, not naive.

**Letters.** Seven a game at most, one a round, each **opening its round full screen as a postcard** before the clock starts, then kept in full in the feed with the friend's small portrait and in their region's map group (Malik's in the US group): round 1 Léa, 2 Malik, 3 your mother, 5 Léa, 6 Malik, 7 your mother, 9 Léa (`letters.schedule`; a game that tips early sees fewer). Each letter comes from a pool picked by the world's **visible** state (Léa: job shocks and Social cohesion, flexicurity; Malik: US–China cooperation, Europe's AI, whether AI 2027's self-improving AI is reached; your mother: what is verified about AI safety, whether the labs have declared their model aligned), with variants drawn from the seed. Letters **move no gauge** and never hint at the true AI safety or the pace. First person, short, no policy words, no numbers, signed "L.", "Love, Mum", "M.".

**Epilogues.** The end screen has "Back home, <year>" (the year the game ended, like "The world in <year>" above it): one short epilogue per friend (≤ 35 words) for each of the ten endings, with their mood. It replaces Léa's last letter.

**Requests.** Léa keeps her three; your mother brings two (back her old hospital's AI triage pilot; make hospitals report near misses) and Malik two (fast-track visas for AI researchers such as his Chinese colleague; welcome his lab's Paris office, which would bring him home but make Europe's AI Dependent).

## Faithful to the scenarios (26 Oct)

A content pass on the decisions, threats, events and endings, from the audit against AI 2027 and CFG (rules in [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md), stretches in [V4_BUILD_NOTES.md](V4_BUILD_NOTES.md), realism notes 18–31):

- **A provenance tag** on every decision card and Breaking news: *Real*, *From AI 2027*, *From CFG*, *From Europe 2031* (since 27 Oct) or *Invented* (a game device such as the independent audit).
- **AI 2027's turning point**: the misalignment memo leaks (Breaking news) before the tipping point; Europe can **call for a pause with other capitals**; at the tipping point **Washington's oversight committee votes**, race on or slow down, and its vote moves the final US–China cooperation. The vote shows in Why?, on the end screen, and in the heading line's world.
- **Europe acts on its own ground**, with real blowback: EU testing before any inspection accord (which needs a crisis or a pause), Washington's chip-tool ban after the ASML lever, labs withholding models after the oversight mandate, the Five Eyes pulling partners away. Weight security and the AI Office protect in part.
- **New decisions**: a CERN for AI on the gigafactories, chips that prove where they run, a licensing treaty within a pause, a biosecurity pact; **new crises**: Taiwan, a US–China ban on large open models, bioweapon uplift.
- **The gradual worlds** are picked by how far AI got (Plateau below 70, Big AI from 70; 60 until the rebalancing of 26 Oct), and in Big AI only an Open Europe ends well; three endings retold as CFG tells them (*The agent economy*, *Silicon blackmail*, *Unstable pause*).


## Europe 2031, a third scenario (27 Oct)

The game rests on three scenarios: **AI 2027** (the race and its milestones), **CFG, Advanced AI: Possible Futures** (the five worlds and ten endings) and **Europe 2031** (Juijn et al., June 2026, <https://europe2031.ai/>: Europe squeezed between the US and China if it does not act, and its five recommendations). The intro's *Built on* block and the ending's footer name all three; content resting on Europe 2031 is tagged *From Europe 2031*. What it brings (details in [SCENARIO_BASIS.md](SCENARIO_BASIS.md), section 3; stretches in the build notes, realism notes 38–43):

- **Washington rations Europe's AI** (Breaking news, a choice): a US rule puts most of Europe in a capped tier of access to American AI. *Take the cloud deal* (US cloud firms build in Europe under European law: US–China cooperation down a little, AI capabilities up a little) or *Build our own* (years away; firms ration AI meanwhile: Social cohesion down). Only for a Dependent Europe, outside a pause, after AI 2027's national-security milestone; once a game.
- **The squeeze in the news**: US models and Chinese robots, a US AI giant buying a German carmaker's plants for robots, a million Chinese humanoids a year, bond spreads and the euro; a Commission official's voice; a car worker in Saxony and a graduate in Lille; a march in Rome against cuts (social event).
- **Re-based**: the coalition of middle powers, the ASML lever, flexicurity and OpenBrain's data-centre request now rest on Europe 2031's recommendations and chapters.

## Plain words for newcomers (27 Oct)

Playtesters without an AI-governance background said "we don't get the point", "too jargony", "way too complex". The owner validated a plain-language pass:

- **Landing.** The first screen states the goal in one sentence and fits one phone screen (390×844): "You speak for Europe on AI. AI is about to start improving itself. You have five years to make sure that, when it does:" then the three stakes, each with its gauge's colour bar and name (AI is safe · AI safety; The US and China are talking · US–China cooperation; Europe holds together · Social cohesion), one line on what you do and when it ends, and a big **Play (about 15 min)**. Languages, Skip and a one-line credit (the three scenarios) are secondary; the full *Built on* block stays on the intro's last screen. Play leads to two short screens (the world today; what you can do, with the three friends), which Skip jumps over.
- **Takeoff, not "tipping point".** The game's title now names its mechanic. The clock gauge is **AI progress** (was AI capabilities), captioned "Takeoff at 80: AI improves itself, the game ends"; the tipping point is **takeoff** everywhere (tips, Help, the glossary, the heading line, the worlds dialog, the endings, the milestone, the advisor's and the engine's sentences). Translations: fr *décollage* (« l’IA décolle »), de *Abheben* (« die KI hebt ab »), es *despegue*, pl *przełom* ("start" would read as the game's start). Internal ids (`tipping`, `tippingAt`, `tipping_point`) are unchanged.
- **The clock explained.** Playtesters asked whether it can go back and how to slow it. The AI progress tip, its "?" and Help now say it goes up every round and never comes back down: Europe does not build these AIs, so no card slows them (true: only the theft and a Taiwan crisis move it outside the pace); what Europe can do is make the world ready. Takeoff: AI does AI research itself, too fast to steer, so the game ends and shows the world you built.
- **No "Envoy".** The player "speaks for Europe on AI" (landing, Léa's first letter, the Influence breakdown, "Welcome back"). The talks card hosts US and Chinese *diplomats*; Dana Whitfield is the *US negotiator* for AI and chips (her id stays `us_envoy`). One character still calls the player "Envoy" as a form of address.
- **Plain names** ("would a grandparent understand?"), meaning and basis kept: Host US–China talks (Diplomatic talks), Inspect the AI labs (Push for inspections), Hire testers for the AI Office (AI Office capacity), Team up with friendly countries (Coalition of middle powers), Bargain with ASML’s chip machines (Push to use the ASML lever), Guard AI from theft (Lock down AI models), Fund open European AI (Fund open models), Help workers learn new jobs (Back safety nets for AI layoffs), Shield hospitals from hackers (Cyber shield for hospitals and grids), Humans sign off on AI decisions (Human oversight mandate), A public lab for AI safety (A CERN for AI safety), Track where AI chips are (Fund chips that prove where they run), Treaty to license the strongest AI (Push for a licensing treaty), Call for a pause with other countries. Threats: AI theft (Model theft), Cyberattack wave (Ransomware wave), Threat to cut Europe off (Silicon blackmail; CFG's scenario keeps its name where it is cited). Léa's request speaks of "EU money to help people learn a new job" (not a "retraining fund"); the open-source request no longer says "systemic risk"; the union asks for a tax, not a levy.
- **Every cost has a why.** Each card carries a `why` (≤ 10 plain words) shown in Details as "Why the cost: …" (e.g. talks: "Critics at home call talking to rivals weak"); each request answer that moves something has its "Cost: …" (≤ 8 words; ten were missing). Two costs had no honest why and changed: the AI Office's testers and the bioweapons pact no longer lower Social cohesion; each costs 1 Influence, then Influence −1 next round (same total: money and political capital). Sim in the developer notes.
- **The heading line** reads "If takeoff happened now: [Race] · AI safety must reach 62 short" (was "Heading for [Race]: …"); with AI stalling, "AI may stall, leading to [Plateau] · …". The Why? link stays.

## Tutorial

Short tips, one at a time, next to what they explain, each once; switchable off, all listed in Help. A tip waits while its part of the screen is not visible.

**One system at a time (27 Oct).** Playtesters without an AI-governance background found the game "way too complex"; the owner validated a progressive dashboard for a first game. Display only: the engine's values exist and move from round 1 (no rule reads what is shown).

| Round | Joins the screen | Tips | New cards |
| --- | --- | --- | --- |
| 1 | AI capabilities, AI safety; the line under the gauges says "First, watch AI capabilities and AI safety…" (the two other gauges keep their place, dashed, "On the dashboard from round 2 / 3": no layout jump); Influence with its next-round amount | capabilities, safety, the map and the news (once the first items are out), Influence (decisions) | inspections (test the labs' models), AI Office capacity, AI safety research: AI safety only. No request in round 1. |
| 2 | US–China cooperation and the line on where the world is heading (goals and floors on the gauges come with it) | cooperation, where the world is heading, a request (the first one), diplomacy can fail (the first card with a chance) | diplomatic talks (plus threat-driven cards as before) |
| 3 | Social cohesion, and what Influence income depends on (the header's reasons) | cohesion, Influence income | open models, coalition, CERN for AI |
| 4+ | — | — | the audit (round 4), then as before |
| when it matters | Europe's AI badge: once it is no longer Dependent, when AI looks set to stall, or when the selected cards would change it | Europe's AI; an accord (the first accord on offer); a threat | |

What joins the screen is also announced ("New on the dashboard: US–China cooperation, the line on where the world is heading."); a gauge not yet shown moves silently (no change by it, nothing announced for it). A player who has finished a game in this browser, or who turned the tips off (or `?notutorial`), sees the whole dashboard from round 1; this is kept in the tutorial's own key (`takeoff.v4.tutorial`: `on`, `off`, `done`, `done-off`), with no new tracking. Help says so under the tips switch.

## Why? (the five worlds)

Where the world is heading now and what ending well needs (with the player's values and status), how to change course when another world is in reach, a diagram (cooperation zones if AI tips; Europe's AI if it stalls), **Europe’s AI: Open or Dependent** (what it means, which plateau worlds and endings it leads to, what changes it), then the five worlds with what decides each, and sources.

## The end screen

As in v3: the ending and its story, why in one sentence, the four gauges with their target and floor, the reveal (what the labs claimed, what was verified, the truth; the AI pace; the leaks), what would have changed it, the decisions in order, the threats, and Play again.

## Accessibility

As in v3 (keyboard alone, screen reader, reduced motion, WCAG AA contrast), with v4's additions: the decisions are a region of the page (focus on a card, Escape back to the map); request answers are buttons named by what they move, ← / → look then answer; map groups are buttons that open a list (Tab into it, Escape back); the feed is a tablist; Europe's AI chip is named "Europe’s AI: Dependent. Decides the world if AI never tips". Checked by `npm run test:e2e` and `npm run a11y`.

## Keep, change, remove

| Keep | Change | Remove |
| --- | --- | --- |
| The model and the ten CFG endings, Influence, the deck and its levels, threats and events, Léa, the end screen | Gauge names and layout; AI safety as verified–claimed; the heading line and targets on the gauges; no card cap; decisions in place of the map; Léa in the feed | The journal and the report; banners, voice bubbles, the leak button and Léa's portrait on the map; the decision dialog; the stop between rounds; sparklines; the outlook column and band |

## Open points

1. **Playtests** with the target audience (V3_SPEC, "Validation") are still to run on v4.
2. **Requests need Louis's review** (texts, answers, which kept and which dropped).
3. **Balance** after the v4 rules: see DEVELOPER_NOTES, "Tuning changes for v4", and the build notes' simulation section.
