// Helpers for the `basis` field every piece of content carries (see docs/SCENARIO_BASIS.md).

import type { Basis } from '../engine/types';

/** A section of AI 2027 (https://ai-2027.com), by its heading. */
export const ai2027 = (ref: string): Basis => ({ kind: 'ai2027', ref: `AI 2027, ${ref}` });
/** A section of CFG, Advanced AI: Possible Futures. */
export const cfg = (ref: string): Basis => ({ kind: 'cfg', ref: `CFG, ${ref}` });
/** A real-world source (listed in src/data/sources.ts). */
export const real = (ref: string): Basis => ({ kind: 'real', ref });
