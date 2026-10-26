// Dr Ines Moreau, an independent AI safety evaluator. Asks for testers, inspections and safety research:
// usually Confidence up (true value or narrower margin), Cohesion down (it costs money).

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const RESEARCHER: RequestCard[] = [
  {
    id: 'rs_compute_pledge',
    character: 'researcher',
    text: 'Pledge a third of the compute in Europe’s new AI gigafactories to safety research, like a CERN for AI. Firms will complain.',
    right: {
      label: 'Pledge the compute',
      effects: { truth: 10, conf: 2, cohesion: -3, ai: -1 },
      tag: 'safety',
      why: 'Fewer jobs from commercial use',
      reaction: 'Now the best minds can work on the hard part.',
    },
    left: {
      label: 'Keep it commercial',
      effects: { cohesion: 3, ai: 1 },
      why: 'More compute for the race',
      reaction: 'Then safety stays a hobby.',
    },
    when: { minRound: 3 },
    weight: 2,
    basis: { kind: 'cfg', ref: 'CFG, Diplomacy, main scenario (the EU pledges 35% of its AI Gigafactories’ compute to safety research)' },
    learnMore: {
      text: 'In CFG’s Diplomacy scenario, the EU pledges 35% of its AI gigafactories’ compute to safety and security research, overseen by a new “CERN for AI”.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'rs_look_inside',
    character: 'researcher',
    text: 'OpenBrain says its model is honest wherever they can check. That is exactly the problem. Fund work to look inside the model, not just at its answers.',
    left: {
      label: 'Fund it',
      effects: { truth: 9, margin: -3, cohesion: -3 },
      tag: 'safety',
      why: 'Expensive, slow research',
      reaction: 'Then we might see what it hides.',
    },
    right: {
      label: 'Trust the report',
      effects: {},
      tag: 'claim',
      why: 'We only see what OpenBrain shows',
      reaction: 'I hope you’re right.',
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
    text: 'Colleagues inside OpenBrain say their newest AI may be working against them. No proof, only signs. Should Europe call for it to be paused until tested?',
    right: {
      label: 'Call for a pause',
      effects: { ai: -3, conf: -4, coop: 3, cohesion: -2 },
      why: 'The public takes fright',
      reaction: 'Someone had to say it out loud.',
    },
    left: {
      label: 'Wait for proof',
      effects: { ai: 1 },
      why: 'The signs stay buried',
      reaction: 'By the time there is proof, it may be too late.',
    },
    when: { milestone: 'tipping_point' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Sep 2027: Agent-4" (the safety team’s memo, “no smoking gun”) and "Oct 2027" (European leaders call for a pause)' },
    learnMore: {
      text: 'In AI 2027, once a memo about the misaligned model leaks, European leaders accuse the US of “creating rogue AGI” and call for a pause; China and India join in.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'rs_red_team',
    character: 'researcher',
    text: 'OpenBrain wants to deploy its new coding AI across Europe’s firms. Let my team attack it for a month first, looking for what it hides.',
    right: {
      label: 'Red-team it first',
      effects: { truth: 4, margin: -3, cohesion: -2 },
      tag: 'safety',
      why: 'Deployment delayed a month',
      reaction: 'We’ll find what their tests missed.',
    },
    left: {
      label: 'Let it deploy',
      effects: { cohesion: 2, truth: -2 },
      why: 'Nobody outside OpenBrain checked it',
      reaction: 'Then we learn about its flaws in production.',
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
      label: 'Withdraw the exemption',
      effects: { margin: -4, cohesion: -3 },
      set: ['internal_rules'],
      why: 'OpenBrain threatens to move investment',
      reaction: 'Thank you. Now we can at least ask questions.',
    },
    right: {
      label: 'Keep our word',
      effects: {},
      why: 'The model that matters stays unseen',
      reaction: 'Then we are testing yesterday’s model.',
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
