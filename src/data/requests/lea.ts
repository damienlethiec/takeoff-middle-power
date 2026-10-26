// Léa, the player's friend in Lyon, a translator. Her own life: her job, her worries. A human view of Cohesion.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const LEA_REQUESTS: RequestCard[] = [
  {
    id: 'lea_retrain',
    character: 'lea',
    text: 'My agency just replaced half of us with AI. There’s an EU retraining fund, but it takes a year to see a cent. Can you make it faster for people like me?',
    right: {
      label: 'Speed it up',
      effects: { cohesion: 4 },
      set: ['retraining'],
      later: { rounds: 2, effects: { cohesion: -2 }, why: 'Other programmes are cut to pay for it' },
      why: 'Money taken from other programmes',
      reaction: 'You did that? I owe you a dinner.',
    },
    left: {
      label: 'Rules are rules',
      effects: { cohesion: -3 },
      why: 'People feel abandoned',
      reaction: 'Okay. I’ll figure something out. I always do.',
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
    text: 'I keep finding “translations” that are pure AI, full of errors, on medicine leaflets! Shouldn’t AI-made text have to say so?',
    left: {
      label: 'Label AI text',
      effects: { cohesion: 3, margin: -1 },
      set: ['enforcement'],
      later: { rounds: 1, effects: { cohesion: -1 }, why: 'Small publishers struggle with the rules' },
      why: 'AI firms call it red tape',
      reaction: 'Thank you! My mum reads those leaflets.',
    },
    right: {
      label: 'Too much red tape',
      effects: { cohesion: -2 },
      why: 'Nobody knows what to trust',
      reaction: 'So who checks the leaflets? Nobody?',
    },
    when: { minRound: 2 },
    basis: { kind: 'cfg', ref: 'CFG, Plateau, Ending B (AI disinformation and public backlash)' },
    learnMore: {
      text: 'The EU’s General-Purpose AI Code of Practice (July 2025) has a transparency chapter for all general-purpose AI makers. Signing it is voluntary.',
      source: SOURCES.gpaiCode,
    },
  },
  {
    id: 'lea_ai_friend',
    character: 'lea',
    text: 'My little brother talks to an AI “friend” every night. He says it understands him better than we do. Should apps like that be allowed for teenagers?',
    right: {
      label: 'Set an age limit',
      effects: { cohesion: 3 },
      later: { rounds: 1, effects: { cohesion: -1 }, why: 'Teens move to unregulated apps' },
      reaction: 'He’ll hate you. I don’t.',
    },
    left: {
      label: 'Families decide',
      effects: { cohesion: -2, ai: 1 },
      why: 'Lonely teens, richer apps',
      reaction: 'Families are tired, you know.',
    },
    when: { milestone: 'cheap_remote_worker' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Jul 2027: The Cheap Remote Worker" (10% of Americans, mostly young people, consider an AI a close friend)' },
    learnMore: {
      text: 'In AI 2027, by mid 2027 one American in ten, mostly young people, considers an AI “a close friend”.',
      source: SOURCES.ai2027,
    },
  },
];
