// The v3 engine: pure functions over GameState. No DOM, no Math.random (the seeded RNG lives in state.rng),
// and no function mutates its input: each works on a deep copy and returns it.
// The round flow is documented at the top of api.ts; rules and numbers in docs/DEVELOPER_NOTES.md.

import { game } from '../data/basis';
import { CARD_BY_ID, CARDS, cardCost, cardUses, type CardDef } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import { REQUEST_BY_ID, REQUESTS } from '../data/requests';
import { GAUGE_LABEL, GAUGE_SUB, PACE_TEXT, STAGE_WORD, lowText, marginText, verifiedWord } from '../data/copy';
import { moveText, verifiedMoveText } from '../data/effects';
import { ENDING_BY_ID, WORLDS } from '../data/endings';
import { FRIEND_IDS, FRIENDS, letterLabel } from '../data/friends';
import { EPILOGUE_BASIS, EPILOGUES, EPILOGUES_GAVE_IN, LEA_FIRST, LEA_LATER, LEA_WORK, LETTER_BY_ID, MALIK_FIRST, MALIK_LATER, MOTHER_FIRST, MOTHER_LATER, type LetterDef } from '../data/letters';
import { LEAK_REDACTED_ADVICE, LEAKS } from '../data/leaks';
import { VOICES, WORLD_HEADLINES, type MapLine, type PublicWorld } from '../data/mapcontent';
import { MILESTONES, MILESTONE_BY_ID } from '../data/milestones';
import { EVENTS, THREAT_BY_ID, THREATS } from '../data/threats';
import { JOB_SHOCK_PLACE, SOCIAL_BY_ID, SOCIAL_EVENTS, SOCIAL_WORD, WORKER_ANSWERS, type SocialEventDef } from '../data/social';
import { TUNING as T } from '../data/tuning';
import type { EngineApi } from './api';
import { ai2027 } from '../data/basis';
import { random, randomInt, seedToRng, weightedOrder, weightedPick, type RngHolder } from './rng';
import type {
  AdvisorView,
  CommitteeVote,
  Answer,
  AnswerView,
  Basis,
  CardId,
  CardOdds,
  Condition,
  ReqEffects,
  RequestCard,
  RequestOutcome,
  RequestView,
  Side,
  CardView,
  Change,
  Chip,
  EndingId,
  EndingView,
  EventId,
  EventRecord,
  GameState,
  GaugeKey,
  GaugeView,
  HeadingView,
  Impact,
  IncomeView,
  LetterView,
  MapItem,
  MilestoneId,
  PendingEvent,
  PublicValues,
  RegionId,
  FeedItem,
  FeedRound,
  FriendEpilogue,
  FriendId,
  Pick,
  PreviewView,
  ReportView,
  RoundRecord,
  ThreatId,
  ThreatState,
  ThreatView,
  WorldId,
  Zone,
} from './types';

// ---------------------------------------------------------------- helpers

const clone = <S>(s: S): S => structuredClone(s);
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const signed = (x: number) => (x > 0 ? `+${x}` : x < 0 ? `−${Math.abs(x)}` : '0');
const THREAT_IDS: ThreatId[] = ['theft', 'opaque', 'incident', 'ransomware', 'blackmail', 'bio'];

/** The year a round falls in: rounds 1–2 are 2027, … rounds 9–10 are 2031. */
export function yearOf(round: number): number {
  return 2027 + Math.floor((Math.max(1, round) - 1) / 2);
}

export function dateLabel(round: number): string {
  const r = Math.max(1, round);
  return `${r % 2 ? 'H1' : 'H2'} ${yearOf(r)}`;
}

export function zoneOf(cooperation: number): Zone {
  return cooperation >= T.zones.pause ? 'pause' : cooperation >= T.zones.race ? 'race' : 'rupture';
}

const reached = (s: GameState, id: MilestoneId) => s.milestones.some((m) => m.id === id);
const used = (s: GameState, id: CardId) => (s.uses[id] ?? 0) > 0;

function emptyThreat(): ThreatState {
  return { stage: 0, imminentSince: null, struck: false, struckRound: null, prepared: null, choice: null };
}

/** Oversight points: what lets you read leaks. */
export function oversight(s: GameState): number {
  return (used(s, 'ai_office') ? T.oversight.aiOffice : 0) + s.inspections * T.oversight.perInspection + (used(s, 'audit') ? T.oversight.audit : 0);
}

/**
 * Keep AI safety consistent (v4: the uncertainty only goes downward). The estimate is what the labs and testers
 * report (what the labs claim); the truth is never above it and never below estimate − margin (what is verified).
 * - A hidden gain that would lift the truth above the report is capped at the report (no visible trace).
 * - A hidden loss stops at the low end (see applyFx): nothing visible moves.
 * - When oversight narrows the band past the truth, the narrowing stops short, a hidden 0–2 points below
 *   the truth, and never lower than the low end before: what you learn is real, never exact.
 */
function settleConfidence(s: GameState, before?: { estimate: number; margin: number }) {
  const c = s.confidence;
  c.estimate = clamp(Math.round(c.estimate));
  c.truth = Math.min(clamp(Math.round(c.truth)), c.estimate);
  c.margin = Math.min(c.estimate, clamp(Math.round(c.margin), T.confidence.minMargin, T.confidence.maxMargin));
  if (c.truth < c.estimate - c.margin) {
    const prevLow = before ? before.estimate - before.margin : 0;
    const cushion = Math.abs(s.seed * 31 + s.round * 7 + c.truth) % 3;
    const low = Math.max(0, Math.min(prevLow, c.truth), c.truth - cushion);
    c.margin = c.estimate - low;
  }
}

/** The low end of the AI safety band: what is verified (the truth is never lower). */
export const lowEnd = (c: { estimate: number; margin: number }) => Math.max(0, c.estimate - c.margin);

// ---------------------------------------------------------------- effects

type FxKey = 'aiPower' | 'cooperation' | 'cohesion' | 'estimate' | 'truth' | 'margin' | 'marginMul' | 'europeAi' | 'influence';
interface Fx {
  key: FxKey;
  amount: number;
  /** For europeAi: the value it becomes. */
  set?: 'open' | 'dependent';
}

interface Snapshot {
  aiPower: number;
  cooperation: number;
  estimate: number;
  margin: number;
  cohesion: number;
  europeAi: string;
  influence: number;
}
const snap = (s: GameState): Snapshot => ({
  aiPower: s.aiPower,
  cooperation: s.cooperation,
  estimate: s.confidence.estimate,
  margin: s.confidence.margin,
  cohesion: s.cohesion,
  europeAi: s.europeAi,
  influence: s.influence,
});

function applyFx(s: GameState, fx: Fx[]) {
  const before = { estimate: s.confidence.estimate, margin: s.confidence.margin };
  for (const f of fx) {
    switch (f.key) {
      case 'aiPower':
        s.aiPower = clamp(s.aiPower + f.amount);
        break;
      case 'cooperation':
        s.cooperation = clamp(s.cooperation + f.amount);
        break;
      case 'cohesion':
        s.cohesion = clamp(s.cohesion + f.amount);
        break;
      case 'estimate':
        s.confidence.estimate += f.amount;
        break;
      case 'truth': {
        // a hidden loss never pushes the truth below what the player can rule out: it stops at the low end
        const t = s.confidence.truth;
        s.confidence.truth = f.amount >= 0 ? t + f.amount : Math.max(t + f.amount, Math.min(t, lowEnd(s.confidence)));
        break;
      }
      case 'margin':
        s.confidence.margin += f.amount;
        break;
      case 'marginMul':
        s.confidence.margin *= f.amount;
        break;
      case 'europeAi':
        if (f.set && !(f.set === 'open' && s.europeAiLocked)) s.europeAi = f.set;
        break;
      case 'influence':
        s.influence = clamp(s.influence + f.amount, 0, T.influence.cap);
        break;
    }
  }
  settleConfidence(s, before);
}

