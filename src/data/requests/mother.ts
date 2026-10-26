// Your mother, a retired nurse in Lyon who still helps at her old hospital. AI in hospitals as lived: trust, then
// doubt. A human view of AI safety.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const MOTHER_REQUESTS: RequestCard[] = [
  {
    id: 'mum_triage_pilot',
    character: 'mother',
    text: 'My old hospital wants to try an AI that sorts emergency patients this winter. The director says it would end the waiting, and he’d love your public support. Will you back it?',
    left: {
      label: 'Test it first',
      stance: 'refuse',
      effects: { cohesion: -2, margin: -1 },
      why: 'Waiting rooms stay full',
      reaction: 'Sensible, darling. The director will sulk.',
    },
    right: {
      label: 'Back the pilot',
      stance: 'accept',
      effects: { cohesion: 3 },
      later: { rounds: 2, effects: { cohesion: -2 }, why: 'A triage error makes the news' },
      why: 'Untested AI on real patients',
      reaction: 'Wonderful! I’ll tell the nurses it was my child.',
    },
    when: { milestone: 'ai_takes_jobs' },
    basis: { kind: 'real', ref: 'EU AI Act, Annex III, point 5(d) (emergency healthcare patient triage systems are high-risk)' },
    learnMore: {
      text: 'Under the EU AI Act, AI used to triage emergency patients counts as “high-risk”: from August 2026 it must be tested, documented and overseen by people.',
      source: SOURCES.aiActOj,
    },
  },
  {
    id: 'mum_near_miss',
    character: 'mother',
    text: 'Our hospital’s AI prescribed a child an adult’s dose. A pharmacist caught it in time. The director wants it kept quiet, to avoid a panic. Shouldn’t hospitals have to report these near misses?',
    left: {
      label: 'Keep it quiet',
      stance: 'refuse',
      effects: { cohesion: 1 },
      later: { rounds: 2, effects: { cohesion: -3 }, why: 'The cover-up comes out' },
      why: 'Nobody learns from the mistake',
      reaction: 'So we wait for the next one. Lovely.',
    },
    right: {
      label: 'Make them report',
      stance: 'accept',
      effects: { margin: -2, cohesion: -2 },
      why: 'Frightening headlines for a while',
      reaction: 'Thank you. That pharmacist deserves a medal.',
    },
    when: { milestone: 'alignment_inconclusive' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "October 2027: Government Oversight" (warning signs, once public, turn opinion against AI)' },
    learnMore: {
      text: 'In AI 2027, warnings about the lab’s AI stay inside the company until a whistleblower leaks them to the press. Then the public turns against AI.',
      source: SOURCES.ai2027,
    },
  },
];
