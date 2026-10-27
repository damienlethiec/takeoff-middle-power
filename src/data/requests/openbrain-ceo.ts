// Marcus Hale, CEO of OpenBrain (AI 2027's invented leading US lab). Wants light rules and deals:
// usually Cohesion up in the short term, Europe's AI Dependent, and no outside check (v4: never a wider
// uncertainty from the player's answer; unchecked models lose real safety, hidden).

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const OPENBRAIN_CEO: RequestCard[] = [
  {
    id: 'ob_light_rules',
    character: 'openbrain_ceo',
    text: 'Your AI rules slow us down. Give OpenBrain lighter rules and Europe gets our best AI assistants first, not last.',
    left: {
      label: 'Rules stay',
      stance: 'refuse',
      effects: { cohesion: -3 },
      why: 'Launch in Europe delayed',
      reaction: 'Then Europe gets our models a year late.',
    },
    right: {
      label: 'Lighten the rules',
      stance: 'accept',
      effects: { cohesion: 5, truth: -2 },
      badge: 'dependent',
      tag: 'claim',
      why: 'Fewer checks on what you deploy',
      reaction: 'Europe just joined the future.',
    },
    when: { maxRound: 7 },
    basis: { kind: 'real', ref: 'EU obligations for general-purpose AI models (from Aug 2025); labs’ public pressure for lighter EU rules (Meta, July 2024)' },
    learnMore: {
      text: 'Since August 2025, makers of new general-purpose AI models offered in the EU must follow EU rules. Since August 2026, the Commission can enforce them with fines.',
      source: SOURCES.gpaiGuidelines,
    },
  },
  {
    id: 'ob_access_deal',
    character: 'openbrain_ceo',
    text: 'Every European administration could run on OpenBrain’s AI assistants at half price for five years. One signature. Your citizens get faster services tomorrow.',
    left: {
      label: 'Too much dependence',
      stance: 'refuse',
      effects: { cohesion: -3 },
      why: 'Services stay slow and costly',
      reaction: 'Your citizens will wonder why they wait in line.',
    },
    right: {
      label: 'Sign the deal',
      stance: 'accept',
      effects: { cohesion: 6, ai: 1 },
      badge: 'dependent',
      why: 'Europe’s services run on one firm',
      reaction: 'Pleasure doing business with Europe.',
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
    left: {
      label: 'Rules cover internal use',
      stance: 'refuse',
      effects: { margin: -3, cohesion: -3 },
      set: ['internal_rules'],
      why: 'OpenBrain freezes its EU investment',
      reaction: 'You’re regulating what nobody can even see.',
    },
    right: {
      label: 'Confirm it',
      stance: 'accept',
      set: ['internal_exempt'],
      effects: { cohesion: 3, truth: -3 },
      why: 'Nobody checks the model inside',
      reaction: 'Thank you. Our Paris office opens in spring.',
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
      label: 'Test it ourselves',
      stance: 'refuse',
      effects: { margin: -4, influence: -1 },
      why: 'Testing costs money and time',
      reaction: 'Suit yourself. It will say the same thing.',
    },
    right: {
      label: 'Endorse the report',
      stance: 'accept',
      effects: { cohesion: 2 },
      tag: 'claim',
      why: 'Only OpenBrain checked it',
      reaction: 'Finally, a regulator who reads the data.',
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
    text: 'OpenBrain wants to build Europe’s largest data centre, full of AI computers. Thousands of jobs. We need cheap power and permits within the year. Will you back us with the governments?',
    left: {
      label: 'Not on our grid',
      stance: 'refuse',
      effects: { cohesion: -3, ai: -1 },
      why: 'Jobs go to Texas instead',
      reaction: 'Texas will be thrilled.',
    },
    right: {
      label: 'Back the project',
      stance: 'accept',
      effects: { cohesion: 4, ai: 3 },
      badge: 'dependent',
      why: 'More computing power for the race',
      reaction: 'We break ground in March.',
    },
    when: { minRound: 2, maxRound: 9 },
    basis: { kind: 'e2031', ref: 'Europe 2031, Recommendation 1 (partner with American hyperscalers to bring compute onto European soil, with permits in months; officials see it as giving up sovereignty); CFG, Big AI (permitting delays)' },
    learnMore: {
      text: 'Europe 2031 (June 2026): the largest AI supercomputer in the US runs at 1,250 megawatts, the largest in Europe at 83.',
      source: SOURCES.e2031,
    },
  },
];
