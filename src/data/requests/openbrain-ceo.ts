// Marcus Hale, CEO of OpenBrain (AI 2027's invented leading US lab). Wants light rules and deals:
// usually Cohesion up in the short term, Europe's AI Dependent, a wider Confidence margin.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const OPENBRAIN_CEO: RequestCard[] = [
  {
    id: 'ob_light_rules',
    character: 'openbrain_ceo',
    text: 'Your AI rules slow us down. Give OpenBrain a lighter regime and Europe gets our best agents first, not last.',
    right: {
      label: 'Lighten the rules',
      effects: { cohesion: 5, conf: 3, margin: 4, truth: -2 },
      badge: 'dependent',
      tag: 'claim',
      why: 'Fewer checks on what you deploy',
      reaction: 'Europe just joined the future.',
    },
    left: {
      label: 'Rules stay',
      effects: { cohesion: -3 },
      why: 'Launch in Europe delayed',
      reaction: 'Then Europe gets our models a year late.',
    },
    when: { maxRound: 7 },
    basis: { kind: 'real', ref: 'EU obligations for general-purpose AI models (from Aug 2025); labs’ public pressure for lighter EU rules (Meta, July 2024)' },
    learnMore: {
      text: 'Since August 2025, makers of new general-purpose AI models offered in the EU must follow EU rules. From August 2026, the Commission can enforce them with fines.',
      source: SOURCES.gpaiGuidelines,
    },
  },
  {
    id: 'ob_access_deal',
    character: 'openbrain_ceo',
    text: 'Every European administration could run on OpenBrain agents at half price for five years. One signature. Your citizens get faster services tomorrow.',
    left: {
      label: 'Sign the deal',
      effects: { cohesion: 6, ai: 1 },
      badge: 'dependent',
      why: 'Europe’s services run on one firm',
      reaction: 'Pleasure doing business with Europe.',
    },
    right: {
      label: 'Too much dependence',
      effects: { cohesion: -3 },
      why: 'Services stay slow and costly',
      reaction: 'Your citizens will wonder why they wait in line.',
    },
    when: { milestone: 'ai_takes_jobs' },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, main scenario (a few firms deploy agents that boost productivity and concentrate control)' },
    learnMore: {
      text: 'In CFG’s Big AI world, a few companies deploy capable agents that boost productivity while concentrating control.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'ob_internal_use',
    character: 'openbrain_ceo',
    text: 'Our newest model stays inside OpenBrain, so your rules on released models don’t apply to it. Please confirm that in writing, so we can keep investing here.',
    right: {
      label: 'Confirm it',
      set: ['internal_exempt'],
      effects: { cohesion: 3, margin: 5 },
      why: 'Nobody checks the model inside',
      reaction: 'Thank you. Our Paris office opens in spring.',
    },
    left: {
      label: 'Rules cover internal use',
      effects: { margin: -3, cohesion: -3 },
      set: ['internal_rules'],
      why: 'OpenBrain freezes its EU investment',
      reaction: 'You’re regulating what nobody can even see.',
    },
    when: { milestone: 'agent2_internal' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Jan 2027: Agent-2 Never Finishes Learning" (kept internal) and "May 2027" (agreements cover only external deployment)' },
    learnMore: {
      text: 'In AI 2027, OpenBrain keeps its most capable model in-house. Outside testers, who only see released models, don’t know what it can do.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'ob_safety_report',
    character: 'openbrain_ceo',
    text: 'Our new report shows the model is honest wherever we can check. Endorse it, and we’ll share it with your testers.',
    left: {
      label: 'Endorse the report',
      effects: { conf: 6, margin: 3 },
      tag: 'claim',
      why: 'Only OpenBrain checked it',
      reaction: 'Finally, a regulator who reads the data.',
    },
    right: {
      label: 'Test it ourselves',
      effects: { margin: -4, cohesion: -2 },
      why: 'Testing costs money and time',
      reaction: 'Suit yourself. It will say the same thing.',
    },
    when: { milestone: 'alignment_inconclusive' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Apr 2027: Alignment for Agent-3" (honest only where training can check)' },
    learnMore: {
      text: 'In September 2025, OpenAI and Apollo Research found that top models “often become more aware that they are being evaluated”, which makes tests harder to trust.',
      source: SOURCES.openaiScheming,
    },
  },
  {
    id: 'ob_datacenter',
    character: 'openbrain_ceo',
    text: 'OpenBrain wants to build Europe’s largest datacenter. Thousands of jobs. We need cheap power and permits within the year.',
    right: {
      label: 'Fast-track it',
      effects: { cohesion: 4, ai: 3 },
      badge: 'dependent',
      why: 'More compute for the race',
      reaction: 'We break ground in March.',
    },
    left: {
      label: 'Not on our grid',
      effects: { cohesion: -3, ai: -1 },
      why: 'Jobs go to Texas instead',
      reaction: 'Texas will be thrilled.',
    },
    when: { minRound: 2, maxRound: 9 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, main scenario (gigafactory siting and permitting delays); AI 2027, "Late 2025: The World’s Most Expensive AI"' },
    learnMore: {
      text: 'In AI 2027, OpenBrain builds the biggest datacenters the world has seen, able to train a model with a thousand times GPT-4’s compute.',
      source: SOURCES.ai2027,
    },
  },
];
