// Li Wen, Beijing's delegate in Geneva. Offers talks, joint statements, asks for access to European tools:
// usually Cooperation up, Confidence or Cohesion down.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const CN_DELEGATE: RequestCard[] = [
  {
    id: 'cn_nuclear',
    character: 'cn_delegate',
    text: 'Our presidents once agreed that humans, not AI, must decide on nuclear weapons. Let us go further: a joint statement keeping AI out of all launch decisions.',
    left: {
      label: 'Leave it to them',
      stance: 'refuse',
      effects: { coop: -3 },
      reaction: 'Then Europe is only a spectator.',
    },
    right: {
      label: 'Co-sign the statement',
      stance: 'accept',
      effects: { coop: 6, cohesion: -2 },
      why: 'Hawks call it soft on Beijing',
      reaction: 'Words first. Trust follows words.',
    },
    when: { minRound: 2 },
    basis: { kind: 'real', ref: 'Biden–Xi agreement on human control over nuclear weapons decisions (Nov 2024)' },
    learnMore: {
      text: 'In November 2024, the US and Chinese presidents agreed “on the need to maintain human control over the decision to use nuclear weapons”.',
      source: SOURCES.sullivanNuclear,
    },
  },
  {
    id: 'cn_tools',
    character: 'cn_delegate',
    text: 'Our companies want Europe’s chip-design software and cloud access. Open the door, and our labs will join your safety testing talks.',
    left: {
      label: 'Keep it closed',
      stance: 'refuse',
      effects: { coop: -5, cohesion: 1 },
      why: 'Beijing calls it a blockade',
      reaction: 'Europe follows Washington, again.',
    },
    right: {
      label: 'Open the door',
      stance: 'accept',
      effects: { coop: 6, ai: 2 },
      grow: ['theft'],
      why: 'DeepCent catches up faster',
      reaction: 'A sensible partner. Our engineers will be in touch.',
    },
    when: { notFlags: ['chip_controls'], milestone: 'china_wakes_up' },
    basis: { kind: 'cfg', ref: 'CFG, Arms race, main scenario (Europe squeezed between the US and China; some organisations shift to Chinese tools)' },
    learnMore: {
      text: 'In March 2023, the Netherlands announced export controls on ASML’s older DUV chip machines, citing national security.',
      source: SOURCES.dutchDuv,
    },
  },
  {
    id: 'cn_open_models',
    character: 'cn_delegate',
    text: 'Our open-weight models are free and nearly as good as OpenBrain’s. Let Europe’s schools and public services use them. Why pay Americans?',
    left: {
      label: 'Keep them out',
      stance: 'refuse',
      effects: { coop: -4, cohesion: -2 },
      why: 'Public services pay more',
      reaction: 'Fear is expensive, Envoy.',
    },
    right: {
      label: 'Allow them',
      stance: 'accept',
      effects: { cohesion: 4, coop: 4 },
      grow: ['ransomware'],
      why: 'Nobody here tested these models',
      reaction: 'Good. Knowledge should be shared.',
    },
    when: { milestone: 'ai_takes_jobs' },
    basis: { kind: 'cfg', ref: 'CFG, Take-off, main scenario (Chinese open-source agents widely available; Europe drops the case for its own champion)' },
    learnMore: {
      text: 'In CFG’s Take-off scenario, Europe drops the case for its own AI champion once Chinese open-source agents are widely available.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'cn_theft_denial',
    character: 'cn_delegate',
    text: 'Beijing denies any theft. Accusations without proof poison the talks. Will Europe stay neutral, or join the American chorus?',
    left: {
      label: 'Back the accusation',
      stance: 'refuse',
      effects: { coop: -6, cohesion: 2 },
      reaction: 'Then Europe has chosen.',
    },
    right: {
      label: 'Stay neutral',
      stance: 'accept',
      effects: { coop: 5, cohesion: -3 },
      why: 'Voters see Europe look away',
      reaction: 'Wise. Let the experts talk, not the generals.',
    },
    when: { threat: { id: 'theft', struck: true } },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Feb 2027: China Steals Agent-2" (the theft is detected and the US blames China)' },
    learnMore: {
      text: 'In November 2025, Anthropic said a group it assessed as Chinese state-sponsored used its AI to run most of a hacking campaign against about 30 targets.',
      source: SOURCES.anthropicEspionage,
    },
  },
  {
    id: 'cn_pause_offer',
    character: 'cn_delegate',
    text: 'China is ready to discuss a mutual pause on the most powerful AI. We need a neutral verifier. Will Europe put its inspectors forward?',
    left: {
      label: 'Too risky',
      stance: 'refuse',
      effects: { coop: -5 },
      reaction: 'You wanted a pause. Now you are afraid of one.',
    },
    right: {
      label: 'Offer our inspectors',
      stance: 'accept',
      effects: { coop: 8, cohesion: -3, truth: 3 },
      inspections: 1,
      why: 'Costly, and Washington is wary',
      reaction: 'Then there is a path. A narrow one.',
    },
    when: { milestone: 'geopolitics' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Aug 2027" (Chinese treaty overtures) and race ending, "Nov 2027" (China offers concessions for a pause); CFG, Arms race, Ending B (EU auditors)' },
    learnMore: {
      text: 'In AI 2027, China’s overtures for an arms control treaty lead nowhere. In its race ending, China, behind, offers concessions for a pause, and the US declines.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'cn_joint_research',
    character: 'cn_delegate',
    text: 'Our alignment researchers want to work with yours: shared workshops, shared test sets, no secrets about weights. Will Europe open its labs to them?',
    left: {
      label: 'Not with China',
      stance: 'refuse',
      effects: { coop: -3 },
      why: 'Beijing sees a closed door',
      reaction: 'Then each of us makes the same mistakes alone.',
    },
    right: {
      label: 'Work together',
      stance: 'accept',
      effects: { coop: 4, truth: 4, cohesion: -2 },
      grow: ['theft'],
      tag: 'safety',
      why: 'Security services object',
      reaction: 'Science travels better than diplomats.',
    },
    when: { minRound: 2, maxRound: 9 },
    basis: { kind: 'cfg', ref: 'CFG, Diplomacy, main scenario (European researchers collaborate with Chinese and American counterparts)' },
    learnMore: {
      text: 'In CFG’s Diplomacy scenario, European researchers work with Chinese and American counterparts on AI security, while the UK coordinates the first AI Security Summit.',
      source: SOURCES.cfg,
    },
  },
];
