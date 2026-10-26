// Katrin Vogel, a European trade union leader. Asks for retraining and a human say over automation:
// usually Cohesion up, AI power slightly down, a cost later or elsewhere.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const UNION: RequestCard[] = [
  {
    id: 'un_agent_tax',
    character: 'union',
    text: 'Firms that replace workers with AI agents should pay for it. Tax the agents, and spend every euro on retraining.',
    right: {
      label: 'Tax the agents',
      effects: { cohesion: 6 },
      later: { rounds: 2, effects: { cohesion: -3, ai: -1 }, why: 'Some firms move abroad' },
      reaction: 'Finally, the machines pay their share.',
    },
    left: {
      label: 'No new tax',
      effects: { cohesion: -3, ai: 1 },
      why: 'Workers pay for the transition',
      reaction: 'So the profits stay private.',
    },
    when: { milestone: 'ai_takes_jobs' },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, Ending A (governments pilot job guarantees and agent taxation to fund retraining)' },
    learnMore: {
      text: 'In CFG’s agent economy ending, governments pilot job guarantees and taxes on AI agents to pay for retraining.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'un_strike',
    character: 'union',
    text: 'Offices are emptying. My members call a general strike unless Europe guarantees a job or paid training for everyone laid off by AI.',
    left: {
      label: 'Guarantee it',
      effects: { cohesion: 8 },
      later: { rounds: 2, effects: { cohesion: -3 }, why: 'Other budgets are cut to pay for it' },
      why: 'A huge bill, paid later',
      reaction: 'The strike is off. Thank you.',
    },
    right: {
      label: 'We can’t afford it',
      effects: { cohesion: -6 },
      why: 'Strikes across Europe',
      reaction: 'Then see you in the streets.',
    },
    when: { milestone: 'cheap_remote_worker' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Jul 2027: The Cheap Remote Worker" (OpenBrain’s approval collapses); CFG, Big AI, Ending A (job guarantees)' },
    learnMore: {
      text: 'In October 2025, the EU approved €931,690 from its Globalisation Adjustment Fund to help 417 laid-off workers of BelGaN, a Belgian chipmaker, retrain.',
      source: SOURCES.egfBelgan,
    },
  },
];
