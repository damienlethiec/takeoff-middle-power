// Malik, your old flatmate, an engineer at an AI lab in San Francisco. The honest pro-AI voice: he lives the
// US–China rivalry up close and left Europe because it had no job like his.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const MALIK_REQUESTS: RequestCard[] = [
  {
    id: 'mk_visa',
    character: 'malik',
    text: 'My colleague Wei has to leave the US: born in China, so now he’s a risk. A Paris lab would hire him tomorrow, but your visas take a year. Can Europe fast-track AI researchers?',
    left: {
      label: 'Not now',
      stance: 'refuse',
      effects: { coop: -1 },
      why: 'Talent goes back to the race',
      reaction: 'Then he goes home to Chengdu, and works for DeepCent.',
    },
    right: {
      label: 'Fast-track them',
      stance: 'accept',
      effects: { coop: 2, cohesion: -2 },
      why: 'Hawks at home warn of spies',
      reaction: 'Wei owes you a dumpling feast. So do I.',
    },
    when: { minRound: 2, maxCoop: 50 },
    basis: { kind: 'cfg', ref: 'CFG, Arms race (“AI becomes the ultimate national security asset”; “No one can verify what anyone else is doing”)' },
    learnMore: {
      text: 'In CFG’s arms race scenario, AI becomes “the ultimate national security asset”, and “no one can verify what anyone else is doing”.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'mk_paris_office',
    character: 'malik',
    text: 'My lab wants a big research office in Paris. Hundreds of jobs, mine included: I could finally come home. The catch: it would hire most of Europe’s best AI people. Will you welcome it?',
    left: {
      label: 'Grow our own',
      stance: 'refuse',
      effects: { cohesion: -2 },
      why: 'The jobs go elsewhere',
      reaction: 'Fair. Then build something I’d come home for.',
    },
    right: {
      label: 'Welcome the lab',
      stance: 'accept',
      effects: { cohesion: 2, ai: 1 },
      badge: 'dependent',
      why: 'Europe’s talent works for a US lab',
      reaction: 'See you in Paris! I’m bringing the good coffee machine.',
    },
    when: { minRound: 3 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI (compute as the bottleneck; consolidation: three US firms hold about 85% of the market by mid-2027)' },
    learnMore: {
      text: 'In CFG’s Big AI scenario, computing power is the bottleneck, and three US firms hold about 85% of the market by mid-2027.',
      source: SOURCES.cfg,
    },
  },
];
