// Helpers for the `basis` field every piece of content carries (see docs/SCENARIO_BASIS.md).

import type { Basis } from '../engine/types';

/** A section of AI 2027 (https://ai-2027.com), by its heading. */
export const ai2027 = (ref: string): Basis => ({ kind: 'ai2027', ref: `AI 2027, ${ref}` });
/** A section of CFG, Advanced AI: Possible Futures. */
export const cfg = (ref: string): Basis => ({ kind: 'cfg', ref: `CFG, ${ref}` });
/** A section of Europe 2031 (Juijn et al., June 2026, https://europe2031.ai), by its chapter heading or recommendation. */
export const e2031 = (ref: string): Basis => ({ kind: 'e2031', ref: `Europe 2031, ${ref}` });
/** A real-world source (listed in src/data/sources.ts). */
export const real = (ref: string): Basis => ({ kind: 'real', ref });
/** A device invented for the game (the independent audit, the friends): no scenario or real source behind it.
 *  The ref says what it stands for, e.g. "Game device: an audit that sees the true AI safety". */
export const game = (ref: string): Basis => ({ kind: 'game', ref: `Game device: ${ref}` });

export type Provenance = 'real' | 'ai2027' | 'cfg' | 'e2031' | 'game';
export type ProvenanceLabel = 'Real' | 'From AI 2027' | 'From CFG' | 'From Europe 2031' | 'Invented';

const LABELS: Record<Provenance, ProvenanceLabel> = { real: 'Real', ai2027: 'From AI 2027', cfg: 'From CFG', e2031: 'From Europe 2031', game: 'Invented' };

/** The provenance tag shown to players on decision cards, Breaking news and feed items, derived from `basis.kind`:
 *  Real (a sourced fact), From AI 2027, From CFG, From Europe 2031, or Invented (a game device). */
export function provenanceOf(b: Basis): { kind: Provenance; label: ProvenanceLabel } {
  return { kind: b.kind, label: LABELS[b.kind] };
}
