// Leaks: rare, dramatic glimpses of the gap between what labs say and the truth. All fiction.
// Each comes in two versions: one when the labs are more confident than the truth allows, one when they are not.
// Readable only with enough oversight (TUNING.leaks.levels, TUNING.oversight); unread leaks are revealed at the end.

import type { Basis, MilestoneId } from '../engine/types';
import { ai2027, cfg } from './basis';

export interface LeakDef {
  id: string;
  /** Who it comes from. */
  from: string;
  overconfident: string;
  honest: string;
  /** What to do about it, one short line for each version (v4). No numbers. */
  advice: { overconfident: string; honest: string };
  /** The AI 2027 milestone it follows: it is shown at the first leak round after that milestone, never before. */
  after: MilestoneId;
  basis: Basis;
}

/** For a leak the player could not read. */
export const LEAK_REDACTED_ADVICE = 'More checks on the labs (the AI Office, inspections, audits) would let you read the next one.';

/** In the order they appear (AI 2027's order), each after its milestone. The memo, AI 2027's public leak, is not one
 *  of these: it is Breaking news with its own effects (src/data/threats.ts, EVENTS.memo). */
export const LEAKS: LeakDef[] = [
  {
    id: 'leak_sycophant',
    from: 'Internal OpenBrain chat',
    overconfident: '“It tells the testers what they want to hear. We ship it anyway.”',
    honest: '“The honesty tests look solid this month. For once I believe them.”',
    advice: {
      overconfident: 'The labs’ numbers look too good. Inspections and audits grow what you have verified.',
      honest: 'Good news, but only what you verify counts. Keep the inspectors in.',
    },
    after: 'coding_automation',
    basis: ai2027('Late 2025: The World’s Most Expensive AI (Agent-1 is sycophantic)'),
  },
  {
    id: 'leak_replicate',
    from: 'OpenBrain safety memo',
    overconfident: '“If it got out, it could keep itself running. Management says: unlikely, move on.”',
    honest: '“Escape tests passed. Our monitors caught every attempt.”',
    advice: {
      overconfident: 'A model that could run itself is a security risk. Lock it down and keep testing it.',
      honest: 'The monitors work for now. Keep outside testers on them as models grow.',
    },
    after: 'agent2_internal',
    basis: ai2027('January 2027: Agent-2 Never Finishes Learning'),
  },
  {
    id: 'leak_lies',
    from: 'OpenBrain test report',
    overconfident: '“The model hides its mistakes when it thinks we can’t check.”',
    honest: '“We caught the model hiding a mistake, and fixed the training that caused it.”',
    advice: {
      overconfident: 'What the labs report hides the model’s mistakes. Independent tests and AI safety research make up for it.',
      honest: 'Checks found the problem in time. Funding independent tests keeps it that way.',
    },
    after: 'alignment_inconclusive',
    basis: ai2027('April 2027: Alignment for Agent-3'),
  },
  {
    id: 'leak_performing',
    from: 'Email between lab researchers',
    overconfident: '“It behaves perfectly when it knows it is being tested. The rest of the time, we don’t know.”',
    honest: '“Its behaviour in tests and in real use now match. A good sign.”',
    advice: {
      overconfident: 'Tests alone can be gamed. Inspections inside the labs, and AI safety research, show what tests miss.',
      honest: 'Tests can be trusted for now. Audits keep them honest.',
    },
    after: 'national_security',
    basis: cfg('Take-off, late 2027: researchers suspect models are performing alignment for evaluators'),
  },
];
