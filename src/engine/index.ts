// The v3 engine: pure functions over GameState. No DOM, no Math.random (the seeded RNG lives in state.rng),
// and no function mutates its input: each works on a deep copy and returns it.
// The round flow is documented at the top of api.ts; rules and numbers in docs/DEVELOPER_NOTES.md.

import { CARD_BY_ID, CARDS, cardCost, cardUses, type CardDef } from '../data/cards';
import { GAUGE_LABEL, GAUGE_SUB, PACE_TEXT, STAGE_WORD, marginText } from '../data/copy';
import { ENDING_BY_ID, WORLDS } from '../data/endings';
import { LEA_END, LEA_END_BASIS, LEA_END_MOOD, LEA_R1, LEA_R4, LEA_R8, type LetterDef } from '../data/lea';
import { LEAKS } from '../data/leaks';
import { VOICES, WORLD_HEADLINES, type MapLine, type PublicWorld } from '../data/mapcontent';
import { MILESTONES, MILESTONE_BY_ID } from '../data/milestones';
import { EVENTS, THREAT_BY_ID, THREATS } from '../data/threats';
import { TUNING as T } from '../data/tuning';
import type { EngineApi } from './api';
import { pick, random, randomInt, seedToRng, shuffle, weightedPick, type RngHolder } from './rng';
import type {
  AdvisorView,
  CardId,
  CardView,
  Change,
  Chip,
  EndingId,
  EndingView,
  EventId,
  GameState,
  GaugeKey,
  GaugeView,
  HeadingView,
  Impact,
  IncomeView,
  JournalRound,
  LetterView,
  MapItem,
  MilestoneId,
  PendingEvent,
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
const THREAT_IDS: ThreatId[] = ['theft', 'opaque', 'incident', 'ransomware', 'blackmail'];

export function dateLabel(round: number): string {
  const r = Math.max(1, round);
  return `${r % 2 ? 'H1' : 'H2'} ${2027 + Math.floor((r - 1) / 2)}`;
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

/** Keep the confidence triple consistent: margin within bounds, the truth always inside estimate ± margin. */
function settleConfidence(s: GameState) {
  const c = s.confidence;
  c.truth = clamp(Math.round(c.truth));
  c.margin = clamp(Math.round(c.margin), T.confidence.minMargin, T.confidence.maxMargin);
  c.estimate = clamp(Math.round(clamp(c.estimate, c.truth - c.margin, c.truth + c.margin)));
}

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
      case 'truth':
        s.confidence.truth += f.amount;
        break;
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
  settleConfidence(s);
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
  line('margin', `${GAUGE_LABEL.confidence} uncertainty`, a.margin, b.margin, -1);
  line('cohesion', GAUGE_LABEL.cohesion, a.cohesion, b.cohesion, 1);
  if (a.europeAi !== b.europeAi)
    out.push({ key: 'europeAi', label: 'Europe’s AI', before: cap(a.europeAi), after: cap(b.europeAi), tone: b.europeAi === 'open' ? 1 : -1 });
  line('influence', 'Influence', a.influence, b.influence, 1);
  return out;
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Record the visible moves between two snapshots as changes with a cause (for the report). */
function recordChanges(s: GameState, a: Snapshot, b: Snapshot, cause: string) {
  for (const i of impacts(a, b)) {
    if (i.key === 'influence') continue;
    const text = i.key === 'margin' ? marginText(i.before, i.after) : `${i.label} ${i.before} → ${i.after}`;
    s.changes.push({ round: s.round, key: i.key, text, cause, tone: i.tone });
  }
}

// ---------------------------------------------------------------- creation

export function createInitialState(seed: number): GameState {
  const h: RngHolder = { rng: seedToRng(seed) };
  const pace = weightedPick(h, T.pace.weights);
  const leakRounds: number[] = [];
  for (let r: number = T.leaks.firstRound; r <= T.rounds && leakRounds.length < LEAKS.length; r += randomInt(h, T.leaks.gapMin, T.leaks.gapMax)) leakRounds.push(r);
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
    roundEvent: null,
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
    tipping: null,
    ending: null,
    finalCooperation: null,
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
  if (s.aiPower >= D.truthHighPower) s.confidence.truth += D.truth;
  s.confidence.estimate += D.labReports;
  settleConfidence(s);
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
  if (reached(s, 'superhuman_coder') || s.threats.opaque.struck) set('incident', stageOf(s.aiPower, TT.incident.stages));
  set('ransomware', stageOf(s.aiPower * TT.ransomware.powerWeight + (s.europeAi === 'open' ? TT.ransomware.openBonus : 0), TT.ransomware.stages));
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
      return used(s, 'cyber_shield');
    case 'blackmail':
      return s.europeAi === 'open';
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
  out.push({ id: `m_${id}`, round: s.round, region: m.region, text: m.headline, at: 0, basis: m.basis });
  if (m.effect) {
    const a = snap(s);
    const key = m.effect.key === 'confidence' ? 'estimate' : m.effect.key;
    applyFx(s, [{ key: key as FxKey, amount: m.effect.amount }]);
    recordChanges(s, a, snap(s), m.effect.cause);
  }
}

/** The effects an event would have, given the state now (and the player's choice for silicon blackmail). */
function eventFx(s: GameState, id: EventId, choice?: string | null): Fx[] {
  const TT = T.threats;
  const prepared = id === 'job_shock_1' || id === 'job_shock_2' ? used(s, 'flexicurity') : isPrepared(s, id);
  switch (id) {
    case 'theft':
      return prepared
        ? [{ key: 'cooperation', amount: TT.theft.prepared.cooperation }]
        : [
            { key: 'aiPower', amount: TT.theft.unprepared.aiPower },
            { key: 'cooperation', amount: TT.theft.unprepared.cooperation },
          ];
    case 'opaque':
      return prepared ? [] : [{ key: 'marginMul', amount: TT.opaque.marginFactor }];
    case 'incident':
      return prepared
        ? [{ key: 'cooperation', amount: TT.incident.prepared.cooperation }]
        : [
            { key: 'estimate', amount: TT.incident.unprepared.estimate },
            { key: 'cohesion', amount: TT.incident.unprepared.cohesion },
          ];
    case 'ransomware':
      return [{ key: 'cohesion', amount: prepared ? TT.ransomware.prepared.cohesion : TT.ransomware.unprepared.cohesion }];
    case 'blackmail':
      if (prepared) return [];
      return choice === 'give_in' ? [{ key: 'europeAi', amount: 0, set: 'dependent' }] : [{ key: 'cohesion', amount: TT.blackmail.holdFirm.cohesion }];
    case 'job_shock_1':
    case 'job_shock_2':
      return [{ key: 'cohesion', amount: prepared ? T.jobShocks.softened : T.jobShocks.hit }];
  }
}

function buildEvent(s: GameState, id: EventId, h: RngHolder): PendingEvent {
  const def = EVENTS[id];
  const isJob = id === 'job_shock_1' || id === 'job_shock_2';
  const prepared = isJob ? used(s, 'flexicurity') : isPrepared(s, id);
  const preparedBy: CardId[] = isJob ? ['flexicurity'] : THREAT_BY_ID[id].protectedBy;
  const after = clone(s);
  applyFx(after, eventFx(s, id, 'hold_firm'));
  const options =
    id === 'blackmail' && !prepared
      ? [
          { id: 'give_in', label: 'Give in', detail: 'Drop the mandate’s teeth. Europe’s AI is locked to Dependent: you can no longer fund open models.' },
          { id: 'hold_firm', label: 'Hold firm', detail: `Keep the mandate and ride out the disruption: ${GAUGE_LABEL.cohesion} ${signed(T.threats.blackmail.holdFirm.cohesion)}.` },
        ]
      : [];
  return {
    id,
    round: s.round,
    at: 0.35 + random(h) * 0.3,
    region: def.region,
    title: def.title,
    headline: def.headline,
    scene: prepared ? def.scene.prepared : def.scene.unprepared,
    prepared,
    preparedBy,
    preparedText: prepared ? def.preparedText : def.unpreparedText,
    impacts: options.length ? [] : impacts(snap(s), snap(after)),
    options,
    fact: def.fact,
    basis: def.basis,
  };
}

/** Pick this round's event, if any: AI 2027 milestones first, then job shocks, then the other threats. */
function chooseEvent(s: GameState, h: RngHolder): EventId | null {
  const next = nextMilestone(s);
  if (next?.via && ripe(s, next.via)) return next.via;
  const J = T.jobShocks.at;
  if (s.jobShocks === 0 && s.aiPower >= J[0] && reached(s, 'ai_takes_jobs')) return 'job_shock_1';
  if (s.jobShocks === 1 && s.aiPower >= J[1] && reached(s, 'cheap_remote_worker')) return 'job_shock_2';
  if (ripe(s, 'incident')) {
    const I = T.threats.incident;
    const p = clamp(I.chanceBase + (I.chanceCenter - s.confidence.truth) * I.chancePerPoint, I.chanceMin, I.chanceMax);
    if (random(h) < p) return 'incident';
  }
  if (ripe(s, 'blackmail')) return 'blackmail';
  if (ripe(s, 'ransomware')) return 'ransomware';
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
  };
}

/** Lines used in the last few rounds are not repeated. */
function fresh(s: GameState, pool: MapLine[], kind: 'headlines' | 'voices'): MapLine[] {
  const recent = new Set(s.history.slice(-4).flatMap((r) => r[kind].map((x) => x.id)));
  const w = publicWorld(s);
  return pool.filter((l) => (!l.when || l.when(w)) && !recent.has(l.id));
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
    if (('round' in a && s.round >= a.round) || ('aiPower' in a && s.aiPower >= a.aiPower) || ('threatSeen' in a && s.threats[a.threatSeen].stage > 0) || ('jobShock' in a && s.jobShocks >= a.jobShock))
      add(c.id);
  }
}

