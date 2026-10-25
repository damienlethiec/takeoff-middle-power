// The two intro screens and the three acts.
// Fiction (OpenBrain, DeepCent, events after today) is never presented as real; each real fact cites a Source.

import { SOURCES } from '../sources';
import type { ActCopy, IntroScreen } from './types';

export const INTRO: IntroScreen[] = [
  {
    title: 'The world in 2027',
    paragraphs: [
      'AI systems now write code, run research and do whole jobs on their own. Two labs lead the race to build smarter ones: OpenBrain in the US and DeepCent in China. Both labs are invented for this game.',
      'Nobody writes these AIs line by line. They are grown: trained on huge amounts of data and rewarded when their answers look good. What they really learn is hard to check, even for the people who made them.',
      'Soon they may start improving themselves. Whoever is ready on that day will shape what comes next.',
    ],
    fact: {
      text: 'In 2025, Anthropic wrote that its AI models “aren’t programmed directly by humans” but trained on data, so “we don’t understand how models do most of the things they do.”',
      source: SOURCES.anthropicInterp,
    },
  },
  {
    title: 'Your role',
    paragraphs: [
      'You are the EU’s AI Envoy. You cannot build AI and you cannot stop the race. You can shape rules, money and alliances.',
      'You spend two currencies. Budget pays for what Europe builds: experts, research, defences. Political Capital pays for deals and rules. You receive both every quarter.',
      'Each quarter, the clock runs while the news comes in. Then it stops, and you take one decision, or pass. Sixteen quarters, from 2027 to 2030.',
      'Some things stay hidden from you, as they would from a real envoy. Everything is revealed at the end.',
    ],
    fact: {
      text: 'Since August 2025, makers of new general-purpose AI models offered in the EU must follow EU rules. From August 2026, the European Commission can enforce them, including with fines.',
      source: SOURCES.gpaiGuidelines,
    },
  },
];

export const ACTS: ActCopy[] = [
  {
    act: 1,
    title: 'A seat at the table',
    beat: 'January 2027. Brussels gives you an office, a small team and a title nobody had a year ago. In California and Shenzhen, OpenBrain and DeepCent ship a new model every few weeks. Neither is waiting for Europe.',
  },
  {
    act: 2,
    title: 'The race goes public',
    beat: 'On a Monday, a logistics firm in Rotterdam lays off its whole planning team; by Friday, three more firms have done the same. The race is no longer a story about labs. It is on every kitchen table in Europe.',
  },
  {
    act: 3,
    title: 'Who decides?',
    beat: 'Europe’s growth figures have never looked better. Yet in firms and ministries, people now sign whatever the AI drafted, and fewer of them can say why. The economy is booming. The question is who is running it.',
  },
];
