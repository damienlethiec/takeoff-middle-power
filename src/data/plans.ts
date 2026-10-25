// The four paths the US and China can take at the tipping point (from AI 2040).

import type { PlanId } from '../engine/types';
import type { PlanDef } from './schema';
import { SOURCES } from './sources';

export const PLANS: PlanDef[] = [
  {
    id: 'verified_slowdown',
    name: 'Verified slowdown',
    plain: 'agree to slow down under inspection',
    description:
      'Washington and Beijing agree to slow down together and let inspectors check that the other side does too. It only works if someone is ready to verify. Eli Lifland, one of the AI 2040 authors, puts the chance of avoiding misaligned takeover on this path at about 72%.',
    source: SOURCES.ai2040Plans,
  },
  {
    id: 'shut_down',
    name: 'Shut it all down',
    plain: 'halt frontier AI altogether',
    description:
      'Under huge public pressure and clear signs the AIs are unsafe, both powers halt frontier training. A ban is only as good as the ability to check it.',
    source: SOURCES.ai2040Plans,
  },
  {
    id: 'fight_china',
    name: 'Fight China',
    plain: 'fight',
    description:
      'The US tries to stop China by force: sabotage, cyberattacks, perhaps more. Tension decides whether it stays cold.',
    source: SOURCES.ai2040Plans,
  },
  {
    id: 'race',
    name: 'Race to superintelligence',
    plain: 'race to superintelligence',
    description:
      'Both sides push ahead as fast as they can and hope their AI is safe. Eli Lifland estimates about a 25% chance of avoiding misaligned takeover this way, or about 40% if the leading lab holds back a little on its own.',
    source: SOURCES.ai2040Plans,
  },
];

export const PLAN_BY_ID: Record<PlanId, PlanDef> = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, PlanDef>;

/** One "what would help" lever per situation, in plain words, for the forecast line. */
export const LEVERS = {
  aiOffice: 'experts who can really test AI (AI Office capacity)',
  verification: 'verification that Europe can host',
  coalition: 'a coalition of middle powers',
  tension: 'lower tension between the US and China',
  moreVerification: 'more inspection capacity, so a deal could be checked quickly',
  keep: 'keeping the coalition and the inspectors ready',
} as const;
