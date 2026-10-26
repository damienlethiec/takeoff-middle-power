// Tomas Novak, founder of a European open-model collective. Asks for open models Europe controls:
// usually Europe's AI → Open and Cohesion up, Confidence down and the misuse (ransomware) threat growing.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const OPEN_SOURCE: RequestCard[] = [
  {
    id: 'os_public_open',
    character: 'open_source',
    text: 'Make every AI model paid for with public money open-weight. Citizens paid for it; they should be able to inspect it, run it and fix it.',
    left: {
      label: 'Open by law',
      effects: { cohesion: 3, margin: -2, conf: -2 },
      badge: 'open',
      grow: ['ransomware'],
      why: 'More powerful models in every hand',
      reaction: 'Public money, public code. Simple.',
    },
    right: {
      label: 'Funders decide',
      effects: { cohesion: -2 },
      why: 'Public money builds private walls',
      reaction: 'So we pay twice: to build it, then to use it.',
    },
    when: { minRound: 3 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, Ending A "The agent economy" (the EU requires publicly funded models to be open-weight)' },
    learnMore: {
      text: 'In CFG’s agent economy ending, the EU requires publicly funded AI models to be open-weight, and a European firm launches a competitive model.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'os_exemption',
    character: 'open_source',
    text: 'The AI rules treat our small open models like OpenBrain’s giants. Exempt open models below a size limit, or Europe’s open scene dies.',
    right: {
      label: 'Exempt small models',
      effects: { cohesion: 3, margin: 3 },
      badge: 'open',
      grow: ['ransomware'],
      why: 'Fewer checks on what spreads',
      reaction: 'You just saved a hundred startups.',
    },
    left: {
      label: 'Same rules for all',
      effects: { cohesion: -2, margin: -1 },
      why: 'Small teams give up',
      reaction: 'Then only giants can afford to build AI here.',
    },
    when: { maxRound: 8 },
    basis: { kind: 'cfg', ref: 'CFG, Take-off, main scenario (the EU Codes of Practice are more lenient to open-source models)' },
    learnMore: {
      text: 'The EU’s General-Purpose AI Code of Practice, published in July 2025, is voluntary. Its safety chapter applies only to the most advanced models.',
      source: SOURCES.gpaiCode,
    },
  },
  {
    id: 'os_safer_releases',
    character: 'open_source',
    text: 'Criminals strip the guardrails off open models. We can build releases that resist tampering and track misuse, but it takes a year and real money.',
    left: {
      label: 'Fund safer releases',
      effects: { cohesion: -3, truth: 2 },
      set: ['ransomware_ready'],
      tag: 'safety',
      why: 'A year of costly work',
      reaction: 'Open and safe is possible. We’ll prove it.',
    },
    right: {
      label: 'Not our problem',
      effects: {},
      grow: ['ransomware'],
      reaction: 'It will be when the hospitals go dark.',
    },
    prepares: 'ransomware',
    when: { threat: { id: 'ransomware', minStage: 1 }, notFlags: ['ransomware_ready'] },
    basis: { kind: 'cfg', ref: 'CFG, Plateau, Ending B (open models fine-tuned past their guardrails fuel automated hacking)' },
    learnMore: {
      text: 'In August 2025, Anthropic reported AI-generated ransomware being sold to other criminals for $400 to $1,200.',
      source: SOURCES.anthropicMisuse,
    },
  },
  {
    id: 'os_gigafactory',
    character: 'open_source',
    text: 'Europe is building AI gigafactories. Let open-model teams like mine train there first, not only the big firms with deep pockets.',
    right: {
      label: 'Open teams first',
      effects: { cohesion: 2, ai: 1 },
      badge: 'open',
      grow: ['ransomware'],
      why: 'More capable open models',
      reaction: 'You won’t regret it. Europe will build.',
    },
    left: {
      label: 'Big firms first',
      effects: { cohesion: 2, ai: 2 },
      badge: 'dependent',
      why: 'The same few firms grow stronger',
      reaction: 'The usual suspects win again.',
    },
    when: { minRound: 4 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, Ending A (the first pan-European AI Gigafactory; a European firm becomes competitive)' },
    learnMore: {
      text: 'In February 2025, the European Commission launched InvestAI to mobilise €200 billion for AI, including a €20 billion fund for AI gigafactories.',
      source: SOURCES.investAi,
    },
  },
];
