// Player strategies for the balance simulation (scripts/sim.ts) and the engine tests.
// A strategy only reads what the UI shows: the hand, the gauges (estimate ± margin), the heading line,
// the threats and the advisor. Never the hidden truth or the pace.

import { GAUGE_LABEL } from '../src/data/copy';
import { advisor, answerRequest, createInitialState, endRound, gauges, hand, heading, playCard, preview, request, resolveEvent, startRound, threats } from '../src/engine/index';
import { pick, randomInt, seedToRng, type RngHolder } from '../src/engine/rng';
import type { CardId, GameState, Pick, RequestView, Side } from '../src/engine/types';

export interface Strategy {
  name: string;
  /** Cards to play this round, in order (as many as Influence allows; the runner skips any that became unplayable). */
  decide: (s: GameState, r: RngHolder) => Pick[];
  /** Answer to silicon blackmail. */
  blackmail: (s: GameState, r: RngHolder) => 'give_in' | 'hold_firm';
  /** Answer to a request (v4). */
  answer: (s: GameState, v: RequestView, r: RngHolder) => Side;
}

export interface PlayedGame {
  final: GameState;
  plays: CardId[];
  /** Rounds where the player wanted a card but could not afford it. */
  shortages: number;
  /** Requests answered (v4). */
  requests: number;
}

const playableIds = (s: GameState) => hand(s).filter((c) => c.playable).map((c) => c.id);

export function playGame(seed: number, strat: Strategy): PlayedGame {
  const r: RngHolder = { rng: seedToRng(seed * 7919 + 13) };
  let s = createInitialState(seed);
  const plays: CardId[] = [];
  let shortages = 0;
  let requests = 0;
  for (let guard = 0; guard < 20; guard++) {
    s = startRound(s);
    // the six months in order: requests and the event come at their time
    for (;;) {
      const q = request(s);
      const evFirst = s.event && (!q || s.event.at <= q.at);
      if (evFirst) s = resolveEvent(s, s.event!.options.length ? strat.blackmail(s, r) : undefined);
      else if (q) {
        s = answerRequest(s, strat.answer(s, q, r)).state;
        requests++;
      } else break;
    }
    const want = strat.decide(s, r);
    for (const p of want) {
      const c = hand(s).find((x) => x.id === p.id);
      if (!c) continue;
      if (!c.playable) {
        if (c.reason?.startsWith('Not enough')) shortages++;
        continue;
      }
      s = playCard(s, p);
      plays.push(p.id);
    }
    const end = endRound(s);
    s = end.state;
    if (end.outcome === 'ended') break;
  }
  return { final: s, plays, shortages, requests };
}

/** What a request's answer would move, read from its chips (what the player sees). */
function chipValue(v: RequestView, side: Side, w: { coop: number; conf: number; coh: number; ai?: number }): number {
  let x = 0;
  for (const c of v[side].chips) {
    const m = /^(.+?) ([+−])(\d+)$/.exec(c.text);
    if (m) {
      const d = (m[2] === '−' ? -1 : 1) * Number(m[3]);
      if (m[1] === GAUGE_LABEL.cooperation) x += d * w.coop;
      else if (m[1] === GAUGE_LABEL.confidence) x += d * w.conf;
      else if (m[1] === GAUGE_LABEL.cohesion) x += d * w.coh;
      else if (m[1] === GAUGE_LABEL.aiPower) x -= d * (w.ai ?? 0.3);
      continue;
    }
    const sign = c.tone === 'up' ? 1 : -1;
    if (/certain/.test(c.text)) x += sign * 4 * w.conf;
    else if (/Real safety/.test(c.text)) x += 4 * w.conf;
    else if (/grows/.test(c.text)) x -= 3;
    else if (/^Later/.test(c.text)) x += sign * 2;
    else if (/Europe’s AI/.test(c.text)) x += sign * 0.5;
    else x += sign * 1.5;
  }
  return x;
}

export const passive: Strategy = {
  name: 'passive',
  decide: () => [],
  blackmail: () => 'give_in',
  answer: () => 'left',
};

