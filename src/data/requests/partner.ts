// Minister Hana Sato, Japan's minister for digital affairs, speaking for the middle powers (the UK, Japan, Korea,
// Canada, Norway). Builds the coalition: usually Cooperation up, Cohesion down (compromises).

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const PARTNER: RequestCard[] = [
  {
    id: 'pt_back_channel',
    character: 'partner',
    text: 'Washington and Beijing have stopped talking. Our coalition, with neutral Switzerland, could carry messages between them, quietly. Will Europe host these secret talks?',
    left: {
      label: 'Not our fight',
      why: 'The superpowers lose a go-between',
      stance: 'refuse',
      effects: { coop: -3 },
      reaction: 'It becomes our fight if they go to war.',
    },
    right: {
      label: 'Host the secret talks',
      stance: 'accept',
      effects: { coop: 4, influence: -1 },
      why: 'Accused of secret deals',
      reaction: 'Quietly, then. Not a word to the press.',
    },
    when: { minCoalition: 1, maxCoop: 45 },
    basis: { kind: 'cfg', ref: 'CFG, Arms race, Ending B "Multipolar world" (Europe and neutral states mediate between the blocs)' },
    learnMore: {
      text: 'In CFG’s “Multipolar world”, the EU and neutral countries mediate between the US and China and place auditors at data centres and chip factories.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'pt_joint_tests',
    character: 'partner',
    text: 'Our safety institutes test models together. Join us: every new top AI model tested by all of us before it reaches our citizens.',
    left: {
      label: 'Our own tests',
      stance: 'refuse',
      effects: {},
      why: 'Europe tests alone, slower',
      reaction: 'Duplicating work is a luxury.',
    },
    right: {
      label: 'Join joint testing',
      stance: 'accept',
      effects: { margin: -4, influence: -1, truth: 3 },
      why: 'Shared costs, shared delays',
      reaction: 'Five pairs of eyes see more than one.',
    },
    when: { maxRound: 8 },
    basis: { kind: 'cfg', ref: 'CFG, Diplomacy, main scenario (the UK AI Security Institute coordinates international testing)' },
    learnMore: {
      text: 'In November 2024, ten AI safety institutes, the EU’s among them, agreed to run joint testing exercises on AI models.',
      source: SOURCES.aisiNetwork,
    },
  },
];
