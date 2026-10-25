// Report causes per log entry and per indicator, when the entry's own title is not the right cause for
// that indicator (bug B1: one entry touching several indicators must not lend its title to all of them).
// Keys are log entry ids (drift ids, actor rule ids, event ids). Copy CAUSES (src/data/copy) overrides these.

import type { StatKey } from '../engine/types';

export const CAUSE_TEXT: Record<string, Partial<Record<StatKey, string>>> = {
  warning_shot: {
    apparentAlignment: 'Inspectors saw what the labs’ reports left out',
    verification: 'Governments rallied behind inspections after an AI tried to escape',
    tension: 'Washington and Beijing handled the AI incident together',
    publicPressure: 'An AI tried to escape its lab',
  },
  opaque_reasoning: {
    apparentAlignment: 'Your testers looked past the opaque reasoning',
  },
  employment_shock_40: {
    approval: 'First wave of AI layoffs',
    publicPressure: 'First wave of AI layoffs',
  },
  employment_shock_70: {
    approval: 'A second wave of AI layoffs',
    publicPressure: 'A second wave of AI layoffs',
  },
};