/** Visible before → after lines between two snapshots (public values only). */
function impacts(a: Snapshot, b: Snapshot): Impact[] {
  const out: Impact[] = [];
  const line = (key: Impact['key'], label: string, x: number, y: number, goodUp: -1 | 0 | 1) => {
    if (x !== y) out.push({ key, label, before: String(x), after: String(y), tone: (Math.sign(y - x) * goodUp) as -1 | 0 | 1 });
  };
  line('aiPower', GAUGE_LABEL.aiPower, a.aiPower, b.aiPower, 0);
  line('cooperation', GAUGE_LABEL.cooperation, a.cooperation, b.cooperation, 1);
  line('confidence', GAUGE_LABEL.confidence, a.estimate, b.estimate, 1);
  // the uncertainty, told by what is verified (only when the uncertainty itself changes)
  if (a.margin !== b.margin)
    out.push({
      key: 'margin',
      label: `${GAUGE_LABEL.confidence}: ${verifiedWord(lowEnd(a), lowEnd(b))}`,
      before: String(lowEnd(a)),
      after: String(lowEnd(b)),
      tone: lowEnd(b) > lowEnd(a) ? 1 : lowEnd(b) < lowEnd(a) ? -1 : 0,
    });
  line('cohesion', GAUGE_LABEL.cohesion, a.cohesion, b.cohesion, 1);
  if (a.europeAi !== b.europeAi)
    out.push({ key: 'europeAi', label: 'Europe’s AI', before: cap(a.europeAi), after: cap(b.europeAi), tone: b.europeAi === 'open' ? 1 : -1 });
  line('influence', 'Influence', a.influence, b.influence, 1);
  return out;
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Record the visible moves between two snapshots as changes with a cause (for the report). */
function recordChanges(s: GameState, a: Snapshot, b: Snapshot, cause: string, by?: Change['by']) {
  for (const i of impacts(a, b)) {
    if (i.key === 'influence') continue;
    const text = i.key === 'margin' ? marginText(lowEnd(a), lowEnd(b), a.margin, b.margin) : `${i.label} ${i.before} → ${i.after}`;
    s.changes.push({ round: s.round, key: i.key, text, cause, tone: i.tone, ...(by ? { by } : {}) });
  }
}

// ---------------------------------------------------------------- creation

export function createInitialState(seed: number, opts: { recent?: string[] } = {}): GameState {
  const h: RngHolder = { rng: seedToRng(seed) };
  const pace = weightedPick(h, T.pace.weights);
  const leakRounds: number[] = [];
  // the rounds a leak may come; each leak waits for its AI 2027 milestone, so some of these rounds stay quiet
  for (let r: number = T.leaks.firstRound; r <= T.rounds; r += randomInt(h, T.leaks.gapMin, T.leaks.gapMax)) leakRounds.push(r);
  const st = T.start;
  const s: GameState = {
    version: 3,
    seed,
    rng: h.rng,
    round: 0,
    phase: 'play',
    pace,
    aiPower: st.aiPower,
    lastRise: 0,
    cooperation: st.cooperation,
    confidence: { truth: st.truth, estimate: st.estimate, margin: st.margin },
    cohesion: st.cohesion,
    europeAi: 'dependent',
    europeAiLocked: false,
    influence: st.influence,
    coalition: 0,
    inspections: 0,
    hand: [],
    arrivals: {},
    uses: {},
    restUntil: {},
    penalties: [],
    auditUntil: 0,
    opportunities: {},
    milestones: [{ id: 'coding_automation', round: 0 }],
    threats: Object.fromEntries(THREAT_IDS.map((t) => [t, emptyThreat()])) as GameState['threats'],
    jobShocks: 0,
    event: null,
    eventNext: null,
    roundEvent: null,
    roundEvent2: null,
    headlines: [],
    voices: [],
    leak: null,
    leaks: [],
    leakRounds,
    roundStart: { aiPower: st.aiPower, cooperation: st.cooperation, estimate: st.estimate, margin: st.margin, cohesion: st.cohesion, influence: st.influence },
    changes: [],
    played: [],
    history: [],
    letters: [],
    flags: [],
    requests: { done: [], pending: [], round: [], later: [], opened: {} },
    social: { done: [], round: [] },
    tipping: null,
    recent: [...(opts.recent ?? [])],
    ending: null,
    finalCooperation: null,
    committee: null,
  };
  settleConfidence(s);
  return s;
}

// ---------------------------------------------------------------- income

export function nextIncome(s: GameState, forRound = s.round + 1): IncomeView {
  const I = T.influence;
  const reasons: string[] = [`Base ${signed(I.base)}`];
  let n = I.base;
  if (s.cohesion >= I.highCohesion) {
    n += 1;
    reasons.push('The public backs you +1');
  } else if (s.cohesion < I.lowCohesion) {
    n -= 1;
    reasons.push('Crisis at home −1');
  }
  if (s.coalition >= I.coalitionLevel) {
    n += 1;
    reasons.push('Allies share the load +1');
  }
  for (const p of s.penalties.filter((x) => x.round === forRound)) {
    n += p.amount;
    reasons.push(`${CARD_BY_ID[p.card].name} ${signed(p.amount)}`);
  }
  const floored = Math.max(I.minIncome, n);
  if (floored !== n) reasons.push(`At least ${I.minIncome}`);
  return { next: floored, reasons, cap: I.cap, nextRoundExists: s.phase === 'play' && !s.tipping && forRound <= T.rounds };
}

// ---------------------------------------------------------------- the six months of a round

function rise(s: GameState, h: RngHolder): number {
  const P = T.pace;
  const base = P.base[s.pace] * (1 + (P.accel * Math.max(0, s.aiPower - 20)) / 10);
  return Math.max(1, Math.round(base + (random(h) * 2 - 1) * P.noise));
}

function drift(s: GameState) {
  const D = T.drift;
  s.cooperation = clamp(s.cooperation + D.cooperation + (s.aiPower >= D.cooperationHighPower ? D.cooperationHigh : 0));
  s.cohesion = clamp(s.cohesion + D.cohesion + (s.aiPower >= D.cohesionHighPower ? D.cohesionHigh : 0) + (zoneOf(s.cooperation) === 'rupture' ? D.cohesionRupture : 0));
  const before = { estimate: s.confidence.estimate, margin: s.confidence.margin };
  // harder to align as AI grows: the truth slips, and everyone knows it could be lower
  if (s.aiPower >= D.truthHighPower) {
    s.confidence.truth += D.truth;
    s.confidence.margin -= D.truth;
  }
  // the labs' reports flatter: the reported value rises, nobody outside can check it, the low end stays
  s.confidence.estimate += D.labReports;
  s.confidence.margin += D.labReports;
  settleConfidence(s, before);
}

// ---------------------------------------------------------------- social cohesion (v4)

/** Protections for workers: the flexicurity reform, and the answers to requests that protect them. */
function workerProtections(s: GameState): { flexicurity: boolean; answers: number } {
  const answers = WORKER_ANSWERS.filter((w) => s.requests.done.some((d) => d.id === w.id && d.side === w.side)).length;
  return { flexicurity: used(s, 'flexicurity'), answers };
}

/** AI weighs on jobs every round, more as capabilities rise; flexicurity and worker answers soften it. */
export function jobDriftLoss(s: GameState): number {
  const J = T.jobDrift;
  const p = workerProtections(s);
  const factor = Math.max(J.minFactor, 1 - (p.flexicurity ? J.flexicurity : 0) - p.answers * J.answer);
  return Math.round(Math.max(0, Math.min(J.max, (s.aiPower - J.from) / J.per)) * factor);
}

function jobDrift(s: GameState) {
  const loss = jobDriftLoss(s);
  if (loss <= 0) return;
  const a = snap(s);
  applyFx(s, [{ key: 'cohesion', amount: -loss }]);
  recordChanges(s, a, snap(s), workerProtections(s).flexicurity ? 'AI takes over more work; retraining softens the blow' : 'AI takes over more work');
}

/** How restless Europe looks, from public values only. */
function unrest(s: GameState): number {
  const U = T.social.unrest;
  return Math.max(0, (U.cohesionCalm - s.cohesion) / U.cohesionSpan) + Math.max(0, (s.aiPower - U.aiFrom) / U.aiSpan);
}

/** The effects a social event has now (a job event is softened by the protections for workers). */
function socialFx(s: GameState, def: SocialEventDef): Fx[] {
  const S = T.social;
  const p = workerProtections(s);
  const soften = def.jobs ? ((p.flexicurity ? 1 : 0) + p.answers) * S.softenPerProtection : 0;
  return def.effects.map((e) => {
    const n = e.dir < 0 ? Math.max(1, S.size[e.size] - soften) : S.size[e.size];
    // "verified": independent checks narrow the uncertainty (settleConfidence stops it short of the truth)
    return e.gauge === 'verified' ? { key: 'margin' as const, amount: -n * e.dir } : { key: e.gauge, amount: n * e.dir };
  });
}

/**
 * This round's social events: one, sometimes two, never the same twice a game, weighted by the public state of
 * the world. They draw from their own seeded stream (from the seed and the round), so the rest of the game's
 * draws stay as they were.
 */
function socialEvents(s: GameState) {
  const S = T.social;
  if (s.round < S.firstRound || s.tipping) return;
  const hs: RngHolder = { rng: seedToRng(s.seed * 7919 + s.round * 104729 + 13) };
  const u = unrest(s);
  const p = workerProtections(s);
  const prot = (p.flexicurity ? 1 : 0) + p.answers;
  const n = 1 + (random(hs) < Math.min(S.secondMax, S.secondChance + u * S.secondPerUnrest) ? 1 : 0);
  const w = publicWorld(s);
  // the first comes early in the six months (before most requests and breaking news), a second later on
  const slots = n === 1 ? [0.1 + random(hs) * 0.3] : [0.08 + random(hs) * 0.17, 0.45 + random(hs) * 0.4];
  for (let i = 0; i < n; i++) {
    const pool = SOCIAL_EVENTS.filter((e) => !s.social.done.includes(e.id) && (!e.when || e.when(w)));
    if (!pool.length) return;
    const bad = (e: SocialEventDef) => e.effects.some((x) => x.dir < 0);
    const weights = Object.fromEntries(pool.map((e) => [e.id, (bad(e) ? 1 + u * S.badPerUnrest : S.goodBase + prot * S.goodPerProtection) * recentWeight(s, e.id)])) as Record<string, number>;
    const def = SOCIAL_BY_ID[weightedPick(hs, weights)];
    const a = snap(s);
    applyFx(s, socialFx(s, def));
    const b = snap(s);
    recordChanges(s, a, b, def.headline);
    s.social.done.push(def.id);
    s.social.round.push({
      id: def.id,
      at: Math.round(slots[i] * 100) / 100,
      moved: { cohesion: b.cohesion - a.cohesion, cooperation: b.cooperation - a.cooperation, estimate: b.estimate - a.estimate, margin: b.margin - a.margin },
    });
  }
}

/** Threat stages from public values; stages never go back down. */
function threatStages(s: GameState) {
  const TT = T.threats;
  const stageOf = (x: number, at: readonly number[]) => (x >= at[2] ? 3 : x >= at[1] ? 2 : x >= at[0] ? 1 : 0) as 0 | 1 | 2 | 3;
  const set = (id: ThreatId, stage: 0 | 1 | 2 | 3) => {
    const t = s.threats[id];
    if (t.struck || stage <= t.stage) return;
    t.stage = stage;
    if (stage === 3) t.imminentSince = s.round;
  };
  set('theft', stageOf(s.aiPower + (50 - s.cooperation) * TT.theft.coopWeight, TT.theft.stages));
  set('opaque', stageOf(s.aiPower, TT.opaque.stages));
  // the AI incident grows once opaque reasoning is imminent: nobody can read what the newest models think
  if (reached(s, 'superhuman_coder') || s.threats.opaque.struck || s.threats.opaque.stage >= 3) set('incident', stageOf(s.aiPower, TT.incident.stages));
  set('ransomware', stageOf(s.aiPower * TT.ransomware.powerWeight + (s.europeAi === 'open' ? TT.ransomware.openBonus : 0), TT.ransomware.stages));
  if (reached(s, 'self_improving')) set('bio', stageOf(s.aiPower + (s.europeAi === 'open' ? TT.bio.openBonus : 0), TT.bio.stages));
  const b = s.threats.blackmail;
  if (b.stage > 0 && b.stage < 3 && !b.struck && s.arrivals.oversight_mandate !== s.round) set('blackmail', (b.stage + 1) as 1 | 2 | 3);
}

/** Is this threat prepared for, right now? */
export function isPrepared(s: GameState, id: ThreatId): boolean {
  switch (id) {
    case 'theft':
      return used(s, 'weight_security');
    case 'opaque':
      return used(s, 'ai_office');
    case 'incident':
      return s.coalition >= T.threats.incident.needs.coalition && s.inspections >= T.threats.incident.needs.inspections;
    case 'ransomware':
      return used(s, 'cyber_shield') || s.flags.includes('ransomware_ready');
    case 'blackmail':
      return s.europeAi === 'open';
    case 'bio':
      return used(s, 'biosecurity');
  }
}

const ripe = (s: GameState, id: ThreatId) => {
  const t = s.threats[id];
  return !t.struck && t.stage === 3 && t.imminentSince !== null && t.imminentSince < s.round;
};

/** The next milestone in AI 2027's order. */
function nextMilestone(s: GameState) {
  return MILESTONES.find((m) => !reached(s, m.id));
}

/** Reach every non-threat milestone whose AI power has come, in order; stop at the first that is not due. */
function reachMilestones(s: GameState, out: MapItem[]) {
  for (;;) {
    const m = nextMilestone(s);
    if (!m || m.via || m.id === 'tipping_point' || s.aiPower < m.at) return;
    reach(s, m.id, out);
  }
}

function reach(s: GameState, id: MilestoneId, out: MapItem[]) {
  const m = MILESTONE_BY_ID[id];
  s.milestones.push({ id, round: s.round });
  const text = m.headlinePrepared && m.via && s.event?.id === m.via && s.event.prepared ? m.headlinePrepared : m.headline;
  out.push({ id: `m_${id}`, round: s.round, region: m.region, text, at: 0, basis: m.basis });
  if (id === 'geopolitics') fiveEyes(s, out);
  if (m.effect) {
    const a = snap(s);
    const key = m.effect.key === 'confidence' ? 'estimate' : m.effect.key;
    // a lab's claim lifts the reported value but not the low end: nobody outside checked it
    const fx: Fx[] = [{ key: key as FxKey, amount: m.effect.amount }];
    if (key === 'estimate' && m.effect.amount > 0) fx.push({ key: 'margin', amount: m.effect.amount });
    applyFx(s, fx);
    recordChanges(s, a, snap(s), m.effect.cause);
  }
}

/**
 * AI 2027, August 2027: Washington gives its Five Eyes allies privileged access to its AI. A middle-power coalition
 * that has not yet brought Canada in wavers (the UK is tempted away): Influence lost at once. Always a headline.
 */
function fiveEyes(s: GameState, out: MapItem[]) {
  out.push({
    id: 'm_five_eyes',
    round: s.round,
    region: 'us',
    text: 'Washington shares its AI secrets with London and Ottawa. Brussels is not told.',
    at: 0,
    basis: ai2027('August 2027: The Geopolitics of Superintelligence (the US will “give their Five Eyes allies useful information”)'),
  });
  const F = T.fiveEyes;
  if (s.coalition >= 1 && s.coalition < F.holds) {
    const before = s.influence;
    s.influence = clamp(s.influence + F.influence, 0, T.influence.cap);
    s.changes.push({ round: s.round, key: 'influence', text: `Influence ${before} → ${s.influence}`, cause: 'London is tempted by Washington’s offer: your coalition wavers', tone: -1 });
  }
}

/** The effects an event would have, given the state now (and the player's choice for silicon blackmail). */
function eventFx(s: GameState, id: EventId, choice?: string | null): Fx[] {
  const TT = T.threats;
  const prepared = eventPrepared(s, id);
  switch (id) {
    case 'theft':
      return prepared
        ? [
            { key: 'aiPower', amount: TT.theft.prepared.aiPower },
            { key: 'cooperation', amount: TT.theft.prepared.cooperation },
          ]
        : [
            { key: 'aiPower', amount: TT.theft.unprepared.aiPower },
            { key: 'cooperation', amount: TT.theft.unprepared.cooperation },
          ];
    case 'opaque':
      return [{ key: 'marginMul', amount: prepared ? TT.opaque.preparedFactor : TT.opaque.marginFactor }];
    case 'incident':
      return prepared
        ? [{ key: 'cooperation', amount: TT.incident.prepared.cooperation }]
        : [
            { key: 'estimate', amount: TT.incident.unprepared.estimate },
            { key: 'cohesion', amount: TT.incident.unprepared.cohesion },
            { key: 'cooperation', amount: TT.incident.unprepared.cooperation },
          ];
    case 'ransomware':
      return [{ key: 'cohesion', amount: prepared ? TT.ransomware.prepared.cohesion : TT.ransomware.unprepared.cohesion }];
    case 'blackmail':
      if (prepared) return [];
      return choice === 'give_in' ? [{ key: 'europeAi', amount: 0, set: 'dependent' }] : [{ key: 'cohesion', amount: TT.blackmail.holdFirm.cohesion }];
    case 'job_shock_1':
    case 'job_shock_2':
      return [{ key: 'cohesion', amount: prepared ? T.jobShocks.softened : T.jobShocks.hit }];
    case 'memo':
      return [{ key: 'cohesion', amount: T.memo.cohesion }, ...(prepared ? [] : [{ key: 'margin' as const, amount: T.memo.obsoleteMargin }])];
    case 'bio':
      return [{ key: 'cohesion', amount: prepared ? TT.bio.prepared.cohesion : TT.bio.unprepared.cohesion }];
    case 'chip_ban':
      // protesting costs a threat (resolveEvent), complying costs exports and Beijing's goodwill
      return choice === 'protest' ? [] : [
        { key: 'cohesion', amount: E.chipBan.comply.cohesion },
        { key: 'cooperation', amount: E.chipBan.comply.cooperation },
      ];
    case 'taiwan':
      return [
        { key: 'cooperation', amount: E.taiwan.cooperation },
        { key: 'cohesion', amount: E.taiwan.cohesion },
        { key: 'aiPower', amount: E.taiwan.aiPower },
      ];
    case 'open_ban':
      return choice === 'keep'
        ? [{ key: 'cooperation', amount: E.openBan.keep.cooperation }]
        : [
            { key: 'europeAi', amount: 0, set: 'dependent' },
            { key: 'cohesion', amount: E.openBan.join.cohesion },
          ];
  }
}

const E = T.events;

const isThreat = (id: EventId): id is ThreatId => (THREAT_IDS as string[]).includes(id);

/** Was Europe prepared for this event? Threats by their protection, job shocks by flexicurity, the memo by an
 *  inspection accord (Europe's testers had seen the newest models). */
function eventPrepared(s: GameState, id: EventId): boolean {
  if (isThreat(id)) return isPrepared(s, id);
  if (id === 'memo') return s.inspections >= T.memo.seesFrontier;
  if (id === 'job_shock_1' || id === 'job_shock_2') return used(s, 'flexicurity');
  return false;
}

/** Events nobody can prepare for (a choice, or a crisis that simply happens) show no "prepared" line. */
const NO_PREP: EventId[] = ['chip_ban', 'taiwan', 'open_ban'];

/** The cards that prepare Europe for an event (or would have). */
function eventPreparedBy(id: EventId): CardId[] {
  if (isThreat(id)) return THREAT_BY_ID[id].protectedBy;
  if (id === 'memo') return ['inspections'];
  if (id === 'job_shock_1' || id === 'job_shock_2') return ['flexicurity'];
  return [];
}

/** The two answers of an event that asks for a choice, with what each does (from TUNING). */
function eventOptions(s: GameState, id: EventId, prepared: boolean): { id: string; label: string; detail: string }[] {
  const ch = (x: number) => signed(x);
  if (id === 'blackmail' && !prepared)
    return [
      { id: 'give_in', label: 'Give in', detail: 'Drop the rules that angered them. Europe’s AI is locked to Dependent: you can no longer fund open models.' },
      { id: 'hold_firm', label: 'Hold firm', detail: `Keep the rules and ride out the disruption as services go dark: ${GAUGE_LABEL.cohesion} ${ch(T.threats.blackmail.holdFirm.cohesion)}.` },
    ];
  if (id === 'chip_ban')
    return [
      { id: 'comply', label: 'Comply', detail: `Toolmakers lose their Chinese orders and Beijing sees Europe join the blockade: ${GAUGE_LABEL.cohesion} ${ch(E.chipBan.comply.cohesion)}, ${GAUGE_LABEL.cooperation} ${ch(E.chipBan.comply.cooperation)}.` },
      {
        id: 'protest',
        label: 'Protest',
        detail: s.europeAi === 'open' ? 'Washington threatens to withdraw American AI from Europe; Europe’s own open models blunt the threat.' : 'Washington threatens to withdraw American AI from Europe: the silicon blackmail threat grows.',
      },
    ];
  if (id === 'open_ban')
    return [
      { id: 'join', label: 'Join the ban', detail: `Europe stops publishing large open models. Europe’s AI turns Dependent; open developers leave: ${GAUGE_LABEL.cohesion} ${ch(E.openBan.join.cohesion)}.` },
      { id: 'keep', label: 'Keep them open', detail: `Washington and Beijing call Europe the leak: ${GAUGE_LABEL.cooperation} ${ch(E.openBan.keep.cooperation)}, and the ransomware threat grows.` },
    ];
  return [];
}

function buildEvent(s: GameState, id: EventId, h: RngHolder | null, at?: number): PendingEvent {
  const def = EVENTS[id];
  const prepared = eventPrepared(s, id);
  const preparedBy = eventPreparedBy(id);
  const after = clone(s);
  applyFx(after, eventFx(s, id, 'hold_firm'));
  const options = eventOptions(s, id, prepared);
  const noPrep = NO_PREP.includes(id);
  return {
    id,
    round: s.round,
    at: at ?? 0.35 + random(h!) * 0.3,
    region: def.region,
    title: prepared && def.titlePrepared ? def.titlePrepared : def.title,
    headline: prepared && def.headlinePrepared ? def.headlinePrepared : def.headline,
    scene: prepared ? def.scene.prepared : def.scene.unprepared,
    prepared: noPrep ? null : prepared,
    preparedBy,
    preparedText: noPrep ? '' : prepared ? def.preparedText : def.unpreparedText,
    impacts: options.length ? [] : impacts(snap(s), snap(after)),
    options,
    fact: def.fact,
    basis: def.basis,
  };
}

/** Pick this round's event, if any: AI 2027 milestones first, then the memo, job shocks and crises, then the other
 *  threats. */
function chooseEvent(s: GameState, h: RngHolder): EventId | null {
  const next = nextMilestone(s);
  if (next?.via && ripe(s, next.via)) return next.via;
  // AI 2027's turning point: the misalignment memo leaks, at the latest in the tipping point's round
  if (!s.flags.includes('memo_public') && reached(s, 'geopolitics') && s.aiPower >= T.memo.at) return 'memo';
  const J = T.jobShocks.at;
  if (s.jobShocks === 0 && s.aiPower >= J[0] && reached(s, 'ai_takes_jobs')) return 'job_shock_1';
  if (s.jobShocks === 1 && s.aiPower >= J[1] && reached(s, 'cheap_remote_worker')) return 'job_shock_2';
  const crisis = crisisEvent(s);
  if (crisis) return crisis;
  return threatEvent(s, h);
}

/** A threat that is due and not a milestone of AI 2027: the AI incident (CFG's warning shot) first, then bioweapon
 *  uplift (each with a chance a round), silicon blackmail, ransomware. */
function threatEvent(s: GameState, h: RngHolder): ThreatId | null {
  if (ripe(s, 'incident') && random(h) < incidentChance(s)) return 'incident';
  if (ripe(s, 'bio') && random(h) < T.threats.bio.chance) return 'bio';
  if (ripe(s, 'blackmail')) return 'blackmail';
  if (ripe(s, 'ransomware')) return 'ransomware';
  return null;
}

/** The round's second Breaking news (v4, 27 Oct): when a scenario event (a milestone's threat, the memo, a job shock,
 *  a crisis) took the slot, the AI incident or bioweapon uplift may still strike (each with its chance), so the
 *  crowded late rounds never starve the scenarios' warning shots. Silicon blackmail and ransomware keep waiting for
 *  a free slot. */
function secondEvent(s: GameState, first: EventId, h: RngHolder): EventId | null {
  if (T.breaking.max < 2 || (THREAT_IDS as EventId[]).includes(first) && !MILESTONES.some((m) => m.via === first)) return null;
  if (ripe(s, 'incident') && random(h) < incidentChance(s)) return 'incident';
  if (ripe(s, 'bio') && random(h) < T.threats.bio.chance) return 'bio';
  return null;
}

/** The AI incident's chance a round once imminent: higher when the true AI safety is low (CFG's warning shot). */
function incidentChance(s: GameState): number {
  const I = T.threats.incident;
  return clamp(I.chanceBase + (I.chanceCenter - s.confidence.truth) * I.chancePerPoint, I.chanceMin, I.chanceMax);
}

/** The scenarios' crises that are not threats, each once a game (checked before the AI incident's draw). */
function crisisEvent(s: GameState): EventId | null {
  const once = (id: EventId) => !s.flags.includes(`${id}_done`);
  const zone = zoneOf(s.cooperation);
  if (once('chip_ban') && (s.flags.includes('us_chip_threat') || (zone === 'rupture' && s.threats.theft.struck))) return 'chip_ban';
  if (once('taiwan') && zone === 'rupture' && s.threats.theft.struck && s.aiPower >= E.taiwan.from) return 'taiwan';
  if (once('open_ban') && s.europeAi === 'open' && zone !== 'rupture' && s.aiPower >= E.openBan.from) return 'open_ban';
  return null;
}

function publicWorld(s: GameState): PublicWorld {
  return {
    round: s.round,
    zone: zoneOf(s.cooperation),
    aiPower: s.aiPower,
    cohesion: s.cohesion,
    europeAi: s.europeAi,
    coalition: s.coalition,
    jobShocks: s.jobShocks,
    threatsSeen: THREAT_IDS.filter((t) => s.threats[t].stage > 0),
    inspections: s.inspections,
    flags: [...s.flags],
    played: CARDS.map((c) => c.id).filter((id) => used(s, id)),
    struck: THREAT_IDS.filter((t) => s.threats[t].struck),
    prepared: THREAT_IDS.filter((t) => s.threats[t].struck && !!s.threats[t].prepared),
    milestones: s.milestones.map((m) => m.id),
    answers: Object.fromEntries(s.requests.done.map((d) => [d.id, d.side])),
  };
}

/** The draw weight of an item seen in the player's last two games (never 0), else 1. */
const recentWeight = (s: GameState, id: string) => (s.recent?.includes(id) ? T.news.recentWeight : 1);

/**
 * This round's candidate headlines or voices, in the order to use them: never one already used this game; lines
 * that echo the player's decisions first (a few a game), then a weighted random order where the lines seen in the
 * last two games weigh less. Drawn from their own seeded stream, so news never shifts the game's other draws.
 */
function newsOrder(s: GameState, pool: MapLine[], kind: 'headlines' | 'voices', h: RngHolder): MapLine[] {
  const used = new Set([...s.history.flatMap((r) => r[kind].map((x) => x.id)), ...s[kind].map((x) => x.id)]);
  const echoed = s.history.flatMap((r) => r[kind]).filter((x) => pool.some((l) => l.id === x.id && l.echo)).length;
  const w = publicWorld(s);
  const order = weightedOrder(
    h,
    pool.filter((l) => !used.has(l.id) && (!l.when || l.when(w))),
    (l) => recentWeight(s, l.id),
  );
  const first = order.filter((l) => l.echo).slice(0, Math.max(0, (kind === 'voices' ? T.news.echoVoices : T.news.echoHeadlines) - echoed));
  return [...first, ...order.filter((l) => !first.includes(l))];
}

function arrive(s: GameState) {
  const add = (id: CardId) => {
    if (s.hand.includes(id)) return;
    s.hand.push(id);
    s.arrivals[id] = s.round;
  };
  for (const c of CARDS) {
    if ((s.uses[c.id] ?? 0) >= cardUses(c.id)) continue;
    const a = c.arrives;
    if ('opportunity' in a) continue;
    if (s.arrivals[c.id] !== undefined) continue;
    if (
      ('round' in a && s.round >= a.round) ||
      ('aiPower' in a && s.aiPower >= a.aiPower) ||
      ('threatSeen' in a && s.threats[a.threatSeen].stage > 0) ||
      ('jobShock' in a && s.jobShocks >= a.jobShock) ||
      ('milestone' in a && reached(s, a.milestone)) ||
      ('pauseDeal' in a && zoneOf(s.cooperation) === 'pause' && (used(s, 'summit') || s.inspections >= 2))
    )
      add(c.id);
  }
}

/** The friend's letter that opens this round, if the schedule has one. The pool depends on public values only
 *  (never the true AI safety or the pace); the variant is drawn from a generator derived from the seed and the
 *  round, so letters never shift the game's own random draws. */
function letterFor(s: GameState): LetterDef | null {
  const L = T.letters;
  const at = L.schedule.findIndex((x) => x.round === s.round);
  if (at < 0) return null;
  const friend = L.schedule[at].friend;
  const nth = L.schedule.slice(0, at).filter((x) => x.friend === friend).length;
  const h: RngHolder = { rng: seedToRng((s.seed >>> 0) ^ Math.imul(s.round, 0x9e3779b1)) };
  // a variant seen in the last two games weighs less (with no memory this is the plain uniform draw it always was)
  const pick = (_: RngHolder, pool: LetterDef[]) => pool[Number(weightedPick(h, Object.fromEntries(pool.map((l, i) => [String(i), recentWeight(s, l.id)]))))];
  const verified = lowEnd(s.confidence);
  if (friend === 'lea') {
    if (nth === 0) return pick(h, LEA_FIRST);
    if (nth === 1) return pick(h, s.jobShocks > 0 || s.cohesion < L.leaHard ? LEA_WORK.hard : LEA_WORK.calm);
    return pick(h, used(s, 'flexicurity') ? LEA_LATER.retrained : zoneOf(s.cooperation) === 'rupture' ? LEA_LATER.rupture : s.cohesion >= L.leaHolding ? LEA_LATER.holding : LEA_LATER.breaking);
  }
  if (friend === 'malik') {
    if (nth === 0) return pick(h, s.cooperation < L.malikTense ? MALIK_FIRST.tense : MALIK_FIRST.excited);
    const pool =
      s.cooperation < L.malikRupture
        ? MALIK_LATER.rupture
        : zoneOf(s.cooperation) === 'pause'
          ? MALIK_LATER.pause
          : s.europeAi === 'open'
            ? MALIK_LATER.home
            : reached(s, 'self_improving')
              ? MALIK_LATER.inside
              : MALIK_LATER.race;
    return pick(h, pool);
  }
  if (nth === 0) return pick(h, verified < L.motherDoubt ? MOTHER_FIRST.doubt : MOTHER_FIRST.trust);
  const pool =
    verified < L.motherNearMiss && reached(s, 'alignment_inconclusive') ? MOTHER_LATER.nearMiss : verified >= L.motherChecked ? MOTHER_LATER.checked : MOTHER_LATER.uneasy;
  return pick(h, pool);
}

export function startRound(state: GameState): GameState {
  if (state.phase !== 'play') throw new Error('the game is over');
  if (state.event) throw new Error('resolve the event first');
  const s = clone(state);
  const h: RngHolder = { rng: s.rng };
  s.round += 1;
  s.changes = [];
  s.played = [];
  s.headlines = [];
  s.voices = [];
  s.leak = null;
  s.roundEvent = null;
  s.roundEvent2 = null;
  s.eventNext = null;
  s.requests = { ...s.requests, pending: [], round: [] };
  s.social = { done: [...(s.social?.done ?? [])], round: [] };
  // opportunities expire
  for (const [id, until] of Object.entries(s.opportunities) as [CardId, number][]) {
    if (until < s.round) {
      delete s.opportunities[id];
      s.hand = s.hand.filter((c) => c !== id);
    }
  }
  // 1. Influence arrives
  const inc = nextIncome(s, s.round);
  s.influence = Math.min(T.influence.cap, s.influence + inc.next);
  s.roundStart = { aiPower: s.aiPower, cooperation: s.cooperation, estimate: s.confidence.estimate, margin: s.confidence.margin, cohesion: s.cohesion, influence: s.influence };
  // delayed consequences of earlier answers
  for (const l of s.requests.later.filter((x) => x.round === s.round)) {
    const a = snap(s);
    applyFx(s, reqFx(l.effects));
    recordChanges(s, a, snap(s), l.why);
  }
  s.requests.later = s.requests.later.filter((x) => x.round > s.round);

  // 2. six months: AI power rises, the race heats up, the labs report
  const r = rise(s, h);
  s.aiPower = clamp(s.aiPower + r);
  drift(s);
  jobDrift(s);
  const lines: MapItem[] = [];
  reachMilestones(s, lines);
  const stagesBefore = Object.fromEntries(THREAT_IDS.map((t) => [t, s.threats[t].stage]));
  threatStages(s);

  // 3. the round's event, if any (a threat that strikes may be an AI 2027 milestone)
  const evId = chooseEvent(s, h);
  if (evId) {
    s.event = buildEvent(s, evId, h);
    const second = secondEvent(s, evId, h);
    if (second) s.eventNext = { id: second, at: Math.min(T.breaking.latest, Math.round((s.event.at + T.breaking.gap) * 100) / 100) };
    const m = MILESTONES.find((x) => x.via === evId);
    if (m) {
      reach(s, m.id, lines);
      reachMilestones(s, lines);
    }
  }

  // 4. the tipping point: never before round 6, never before AI 2027's earlier steps
  const ready = s.round >= T.earliestTipping && reached(s, 'geopolitics');
  if (s.aiPower >= T.tippingAt) {
    if (ready) {
      s.tipping = { round: s.round };
      reach(s, 'tipping_point', lines);
    } else s.aiPower = T.tippingAt - 1;
  }
  s.lastRise = s.aiPower - s.roundStart.aiPower;

  // threat stages that moved get a headline
  for (const t of THREAT_IDS) {
    const st = s.threats[t].stage;
    if (st > stagesBefore[t] && st > 0) {
      const def = THREAT_BY_ID[t];
      s.changes.push({ round: s.round, key: 'threat', text: `${def.name}: ${STAGE_WORD[st as 1 | 2 | 3]}`, cause: def.stageHeadlines[st - 1], tone: -1 });
      lines.push({ id: `t_${t}_${st}`, round: s.round, region: def.region, text: def.stageHeadlines[st - 1], at: 0, basis: def.basis });
    }
  }

  // social events in European cities: strikes, protests, scandals, good news (v4)
  socialEvents(s);

  // 5. map content: milestone headlines first, threat headlines next, a world headline when there is room
  const milestoneLines = lines.filter((l) => l.id.startsWith('m_'));
  const threatLines = lines.filter((l) => l.id.startsWith('t_'));
  const heads = [...milestoneLines, ...threatLines.slice(0, Math.max(0, 2 - milestoneLines.length))];
  // headlines and voices draw from their own stream (from the seed and the round): the game's other draws never depend on them
  const hn: RngHolder = { rng: seedToRng(s.seed * 6007 + s.round * 9973 + 5) };
  if (heads.length < 2) {
    const pool = newsOrder(s, WORLD_HEADLINES, 'headlines', hn);
    for (const l of pool.slice(0, heads.length ? 1 : 2 - heads.length)) heads.push({ id: l.id, round: s.round, region: l.region, text: l.text, at: 0, basis: l.basis });
  }
  const slots = [0.12, 0.42, 0.72, 0.85, 0.92];
  s.headlines = heads.map((x, i) => ({ ...x, at: slots[Math.min(i, slots.length - 1)] }));
  // one voice (two from AI capabilities 40): Europe first, then every other round a voice from elsewhere; a voice
  // that echoes the player's decisions takes the first place
  const vpool = newsOrder(s, VOICES, 'voices', hn);
  const nv = s.aiPower >= 40 ? 2 : 1;
  const voices: MapLine[] = [];
  const take = (l: MapLine | undefined) => {
    if (l && !voices.includes(l)) voices.push(l);
  };
  if (vpool[0]?.echo) take(vpool[0]);
  const eu = () => vpool.find((v) => v.region === 'eu' && !voices.includes(v));
  const other = () => vpool.find((v) => v.region !== 'eu' && !voices.includes(v));
  if (!voices.length) take(eu() ?? other());
  if (nv > 1) take((s.round % 2 ? other() : eu()) ?? other() ?? eu());
  s.voices = voices.map((v, i) => ({ id: v.id, round: s.round, region: v.region, text: v.text, at: 0.27 + i * 0.33, basis: v.basis, ...(v.place ? { place: v.place } : {}) }));

  // 6. a leak, every two or three rounds
  const nextLeak = LEAKS[s.leaks.length];
  if (s.leakRounds.includes(s.round) && nextLeak && reached(s, nextLeak.after)) {
    const i = s.leaks.length;
    const def = nextLeak;
    const level: number = T.leaks.levels[i] ?? 3;
    const over = s.confidence.estimate - s.confidence.truth >= T.overconfidentGap;
    s.leak = {
      id: def.id,
      round: s.round,
      at: 0.55,
      level,
      readable: oversight(s) >= level,
      text: `${def.from}: ${over ? def.overconfident : def.honest}`,
      advice: over ? def.advice.overconfident : def.advice.honest,
      basis: def.basis,
    };
    s.leaks.push(s.leak);
  }

  // 7. a friend's letter (no effect on the gauges, no draw from the game's generator). Léa's letters used to draw
  // from it at these rounds: the same draws are kept so that every seeded game plays exactly as before.
  if (T.letters.legacyDraws.includes(s.round)) random(h);
  const letter = letterFor(s);
  if (letter) s.letters.push({ slot: `r${s.round}`, round: s.round, id: letter.id, friend: letter.friend });

  // 8. cards that arrive now
  arrive(s);

  // 9. requests: characters who arrive during the six months (v4)
  const reqs = chooseRequests(s, h);
  // with two Breaking news, the request comes first, early in the six months (chooseRequests keeps one)
  const base0 = s.eventNext ? T.breaking.requestAt : s.event ? (s.event.at < 0.5 ? 0.74 : 0.2) : 0.25 + random(h) * 0.4;
  reqs.forEach((r, i) => {
    const at = Math.min(0.92, base0 + i * 0.12);
    s.requests.pending.push({ id: r.id, at });
    s.requests.round.push({ id: r.id, at, side: null });
  });
  s.rng = h.rng;
  return s;
}

// ---------------------------------------------------------------- requests (v4)

function reqFx(e: ReqEffects): Fx[] {
  const fx: Fx[] = [];
  if (e.ai) fx.push({ key: 'aiPower', amount: e.ai });
  if (e.coop) fx.push({ key: 'cooperation', amount: e.coop });
  if (e.conf) fx.push({ key: 'estimate', amount: e.conf });
  if (e.truth) fx.push({ key: 'truth', amount: e.truth });
  if (e.margin) fx.push({ key: 'margin', amount: e.margin });
  if (e.cohesion) fx.push({ key: 'cohesion', amount: e.cohesion });
  if (e.influence) fx.push({ key: 'influence', amount: e.influence });
  return fx;
}

/** Does a request's condition hold now? */
export function holds(s: GameState, c?: Condition): boolean {
  if (!c) return true;
  const ok = (x: number | undefined, test: (x: number) => boolean) => x === undefined || test(x);
  if (!ok(c.minRound, (x) => s.round >= x) || !ok(c.maxRound, (x) => s.round <= x)) return false;
  if (!ok(c.minAi, (x) => s.aiPower >= x) || !ok(c.maxAi, (x) => s.aiPower <= x)) return false;
  if (!ok(c.minCoop, (x) => s.cooperation >= x) || !ok(c.maxCoop, (x) => s.cooperation <= x)) return false;
  if (!ok(c.minCohesion, (x) => s.cohesion >= x) || !ok(c.maxCohesion, (x) => s.cohesion <= x)) return false;
  if (c.milestone && !reached(s, c.milestone)) return false;
  if (c.beforeMilestone && reached(s, c.beforeMilestone)) return false;
  if (c.flags && !c.flags.every((f) => s.flags.includes(f))) return false;
  if (c.notFlags && c.notFlags.some((f) => s.flags.includes(f))) return false;
  if (c.badge && s.europeAi !== c.badge) return false;
  if (!ok(c.minCoalition, (x) => s.coalition >= x) || !ok(c.maxCoalition, (x) => s.coalition <= x)) return false;
  if (!ok(c.minInspections, (x) => s.inspections >= x) || !ok(c.maxInspections, (x) => s.inspections <= x)) return false;
  if (c.threat) {
    const t = s.threats[c.threat.id];
    if (c.threat.minStage !== undefined && t.stage < c.threat.minStage) return false;
    if (c.threat.maxStage !== undefined && t.stage > c.threat.maxStage) return false;
    if (c.threat.struck !== undefined && t.struck !== c.threat.struck) return false;
    if (c.threat.prepared !== undefined && (t.struck ? !!t.prepared : isPrepared(s, c.threat.id)) !== c.threat.prepared) return false;
  }
  return true;
}

/** Is this request's threat growing and Europe not ready for it? */
const preparesNow = (s: GameState, r: RequestCard) => !!r.prepares && s.threats[r.prepares].stage >= 1 && !s.threats[r.prepares].struck && !isPrepared(s, r.prepares);

/**
 * This round's requests: a follow-up when one is due, then at most one other, chosen first among those tied to
 * a milestone reached this round or a threat growing now, else at random among the eligible ones (so each game
 * differs). Rounds without a request stay common; the count is kept between 6 and 10 a game.
 */
function chooseRequests(s: GameState, h: RngHolder): RequestCard[] {
  const R = T.requests;
  if (s.round < R.firstRound) return [];
  const answered = new Set(s.requests.done.map((d) => d.id));
  // never a request that would prepare for the threat striking this very round
  const elig = REQUESTS.filter((r) => !answered.has(r.id) && holds(s, r.when) && !(s.event && r.prepares === s.event.id) && !(s.eventNext && r.prepares === s.eventNext.id));
  for (const r of elig) if (r.opportunity && s.requests.opened[r.id] === undefined) s.requests.opened[r.id] = s.round;
  const open = elig.filter((r) => !r.opportunity || s.round - s.requests.opened[r.id] < r.opportunity.window);
  const total = s.requests.done.length;
  const out: RequestCard[] = [];
  const follow = open.filter((r) => r.followup);
  if (follow.length && total < R.maxPerGame) out.push(follow[0]);
  const regular = open.filter((r) => !r.followup);
  // two Breaking news this round: fewer interruptions (one request at most)
  const most = s.eventNext ? T.breaking.requestsWithTwo : Infinity;
  if (!regular.length || total + out.length >= R.maxPerGame || out.length >= most) return out;
  const fresh = new Set(s.milestones.filter((m) => m.round === s.round).map((m) => m.id));
  const priority = regular.filter((r) => preparesNow(s, r) || (r.priority !== false && r.when?.milestone !== undefined && fresh.has(r.when.milestone)));
  const behind = total + out.length < Math.floor(s.round * R.minRate);
  const roll = random(h);
  if (!priority.length && !behind && roll >= R.chance) return out;
  const pool = priority.length ? priority : regular;
  const id = weightedPick(h, Object.fromEntries(pool.map((r) => [r.id, (r.weight ?? 1) * recentWeight(s, r.id)])) as Record<string, number>);
  out.push(REQUEST_BY_ID[id]);
  return out;
}

function applyAnswer(s: GameState, a: Answer) {
  applyFx(s, [...reqFx(a.effects), ...(a.badge ? [{ key: 'europeAi' as const, amount: 0, set: a.badge }] : [])]);
  for (const f of a.set ?? []) if (!s.flags.includes(f)) s.flags.push(f);
  const level = (id: 'coalition' | 'inspections', n: number) => {
    s[id] = Math.min(cardUses(id), s[id] + n);
    s.uses[id] = Math.min(cardUses(id), (s.uses[id] ?? 0) + n);
    if ((s.uses[id] ?? 0) >= cardUses(id)) s.hand = s.hand.filter((c) => c !== id);
  };
  if (a.coalition) level('coalition', a.coalition);
  if (a.inspections) level('inspections', a.inspections);
  for (const t of a.grow ?? []) {
    const st = s.threats[t];
    if (st.struck || st.stage >= 3) continue;
    st.stage = (st.stage + 1) as 1 | 2 | 3;
    if (st.stage === 3) st.imminentSince = s.round;
  }
  if (a.later) s.requests.later.push({ round: s.round + a.later.rounds, effects: a.later.effects, why: a.later.why });
}

const answerCause = (r: RequestCard, a: Answer) => `${CHARACTERS[r.character].name}: “${a.label}”`;

/** Chips for what an answer changes, in public values only, plus what it does beyond the gauges. Before the player
 *  answers (`words`), the gauge moves read in words ("Social cohesion: down a little"); after, as numbers. */
function answerChips(before: GameState, after: GameState, a: Answer, words = false): Chip[] {
  const out: Chip[] = [];
  for (const i of impacts(snap(before), snap(after))) {
    const d = Number(i.after) - Number(i.before);
    // Influence stays a number before and after the answer (a resource, like a card's cost)
    if (i.key === 'influence') {
      out.push({ text: `Influence ${signed(d)}`, tone: d >= 0 ? 'up' : 'down', ...(words ? { move: { key: 'influence' as const, delta: d } } : {}) });
      continue;
    }
    if (i.key === 'margin') {
      out.push(words ? { text: verifiedMoveText(d), tone: d >= 0 ? 'up' : 'down', move: { key: 'margin', delta: d } } : { text: marginText(i.before, i.after), tone: d >= 0 ? 'up' : 'down' });
    }
    else if (i.key === 'europeAi') out.push({ text: `Europe’s AI → ${i.after}`, tone: i.tone > 0 ? 'up' : 'down' });
    else {
      const tone = (i.key === 'aiPower' ? d < 0 : d > 0) ? 'up' : 'down';
      out.push(words ? { text: moveText(i.label, d), tone, move: { key: i.key, delta: d } } : { text: `${i.label} ${signed(d)}`, tone });
    }
  }
  if ((a.effects.truth ?? 0) > 0) out.push({ text: 'Real safety up (not shown)', tone: 'up' });
  if (a.coalition && after.coalition > before.coalition) out.push({ text: 'A partner joins the coalition', tone: 'up' });
  if (a.inspections && after.inspections > before.inspections) out.push({ text: 'Inspections: one level up', tone: 'up' });
  for (const t of a.grow ?? []) if (!before.threats[t].struck && before.threats[t].stage < 3) out.push({ text: `${THREAT_BY_ID[t].name} grows`, tone: 'down' });
  if (a.later) {
    const e = a.later.effects;
    const mv = (label: string, x: number) => (words ? moveText(label, x) : `${label} ${signed(x)}`);
    const parts = [e.cohesion ? mv(GAUGE_LABEL.cohesion, e.cohesion) : '', e.coop ? mv(GAUGE_LABEL.cooperation, e.coop) : '', e.ai ? mv(GAUGE_LABEL.aiPower, e.ai) : '', e.margin ? `${GAUGE_LABEL.confidence}: ${e.margin > 0 ? 'less' : 'more'} verified` : '', e.conf ? mv(GAUGE_LABEL.confidence, e.conf) : '', e.influence ? `Influence ${signed(e.influence)}` : ''].filter(Boolean);
    const bad = (e.cohesion ?? 0) < 0 || (e.coop ?? 0) < 0 || (e.margin ?? 0) > 0 || (e.ai ?? 0) > 0 || (e.conf ?? 0) < 0 || (e.influence ?? 0) < 0;
    if (parts.length) out.push({ text: `Later: ${parts.join(', ')}`, tone: bad ? 'down' : 'up' });
  }
  return out;
}

function answerView(s: GameState, r: RequestCard, side: Side): AnswerView {
  const a = r[side];
  const pub = publicCopy(s);
  const after = clone(pub);
  applyAnswer(after, a);
  const chips = answerChips(pub, after, a, true);
  const w0 = heading(pub).name;
  const w1 = heading(after).name;
  return {
    side,
    label: a.label,
    chips,
    words: chips.length ? `Will change: ${chips.map((c) => c.text).join(', ')}` : 'No visible change',
    why: a.why ?? null,
    tag: a.tag ?? null,
    world: w0 !== w1 ? `${w0} → ${w1}` : null,
  };
}

export function request(s: GameState): RequestView | null {
  const p = s.requests.pending[0];
  if (!p) return null;
  const r = REQUEST_BY_ID[p.id];
  const kind: RequestView['kind'] = r.followup ? 'followup' : r.opportunity ? 'opportunity' : preparesNow(s, r) ? 'prepares' : 'request';
  return {
    id: r.id,
    character: CHARACTERS[r.character],
    text: r.text,
    kind,
    threat: r.prepares ?? null,
    threatName: r.prepares ? THREAT_BY_ID[r.prepares].name : null,
    left: answerView(s, r, 'left'),
    right: answerView(s, r, 'right'),
    learnMore: r.learnMore,
    basis: r.basis,
    at: p.at,
    index: s.requests.round.findIndex((x) => x.id === r.id) + 1,
    count: s.requests.round.length,
  };
}

export function answerRequest(state: GameState, side: Side): { state: GameState; outcome: RequestOutcome } {
  const p = state.requests.pending[0];
  if (!p) throw new Error('no request to answer');
  const s = clone(state);
  const r = REQUEST_BY_ID[p.id];
  const a = r[side];
  const before = clone(s);
  applyAnswer(s, a);
  recordChanges(s, snap(before), snap(s), answerCause(r, a), 'request');
  s.requests.pending.shift();
  s.requests.done.push({ id: r.id, round: s.round, side });
  s.requests.round = s.requests.round.map((x) => (x.id === r.id ? { ...x, side } : x));
  const pubBefore = publicCopy(before);
  const pubAfter = clone(pubBefore);
  applyAnswer(pubAfter, a);
  const notes: string[] = [];
  if (a.later) notes.push(`In ${a.later.rounds === 1 ? 'six months' : `${a.later.rounds * 6} months`}: ${a.later.why}.`);
  if (a.badge && before.europeAiLocked && a.badge === 'open') notes.push('Europe’s AI stays Dependent: Europe gave in to the labs.');
  return { state: s, outcome: { reaction: a.reaction, chips: answerChips(pubBefore, pubAfter, a), notes } };
}

/** Apply this round's event (with the player's choice for silicon blackmail). */
export function resolveEvent(state: GameState, choice?: string): GameState {
  const ev = state.event;
  if (!ev) return state;
  if (ev.options.length && !ev.options.some((o) => o.id === choice)) throw new Error(`choose one of: ${ev.options.map((o) => o.id).join(', ')}`);
  const s = clone(state);
  const a = snap(s);
  applyFx(s, eventFx(s, ev.id, choice ?? null));
  recordChanges(s, a, snap(s), ev.title);
  if (ev.id === 'job_shock_1' || ev.id === 'job_shock_2') {
    s.jobShocks += 1;
    arrive(s);
  } else if (ev.id === 'memo') {
    // the leak goes public: Washington forms the Oversight Committee, Europe may call for a pause
    if (!s.flags.includes('memo_public')) s.flags.push('memo_public');
    openOpportunity(s, 'pause_call');
  } else if (!isThreat(ev.id)) {
    // the crises that are not threats: each comes once, and the answer is remembered (flags, for the news)
    s.flags.push(`${ev.id}_done`, ...(choice ? [`${ev.id}_${choice}`] : []));
    if (ev.id === 'chip_ban' && choice === 'protest') grow(s, 'blackmail');
    if (ev.id === 'open_ban' && choice === 'keep') grow(s, 'ransomware');
  } else {
    const t = s.threats[ev.id];
    t.struck = true;
    t.struckRound = s.round;
    t.prepared = ev.prepared;
    t.choice = choice ?? null;
    if (ev.id === 'blackmail' && choice === 'give_in') {
      s.europeAiLocked = true;
      s.hand = s.hand.filter((c) => c !== 'open_models');
    }
    // opportunities born of a crisis
    if (ev.id === 'incident') openOpportunity(s, 'summit');
    if (ev.id === 'theft' && s.coalition >= 1) openOpportunity(s, 'attribution');
  }
  s.event = null;
  const rec = { id: ev.id, title: ev.title, prepared: ev.prepared, choice: choice ?? null, at: ev.at, region: ev.region };
  if (s.roundEvent) s.roundEvent2 = rec;
  else s.roundEvent = rec;
  // the round's second Breaking news, read from the state as it is now (no draw from the game's generator)
  const next = s.eventNext;
  s.eventNext = null;
  if (next && ripe(s, next.id as ThreatId)) s.event = buildEvent(s, next.id, null, next.at);
  return s;
}

/** A threat grows one stage (never past imminent, never once struck). */
function grow(s: GameState, id: ThreatId) {
  const st = s.threats[id];
  if (st.struck || st.stage >= 3) return;
  st.stage = (st.stage + 1) as 1 | 2 | 3;
  if (st.stage === 3) st.imminentSince = s.round;
}

function openOpportunity(s: GameState, id: 'summit' | 'attribution' | 'pause_call') {
  s.opportunities[id] = s.round + T.cards[id].rounds - 1;
  if (!s.hand.includes(id)) s.hand.push(id);
  s.arrivals[id] = s.round;
}

// ---------------------------------------------------------------- cards

function cardDef(id: CardId): CardDef {
  return CARD_BY_ID[id];
}

/** The superpowers let European inspectors in only after a scare or within a pause (AI 2027 keeps allies out of the
 *  loop; CFG discusses verification after the warning shot). */
const inspectionDeal = (s: GameState) => s.threats.incident.struck || used(s, 'summit') || zoneOf(s.cooperation) === 'pause';

/** The chance a card works if played now (v4: diplomatic and external cards can fail), from public values only;
 *  null for a card that always works. TUNING.failure. */
function chanceOf(s: GameState, id: CardId): number | null {
  const F = T.failure;
  const f = (F.cards as Partial<Record<CardId, { base: number; pause?: number; rupture?: number; highCohesion?: number; lowCohesion?: number; perCoalition?: number }>>)[id];
  if (!f) return null;
  // Europe's own testing of the models sold in Europe (level 1) needs nobody's consent
  if (id === 'inspections' && (s.uses.inspections ?? 0) < 1) return null;
  const z = zoneOf(s.cooperation);
  let p = f.base;
  if (z === 'pause') p += f.pause ?? 0;
  if (z === 'rupture') p += f.rupture ?? 0;
  if (s.cohesion >= F.cohesion.high) p += f.highCohesion ?? 0;
  if (s.cohesion < F.cohesion.low) p += f.lowCohesion ?? 0;
  p += (f.perCoalition ?? 0) * s.coalition;
  return Math.max(F.min, Math.min(F.max, p));
}

/** The odds in words, with what makes them easier or harder now (never a number). */
function oddsOf(s: GameState, id: CardId): CardOdds | null {
  const p = chanceOf(s, id);
  if (p === null) return null;
  const f = (T.failure.cards as Partial<Record<CardId, { pause?: number; rupture?: number; highCohesion?: number; lowCohesion?: number; perCoalition?: number }>>)[id]!;
  const z = zoneOf(s.cooperation);
  const why: string[] = [];
  if (z === 'pause' && f.pause) why.push('easier in a pause');
  if (z === 'rupture' && f.rupture) why.push('harder in a rupture');
  if (s.cohesion >= T.failure.cohesion.high && f.highCohesion) why.push('Europe holds together');
  if (s.cohesion < T.failure.cohesion.low && f.lowCohesion) why.push('Europe looks divided');
  if (s.coalition > 0 && f.perCoalition) why.push('your allies add weight');
  return { word: p >= T.failure.likely ? 'Likely to work' : p >= T.failure.uncertain ? 'Uncertain' : 'Long shot', why };
}

/** Whether a card played now works: its own seeded stream (seed, round, card), so other draws never move. */
function works(s: GameState, id: CardId): boolean {
  const p = chanceOf(s, id);
  if (p === null) return true;
  const h: RngHolder = { rng: seedToRng(s.seed * 4513 + s.round * 7907 + (CARDS.findIndex((c) => c.id === id) + 1) * 131 + (s.uses[id] ?? 0) * 17 + 3) };
  return random(h) < p;
}

/** Why a card cannot be played now, or null. */
function blocked(s: GameState, id: CardId): string | null {
  if (s.phase !== 'play') return 'The game is over.';
  if (s.event) return 'Deal with the breaking news first.';
  if (s.requests.pending.length) return 'Answer the request first.';
  if (!s.hand.includes(id)) return 'Not in your hand.';
  if ((s.uses[id] ?? 0) >= cardUses(id)) return 'Already used up.';
  if (id === 'open_models' && s.europeAiLocked) return 'Locked: Europe gave in to the labs.';
  if ((s.restUntil[id] ?? 0) >= s.round) return 'The envoys need a round of rest.';
  if (id === 'inspections' && (s.uses.inspections ?? 0) >= 1 && !inspectionDeal(s)) return 'An accord needs a deal first: an AI incident, the summit, or US–China cooperation 60+.';
  if (id === 'licensing_treaty' && zoneOf(s.cooperation) !== 'pause') return `Only in a pause: US–China cooperation ${T.zones.pause} or more.`;
  if (s.played.some((p) => p.id === id)) return 'Already played this round.';
  const cost = cardCost(id, s.uses[id] ?? 0);
  if (cost > s.influence) return `Not enough Influence: costs ${cost}, you have ${s.influence}.`;
  return null;
}

function cardFx(s: GameState, p: Pick): Fx[] {
  const C = T.cards;
  // called once the use is counted: the level just played (0 for the first)
  const level = Math.max(0, (s.uses[p.id] ?? 1) - 1);
  switch (p.id) {
    case 'talks':
      return [
        { key: 'cooperation', amount: C.talks.cooperation },
        { key: 'cohesion', amount: C.talks.cohesion },
      ];
    case 'inspections': {
      // verification is what makes a deal possible: cooperation 0 for Europe's own testing, + from the accord
      const coop = C.inspections.cooperation[Math.min(level, C.inspections.cooperation.length - 1)];
      const truth = C.inspections.truth[Math.min(level, C.inspections.truth.length - 1)];
      return [
        { key: 'margin', amount: C.inspections.margin + (used(s, 'ai_office') ? C.ai_office.inspectionsBonus : 0) },
        ...(coop ? [{ key: 'cooperation' as const, amount: coop }] : []),
        ...(truth ? [{ key: 'truth' as const, amount: truth }] : []),
      ];
    }
    case 'ai_office':
      return [
        { key: 'marginMul', amount: C.ai_office.marginFactor },
        { key: 'cohesion', amount: C.ai_office.cohesion },
      ];
    case 'alignment':
      // published research helps a little; with an inspection accord, European teams work inside the labs
      return [
        { key: 'truth', amount: C.alignment.truth + (s.inspections >= C.alignment.accessInspections ? C.alignment.accessTruth : 0) },
        { key: 'estimate', amount: C.alignment.estimate },
        { key: 'cohesion', amount: C.alignment.cohesion },
      ];
    case 'coalition':
      return [
        { key: 'cooperation', amount: C.coalition.cooperation },
        { key: 'cohesion', amount: C.coalition.cohesion },
      ];
    case 'audit':
      return [];
    case 'asml':
      return [
        p.option === 'access' ? { key: 'cohesion', amount: C.asml.access.cohesion } : { key: 'margin', amount: C.asml.safety.margin },
        { key: 'cooperation', amount: C.asml.cooperation },
      ];
    case 'weight_security':
      // only big labs can afford it, unless Europe pays for the security of the open models it funded
      return [{ key: 'cohesion', amount: C.weight_security.cohesion }, ...(used(s, 'open_models') ? [] : [{ key: 'europeAi' as const, amount: 0, set: 'dependent' as const }])];
    case 'open_models':
      return [
        { key: 'europeAi', amount: 0, set: 'open' },
        { key: 'cohesion', amount: C.open_models.cohesion },
      ];
    case 'flexicurity':
      return [{ key: 'cohesion', amount: C.flexicurity.cohesion }];
    case 'cyber_shield':
      return [{ key: 'cohesion', amount: C.cyber_shield.cohesion }];
    case 'oversight_mandate':
      // some labs withhold their newest models, open ones included (Meta, 2024): unless Europe runs models it funded
      // itself, it leans on the big labs that stay
      return [{ key: 'cohesion', amount: C.oversight_mandate.cohesion }, ...(used(s, 'open_models') ? [] : [{ key: 'europeAi' as const, amount: 0, set: 'dependent' as const }])];
    case 'cern_ai':
      return [
        { key: 'margin', amount: C.cern_ai.margin },
        { key: 'cohesion', amount: C.cern_ai.cohesion },
      ];
    case 'chip_verification':
      return [
        { key: 'cooperation', amount: C.chip_verification.cooperation },
        { key: 'margin', amount: C.chip_verification.margin },
      ];
    case 'licensing_treaty':
      // in a pause, the treaty binds both superpowers' labs: licensed, audited
      return [
        { key: 'margin', amount: C.licensing_treaty.margin },
        { key: 'truth', amount: C.licensing_treaty.truth },
        { key: 'cooperation', amount: C.licensing_treaty.cooperation },
        { key: 'cohesion', amount: C.licensing_treaty.cohesion },
      ];
    case 'biosecurity':
      return [
        { key: 'cooperation', amount: C.biosecurity.cooperation },
        { key: 'cohesion', amount: C.biosecurity.cohesion },
      ];
    case 'summit': {
      // Europe leads the summit when its testers and coalition were ready for the incident, else it follows
      const leads = !!s.threats.incident.prepared;
      return [
        { key: 'cooperation', amount: leads ? C.summit.cooperation : C.summit.cooperationFollow },
        { key: 'margin', amount: C.summit.margin },
        { key: 'truth', amount: C.summit.truth },
      ];
    }
    case 'attribution':
      return [{ key: 'cooperation', amount: C.attribution.cooperation }];
    case 'pause_call':
      return [{ key: 'cooperation', amount: C.pause_call.cooperation }];
  }
}

/**
 * Play a card. A card that can fail (TUNING.failure) works with its chance, drawn from its own seeded stream: when it
 * fails, its Influence is spent and nothing else happens (no effect, no level climbed, no blowback); it is marked
 * `failed` in `played` and the news says why. `assumeSuccess` plays it as if it worked, without drawing: previews
 * and the decision screen's affordability use it.
 */
export function playCard(state: GameState, p: Pick, opts: { assumeSuccess?: boolean } = {}): GameState {
  const why = blocked(state, p.id);
  if (why) throw new Error(`${p.id}: ${why}`);
  const def = cardDef(p.id);
  if (def.options && !def.options.some((o) => o.id === p.option)) throw new Error(`${p.id}: choose one of ${def.options.map((o) => o.id).join(', ')}`);
  const s = clone(state);
  const n = s.uses[p.id] ?? 0;
  const name = def.levels ? def.levels[n] : def.name;
  s.influence -= cardCost(p.id, n);
  if (!opts.assumeSuccess && !works(state, p.id)) {
    s.played.push({ id: p.id, ...(p.option ? { option: p.option } : {}), failed: true });
    return s;
  }
  s.uses[p.id] = n + 1;
  s.played.push({ id: p.id, ...(p.option ? { option: p.option } : {}) });
  const a = snap(s);
  applyFx(s, cardFx(s, p));
  const C = T.cards;
  switch (p.id) {
    case 'talks':
      s.restUntil.talks = s.round + C.talks.rest;
      break;
    case 'inspections':
      s.inspections += 1;
      // from the accord on, Washington and Beijing make Europe pay for letting foreigners in
      if (n >= 1) s.penalties.push({ round: s.round + 1, amount: C.inspections.influence, card: 'inspections' });
      break;
    case 'asml':
      // Washington will not let Europe set terms: it answers with its own chip-tool ban (CFG, Arms race)
      if (!s.flags.includes('us_chip_threat')) s.flags.push('us_chip_threat');
      break;
    case 'chip_verification':
      s.penalties.push({ round: s.round + 1, amount: C.chip_verification.influence, card: 'chip_verification' });
      break;
    case 'coalition':
      s.coalition += 1;
      break;
    case 'audit':
      s.auditUntil = s.round + C.audit.rounds - 1;
      s.confidence.estimate = s.confidence.truth;
      break;
    case 'flexicurity':
    case 'cyber_shield':
      for (let i = 1; i <= C[p.id].rounds; i++) s.penalties.push({ round: s.round + i, amount: C[p.id].influence, card: p.id });
      break;
    case 'pause_call':
      // Washington calls it betrayal; the call weighs on its Oversight Committee's vote
      s.penalties.push({ round: s.round + 1, amount: C.pause_call.influence, card: 'pause_call' });
      if (!s.flags.includes('pause_call')) s.flags.push('pause_call');
      delete s.opportunities.pause_call;
      break;
    case 'oversight_mandate':
      if (s.europeAi === 'dependent' && s.threats.blackmail.stage === 0 && !s.threats.blackmail.struck) s.threats.blackmail.stage = 1;
      break;
    case 'summit':
    case 'attribution':
      delete s.opportunities[p.id];
      break;
  }
  recordChanges(s, a, snap(s), name, 'card');
  // spent cards leave the hand
  if ((s.uses[p.id] ?? 0) >= cardUses(p.id)) s.hand = s.hand.filter((c) => c !== p.id);
  return s;
}

/** A card's name at its next level ("Inspection accord"), else its name. */
function cardTitle(s: GameState, id: CardId): string {
  const def = cardDef(id);
  return def.levels ? def.levels[Math.min(s.uses[id] ?? 0, def.levels.length - 1)] : def.name;
}

function cardView(s: GameState, id: CardId): CardView {
  const def = cardDef(id);
  const n = s.uses[id] ?? 0;
  const reason = blocked(s, id);
  const protects = def.protects ?? null;
  const exp = s.opportunities[id];
  return {
    id,
    name: def.name,
    title: def.levels ? def.levels[Math.min(n, def.levels.length - 1)] : def.name,
    cost: cardCost(id, n),
    text: def.text,
    proposal: def.proposal,
    example: def.example ?? null,
    costLine: def.costLine ?? null,
    ups: def.ups,
    downs: def.downs,
    protects,
    protectsName: protects ? THREAT_BY_ID[protects].name : null,
    options: def.options ?? [],
    level: def.levels ? Math.min(n + 1, def.levels.length) : null,
    levels: def.levels ?? null,
    usesLeft: cardUses(id) - n,
    opportunity: !!def.opportunity,
    expiresIn: exp !== undefined ? exp - s.round + 1 : null,
    playable: !reason,
    reason,
    isNew: s.arrivals[id] === s.round,
    family: def.family,
    odds: oddsOf(s, id),
    basis: def.basis,
  };
}

/** The hand, in order of arrival (opportunities first: their window is short). */
export function hand(s: GameState): CardView[] {
  const ids = [...s.hand.filter((c) => cardDef(c).opportunity), ...s.hand.filter((c) => !cardDef(c).opportunity)];
  return ids.map((id) => cardView(s, id));
}

/** A copy whose hidden truth is replaced by the public estimate: previews and advice never see the truth. */
function publicCopy(s: GameState): GameState {
  const c = clone(s);
  c.confidence.truth = c.confidence.estimate;
  return c;
}

/** What playing these cards (in order) would change, in public values only. Nothing is committed. */
export function preview(state: GameState, picks: Pick[]): PreviewView {
  const base = publicCopy(state);
  let s = base;
  let cost = 0;
  for (const p of picks) {
    const why = blocked(s, p.id);
    if (why) {
      const h = heading(base);
      return { ok: false, reason: why, cost, influenceAfter: s.influence, impacts: [], notes: [], headingBefore: h.text, headingAfter: h.text, worldBefore: h.name, worldAfter: h.name, outlookAfter: h };
    }
    const def = cardDef(p.id);
    const choice = def.options ? (p.option ?? def.options[0].id) : undefined;
    cost += cardCost(p.id, s.uses[p.id] ?? 0);
    s = playCard(s, { id: p.id, ...(choice ? { option: choice } : {}) }, { assumeSuccess: true });
  }
  const notes: string[] = [];
  for (const p of picks) {
    const def = cardDef(p.id);
    if (def.protects) notes.push(`Protects against ${THREAT_BY_ID[def.protects].name.replace(/^(\w)(?=[a-z])/, (x) => x.toLowerCase())}${p.id === 'inspections' || p.id === 'coalition' ? ' (a coalition and European model testing together)' : p.id === 'weight_security' || p.id === 'ai_office' ? ' (in part)' : ''}.`);
    if (p.id === 'audit') notes.push(`Shows the true ${GAUGE_LABEL.confidence} for ${T.cards.audit.rounds} rounds.`);
    if (p.id === 'alignment') notes.push('Most of the gain is real safety that the estimate does not show.');
    if (p.id === 'flexicurity') notes.push(`Softens job shocks. Influence ${signed(T.cards.flexicurity.influence)} for the next ${T.cards.flexicurity.rounds} rounds.`);
    if (p.id === 'cyber_shield') notes.push(`Influence ${signed(T.cards.cyber_shield.influence)} for the next ${T.cards.cyber_shield.rounds} rounds.`);
    if (p.id === 'open_models') notes.push('Ransomware gets easier: that threat grows faster.');
    if (p.id === 'oversight_mandate')
      notes.push(
        used(base, 'open_models')
          ? 'Some labs keep their newest models out of Europe; Europe’s own open models keep it Open.'
          : 'Some labs keep their newest models out of Europe: Europe’s AI turns Dependent, and the big labs threaten to pull out (silicon blackmail).',
      );
    if (p.id === 'asml') notes.push('Washington will answer with a ban on European chip-tool sales to China.');
    if (p.id === 'inspections' && (base.uses.inspections ?? 0) >= 1) notes.push(`Influence ${signed(T.cards.inspections.influence)} next round: the superpowers resist letting foreigners in.`);
    if (p.id === 'chip_verification') notes.push(`Influence ${signed(T.cards.chip_verification.influence)} next round: both capitals distrust it at first.`);
    if (p.id === 'alignment' && base.inspections < T.cards.alignment.accessInspections) notes.push('With an inspection accord, your teams would work inside the labs and count for more.');
    if (p.id === 'coalition' && base.coalition + 1 === T.influence.coalitionLevel) notes.push('Allies share the load: Influence +1 every round from now on.');
    if (p.id === 'talks') notes.push('The envoys rest next round.');
    if (p.id === 'pause_call') notes.push(`One more vote to slow down in Washington’s oversight committee. Influence ${signed(T.cards.pause_call.influence)} next round.`);
  }
  // cards that can fail: the preview shows them working; say so in words
  const risky = picks.map((p) => ({ p, o: oddsOf(base, p.id) })).filter((x) => x.o && x.o.word !== 'Likely to work');
  if (risky.length) notes.push(`${risky.map((x) => `${cardDef(x.p.id).levels ? cardTitle(base, x.p.id) : cardDef(x.p.id).name}: ${x.o!.word.toLowerCase()}`).join('; ')}. If it fails, the Influence is spent and nothing else happens.`);
  return {
    ok: true,
    reason: null,
    cost,
    influenceAfter: s.influence,
    impacts: impacts(snap(base), snap(s)).filter((i) => i.key !== 'influence'),
    notes,
    headingBefore: heading(base).text,
    headingAfter: heading(s).text,
    worldBefore: heading(base).name,
    worldAfter: heading(s).name,
    outlookAfter: heading(s),
  };
}

// ---------------------------------------------------------------- end of a round, end of the game

function record(s: GameState): RoundRecord {
  return {
    round: s.round,
    headlines: s.headlines,
    voices: s.voices,
    leak: s.leak,
    event: s.roundEvent,
    event2: s.roundEvent2,
    changes: s.changes,
    decisions: s.played,
    letter: s.letters.find((l) => l.round === s.round && l.slot !== 'end')?.id ?? null,
    values: publicValues(s),
    requests: s.requests.round,
    social: s.social?.round ?? [],
  };
}

const publicValues = (s: GameState): PublicValues => ({
  aiPower: s.aiPower,
  cooperation: s.cooperation,
  estimate: s.confidence.estimate,
  margin: s.confidence.margin,
  cohesion: s.cohesion,
});

export function endRound(state: GameState): { state: GameState; outcome: 'next' | 'ended' } {
  if (state.event) throw new Error('resolve the event first');
  if (state.requests.pending.length) throw new Error('answer the requests first');
  const s = clone(state);
  s.history.push(record(s));
  if (s.tipping || s.round >= T.rounds) {
    finish(s);
    return { state: s, outcome: 'ended' };
  }
  return { state: s, outcome: 'next' };
}

/** Without a tipping point: AI hit a wall (Plateau) or kept improving slowly under a few labs (Big AI). */
const gradualWorld = (aiPower: number): WorldId => (aiPower >= T.plateau.bigAiFrom ? 'plateau_labs' : 'plateau_open');

/** In Big AI, only a Europe with its own open models ends well (CFG, Big AI, Ending A). */
const needsOpen = (world: WorldId) => world === 'plateau_labs';

/** Which world the game ends in. */
function worldAtEnd(s: GameState): WorldId {
  if (s.tipping) return zoneOf(s.finalCooperation ?? s.cooperation);
  return gradualWorld(s.aiPower);
}

function gaugeValueTrue(s: GameState, key: GaugeKey): number {
  return key === 'confidence' ? s.confidence.truth : key === 'cooperation' ? (s.finalCooperation ?? s.cooperation) : s[key];
}

/**
 * AI 2027's Oversight Committee (October 2027): ten votes, race on or slow down. Public values only: the leaked memo,
 * Europe's pause call, what is verified about AI safety, and whether the superpowers are in open rupture.
 * Null until the memo has leaked (no committee yet).
 */
export function committeeVote(s: GameState): CommitteeVote | null {
  if (!s.flags.includes('memo_public')) return null;
  const V = T.committee;
  const reasons: string[] = [];
  let slow: number = V.base;
  slow += 1;
  reasons.push('The leaked memo and the public backlash: +1 to slow down');
  if (s.flags.includes('pause_call')) {
    slow += 1;
    reasons.push('Europe’s call for a pause, joined by other capitals: +1 to slow down');
  }
  // the fears of misalignment need a public reason beyond the memo: an AI incident this game (CFG's warning shot)
  if (lowEnd(s.confidence) < V.doubtBelow && s.threats.incident.struck) {
    slow += 1;
    reasons.push(`An AI incident, and nobody outside the labs can vouch for the AI (${GAUGE_LABEL.confidence} verified below ${V.doubtBelow}): +1 to slow down`);
  }
  if (zoneOf(s.cooperation) === 'rupture') {
    slow -= 1;
    reasons.push('The superpowers are in open rupture, and hawks fear losing the lead: −1');
  }
  slow = Math.max(0, Math.min(10, slow));
  return { slowdown: slow, race: 10 - slow, outcome: slow >= V.needed ? 'slowdown' : 'race', reasons };
}

/** How far the committee's vote moves US–China cooperation at the tipping point. */
const committeeShift = (v: CommitteeVote) => (v.outcome === 'slowdown' ? T.committee.slowdown.cooperation : T.committee.race.cooperation);

function finish(s: GameState) {
  const h: RngHolder = { rng: s.rng };
  if (s.tipping) s.finalCooperation = clamp(s.cooperation + randomInt(h, -T.tippingNoise, T.tippingNoise));
  // the Oversight Committee votes (once the memo has leaked): it moves the final cooperation, and slowing down
  // brings outside alignment researchers in (AI 2027's slowdown ending)
  const vote = s.tipping ? committeeVote(s) : null;
  if (vote) {
    s.committee = vote;
    s.flags.push(vote.outcome === 'slowdown' ? 'committee_slowdown' : 'committee_race');
    s.finalCooperation = clamp((s.finalCooperation ?? s.cooperation) + committeeShift(vote));
    if (vote.outcome === 'slowdown') applyFx(s, [{ key: 'truth', amount: T.committee.slowdown.truth }]);
  }
  const world = worldAtEnd(s);
  const w = T.worlds[world];
  const good = gaugeValueTrue(s, w.decides) >= w.target && gaugeValueTrue(s, w.net) >= w.floor && (!needsOpen(world) || s.europeAi === 'open');
  s.ending = good ? WORLDS[world].good : WORLDS[world].bad;
  s.phase = 'ended';
  for (const friend of FRIEND_IDS) s.letters.push({ slot: 'end', round: s.round, id: `end_${s.ending}_${friend}`, friend });
  s.rng = h.rng;
}

// ---------------------------------------------------------------- views

/** The world the player is heading to, from public values only. */
function projectedWorld(s: GameState): WorldId {
  if (s.phase === 'ended' && s.ending) return ENDING_BY_ID[s.ending].world;
  // once the memo has leaked, the committee's vote (as it stands, public values) moves the cooperation that counts
  const v = committeeVote(s);
  const coop = clamp(s.cooperation + (v ? committeeShift(v) : 0));
  if (s.tipping) return zoneOf(coop);
  const left = T.rounds - s.round;
  const reach = s.aiPower + s.lastRise * left * 1.15;
  if (s.round >= 4 && reach < T.tippingAt) return gradualWorld(Math.round(reach));
  return zoneOf(coop);
}

const audited = (s: GameState) => s.round > 0 && s.round <= s.auditUntil;

function shown(s: GameState, key: GaugeKey): { text: string; low: number; high: number } {
  if (key === 'confidence') {
    const c = s.confidence;
    if (audited(s)) return { text: `${c.truth} (audited)`, low: c.truth, high: c.truth };
    return { text: lowText(c.estimate, lowEnd(c)), low: lowEnd(c), high: c.estimate };
  }
  const v = s[key];
  return { text: String(v), low: v, high: v };
}

export function heading(s: GameState): HeadingView {
  const world = projectedWorld(s);
  const w = T.worlds[world];
  const def = WORLDS[world];
  const met = (x: { low: number; high: number }, bar: number) => (x.low >= bar ? 'yes' : x.high < bar ? 'no' : 'maybe') as 'yes' | 'no' | 'maybe';
  const og = (key: GaugeKey, bar: number): HeadingView['decides'] => {
    const x = shown(s, key);
    const value = key === 'confidence' ? (audited(s) ? s.confidence.truth : s.confidence.estimate) : s[key];
    return { key, label: GAUGE_LABEL[key], bar, you: x.text, value, low: clamp(x.low), high: clamp(x.high), met: met(x, bar) };
  };
  const decides = og(w.decides, w.target);
  const net = og(w.net, w.floor);
  const plateau = world === 'plateau_open' || world === 'plateau_labs';
  const name = def.name;
  const open = needsOpen(world) ? `, Europe’s AI Open (you: ${s.europeAi === 'open' ? 'Open' : 'Dependent'})` : '';
  const text = `${plateau ? 'If AI stalls' : 'If AI tipped now'}: ${name}. To end well: ${decides.label} ${w.target} (you: ${decides.you})${open} and ${net.label} ${w.floor} or more (you: ${net.you}).`;
  const vote = s.phase === 'play' && !plateau ? committeeVote(s) : null;
  const committee = vote ? { ...vote, shift: committeeShift(vote) } : null;
  return { world, name, plateau, meaning: def.meaning, basis: def.basis, decides, net, needsOpen: needsOpen(world) ? { now: s.europeAi } : null, committee, alt: alternative(s, world, decides, net), text };
}

/** "Or change course": the nearest other world, from public values, only when it is within reach and would help. */
function alternative(s: GameState, world: WorldId, d: HeadingView['decides'], n: HeadingView['net']): HeadingView['alt'] {
  if (s.tipping || s.phase !== 'play') return null;
  if (d.met === 'yes' && n.met === 'yes' && !(needsOpen(world) && s.europeAi !== 'open')) return null;
  const coop = s.cooperation;
  const near = (bar: number) => bar - coop > 0 && bar - coop <= T.outlook.altGap;
  if (world === 'race' && near(T.zones.pause)) {
    const p = T.worlds.pause;
    return {
      world: 'pause',
      name: WORLDS.pause.name,
      text: `Push ${GAUGE_LABEL.cooperation} to ${T.zones.pause} or more (you: ${coop}) to reach a Pause, where ${GAUGE_LABEL[p.decides]} ${p.target} is enough.`,
    };
  }
  if (world === 'rupture' && d.met !== 'yes' && near(T.zones.race)) {
    const r = T.worlds.race;
    return {
      world: 'race',
      name: WORLDS.race.name,
      text: `Lift ${GAUGE_LABEL.cooperation} to ${T.zones.race} or more (you: ${coop}) to turn the Rupture into a Race, where ${GAUGE_LABEL[r.decides]} ${r.target} and ${GAUGE_LABEL[r.net]} ${r.floor} decide.`,
    };
  }
  if (world === 'plateau_labs' && s.europeAi !== 'open' && !s.europeAiLocked && s.hand.includes('open_models'))
    return {
      world: 'plateau_labs',
      name: WORLDS.plateau_labs.name,
      text: `Fund open models to make Europe’s AI Open: with a few big labs in charge, only a Europe with its own models ends well.`,
    };
  return null;
}

/**
 * "Tipping point in ~2–4 rounds", only when it looks close (at most four rounds at the visible pace); otherwise
 * nothing. Built only from what the player sees: AI capabilities now, their rise over the last six months, the
 * round and the public rule that the tipping point never comes before round 6. Never from the hidden pace (a
 * test checks it).
 */
export function tippingEstimate(s: GameState): string | null {
  if (s.tipping) return 'AI has reached the tipping point.';
  if (s.round < 1 || s.phase !== 'play') return null;
  const left = T.rounds - s.round;
  if (left <= 0) return null;
  const gap = Math.max(0, T.tippingAt - s.aiPower);
  const rate = Math.max(1, s.lastRise);
  const n = gap / rate;
  const notBefore = Math.max(1, T.earliestTipping - s.round);
  const lo = Math.max(notBefore, Math.floor(n * T.eta.low));
  const hi = Math.max(lo, Math.ceil(n * T.eta.high));
  if (hi > T.eta.showWithin || lo > left) return null;
  const top = Math.min(hi, left);
  return lo >= top ? `Tipping point in ~${lo} round${lo > 1 ? 's' : ''}` : `Tipping point in ~${lo}–${top} rounds`;
}

export function gauges(s: GameState): GaugeView[] {
  const hd = heading(s);
  const keys: GaugeKey[] = ['aiPower', 'cooperation', 'confidence', 'cohesion'];
  return keys.map((key) => {
    const isAudit = key === 'confidence' && audited(s);
    const markers = THREATS.filter((t) => t.gauge === key && s.threats[t.id].stage > 0 && !s.threats[t.id].struck).map((t) => ({
      threat: t.id,
      text: isPrepared(s, t.id) ? `${t.name}: prepared` : t.marker,
      prepared: isPrepared(s, t.id),
    }));
    return {
      key,
      label: GAUGE_LABEL[key],
      sub: GAUGE_SUB[key],
      eta: key === 'aiPower' ? tippingEstimate(s) : null,
      value: key === 'confidence' ? (isAudit ? s.confidence.truth : s.confidence.estimate) : s[key],
      margin: key === 'confidence' && !isAudit ? s.confidence.margin : 0,
      audited: isAudit,
      target: key === 'aiPower' ? T.tippingAt : hd.decides.key === key ? hd.decides.bar : hd.net.key === key ? hd.net.bar : null,
      targetKind: key === 'aiPower' ? 'tipping' : hd.decides.key === key ? 'goal' : hd.net.key === key ? 'floor' : null,
      markers,
    };
  });
}

export function threats(s: GameState): ThreatView[] {
  return THREATS.filter((t) => s.threats[t.id].stage > 0 || s.threats[t.id].struck).map((t) => {
    const st = s.threats[t.id];
    return {
      id: t.id,
      name: t.name,
      region: t.region,
      stage: st.stage,
      stageWord: st.struck ? 'Struck' : STAGE_WORD[Math.max(1, st.stage) as 1 | 2 | 3],
      certainty: t.certainty,
      prepared: st.struck ? !!st.prepared : isPrepared(s, t.id),
      struck: st.struck,
      why: t.why,
      ifUnprepared: t.ifUnprepared,
      ifPrepared: t.ifPrepared,
      protectedBy: t.protectedBy,
      protectedByNames: t.protectedBy.map((c) => (c === 'inspections' ? CARD_BY_ID.inspections.levels![0] : CARD_BY_ID[c].name)).join(' and '),
      gauge: t.gauge,
    };
  });
}

/** The biggest changes of a round with their cause: not threat stages, not the player's own moves. */
function topChanges(list: Change[], score: (c: Change) => number): Change[] {
  return list
    .filter((c) => c.key !== 'threat' && !c.by)
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
}

const changeScore = (c: Change) => {
  const m = /(-?\d+) → (-?\d+)/.exec(c.text.replace(/±/g, ''));
  return m ? Math.abs(Number(m[2]) - Number(m[1])) : 0;
};

export function report(s: GameState): ReportView {
  // the three biggest changes with a cause; threat stage moves are listed with the threats
  const score = (c: Change) => {
    const m = /(-?\d+) → (-?\d+)/.exec(c.text.replace(/±/g, ''));
    return m ? Math.abs(Number(m[2]) - Number(m[1])) : 0;
  };
  const changes = topChanges(s.changes, score);
  const moved = threats(s)
    .filter((t) => !t.struck)
    .flatMap((t) => {
      const c = s.changes.find((x) => x.key === 'threat' && x.text.startsWith(`${t.name}:`));
      if (!c) return [];
      return [{ id: t.id, name: t.name, stageWord: t.stageWord, prepared: t.prepared, moved: (s.threats[t.id].stage === 1 ? 'new' : 'up') as 'new' | 'up' }];
    });
  return { round: s.round, heading: heading(s).text, changes, threats: moved, leak: s.leak, quiet: !changes.length && !moved.length };
}

/**
 * The chief of staff: weighs each gauge by how far it is from what the heading's world needs (the low end of
 * the Confidence band, never the truth), scores each playable card through the public preview, adds what the
 * card texts say (protection against a visible threat, hidden safety gains, Influence lost later), and
 * recommends the best value per Influence. Its words carry no numbers.
 */
export function advisor(s: GameState): AdvisorView {
  const cards = hand(s).filter((c) => c.playable);
  if (!cards.length) return { recommend: null, text: s.played.length ? 'That is all we can do this round.' : 'Nothing we can afford right now. Saving Influence is a choice too.' };
  const pub = publicCopy(s);
  const c = pub.confidence;
  const low = audited(s) ? s.confidence.truth : c.estimate - c.margin;
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
  const seen = threats(s).filter((t) => !t.struck && !t.prepared && t.stage >= 1);
  type Why = 'threat' | 'opportunity' | 'coop' | 'conf' | 'coh';
  const rank = cards.flatMap((cv) =>
    (cv.options.length ? cv.options.map((o) => o.id) : [undefined]).map((option) => {
      const pv = preview(s, [{ id: cv.id, ...(option ? { option } : {}) }]);
      const parts: Record<Why, number> = { threat: 0, opportunity: 0, coop: 0, conf: 0, coh: 0 };
      let threat: ThreatView | null = null;
      // AI safety counts by its verified part: the margin line carries it (before → after); without one, it moves with the claim
      const verifiedLine = pv.impacts.some((i) => i.key === 'margin');
      for (const i of pv.impacts) {
        const d = Number(i.after) - Number(i.before);
        if (i.key === 'cooperation') parts.coop += d * w.coop;
        else if (i.key === 'confidence') parts.conf += verifiedLine ? 0 : d * w.conf;
        else if (i.key === 'margin') parts.conf += d * w.conf;
        else if (i.key === 'cohesion') parts.coh += d * w.coh;
        else if (i.key === 'europeAi') parts.coh += (i.after === 'Open' ? 1 : -1) * (needsOpen(hd.world) ? 8 : plateau ? 1 : 0.5);
      }
      if (cv.id === 'alignment') parts.conf += (s.inspections >= T.cards.alignment.accessInspections ? 4 : 1.5) * w.conf;
      if (cv.id === 'licensing_treaty' || cv.id === 'summit') parts.conf += 2 * w.conf;
      if (pv.worldAfter !== pv.worldBefore && pv.worldAfter === WORLDS.pause.name) parts.coop += 6;
      if (cv.id === 'flexicurity' && s.jobShocks < 2) parts.coh += 6 * w.coh;
      if (cv.id === 'flexicurity' || cv.id === 'cyber_shield') parts.coh -= 2;
      if (cv.id === 'audit') parts.conf += s.confidence.margin >= 12 ? 3 * w.conf : -1;
      if (cv.id === 'oversight_mandate' && s.europeAi === 'dependent') parts.coh -= plateau ? 4 : 2;
      if (cv.id === 'coalition' && s.coalition === 1) parts.coop += 3;
      if (cv.opportunity) parts.opportunity += 2;
      for (const t of seen) {
        const protects = t.protectedBy.includes(cv.id) && !(cv.id === 'coalition' && s.coalition >= 1) && !(cv.id === 'inspections' && s.inspections >= 1);
        if (protects) {
          parts.threat += t.stage * (t.id === 'incident' ? 2 : 4) + (t.certainty === 'likely' ? 2 : 0);
          threat = threat && threat.stage >= t.stage ? threat : t;
        }
      }
      if (cv.id === 'open_models' && seen.some((t) => t.id === 'blackmail')) {
        parts.threat += 8;
        threat = seen.find((t) => t.id === 'blackmail')!;
      }
      // a card that can fail is worth what it brings when it works, times its chance (public values)
      const v = Object.values(parts).reduce((a, b) => a + b, 0) * (chanceOf(s, cv.id) ?? 1);
      const why = (Object.entries(parts) as [Why, number][]).sort((a, b) => b[1] - a[1])[0][0];
      return { cv, option, v, ratio: v / Math.max(1, cv.cost), why, threat };
    }),
  );
  const best = rank.filter((r) => r.v > 1.5).sort((a, b) => b.ratio - a.ratio)[0];
  if (!best) return { recommend: null, text: 'Nothing pressing this round. Saving Influence for the next crisis is a fine choice too.' };
  const name = best.cv.id === 'asml' ? `${best.cv.name} (${best.cv.options.find((o) => o.id === best.option)!.label.toLowerCase()})` : best.cv.title;
  const world = WORLDS[hd.world].name;
  let text: string;
  switch (best.why) {
    case 'threat':
      text = best.threat ? `${best.threat.name} is ${best.threat.stage === 3 ? 'imminent' : best.threat.stage === 2 ? 'rising' : 'on the horizon'} and Europe is not ready. ${name} would protect us.` : `${name} would prepare us for what is coming.`;
      break;
    case 'opportunity':
      text = `The window is open now and closes soon. ${name} turns this crisis into progress.`;
      break;
    case 'coop':
      text = pausePath
        ? `A pause between the superpowers is the calmest world we can reach, and it lowers every bar. ${name} brings Washington and Beijing closer.`
        : `Washington and Beijing are breaking apart, the hardest world to end well. ${name} would pull them back.`;
      break;
    case 'conf':
      text = `We cannot be sure enough that these AIs are safe for the world we are heading to (${world}). ${name} is the best way to change that.`;
      break;
    default:
      text = plateau
        ? `If AI stalls, what decides is whether Europe holds together. ${name} would help people trust what is coming.`
        : `Europe is fraying, and our safety net needs it to hold. ${name} would help.`;
  }
  return { recommend: best.cv.id, ...(best.option ? { option: best.option } : {}), text };
}

function letterDef(id: string): LetterDef | null {
  return LETTER_BY_ID[id] ?? null;
}

/** Each friend's epilogue for this ending. */
function epilogues(s: GameState, ending: EndingId): FriendEpilogue[] {
  // Silicon blackmail: Europe refused and was switched off (CFG), unless the player gave in to the blackmail
  const set = ending === 'silicon_blackmail' && s.threats.blackmail.choice === 'give_in' ? EPILOGUES_GAVE_IN : EPILOGUES[ending];
  return FRIEND_IDS.map((friend) => ({ friend, ...set[friend], basis: EPILOGUE_BASIS(ending) }));
}

export function letters(s: GameState): LetterView[] {
  return s.letters.map((l) => {
    if (l.slot === 'end') {
      // end_<ending>_<friend>; saves from before the friends have end_<ending>_<0|1>, Léa's
      const m = /^end_(.+)_(lea|mother|malik|\d)$/.exec(l.id)!;
      const ending = m[1] as EndingId;
      const friend: FriendId = /^\d$/.test(m[2]) ? 'lea' : (m[2] as FriendId);
      const e = EPILOGUES[ending][friend];
      return { slot: 'end', round: l.round, id: l.id, friend, mood: e.mood, text: e.text, postcard: false, basis: EPILOGUE_BASIS(ending) };
    }
    const d = letterDef(l.id)!;
    // saves from before the friends (26 Oct) have no `friend`: those letters were all Léa's
    return { slot: l.slot, round: l.round, id: l.id, friend: l.friend ?? 'lea', mood: d.mood, text: d.text, postcard: true, basis: d.basis };
  });
}

const WORLD_NOUN: Record<WorldId, string> = {
  pause: 'a pause',
  race: 'a race',
  rupture: 'a rupture',
  plateau_open: 'a plateau with open models',
  plateau_labs: 'a world run by big labs',
};

export function ending(s: GameState): EndingView {
  if (s.phase !== 'ended' || !s.ending) throw new Error('the game has not ended');
  const def = ENDING_BY_ID[s.ending];
  const world = def.world;
  const wd = WORLDS[world];
  const w = T.worlds[world];
  const c = s.confidence;
  const seen = `${lowEnd(c)} verified, the labs claimed ${c.estimate}`;
  const val = (k: GaugeKey) => gaugeValueTrue(s, k);
  const label = (k: GaugeKey) => GAUGE_LABEL[k];
  const withSeen = (k: GaugeKey) => (k === 'confidence' && (c.estimate !== c.truth || c.margin > 0) ? ` (${seen})` : '');
  const dv = val(w.decides);
  const nv = val(w.net);
  const dOk = dv >= w.target;
  const nOk = nv >= w.floor;
  const tail = `: ${def.title.charAt(0).toLowerCase()}${def.title.slice(1)}.`;
  let sentence: string;
  if (needsOpen(world) && s.europeAi !== 'open') sentence = `${wd.how}, and Europe had no models of its own to fall back on${tail}`;
  else if (!dOk) sentence = `${wd.how}. ${label(w.decides)} was ${dv}${withSeen(w.decides)}, below the ${w.target} ${WORLD_NOUN[world]} needs${tail}`;
  else if (!nOk)
    sentence = `${wd.how} and ${label(w.decides)} reached ${dv}, but ${label(w.net)} fell to ${nv}${withSeen(w.net)}, below the ${w.floor} ${WORLD_NOUN[world]} needs${tail}`;
  else sentence = `${wd.how}. ${label(w.decides)} was ${dv}${withSeen(w.decides)}, above the ${w.target} ${WORLD_NOUN[world]} needs, and ${label(w.net)} held at ${nv}${tail}`;

  const keys: GaugeKey[] = ['aiPower', 'cooperation', 'confidence', 'cohesion'];
  const gaugesEnd = keys.map((k) => ({
    key: k,
    label: GAUGE_LABEL[k],
    value: val(k),
    target: k === 'aiPower' ? T.tippingAt : k === w.decides ? w.target : k === w.net ? w.floor : null,
    targetKind: (k === 'aiPower' ? 'tipping' : k === w.decides ? 'goal' : k === w.net ? 'floor' : null) as EndingView['gauges'][number]['targetKind'],
    seen: k === 'confidence' ? lowText(c.estimate, lowEnd(c)) : null,
    met: k === w.decides ? dOk : k === w.net ? nOk : null,
  }));

  // what would have changed it
  const cf: string[] = [];
  if (s.tipping && world !== 'pause') {
    const p = T.worlds.pause;
    const pauseGood = c.truth >= p.target && s.cohesion >= p.floor;
    cf.push(
      `With ${GAUGE_LABEL.cooperation} at ${T.zones.pause} or more at the tipping point (you had ${val('cooperation')}), the superpowers would have paused, and ${GAUGE_LABEL.confidence} ${p.target} would have been enough${pauseGood ? `: ${ENDING_BY_ID.licensed_utopia.title.toLowerCase()}` : ''}.`,
    );
  }
  if (s.committee?.outcome === 'race' && !s.flags.includes('pause_call') && s.committee.slowdown + 1 >= T.committee.needed)
    cf.push('Calling for a pause with other capitals after the memo leaked would have tipped Washington’s oversight committee toward slowing down.');
  if (!dOk) cf.push(shortfall(w.decides, w.target - dv));
  else if (!nOk) cf.push(shortfall(w.net, w.floor - nv));
  else if (dv - w.target <= 4) cf.push(`It was close: ${label(w.decides)} cleared the bar by only ${dv - w.target}.`);
  for (const t of THREATS) {
    const st = s.threats[t.id];
    if (st.struck && st.prepared === false && t.id !== 'blackmail' && cf.length < 3)
      cf.push(`The ${t.name.replace(/^(\w)(?=[a-z])/, (x) => x.toLowerCase())} caught Europe unprepared. ${t.protectedBy.map((x) => (x === 'inspections' ? 'testing the labs’ models in Europe' : CARD_BY_ID[x].name)).join(' and ')} would have changed that.`);
  }
  if (needsOpen(world) && s.europeAi !== 'open')
    cf.unshift(
      s.europeAiLocked
        ? 'Europe gave in to the labs and could no longer fund its own models: with a few big labs in charge, only a Europe with its own open models ends well.'
        : 'Funding open models would have given Europe its own alternative: with a few big labs in charge, only an Open Europe ends well.',
    );

  const decisions = s.history.flatMap((r) =>
    r.decisions.map((p) => {
      const def = CARD_BY_ID[p.id];
      const nth = s.history.filter((x) => x.round < r.round).flatMap((x) => x.decisions).filter((x) => x.id === p.id && !x.failed).length;
      const ups: Chip[] = p.option && def.options ? def.options.find((o) => o.id === p.option)!.ups : def.ups;
      const name = def.levels ? def.levels[Math.min(nth, def.levels.length - 1)] : def.name;
      if (p.failed) return { round: r.round, date: dateLabel(r.round), name, ups: [], downs: [], failed: def.failure?.text ?? 'It did not work.' };
      return { round: r.round, date: dateLabel(r.round), name, ups, downs: def.downs };
    }),
  );
  const threatList = THREATS.filter((t) => s.threats[t.id].stage > 0 || s.threats[t.id].struck).map((t) => ({
    id: t.id,
    name: t.name,
    struck: s.threats[t.id].struck,
    prepared: s.threats[t.id].struck ? s.threats[t.id].prepared : isPrepared(s, t.id),
    by: t.protectedBy.map((x) => (x === 'inspections' ? CARD_BY_ID.inspections.levels![0] : CARD_BY_ID[x].name)).join(' and '),
  }));
  return {
    id: s.ending,
    title: def.title,
    good: def.good,
    world,
    worldName: wd.name,
    dateLabel: dateLabel(s.round),
    year: yearOf(s.round),
    story: def.storyGaveIn && s.threats.blackmail.choice === 'give_in' ? def.storyGaveIn : def.story,
    sentence,
    gauges: gaugesEnd,
    reveal: {
      truth: c.truth,
      estimate: c.estimate,
      margin: c.margin,
      low: lowEnd(c),
      high: c.estimate,
      audited: audited(s),
      widened: widenedBy(s),
      pace: s.pace,
      paceText: PACE_TEXT[s.pace],
      unreadLeaks: s.leaks.filter((l) => !l.readable),
      readLeaks: s.leaks.filter((l) => l.readable),
    },
    counterfactuals: cf.slice(0, 2),
    decisions,
    threats: threatList,
    friends: epilogues(s, s.ending!),
    committee: s.committee ? { ...s.committee, shift: committeeShift(s.committee) } : null,
    basis: def.basis,
    source: def.source,
  };
}

/** What made the player less certain about AI safety over the game, in words, biggest first. */
function widenedBy(s: GameState): string[] {
  const all = [...s.history.flatMap((r) => r.changes), ...(s.history.some((r) => r.round === s.round) ? [] : s.changes)];
  const out: { text: string; by: number }[] = [];
  for (const ch of all) {
    if (ch.key !== 'margin') continue;
    const m = /less verified \((\d+) → (\d+)\)/.exec(ch.text);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b >= a) continue;
    const what = `verified AI safety ${a} → ${b}`;
    const text = ch.cause === EVENTS.opaque.title ? `${THREAT_BY_ID.opaque.name}: ${what}.` : `${ch.cause}: ${what}.`;
    out.push({ text, by: a - b });
  }
  return out.sort((x, y) => y.by - x.by).slice(0, 3).map((x) => x.text);
}

