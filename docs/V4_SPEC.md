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
| No requests | **Requests**: 46 cards from 11 characters, free of Influence, answered left or right |
| Léa's letters in a dialog | Léa's **letter in full in the feed** with her small portrait, "Letter from Léa, your friend in Lyon", and an envelope in Europe's map group |

## The main screen

From top to bottom:

- **The header**: the title, the date and round ("H1 2028 · Round 3 of 10" with a 10-step progress bar), pause and speed (×1, ×2), the phase in words ("Clock running", "A request", "Your decisions"), Influence with next round's income and its reasons and a "?" (what Influence is, what each round brings, how to earn more), and Help.
- **The four gauges**, one card each, the same rows aligned across them: name and "?", the value with this round's change and a status chip, the bar with its marks, one caption.
  - *AI capabilities*: the clock; the tipping point at 80 is a hatched zone. When the tipping point looks at most four rounds away (visible values only), "tipping in ~2–4 rounds".
  - *AI safety*: verified–claimed ("40–56"), the goal when it is the deciding gauge, caption "Verified 40 · labs claim 56 · goal 75".
  - *US–China cooperation*: three zones (Rupture, Race, Pause); the current one outlined and named in the caption ("Race zone · 30–59").
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
4. **Breaking news may strike**: the clock stops for its screen (impact before → after, prepared or not, an "Already real" fact), then resumes.
5. **The clock stops.** "What changed" (the three biggest changes with their cause) tops the feed. Nothing opens by itself; the dock offers "Make my decisions".
6. **Decisions** (below), then **consequences**: the gauges move and show their change, the decisions enter the feed with what they changed, and the next six months begin.
7. The game ends at the **tipping point** (capabilities 80, never before round 6) or after **round 10** (H2 2031; 12 rounds to H2 2032 until 26 Oct): "See how it ends".

## Requests