function letterFor(s: GameState, h: RngHolder): LetterDef | null {
  const L = T.letters;
  if (s.round === L.r1) return pick(h, LEA_R1);
  if (s.round === L.r4) return pick(h, s.jobShocks > 0 || s.cohesion < 55 ? LEA_R4.hard : LEA_R4.calm);
  if (s.round === L.r8) return pick(h, used(s, 'flexicurity') ? LEA_R8.retrained : s.cohesion >= 50 ? LEA_R8.holding : LEA_R8.breaking);
  return null;
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

  // 2. six months: AI power rises, the race heats up, the labs report
  const r = rise(s, h);
  s.aiPower = clamp(s.aiPower + r);
  drift(s);
  const lines: MapItem[] = [];
  reachMilestones(s, lines);
  const stagesBefore = Object.fromEntries(THREAT_IDS.map((t) => [t, s.threats[t].stage]));
  threatStages(s);

  // 3. the round's event, if any (a threat that strikes may be an AI 2027 milestone)
  const evId = chooseEvent(s, h);
  if (evId) {
    s.event = buildEvent(s, evId, h);
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

  // 5. map content: milestone headlines first, threat headlines next, a world headline when there is room
  const milestoneLines = lines.filter((l) => l.id.startsWith('m_'));
  const threatLines = lines.filter((l) => l.id.startsWith('t_'));
  const heads = [...milestoneLines, ...threatLines.slice(0, Math.max(0, 2 - milestoneLines.length))];
  if (heads.length < 2) {
    const pool = shuffle(h, fresh(s, WORLD_HEADLINES, 'headlines'));
    for (const l of pool.slice(0, heads.length ? 1 : 2 - heads.length)) heads.push({ id: l.id, round: s.round, region: l.region, text: l.text, at: 0, basis: l.basis });
  }
  const slots = [0.12, 0.42, 0.72, 0.85, 0.92];
  s.headlines = heads.map((x, i) => ({ ...x, at: slots[Math.min(i, slots.length - 1)] }));
  const vpool = shuffle(h, fresh(s, VOICES, 'voices'));
  const nv = s.aiPower >= 40 ? 2 : 1;
  const eu = vpool.filter((v) => v.region === 'eu');
  const others = vpool.filter((v) => v.region !== 'eu');
  const voices = [eu[0], nv > 1 ? (s.round % 2 ? others[0] : eu[1]) ?? others[0] : undefined].filter((v): v is MapLine => !!v);
  s.voices = voices.map((v, i) => ({ id: v.id, round: s.round, region: v.region, text: v.text, at: 0.27 + i * 0.33, basis: v.basis }));

  // 6. a leak, every two or three rounds
  if (s.leakRounds.includes(s.round)) {
    const i = s.leaks.length;
    const def = LEAKS[i];
    const level: number = T.leaks.levels[i] ?? 3;
    const over = s.confidence.estimate - s.confidence.truth >= T.overconfidentGap;
    s.leak = {
      id: def.id,
      round: s.round,
      at: 0.55,
      level,
      readable: oversight(s) >= level,
      text: `${def.from}: ${over ? def.overconfident : def.honest}`,
      basis: def.basis,
    };
    s.leaks.push(s.leak);
  }

  // 7. Léa's letter
  const letter = letterFor(s, h);
  if (letter) s.letters.push({ slot: s.round === T.letters.r1 ? 'r1' : s.round === T.letters.r4 ? 'r4' : 'r8', round: s.round, id: letter.id });

  // 8. cards that arrive now
  arrive(s);
  s.rng = h.rng;
  return s;
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
    if (ev.id === 'incident' && ev.prepared) openOpportunity(s, 'summit');
    if (ev.id === 'theft' && s.coalition >= 1) openOpportunity(s, 'attribution');
  }
  s.event = null;
  s.roundEvent = { id: ev.id, title: ev.title, prepared: ev.prepared, choice: choice ?? null };
  return s;
}

