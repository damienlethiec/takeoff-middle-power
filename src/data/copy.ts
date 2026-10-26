// Player-facing words that are not cards, threats, events, headlines or letters:
// labels, the two intro screens, the tutorial's coach marks and the help.

import type { Fact, GaugeKey, Pace, Zone } from '../engine/types';
import { SOURCES } from './sources';

export const GAUGE_LABEL: Record<GaugeKey, string> = {
  aiPower: 'AI power',
  cooperation: 'Cooperation',
  confidence: 'Confidence in AI',
  cohesion: 'Cohesion',
};

export const GAUGE_HELP: Record<GaugeKey, string> = {
  aiPower: 'How close AI is to the tipping point: the moment it can do AI research by itself. It rises every round.',
  cooperation: 'Trust between the US and China. Pause 60+, Race 30–59, Rupture below 30. The zone at the tipping point sets the kind of world.',
  confidence:
    'How far we can trust AI systems. You only see an estimate and a margin: the truth lies somewhere inside. Labs’ reports push the estimate up; oversight narrows the margin.',
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
      'Twelve rounds of six months, from 2027 to 2032. Each round, watch the world move, then play up to two cards.',
    ],
    fact: {
      text: 'Since August 2025, makers of new general-purpose AI models offered in the EU must follow EU rules. From August 2026, the European Commission can enforce them, with fines.',
      source: SOURCES.gpaiGuidelines,
    },
  },
];

export const CREDITS =
  'Built on the AI 2027 scenario and CFG’s Advanced AI: Possible Futures. OpenBrain, DeepCent and every event after today are fiction.';

/** Coach marks: each shown once, the first time it matters, pointing at `anchor` (a data-coach value). */
export const TIPS = {
  clock: { anchor: 'clock', title: 'The AI clock', text: 'AI power rises every round. At 80, AI can improve itself: the tipping point. The world you have shaped by then decides the ending.' },
  influence: { anchor: 'influence', title: 'Influence', text: 'Your one resource. You earn some every round; the counter shows how much next round, and why.' },
  heading: { anchor: 'heading', title: 'The heading line', text: 'Where the world is going and what will decide it. Keep the goal gauge above its target and the other above its floor.' },
  zones: { anchor: 'cooperation', title: 'Cooperation zones', text: 'Pause 60+, Race 30–59, Rupture below 30. The calmer the zone at the tipping point, the lower the bar for a good ending.' },
  margin: { anchor: 'confidence', title: 'The margin', text: 'You never know exactly how trustworthy AI is: the truth is somewhere in the band. To be safe, keep the whole band above the target.' },
  firstCard: { anchor: 'hand', title: 'Your cards', text: 'Green chips go up, red chips go down. Every card helps something and costs something. Open one to see what it would change.' },
  twoCards: { anchor: 'hand', title: 'Two cards a round', text: 'You can play up to two cards a round if you can afford them. Saving Influence is a choice too.' },
  threat: { anchor: 'map', title: 'A threat is growing', text: 'Threat icons grow in three stages where they would strike. Open one to see which card protects against it.' },
  breaking: { anchor: 'map', title: 'Breaking news', text: 'When a threat strikes, it hits your gauges. Being prepared makes the difference.' },
  badge: { anchor: 'badge', title: 'Europe’s AI', text: 'Open or Dependent: does Europe run its own models? If AI never reaches the tipping point, this badge decides the kind of world.' },
  leak: { anchor: 'map', title: 'A leak', text: 'Leaks show the gap between what labs say and the truth. Oversight (AI Office, inspections, audits) lets you read them.' },
} as const;
export type TipId = keyof typeof TIPS;

export const HELP = {
  shortcuts: [
    ['Space', 'Pause or resume the clock'],
    ['Enter', 'Continue, confirm or make your decisions'],
    ['Escape', 'Close a window'],
    ['?', 'Open this help'],
    ['J', 'Open the journal'],
  ] as [string, string][],
  rules: [
    'AI power rises every round. At 80 it reaches the tipping point (never before round 6). If it never gets there, the game ends after round 12.',
    'At the tipping point, the Cooperation zone sets the world: Pause, Race or Rupture. Without a tipping point, Europe’s AI badge sets it.',
    'In each world, one gauge decides (its goal) and the other pillar is a safety net (its floor). The heading line under the gauges tells you both.',
    'Confidence is an estimate with a margin. The true value is revealed at the end; it always lies inside the margin.',
    'Influence: +2 a round, +1 when Cohesion is 60 or more, −1 below 35, +1 with coalition level 2. Up to two cards a round.',
  ],
};
