// Shared helpers for the engine tests.

import { createInitialState, endRound, playCard, resolveEvent, startRound } from '../src/engine/index';
import type { GameState, Pick } from '../src/engine/types';
import { playGame, thoughtful, randomStrategy, passive } from '../scripts/strategies';

export { playGame, thoughtful, randomStrategy, passive };

/** Deep-freeze a state so any mutation throws. */
export function freeze<T>(x: T): T {
  if (x && typeof x === 'object') {
    Object.freeze(x);
    for (const v of Object.values(x)) freeze(v);
  }
  return x;
}

/** Start the next round and resolve its event (default choice: hold firm). */
export function nextRound(s: GameState, choice = 'hold_firm'): GameState {
  let n = startRound(s);
  if (n.event) n = resolveEvent(n, n.event.options.length ? choice : undefined);
  return n;
}

/** Play rounds without decisions until `round` has started. */
export function reachRound(seed: number, round: number): GameState {
  let s = createInitialState(seed);
  while (s.round < round) {
    s = nextRound(s);
    if (s.round < round) {
      const e = endRound(s);
      s = e.state;
      if (e.outcome === 'ended') break;
    }
  }
  return s;
}

/** A started round-1 state with plenty of Influence, for card tests. */
export function fresh(seed = 1, patch: Partial<GameState> = {}): GameState {
  const s = nextRound(createInitialState(seed));
  return { ...s, influence: 10, ...patch };
}

export function play(s: GameState, ...picks: Pick[]): GameState {
  return picks.reduce((x, p) => playCard(x, p), s);
}