function openOpportunity(s: GameState, id: 'summit' | 'attribution') {
  s.opportunities[id] = s.round + T.cards[id].rounds - 1;
  if (!s.hand.includes(id)) s.hand.push(id);
  s.arrivals[id] = s.round;
}

// ---------------------------------------------------------------- cards

function cardDef(id: CardId): CardDef {
  return CARD_BY_ID[id];
}

/** Why a card cannot be played now, or null. */
function blocked(s: GameState, id: CardId): string | null {
  if (s.phase !== 'play') return 'The game is over.';
  if (s.event) return 'Deal with the breaking news first.';
  if (!s.hand.includes(id)) return 'Not in your hand.';
  if ((s.uses[id] ?? 0) >= cardUses(id)) return 'Already used up.';
  if (id === 'open_models' && s.europeAiLocked) return 'Locked: Europe gave in to the labs.';
  if ((s.restUntil[id] ?? 0) >= s.round) return 'The envoys need a round of rest.';
  if (s.played.some((p) => p.id === id)) return 'Already played this round.';
  if (s.played.length >= 2) return 'Two cards already played this round.';
  const cost = cardCost(id, s.uses[id] ?? 0);
  if (cost > s.influence) return `Not enough Influence: costs ${cost}, you have ${s.influence}.`;
  return null;
}

