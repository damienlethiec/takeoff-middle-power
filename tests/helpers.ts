// Shared helpers for the engine tests. Only public exports of src/engine and src/data are used,
// so these tests describe behaviour and survive internal refactors.

import * as E from '../src/engine/index';
import { CARDS } from '../src/data/cards';
import type { CardId, GameState } from '../src/engine/types';

export { E };

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

export interface CraftOptions {
  quarter?: number;
  gauges?: Partial<GameState['gauges']>;
  flags?: Partial<GameState['flags']>;
  eu?: Partial<GameState['eu']>;
  coalition?: number;
  pc?: number;
  budget?: number;
  speed?: GameState['takeoffSpeed'];
  seed?: number;
  extra?: Partial<GameState>;
}

/** Every card of the deck except the context cards (which are offered by events, not unlocked). */
export const DECK: CardId[] = CARDS.filter((c) => !c.context).map((c) => c.id);

/**
 * A state at the start of `quarter` (default 5), before startQuarter ran, with overrides.
 * Defaults keep every event quiet: tension 40, capability 20, misuse 10, concentration 50, trueAlignment 50
 * (warning shot needs capability 65, so it stays quiet too). The whole deck is unlocked (a crafted mid-game
 * state); pass `extra.unlockedCards` to test the story's unlocks.
 */
export function craft(over: CraftOptions = {}): GameState {
  const s = E.createInitialState(over.seed ?? 42);
  return {
    ...s,
    quarter: over.quarter ?? 5,
    gauges: { ...s.gauges, trueAlignment: 50, ...over.gauges },
    flags: { ...s.flags, ...over.flags },
    eu: { ...s.eu, ...over.eu },
    coalition: over.coalition ?? s.coalition,
    pc: over.pc ?? 20,
    budget: over.budget ?? 20,
    takeoffSpeed: over.speed ?? 'steady',
    unlockedCards: DECK.slice(),
    ...over.extra,
  };
}

/** craft + startQuarter */
export const started = (over: CraftOptions = {}) => E.startQuarter(craft(over));

/** Sum of the visible + hidden deltas of the log entries with this id in the current quarter. */
export function logged(s: GameState, id: string, quarter = s.quarter) {
  return s.log.filter((e) => e.id === id && e.quarter === quarter);
}

export const deltaMap = (deltas: { key: string; amount: number }[]) => Object.fromEntries(deltas.map((d) => [d.key, d.amount]));

/** Advance one full quarter (pass), returning the next started quarter. */
export function nextQuarter(s: GameState): GameState {
  let t = s.pendingEvent ? E.resolveEvent(s, s.pendingEvent.options[0]?.id) : s;
  if (!t.decidedThisQuarter) t = E.pass(t);
  return E.startQuarter(E.endQuarter(t).state);
}

// ---------------------------------------------------------------------------
// Strategies: shared with scripts/sim.ts (scripts/strategies.ts), so tests and the simulation agree.
// ---------------------------------------------------------------------------

export { passive, randomStrategy, prepared, preparedTalks, preparedNoTalks, playable, playGame, STRATEGIES } from '../scripts/strategies';
export type { Strategy, PlayedGame } from '../scripts/strategies';

/** Every text the engine produces for a state: views, report, previews, news, notes, log, debrief. */
export function allTexts(s: GameState): string[] {
  const out: string[] = [];
  const add = (x: unknown) => {
    if (typeof x === 'string') out.push(x);
    else if (Array.isArray(x)) x.forEach(add);
    else if (x && typeof x === 'object') Object.values(x).forEach(add);
    else if (typeof x === 'number' && !Number.isFinite(x)) out.push(`NaN-number:${x}`);
  };
  add(s.news);
  add(s.notes);
  add(s.log);
  add(s.pendingEvent);
  add(E.gaugeViews(s));
  add(E.cardViews(s));
  add(E.forecastLine(s));
  add(E.dateLabel(s.quarter));
  // v2 views
  add(s.notices);
  add(s.concerns);
  add(s.leaLetters);
  add(E.dashboard(s));
  add(E.riskViews(s));
  add(E.advisor(s));
  add(E.trajectory(s));
  add(E.nextIncome(s));
  add(E.tip(s));
  add(E.journal(s));
  if (s.phase !== 'ended') {
    add(E.situationReport(s));
    for (const c of E.cardViews(s)) add(E.previewCard(s, c.id, c.options[0]?.id));
  } else {
    add(E.debrief(s));
  }
  return out;
}
