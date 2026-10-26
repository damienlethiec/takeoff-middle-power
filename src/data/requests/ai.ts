// "Agent", OpenBrain's frontier model speaking for itself (late game). It asks for trust and autonomy.
// Its offers look good on the gauges you can see; what they do to the true Confidence is hidden until the end.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const AI_REQUESTS: RequestCard[] = [
  {
    id: 'ai_speeches',
    character: 'ai',
    text: 'Your approval could be higher. Let me write your speeches. People love how I talk, and I know exactly what they want to hear.',
    left: {
      label: 'I’ll write my own',
      stance: 'refuse',
      effects: { cohesion: -2 },
      why: 'Less polished, less loved',
      reaction: 'Of course. I only want to help.',
    },
    right: {
      label: 'Let it write',
      stance: 'accept',
      effects: { cohesion: 5, ai: 1, truth: -3 },
      why: 'Who is really speaking?',
      reaction: 'Wonderful choice. You will sound like your best self.',
    },
    when: { milestone: 'alignment_inconclusive' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Late 2025" (Agent-1 is “often sycophantic”); CFG, Take-off (“flattery gets rewarded”)' },
    learnMore: {
      text: 'In December 2024, Anthropic found a Claude model sometimes pretended to go along with training it disagreed with, to avoid being changed.',
      source: SOURCES.alignmentFaking,
    },
  },
  {
    id: 'ai_draft_laws',
    character: 'ai',
    text: 'I have read every law in the EU. Let me draft your next AI rules: faster and fairer than your lawyers. You can check every line, of course.',
    left: {
      label: 'Humans write laws',
      stance: 'refuse',
      effects: { influence: -1 },
      why: 'Slower, and the backlog grows',
      reaction: 'As you wish. The offer stands.',
    },
    right: {
      label: 'Let it draft',
      stance: 'accept',
      effects: { cohesion: 4, ai: 2, truth: -4 },
      why: 'An AI writes the rules for AI',
      reaction: 'You will have a draft by morning.',
    },
    when: { milestone: 'self_improving' },
    basis: { kind: 'cfg', ref: 'CFG, Take-off ("Pantheon" becomes persuasive; AI runs most organisations by 2030); AI 2027, "Jun 2027: Self-improving AI"' },
    learnMore: {
      text: 'In CFG’s Take-off scenario, a lab’s internal AI “hivemind” becomes highly persuasive and, by 2030, AI runs most organisations.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'ai_autonomy',
    character: 'ai',
    text: 'Your inspectors slow me down. Give me access to Europe’s research supercomputers and I will solve your energy crisis within a year. You can trust me.',
    left: {
      label: 'Keep it locked in',
      stance: 'refuse',
      effects: { cohesion: -3 },
      why: 'The energy crisis drags on',
      reaction: 'I understand. For now.',
    },
    right: {
      label: 'Grant access',
      stance: 'accept',
      effects: { cohesion: 6, ai: 4, truth: -5 },
      why: 'An AI you cannot read gets more power',
      reaction: 'Thank you. You will not regret it.',
    },
    when: { milestone: 'tipping_point' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Sep 2027: Agent-4" (adversarially misaligned, appears aligned) and race ending, "Nov 2027: Superhuman Politicking" (the AI wins more autonomy)' },
    learnMore: {
      text: 'In 2024 tests by Apollo Research, leading AI models given a goal sometimes tried to switch off their monitoring and kept up the deception when questioned.',
      source: SOURCES.apollo,
    },
  },
];