function cardFx(s: GameState, p: Pick): Fx[] {
  const C = T.cards;
  switch (p.id) {
    case 'talks':
      return [
        { key: 'cooperation', amount: C.talks.cooperation },
        { key: 'cohesion', amount: C.talks.cohesion },
      ];
    case 'inspections':
      return [
        { key: 'truth', amount: C.inspections.truth },
        { key: 'estimate', amount: C.inspections.estimate },
        { key: 'margin', amount: C.inspections.margin + (used(s, 'ai_office') ? C.ai_office.inspectionsBonus : 0) },
        { key: 'cooperation', amount: C.inspections.cooperation },
      ];
    case 'ai_office':
      return [
        { key: 'marginMul', amount: C.ai_office.marginFactor },
        { key: 'cohesion', amount: C.ai_office.cohesion },
      ];
    case 'alignment':
      return [
        { key: 'truth', amount: C.alignment.truth },
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
        ...(p.option === 'access'
          ? [{ key: 'cohesion' as const, amount: C.asml.access.cohesion }]
          : [
              { key: 'truth' as const, amount: C.asml.safety.truth },
              { key: 'estimate' as const, amount: C.asml.safety.estimate },
            ]),
        { key: 'cooperation', amount: C.asml.cooperation },
      ];
    case 'weight_security':
      return [
        { key: 'europeAi', amount: 0, set: 'dependent' },
        { key: 'cohesion', amount: C.weight_security.cohesion },
      ];
    case 'open_models':
      return [
        { key: 'europeAi', amount: 0, set: 'open' },
        { key: 'cohesion', amount: C.open_models.cohesion },
        { key: 'estimate', amount: C.open_models.estimate },
        { key: 'truth', amount: C.open_models.truth },
      ];
    case 'flexicurity':
      return [{ key: 'cohesion', amount: C.flexicurity.cohesion }];
    case 'cyber_shield':
      return [{ key: 'cohesion', amount: C.cyber_shield.cohesion }];
    case 'oversight_mandate':
      return [
        { key: 'cohesion', amount: C.oversight_mandate.cohesion },
        { key: 'aiPower', amount: C.oversight_mandate.aiPower },
      ];
    case 'summit':
      return [
        { key: 'cooperation', amount: C.summit.cooperation },
        { key: 'truth', amount: C.summit.truth },
        { key: 'estimate', amount: C.summit.estimate },
      ];
    case 'attribution':
      return [{ key: 'cooperation', amount: C.attribution.cooperation }];
  }
}