function shortfall(key: GaugeKey, gap: number): string {
  if (key === 'confidence')
    return `${GAUGE_LABEL.confidence} needed ${gap} more point${gap > 1 ? 's' : ''}. AI safety research raises the real value; the AI Office, inspections and audits show you where it stands.`;
  if (key === 'cohesion')
    return `${GAUGE_LABEL.cohesion} needed ${gap} more point${gap > 1 ? 's' : ''}. Safety nets for AI layoffs, human sign-off on AI and open models lift it; a cyber shield and those safety nets protect it from shocks.`;
  return `${GAUGE_LABEL[key]} needed ${gap} more.`;
}

const REGION_NAME: Record<RegionId, string> = { eu: 'Europe', us: 'the US', cn: 'China' };

/** The feed items of one round, in the order they appeared. */
/** The basis a story item is tagged with: what happens after today is never tagged Real, even when it rests on a
 *  real precedent (the precedent is cited in the item's detail or Learn more). */
const storyBasis = (b: Basis): Basis => (b.kind === 'real' ? game(`a story event resting on a real precedent: ${b.ref}`) : b);

function roundFeed(s: GameState, r: RoundRecord, pending: PendingEvent | null): FeedItem[] {
  const out: FeedItem[] = [];
  const base = { round: r.round, detail: null, threat: null, tone: 0 as const };
  // A friend's letter in full, with their mood (the feed shows a small portrait); it opened the round as a postcard
  const def = r.letter ? letterDef(r.letter) : null;
  const friend = def?.friend ?? 'lea';
  if (def)
    out.push({ ...base, id: `lea_${r.round}`, at: 0.03, kind: 'lea', label: letterLabel(friend), text: def.text, region: FRIENDS[friend].region, friend, mood: def.mood, postcard: true, prov: storyBasis(def.basis) });
  for (const h of r.headlines) {
    const t = /^t_(\w+)_(\d)$/.exec(h.id);
    const threat = t ? (t[1] as ThreatId) : null;
    const kind = threat ? 'threat' : h.id.startsWith('m_') ? 'milestone' : 'headline';
    const label = kind === 'threat' ? 'Threat' : kind === 'milestone' ? 'AI 2027 milestone' : 'Headline · in this story';
    out.push({ ...base, id: h.id, at: h.at, kind, label, text: h.text, region: h.region, threat, tone: threat ? -1 : 0, prov: storyBasis(h.basis) });
  }
  for (const v of r.voices)
    out.push({ ...base, id: v.id, at: v.at, kind: 'voice', label: `Heard in ${v.place ?? REGION_NAME[v.region]} · in this story`, text: v.text, region: v.region, prov: storyBasis(v.basis) });
  if (r.leak)
    out.push({
      ...base,
      id: `leak_${r.leak.id}`,
      at: r.leak.at,
      kind: 'leak',
      label: 'Leak',
      text: r.leak.readable || s.phase === 'ended' ? r.leak.text : 'A leak from inside the labs, redacted: you lack the oversight to read it.',
      region: 'us',
      // what to do about it, one short line
      detail: r.leak.readable || s.phase === 'ended' ? r.leak.advice : LEAK_REDACTED_ADVICE,
      prov: storyBasis(r.leak.basis),
    });
  // the round's Breaking news (two at most): those resolved, then the one on screen now
  const evs = [r.event, r.event2].filter((x): x is EventRecord => !!x);
  if (pending && !evs.some((x) => x.id === pending.id)) evs.push({ id: pending.id, title: pending.title, prepared: pending.prepared, choice: null, at: pending.at, region: pending.region });
  for (const ev of evs) {
    const detail = r.changes.filter((c) => c.cause === ev.title && !c.by).map((c) => c.text);
    out.push({
      ...base,
      id: `ev_${ev.id}`,
      at: ev.at,
      kind: 'event',
      label: 'Breaking news',
      text: `${ev.title}${ev.prepared === null ? '' : ev.prepared ? ': Europe was prepared.' : ': Europe was not prepared.'}`,
      detail: detail.length ? detail.join(', ') : null,
      region: ev.region,
      threat: ev.id in s.threats ? (ev.id as ThreatId) : null,
      tone: ev.prepared ? 1 : -1,
      ...(EVENTS[ev.id] ? { prov: storyBasis(EVENTS[ev.id].basis) } : {}),
    });
    // a job shock also shows where it hits, like the social events (v4)
    if (ev.id === 'job_shock_1' || ev.id === 'job_shock_2') {
      const pl = JOB_SHOCK_PLACE[ev.id];
      out.push({
        ...base,
        id: `s_${ev.id}`,
        at: ev.at + 0.005,
        kind: 'social',
        label: `${SOCIAL_WORD.jobs} · ${pl.city}, ${pl.country} · in this story`,
        text: EVENTS[ev.id].headline.replace(/^BREAKING: /, ''),
        detail: `${pl.why}${detail.length ? ` ${detail.join(', ')}.` : ''}`,
        region: 'eu',
        tone: -1,
        social: { kind: 'jobs', city: pl.city, lon: pl.lon, lat: pl.lat },
        prov: storyBasis(EVENTS[ev.id].basis),
      });
    }
  }
  for (const q of r.requests ?? []) {
    const card = REQUEST_BY_ID[q.id];
    const ch = CHARACTERS[card.character];
    const a = q.side ? card[q.side] : null;
    const detail = a ? r.changes.filter((c) => c.by === 'request' && c.cause === answerCause(card, a)).map((c) => c.text) : [];
    out.push({
      ...base,
      id: `q_${q.id}`,
      at: q.at,
      kind: 'request',
      label: `Request · ${ch.name}`,
      text: card.text,
      detail: a ? `You answered “${a.label}”${detail.length ? `: ${detail.join(', ')}` : ''}.` : null,
      region: ch.region,
      prov: storyBasis(card.basis),
    });
  }
  // social events (v4): story events in European cities, with why they matter and what they changed
  for (const x of r.social ?? []) {
    const def = SOCIAL_BY_ID[x.id];
    if (!def) continue;
    const moved = r.changes.filter((c) => c.cause === def.headline).map((c) => c.text);
    const tone = def.effects.some((e) => e.dir < 0) ? -1 : 1;
    out.push({
      ...base,
      id: `s_${x.id}`,
      at: x.at,
      kind: 'social',
      label: `${SOCIAL_WORD[def.kind]} · ${def.city}, ${def.country} · in this story`,
      text: def.headline,
      detail: `${def.why}${moved.length ? ` ${moved.join(', ')}.` : ''}`,
      region: 'eu',
      tone: tone as -1 | 1,
      social: { kind: def.kind, city: def.city, lon: def.lon, lat: def.lat },
      prov: storyBasis(def.basis),
    });
  }
  out.sort((a, b) => a.at - b.at);
  // the player's decisions, after the six months, with what they changed
  // a failed card climbed no level: only the ones that worked count
  const earlier = s.history.filter((x) => x.round < r.round).flatMap((x) => x.decisions).filter((x) => !x.failed);
  r.decisions.forEach((p, i) => {
    const def = CARD_BY_ID[p.id];
    const nth = earlier.filter((x) => x.id === p.id).length;
    const name = def.levels ? def.levels[Math.min(nth, def.levels.length - 1)] : def.name;
    const opt = p.option && def.options ? ` (${def.options.find((o) => o.id === p.option)!.label.toLowerCase()})` : '';
    if (p.failed && def.failure) {
      // it did not work: the news says why, in one plain sentence (with its basis), and the decision says what it cost
      out.push({ ...base, id: `f_${p.id}`, at: 1.1 + i * 0.01, kind: 'headline', label: 'Headline', text: def.failure.text, detail: `Your decision did not work: ${name}.`, region: 'eu', tone: -1, prov: def.failure.basis });
      out.push({ ...base, id: `d_${p.id}`, at: 1.1 + i * 0.01 + 0.005, kind: 'decision', label: 'Your decision', text: `${name}${opt}: did not work`, detail: 'Influence spent; nothing else changed.', region: 'eu', tone: -1, prov: def.basis });
      return;
    }
    const detail = r.changes.filter((c) => c.by === 'card' && c.cause === name).map((c) => c.text);
    out.push({ ...base, id: `d_${p.id}`, at: 1.1 + i * 0.01, kind: 'decision', label: 'Your decision', text: `${name}${opt}`, detail: detail.length ? detail.join(', ') : null, region: 'eu', tone: 0, prov: def.basis });
  });
  // ids are unique across the whole game
  return out.map((x) => ({ ...x, id: `r${r.round}_${x.id}` }));
}

