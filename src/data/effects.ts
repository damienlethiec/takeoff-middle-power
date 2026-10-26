// Effects in words before deciding, numbers after (playtests of 26 Oct: players computed their moves from the exact
// numbers). Card faces, card details, the selection's preview on the gauges and request answers say which way a
// gauge moves and how much in words ("US–China cooperation: up a lot"); Influence stays a number (it is a resource).
// Once the player has decided, the feed, the gauges and the announcements show the numbers as before.
// The scale is TUNING.effectWords: ≤ little "a little", ≤ some "some", more "a lot".

import type { Impact } from '../engine/types';
import { GAUGE_LABEL } from './copy';
import { TUNING } from './tuning';

export type SizeWord = 'a little' | 'some' | 'a lot';

/** How big a move is, in words (its sign does not matter). */
export function sizeWord(n: number): SizeWord {
  const a = Math.abs(n);
  return a <= TUNING.effectWords.little ? 'a little' : a <= TUNING.effectWords.some ? 'some' : 'a lot';
}

/** "up a lot", "down a little". */
export const moveWord = (delta: number) => `${delta > 0 ? 'up' : 'down'} ${sizeWord(delta)}`;

/** "US–China cooperation: up a lot", "Social cohesion: down a little". */
export const moveText = (label: string, delta: number) => `${label}: ${moveWord(delta)}`;

/** The verified part of AI safety (the part that counts): "AI safety: verified part up some". */
export const verifiedMoveText = (delta: number) => `${GAUGE_LABEL.confidence}: verified part ${moveWord(delta)}`;

/** A preview line (before → after, public values) in words, for announcements before the player decides. */
export function impactWords(i: Impact): string {
  if (i.key === 'europeAi') return `Europe’s AI would turn ${i.after}`;
  const d = Number(i.after) - Number(i.before);
  if (i.key === 'margin') return verifiedMoveText(d);
  if (i.key === 'influence') return `Influence ${d > 0 ? '+' : '−'}${Math.abs(d)}`;
  return moveText(i.label, d);
}
