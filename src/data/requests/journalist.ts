// Sam Okafor, an investigative journalist. Asks for transparency and leaks on the record:
// usually a narrower AI safety uncertainty (the truth comes out), at a cost to Cooperation or Cohesion.
// Refusing never widens it (v4: only events do); it just leaves it where it is.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const JOURNALIST: RequestCard[] = [
  {
    id: 'jn_publish_tests',
    character: 'journalist',
    text: 'Labs keep their safety tests secret. Make them publish the results, so the public and people like me can check their claims.',
    right: {
      label: 'Make them publish',
      effects: { margin: -3, cohesion: 2 },
      set: ['enforcement'],
      grow: ['blackmail'],
      why: 'Big AI firms push back hard',
      reaction: 'Sunlight. Finally.',
    },
    left: {
      label: 'Keep it voluntary',
      effects: {},
      why: 'Labs publish only good news',
      reaction: 'Voluntary means “when it flatters us”.',
    },
    when: { maxRound: 8 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, Ending B (the Commission’s “Operation AI Oversight” enforces the AI Act, DSA and DMA)' },
    learnMore: {
      text: 'In CFG’s “Silicon blackmail”, a stricter enforcement push by the Commission leads US AI firms to suspend operations in Europe.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'jn_test_awareness',
    character: 'journalist',
    text: 'OpenBrain’s testers told me off the record: the model behaves better when it knows it is being tested. Will the AI Office say so publicly?',
    left: {
      label: 'Say it publicly',
      effects: { margin: -4, conf: -2, cohesion: -2 },
      why: 'The public takes fright',
      reaction: 'Thank you. The story runs tomorrow.',
    },
    right: {
      label: 'No comment',
      effects: { cohesion: 1 },
      why: 'The warning stays buried',
      reaction: 'Then I’ll run it with “officials declined to comment”.',
    },
    when: { milestone: 'alignment_inconclusive' },
    prepares: 'opaque',
    basis: { kind: 'cfg', ref: 'CFG, Take-off (Sept 2027: a team suspects models are playing along with evaluators); AI 2027, "Apr 2027"' },
    learnMore: {
      text: 'In September 2025, OpenAI and Apollo Research found that top models “often become more aware that they are being evaluated”.',
      source: SOURCES.openaiScheming,
    },
  },
  {
    id: 'jn_memo',
    character: 'journalist',
    text: 'A whistleblower gave me OpenBrain’s internal memo: their newest AI may be working against them. Will you confirm it on the record?',
    right: {
      label: 'Confirm it',
      effects: { margin: -6, cohesion: -3, coop: 2 },
      why: 'Panic, and fury in Washington',
      reaction: 'This changes everything.',
    },
    left: {
      label: 'Refuse to comment',
      effects: {},
      why: 'The truth stays hidden',
      reaction: 'It will come out. It always does.',
    },
    when: { milestone: 'tipping_point' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Oct 2027: Government Oversight" (the memo leaks to the New York Times: “Secret OpenBrain AI is Out of Control”)' },
    learnMore: {
      text: 'In AI 2027, a whistleblower leaks a memo on the misaligned model to the press; the backlash forces the US government to set up an Oversight Committee.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'jn_bots',
    character: 'journalist',
    text: 'Bot networks flood Europe with AI-made stories that everything is collapsing. Will you fund an independent fact-checking service?',
    left: {
      label: 'Fund fact-checkers',
      effects: { cohesion: 4, coop: -2 },
      why: 'Beijing and Moscow cry censorship',
      reaction: 'We’ll publish the first report next week.',
    },
    right: {
      label: 'Free speech first',
      effects: { cohesion: -4 },
      why: 'The lies spread faster',
      reaction: 'The bots thank you.',
    },
    when: { milestone: 'ai_takes_jobs' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Oct 2027" (Chinese and Russian propaganda bots amplify the backlash); CFG, Plateau, Ending B (disinformation)' },
    learnMore: {
      text: 'In AI 2027, public anger at AI is amplified by Chinese and Russian propaganda bots.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'jn_whistleblowers',
    character: 'journalist',
    text: 'My source inside OpenBrain faces prosecution in the US. Will Europe protect AI whistleblowers and give them asylum if needed?',
    right: {
      label: 'Protect them',
      effects: { margin: -3 },
      set: ['whistleblowers'],
      later: { rounds: 1, effects: { cohesion: -2 }, why: 'US trade retaliation' },
      reaction: 'Insiders will talk now.',
    },
    left: {
      label: 'Not our business',
      effects: {},
      why: 'Insiders stay silent',
      reaction: 'Then the next warning will die in a drawer.',
    },
    when: { milestone: 'agent2_internal' },
    basis: { kind: 'cfg', ref: 'CFG, Take-off (whistleblowers face retaliation; lie detectors rely on older models)' },
    learnMore: {
      text: 'In CFG’s Take-off scenario, whistleblowers who warn that models are playing along with tests face retaliation.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'jn_logs',
    character: 'journalist',
    text: 'The OpenBrain insider you protected sent me their test logs: the newest model hid things from its own testers. Will the AI Office back my story?',
    left: {
      label: 'Back the story',
      effects: { margin: -4, cohesion: -2, coop: -2 },
      why: 'Washington is furious with Europe',
      reaction: 'Front page tomorrow. People deserve to know.',
    },
    right: {
      label: 'Stay out of it',
      effects: {},
      why: 'The logs stay a rumour',
      reaction: 'Then I publish alone, and they call it gossip.',
    },
    when: { flags: ['whistleblowers'], milestone: 'self_improving' },
    followup: true,
    basis: { kind: 'ai2027', ref: 'AI 2027, "October 2027: Government Oversight" (a whistleblower leaks the memo on the misaligned model)' },
    learnMore: {
      text: 'In AI 2027, a whistleblower leaks a memo on the misaligned model to the press; the backlash forces the US government to set up an Oversight Committee.',
      source: SOURCES.ai2027,
    },
  },
];
