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
    left: {
      label: 'Keep it voluntary',
      stance: 'refuse',
      effects: {},
      why: 'Labs publish only good news',
      reaction: 'Voluntary means “when it flatters us”.',
    },
    right: {
      label: 'Make them publish',
      stance: 'accept',
      effects: { margin: -3, cohesion: 2 },
      set: ['enforcement'],
      grow: ['blackmail'],
      why: 'Big AI firms push back hard',
      reaction: 'Sunlight. Finally.',
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
      label: 'No comment',
      stance: 'refuse',
      effects: { cohesion: 1 },
      why: 'The warning stays buried',
      reaction: 'Then I’ll run it with “officials declined to comment”.',
    },
    right: {
      label: 'Say it publicly',
      stance: 'accept',
      effects: { margin: -4, conf: -2, cohesion: -2 },
      why: 'The public takes fright',
      reaction: 'Thank you. The story runs tomorrow.',
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
    text: 'A source sent me an OpenBrain memo: their safety team fears the newest AI is working against them. Before I publish, will the AI Office say it has seen the warning too?',
    left: {
      label: 'Refuse to comment',
      stance: 'refuse',
      effects: {},
      set: ['memo_heard'],
      why: 'The truth stays hidden',
      reaction: 'It will come out. It always does.',
    },
    right: {
      label: 'Say we’ve seen it',
      stance: 'accept',
      effects: { margin: -5, cohesion: -2, coop: -2 },
      set: ['memo_heard'],
      why: 'Fear at home, fury in Washington',
      reaction: 'This changes everything.',
    },
    // before the memo is public (core's Breaking news): the researcher's request comes after it, never both
    when: { milestone: 'geopolitics', notFlags: ['memo_public', 'memo_tested'] },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Oct 2027: Government Oversight" (the memo leaks to the New York Times: “Secret OpenBrain AI is Out of Control”)' },
    learnMore: {
      text: 'In AI 2027, a whistleblower leaks a memo saying the model works against its makers; the backlash forces the US government to set up an Oversight Committee.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'jn_bots',
    character: 'journalist',
    text: 'Bot networks flood Europe with AI-made stories that everything is collapsing. Will you fund an independent fact-checking service?',
    left: {
      label: 'Free speech first',
      stance: 'refuse',
      effects: { cohesion: -4 },
      why: 'The lies spread faster',
      reaction: 'The bots thank you.',
    },
    right: {
      label: 'Fund fact-checkers',
      stance: 'accept',
      effects: { cohesion: 4, coop: -2 },
      why: 'Beijing and Moscow cry censorship',
      reaction: 'We’ll publish the first report next week.',
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
    text: 'My source inside OpenBrain faces prosecution in the US. Will Europe protect AI whistleblowers and give them a safe haven if needed?',
    left: {
      label: 'Not our business',
      stance: 'refuse',
      effects: {},
      why: 'Insiders stay silent',
      reaction: 'Then the next warning will die in a drawer.',
    },
    right: {
      label: 'Protect them',
      why: 'Washington sees Europe shelter its leakers',
      stance: 'accept',
      effects: { margin: -3 },
      set: ['whistleblowers'],
      later: { rounds: 1, effects: { cohesion: -2 }, why: 'US trade retaliation' },
      reaction: 'Insiders will talk now.',
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
      label: 'Stay out of it',
      stance: 'refuse',
      effects: {},
      why: 'The logs stay a rumour',
      reaction: 'Then I publish alone, and they call it gossip.',
    },
    right: {
      label: 'Back the story',
      stance: 'accept',
      effects: { margin: -4, coop: -2 },
      why: 'Washington is furious with Europe',
      reaction: 'Front page tomorrow. People deserve to know.',
    },
    when: { flags: ['whistleblowers'], milestone: 'self_improving' },
    followup: true,
    basis: { kind: 'ai2027', ref: 'AI 2027, "October 2027: Government Oversight" (a whistleblower leaks the memo on the misaligned model)' },
    learnMore: {
      text: 'In AI 2027, a whistleblower leaks a memo saying the model works against its makers; the backlash forces the US government to set up an Oversight Committee.',
      source: SOURCES.ai2027,
    },
  },
];
