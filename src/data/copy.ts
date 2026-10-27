// Player-facing words that are not cards, threats, events, headlines or letters:
// labels, the two intro screens, the tutorial's coach marks and the help.

import type { Fact, FriendId, GaugeKey, Pace, Zone } from '../engine/types';
import { SOURCES } from './sources';

export const GAUGE_LABEL: Record<GaugeKey, string> = {
  aiPower: 'AI progress',
  cooperation: 'US–China cooperation',
  confidence: 'AI safety',
  cohesion: 'Social cohesion',
};

/** One short line under each gauge's name: what it measures, in plain words. It shows when all four fit on one
 *  line (on phones it may stay behind "?"); it is always in the gauge's "?" and its description. */
export const GAUGE_SUB: Record<GaugeKey, string> = {
  aiPower: 'How close AI is to improving itself',
  cooperation: 'Do the superpowers talk or race?',
  confidence: 'Does AI do what we intend?',
  cohesion: 'Does Europe hold together?',
};

/** What takeoff means, on the AI progress gauge. */
export const TIPPING_LINE = (at: number) => `Takeoff at ${at}: AI improves itself, the game ends`;

/** "41 verified, 71 claimed": what has been verified (the truth is never lower) and what the labs claim (never higher). */
export const lowText = (reported: number, low: number) => `${low} verified, ${reported} claimed`;

/** "AI safety: more verified (41 → 56)": the word follows the verified part, the part that counts (a wider
 *  uncertainty can still verify more when the claim rises further). The truth is never above the labs' claim, never
 *  below what is verified. The last two arguments are unused and kept for the callers. (The simulation's request
 *  scoring reads the two numbers in these chips.) */
export const verifiedWord = (lowBefore: number | string, lowAfter: number | string) =>
  Number(lowAfter) > Number(lowBefore) ? 'more verified' : Number(lowAfter) < Number(lowBefore) ? 'less verified' : 'no more verified';
export const marginText = (lowBefore: number | string, lowAfter: number | string, _uBefore?: number, _uAfter?: number) =>
  `${GAUGE_LABEL.confidence}: ${verifiedWord(lowBefore, lowAfter)} (${lowBefore} → ${lowAfter})`;

export const GAUGE_HELP: Record<GaugeKey, string> = {
  aiPower:
    'How close AI is to takeoff: the moment it does AI research by itself and improves itself. It goes up every round and never comes back down. Europe does not build these AIs, so no card slows them; you can make the world ready. At 80, AI takes off: from then on things move too fast to steer, so the game ends and shows the world you built.',
  cooperation:
    'Trust between the US and China. Pause 60+, Race 30–59, Rupture below 30. The zone at takeoff sets the kind of world.',
  confidence:
    'Does AI do what we intend? The labs report a number, but nobody has checked all of it. Only the verified part counts toward your goal: the solid part of the bar. The hatched part is what the labs claim and nobody has verified. The AI Office, inspections and audits grow the verified part; secrecy and AI whose thinking nobody can read shrink it. The truth lies in between, revealed at the end.',
  cohesion: 'Whether European society holds together: jobs, trust in institutions, safety from misuse.',
};

export const ZONE_LABEL: Record<Zone, string> = { pause: 'Pause', race: 'Race', rupture: 'Rupture' };

export const PACE_TEXT: Record<Pace, string> = {
  slow: 'slow: AI improved gradually',
  steady: 'steady: AI improved at a constant clip',
  fast: 'fast: AI sped up its own research early',
};

export const STAGE_WORD = { 1: 'Watch', 2: 'Rising', 3: 'Imminent' } as const;

export interface IntroScreen {
  title: string;
  paragraphs: string[];
  /** The three stakes, one per gauge that decides the ending (AI safety, US–China cooperation, Social cohesion, in
   *  that order: each takes its gauge's colour and name). */
  stakes?: string[];
  /** A line after the stakes. */
  after?: string;
  /** A small line under the buttons (the landing's credit). */
  credit?: string;
  /** The three friends back home, one line each with their portrait: the people you are doing this for. */
  friends?: { friend: FriendId; line: string }[];
  fact?: Fact;
}

/** The landing (the first screen, one phone screen: what you do and why, in one sentence, then Play), then two
 *  screens for those who want the story before playing. Skip goes straight to round 1. */
