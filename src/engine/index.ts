// Takeoff: Middle Power — game engine.
// Pure functions implementing EngineApi (src/engine/api.ts). No DOM, no Math.random:
// all randomness comes from the seeded generator whose state lives in GameState.rng.
// Every exported function clones its input and returns a new state.
// Rules: docs/DEVELOPER_NOTES.md (with the documented tuning changes). Content: src/data.

import type { EngineApi } from './api';
import type {
  AdvisorView,
  DashboardKey,
  DashboardView,
  IncomeView,
  JournalEntry,
  RiskView,
  Tip,
  TrajectoryView,
  ActorId,
  Briefing,
  CardId,
  CardPreview,
  CardView,
  Debrief,
  Delta,
  EndingId,
  EndingView,
  EuKey,
  EventId,
  EventOption,
  GameState,
  GaugeKey,
  GaugeView,
  LeaScene,
  LogEntry,
  NewsItem,
  InternalNote,
  PlanId,
  QuarterOutcome,
  RegionId,
  SituationReport,
  Speed,
  StatKey,
  WorldKind,
} from './types';
import { random, randomInt, seedToRng, shuffle, weightedPick } from './rng';
import type { Condition } from '../data/conditions';
import type { CardDef, CardOptionDef, ConditionalText, EffectSpec, EventDef } from '../data/schema';
import { CARDS, CARD_BY_ID } from '../data/cards';
import { EVENTS, EVENT_BY_ID } from '../data/events';
import { GAUGES, GAUGE_INFO } from '../data/gauges';
import { ACTOR_RULES, NEWS } from '../data/news';
import { NOTES } from '../data/notes';
import { PLANS, PLAN_BY_ID, LEVERS } from '../data/plans';
import { ENDING_BY_ID, EPILOGUES } from '../data/endings';
import { LEA_END, LEA_ENDING_LINE, LEA_Q1, LEA_Q11, LEA_Q6 } from '../data/lea';
import { FIRST_YEAR, GOAL_LINE, PLAN_LIKELY, REGION_NAMES } from '../data/text';
import { TUNING } from '../data/tuning';

// ---------------------------------------------------------------------------
// Constants and small helpers
// ---------------------------------------------------------------------------

export const GAUGE_KEYS: GaugeKey[] = [
  'capability',
  'concentration',
  'apparentAlignment',
  'trueAlignment',
  'verification',
  'tension',
  'misuse',
  'publicPressure',
  'gdp',
  'approval',
];
const VISIBLE_GAUGES: GaugeKey[] = GAUGE_KEYS.filter((k) => k !== 'trueAlignment');
const EU_KEYS: EuKey[] = ['economy', 'culture', 'state'];
const PLAN_IDS: PlanId[] = ['verified_slowdown', 'shut_down', 'fight_china', 'race'];

const STAT_LABELS: Record<StatKey, string> = {
  capability: 'capability',
  concentration: 'concentration',
  apparentAlignment: 'apparent alignment',
  trueAlignment: 'true alignment',
  verification: 'verification',
  tension: 'tension',
  misuse: 'misuse risk',
  publicPressure: 'public pressure',
  gdp: 'GDP',
  approval: 'approval',
  coalition: 'coalition',
  pc: 'PC',
  budget: 'Budget',
  'eu.economy': 'human influence over the economy',
  'eu.culture': 'human influence over culture',
  'eu.state': 'human influence over the state',
};

const deepClone = <T>(x: T): T => structuredClone(x);

/**
 * Copy a state for a pure update. Log, news and note entries are immutable once created
 * (the engine never edits them in place), so arrays are copied and entries shared.
 * Everything the engine edits in place (gauges, flags, firedEvents entries...) is copied.
 */
function cloneState(s: GameState): GameState {
  const firedEvents: GameState['firedEvents'] = {};
  for (const [k, v] of Object.entries(s.firedEvents)) firedEvents[k as EventId] = { ...v! };
  return {
    ...s,
    gauges: { ...s.gauges },
    eu: { ...s.eu },
    flags: { ...s.flags },
    cardsPlayed: { ...s.cardsPlayed },
    firedEvents,
    pending: s.pending.map((d) => ({ ...d })),
    news: s.news.slice(),
    notes: s.notes.slice(),
    log: s.log.slice(),
    quarterStart: { ...s.quarterStart, gauges: { ...s.quarterStart.gauges } },
    tipping: s.tipping ? { ...s.tipping, odds: { ...s.tipping.odds } } : null,
  };
}

function isHiddenKey(key: StatKey): boolean {
  return key === 'trueAlignment' || key.startsWith('eu.');
}

