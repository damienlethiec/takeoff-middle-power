// Minister Hana Sato, Japan's minister for digital affairs, speaking for the middle powers (the UK, Japan, Korea,
// Canada, Norway). Builds the coalition: usually Cooperation up, Cohesion down (compromises).

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const PARTNER: RequestCard[] = [
  {
    id: 'pt_back_channel',
    character: 'partner',
    text: 'Washington and Beijing have stopped talking. Our coalition could carry messages between them, quietly. Will Europe host the back channel?',
    left: {
      label: 'Host the back channel',
      effects: { coop: 8, cohesion: -2 },
      why: 'Accused of secret deals',
      reaction: 'Quietly, then. Not a word to the press.',
    },
    right: {
      label: 'Not our fight',
      effects: { coop: -3 },
      reaction: 'It becomes our fight if they go to war.',
    },
    when: { minCoalition: 1, maxCoop: 45 },
    basis: { kind: 'cfg', ref: 'CFG, Arms race, Ending B "Multipolar world" (Europe and neutral states mediate between the blocs)' },
    learnMore: {
      text: 'In CFG’s “Multipolar world”, the EU and neutral countries mediate between the US and China and place auditors at data centres and chip fabs.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'pt_joint_tests',
    character: 'partner',
    text: 'Our safety institutes test models together. Join us: every new frontier model tested by all of us before it reaches our citizens.',
    right: {
      label: 'Join joint testing',
      effects: { margin: -4, cohesion: -2, truth: 3 },
      why: 'Shared costs, shared delays',
      reaction: 'Five pairs of eyes see more than one.',
    },
    left: {
      label: 'Our own tests',
      effects: {},
      why: 'Europe tests alone, slower',
      reaction: 'Duplicating work is a luxury.',
    },
    when: { maxRound: 8 },
    basis: { kind: 'cfg', ref: 'CFG, Diplomacy, main scenario (the UK AI Security Institute coordinates international testing)' },
    learnMore: {
      text: 'In May 2024, 16 AI companies from the US, China and elsewhere committed to publish safety frameworks and set risk thresholds with input from governments.',
      source: SOURCES.seoulCommitments,
    },
  },
];
