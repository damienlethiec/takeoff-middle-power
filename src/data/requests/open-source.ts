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
      label: 'Funders decide',
      stance: 'refuse',
      effects: { cohesion: -2 },
      why: 'Public money builds private walls',
      reaction: 'So we pay twice: to build it, then to use it.',
    },
    right: {
      label: 'Open by law',
      stance: 'accept',
      effects: { cohesion: 3, margin: -2, conf: -2 },
      badge: 'open',
      grow: ['ransomware'],
      why: 'More powerful models in every hand',
      reaction: 'Public money, public code. Simple.',
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
    text: 'Brussels may lower the size at which an AI model counts as a “systemic risk”. Push to keep small open models out of those rules, or Europe’s open scene dies.',
    left: {
      label: 'Same rules for all',
      stance: 'refuse',
      effects: { cohesion: -2, margin: -1 },
      why: 'Small teams give up',
      reaction: 'Then only giants can afford to build AI here.',
    },
    right: {
      label: 'Keep them out',
      stance: 'accept',
      effects: { cohesion: 3 },
      badge: 'open',
      grow: ['ransomware'],
      why: 'Fewer checks on what spreads',
      reaction: 'You just saved a hundred startups.',
    },
    when: { maxRound: 8 },
    basis: { kind: 'cfg', ref: 'CFG, Take-off, main scenario (the EU Codes of Practice are more lenient to open-source models); AI Act, Articles 51 and 53(2)' },
    learnMore: {
      text: 'Under the EU AI Act, open-source models are spared some documentation duties unless they pose “systemic risks”. The Commission can change the size that counts as one.',
      source: SOURCES.aiActOj,
    },
  },
  {
    id: 'os_safer_releases',
    character: 'open_source',
    text: 'Criminals strip the guardrails off open models. We can build releases that resist tampering and track misuse, but it takes a year and real money.',
    left: {
      label: 'Not our problem',
      stance: 'refuse',
      effects: {},
      grow: ['ransomware'],
      reaction: 'It will be when the hospitals go dark.',
    },
    right: {
      label: 'Fund safer releases',
      stance: 'accept',
      effects: { cohesion: -3, truth: 2 },
      set: ['ransomware_ready'],
      tag: 'safety',
      why: 'A year of costly work',
      reaction: 'Open and safe is possible. We’ll prove it.',
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
    left: {
      label: 'Big firms first',
      stance: 'refuse',
      effects: { cohesion: 2, ai: 2 },
      badge: 'dependent',
      why: 'The same few firms grow stronger',
      reaction: 'The usual suspects win again.',
    },
    right: {
      label: 'Open teams first',
      stance: 'accept',
      effects: { cohesion: 2, ai: 1 },
      badge: 'open',
      grow: ['ransomware'],
      why: 'More capable open models',
      reaction: 'You won’t regret it. Europe will build.',
    },
    when: { minRound: 4 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, Ending A (the first pan-European AI Gigafactory; a European firm becomes competitive)' },
    learnMore: {
      text: 'In February 2025, the European Commission launched InvestAI to mobilise €200 billion for AI, including a €20 billion fund for AI gigafactories.',
      source: SOURCES.investAi,
    },
  },
];
