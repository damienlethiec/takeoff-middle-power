// General Aurélie Brandt, the EU's cyber and intelligence chief. Asks for weight security and cyber defence:
// protection against threats, at a cost to Cooperation or Cohesion.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const SECURITY: RequestCard[] = [
  {
    id: 'sc_warned',
    character: 'security',
    text: 'I warned you. The stolen model already runs in DeepCent’s datacenters. Do we at least lock down our labs now, before the next one?',
    left: {
      label: 'Too late now',
      stance: 'refuse',
      effects: { ai: 1 },
      why: 'Other models leak too',
      reaction: 'It is never too late to stop the next one.',
    },
    right: {
      label: 'Lock down now',
      stance: 'accept',
      effects: { cohesion: -2, coop: -2 },
      set: ['weight_security'],
      why: 'Beijing reads it as an accusation',
      reaction: 'Better late. Barely.',
    },
    followup: true,
    when: { threat: { id: 'theft', struck: true, prepared: false }, notFlags: ['weight_security'] },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Feb 2027: China Steals Agent-2" and "May 2027: National Security" (security tightened after the theft)' },
    learnMore: {
      text: 'In AI 2027, a state-backed team copies OpenBrain’s model in under two hours. Security is tightened only afterwards, and one spy keeps passing secrets.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'sc_hack_back',
    character: 'security',
    text: 'Washington is hitting DeepCent with cyberattacks and wants Europe’s national cyber commands to join. They say Europe owes them.',
    left: {
      label: 'Stay out',
      stance: 'refuse',
      effects: { coop: 2, cohesion: -1 },
      why: 'Hawks at home call it weakness',
      reaction: 'Wise, I think. Washington won’t agree.',
    },
    right: {
      label: 'Back joining in',
      stance: 'accept',
      effects: { coop: -8, cohesion: 1 },
      why: 'Beijing sees Europe at war',
      reaction: 'Orders received. God help us.',
    },
    when: { threat: { id: 'theft', struck: true } },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Feb 2027: China Steals Agent-2" (US cyberattacks on DeepCent fail)' },
    learnMore: {
      text: 'In AI 2027, the US answers the theft with cyberattacks on DeepCent. They fail: China has moved its AI work into a hardened, centralised zone.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'sc_spy',
    character: 'security',
    text: 'We caught a spy passing AI secrets from a European lab to a foreign service. Expose them publicly, or deal with it quietly?',
    left: {
      label: 'Deal quietly',
      stance: 'refuse',
      effects: { coop: 1 },
      later: { rounds: 2, effects: { cohesion: -5 }, why: 'The cover-up leaks anyway' },
      reaction: 'Quiet it is. For now.',
    },
    right: {
      label: 'Expose publicly',
      stance: 'accept',
      effects: { coop: -6, cohesion: 3 },
      why: 'A diplomatic storm',
      reaction: 'The press conference is at noon.',
    },
    when: { milestone: 'national_security' },
    prepares: 'theft',
    basis: { kind: 'ai2027', ref: 'AI 2027, "May 2027: National Security" (one spy still relays algorithmic secrets to Beijing)' },
    learnMore: {
      text: 'In AI 2027, even after security clearances, one spy inside OpenBrain keeps relaying its algorithmic secrets to Beijing.',
      source: SOURCES.ai2027,
    },
  },
];