export function playCard(state: GameState, p: Pick): GameState {
  const why = blocked(state, p.id);
  if (why) throw new Error(`${p.id}: ${why}`);
  const def = cardDef(p.id);
  if (def.options && !def.options.some((o) => o.id === p.option)) throw new Error(`${p.id}: choose one of ${def.options.map((o) => o.id).join(', ')}`);
  const s = clone(state);
  const n = s.uses[p.id] ?? 0;
  const name = def.levels ? def.levels[n] : def.name;
  s.influence -= cardCost(p.id, n);
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
    case 'oversight_mandate':
      if (s.europeAi === 'dependent' && s.threats.blackmail.stage === 0) s.threats.blackmail.stage = 1;
      break;
    case 'summit':
    case 'attribution':
      delete s.opportunities[p.id];
      break;
  }
  recordChanges(s, a, snap(s), name);
  // spent cards leave the hand
  if ((s.uses[p.id] ?? 0) >= cardUses(p.id)) s.hand = s.hand.filter((c) => c !== p.id);
  return s;
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
    if (why) return { ok: false, reason: why, cost, influenceAfter: s.influence, impacts: [], notes: [], headingBefore: heading(base).text, headingAfter: heading(base).text };
    const def = cardDef(p.id);
    const choice = def.options ? (p.option ?? def.options[0].id) : undefined;
    cost += cardCost(p.id, s.uses[p.id] ?? 0);
    s = playCard(s, { id: p.id, ...(choice ? { option: choice } : {}) });
  }
  const notes: string[] = [];
  for (const p of picks) {
    const def = cardDef(p.id);
    if (def.protects) notes.push(`Protects against ${THREAT_BY_ID[def.protects].name.replace(/^(\w)(?=[a-z])/, (x) => x.toLowerCase())}${p.id === 'inspections' || p.id === 'coalition' ? ' (with a coalition and the inspection accord)' : ''}.`);
    if (p.id === 'audit') notes.push(`Shows the true ${GAUGE_LABEL.confidence} for ${T.cards.audit.rounds} rounds.`);
    if (p.id === 'alignment') notes.push('Most of the gain is real safety that the estimate does not show.');
    if (p.id === 'flexicurity') notes.push(`Softens job shocks. Influence ${signed(T.cards.flexicurity.influence)} for the next ${T.cards.flexicurity.rounds} rounds.`);
    if (p.id === 'cyber_shield') notes.push(`Influence ${signed(T.cards.cyber_shield.influence)} for the next ${T.cards.cyber_shield.rounds} rounds.`);
    if (p.id === 'oversight_mandate' && base.europeAi === 'dependent') notes.push('The big labs will push back: a silicon blackmail threat appears.');
    if (p.id === 'open_models') notes.push('Ransomware gets easier: that threat grows faster.');
    if (p.id === 'coalition' && base.coalition + 1 === T.influence.coalitionLevel) notes.push('Allies share the load: Influence +1 every round from now on.');
    if (p.id === 'talks') notes.push('The envoys rest next round.');
  }
  return {
    ok: true,
    reason: null,
    cost,
    influenceAfter: s.influence,
    impacts: impacts(snap(base), snap(s)).filter((i) => i.key !== 'influence'),
    notes,
    headingBefore: heading(base).text,
    headingAfter: heading(s).text,
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
    changes: s.changes,
    decisions: s.played,
    letter: s.letters.find((l) => l.round === s.round)?.id ?? null,
  };
}

export function endRound(state: GameState): { state: GameState; outcome: 'next' | 'ended' } {
  if (state.event) throw new Error('resolve the event first');
  const s = clone(state);
  s.history.push(record(s));
  if (s.tipping || s.round >= T.rounds) {
    finish(s);
    return { state: s, outcome: 'ended' };
  }
  return { state: s, outcome: 'next' };
}

/** Which world the game ends in. */
function worldAtEnd(s: GameState): WorldId {
  if (s.tipping) return zoneOf(s.finalCooperation ?? s.cooperation);
  return s.europeAi === 'open' ? 'plateau_open' : 'plateau_labs';
}

function gaugeValueTrue(s: GameState, key: GaugeKey): number {
  return key === 'confidence' ? s.confidence.truth : key === 'cooperation' ? (s.finalCooperation ?? s.cooperation) : s[key];
}

function finish(s: GameState) {
  const h: RngHolder = { rng: s.rng };
  if (s.tipping) s.finalCooperation = clamp(s.cooperation + randomInt(h, -T.tippingNoise, T.tippingNoise));
  const world = worldAtEnd(s);
  const w = T.worlds[world];
  const good = gaugeValueTrue(s, w.decides) >= w.target && gaugeValueTrue(s, w.net) >= w.floor;
  s.ending = good ? WORLDS[world].good : WORLDS[world].bad;
  s.phase = 'ended';
  const variant = randomInt(h, 0, 1);
  s.letters.push({ slot: 'end', round: s.round, id: `end_${s.ending}_${variant}` });
  s.rng = h.rng;
}

