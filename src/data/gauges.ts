// What the player reads when clicking an indicator (docs/SPEC.md, "Indicators and resources").

import type { GaugeKey } from '../engine/types';
import type { GaugeInfo } from './schema';

export const GAUGES: GaugeInfo[] = [
  {
    key: 'capability',
    label: 'Capability',
    visible: true,
    risesWhen: 'Every quarter; faster under high tension; when a model is stolen.',
    fallsWhen: 'Never.',
  },
  {
    key: 'concentration',
    label: 'Power concentration',
    visible: true,
    risesWhen: 'Big labs consolidate; security rules only big labs can meet.',
    fallsWhen: 'Europe funds open models.',
  },
  {
    key: 'apparentAlignment',
    label: 'Apparent alignment',
    visible: true,
    risesWhen: 'Labs report safety progress every quarter.',
    fallsWhen: 'Internal reports leak; independent testers look under the hood.',
  },
  {
    key: 'trueAlignment',
    label: 'True alignment',
    visible: false,
    risesWhen: 'Alignment research; a lab safety commitment won with the ASML lever.',
    fallsWhen: 'Racing; every quarter without safety work.',
  },
  {
    key: 'verification',
    label: 'Verification readiness',
    visible: true,
    risesWhen: 'Hosting inspections (full effect with AI Office capacity).',
    fallsWhen: 'Never.',
  },
  {
    key: 'tension',
    label: 'Geopolitical tension',
    visible: true,
    risesWhen: 'Every quarter; model theft; using the ASML lever; hosting inspections.',
    fallsWhen: 'Coalition diplomacy (two partners or more); a crisis handled together.',
  },
  {
    key: 'misuse',
    label: 'Misuse risk',
    visible: true,
    risesWhen: 'Capability grows; open models.',
    fallsWhen: 'Cyber and security measures.',
  },
  {
    key: 'publicPressure',
    label: 'Public pressure',
    visible: true,
    risesWhen: 'Job losses; AI incidents.',
    fallsWhen: 'Popular social measures.',
  },
  {
    key: 'coalition',
    label: 'Coalition',
    visible: true,
    risesWhen: 'Each coalition card (up to 3).',
    fallsWhen: 'Unpaid upkeep.',
  },
  {
    key: 'gdp',
    label: 'GDP',
    visible: true,
    risesWhen: 'AI adoption.',
    fallsWhen: 'Oversight mandates; crises; labs leaving Europe.',
  },
  {
    key: 'approval',
    label: 'Approval',
    visible: true,
    risesWhen: 'Stable jobs.',
    fallsWhen: 'Layoffs; crises.',
  },
];

export const GAUGE_INFO: Record<GaugeKey | 'coalition', GaugeInfo> = Object.fromEntries(GAUGES.map((g) => [g.key, g])) as Record<
  GaugeKey | 'coalition',
  GaugeInfo
>;

/** Hidden human-influence scores (shown only during a "Measure human influence" audit and in the debrief). */
export const EU_LABELS = {
  economy: 'Human influence over the economy',
  culture: 'Human influence over culture',
  state: 'Human influence over the state',
} as const;