function fmtDelta(d: Delta): string {
  return `${STAT_LABELS[d.key]} ${d.amount > 0 ? '+' : '−'}${Math.abs(d.amount)}`;
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

// ---------------------------------------------------------------------------
// Stats and conditions
// ---------------------------------------------------------------------------

function getStat(s: GameState, key: StatKey): number {
  if (key === 'coalition') return s.coalition;
  if (key === 'pc') return s.pc;
  if (key === 'budget') return s.budget;
  if (key.startsWith('eu.')) return s.eu[key.slice(3) as EuKey];
  return s.gauges[key as GaugeKey];
}

function clampFor(key: StatKey, v: number): number {
  if (key === 'coalition') return Math.max(0, Math.min(3, v));
  if (key === 'pc' || key === 'budget') return Math.max(0, v);
  return Math.max(0, Math.min(100, v));
}

/** Apply a change with clamping; returns the delta actually applied (amount may be 0). */
function change(s: GameState, key: StatKey, amount: number): Delta {
  const before = getStat(s, key);
  const after = clampFor(key, before + amount);
  if (key === 'coalition') s.coalition = after;
  else if (key === 'pc') s.pc = after;
  else if (key === 'budget') s.budget = after;
  else if (key.startsWith('eu.')) s.eu[key.slice(3) as EuKey] = after;
  else s.gauges[key as GaugeKey] = after;
  return { key, amount: after - before, hidden: isHiddenKey(key) };
}

function euAverage(s: GameState): number {
  return (s.eu.economy + s.eu.culture + s.eu.state) / 3;
}

function lookup(s: GameState, key: string): number | string | boolean {
  if (key.startsWith('flags.')) return s.flags[key.slice(6) as keyof GameState['flags']];
  if (key.startsWith('played.')) return s.cardsPlayed[key.slice(7) as CardId] ?? 0;
  if (key.startsWith('fired.')) return s.firedEvents[key.slice(6) as EventId] ? 1 : 0;
  if (key.startsWith('prepared.')) return s.firedEvents[key.slice(9) as EventId]?.prepared ? 1 : 0;
  if (key.startsWith('choice.')) return s.firedEvents[key.slice(7) as EventId]?.choice ?? '';
  if (key.startsWith('start.')) {
    const k = key.slice(6);
    if (k === 'coalition') return s.quarterStart.coalition;
    return s.quarterStart.gauges[k as GaugeKey];
  }
  switch (key) {
    case 'quarter':
      return s.quarter;
    case 'asmlTokens':
      return s.asmlTokens;
    case 'revealUntil':
      return s.revealUntil;
    case 'speed':
      return s.takeoffSpeed;
    case 'alignmentGap':
      return s.gauges.apparentAlignment - s.gauges.trueAlignment;
    case 'eu.average':
      return euAverage(s);
  }
  if (key === 'coalition' || key === 'pc' || key === 'budget' || key.startsWith('eu.') || (GAUGE_KEYS as string[]).includes(key)) {
    return getStat(s, key as StatKey);
  }
  throw new Error(`Unknown condition key: ${key}`);
}

export function evalCondition(s: GameState, cond: Condition): boolean {
  if ('all' in cond) return cond.all.every((x) => evalCondition(s, x));
  if ('any' in cond) return cond.any.some((x) => evalCondition(s, x));
  if ('not' in cond) return !evalCondition(s, cond.not);
  const v = lookup(s, cond.key);
  const w = cond.value;
  switch (cond.op) {
    case '<':
      return (v as number) < (w as number);
    case '<=':
      return (v as number) <= (w as number);
    case '>':
      return (v as number) > (w as number);
    case '>=':
      return (v as number) >= (w as number);
    case '==':
      return v === w;
    case '!=':
      return v !== w;
  }
}

/** Evaluate every condition first, then apply: effects never depend on each other's order. */
function applyEffects(s: GameState, specs: EffectSpec[]): Delta[] {
  const active = specs.filter((e) => !e.when || evalCondition(s, e.when));
  return active.map((e) => change(s, e.key, e.amount)).filter((d) => d.amount !== 0);
}

function pickText(s: GameState, texts: ConditionalText[]): string {
  return (texts.find((t) => !t.when || evalCondition(s, t.when)) ?? texts[texts.length - 1]).text;
}

function addLog(s: GameState, entry: Omit<LogEntry, 'quarter'> & { quarter?: number }): void {
  s.log.push({ quarter: s.quarter, ...entry } as LogEntry);
}

function splitDeltas(deltas: Delta[]): { visible: Delta[]; hidden: Delta[] } {
  return { visible: deltas.filter((d) => !d.hidden), hidden: deltas.filter((d) => d.hidden) };
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function dateLabel(quarter: number): string {
  const q = Math.max(1, quarter);
  return `Q${((q - 1) % 4) + 1} ${FIRST_YEAR + Math.floor((q - 1) / 4)}`;
}

export function goalLine(): string {
  return GOAL_LINE;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createInitialState(seed: number): GameState {
  const holder = { rng: seedToRng(seed) };
  const takeoffSpeed = weightedPick<Speed>(holder, TUNING.start.speedOdds);
  const gauges = { ...TUNING.start.gauges };
  return {
    seed,
    rng: holder.rng,
    phase: 'quarter',
    quarter: 1,
    gauges,
    coalition: 0,
    eu: { ...TUNING.start.eu },
    takeoffSpeed,
    pc: TUNING.start.pc,
    budget: TUNING.start.budget,
    asmlTokens: TUNING.start.asmlTokens,
    flags: {
      aiOffice: false,
      openModels: false,
      oversightMandate: false,
      flexicurity: false,
      weightSecurity: false,
      cyberDefence: false,
      exportControls: false,
      warningShotPrepared: false,
      alignmentErrorDoubled: false,
    },
    cardsPlayed: {},
    firedEvents: {},
    pendingEvent: null,
    pending: [],
    revealUntil: 0,
    bubblesThisQuarter: 0,
    decidedThisQuarter: false,
    news: [],
    notes: [],
    log: [],
    quarterStart: { gauges: { ...gauges }, coalition: 0, pc: TUNING.start.pc, budget: TUNING.start.budget },
    tipping: null,
    ending: null,
    // v2 (stub values: the engine agent implements acts, unlocks and the rest)
    act: 1,
    unlockedCards: CARDS.map((c) => c.id),
    contextCards: [],
    cardLastPlayed: {},
    dashboard: { cap: 4, slots: ['capability', 'apparentAlignment', 'verification', 'tension'], milestones: [] },
    notices: [],
    tipsShown: [],
    concerns: [],
    leaLetters: [],
    history: [],
    oddsHistory: [],
  };
}

// ---------------------------------------------------------------------------
// The quarter loop
// ---------------------------------------------------------------------------

function quarterStarted(s: GameState): boolean {
  return s.log.some((e) => e.quarter === s.quarter && e.kind === 'drift');
}

function applyIncome(s: GameState): void {
  const inc = TUNING.income;
  const deltas: Delta[] = [];
  const pcGain = inc.pc + (s.gauges.publicPressure >= inc.highPressureAt ? inc.pcHighPressureBonus : 0);
  deltas.push(change(s, 'pc', pcGain), change(s, 'budget', inc.budget));
  addLog(s, {
    kind: 'income',
    id: 'income',
    actor: 'eu',
    title: pcGain > inc.pc ? 'Income (public pressure is high: extra PC)' : 'Income',
    visibleDeltas: deltas.filter((d) => d.amount !== 0),
    hiddenDeltas: [],
    briefing: `New quarter: +${pcGain} PC, +${inc.budget} Budget.`,
    debrief: 'Quarterly income.',
  });

  if (s.coalition >= 1) {
    // Upkeep is paid per partner level; partners you cannot pay for drift away.
    const lost: Delta[] = [];
    while (s.coalition > 0 && s.pc < s.coalition * inc.coalitionUpkeep) lost.push(change(s, 'coalition', -1));
    if (lost.length) {
      addLog(s, {
        kind: 'income',
        id: 'upkeep_unpaid',
        actor: 'eu',
        title: 'Coalition upkeep unpaid',
        visibleDeltas: [{ key: 'coalition', amount: lost.reduce((a, d) => a + d.amount, 0), hidden: false }],
        hiddenDeltas: [],
        briefing: 'You could not pay the coalition upkeep. A partner drifted away.',
        debrief: 'Upkeep went unpaid, so the coalition shrank.',
      });
    }
    if (s.coalition > 0) {
      const d = change(s, 'pc', -s.coalition * inc.coalitionUpkeep);
      addLog(s, {
        kind: 'income',
        id: 'upkeep',
        actor: 'eu',
        title: 'Coalition upkeep',
        visibleDeltas: [d],
        hiddenDeltas: [],
        briefing: `Keeping partners on board cost ${-d.amount} PC.`,
        debrief: 'Coalition upkeep.',
      });
    }
  }

  if (s.pending.length) {
    const lastCard = [...s.log].reverse().find((e) => e.kind === 'card' && e.quarter === s.quarter - 1);
    const card = lastCard ? CARD_BY_ID[lastCard.id as CardId] : undefined;
    const deltas2 = s.pending.map((p) => change(s, p.key, p.amount)).filter((d) => d.amount !== 0);
    const { visible, hidden } = splitDeltas(deltas2);
    addLog(s, {
      kind: 'income',
      id: 'pending',
      actor: 'eu',
      title: card?.pending ? `${card.name}: delayed effect` : 'Delayed effects',
      visibleDeltas: visible,
      hiddenDeltas: hidden,
      briefing: visible.map(fmtDelta).join(', '),
      debrief: 'Delayed effects of last quarter’s decision.',
    });
    s.pending = [];
  }
}

function runActors(s: GameState): void {
  const a = TUNING.actors;
  const r1 = ACTOR_RULES.labs_report;
  addLog(s, {
    kind: 'actor',
    id: r1.id,
    actor: r1.actor,
    title: r1.title,
    visibleDeltas: [change(s, 'apparentAlignment', a.labAlignmentClaim)].filter((d) => d.amount !== 0),
    hiddenDeltas: [],
    briefing: r1.briefing,
    debrief: r1.debrief,
  });
  const r2 = ACTOR_RULES.labs_consolidate;
  addLog(s, {
    kind: 'actor',
    id: r2.id,
    actor: r2.actor,
    title: r2.title,
    visibleDeltas: [change(s, 'concentration', a.labConsolidation)].filter((d) => d.amount !== 0),
    hiddenDeltas: [],
    briefing: r2.briefing,
    debrief: r2.debrief,
  });
  if (s.gauges.tension >= a.chipControlsAt && !s.flags.exportControls) {
    const r3 = ACTOR_RULES.us_chip_controls;
    s.flags.exportControls = true;
    addLog(s, {
      kind: 'actor',
      id: r3.id,
      actor: r3.actor,
      title: r3.title,
      visibleDeltas: [change(s, 'tension', a.chipControlsTension)].filter((d) => d.amount !== 0),
      hiddenDeltas: [],
      briefing: r3.briefing,
      debrief: r3.debrief,
    });
  }
}

/** Halve a per-quarter loss, alternating rounding so the long-run average is exactly half. */
function halve(amount: number, quarter: number): number {
  const m = Math.abs(amount);
  const half = quarter % 2 === 0 ? Math.floor(m / 2) : Math.ceil(m / 2);
  return Math.sign(amount) * half;
}

function runDrift(s: GameState): void {
  const d = TUNING.drift;
  const g = { ...s.gauges }; // conditions read the values before drift
  const highTension = g.tension >= d.highTensionAt;
  const drift = (id: string, actor: ActorId, title: string, effects: [StatKey, number][], debrief: string) => {
    const deltas = effects.filter(([, n]) => n !== 0).map(([k, n]) => change(s, k, n)).filter((x) => x.amount !== 0);
    const { visible, hidden } = splitDeltas(deltas);
    if (!visible.length && !hidden.length) return;
    addLog(s, { kind: 'drift', id, actor, title, visibleDeltas: visible, hiddenDeltas: hidden, briefing: title, debrief });
  };

  drift(
    'capability',
    'ai_systems',
    highTension ? 'AI keeps improving, faster under high tension' : 'AI keeps improving',
    [['capability', d.capability[s.takeoffSpeed] + (highTension ? d.capabilityHighTension : 0)]],
    'Capability grew every quarter, at a pace set by the hidden takeoff speed.',
  );
  drift(
    'safety_corners',
    'us_labs',
    highTension ? 'Labs cut safety corners to win the race' : 'Safety work lags behind capability',
    [['trueAlignment', highTension ? d.trueAlignmentHighTension : d.trueAlignment]],
    'Every quarter without enough safety work, the AIs drifted further from what people intend; faster when tension was high.',
  );
  const coalitionCools = s.coalition >= d.coalitionCoolsAt;
  drift(
    'tension',
    coalitionCools ? 'eu' : 'china',
    coalitionCools ? 'Coalition diplomacy cools tension' : 'The race heats up',
    [['tension', coalitionCools ? d.tensionWithCoalition : d.tension]],
    coalitionCools ? 'With two partners or more, coalition diplomacy cooled tension every quarter.' : 'Tension rose a little every quarter.',
  );
  const econ = g.capability >= d.euHighCapabilityAt ? d.euEconomyHighCapability : d.euEconomy;
  const state = g.capability >= d.euStateHighCapabilityAt ? d.euStateHighCapability : d.euState;
  const mandate = s.flags.oversightMandate;
  drift(
    'eu_influence',
    'ai_systems',
    mandate ? 'AI takes over tasks in Europe (slowed by the oversight mandate)' : 'AI takes over tasks in Europe',
    [
      ['eu.economy', mandate ? halve(econ, s.quarter) : econ],
      ['eu.culture', g.capability >= d.euHighCapabilityAt ? d.euCultureHighCapability : d.euCulture],
      ['eu.state', mandate ? halve(state, s.quarter) : state],
    ],
    'Every quarter, AI quietly replaced people in Europe’s firms, culture and administration.',
  );
  const misuse = (g.capability >= d.misuseFromCapability ? d.misuse : d.misuseEarly) + (s.flags.openModels ? d.misuseOpenModels : 0);
  drift(
    'misuse',
    'open_source',
    s.flags.openModels
      ? 'Open models spread, criminals included'
      : g.capability >= d.misuseFromCapability
        ? 'Capable AI is easier to misuse'
        : 'AI tools spread',
    [['misuse', misuse]],
    'Misuse risk grew every quarter: faster once AI was capable, and faster again once open models were everywhere.',
  );
  const jobs = g.capability >= d.jobsAt;
  drift(
    'economy',
    jobs ? 'us_labs' : 'eu',
    jobs ? 'AI adoption reshapes jobs' : 'AI adoption lifts GDP',
    [
      ['gdp', d.gdp + (jobs ? d.gdpHighCapability : 0)],
      ['approval', jobs && !s.flags.flexicurity ? d.approval : 0],
      ['publicPressure', jobs ? d.publicPressureJobs : d.publicPressure],
    ],
    'AI adoption lifted GDP and slowly raised public concern; once capability passed 50, layoffs cost approval and raised public pressure faster.',
  );
}

function fireEvent(s: GameState, def: EventDef): void {
  const prepared = evalCondition(s, def.preparedWhen);
  const v = prepared ? def.prepared : def.unprepared;
  const visibleSpecs = v.effects;
  const deltas = applyEffects(s, [...visibleSpecs, ...v.hiddenEffects]);
  if (v.setFlags) Object.assign(s.flags, v.setFlags);
  s.firedEvents[def.id] = { quarter: s.quarter, prepared };
  const { visible, hidden } = splitDeltas(deltas);
  const options: EventOption[] = v.options.map((o) => ({
    id: o.id,
    label: o.label,
    description: o.description,
    preview: o.effects.map((e) => ({ key: e.key, amount: e.amount, hidden: isHiddenKey(e.key) })).filter((d) => !d.hidden),
  }));
  s.pendingEvent = {
    id: def.id,
    actor: def.actor,
    region: def.region,
    title: def.title,
    prepared,
    scene: v.scene,
    whyItMatters: def.whyItMatters,
    alreadyReal: deepClone(def.alreadyReal),
    appliedDeltas: visible,
    options,
    at: def.at,
  };
  addLog(s, {
    kind: 'event',
    id: def.id,
    actor: def.actor,
    title: capitalise(v.short),
    visibleDeltas: visible,
    hiddenDeltas: hidden,
    briefing: `${def.title}: ${v.short} (${prepared ? 'prepared' : 'unprepared'}).`,
    debrief: `${v.debrief} You were ${prepared ? 'prepared' : 'not prepared'}: ${v.cause}.`,
  });
  s.news.push({ id: `event.${def.id}`, quarter: s.quarter, actor: def.actor, region: def.region, text: v.news, at: def.at });
}

function capitalise(x: string): string {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/** Lower-case the first letter unless the text starts with an acronym ("AI", "US"). */
function lowerFirst(x: string): string {
  return /^[A-Z]{2}/.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1);
}

function checkEvents(s: GameState): void {
  for (const def of EVENTS) {
    if (s.firedEvents[def.id]) continue;
    if (evalCondition(s, def.trigger)) {
      fireEvent(s, def);
      return; // at most one per quarter
    }
  }
}

function lastQuarterCard(s: GameState): LogEntry | undefined {
  return s.log.find((e) => e.kind === 'card' && e.quarter === s.quarter - 1);
}

function generateNews(s: GameState): void {
  const holder = { rng: s.rng };
  const used = new Set(s.news.map((n) => n.id));
  type Draft = Omit<NewsItem, 'at'> & { at?: number };
  const must: Draft[] = [];
  const q = s.quarter;

  // The world's reaction to last quarter's decision.
  const last = lastQuarterCard(s);
  if (last) {
    const card = CARD_BY_ID[last.id as CardId];
    if (card) {
      const times = s.log.filter((e) => e.kind === 'card' && e.id === card.id && e.quarter < q).length;
      const idx = Math.min(times - 1, card.echoNews.length - 1);
      const id = `echo.${card.id}.${idx}`;
      if (!used.has(id)) must.push({ id, quarter: q, actor: 'eu', region: 'eu', text: card.echoNews[idx] });
    }
  }
  // Actor moves this quarter.
  if (s.log.some((e) => e.quarter === q && e.id === 'us_chip_controls')) {
    const r = ACTOR_RULES.us_chip_controls;
    must.push({ id: 'actor.us_chip_controls', quarter: q, actor: r.actor, region: r.region, text: r.news ?? r.briefing });
  }
  // Milestones (crossing thresholds this quarter).
  for (const t of NEWS) {
    if (t.must && !used.has(`news.${t.id}`) && evalCondition(s, t.when)) {
      must.push({ id: `news.${t.id}`, quarter: q, actor: t.actor, region: t.region, text: t.text });
    }
  }

  const nw = TUNING.news;
  const eventNews = s.news.filter((n) => n.quarter === q).length; // an event line may already be there
  const target = randomInt(holder, nw.minLines, nw.maxLines);
  const room = Math.max(0, target - eventNews - must.length);
  const ambient: Draft[] = [];
  if (room > 0) {
    const pools = new Map<string, typeof NEWS>();
    for (const t of NEWS) {
      if (t.must || used.has(`news.${t.id}`) || !evalCondition(s, t.when)) continue;
      if (!pools.has(t.pool)) pools.set(t.pool, []);
      pools.get(t.pool)!.push(t);
    }
    // One line per pool first, for variety; then a second pass if the pools are running dry late in the game.
    const poolNames = shuffle(holder, [...pools.keys()]);
    for (let pass = 0; pass < 2 && ambient.length < room; pass++) {
      for (const name of poolNames) {
        if (ambient.length >= room) break;
        const list = pools.get(name)!.filter((t) => !ambient.some((a) => a.id === `news.${t.id}`));
        if (!list.length) continue;
        const t = list[Math.floor(random(holder) * list.length)];
        ambient.push({ id: `news.${t.id}`, quarter: q, actor: t.actor, region: t.region, text: t.text });
      }
    }
  }

  const items = [...must, ...ambient].slice(0, Math.max(0, nw.maxLines - eventNews));
  const n = items.length;
  items.forEach((it, i) => {
    const base = nw.firstAt + (nw.spread * (i + 0.5)) / Math.max(1, n);
    const at = Math.min(nw.latestAt, Math.max(nw.earliestAt, base + (random(holder) - 0.5) * (nw.jitter / Math.max(1, n))));
    s.news.push({ ...it, at: Math.round(at * 100) / 100 } as NewsItem);
  });
  s.news.sort((a, b) => a.quarter - b.quarter || a.at - b.at);
  s.rng = holder.rng;
}

function notesReadable(s: GameState): boolean {
  return s.flags.aiOffice || s.quarter <= s.revealUntil;
}

function generateNotes(s: GameState): void {
  const holder = { rng: s.rng };
  const used = new Set(s.notes.map((n) => n.id));
  const nt = TUNING.notes;
  const r = random(holder);
  const count = r < nt.noneBelow ? 0 : r < nt.oneBelow ? 1 : 2;
  const pools = new Map<string, typeof NOTES>();
  for (const t of NOTES) {
    if (used.has(`note.${t.id}`) || !evalCondition(s, t.when)) continue;
    if (!pools.has(t.pool)) pools.set(t.pool, []);
    pools.get(t.pool)!.push(t);
  }
  const names = shuffle(holder, [...pools.keys()]);
  const readable = notesReadable(s);
  const chosen: InternalNote[] = [];
  for (const name of names.slice(0, count)) {
    const list = pools.get(name)!;
    const t = list[Math.floor(random(holder) * list.length)];
    chosen.push({
      id: `note.${t.id}`,
      quarter: s.quarter,
      actor: t.actor,
      region: t.region,
      text: t.text,
      readable,
      at: Math.round((nt.firstAt + random(holder) * nt.spread) * 100) / 100,
    });
  }
  chosen.sort((a, b) => a.at - b.at);
  s.notes.push(...chosen);
  s.rng = holder.rng;
}

export function startQuarter(state: GameState): GameState {
  const s = cloneState(state);
  if (s.phase !== 'quarter' || quarterStarted(s)) return s;
  s.quarterStart = { gauges: { ...s.gauges }, coalition: s.coalition, pc: s.pc, budget: s.budget };
  s.bubblesThisQuarter = 0;
  s.decidedThisQuarter = false;
  s.pendingEvent = null;
  if (s.quarter > 1) applyIncome(s);
  runActors(s);
  runDrift(s);
  checkEvents(s);
  generateNews(s);
  generateNotes(s);
  return s;
}

export function collectBubble(state: GameState, region: RegionId): GameState {
  const s = cloneState(state);
  if (s.phase !== 'quarter' || s.bubblesThisQuarter >= TUNING.bubbles.maxPerQuarter) return s;
  s.bubblesThisQuarter += 1;
  const d = change(s, 'pc', TUNING.bubbles.pcEach);
  addLog(s, {
    kind: 'bubble',
    id: `bubble.${region}`,
    actor: 'eu',
    title: `Public concern in ${REGION_NAMES[region]}`,
    visibleDeltas: [d],
    hiddenDeltas: [],
    briefing: 'You turned public concern into political capital.',
    debrief: 'Public concern collected as political capital.',
  });
  return s;
}

export function resolveEvent(state: GameState, optionId?: string): GameState {
  const s = cloneState(state);
  const pe = s.pendingEvent;
  if (!pe) return s;
  if (pe.options.length) {
    const def = EVENT_BY_ID[pe.id];
    const variant = pe.prepared ? def.prepared : def.unprepared;
    const opt = variant.options.find((o) => o.id === optionId);
    if (!opt) throw new Error(`Event ${pe.id} needs a choice: ${variant.options.map((o) => o.id).join(' or ')}`);
    const deltas = applyEffects(s, [...opt.effects, ...opt.hiddenEffects]);
    const { visible, hidden } = splitDeltas(deltas);
    const fired = s.firedEvents[pe.id];
    if (fired) fired.choice = opt.id;
    addLog(s, {
      kind: 'event',
      id: `${pe.id}:${opt.id}`,
      actor: 'eu',
      title: `${def.title}: ${opt.label.toLowerCase()}`,
      visibleDeltas: visible,
      hiddenDeltas: hidden,
      briefing: opt.description,
      debrief: opt.debrief,
    });
  }
  s.pendingEvent = null;
  return s;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function cardLimitReached(s: GameState, card: CardDef): boolean {
  return card.limit !== null && (s.cardsPlayed[card.id] ?? 0) >= card.limit;
}

function lockedReason(s: GameState, card: CardDef): string | null {
  if (s.phase === 'ended') return 'The game is over';
  if (cardLimitReached(s, card)) return card.limit === 1 ? 'Already played' : 'No uses left';
  for (const r of card.requirements) if (!evalCondition(s, r.when)) return r.reason;
  return null;
}

function isFree(s: GameState): boolean {
  return s.phase === 'tipping';
}

function canAfford(s: GameState, card: CardDef): boolean {
  if (isFree(s)) return true;
  return s.pc >= card.cost.pc && s.budget >= card.cost.budget;
}

export function cardViews(state: GameState): CardView[] {
  const s = state;
  return CARDS.map((card) => {
    const reason = lockedReason(s, card);
    return {
      id: card.id,
      name: card.name,
      family: card.family,
      playerText: card.playerText,
      costLabel: isFree(s) ? `Free (tipping point)${card.cost.token ? ', uses a token' : ''}` : card.costLabel,
      available: reason === null,
      affordable: canAfford(s, card),
      lockedReason: reason,
      downside: card.downside,
      dependencies: card.dependencies.map((d) => ({ text: d.text, met: evalCondition(s, d.met) })),
      options: (card.options ?? []).map((o) => ({ id: o.id, label: o.label })),
      source: { ...card.source },
      isLouis: card.isLouis,
      // v2 stubs
      isNew: false,
      unlockReason: null,
      level: null,
      usesLeft: card.limit === null ? null : Math.max(0, card.limit - (s.cardsPlayed[card.id] ?? 0)),
      cooldownUntil: null,
      face: card.effects
        .filter((e) => !e.when)
        .slice(0, 2)
        .map((e) => ({ key: e.key, text: fmtDelta({ key: e.key, amount: e.amount, hidden: false }), tone: 'neutral' as const })),
      prepares: [],
      context: null,
      realCost: null,
    };
  });
}

interface CardApplication {
  costs: Delta[];
  deltas: Delta[];
  option?: CardOptionDef;
}

/** Applies a card to a draft state (mutates it). No validation. */
function applyCard(s: GameState, card: CardDef, optionId?: string): CardApplication {
  const option = card.options?.find((o) => o.id === optionId) ?? card.options?.[0];
  const costs: Delta[] = [];
  if (!isFree(s)) {
    if (card.cost.pc) costs.push(change(s, 'pc', -card.cost.pc));
    if (card.cost.budget) costs.push(change(s, 'budget', -card.cost.budget));
  }
  if (card.cost.token) s.asmlTokens = Math.max(0, s.asmlTokens - 1);
  const specs = [...card.effects, ...card.hiddenEffects, ...(option ? [...option.effects, ...option.hiddenEffects] : [])];
  const deltas = applyEffects(s, specs);
  if (card.setFlags) Object.assign(s.flags, card.setFlags);
  if (card.pending) s.pending.push(...card.pending.map((p) => ({ key: p.key, amount: p.amount, hidden: isHiddenKey(p.key) })));
  if (card.special === 'ai_office') {
    s.notes = s.notes.map((n) => ({ ...n, readable: true }));
  } else if (card.special === 'measure') {
    s.revealUntil = Math.max(s.revealUntil, s.quarter + 3);
    s.notes = s.notes.map((n) => (n.quarter === s.quarter ? { ...n, readable: true } : n));
  }
  s.cardsPlayed[card.id] = (s.cardsPlayed[card.id] ?? 0) + 1;
  return { costs: costs.filter((d) => d.amount !== 0), deltas, option };
}

/** The state as the player can know it: hidden values reset to their earlier values (for odds previews). */
function maskHidden(after: GameState, before: GameState): GameState {
  return { ...after, gauges: { ...after.gauges, trueAlignment: before.gauges.trueAlignment }, eu: { ...before.eu } };
}

function oddsShiftSentence(before: Record<PlanId, number>, after: Record<PlanId, number>): string {
  const parts = PLAN_IDS.filter((p) => Math.round(before[p] * 100) !== Math.round(after[p] * 100)).map(
    (p) => `${PLAN_BY_ID[p].name} ${pct(before[p])} → ${pct(after[p])}`,
  );
  return parts.length ? `Odds at the tipping point: ${parts.join(', ')}.` : 'It did not move the superpowers’ odds directly.';
}

export function previewCard(state: GameState, id: CardId, option?: string): CardPreview {
  const card = CARD_BY_ID[id];
  const draft = cloneState(state);
  const { deltas, option: opt } = applyCard(draft, card, option);
  const costs: Delta[] = isFree(state)
    ? []
    : [
        ...(card.cost.pc ? [{ key: 'pc' as const, amount: -card.cost.pc, hidden: false }] : []),
        ...(card.cost.budget ? [{ key: 'budget' as const, amount: -card.cost.budget, hidden: false }] : []),
      ];
  const notes: string[] = [];
  for (const dep of card.dependencies) {
    notes.push(`${dep.text}${evalCondition(state, dep.met) ? ' (met).' : ' (not yet).'}`);
  }
  notes.push(...card.previewNotes);
  if (card.pending?.length) {
    notes.push(`Next quarter: ${card.pending.map((p) => fmtDelta({ key: p.key, amount: p.amount, hidden: false })).join(', ')}.`);
  }
  if (card.hasHiddenEffects || (opt && opt.hiddenEffects.length > 0)) {
    notes.push('This decision has hidden effects. They will be revealed at the end.');
  }
  if (isFree(state)) notes.unshift('Tipping point: this last decision is free.');
  return {
    cardId: id,
    option: opt?.id,
    costs,
    visibleDeltas: deltas.filter((d) => !d.hidden),
    notes,
    oddsBefore: planOdds(state),
    oddsAfter: planOdds(maskHidden(draft, state)),
    infoGains: [], // v2 stub
    realCost: null, // v2 stub
  };
}

export function playCard(state: GameState, id: CardId, option?: string): { state: GameState; briefing: Briefing } {
  const card = CARD_BY_ID[id];
  if (!card) throw new Error(`Unknown card: ${id}`);
  if (state.phase === 'ended') throw new Error('The game is over');
  if (state.pendingEvent) throw new Error('Resolve the current event first');
  if (state.decidedThisQuarter) throw new Error('You already took a decision this quarter');
  const reason = lockedReason(state, card);
  if (reason) throw new Error(`${card.name} is not available: ${reason}`);
  if (!canAfford(state, card)) throw new Error(`Not enough resources for ${card.name}`);
  if (card.options?.length && !card.options.some((o) => o.id === option)) {
    throw new Error(`${card.name} needs an option: ${card.options.map((o) => o.id).join(' or ')}`);
  }

  const s = cloneState(state);
  const oddsBefore = planOdds(s);
  const { costs, deltas, option: opt } = applyCard(s, card, option);
  s.decidedThisQuarter = true;
  const oddsAfter = planOdds(s);
  const { visible, hidden } = splitDeltas(deltas);
  const advisorNote = opt ? opt.advisorNote : pickText(s, card.advisorNotes);
  const title = opt ? `${card.name}: ${opt.label.toLowerCase()}` : card.name;
  const debriefText = [card.debrief, opt?.debrief, oddsShiftSentence(oddsBefore, oddsAfter)].filter(Boolean).join(' ');
  addLog(s, {
    kind: 'card',
    id: card.id,
    actor: 'eu',
    title,
    visibleDeltas: [...costs, ...visible],
    hiddenDeltas: hidden,
    briefing: advisorNote,
    debrief: debriefText,
  });
  return { state: s, briefing: { title, visibleDeltas: [...costs, ...visible], advisorNote, infoGains: [], consequence: null } };
}

export function pass(state: GameState): GameState {
  const s = cloneState(state);
  if (s.phase !== 'ended') s.decidedThisQuarter = true;
  return s;
}

export function endQuarter(state: GameState): { state: GameState; outcome: QuarterOutcome } {
  const s = cloneState(state);
  if (s.phase === 'ended') return { state: s, outcome: 'game_over' };
  if (s.phase === 'tipping') return { state: s, outcome: 'tipping_point' };
  if (s.pendingEvent) throw new Error('Resolve the current event before ending the quarter');
  if (s.gauges.capability >= TUNING.tippingAt) {
    s.phase = 'tipping';
    s.decidedThisQuarter = false;
    addLog(s, {
      kind: 'tipping',
      id: 'tipping_point',
      actor: 'ai_systems',
      title: 'AI starts improving itself',
      visibleDeltas: [],
      hiddenDeltas: [],
      briefing: 'AI can now automate its own research. The US and China must choose a path. You have one last, free decision.',
      debrief: `In ${dateLabel(s.quarter)}, AI became able to automate its own research.`,
    });
    return { state: s, outcome: 'tipping_point' };
  }
  if (s.quarter >= TUNING.lastQuarter) {
    s.phase = 'ended';
    s.ending = resolveEnding(s);
    addLog(s, {
      kind: 'tipping',
      id: 'no_tipping_point',
      actor: 'ai_systems',
      title: 'AI never started improving itself',
      visibleDeltas: [],
      hiddenDeltas: [],
      briefing: 'Four years passed and AI never became able to improve itself.',
      debrief: 'The takeoff was slow: no tipping point before the end of 2030.',
    });
    return { state: s, outcome: 'game_over' };
  }
  s.quarter += 1;
  return { state: s, outcome: 'next_quarter' };
}

// ---------------------------------------------------------------------------
// Tipping point, plans, endings
// ---------------------------------------------------------------------------

function planWeights(s: GameState): Record<PlanId, number> {
  const p = TUNING.plans;
  const g = s.gauges;
  const sd = p.slowdown;
  const slowdown =
    sd.base +
    sd.verification * g.verification +
    sd.pressure * g.publicPressure +
    sd.coalition * s.coalition +
    (s.flags.warningShotPrepared ? sd.warningShot : 0) +
    sd.tension * g.tension;
  const sh = p.shutDown;
  const shutDown =
    sh.base +
    (g.publicPressure >= sh.pressureAt ? sh.pressure * g.publicPressure : 0) +
    (s.firedEvents.warning_shot && g.trueAlignment < sh.unsafeBelow ? sh.unsafeBonus : 0);
  const fight = p.fight.base + p.fight.tension * g.tension;
  const race = Math.max(p.race.floor, p.race.base + p.race.pressure * g.publicPressure + p.race.verification * g.verification);
  const m = p.minWeight;
  return {
    verified_slowdown: Math.max(m, slowdown),
    shut_down: Math.max(m, shutDown),
    fight_china: Math.max(m, fight),
    race: Math.max(m, race),
  };
}

export function planOdds(state: GameState): Record<PlanId, number> {
  const w = planWeights(state);
  const total = PLAN_IDS.reduce((acc, k) => acc + w[k], 0);
  return Object.fromEntries(PLAN_IDS.map((k) => [k, w[k] / total])) as Record<PlanId, number>;
}

const WORLD_OF_PLAN: Record<PlanId, WorldKind> = {
  verified_slowdown: 'diplomacy',
  shut_down: 'diplomacy',
  fight_china: 'arms_race',
  race: 'take_off',
};

function worldOf(s: GameState): WorldKind {
  if (s.tipping) return WORLD_OF_PLAN[s.tipping.plan];
  return s.gauges.concentration < TUNING.endings.bigAiConcentration ? 'plateau' : 'big_ai';
}

/** Which ending the current state leads to (needs s.tipping for a tipping-point world). */
export function resolveEnding(s: GameState): EndingId {
  const e = TUNING.endings;
  const g = s.gauges;
  switch (worldOf(s)) {
    case 'plateau': {
      const r = s.firedEvents.ransomware;
      return !r || r.prepared ? 'bright_winter' : 'decentralised_mayhem';
    }
    case 'big_ai': {
      const sb = s.firedEvents.silicon_blackmail;
      const stoodFirm = !sb || sb.prepared || sb.choice === 'hold_firm';
      return stoodFirm && s.eu.economy >= e.bigAiEconomy ? 'agent_economy' : 'silicon_blackmail';
    }
    case 'diplomacy':
      return g.verification >= e.utopiaVerification && g.concentration <= e.utopiaMaxConcentration && g.trueAlignment >= e.utopiaTrueAlignment
        ? 'licensed_utopia'
        : 'unstable_pause';
    case 'arms_race':
      return s.coalition >= 1 && g.tension <= e.multipolarMaxTension ? 'multipolar_world' : 'hot_war';
    case 'take_off':
      return g.trueAlignment >= e.cognitiveTrueAlignment ? 'cognitive_revolution' : 'loss_of_control';
  }
}

export function runTippingPoint(state: GameState): GameState {
  const s = cloneState(state);
  if (s.phase === 'ended') return s;
  if (s.phase !== 'tipping') throw new Error('The tipping point has not been reached');
  const odds = planOdds(s);
  const holder = { rng: s.rng };
  const plan = weightedPick<PlanId>(holder, odds);
  let labRestraint: boolean | null = null;
  const hidden: Delta[] = [];
  if (plan === 'race') {
    const r = TUNING.plans.restraint;
    labRestraint = random(holder) < r.base + s.gauges.publicPressure * r.pressurePer;
    if (labRestraint) hidden.push(change(s, 'trueAlignment', r.trueAlignment));
  }
  const loss = TUNING.plans.aftermath[plan];
  if (loss) {
    const mandate = s.flags.oversightMandate;
    hidden.push(
      change(s, 'eu.economy', mandate ? Math.trunc(loss / 2) : loss),
      change(s, 'eu.culture', loss),
      change(s, 'eu.state', mandate ? Math.trunc(loss / 2) : loss),
    );
  }
  s.rng = holder.rng;
  s.tipping = { odds, plan, labRestraint };
  const planDef = PLAN_BY_ID[plan];
  addLog(s, {
    kind: 'tipping',
    id: `plan.${plan}`,
    actor: plan === 'fight_china' ? 'us' : 'ai_systems',
    title: `The superpowers chose: ${planDef.name}`,
    visibleDeltas: [],
    hiddenDeltas: hidden.filter((d) => d.amount !== 0),
    briefing: planDef.description,
    debrief:
      `Odds were: ${PLAN_IDS.map((p) => `${PLAN_BY_ID[p].name} ${pct(odds[p])}`).join(', ')}.` +
      (labRestraint === null ? '' : labRestraint ? ' The leading lab held back a little on its own, which helped alignment.' : ' No lab held back.') +
      (loss ? ` Afterwards, AI spread through Europe’s economy, culture and state faster than ever${s.flags.oversightMandate ? ', slowed in firms and ministries by the oversight mandate' : ''}.` : ''),
  });
  s.ending = resolveEnding(s);
  s.phase = 'ended';
  return s;
}

// ---------------------------------------------------------------------------
// Views: gauges, situation report, forecast, Léa, debrief
// ---------------------------------------------------------------------------

function errorBar(s: GameState, key: GaugeKey | 'coalition'): number {
  const e = TUNING.errorBars;
  if (key === 'capability') return s.flags.aiOffice ? e.capabilityWithAiOffice : e.capability;
  if (key === 'apparentAlignment') {
    const base = s.flags.aiOffice ? e.alignmentWithAiOffice : e.alignment;
    return s.flags.alignmentErrorDoubled ? base * 2 : base;
  }
  return 0;
}

export function gaugeViews(state: GameState): GaugeView[] {
  const s = state;
  return GAUGES.map((info) => {
    const value = info.key === 'coalition' ? s.coalition : s.gauges[info.key];
    const start = info.key === 'coalition' ? s.quarterStart.coalition : s.quarterStart.gauges[info.key];
    return {
      key: info.key,
      label: info.label,
      value,
      errorBar: errorBar(s, info.key),
      visible: info.visible,
      risesWhen: info.risesWhen,
      fallsWhen: info.fallsWhen,
      delta: value - start,
    };
  });
}

function mostLikely(odds: Record<PlanId, number>): PlanId {
  return PLAN_IDS.reduce((best, p) => (odds[p] > odds[best] ? p : best), PLAN_IDS[0]);
}

function whatWouldHelp(s: GameState): string {
  const g = s.gauges;
  const f = TUNING.forecast;
  if (g.verification < f.lowVerification && !s.flags.aiOffice) return LEVERS.aiOffice;
  if (g.verification < f.lowVerification) return LEVERS.verification;
  if (s.coalition === 0 && g.tension < f.coalitionMaxTension) return LEVERS.coalition;
  if (g.tension >= f.highTension) return LEVERS.tension;
  if (g.verification < f.midVerification) return LEVERS.verification;
  if (s.coalition < f.coalitionTarget && g.tension < f.coalitionMaxTension) return LEVERS.coalition;
  if (g.verification < f.highVerification) return LEVERS.moreVerification;
  return LEVERS.keep;
}

function forecast(s: GameState): SituationReport['forecast'] {
  const odds = planOdds(s);
  const best = mostLikely(odds);
  return {
    mostLikely: best,
    probability: odds[best],
    sentence: `${capitalise(PLAN_LIKELY[best])} (${pct(odds[best])})`,
    whatWouldHelp: whatWouldHelp(s),
  };
}

export function forecastLine(state: GameState): string {
  const f = forecast(state);
  return `On current course: ${PLAN_LIKELY[f.mostLikely]} (${pct(f.probability)}). What would help: ${f.whatWouldHelp}.`;
}

export function situationReport(state: GameState): SituationReport {
  const s = state;
  const q = s.quarter;
  const entries = s.log.filter((e) => e.quarter === q && e.kind !== 'card' && e.kind !== 'tipping');
  const keys: (GaugeKey | 'coalition')[] = [...VISIBLE_GAUGES, 'coalition'];
  const changes: SituationReport['changes'] = [];
  for (const key of keys) {
    const now = key === 'coalition' ? s.coalition : s.gauges[key];
    const start = key === 'coalition' ? s.quarterStart.coalition : s.quarterStart.gauges[key];
    const delta = now - start;
    if (delta === 0) continue;
    const contributors = entries
      .map((e) => ({ e, amount: e.visibleDeltas.filter((d) => d.key === key).reduce((acc, d) => acc + d.amount, 0) }))
      .filter((x) => x.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const titles = contributors.slice(0, 2).map((x, i) => (i === 0 ? x.e.title : lowerFirst(x.e.title)));
    const cause = titles.length ? titles.join('; ') : 'Several causes';
    changes.push({ key, label: GAUGE_INFO[key].label, delta, cause });
  }
  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const why: string[] = [];
  for (const e of entries) {
    if (e.kind === 'event' && !e.id.includes(':')) {
      const def = EVENT_BY_ID[e.id as EventId];
      const fired = s.firedEvents[def.id];
      const v = fired?.prepared ? def.prepared : def.unprepared;
      why.push(`${capitalise(v.short)}: ${v.cause}.`);
    } else if (e.kind === 'event') {
      why.push(`${e.title}.`);
    } else if (e.id === 'us_chip_controls') {
      why.push('Tension reached 60, so the US tightened chip controls.');
    } else if (e.id === 'upkeep_unpaid') {
      why.push('You could not pay the coalition upkeep, so a partner drifted away.');
    } else if (e.kind === 'drift' && e.id === 'tension' && e.actor === 'eu') {
      const first = !s.log.some((x) => x.kind === 'drift' && x.id === 'tension' && x.actor === 'eu' && x.quarter < q);
      if (first) why.push('With two coalition partners, diplomacy now cools tension every quarter.');
    }
  }
  if (s.phase === 'tipping') why.unshift('AI can now automate its own research. The US and China are about to choose a path.');

  const notesQ = s.notes.filter((n) => n.quarter === q);
  const slot = q === 1 ? 'q1' : q === 6 ? 'q6' : q === 11 ? 'q11' : null;
  return {
    quarter: q,
    dateLabel: dateLabel(q),
    changes,
    why,
    forecast: forecast(s),
    newNews: s.news.filter((n) => n.quarter === q).length,
    newNotes: { total: notesQ.length, readable: notesQ.filter((n) => n.readable).length },
    lea: slot && s.phase === 'quarter' ? leaScene(s, slot) : null,
    // v2 stubs
    headline: changes
      .slice(0, 3)
      .map((c) => ({ key: c.key as DashboardKey, label: c.label, value: c.key === 'coalition' ? s.coalition : s.gauges[c.key], delta: c.delta, cause: c.cause, kind: 'background' as const, meaning: '' })),
    background: '',
    risksMoved: [],
    trajectoryChange: null,
  };
}

function influenceBand(s: GameState): 'high' | 'mid' | 'low' {
  const avg = euAverage(s);
  if (avg >= TUNING.endings.epilogueHigh) return 'high';
  if (avg >= TUNING.endings.epilogueMid) return 'mid';
  return 'low';
}

export function leaScene(state: GameState, slot: LeaScene['slot']): LeaScene {
  const s = state;
  switch (slot) {
    case 'q1':
      return { slot, variant: s.takeoffSpeed, text: LEA_Q1[s.takeoffSpeed] };
    case 'q6': {
      const good = s.eu.economy >= TUNING.endings.leaQ6Economy;
      return { slot, variant: good ? 'human_touch' : 'post_editor', text: good ? LEA_Q6.good : LEA_Q6.bad };
    }
    case 'q11':
      return s.flags.flexicurity
        ? { slot, variant: 'retrained', text: LEA_Q11.retrained }
        : { slot, variant: 'between_jobs', text: LEA_Q11.between };
    case 'end': {
      const high = euAverage(s) >= TUNING.endings.leaEnd;
      const base = high ? LEA_END.high : LEA_END.low;
      const ending = s.ending ?? (s.phase === 'ended' ? resolveEnding(s) : null);
      return {
        slot,
        variant: `${high ? 'high' : 'low'}${ending ? `:${ending}` : ''}`,
        text: ending ? `${LEA_ENDING_LINE[ending]} ${base}` : base,
      };
    }
  }
}

function endingView(s: GameState): EndingView {
  const id = s.ending ?? resolveEnding(s);
  const def = ENDING_BY_ID[id];
  return {
    id,
    world: def.world,
    good: def.good,
    title: def.title,
    text: def.text,
    epilogue: EPILOGUES[influenceBand(s)],
    lea: leaScene({ ...s, ending: id }, 'end'),
    source: { ...def.source },
  };
}

export function debrief(state: GameState): Debrief {
  const s = state;
  if (s.phase !== 'ended') throw new Error('The debrief is only available once the game has ended');
  const decisions = s.log
    .filter((e) => e.kind === 'card')
    .map((e) => ({ quarter: e.quarter, title: e.title, visibleDeltas: e.visibleDeltas, hiddenDeltas: e.hiddenDeltas, explanation: e.debrief }));
  const events = s.log
    .filter((e) => e.kind === 'event' && !e.id.includes(':'))
    .map((e) => {
      const def = EVENT_BY_ID[e.id as EventId];
      const fired = s.firedEvents[def.id]!;
      const choiceEntry = s.log.find((x) => x.kind === 'event' && x.id.startsWith(`${def.id}:`));
      const explanation = [e.debrief, choiceEntry?.debrief, `Prepared would have required ${def.preparedLabel}.`]
        .filter(Boolean)
        .join(' ');
      return {
        quarter: e.quarter,
        title: def.title,
        actor: def.actor,
        prepared: fired.prepared,
        explanation: fired.prepared ? [e.debrief, choiceEntry?.debrief].filter(Boolean).join(' ') : explanation,
        source: { ...def.source },
      };
    });
  return {
    ending: endingView(s),
    reveal: {
      takeoffSpeed: s.takeoffSpeed,
      trueAlignment: s.gauges.trueAlignment,
      apparentAlignment: s.gauges.apparentAlignment,
      eu: { ...s.eu },
      gdp: s.gauges.gdp,
      approval: s.gauges.approval,
    },
    tipping: s.tipping ? deepClone(s.tipping) : null,
    notes: s.notes.map((n) => ({ ...n, readable: true })),
    decisions,
    events,
  };
}

/** Why this ending and not its twin, in one sentence (for the UI or the debrief). */
export function endingWhy(id: EndingId): string {
  return ENDING_BY_ID[id].why;
}

export { PLANS, EU_KEYS };

// ---------------------------------------------------------------------------
// v2 views. STUBS so the UI can be built in parallel: the engine agent replaces them.
// ---------------------------------------------------------------------------

export function dashboard(state: GameState): DashboardView {
  const views = gaugeViews(state).filter((g) => g.visible);
  const slots = state.dashboard.slots;
  const primary = slots.map((k) => views.find((g) => g.key === k)).filter((g): g is GaugeView => !!g).slice(0, state.dashboard.cap);
  const secondary = views.filter((g) => !slots.includes(g.key as DashboardKey));
  return { cap: state.dashboard.cap, primary, secondary, introduced: null };
}

export function riskViews(_state: GameState): RiskView[] {
  return [];
}

export function advisor(state: GameState): AdvisorView {
  const f = forecast(state);
  return { text: f.whatWouldHelp, recommend: null, reason: f.sentence, alternative: null };
}

export function trajectory(state: GameState): TrajectoryView {
  const odds = planOdds(state);
  const mostLikely = (Object.keys(odds) as PlanId[]).reduce((a, b) => (odds[b] > odds[a] ? b : a));
  return { odds, mostLikely, change: null };
}

export function nextIncome(state: GameState): IncomeView {
  const inc = TUNING.income;
  const high = state.gauges.publicPressure >= inc.highPressureAt;
  const pc = inc.pc + (high ? inc.pcHighPressureBonus : 0) - state.coalition * inc.coalitionUpkeep;
  const reasons = [`+${inc.budget} Budget per quarter`];
  if (inc.pc) reasons.push(`+${inc.pc} PC per quarter`);
  if (high) reasons.push(`+${inc.pcHighPressureBonus} PC: public pressure is high`);
  if (state.coalition) reasons.push(`−${state.coalition * inc.coalitionUpkeep} PC: coalition upkeep`);
  return { pc, budget: inc.budget, reasons, nextQuarterExists: state.phase === 'quarter' && state.quarter < TUNING.lastQuarter };
}

export function tip(_state: GameState): Tip | null {
  return null;
}

export function markTipShown(state: GameState, tipId: string): GameState {
  const s = cloneState(state);
  if (!s.tipsShown.includes(tipId)) s.tipsShown.push(tipId);
  return s;
}

export function journal(state: GameState): JournalEntry[] {
  return state.history.map((h) => ({
    quarter: h.quarter,
    dateLabel: dateLabel(h.quarter),
    report: h.report,
    decision: h.decision,
    events: [],
    lea: state.leaLetters.find((l) => l.quarter === h.quarter) ?? null,
    tips: [],
  }));
}

export const engine: EngineApi = {
  createInitialState,
  startQuarter,
  collectBubble,
  resolveEvent,
  situationReport,
  gaugeViews,
  cardViews,
  previewCard,
  playCard,
  pass,
  endQuarter,
  planOdds,
  runTippingPoint,
  debrief,
  leaScene,
  dateLabel,
  goalLine,
  forecastLine,
  dashboard,
  riskViews,
  advisor,
  trajectory,
  nextIncome,
  tip,
  markTipShown,
  journal,
};

export default engine;
