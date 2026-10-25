// Fixed one-liners and labels.

import type { PlanId, RegionId } from '../engine/types';

export const GOAL_LINE = 'Goal: when AI starts improving itself, the world must be able to verify a deal.';

export const FIRST_YEAR = 2027;

/** "On current course: <this> (45%)." */
export const PLAN_LIKELY: Record<PlanId, string> = {
  verified_slowdown: 'a verified slowdown is likely',
  shut_down: 'a full shutdown of frontier AI is likely',
  fight_china: 'the US is likely to fight China',
  race: 'a race to superintelligence is likely',
};

export const REGION_NAMES: Record<RegionId, string> = {
  eu: 'Europe',
  us: 'the United States',
  cn: 'China',
};