export function feed(s: GameState): FeedRound[] {
  const rounds = [...s.history];
  const current = s.round > 0 && !rounds.some((r) => r.round === s.round);
  if (current) rounds.push(record(s));
  return rounds.map((r) => ({
    round: r.round,
    date: dateLabel(r.round),
    items: roundFeed(s, r, current && r.round === s.round ? s.event : null),
    summary: topChanges(r.changes, changeScore),
  }));
}

/** The ids of this game's headlines, voices, social events, requests and letters (milestones, threat stages,
 *  Breaking news and leaks follow the scenario and are left out): the next games draw them less often. */
export function seen(s: GameState): string[] {
  const rounds = [...s.history, ...(s.history.some((r) => r.round === s.round) || s.round === 0 ? [] : [record(s)])];
  const ids = rounds.flatMap((r) => [
    ...r.headlines.filter((x) => !/^(m|t)_/.test(x.id)).map((x) => x.id),
    ...r.voices.map((x) => x.id),
    ...(r.social ?? []).map((x) => x.id),
    ...r.requests.map((x) => x.id),
    ...(r.letter ? [r.letter] : []),
  ]);
  return [...new Set(ids)];
}

export const engine: EngineApi = {
  seen,
  createInitialState,
  startRound,
  resolveEvent,
  request,
  answerRequest,
  endRound,
  hand,
  playCard,
  preview,
  gauges,
  heading,
  threats,
  report,
  advisor,
  nextIncome: (s) => nextIncome(s),
  letters,
  ending,
  feed,
  dateLabel,
};