export const randomStrategy: Strategy = {
  name: 'random',
  decide: (s, r) => {
    const out: Pick[] = [];
    let ids = playableIds(s);
    const n = randomInt(r, 1, 3);
    let budget = s.influence;
    for (let i = 0; i < n && ids.length; i++) {
      const id = pick(r, ids);
      const c = hand(s).find((x) => x.id === id)!;
      if (c.cost > budget) break;
      budget -= c.cost;
      out.push({ id, ...(id === 'asml' ? { option: pick(r, ['safety', 'access']) } : {}) });
      ids = ids.filter((x) => x !== id);
    }
    return out;
  },
  blackmail: (_s, r) => pick(r, ['give_in', 'hold_firm'] as const),
  answer: (_s, _v, r) => pick(r, ['left', 'right'] as const),
};

/**
 * A thoughtful player. It reads the heading line and picks the world it aims for: a Pause while Cooperation
 * is within reach, else a safe Race; in a plateau, Cohesion. It weighs every gauge by how far it is from what
 * that world needs (the low end of the Confidence band, never the truth), scores each card through the
 * public preview (before → after), adds what the card texts say (protection against a visible threat,
 * hidden safety gains, Influence lost later), and plays the best per Influence spent, as many as it can afford.
 */
/** The thoughtful player's weights: how far each gauge is from what the world it aims for needs (public values). */
function thoughtfulWeights(s: GameState) {
  const g = Object.fromEntries(gauges(s).map((x) => [x.key, x]));
  const conf = g.confidence;
  const low = conf.value - conf.margin;
  const hd = heading(s);
  const plateau = hd.world === 'plateau_open' || hd.world === 'plateau_labs';
  const coop = s.cooperation;
  const pausePath = !plateau && (coop >= 40 || hd.world === 'pause');
  const k = (x: number) => Math.max(0.05, Math.min(1.5, x));
  const w = plateau
    ? { coop: 0.05, conf: k((46 - low) / 8), coh: k((70 - s.cohesion) / 8) }
    : pausePath
      ? { coop: k((70 - coop) / 8), conf: k((71 - low) / 6), coh: k((56 - s.cohesion) / 6) }
      : { coop: k((40 - coop) / 6), conf: k((81 - low) / 6), coh: k((64 - s.cohesion) / 6) };
  return { w, conf, plateau };
}

/** Requests: the answer whose visible effects help most the world it aims for. */
const thoughtfulAnswer = (s: GameState, v: RequestView): Side => {
  const { w } = thoughtfulWeights(s);
  return chipValue(v, 'right', w) > chipValue(v, 'left', w) ? 'right' : 'left';
};

export const thoughtful: Strategy = {
  name: 'thoughtful',
  answer: thoughtfulAnswer,
  decide: (s) => {
    const cards = hand(s).filter((c) => c.playable);
    const { w, conf, plateau } = thoughtfulWeights(s);
    const seen = threats(s).filter((t) => !t.struck && !t.prepared && t.stage >= 1);
    const score = (id: CardId, option?: string) => {
      const pv = preview(s, [{ id, ...(option ? { option } : {}) }]);
      if (!pv.ok) return -99;
      let v = 0;
      for (const i of pv.impacts) {
        const d = Number(i.after) - Number(i.before);
        if (i.key === 'cooperation') v += d * w.coop;
        else if (i.key === 'confidence') v += d * w.conf;
        else if (i.key === 'margin') v -= d * w.conf;
        else if (i.key === 'cohesion') v += d * w.coh;
        else if (i.key === 'europeAi') v += (i.after === 'Open' ? 1 : -1) * (plateau ? 4 : 0.5);
      }
      if (id === 'alignment') v += 4 * w.conf; // the card says the real gain is larger than shown
      if (id === 'flexicurity' && s.jobShocks < 2) v += 6 * w.coh; // softens the next job shock
      if (id === 'flexicurity' || id === 'cyber_shield') v -= 2;
      if (id === 'audit') v += conf.margin >= 12 ? 3 * w.conf : -1;
      if (id === 'oversight_mandate' && s.europeAi === 'dependent') v -= plateau ? 4 : 2;
      if (id === 'coalition' && s.coalition === 1) v += 3; // Influence +1 a round from level 2
      for (const t of seen) {
        const protects = t.protectedBy.includes(id) && !(id === 'coalition' && s.coalition >= 1) && !(id === 'inspections' && s.inspections >= 2);
        if (protects) v += t.stage * (t.id === 'incident' ? 2 : 4) + (t.certainty === 'likely' ? 2 : 0);
      }
      if (id === 'open_models' && seen.some((t) => t.id === 'blackmail')) v += 8;
      return v;
    };
    const options = cards.flatMap((c): { c: (typeof cards)[number]; option?: string }[] => (c.options.length ? c.options.map((o) => ({ c, option: o.id })) : [{ c }]));
    const ranked = options
      .map((o) => ({ ...o, v: score(o.c.id, o.option) }))
      .filter((o) => o.v > 1.5)
      .sort((a, b) => b.v / b.c.cost - a.v / a.c.cost);
    const out: Pick[] = [];
    let budget = s.influence;
    for (const o of ranked) {
      if (out.some((x) => x.id === o.c.id) || o.c.cost > budget) continue;
      out.push({ id: o.c.id, ...(o.option ? { option: o.option } : {}) });
      budget -= o.c.cost;
    }
    return out;
  },
  blackmail: (s) => (s.cohesion >= 60 ? 'hold_firm' : 'give_in'),
};

