// Léa, the player's friend in Lyon, a translator. Her own life: her job, her worries. A human view of Cohesion.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const LEA_REQUESTS: RequestCard[] = [
  {
    id: 'lea_retrain',
    character: 'lea',
    text: 'My agency just replaced half of us with AI. There’s EU money to help people learn a new job, but it takes a year to see a cent. Can you make it faster for people like me?',
    left: {
      label: 'Rules are rules',
      stance: 'refuse',
      effects: { cohesion: -3 },
      why: 'People feel abandoned',
      reaction: 'Okay. I’ll figure something out. I always do.',
    },
    right: {
      label: 'Push to speed it up',
      stance: 'accept',
      effects: { cohesion: 4 },
      set: ['retraining'],
      later: { rounds: 2, effects: { cohesion: -2 }, why: 'Other programmes are cut to pay for it' },
      why: 'Money taken from other programmes',
      reaction: 'You did that? I owe you a dinner.',
    },
    when: { milestone: 'ai_takes_jobs' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Late 2026: AI Takes Some Jobs"' },
    learnMore: {
      text: 'In October 2025, the EU approved €931,690 from its Globalisation Adjustment Fund to help 417 laid-off workers of BelGaN, a Belgian chipmaker, retrain.',
      source: SOURCES.egfBelgan,
    },
  },
  {
    id: 'lea_labels',
    character: 'lea',
    text: 'Online pharmacies post AI “translations” of medicine leaflets, full of errors, with no label. The EU’s labelling rules exist, but nobody checks! Will you push Brussels to enforce them?',
    left: {
      label: 'Too much red tape',
      stance: 'refuse',
      effects: { cohesion: -2 },
      why: 'Nobody knows what to trust',
      reaction: 'So who checks the leaflets? Nobody?',
    },
    right: {
      label: 'Push to enforce them',
      stance: 'accept',
      effects: { cohesion: 3, margin: -1 },
      set: ['enforcement'],
      later: { rounds: 1, effects: { cohesion: -1 }, why: 'Small publishers struggle with the rules' },
      why: 'AI firms call it red tape',
      reaction: 'Thank you! My mum reads those leaflets.',
    },
    when: { minRound: 2 },
    basis: { kind: 'real', ref: 'EU AI Act, Article 50 (AI-generated content must be marked, from August 2026); CFG, Plateau, Ending B (disinformation)' },
    learnMore: {
      text: 'Under the EU AI Act, since August 2026, makers of new AI that generates text, images or sound must mark what it produces as AI-made, in a machine-readable way.',
      source: SOURCES.aiActOj,
    },
  },
  {
    id: 'lea_ai_friend',
    character: 'lea',
    text: 'My little brother talks to an AI “friend” every night. He says it understands him better than we do. Shouldn’t apps like that have an age limit?',
    left: {
      label: 'Families decide',
      stance: 'refuse',
      effects: { cohesion: -2, ai: 1 },
      why: 'Lonely teens, richer apps',
      reaction: 'Families are tired, you know.',
    },
    right: {
      label: 'Set an age limit',
      why: 'Teens may move to unregulated apps',
      stance: 'accept',
      effects: { cohesion: 3 },
      later: { rounds: 1, effects: { cohesion: -1 }, why: 'Teens move to unregulated apps' },
      reaction: 'He’ll hate you. I don’t.',
    },
    when: { milestone: 'cheap_remote_worker' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Jul 2027: The Cheap Remote Worker" (10% of Americans, mostly young people, consider an AI a close friend)' },
    learnMore: {
      text: 'In AI 2027, by mid-2027 one American in ten, mostly young people, considers an AI “a close friend”.',
      source: SOURCES.ai2027,
    },
  },
];
