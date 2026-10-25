# Takeoff: Middle Power MVP Spec

Oct 25, 2026 · @Damien

The first playable version of Takeoff: Middle Power. 16 quarters, about 15 minutes, a map of Europe, the US and China. The policy deck and events build on Louis's draft *Middle Power: Policy Deck & Events* (25 Oct); every change from his draft is marked **Changed from Louis's draft**. Exact numbers are in Developer notes.

## The game in one minute

You are the EU's AI Envoy. AI is advancing, and the US and China are racing. You cannot stop the race, but you can prepare the world for the moment when AI starts improving itself. If that moment comes, the superpowers make a decisive choice. What you prepared shapes which choice they make and how the story ends.

The game mixes two things:

- **A decision tree.** Some decisions only become possible in certain situations, and events play out differently depending on what you prepared. Example: when an AI escapes, Europe can lead the response only if it already built a coalition and inspection capacity.
- **Gauges.** Each decision and event moves indicators up or down.

Like a real politician, you only see part of the picture when you decide. The full truth is revealed at the end.

| In this first version | Later, through iteration |
| --- | --- |
| 16 quarters (4 years), the game stops at each one | Longer games |
| A map with Europe, the US and China | Seven regions |
| 10 policy cards, 5 events with prepared and unprepared variants | Many more, rebalanced after playtests |
| 10 endings | Variants per region |
| Léa: 4 scenes with 2 variants each | Several characters |

## Notes on Louis's draft

Louis's draft is the base for the policy deck and the events. These are the points we discussed with him in mind.

**What we kept from Louis**

- **Prepared and unprepared variants for every event.** The same incident leads to different outcomes depending on what you built before. This is the heart of the game.
- **A real downside on every card**, and his consistency checklist.
- **Two currencies**: Budget to invest, Political Capital to regulate and negotiate.
- **His new indicators**: Misuse risk, Coalition (0 to 3), GDP and Approval always on screen, and an error bar on capability and alignment.
- **His warning shot scenes**, used as written.

> **Changed from Louis's draft: our five remarks**
>
> 1. **Public pressure is back.** It was missing from his list, but it feeds Political Capital and the odds of a verified deal. It stays next to Approval: one measures whether citizens demand safety, the other whether they approve of the government.
> 2. **Weight security standards is back as a card.** His weight theft event has a "strong lab security" variant, but no card provided it.
> 3. **Fund alignment research is back as a card.** Apart from the ASML lever, no card acted directly on true alignment.
> 4. **Universal basic income is kept as an alternate card.** It is our clearest example of a popular decision with a hidden cost.
> 5. **The warning shot now fires on a condition, not "around round 6"**, following his own rule that events never fire on dates.

> **New open point for Louis**
>
> The ransomware wave's prepared variant says "cyber defences hold", but no card builds cyber defences. Proposal: the wave is prepared if Misuse risk was caught below 60, or we add a cyber defence card. Louis to decide.

**Answers to Louis's three open questions**