/** Only diplomacy: talks, the coalition and the two opportunities. */
export const cooperationOnly: Strategy = {
  name: 'cooperation-only',
  decide: (s) => {
    const ok = new Set(playableIds(s));
    const out: Pick[] = [];
    let budget = s.influence;
    for (const id of ['summit', 'attribution', 'talks', 'coalition'] as CardId[]) {
      const c = hand(s).find((x) => x.id === id);
      if (c && ok.has(id) && c.cost <= budget) {
        out.push({ id });
        budget -= c.cost;
      }
    }
    return out;
  },
  blackmail: () => 'hold_firm',
  answer: (_s, v) => (chipValue(v, 'right', { coop: 1, conf: 0.1, coh: 0.1 }) > chipValue(v, 'left', { coop: 1, conf: 0.1, coh: 0.1 }) ? 'right' : 'left'),
};

/** Follows the chief of staff's recommendation every round (one card). */
export const advised: Strategy = {
  name: 'advised',
  decide: (s) => {
    const a = advisor(s);
    return a.recommend ? [{ id: a.recommend, ...(a.option ? { option: a.option } : {}) }] : [];
  },
  blackmail: () => 'hold_firm',
  answer: thoughtfulAnswer,
};



/**
 * Europe first: protects against the threats it sees, then builds a society that holds (jobs, open models,
 * oversight, model access) and keeps enough Confidence for the safety net. It ignores diplomacy.
 */
export const homeFirst: Strategy = {
  name: 'home-first',
  decide: (s) => {
    const ok = new Set(playableIds(s));
    const conf = gauges(s).find((g) => g.key === 'confidence')!;
    const want: Pick[] = [];
    const add = (id: CardId, cond = true, option?: string) => {
      if (cond && ok.has(id) && !want.some((w) => w.id === id)) want.push({ id, ...(option ? { option } : {}) });
    };
    for (const t of threats(s).filter((x) => !x.struck && !x.prepared && x.stage >= 2)) for (const c of t.protectedBy) add(c, c !== 'coalition' && c !== 'inspections');
    add('flexicurity');
    add('open_models', !s.europeAiLocked);
    add('oversight_mandate', s.europeAi === 'open');
    add('asml', true, 'access');
    add('cyber_shield');
    add('ai_office', conf.margin > 8);
    add('alignment', conf.value - conf.margin < 72);
    add('inspections', conf.value - conf.margin < 68);
    const out: Pick[] = [];
    let budget = s.influence;
    for (const w of want) {
      const c = hand(s).find((x) => x.id === w.id)!;
      if (c.cost <= budget) {
        out.push(w);
        budget -= c.cost;
      }
    }
    return out;
  },
  blackmail: () => 'hold_firm',
  answer: (_s, v) => (chipValue(v, 'right', { coop: 0.05, conf: 0.4, coh: 1 }) > chipValue(v, 'left', { coop: 0.05, conf: 0.4, coh: 1 }) ? 'right' : 'left'),
};
export const STRATEGIES = [passive, randomStrategy, thoughtful, cooperationOnly, homeFirst, advised];
