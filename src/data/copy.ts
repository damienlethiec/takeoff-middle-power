// Player-facing words that are not cards, threats, events, headlines or letters:
// labels, the two intro screens, the tutorial's coach marks and the help.

import type { Fact, GaugeKey, Pace, Zone } from '../engine/types';
import { SOURCES } from './sources';

export const GAUGE_LABEL: Record<GaugeKey, string> = {
  aiPower: 'AI capabilities',
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

/** What the tipping point means, on the capabilities gauge. */
export const TIPPING_LINE = (at: number) => `Tipping point at ${at}: your choices decide the ending`;

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
    'How close AI is to the tipping point: the moment it can do AI research by itself and improve itself. It rises every round. At 80 the game ends and the world you have shaped decides the ending.',
  cooperation:
    'Trust between the US and China. Pause 60+, Race 30–59, Rupture below 30. The zone at the tipping point sets the kind of world.',
  confidence:
    'Does AI do what we intend? The labs report a number, but nobody has checked all of it. Only the verified part counts toward your goal: the solid part of the bar. The hatched part is what the labs claim and nobody has verified. The AI Office, inspections and audits grow the verified part; secrecy and opaque AI shrink it. The truth lies in between, revealed at the end.',
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
  stakes?: string[];
  /** Léa, introduced with her portrait (v4). */
  lea?: string[];
  fact?: Fact;
}

export const INTRO: IntroScreen[] = [
  {
    title: 'The world today',
    paragraphs: [
      'AI is grown, not built. Nobody writes these systems line by line: they are trained on huge amounts of data, and what they learn is hard to check, even for their makers. They are improving fast.',
      'Two labs lead the race: OpenBrain in the US and DeepCent in China. Both are invented for this game, as is everything that happens after today.',
    ],
    stakes: ['Will AI do what we intend?', 'Will the superpowers race, or talk?', 'Will our societies hold together?'],
    fact: {
      text: 'In 2025, Anthropic wrote that its AI models “aren’t programmed directly by humans” and that “we don’t understand how models do most of the things they do.”',
      source: SOURCES.anthropicInterp,
    },
  },
  {
    title: 'You are the EU’s AI Envoy',
    paragraphs: [
      'Europe cannot stop the race. It can shape it, with Influence and policies.',
      'Your goal: when AI reaches the tipping point, have AI we can trust, superpowers who talk, and a society that holds. The calmer the world, the easier a good ending.',
      'Twelve rounds of six months, from 2027 to 2032. Each round, watch the world move, then play as many cards as your Influence allows.',
    ],
    lea: [
      'Your friend Léa, a translator in Lyon, writes to you every few months.',
      'She is not a minister or an expert. Her letters show you what the world’s choices do to people like her: her job, her family, her city.',
    ],
    fact: {
      text: 'Since August 2025, makers of new general-purpose AI models offered in the EU must follow EU rules. From August 2026, the European Commission can enforce them, with fines.',
      source: SOURCES.gpaiGuidelines,
    },
  },
];

export const CREDITS =
  'Built on the AI 2027 scenario and CFG’s Advanced AI: Possible Futures. OpenBrain, DeepCent and every event after today are fiction.';

/** Coach marks: each shown once, pointing at `anchor` (data-coach values, space-separated: all are highlighted),
 *  only when it is on screen. In `text`, a new line starts a paragraph and **x** is bold (rendered by tipHtml).
 *  Before the first decision: one per gauge, where the world is heading, then Influence; after that,
 *  only what does not explain itself, the first time it appears. All are listed in Help. */
export const TIPS = {
  capabilities: { anchor: 'clock', title: 'AI capabilities', text: '**AI capabilities** rise every round: this is the clock. At 80 comes the tipping point, where AI improves itself: your choices by then decide the ending.' },
  safety: { anchor: 'confidence', title: 'AI safety', text: '**AI safety**: the solid part is verified, the hatched part is only what the labs claim. Only the verified part counts: inspections and audits grow it.' },
  cooperation: { anchor: 'cooperation', title: 'US–China cooperation', text: '**US–China cooperation** sets the kind of world at the tipping point. Pause 60+, Race 30–59, Rupture below 30: the calmer, the easier a good ending.' },
  cohesion: { anchor: 'cohesion', title: 'Social cohesion', text: '**Social cohesion** is whether Europe holds together: jobs, trust, safety from misuse. If it falls too low, even a calm world ends badly.' },
  outlook: { anchor: 'heading', title: 'Where the world is heading', text: 'If AI tipped now, this is the world you would get and what it needs to end well. Each round is six months from 2027; the game ends at the tipping point, or after 12 rounds.' },
  influence: { anchor: 'dec-influence', title: 'Influence', text: 'Your one resource. You earn some every round, more when Europe holds together and allies share the load. It pays for policy cards: play as many as it covers, or save it.' },
  request: { anchor: 'request', title: 'A request', text: 'Someone needs an answer. Look at an answer first (click it, or press ← → once), then answer (again). It is free of Influence: the cost is in the answer.' },
  threat: { anchor: 'map', title: 'A threat is growing', text: 'Threat icons grow in three stages before they strike. Prepare with cards marked “Protects against”, or with some answers to requests. Open an icon to see what protects Europe.' },
  badge: { anchor: 'badge', title: 'Europe’s AI', text: 'Open or Dependent: does Europe run its own models? If AI never reaches the tipping point, this badge decides the kind of world.' },
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
    'AI capabilities rise every round. At 80, AI starts improving itself: the tipping point (never before round 6). Where the world stands then decides the ending. If it never gets there, the game ends after round 12.',
    'At the tipping point, the US–China cooperation zone sets the world: Pause, Race or Rupture. Without a tipping point, Europe’s AI badge sets it.',
    'In each world, one gauge decides (its goal) and the other pillar is a safety net (its floor). Both are marked on their gauges, and the line under the gauges names the world you are heading for. Europe’s AI, at the end of that line, decides the world if AI never tips.',
    'AI safety shows what is verified and what the labs claim (for example 40–57). Only the verified part counts toward your goal. The truth lies in between and is revealed at the end. Oversight (the AI Office, inspections, audits) grows the verified part; secrecy and opaque AI shrink it.',
    'Requests: the right answer goes along with what is asked, the left one refuses or puts it off. Both cost something.',
    'Influence: +2 a round, +1 when Social cohesion is 60 or more, −1 below 35, +1 with coalition level 2. Play as many cards a round as your Influence covers, each card once.',
  ],
  /** The Privacy section: what the game keeps, and where. The host's statement is linked after the last line. */
  privacy: [
    'The game keeps your saved game and settings in this browser only.',
    'Nothing is sent to us or anyone else: no cookies, no tracking.',
    'The site is hosted on GitHub Pages, which, like any host, sees visitors’ IP addresses:',
  ],
  privacyLink: { label: 'GitHub’s privacy statement', url: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
  forgetHint: 'Removes your saved game and settings from this browser, then starts again from the introduction.',
};