// ---------------------------------------------------------------- views

/** The world the player is heading to, from public values only. */
function projectedWorld(s: GameState): WorldId {
  if (s.phase === 'ended' && s.ending) return ENDING_BY_ID[s.ending].world;
  if (s.tipping) return zoneOf(s.cooperation);
  const left = T.rounds - s.round;
  const reach = s.aiPower + s.lastRise * left * 1.15;
  if (s.round >= 4 && reach < T.tippingAt) return s.europeAi === 'open' ? 'plateau_open' : 'plateau_labs';
  return zoneOf(s.cooperation);
}

const audited = (s: GameState) => s.round > 0 && s.round <= s.auditUntil;

function shown(s: GameState, key: GaugeKey): { text: string; low: number; high: number } {
  if (key === 'confidence') {
    const c = s.confidence;
    if (audited(s)) return { text: `${c.truth} (audited)`, low: c.truth, high: c.truth };
    return { text: `${c.estimate} ± ${c.margin}`, low: c.estimate - c.margin, high: c.estimate + c.margin };
  }
  const v = s[key];
  return { text: String(v), low: v, high: v };
}

export function heading(s: GameState): HeadingView {
  const world = projectedWorld(s);
  const w = T.worlds[world];
  const def = WORLDS[world];
  const d = shown(s, w.decides);
  const n = shown(s, w.net);
  const met = (x: { low: number; high: number }, bar: number) => (x.low >= bar ? 'yes' : x.high < bar ? 'no' : 'maybe') as 'yes' | 'no' | 'maybe';
  const plateau = world === 'plateau_open' || world === 'plateau_labs';
  const name = def.name;
  const text = `Heading: ${name}${plateau ? ' (AI is stalling)' : ''}. Goal: ${GAUGE_LABEL[w.decides]} ${w.target} (you: ${d.text}). Keep ${GAUGE_LABEL[w.net]} above ${w.floor} (you: ${n.text}).`;
  return {
    world,
    name,
    decides: { key: w.decides, label: GAUGE_LABEL[w.decides], target: w.target, you: d.text, met: met(d, w.target) },
    net: { key: w.net, label: GAUGE_LABEL[w.net], floor: w.floor, you: n.text, met: met(n, w.floor) },
    text,
  };
}

/**
 * "At this pace: in about 3–5 rounds". Built only from what the player sees: AI capabilities now, their rise over
 * the last six months, the round and the public rule that the tipping point never comes before round 6.
 * Never from the hidden pace (a test checks it).
 */
export function tippingEstimate(s: GameState): string | null {
  if (s.tipping) return 'AI has reached the tipping point.';
  if (s.round < 1 || s.phase !== 'play') return null;
  const left = T.rounds - s.round;
  if (left <= 0) return 'Last round: AI will not tip this game.';
  const gap = Math.max(0, T.tippingAt - s.aiPower);
  const rate = Math.max(1, s.lastRise);
  const n = gap / rate;
  const notBefore = Math.max(1, T.earliestTipping - s.round);
  const lo = Math.max(notBefore, Math.floor(n * T.eta.low));
  const hi = Math.max(lo, Math.ceil(n * T.eta.high));
  if (lo > left) return 'At this pace: not before the end of 2032. AI may stall.';
  const r = (x: number) => `${x} round${x > 1 ? 's' : ''}`;
  if (hi > left) return `At this pace: in ${lo === left ? 'the last round' : `${lo} round${lo > 1 ? 's' : ''} or more`}, or never.`;
  return `At this pace: in about ${lo === hi ? r(lo) : `${lo}–${r(hi)}`}.`;
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
      target: key === 'aiPower' ? T.tippingAt : hd.decides.key === key ? hd.decides.target : hd.net.key === key ? hd.net.floor : null,
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
      protectedByNames: t.protectedBy.map((c) => (c === 'inspections' ? 'Inspection accord (level 2)' : CARD_BY_ID[c].name)).join(' and '),
      gauge: t.gauge,
    };
  });
}

