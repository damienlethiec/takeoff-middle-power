// Player strategies for the balance simulation (scripts/sim.ts) and the engine tests.
// A strategy only reads what the UI shows: the hand, the gauges (estimate ± margin), the heading line,
// the threats and the advisor. Never the hidden truth or the pace.

import { TUNING } from '../src/data/tuning';
import { advisor, answerRequest, createInitialState, endRound, gauges, hand, heading, playCard, preview, request, resolveEvent, startRound, threats } from '../src/engine/index';
import { pick, randomInt, seedToRng, type RngHolder } from '../src/engine/rng';
import type { CardId, CardView, GameState, Pick, RequestView, Side } from '../src/engine/types';

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

/** An event's answer: silicon blackmail by the strategy's own rule; other choices (the chip-tool ban, the open-model
 *  ban) at random for the random player, else the first option (the cautious one). */
function eventChoice(s: GameState, strat: Strategy, r: RngHolder): string | undefined {
  const opts = s.event!.options;
  if (!opts.length) return undefined;
  if (s.event!.id === 'blackmail') return strat.blackmail(s, r);
  if (strat.name === 'random') return pick(r, opts).id;
  if (strat.name === 'passive') return opts[0].id;
  // the others keep Europe's open models when AI looks set to stall (where Europe's AI decides), else join the ban
  if (s.event!.id === 'open_ban') return heading(lite(s)).plateau ? 'keep' : 'join';
  return opts[0].id;
}

const playableIds = (s: GameState) => hand(s).filter((c) => c.playable).map((c) => c.id);

/** The state without its past rounds, for read-only views (previews, the advisor, request cards): they never read
 *  the history, and the engine clones the whole state on every call, so this keeps the simulation fast. */
const lite = (s: GameState): GameState => ({ ...s, history: [] });

