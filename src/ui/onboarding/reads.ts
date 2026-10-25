// What the onboarding UI reads from the engine, behind one small interface so dev fixtures can stand in
// for engine features that are not implemented yet (see fixtures.ts, enabled with ?obfixtures in dev).

import type { EngineApi } from '../../engine/api';
import type { GameState, JournalEntry, LeaScene, Notice, Tip } from '../../engine/types';

export type DeliveredLetter = LeaScene & { quarter: number };

export interface OnboardingReads {
  notices(s: GameState): Notice[];
  tip(s: GameState): Tip | null;
  markTipShown(s: GameState, id: string): GameState;
  journal(s: GameState): JournalEntry[];
  leaLetters(s: GameState): DeliveredLetter[];
}

export const engineReads = (e: EngineApi): OnboardingReads => ({
  notices: (s) => s.notices ?? [],
  tip: (s) => e.tip(s),
  markTipShown: (s, id) => e.markTipShown(s, id),
  journal: (s) => e.journal(s),
  leaLetters: (s) => s.leaLetters ?? [],
});
