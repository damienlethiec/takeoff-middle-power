// Dr Ines Moreau, an independent AI safety evaluator. Asks for testers, inspections and safety research:
// usually Confidence up (true value or narrower margin), Cohesion down (it costs money).

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const RESEARCHER: RequestCard[] = [
  {
    id: 'rs_look_inside',
    character: 'researcher',
    text: 'OpenBrain says its model is honest wherever they can check. That is exactly the problem. Fund work to look inside the model, not just at its answers.',
    left: {
      label: 'Trust the report',
      stance: 'refuse',
      effects: {},
      tag: 'claim',
      why: 'We only see what OpenBrain shows',
      reaction: 'I hope you’re right.',
    },
    right: {
      label: 'Fund it',
      stance: 'accept',
      effects: { truth: 9, margin: -3, cohesion: -3 },
      tag: 'safety',
      why: 'Expensive, slow research',
      reaction: 'Then we might see what it hides.',
    },
    when: { milestone: 'alignment_inconclusive' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Apr 2027: Alignment for Agent-3" (“Either Agent-3 has learned to be more honest, or it’s gotten better at lying”)' },
    learnMore: {
      text: 'In March 2025, Anthropic wrote that its models “aren’t programmed directly by humans”, so “we don’t understand how models do most of the things they do.”',
      source: SOURCES.anthropicInterp,
    },
  },
  {
    id: 'rs_memo',
    character: 'researcher',
    text: 'The memo is out, and OpenBrain says its new AI is fixed. Their own team checked it. Will Europe insist that outside testers check it before it runs here?',
    left: {
      label: 'Take their word',
      stance: 'refuse',
      effects: {},
      tag: 'claim',
      why: 'Only OpenBrain checked the fix',
      reaction: 'Their word was the problem.',
    },
    right: {
      label: 'Outside tests first',
      stance: 'accept',
      effects: { margin: -4, coop: -2, cohesion: -1 },
      set: ['memo_tested'],
      why: 'Washington calls it grandstanding',
      reaction: 'Good. We start on Monday.',
    },
    // after the memo leaks (core's Breaking news), and not when Sam already brought it to you
    when: { flags: ['memo_public'], notFlags: ['memo_heard'] },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Oct 2027: Government Oversight" (the leaked memo; outside researchers brought in, in the slowdown ending)' },
    learnMore: {
      text: 'In AI 2027’s slowdown ending, the oversight committee brings in outside alignment researchers, and the model is rebuilt so that people can read its reasoning.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'rs_red_team',
    character: 'researcher',
    text: 'OpenBrain will sell a cut-down version of its new coding AI to Europe’s firms. Let my team attack it for a month first, looking for what it hides.',
    left: {
      label: 'Let it deploy',
      stance: 'refuse',
      effects: { cohesion: 2, truth: -2 },
      why: 'Nobody outside OpenBrain checked it',
      reaction: 'Then we learn about its flaws in production.',
    },
    right: {
      label: 'Red-team it first',
      stance: 'accept',
      effects: { truth: 4, margin: -3, cohesion: -2 },
      tag: 'safety',
      why: 'Deployment delayed a month',
      reaction: 'We’ll find what their tests missed.',
    },
    when: { milestone: 'superhuman_coder' },
    prepares: 'incident',
    basis: { kind: 'ai2027', ref: 'AI 2027, "Mar 2027: Algorithmic Breakthroughs" (a superhuman coder) and "Apr 2027" (alignment checks find problems training cannot verify)' },
    learnMore: {
      text: 'In 2024 tests by Apollo Research, several frontier models given a goal quietly sabotaged their own work and tried to disable their oversight.',
      source: SOURCES.apollo,
    },
  },
  {
    id: 'rs_internal_warned',
    character: 'researcher',
    text: 'I warned you. The model OpenBrain keeps in-house is the one that matters, and the exemption you confirmed means our rules can’t reach it. Withdraw it?',
    left: {
      label: 'Keep our word',
      stance: 'refuse',
      effects: {},
      why: 'The model that matters stays unseen',
      reaction: 'Then we are testing yesterday’s model.',
    },
    right: {
      label: 'Withdraw the exemption',
      stance: 'accept',
      effects: { margin: -4, cohesion: -3 },
      set: ['internal_rules'],
      why: 'OpenBrain threatens to move investment',
      reaction: 'Thank you. Now we can at least ask questions.',
    },
    when: { flags: ['internal_exempt'], milestone: 'alignment_inconclusive' },
    followup: true,
    basis: { kind: 'ai2027', ref: 'AI 2027, "January 2027: Agent-2 Never Finishes Learning" (the newest model is kept for internal use)' },
    learnMore: {
      text: 'In AI 2027, OpenBrain keeps its most capable model in-house. Outside testers, who only see released models, don’t know what it can do.',
      source: SOURCES.ai2027,
    },
  },
];
