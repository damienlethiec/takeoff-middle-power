// Shared helpers for the engine tests. Only public exports of src/engine and src/data are used,
// so these tests describe behaviour and survive internal refactors.

import * as E from '../src/engine/index';
import { pick, randomInt, seedToRng, type RngHolder } from '../src/engine/rng';
import type { CardId, GameState, RegionId } from '../src/engine/types';

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

/**
 * A state at the start of `quarter` (default 5), before startQuarter ran, with overrides.
 * Defaults keep every event quiet: tension 40, capability 20, misuse 10, concentration 50, trueAlignment 50
 * (warning shot needs capability 65, so it stays quiet too).
 */
export function craft(over: CraftOptions = {}): GameState {
  const s = E.createInitialState(over.seed ?? 42);
  return {
    ...s,
    quarter: over.quarter ?? 5,
    gauges: { ...s.gauges, ...over.gauges },
    flags: { ...s.flags, ...over.flags },
    eu: { ...s.eu, ...over.eu },
    coalition: over.coalition ?? s.coalition,
    pc: over.pc ?? 20,
    budget: over.budget ?? 20,
    takeoffSpeed: over.speed ?? 'steady',
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
// Strategies. They mirror scripts/sim.ts (which runs at import time, so it cannot be imported).
// ---------------------------------------------------------------------------

export interface Strategy {
  name: string;
  bubbles: (s: GameState, r: RngHolder) => number;
  decide: (s: GameState, r: RngHolder) => { id: CardId; option?: string } | null;
  choose: (s: GameState, r: RngHolder) => string | undefined;
}

const REGIONS: RegionId[] = ['eu', 'us', 'cn'];

export function playable(s: GameState): Set<CardId> {
  return new Set(E.cardViews(s).filter((c) => c.available && c.affordable).map((c) => c.id));
}

export const passive: Strategy = {
  name: 'passive',
  bubbles: () => 0,
  decide: () => null,
  choose: (s) => s.pendingEvent?.options[0]?.id,
};

export const randomStrategy: Strategy = {
  name: 'random',
  bubbles: (_s, r) => randomInt(r, 0, 2),
  decide: (s, r) => {
    const ok = [...playable(s)];
    if (!ok.length) return null;
    const id = pick(r, ok);
    const option = id === 'asml' ? pick(r, ['model_access', 'safety_commitment']) : undefined;
    return { id, option };
  },
  choose: (s, r) => (s.pendingEvent?.options.length ? pick(r, s.pendingEvent.options).id : undefined),
};

export const prepared: Strategy = {
  name: 'prepared',
  bubbles: (_s, r) => Math.min(2, randomInt(r, 1, 3)),
  decide: (s) => {
    const ok = playable(s);
    const g = s.gauges;
    const played = (id: CardId) => (s.cardsPlayed[id] ?? 0) > 0;
    const want = (id: CardId, cond = true) => cond && ok.has(id);
    if (s.phase === 'tipping') {
      if (want('host_verification', g.verification < 60)) return { id: 'host_verification' };
      if (want('coalition')) return { id: 'coalition' };
      return want('fund_alignment') ? { id: 'fund_alignment' } : null;
    }
    const slowWorld = s.quarter >= 6 && g.capability <= 20 + 2.5 * s.quarter;
    if (want('ai_office')) return { id: 'ai_office' };
    if (want('coalition', s.coalition === 0)) return { id: 'coalition' };
    if (want('weight_security')) return { id: 'weight_security' };
    if (want('cyber_defence', g.misuse >= 25)) return { id: 'cyber_defence' };
    if (want('host_verification', g.verification < 30)) return { id: 'host_verification' };
    if (slowWorld && want('open_models')) return { id: 'open_models' };
    if (slowWorld && want('oversight_mandate', played('open_models'))) return { id: 'oversight_mandate' };
    if (want('coalition', s.coalition < 2)) return { id: 'coalition' };
    if (want('fund_alignment', (s.cardsPlayed.fund_alignment ?? 0) < 2)) return { id: 'fund_alignment' };
    if (want('host_verification', g.verification < 50)) return { id: 'host_verification' };
    if (want('flexicurity')) return { id: 'flexicurity' };
    if (want('fund_alignment')) return { id: 'fund_alignment' };
    return null;
  },
  choose: (s) => {
    const pe = s.pendingEvent;
    if (!pe || !pe.options.length) return undefined;
    if (pe.id === 'silicon_blackmail') return 'hold_firm';
    if (pe.id === 'ransomware') return s.budget >= 2 ? 'defence_spending' : 'emergency_ban';
    return pe.options[0].id;
  },
};

export const STRATEGIES = [passive, randomStrategy, prepared];

export interface PlayedGame {
  final: GameState;
  /** Every state the game went through, in order (after each engine call). */
  trail: GameState[];
}

/** Play a whole game with a strategy, as scripts/sim.ts does. `keepTrail` records every intermediate state. */
export function playGame(seed: number, strat: Strategy, keepTrail = false): PlayedGame {
  let s = E.createInitialState(seed);
  const r: RngHolder = { rng: seedToRng(seed * 7919 + 17) };
  const trail: GameState[] = [];
  const push = (x: GameState) => {
    if (keepTrail) trail.push(x);
    return x;
  };
  push(s);
  for (let guard = 0; guard < 40; guard++) {
    s = push(E.startQuarter(s));
    const n = strat.bubbles(s, r);
    for (let i = 0; i < n; i++) s = push(E.collectBubble(s, pick(r, REGIONS)));
    if (s.pendingEvent) s = push(E.resolveEvent(s, strat.choose(s, r)));
    const d = strat.decide(s, r);
    s = push(d ? E.playCard(s, d.id, d.option).state : E.pass(s));
    const out = E.endQuarter(s);
    s = push(out.state);
    if (out.outcome === 'tipping_point') {
      const last = strat.decide(s, r);
      if (last) s = push(E.playCard(s, last.id, last.option).state);
      s = push(E.runTippingPoint(s));
      break;
    }
    if (out.outcome === 'game_over') break;
  }
  return { final: s, trail };
}

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
  if (s.phase !== 'ended') {
    add(E.situationReport(s));
    for (const c of E.cardViews(s)) add(E.previewCard(s, c.id, c.options[0]?.id));
  } else {
    add(E.debrief(s));
  }
  return out;
}
