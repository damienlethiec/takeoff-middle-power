// Shared helpers for the engine tests.

import { answerRequest, createInitialState, endRound, playCard, request, resolveEvent, startRound } from '../src/engine/index';
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

/** Start the next round, resolve its event (default choice: hold firm) and answer its requests (default: left). */
export function nextRound(s: GameState, choice = 'hold_firm', side: 'left' | 'right' = 'left'): GameState {
  let n = startRound(s);
  while (n.event) n = resolveEvent(n, n.event.options.length ? (n.event.options.some((o) => o.id === choice) ? choice : n.event.options[0].id) : undefined);
  while (request(n)) n = answerRequest(n, side).state;
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

/** A started round-1 state with plenty of Influence, for card tests. The talks arrive in round 2 since 27 Oct (round 1
 *  offers the AI safety cards only): they are added to the hand here, as the card tests expect them. */
export function fresh(seed = 1, patch: Partial<GameState> = {}): GameState {
  const s = nextRound(createInitialState(seed));
  const hand = s.hand.includes('talks') ? s.hand : (['talks', ...s.hand] as GameState['hand']);
  return { ...s, influence: 10, hand, arrivals: { talks: s.round, ...s.arrivals }, ...patch };
}

/** Play cards as if they worked (cards that can fail are tested in tests/failure.test.ts). */
export function play(s: GameState, ...picks: Pick[]): GameState {
  return picks.reduce((x, p) => playCard(x, p, { assumeSuccess: true }), s);
}

/** Answer every request still waiting this round (default: left). */
export function answerAll(s: GameState, side: 'left' | 'right' = 'left'): GameState {
  let n = s;
  while (request(n)) n = answerRequest(n, side).state;
  return n;
}