export const INTRO: IntroScreen[] = [
  {
    title: 'You speak for Europe on AI',
    paragraphs: ['AI is about to start improving itself. You have five years to make sure that, when it does:'],
    stakes: ['AI is safe', 'The US and China are talking', 'Europe holds together'],
    after: 'Each round, answer requests and play policy cards. When AI starts improving itself (takeoff), the game ends and shows the world you built.',
    credit: 'Built on three published scenarios: AI 2027, CFG’s Possible Futures and Europe 2031.',
  },
  {
    title: 'The world today',
    paragraphs: [
      'AI is grown, not built. Nobody writes these systems line by line: they are trained on huge amounts of data, and what they learn is hard to check, even for their makers. They are improving fast.',
      'Two labs lead the race: OpenBrain in the US and DeepCent in China. Both come from the AI 2027 scenario and are fictional, as is everything that happens after today.',
    ],
    fact: {
      text: 'In 2025, Anthropic wrote that its AI models “aren’t programmed directly by humans” and that “we don’t understand how models do most of the things they do.”',
      source: SOURCES.anthropicInterp,
    },
  },
  {
    title: 'What you can do',
    paragraphs: [
      'Europe does not build the leading AIs, so it cannot stop them. It can make the world ready for them, with Influence and policies.',
      'Ten rounds of six months, from 2027 to 2031. Each round, watch the news, answer requests, then play as many cards as your Influence allows. The calmer the world, the easier a good ending.',
    ],
    friends: [
      { friend: 'lea', line: 'Léa, your oldest friend, translates for a living in Lyon. She wonders whether there will still be work for people like her.' },
      { friend: 'mother', line: 'Your mother, a retired nurse in Lyon, still helps out at her old hospital, where the first AI tools are arriving.' },
      { friend: 'malik', line: 'Malik, your old flatmate, builds AI at a lab in San Francisco. He loves it, and he has no job like it back home.' },
    ],
    fact: {
      text: 'Since August 2025, makers of new general-purpose AI models offered in the EU must follow EU rules. Since August 2026, the European Commission can enforce them, with fines.',
      source: SOURCES.gpaiGuidelines,
    },
  },
];

/** "Built on" (the intro's last screen, replacing the old credits line): the three scenarios, the calendar, and the
 *  provenance tags the news carries. At most about 95 words, to fit a phone screen (390×844). */
export const BUILT_ON = {
  title: 'Built on three scenarios',
  scenarios: [
    { name: 'AI 2027', by: 'Kokotajlo et al., 2025', what: 'AI improving itself by late 2027, told through two fictional labs.', source: SOURCES.ai2027 },
    { name: 'Advanced AI: Possible Futures', by: 'Centre for Future Generations, 2025', what: 'five worlds, from an AI plateau to an arms race; ten endings.', source: SOURCES.cfg },
    { name: 'Europe 2031', by: 'Juijn et al., 2026', what: 'Europe squeezed between the US and China unless it acts.', source: SOURCES.e2031 },
  ],
  calendar: { text: 'AI 2027 is the fast case; its authors now expect it later. Here dates move with the pace.', source: SOURCES.aifTimelines, linkText: 'their update' },
  tags: ['Real', 'From AI 2027', 'From CFG', 'From Europe 2031', 'Invented'],
  tagsText: 'Every news item says where it comes from:',
};

/** Coach marks: each shown once, pointing at `anchor` (data-coach values, space-separated: all are highlighted),
 *  only when it is on screen. In `text`, a new line starts a paragraph and **x** is bold (rendered by tipHtml).
 *  Before the first decision: one per gauge, where the world is heading, then Influence; after that,
 *  only what does not explain itself, the first time it appears. All are listed in Help. */