A character arrives during the six months with a short request (≤ 40 words) and two answers (left and right; no fixed convention on which side goes along). Answering is **free of Influence: the cost is in the answer**, and both answers cost something visible (a gauge, a growing threat, Europe's AI, the coalition, or a delayed effect announced on the card).

- **Characters** (all fictional; OpenBrain and DeepCent are AI 2027's): Dana Whitfield (US envoy), Li Wen (China's delegate in Geneva), Marcus Hale (OpenBrain's CEO), Dr Ines Moreau (independent evaluator), Katrin Vogel (union leader), Tomas Novak (open-model collective), General Aurélie Brandt (EU cyber and intelligence), Minister Hana Sato (Japan and the middle powers), Sam Okafor (journalist), the three friends back home (Léa, your mother, Malik), and "Agent", OpenBrain's frontier model speaking for itself.
- **Which comes**: first a request tied to a milestone reached this round or to a growing threat, else a seeded draw; 6 to 10 a game; never the same one twice. Three **follow-ups** come back on an earlier answer ("I warned you").
- **On the card**: the character's portrait, name and role, the request, "Free of Influence", the two answers with their effects as chips (+ / − and words), "If AI tipped now" when an answer would change the world, and **Learn more** (a sourced fact or the scenario passage it echoes).
- **Answering**: click an answer, swipe the card, or press ← / → once to look (the answer is highlighted and announced) and again to answer. The character reacts, with what changed. Requests and answers stay in the feed.
- Requests never widen the AI safety uncertainty (only events and the labs' reports do).

## Decisions

"Make my decisions" replaces the map and the feed with the decisions; the header, the gauges and the heading line stay.

- **The hand**: one card per policy, with its cost, effect chips, what it protects against, its level, its tags (New, Opportunity with rounds left, Recommended, Selected). *Details* opens the full proposal, the real-world example and cost with sources, and its levels.
- **The chief of staff** gives one recommendation, in words, without numbers.
- **Select** any number of cards Influence covers (a click toggles; the hand shows what is still affordable). The selection **previews on the real gauges** ("→ 55", a dotted mark on the bar, the targets dashed where they would move) and in the line ("If you confirm: Heading for [Race] → [Pause]") only when the world or a goal's status would change; Europe's AI chip shows "Dependent → Open".
- **Active threats** are listed beside the hand ("Prepared if you confirm").
- **Confirm** (n cards, cost), **Play no card**, or **Back to the map** (Escape).

## The news feed

- **This round**: every item as it appears, newest first, each a button with an icon and a type ("Headline", "AI 2027 milestone", "Threat", "Heard in Europe", "Leak", "Breaking news", "Request · Li Wen", "Letter from Malik, your old flatmate in San Francisco", "Strike · Paris, France · in this story", "Your decision"), and what it changed.
- **Social events**: one or two a round, different each game, in a European city: strikes, protests, scandals, layoffs (the two job shocks too) and good news, each with a headline, one line on why it matters (a real precedent, or the scenario it echoes) and what it changed. Bad news comes more often when Social cohesion is low or AI capabilities high.
- **What changed** tops it when the six months end; **Earlier** holds past rounds by date, each with its own "What changed".
- Choosing an item shows it on the map (its threat lights up, or its region's group opens with the item highlighted); choosing a map item highlights it here. **N** jumps to the feed.

## The map

A dot-matrix world centred on the US–Europe–China band (Europe's colour covers Europe only), with the labs pulsing faster as capabilities rise, coalition partners lighting up around Europe (briefly brighter as each joins), protests over European cities and Europe's dots dimming as Social cohesion falls, and a soft ripple from the labs when AI capabilities jump.

- **Threat icons** where the threat would strike, larger at each stage, green with a check once Europe is prepared; each opens what protects Europe.
- **Groups**: the round's items as small icons by type, one group per region (the US, Europe, China) with a count. Hover or click opens its list (Tab goes into it, Escape closes it). A friend's letter is an envelope, first in its region's group (Europe for Léa and your mother, the US for Malik); the leak is in the US group and opens from there. While a request is open, the character's group is marked "Request".
- **Social events** join Europe's group with an icon by kind (a briefcase for jobs, a picket sign, a megaphone, an alarm, a spark for good news) and a mark at their city: bad news is a hotspot that pulses gently (steady with reduced motion), good news glows.
- Only the newest headline shows briefly as a banner by its group.

## Friends back home (26 Oct)

Léa used to be the game's human heart; she had become one feed item among others. Team decision of 26 October: **three friends back home**, each the human face of one part of the world, introduced on the intro's second screen with their portraits ("the people you're doing this for", one line each):

- **Léa**, your old friend, a translator in Lyon: her job, the fear of being replaced → **Social cohesion**. Her letters are v3's, kept.
- **Your mother**, a retired nurse in Lyon who still helps at her old hospital: AI arriving in the wards, trust, then a near miss or an inspection → **AI safety as lived**.
- **Malik**, your old flatmate, an engineer at an AI lab in San Francisco: he sees progress from inside (→ **AI capabilities**), lives the US–China rivalry up close (a Chinese colleague without a visa, chips under guard, fear of conflict → **US–China cooperation**), and left Europe because it had no job like his (→ **Europe's AI**). The honest pro-AI voice: not a villain, not naive.

**Letters.** Seven a game at most, one a round, each **opening its round full screen as a postcard** before the clock starts, then kept in full in the feed with the friend's small portrait and in their region's map group (Malik's in the US group): round 1 Léa, 2 Malik, 3 your mother, 5 Léa, 6 Malik, 7 your mother, 9 Léa (`letters.schedule`; a game that tips early sees fewer). Each letter comes from a pool picked by the world's **visible** state (Léa: job shocks and Social cohesion, flexicurity; Malik: US–China cooperation, Europe's AI, whether AI 2027's self-improving AI is reached; your mother: what is verified about AI safety, whether the labs have declared their model aligned), with variants drawn from the seed. Letters **move no gauge** and never hint at the true AI safety or the pace. First person, short, no policy words, no numbers, signed "L.", "Love, Mum", "M.".

**Epilogues.** The end screen has "Back home, <year>" (the year the game ended, like "The world in <year>" above it): one short epilogue per friend (≤ 35 words) for each of the ten endings, with their mood. It replaces Léa's last letter.

**Requests.** Léa keeps her three; your mother brings two (back her old hospital's AI triage pilot; make hospitals report near misses) and Malik two (fast-track visas for AI researchers such as his Chinese colleague; welcome his lab's Paris office, which would bring him home but make Europe's AI Dependent).

## Tutorial

Short tips, one at a time, next to what they explain, each once; switchable off, all listed in Help. Round 1: one tip per gauge (capabilities, safety, cooperation, cohesion), then where the world is heading, then Influence on the decisions. Later, the first time it appears: a request (stacked over the request card), a threat, Europe's AI (from round 2). A tip waits while its part of the screen is not visible.

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