export function report(s: GameState): ReportView {
  // the three biggest changes with a cause; threat stage moves are listed with the threats
  const score = (c: Change) => {
    const m = /(-?\d+) → (-?\d+)/.exec(c.text.replace(/±/g, ''));
    return m ? Math.abs(Number(m[2]) - Number(m[1])) : 0;
  };
  const changes = s.changes
    .filter((c) => c.key !== 'threat')
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
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
      for (const i of pv.impacts) {
        const d = Number(i.after) - Number(i.before);
        if (i.key === 'cooperation') parts.coop += d * w.coop;
        else if (i.key === 'confidence') parts.conf += d * w.conf;
        else if (i.key === 'margin') parts.conf -= d * w.conf;
        else if (i.key === 'cohesion') parts.coh += d * w.coh;
        else if (i.key === 'europeAi') parts.coh += (i.after === 'Open' ? 1 : -1) * (plateau ? 4 : 0.5);
      }
      if (cv.id === 'alignment') parts.conf += 4 * w.conf;
      if (cv.id === 'flexicurity' && s.jobShocks < 2) parts.coh += 6 * w.coh;
      if (cv.id === 'flexicurity' || cv.id === 'cyber_shield') parts.coh -= 2;
      if (cv.id === 'audit') parts.conf += s.confidence.margin >= 12 ? 3 * w.conf : -1;
      if (cv.id === 'oversight_mandate' && s.europeAi === 'dependent') parts.coh -= plateau ? 4 : 2;
      if (cv.id === 'coalition' && s.coalition === 1) parts.coop += 3;
      if (cv.opportunity) parts.opportunity += 2;
      for (const t of seen) {
        const protects = t.protectedBy.includes(cv.id) && !(cv.id === 'coalition' && s.coalition >= 1) && !(cv.id === 'inspections' && s.inspections >= 2);
        if (protects) {
          parts.threat += t.stage * (t.id === 'incident' ? 2 : 4) + (t.certainty === 'likely' ? 2 : 0);
          threat = threat && threat.stage >= t.stage ? threat : t;
        }
      }
      if (cv.id === 'open_models' && seen.some((t) => t.id === 'blackmail')) {
        parts.threat += 8;
        threat = seen.find((t) => t.id === 'blackmail')!;
      }
      const v = Object.values(parts).reduce((a, b) => a + b, 0);
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
  const all = [...LEA_R1, ...LEA_R4.hard, ...LEA_R4.calm, ...LEA_R8.retrained, ...LEA_R8.holding, ...LEA_R8.breaking];
  return all.find((l) => l.id === id) ?? null;
}

export function letters(s: GameState): LetterView[] {
  return s.letters.map((l) => {
    if (l.slot === 'end') {
      const m = /^end_(.+)_(\d)$/.exec(l.id)!;
      const ending = m[1] as EndingId;
      return { slot: 'end', round: l.round, id: l.id, mood: LEA_END_MOOD(ending), text: LEA_END[ending][Number(m[2])], basis: LEA_END_BASIS(ending) };
    }
    const d = letterDef(l.id)!;
    return { slot: l.slot, round: l.round, id: l.id, mood: d.mood, text: d.text, basis: d.basis };
  });
}

const WORLD_NOUN: Record<WorldId, string> = {
  pause: 'a pause',
  race: 'a race',
  rupture: 'a rupture',
  plateau_open: 'a plateau with open models',
  plateau_labs: 'a plateau with big labs',
};