export const TIPS = {
  capabilities: { anchor: 'clock', title: 'AI progress', text: '**AI progress** is the clock: it goes up every round, never down. Europe doesn’t build these AIs, so no card slows them: make the world ready instead. At 80, **takeoff**: AI does AI research itself, too fast to steer, and the game ends.' },
  safety: { anchor: 'confidence', title: 'AI safety', text: '**AI safety**: the solid part is verified, the hatched part is only what the labs claim. Only the verified part counts: inspections and audits grow it.' },
  cooperation: { anchor: 'cooperation', title: 'US–China cooperation', text: '**US–China cooperation** sets the kind of world at takeoff. Pause 60+, Race 30–59, Rupture below 30: the calmer, the easier a good ending.' },
  cohesion: { anchor: 'cohesion', title: 'Social cohesion', text: '**Social cohesion** is whether Europe holds together: jobs, trust, safety from misuse. If it falls too low, even a calm world ends badly.' },
  outlook: { anchor: 'heading', title: 'If takeoff happened now', text: 'If AI took off now, this is the world you would get and what it needs to end well. Each round is six months from 2027; the game ends at takeoff, or after 10 rounds.' },
  influence: { anchor: 'dec-influence', title: 'Influence', text: 'Your political weight, and your one resource. You earn some every round, more when Europe holds together and allies share the load. It pays for policy cards: play as many as it covers, or save it.\nClick a card to select it: the gauges and the line under them show its effect before you confirm. **Details** shows the whole card.' },
  request: { anchor: 'request', title: 'A request', text: 'Someone needs an answer. Look at an answer first (click it, or press ← → once), then answer (again). Asking costs nothing: the cost is in the answer, sometimes Influence.' },
  threat: { anchor: 'map', title: 'A threat is growing', text: 'Threat icons grow in three stages before they strike. Prepare with cards marked “Protects against”, or with some answers to requests. Open an icon to see what protects Europe.' },
  badge: { anchor: 'badge', title: 'Europe’s AI', text: 'Open or Dependent: does Europe run its own models? If AI never takes off, this badge decides the kind of world.' },
  // the progressive dashboard (27 Oct): each comes the first time its part of the game matters
  mapFeed: { anchor: 'map feed', title: 'The map and the news', text: 'The map shows where things happen; the feed tells you what happened. Click an icon on the map to find its story in the news, or a story to see where it happened.' },
  income: { anchor: 'influence', title: 'Influence income', text: 'Why you earn what you earn now shows by your Influence: +2 a round, +1 more when **Social cohesion** is 60 or more, −1 below 35, and +1 once allies share the load.' },
  chances: { anchor: 'odds', title: 'Diplomacy can fail', text: 'Cards that need others to agree say how likely they are to work: **Likely to work**, **Uncertain** or **Long shot**. If one fails, its Influence is spent and nothing else happens; you can try again later.' },
  accords: { anchor: 'accord', title: 'An accord', text: 'Some cards go further once Washington and Beijing agree to be checked, like the **inspection accord** that lets European inspectors into their labs. Accords open only after a crisis, or with US–China cooperation in the Pause zone.' },
} as const;
export type TipId = keyof typeof TIPS;

export const HELP = {
  shortcuts: [
    ['Space', 'Pause or resume the clock'],
    ['Enter', 'Continue, confirm or make your decisions'],
    ['Escape', 'Close a window'],
    ['?', 'Open this help'],
    ['N', 'Jump to the news feed'],
    ['← →', 'In a request: look at an answer, press again to answer'],
  ] as [string, string][],
  rules: [
    'AI progress goes up every round and never comes back down: Europe does not build these AIs. At 80, AI takes off: it does AI research itself, too fast to steer (never before round 6). The game ends, and where the world stands then decides the ending. If AI never takes off, the game ends after round 10.',
    'At takeoff, the US–China cooperation zone sets the world: Pause, Race or Rupture. Without takeoff, Europe’s AI badge sets it.',
    'In each world, one gauge decides (its goal) and the other pillar is a safety net (its floor). Both are marked on their gauges, and the line under the gauges names the world you would get if takeoff happened now. Europe’s AI, at the end of that line, decides the ending if AI stalls under a few big labs.',
    'AI safety shows what is verified and what the labs claim (for example 40–57). Only the verified part counts toward your goal. The truth lies in between and is revealed at the end. Checks (the AI Office, inspections, audits) grow the verified part; secrecy and AI whose thinking nobody can read shrink it.',
    'Requests: the right answer goes along with what is asked, the left one refuses or puts it off. Both cost something.',
    'Influence is your political weight in Brussels and abroad: +2 a round, +1 when Social cohesion is 60 or more, −1 below 35, +1 with coalition level 2. Play as many cards a round as your Influence covers, each card once.',
    'Before you decide, a card shows how much it moves each gauge with arrows: ↑ a little, ↑↑ some, ↑↑↑ a lot (↓ for down). Details says it in words, with the card’s conditions. The numbers show once it is played.',
    'Diplomacy can fail. The talks, the coalition, accords, the ASML bargain, pacts, the pause call and the treaty say how likely they are to work. If one fails, its Influence is spent, nothing else happens, and the news says why.',
    'To decide, click the cards you want, as many as your Influence covers: their effect shows on the gauges and the line under them. Nothing happens until you confirm; Play no card saves your Influence.',
  ],
  /** The Privacy section: what the game keeps, and where. The host's statement is linked after the last line. */
  privacy: [
    'The game keeps your saved game, your settings and which news you saw in your last two games (so the next one differs) in this browser only.',
    'Nothing is sent to us or anyone else: no cookies, no tracking.',
    'The site is hosted on GitHub Pages, which, like any host, sees visitors’ IP addresses:',
  ],
  privacyLink: { label: 'GitHub’s privacy statement', url: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
  forgetHint: 'Removes your saved game and settings from this browser, then starts again from the introduction.',
};
