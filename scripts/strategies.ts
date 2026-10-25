// Player strategies shared by the balance simulation (scripts/sim.ts) and the engine tests (tests/helpers.ts).
// A strategy only reads what the UI shows: card views, public gauges, the risk track.

import { cardViews, createInitialState, startQuarter, collectBubble, resolveEvent, playCard, pass, endQuarter, runTippingPoint } from '../src/engine/index';
import { pick, randomInt, seedToRng, type RngHolder } from '../src/engine/rng';
import type { CardId, GameState, RegionId } from '../src/engine/types';

export interface Strategy {
  name: string;
  bubbles: (s: GameState, r: RngHolder) => number;
  decide: (s: GameState, r: RngHolder) => { id: CardId; option?: string } | null;
  choose: (s: GameState, r: RngHolder) => string | undefined;
  /** Cards it would like to play this quarter, best first (for the money metric). */
  wants?: (s: GameState) => CardId[];
}

const REGIONS: RegionId[] = ['eu', 'us', 'cn'];

export function playable(s: GameState): Set<CardId> {
  return new Set(cardViews(s).filter((c) => c.available && c.affordable).map((c) => c.id));
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

/**
 * A sensible player who reads the risk track: answers the risk that is coming, takes context cards while
 * they last, builds testers, partners and inspections, cools tension with talks, and in a slow world
 * protects Europe's economy. `talks: false` gives the same player without Diplomatic talks.
 */
export function preparedStrategy(opts: { talks: boolean; name: string }): Strategy {
  const wants = (s: GameState): CardId[] => {
    const g = s.gauges;
    const n = (id: CardId) => s.cardsPlayed[id] ?? 0;
    const list: [CardId, boolean][] = [];
    const add = (id: CardId, cond = true) => list.push([id, cond]);
    if (s.phase === 'tipping') {
      add('emergency_summit');
      add('host_verification', g.verification < 60);
      add('coalition');
      add('fund_alignment');
      return list.filter(([, c]) => c).map(([id]) => id);
    }
    // A slow world shows on the capability gauge: then the economy, not the tipping point, matters.
    const slowWorld = s.quarter >= 6 && g.capability <= 20 + 2.5 * s.quarter;
    add('emergency_summit');
    add('joint_attribution');
    add('ai_office');
    add('weight_security');
    add('coalition', s.coalition === 0);
    add('host_verification', g.verification < 30);
    add('cyber_defence', g.misuse >= 25);
    add('diplomatic_talks', opts.talks && g.tension >= 40);
    add('open_models', slowWorld);
    add('oversight_mandate', slowWorld && n('open_models') > 0);
    add('coalition', s.coalition < 2);
    add('fund_alignment', n('fund_alignment') < 2);
    add('flexicurity');
    add('host_verification', g.verification < 50);
    add('diplomatic_talks', opts.talks && g.tension >= 35);
    add('coalition', s.coalition < 3);
    add('fund_alignment');
    add('measure', slowWorld);
    return list.filter(([, c]) => c).map(([id]) => id);
  };
  return {
    name: opts.name,
    bubbles: (_s, r) => Math.min(2, randomInt(r, 1, 3)),
    wants,
    decide: (s) => {
      const ok = playable(s);
      const id = wants(s).find((x) => ok.has(x));
      return id ? { id } : null;
    },
    choose: (s) => {
      const pe = s.pendingEvent;
      if (!pe || !pe.options.length) return undefined;
      if (pe.id === 'silicon_blackmail') return 'hold_firm';
      if (pe.id === 'ransomware') return s.budget >= 2 ? 'defence_spending' : 'emergency_ban';
      return pe.options[0].id;
    },
  };
}

export const prepared = preparedStrategy({ talks: true, name: 'prepared' });
export const preparedNoTalks = preparedStrategy({ talks: false, name: 'prepared, no talks' });

export const STRATEGIES = [passive, randomStrategy, prepared];

export interface PlayedGame {
  final: GameState;
  /** Every state the game went through, in order (after each engine call). */
  trail: GameState[];
  /** Decisions taken (card ids, null for a pass), in order. */
  decisions: (CardId | null)[];
  /** Quarters where the strategy's first wanted card was available but unaffordable. */
  shortages: number;
  /** Tension when the tipping point was reached (null without one). */
  tensionAtTipping: number | null;
  /** PC after Q8's income, highest public pressure seen. */
  pcQ8: number;
  pressureMax: number;
}

/** Play a whole game with a strategy, as scripts/sim.ts does. `keepTrail` records every intermediate state. */
export function playGame(seed: number, strat: Strategy, keepTrail = false): PlayedGame {
  let s = createInitialState(seed);
  const r: RngHolder = { rng: seedToRng(seed * 7919 + 17) };
  const trail: GameState[] = [];
  const decisions: (CardId | null)[] = [];
  let shortages = 0;
  let tensionAtTipping: number | null = null;
  let pcQ8 = 0;
  let pressureMax = 0;
  const push = (x: GameState) => {
    if (keepTrail) trail.push(x);
    return x;
  };
  const shortOf = (x: GameState) => {
    if (!strat.wants) return false;
    const views = new Map(cardViews(x).map((c) => [c.id, c]));
    const first = strat.wants(x).find((id) => views.get(id)?.available);
    return !!first && !views.get(first)!.affordable;
  };
  push(s);
  for (let guard = 0; guard < 40; guard++) {
    s = push(startQuarter(s));
    if (s.quarter === 8) pcQ8 = s.pc;
    pressureMax = Math.max(pressureMax, s.gauges.publicPressure);
    const n = strat.bubbles(s, r);
    for (let i = 0; i < n; i++) s = push(collectBubble(s, pick(r, REGIONS)));
    if (s.pendingEvent) s = push(resolveEvent(s, strat.choose(s, r)));
    if (shortOf(s)) shortages++;
    const d = strat.decide(s, r);
    decisions.push(d?.id ?? null);
    s = push(d ? playCard(s, d.id, d.option).state : pass(s));
    const out = endQuarter(s);
    s = push(out.state);
    if (out.outcome === 'tipping_point') {
      tensionAtTipping = s.gauges.tension;
      const last = strat.decide(s, r);
      if (last) {
        decisions.push(last.id);
        s = push(playCard(s, last.id, last.option).state);
      }
      s = push(runTippingPoint(s));
      break;
    }
    if (out.outcome === 'game_over') break;
  }
  return { final: s, trail, decisions, shortages, tensionAtTipping, pcQ8, pressureMax };
}
