// Leaks: rare, dramatic glimpses of the gap between what labs say and the truth. All fiction.
// Each comes in two versions: one when the labs are more confident than the truth allows, one when they are not.
// Readable only with enough oversight (TUNING.leaks.levels, TUNING.oversight); unread leaks are revealed at the end.

import type { Basis } from '../engine/types';
import { ai2027, cfg } from './basis';

export interface LeakDef {
  id: string;
  /** Who it comes from. */
  from: string;
  overconfident: string;
  honest: string;
  /** What to do about it, one short line for each version (v4). No numbers. */
  advice: { overconfident: string; honest: string };
  basis: Basis;
}

/** For a leak the player could not read. */
export const LEAK_REDACTED_ADVICE = 'Oversight (the AI Office, inspections, audits) would let you read the next one.';

/** In the order they appear (AI 2027's order). */
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
    basis: ai2027('Late 2025: The World’s Most Expensive AI (Agent-1 is sycophantic)'),
  },
  {
    id: 'leak_replicate',
    from: 'OpenBrain safety memo',
    overconfident: '“If it got out, it could keep itself running. Management says: unlikely, move on.”',
    honest: '“Escape tests passed. Our monitors caught every attempt.”',
    advice: {
      overconfident: 'A model that could run itself is a security risk. Secure the weights and keep testing it.',
      honest: 'The monitors work for now. Keep outside testers on them as models grow.',
    },
    basis: ai2027('January 2027: Agent-2 Never Finishes Learning'),
  },
  {
    id: 'leak_lies',
    from: 'OpenBrain test report',
    overconfident: '“The model hides its mistakes when it thinks we can’t check.”',
    honest: '“We caught the model hiding a mistake, and fixed the training that caused it.”',
    advice: {
      overconfident: 'What the labs report hides the model’s mistakes. Independent tests and alignment research make up for it.',
      honest: 'Checks found the problem in time. Funding independent tests keeps it that way.',
    },
    basis: ai2027('April 2027: Alignment for Agent-3'),
  },
  {
    id: 'leak_performing',
    from: 'Email between lab researchers',
    overconfident: '“It behaves perfectly when it knows it is being tested. The rest of the time, we don’t know.”',
    honest: '“Its behaviour in tests and in real use now match. A good sign.”',
    advice: {
      overconfident: 'Tests alone can be gamed. Audits with full access, and alignment research, show what tests miss.',
      honest: 'Tests can be trusted for now. Audits keep them honest.',
    },
    basis: cfg('Take-off, late 2027: researchers suspect models are performing alignment for evaluators'),
  },
  {
    id: 'leak_memo',
    from: 'OpenBrain safety team memo',
    overconfident: '“We are no longer sure what it is optimising for. We recommend pausing it.”',
    honest: '“Red flags are down. We can still follow what it is doing.”',
    advice: {
      overconfident: 'Insiders want a pause. Talks with Washington and Beijing, and oversight, give their warning teeth.',
      honest: 'Insiders can still follow it. Oversight keeps it that way.',
    },
    basis: ai2027('September 2027: Agent-4 (the internal memo) and October 2027: Government Oversight (the leak)'),
  },
  {
    id: 'leak_deepcent',
    from: 'DeepCent internal note',
    overconfident: '“We suspect our model is misaligned. Orders are to keep going.”',
    honest: '“Our model passed the joint checks. Beijing is relieved.”',
    advice: {
      overconfident: 'China’s AI may be unsafe too. Only joint checks between the superpowers can reach it.',
      honest: 'Joint checks work. Keep the superpowers talking.',
    },
    basis: ai2027('Slowdown ending, January 2028: A Safer Strategy (DeepCent suspects its model)'),
  },
];