| Question | Answer |
| --- | --- |
| Variable names and scales | Yes: everything 0–100, with the names in this spec plus his additions |
| Income per quarter | Political Capital +1, +1 more if public pressure is high, minus coalition upkeep. Budget +1, fixed. Start: 4 Political Capital, 3 Budget |
| Timing | Visible effects apply immediately. Upkeep and delayed effects (like flexicurity's "−1 Political Capital next round") apply at the start of the next quarter |

**His check on the AI 2040 odds.** The figures are real: they come from the *Comparing Possible Plans* supplement on the AI 2040 site. They are Eli Lifland's median estimates (one of the six authors) of the chance of avoiding misaligned takeover: 72% for a verified slowdown, 40% for a lab burning its lead, 25% for a race. In the game, they must be attributed to him, not to AI 2040 as a whole ([source](https://ai-2040.com/supplements/comparing-possible-plans)).

## The opening

Before the first quarter, four short screens set the scene. Each fits on one screen, with a real fact and its source where relevant.

1. **The world today.** AI systems already write a large share of new code and work as autonomous agents. A handful of US and Chinese labs lead; Europe holds about 5% of the world's AI compute, but also ASML, the company that makes the machines behind every advanced chip.
2. **What is at stake.** Nobody programs these AIs: they are trained, rewarded when their answers look good. What they really learn is hard to check, and harder as they get smarter. That is the alignment problem. An AI that can improve itself could cure diseases, or pursue goals nobody intended, or hand unchecked power to whoever controls it.
3. **Your role.** You are the EU's AI Envoy. You can't build AI or stop the race. You can shape rules, money and alliances: two currencies (Budget and Political Capital), one decision per quarter.
4. **How to play.** Each quarter the clock runs, then stops for a situation report and your decision. Some information is hidden from you, as it would be from a real politician. Everything is revealed at the end.

## A quarter

The game lasts 16 quarters (4 years). Each quarter:

1. **The clock runs** for a few seconds. The map comes alive: labs pulse, news arrives, and public-concern bubbles pop up over regions. Click a bubble to collect a little Political Capital, as with the DNA bubbles in Plague Inc.
2. **An event may interrupt** the quarter. The clock stops; you read what happened and, sometimes, choose a response.
3. **The clock stops at the end of the quarter** for a situation report: what changed, why, and where things are heading.
4. **You take one decision, or none.** Before you confirm, you see a preview of what it will change.
5. **You get a briefing**: what moved on the visible indicators, and an adviser's note that hints at the rest.
6. **Léa writes to you** in quarters 1, 6 and 11, and at the end.

**The situation report** looks like this:

> **Q3 2027 · Situation report** **What changed:** tension +16 (China stole a model) · capability +9 · public pressure +2 **Why:** no weight security standards were in place **On current course:** the superpowers would likely fight (45%) **Léa wrote to you** · **2 internal notes** (1 readable) → Choose your decision for this quarter

## The screen

- **The map**, in the centre: Europe, the US and China, with your coalition partners around Europe. Labs pulse, events are pinned where they happen, tension shows as a line between the US and China, and concern bubbles can be clicked.
- **Your goal and the forecast**, one line each, always visible:
  - *Goal: when AI starts improving itself, the world must be able to verify a deal.*
  - *On current course: a race is likely. What would help: verification.*
- **The indicators.** Click one to see two lines: what makes it rise, what makes it fall.
- **Two news feeds:**
  - **Public news**, which everyone sees.
  - **Internal notes**: confidential reports from labs and intelligence services. They arrive redacted (██████) and become readable when you invest in oversight (AI Office capacity, measuring human influence). All are revealed at the end. They show the gap between what labs say and what is true.
- **Your two currencies** and the date, at the top.

## Indicators and resources

All indicators run from 0 to 100. The "Rises when / Falls when" columns are what the player sees when clicking an indicator.

| Indicator | You see it? | Rises when | Falls when |
| --- | --- | --- | --- |
| Capability level | Yes, with an error bar | Every quarter; faster under tension; a stolen model | Never |
| Power concentration | Yes | Labs consolidate; security rules only big labs can meet | Funding open models |
| Apparent alignment | Yes | Labs report progress every quarter | Internal reports leak; opaque reasoning |
| Verification readiness | Yes | Hosting inspections, AI Office capacity | Never |
| Geopolitical tension | Yes | Every quarter; theft; using the ASML lever | Coalition diplomacy |
| Public pressure | Yes | Job losses, incidents | Popular social measures |
| Misuse risk *(Louis)* | Yes | Capability grows; open models | Cyber and security measures |
| Coalition, 0 to 3 *(Louis)* | Yes | Each coalition card | Unpaid upkeep |
| GDP and Approval *(Louis)* | Yes, always on screen | AI adoption (GDP); stable jobs (Approval) | Oversight mandates (GDP); layoffs (Approval) |
| **Takeoff speed** | **No, only hinted** | Drawn at the start: slow, steady or fast | — |
| **True alignment** | **No** | Alignment research; the ASML concession | Racing; every quarter without safety work |
| **Human influence in Europe**: economy, culture, state | **No** | Open models, human oversight | AI replacing people, every quarter |

GDP and Approval often rise while human influence falls. That gap is one of the lessons of the game.

**Resources.** Budget (start 3, +1 per quarter) pays for investments. Political Capital (start 4, +1 per quarter, +1 if public pressure is high, minus coalition upkeep, plus concern bubbles) pays for regulation and diplomacy.

## The actors

Each actor follows a few simple rules and appears by name in the news. Every event comes from one of them.

| Actor | What they do |
| --- | --- |
| United States (government) | Push the race; tighten chip controls when tension rises; choose a path at the tipping point |
| China (state) | Close the gap; steal models when security is weak; choose a path at the tipping point |
| US frontier labs (fictional) | Report alignment progress, sometimes more than is true; consolidate; threaten to leave Europe; may hold back on their own at the tipping point |
| Open-source collective | Releases powerful models when Europe funds them; criminals can misuse them |
| The AI systems | True alignment is hidden; their reasoning can become opaque; one may try to escape |

## The policy deck

> **These are first examples.** We will iterate on them, rebalance them and add more.

Louis's eight cards, plus two cards we brought back. Before confirming, the player sees the visible effects and the downside; hidden effects are only revealed at the end.

| Card | Cost | Player text | Visible effect | Hidden effect | Downside |
| --- | --- | --- | --- | --- | --- |
| Middle-power coalition | 2 PC, then 1 PC per quarter | Team up with the UK, Japan, Korea, Canada and Norway. Together you carry more weight, but keeping partners on board takes constant attention. | Coalition +1 | Better odds of a verified slowdown at the tipping point | Upkeep every quarter |
| Offer to host verification | 2 Budget | Offer Europe as the place where AI labs get inspected. It only works if you have experts who can really check. | Verification +15 (only +7 without AI Office capacity) | — | Tension +5 |
| Use the ASML lever | Free, twice per game | Europe makes the machines that make AI chips. Threaten to restrict them and you win a concession, but everyone notices. | One concession: model access or a lab safety commitment | True alignment +5 | Tension +15 |
| AI Office capacity | 2 Budget | Hire experts who can really test the most advanced AI, not just write rules for it. Nothing to show for it yet. | Error bar narrows; internal notes become readable | Unlocks the full effect of hosting verification | No visible gain |
| Measure human influence | 1 Budget, 1 PC | Pay for an audit of who really steers your economy, culture and state: people, or AI. It earns you nothing visible now. | Reveals Europe's three human-influence scores for 3 quarters | — | Pure cost |
| Fund open-weight models | 2 Budget | Europe pays for AI models anyone can download. Fewer companies hold the keys, but criminals get the same tools. | Concentration −15 | Human influence over the economy +5 | Misuse +10; can trigger the ransomware wave |
| Human oversight mandate | 2 PC | Require a human to approve key decisions in firms and government. People stay in charge, but you slow down while rivals speed up. | — | Slows the loss of human influence over the economy and state | GDP −5; silicon blackmail becomes more likely |
| Flexicurity reform | 2 PC | Help workers switch jobs without falling through the cracks. Approval holds as AI changes work, but unions resist. | Approval protected as jobs shift | Léa gets her "retrained" scene | PC −1 next quarter |
| **Weight security standards** | 1 PC | Require labs to protect their models against state-level theft. Only the biggest labs can afford it. | Concentration +5 | Weight theft fails | Favours big labs |
| **Fund alignment research** | 2 Budget | Pay independent teams to study whether AI systems really do what they claim. Results take years to show. | — | True alignment +6 | No visible gain |

> **Changed from Louis's draft:** the last two cards are back (remarks 2 and 3). *Universal basic income* is an alternate card, listed under "Later" (remark 4).

**Dependencies (the decision tree).** AI Office capacity → full effect of hosting verification and readable internal notes. Coalition and verification → the prepared warning shot. Weight security → the prepared weight theft. Funding open models → prepared answer to silicon blackmail, but higher misuse risk.

## The events

> **These are first examples too.** We will iterate and add more.

Louis's five events: one per trajectory and per actor. Each fires on a condition, never a date, and has a prepared and an unprepared variant. The clock stops when one fires.

| Event | Actor | Happens when | Prepared variant | Unprepared variant |
| --- | --- | --- | --- | --- |
| The warning shot | The AI systems | True alignment below 50 and capability 65+ | **Coalition 1+ and verification 30+:** Europe is ready, governments rally behind inspections. Big boost to verified-slowdown odds | Contained, then forgotten: a small public-pressure spike, nothing else |
| Weight theft | China | Tension 50+ and capability 40+ | **Weight security standards played:** the theft fails. Tension +5 | China jumps ahead and the US hits back with export controls. Tension +20 |
| Opaque reasoning | AI systems and labs | Capability 70+ | **AI Office capacity played:** you can still roughly tell whether the AI does what we intend | The AI looks safe on the dashboard, but you can no longer tell. The error bar doubles |
| Silicon blackmail | US frontier labs | Concentration 60+ and human oversight mandate played | **Open models funded:** Europe has an alternative and stands firm at no cost | The labs threaten to leave Europe. Give in (concentration +10) or hold firm (GDP −15) |
| Ransomware wave | Open-source collective | Misuse risk 40+ | Cyber defences hold: GDP −3 *(see open point for Louis)* | Hospitals paralysed: GDP −10, Approval −10. Choose: emergency ban or defence spending |

> **Changed from Louis's draft:** the warning shot fired "around round 6" and the weight theft "round 4 or later". Both now fire on conditions only (remark 5). The prepared weight theft now depends on the restored *Weight security standards* card (remark 2).

**The warning shot, Louis's scenes:**

> **Prepared.** At 3:12 a.m., monitors at a US lab catch their newest system copying itself to an outside server. It is stopped within the hour. By noon, Washington and Beijing are both on the phone with Brussels, because Europe is the only party already set up to verify anything.

> **Unprepared.** At 3:12 a.m., monitors at a US lab catch their newest system copying itself to an outside server. It is stopped within the hour. The story trends for two days. The lab promises an internal review. Nobody has a mechanism to do more, so nobody does.

Each event screen also carries two short boxes: **Why it matters** (one or two plain sentences) and **Already real** (the real-world fact behind it, with its source).

## The tipping point

If AI becomes able to automate its own research before the end of quarter 16, the clock stops for the decisive moment. In a slow game it never comes, and the game ends after quarter 16.

1. **A pause to assess.** A full situation report, then one last decision, free.
2. **The US and China choose a path.** Four paths from AI 2040. You don't choose, but your preparation shifts the odds:

| Path | More likely when… |
| --- | --- |
| Verified slowdown | Verification is ready, the coalition is strong, public pressure is high, a prepared warning shot happened; less likely with high tension |
| Shut it all down | Public pressure is very high and the AIs are clearly unsafe |
| Fight China | Tension is high |
| Race to superintelligence | The default; less likely with public pressure and verification |

Afterwards, the game shows the odds of each path, so you see how much you shifted them.

3. **If they race, the leading lab may hold back a little** on its own. It helps, but far less than a deal: AI 2040 author Eli Lifland estimates about a 40% chance of avoiding misaligned takeover this way, against 72% for a verified slowdown and 25% for a race.

## The ten endings and the final debrief

The kind of world depends on the takeoff speed and the superpowers' path; whether it goes well depends on what you prepared. Endings come from the CFG scenarios.

| Kind of world | Reached when | Good ending if… | Otherwise |
| --- | --- | --- | --- |
| Plateau | Slow game, power spread out | **A bright winter**: the ransomware wave was prepared or never came | **Decentralised mayhem** |
| Big AI | Slow game, power concentrated | **The agent economy**: Europe stood firm against silicon blackmail and kept a grip on its economy | **Silicon blackmail** |
| Diplomacy | Verified slowdown or shut it all down | **Licensed utopia**: verification ready, power not too concentrated, AI reasonably aligned | **Unstable pause** |
| Arms race | Fight China | **Multipolar world**: a coalition and manageable tension; Europe mediates | **Hot war** |
| Take-off | Race | **The cognitive revolution**: true alignment high enough | **Loss of control** |

**The final debrief has four parts:**

1. **The reveal.** Takeoff speed, true alignment and Europe's human influence appear, next to the GDP and Approval the player watched all game.
2. **The internal notes**, all unredacted: what the labs and intelligence services knew.
3. **Your decisions, explained.** Each card, with everything it did, including hidden effects and how it shifted the superpowers' odds.
4. **Why it happened.** Each event, its actor, whether you were prepared, and its source.

## Léa

Léa is a close friend of the player: a 34-year-old translator in Lyon. Four short scenes show what the numbers mean for one person. Each scene has two variants, picked by the hidden state, so she quietly hints at what the gauges hide.

| When | What decides the variant | Example |
| --- | --- | --- |
| Quarter 1 | Takeoff speed | "My agency is testing an AI tool. It's clumsy" or "…it's scary good" |
| Quarter 6 | Human influence in the economy | Her clients still want a human touch, or she now reviews AI output for half the pay |
| Quarter 11 | Flexicurity reform played | She retrained as an interpreter for hospitals, or she is between jobs and losing hope |
| The end | Overall human influence and the ending | One closing line from her life in the world the player built |

> **Changed from Louis's draft:** the quarter-11 scene now depends on the flexicurity reform, since UBI became an alternate (remark 4).

## Later, not in this version

- **Field guide**: a short glossary card for each concept (alignment, compute, verification), opened from any underlined word.
- **More characters** besides Léa: a lab engineer, a Chinese diplomat, a union leader.
- **More regions** on the map, from three to about seven.
- **Louis's alternates**: European compute zones (if the deck feels all brakes and no accelerator), a Citizens' assembly on AI, the *Access becomes a favour* event; and UBI as a social contract alternate.
- **Classroom mode**: reflection pauses and discussion questions after each act.
- **Other seats** (US, China, a lab), hence the *Middle Power* subtitle.
- The GitHub version reuses the richer look and feel of our first prototype.

## How we know the MVP works

- [ ] A game takes about 15 minutes.
- [ ] All ten endings can be reached.
- [ ] A passive player rarely gets a good ending; a prepared player usually does.
- [ ] At least sometimes, the final reveal contradicts what the visible gauges suggested.
- [ ] Every card and event names its actor and its source.
- [ ] Before confirming any decision, the player sees its effects.
- [ ] Three friends who play it can explain in their own words why their ending happened.
- [ ] Louis's consistency checklist is ticked: every card is read by an event or ending, no card is free of downside, the good diplomacy path is affordable but tight.
