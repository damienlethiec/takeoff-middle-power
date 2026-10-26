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

/** One line under each gauge's name: what it measures, in plain words. */
export const GAUGE_SUB: Record<GaugeKey, string> = {
  aiPower: 'How close AI is to improving itself',
  cooperation: 'Pause · Race · Rupture',
  confidence: 'Does AI do what we intend? As the labs report it: it could be lower',
  cohesion: 'Does Europe hold together?',
};

/** What the tipping point means, on the capabilities gauge. */
export const TIPPING_LINE = (at: number) => `${at} = AI improves itself: the game ends`;

/** "71, could be as low as 41": what the labs report, and how low the truth could be (never higher). */
export const lowText = (reported: number, low: number) => `${reported}, could be as low as ${low}`;

/** "AI safety: more certain (could be as low as 41 → 56)". The uncertainty only ever lies below the reported value. */
export const marginText = (lowBefore: number | string, lowAfter: number | string, uBefore: number, uAfter: number) =>
  `${GAUGE_LABEL.confidence}: ${uAfter > uBefore ? 'less' : 'more'} certain (could be as low as ${lowBefore} → ${lowAfter})`;

export const GAUGE_HELP: Record<GaugeKey, string> = {
  aiPower:
    'How close AI is to the tipping point: the moment it can do AI research by itself and improve itself. It rises every round. At 80 the game ends and the world you have shaped decides the ending.',
  cooperation:
    'Trust between the US and China. Pause 60+, Race 30–59, Rupture below 30. The zone at the tipping point sets the kind of world.',
  confidence:
    'Does AI do what we intend? You see what the labs and testers report. The truth is never higher, and it could be lower: down to the low end of the band. Labs’ reports flatter and push the value up; oversight (the AI Office, inspections, audits) raises the low end.',
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
 *  At most four before the first decision (the race, the world, where it is heading, Influence); after that,
 *  only what does not explain itself, the first time it appears. All are listed in Help. */
export const TIPS = {
  race: { anchor: 'clock confidence', title: 'The race', text: '**AI capabilities** rise every round; at 80, AI improves itself and the game ends.\n**AI safety** is how sure we are that AI does what we intend: the labs report a number, and it could be as low as the bottom of the band. Keep safety ahead.' },
  world: { anchor: 'cooperation cohesion', title: 'The superpowers and Europe', text: '**US–China cooperation** sets the kind of world: Pause 60+, Race 30–59, Rupture below 30.\n**Social cohesion** is whether Europe holds together: jobs, trust, safety from misuse.' },
  outlook: { anchor: 'heading', title: 'Where the world is heading', text: 'If AI tipped now, this is the world you would get and what it needs to end well. Each round is six months from 2027; the game ends at the tipping point, or after 12 rounds.' },
  influence: { anchor: 'dec-influence', title: 'Influence', text: 'Your one resource. You earn some every round, more when Europe holds together and allies share the load. It pays for policy cards: play as many as it covers, or save it.' },
  request: { anchor: 'request', title: 'A request', text: 'Someone needs an answer. Look at an answer first (click it, or press ← → once), then answer (again). It is free of Influence: the cost is in the answer.' },
  threat: { anchor: 'map', title: 'A threat is growing', text: 'Threat icons grow in three stages before they strike. Prepare with cards marked “Protects against”, or with some answers to requests. Open an icon to see what protects Europe.' },
  leak: { anchor: 'map', title: 'A leak', text: 'Leaks from inside the labs show that their reports can be wrong. Oversight (the AI Office, inspections, audits) lets you read them.' },
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
    'AI capabilities rise every round. At 80, AI improves itself: the tipping point (never before round 6), and the game ends. If it never gets there, the game ends after round 12.',
    'At the tipping point, the US–China cooperation zone sets the world: Pause, Race or Rupture. Without a tipping point, Europe’s AI badge sets it.',
    'In each world, one gauge decides (its goal) and the other pillar is a safety net (its floor). Both are marked on their gauges, and the line under the gauges names the world you are heading for. Europe’s AI, at the end of that line, decides the world if AI never tips.',
    'AI safety is what the labs and testers report, and how low it could really be. The truth is never above the reported value; it is revealed at the end. Your actions can only narrow the uncertainty; secrecy and opaque AI widen it.',
    'Influence: +2 a round, +1 when Social cohesion is 60 or more, −1 below 35, +1 with coalition level 2. Play as many cards a round as your Influence covers, each card once.',
  ],
};