export function playGame(seed: number, strat: Strategy, recent?: string[]): PlayedGame {
  const r: RngHolder = { rng: seedToRng(seed * 7919 + 13) };
  // `recent`: ids seen in the last games (the player's memory, takeoff.recent); the simulation passes none
  let s = createInitialState(seed, recent ? { recent } : {});
  const plays: CardId[] = [];
  let shortages = 0;
  let requests = 0;
  for (let guard = 0; guard < 20; guard++) {
    s = startRound(s);
    // the six months in order: requests and the event come at their time
    for (;;) {
      const q = request(lite(s));
      const evFirst = s.event && (!q || s.event.at <= q.at);
      if (evFirst) s = resolveEvent(s, eventChoice(s, strat, r));
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

/** What a request's answer would move, read from its chips (what the player sees, in words; the simulation weighs the
 *  move behind each). AI safety counts by its verified part when an answer moves it, else the claim moves it. */
function chipValue(v: RequestView, side: Side, w: { coop: number; conf: number; coh: number; ai?: number }): number {
  let x = 0;
  const chips = v[side].chips;
  // the answer card says each gauge move in words; the player weighs it by the move it stands for (chip.move)
  const verifiedChip = chips.some((c) => c.move?.key === 'margin');
  for (const c of chips) {
    if (c.move) {
      const d = c.move.delta;
      if (c.move.key === 'margin') x += d * w.conf;
      else if (c.move.key === 'cooperation') x += d * w.coop;
      else if (c.move.key === 'confidence') x += verifiedChip ? 0 : d * w.conf;
      else if (c.move.key === 'cohesion') x += d * w.coh;
      else if (c.move.key === 'aiPower') x -= d * (w.ai ?? 0.3);
      continue;
    }
    // kept from the numeric chips (byte-identical simulation): a delayed effect whose text ended on a number
    // ("Later: Social cohesion −3") matched no rule and counted for nothing; now it ends on a size word
    if (/^Later.*(a little|some|a lot)$/.test(c.text)) continue;
    const sign = c.tone === 'up' ? 1 : -1;
    if (/Real safety/.test(c.text)) x += 4 * w.conf;
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

/** How much a player counts on a card that can fail, from the words on the card (v4: never a number). */
const oddsWeight = (o: CardView['odds']) => (!o ? 1 : o.word === 'Likely to work' ? 0.85 : o.word === 'Uncertain' ? 0.6 : 0.3);

/** Requests: the answer whose visible effects help most the world it aims for. */
const thoughtfulAnswer = (s: GameState, v: RequestView): Side => {
  const { w } = thoughtfulWeights(s);
  // heading for a plateau with big labs, only an Open Europe ends well: Europe's AI weighs much more
  const labs = heading(lite(s)).world === 'plateau_labs';
  const badge = (side: Side) => (labs ? v[side].chips.reduce((x, c) => x + (/Europe’s AI → Open/.test(c.text) ? 6 : /Europe’s AI → Dependent/.test(c.text) ? -6 : 0), 0) : 0);
  return chipValue(v, 'right', w) + badge('right') > chipValue(v, 'left', w) + badge('left') ? 'right' : 'left';
};

export const thoughtful: Strategy = {
  name: 'thoughtful',
  answer: thoughtfulAnswer,
  decide: (s) => {
    const cards = hand(s).filter((c) => c.playable);
    const { w, conf, plateau } = thoughtfulWeights(s);
    const seen = threats(s).filter((t) => !t.struck && !t.prepared && t.stage >= 1);
    const ls = lite(s);
    const score = (id: CardId, option?: string) => {
      const pv = preview(ls, [{ id, ...(option ? { option } : {}) }]);
      if (!pv.ok) return -99;
      let v = 0;
      // AI safety counts by its verified part: the margin line carries it; without one, it moves with the claim
      const verifiedLine = pv.impacts.some((i) => i.key === 'margin');
      for (const i of pv.impacts) {
        const d = Number(i.after) - Number(i.before);
        if (i.key === 'cooperation') v += d * w.coop;
        else if (i.key === 'confidence') v += verifiedLine ? 0 : d * w.conf;
        else if (i.key === 'margin') v += d * w.conf;
        else if (i.key === 'cohesion') v += d * w.coh;
        else if (i.key === 'europeAi') v += (i.after === 'Open' ? 1 : -1) * (heading(s).world === 'plateau_labs' ? 8 : plateau ? 2 : 1.5);
      }
      if (id === 'alignment') v += (s.inspections >= 2 ? 4 : 1.5) * w.conf; // the card says the real gain is larger than shown, more with an accord
      if (id === 'licensing_treaty' || id === 'summit') v += 2 * w.conf; // real safety up (not shown)
      if (pv.worldAfter !== pv.worldBefore) v += pv.worldAfter === 'Pause' ? 6 : pv.worldBefore === 'Pause' ? -6 : 0; // the committee's vote, a zone
      if (id === 'flexicurity' && s.jobShocks < 2) v += 6 * w.coh; // softens the next job shock
      if (id === 'flexicurity' || id === 'cyber_shield') v -= 2;
      if (id === 'audit') v += conf.margin >= 12 ? 3 * w.conf : -1;
      if (id === 'oversight_mandate' && s.europeAi === 'dependent') v -= plateau ? 4 : 2;
      if (id === 'coalition' && s.coalition === 1) v += 3; // Influence +1 a round from level 2
      for (const t of seen) {
        const protects = t.protectedBy.includes(id) && !(id === 'coalition' && s.coalition >= 1) && !(id === 'inspections' && s.inspections >= 1);
        if (protects) v += t.stage * (t.id === 'incident' ? 2 : 4) + (t.certainty === 'likely' ? 2 : 0);
      }
      if (id === 'open_models' && seen.some((t) => t.id === 'blackmail')) v += 8;
      return v;
    };
    const options = cards.flatMap((c): { c: (typeof cards)[number]; option?: string }[] => (c.options.length ? c.options.map((o) => ({ c, option: o.id })) : [{ c }]));
    // a card that can fail is worth less: the player reads its odds in words (v4)
    const ranked = options
      .map((o) => ({ ...o, v: score(o.c.id, o.option) * oddsWeight(o.c.odds) }))
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
    for (const id of ['summit', 'attribution', 'pause_call', 'talks', 'coalition'] as CardId[]) {
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
    const a = advisor(lite(s));
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
/**
 * Saves Influence for a big burst (v4 has no cap on cards a round): plays nothing until Influence is nearly at
 * its cap, or the tipping point looks close, then plays like the thoughtful player. Answers requests the same way.
 */
export const saver: Strategy = {
  name: 'saver',
  decide: (s, r) => (s.influence >= TUNING.influence.cap - 1 || s.aiPower >= 70 || s.round >= TUNING.rounds - 1 ? thoughtful.decide(s, r) : []),
  blackmail: thoughtful.blackmail,
  answer: thoughtfulAnswer,
};

export const STRATEGIES = [passive, randomStrategy, thoughtful, cooperationOnly, homeFirst, advised, saver];