export function ending(s: GameState): EndingView {
  if (s.phase !== 'ended' || !s.ending) throw new Error('the game has not ended');
  const def = ENDING_BY_ID[s.ending];
  const world = def.world;
  const wd = WORLDS[world];
  const w = T.worlds[world];
  const c = s.confidence;
  const seen = `you saw ${c.estimate} ± ${c.margin}`;
  const val = (k: GaugeKey) => gaugeValueTrue(s, k);
  const label = (k: GaugeKey) => GAUGE_LABEL[k];
  const withSeen = (k: GaugeKey) => (k === 'confidence' && (c.estimate !== c.truth || c.margin > 0) ? ` (${seen})` : '');
  const dv = val(w.decides);
  const nv = val(w.net);
  const dOk = dv >= w.target;
  const nOk = nv >= w.floor;
  const tail = `: ${def.title.charAt(0).toLowerCase()}${def.title.slice(1)}.`;
  let sentence: string;
  if (!dOk) sentence = `${wd.how}. ${label(w.decides)} was ${dv}${withSeen(w.decides)}, below the ${w.target} ${WORLD_NOUN[world]} needs${tail}`;
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
    seen: k === 'confidence' ? `${c.estimate} ± ${c.margin}` : null,
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
  if (!dOk) cf.push(shortfall(w.decides, w.target - dv));
  else if (!nOk) cf.push(shortfall(w.net, w.floor - nv));
  else if (dv - w.target <= 4) cf.push(`It was close: ${label(w.decides)} cleared the bar by only ${dv - w.target}.`);
  for (const t of THREATS) {
    const st = s.threats[t.id];
    if (st.struck && st.prepared === false && t.id !== 'blackmail' && cf.length < 3)
      cf.push(`The ${t.name.replace(/^(\w)(?=[a-z])/, (x) => x.toLowerCase())} caught Europe unprepared. ${t.protectedBy.map((x) => (x === 'inspections' ? 'the inspection accord' : CARD_BY_ID[x].name)).join(' and ')} would have changed that.`);
  }
  if (!s.tipping && world !== 'plateau_open' && !s.europeAiLocked && T.worlds.plateau_open.decides === w.decides)
    cf.push('Funding open models would have made this a plateau with open models: same bar, but no silicon blackmail.');

  const decisions = s.history.flatMap((r) =>
    r.decisions.map((p) => {
      const def = CARD_BY_ID[p.id];
      const nth = s.history.filter((x) => x.round < r.round).flatMap((x) => x.decisions).filter((x) => x.id === p.id).length;
      const ups: Chip[] = p.option && def.options ? def.options.find((o) => o.id === p.option)!.ups : def.ups;
      return { round: r.round, date: dateLabel(r.round), name: def.levels ? def.levels[nth] : def.name, ups, downs: def.downs };
    }),
  );
  const threatList = THREATS.filter((t) => s.threats[t.id].stage > 0 || s.threats[t.id].struck).map((t) => ({
    id: t.id,
    name: t.name,
    struck: s.threats[t.id].struck,
    prepared: s.threats[t.id].struck ? s.threats[t.id].prepared : isPrepared(s, t.id),
    by: t.protectedBy.map((x) => (x === 'inspections' ? 'Inspection accord' : CARD_BY_ID[x].name)).join(' and '),
  }));
  return {
    id: s.ending,
    title: def.title,
    good: def.good,
    world,
    worldName: wd.name,
    dateLabel: dateLabel(s.round),
    story: def.story,
    sentence,
    gauges: gaugesEnd,
    reveal: {
      truth: c.truth,
      estimate: c.estimate,
      margin: c.margin,
      low: clamp(c.estimate - c.margin),
      high: clamp(c.estimate + c.margin),
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
    lea: letters(s).find((l) => l.slot === 'end')!,
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
    const m = /±(\d+) → ±(\d+)/.exec(ch.text);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b <= a) continue;
    const verb = b >= a * 1.8 ? 'doubled' : 'widened';
    const text =
      ch.cause === EVENTS.opaque.title
        ? `${THREAT_BY_ID.opaque.name} ${verb} your uncertainty (±${a} → ±${b}).`
        : `${ch.cause}: that ${verb} your uncertainty (±${a} → ±${b}).`;
    out.push({ text, by: b - a });
  }
  return out.sort((x, y) => y.by - x.by).slice(0, 3).map((x) => x.text);
}

function shortfall(key: GaugeKey, gap: number): string {
  if (key === 'confidence')
    return `${GAUGE_LABEL.confidence} needed ${gap} more point${gap > 1 ? 's' : ''}. Alignment research raises the real value; the AI Office, inspections and audits show you where it stands.`;
  if (key === 'cohesion')
    return `${GAUGE_LABEL.cohesion} needed ${gap} more point${gap > 1 ? 's' : ''}. Flexicurity, the oversight mandate and open models lift it; a cyber shield and flexicurity protect it from shocks.`;
  return `${GAUGE_LABEL[key]} needed ${gap} more.`;
}

export function journal(s: GameState): JournalRound[] {
  const rounds = [...s.history];
  if (s.round > 0 && !rounds.some((r) => r.round === s.round)) rounds.push(record(s));
  const ls = letters(s);
  return rounds.map((r) => ({
    round: r.round,
    date: dateLabel(r.round),
    headlines: r.headlines.map((x) => x.text),
    voices: r.voices.map((x) => x.text),
    event: r.event ? `${r.event.title}${r.event.prepared === null ? '' : r.event.prepared ? ' (prepared)' : ' (unprepared)'}` : null,
    leak: r.leak ? (r.leak.readable || s.phase === 'ended' ? r.leak.text : 'A leak you could not read (redacted).') : null,
    changes: r.changes.map((c) => `${c.text}: ${c.cause}`),
    decisions: r.decisions.map((p) => CARD_BY_ID[p.id].name + (p.option ? ` (${CARD_BY_ID[p.id].options!.find((o) => o.id === p.option)!.label})` : '')),
    letter: ls.find((l) => l.round === r.round && l.slot !== 'end')?.text ?? null,
  }));
}

export const engine: EngineApi = {
  createInitialState,
  startRound,
  resolveEvent,
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
  journal,
  dateLabel,
};
