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
  EffectChip,
  IncomeView,
  InfoGain,
  JournalEntry,
  Notice,
  ReportLine,
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
import { pick, random, randomInt, seedToRng, shuffle, weightedPick } from './rng';
import type { Condition } from '../data/conditions';
import type { CardDef, CardOptionDef, CardStepDef, ConditionalText, EffectSpec, EventDef } from '../data/schema';
import { CARDS, CARD_BY_ID } from '../data/cards';
import { EVENTS, EVENT_BY_ID } from '../data/events';
import { GAUGES, GAUGE_INFO } from '../data/gauges';
import { ACTOR_RULES, NEWS } from '../data/news';
import { NOTES } from '../data/notes';
import { PLANS, PLAN_BY_ID, LEVERS } from '../data/plans';
import { ENDING_BY_ID, EPILOGUES } from '../data/endings';
import { LEA_END, LEA_ENDING_LINE, LEA_Q1, LEA_Q11, LEA_Q6 } from '../data/lea';
import { FIRST_YEAR, GOAL_LINE, PLAN_LIKELY } from '../data/text';
import { TUNING } from '../data/tuning';
import {
  ACT_FALLBACK,
  ADVISOR_REASON,
  ADVISOR_TEXT,
  BEATS,
  CONCERN_FALLBACK,
  CONCERN_THRESHOLDS,
  CONTEXT_OFFERS,
  INDICATOR_RELEVANCE,
  INDICATOR_WHY,
  INITIAL_CARDS,
  OPENING_INDICATORS,
  RISKS_DEF,
  THRESHOLD_NOTICES,
  TIP_FALLBACK,
  TIP_ORDER,
  type BeatDef,
  type ConcernTheme,
  type RiskDef,
} from '../data/progress';
import { CAUSE_TEXT } from '../data/causes';
import { ACTS, ADVISOR, CAUSES, CONCERNS, INDICATOR_INTROS, REAL_COSTS, RISKS, TIPS, UNLOCKS } from '../data/copy';

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

/** Which way is good for the player, for the tone of card chips (0 = neither). */
const GOOD_DIRECTION: Partial<Record<StatKey, 1 | -1>> = {
  verification: 1,
  coalition: 1,
  gdp: 1,
  approval: 1,
  pc: 1,
  budget: 1,
  tension: -1,
  misuse: -1,
  concentration: -1,
};

const deepClone = <T>(x: T): T => structuredClone(x);

/**
 * Copy a state for a pure update. Log, news, note, notice, history and odds entries are immutable once
 * created (the engine never edits them in place), so arrays are copied and entries shared.
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
    unlockedCards: s.unlockedCards.slice(),
    contextCards: s.contextCards.slice(),
    cardLastPlayed: { ...s.cardLastPlayed },
    dashboard: { ...s.dashboard, slots: s.dashboard.slots.slice(), milestones: s.dashboard.milestones.slice() },
    notices: s.notices.slice(),
    tipsShown: s.tipsShown.slice(),
    tipLog: s.tipLog.slice(),
    concerns: s.concerns.slice(),
    leaLetters: s.leaLetters.slice(),
    history: s.history.slice(),
    oddsHistory: s.oddsHistory.slice(),
  };
}

function isHiddenKey(key: StatKey): boolean {
  return key === 'trueAlignment' || key.startsWith('eu.');
}

const signed = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;

function fmtDelta(d: Delta): string {
  return `${STAT_LABELS[d.key]} ${signed(d.amount)}`;
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function capitalise(x: string): string {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/** Lower-case the first letter unless the text starts with an acronym ("AI", "US"). */
function lowerFirst(x: string): string {
  return /^[A-Z]{2}/.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1);
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/** Copy text from src/data/copy, unless it is missing or still a placeholder. */
function copyText(x: string | undefined | null): string | null {
  if (!x || !x.trim() || /^placeholder\.?$/i.test(x.trim())) return null;
  return x;
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

function clampFor(key: StatKey, before: number, v: number): number {
  if (key === 'coalition') return Math.max(0, Math.min(3, v));
  if (key === 'pc' || key === 'budget') {
    // Currencies never go below 0, and gains stop at the cap (a state already above it keeps its value).
    const cap = Math.max(before, TUNING.income.cap);
    return Math.max(0, v > before ? Math.min(cap, v) : v);
  }
  return Math.max(0, Math.min(100, v));
}

/** Apply a change with clamping; returns the delta actually applied (amount may be 0). */
function change(s: GameState, key: StatKey, amount: number): Delta {
  const before = getStat(s, key);
  const after = clampFor(key, before, before + amount);
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
    case 'act':
      return s.act;
    case 'asmlTokens':
      return s.asmlTokens;
    case 'revealUntil':
      return s.revealUntil;
    case 'speed':
      return s.takeoffSpeed;
    case 'alignmentGap':
      return s.gauges.apparentAlignment - s.gauges.trueAlignment;
    case 'plan':
      return s.tipping?.plan ?? '';
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

function hasMilestone(s: GameState, m: string): boolean {
  return s.dashboard.milestones.includes(m);
}

function addMilestone(s: GameState, m: string): void {
  if (!s.dashboard.milestones.includes(m)) s.dashboard.milestones.push(m);
}

/** A story line in this quarter's news (events, beats, layoffs), within the feed's maximum. */
function pushStory(s: GameState, item: NewsItem): void {
  if (s.news.some((n) => n.id === item.id)) return;
  if (s.news.filter((n) => n.quarter === s.quarter).length >= TUNING.news.maxLines) return;
  s.news.push(item);
}

function addNotice(s: GameState, n: Notice): void {
  if (!s.notices.some((x) => x.kind === n.kind && x.id === n.id)) s.notices.push(n);
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
  const gauges = { ...TUNING.start.gauges, trueAlignment: pick(holder, TUNING.start.trueAlignmentOptions) };
  const s: GameState = {
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
    act: 1,
    unlockedCards: INITIAL_CARDS.slice(),
    contextCards: [],
    cardLastPlayed: {},
    dashboard: { cap: 4, slots: OPENING_INDICATORS.slice(), milestones: [] },
    notices: [],
    tipsShown: [],
    tipLog: [],
    concerns: [],
    leaLetters: [],
    history: [],
    oddsHistory: [],
  };
  s.oddsHistory.push({ quarter: 1, odds: planOdds(s), cause: 'the starting situation' });
  return s;
}

// ---------------------------------------------------------------------------
// The quarter loop
// ---------------------------------------------------------------------------

function quarterStarted(s: GameState): boolean {
  return s.log.some((e) => e.quarter === s.quarter && e.kind === 'drift');
}

function pendingOf(s: GameState, key: 'pc' | 'budget'): number {
  return s.pending.filter((p) => p.key === key).reduce((a, p) => a + p.amount, 0);
}

function incomeParts(s: GameState): { pc: number; budget: number; reasons: string[] } {
  const inc = TUNING.income;
  const reasons = [`+${inc.budget} Budget per quarter`, `+${inc.pc} PC per quarter`];
  let pc = inc.pc;
  if (s.gauges.publicPressure >= inc.highPressureAt) {
    pc += inc.pcHighPressureBonus;
    reasons.push(`+${inc.pcHighPressureBonus} PC: public pressure is high`);
  }
  if (s.gauges.approval < inc.lowApprovalBelow) {
    pc -= inc.pcLowApprovalPenalty;
    reasons.push(`−${inc.pcLowApprovalPenalty} PC: approval is below ${inc.lowApprovalBelow}`);
  }
  return { pc, budget: inc.budget, reasons };
}

function applyIncome(s: GameState): void {
  const { pc, budget, reasons } = incomeParts(s);
  const deltas = [change(s, 'pc', pc), change(s, 'budget', budget)];
  addLog(s, {
    kind: 'income',
    id: 'income',
    actor: 'eu',
    title: pc > TUNING.income.pc ? 'Income (public pressure is high: extra PC)' : pc < TUNING.income.pc ? 'Income (approval is low: less PC)' : 'Income',
    visibleDeltas: deltas.filter((d) => d.amount !== 0),
    hiddenDeltas: [],
    briefing: `New quarter: ${reasons.join(', ')}.`,
    debrief: 'Quarterly income.',
  });

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

/** Joint attribution with allies stops the next US export-control escalation, once. */
function attributionShield(s: GameState): boolean {
  return (s.cardsPlayed.joint_attribution ?? 0) > 0 && !s.log.some((e) => e.id.startsWith('us_escalation_averted'));
}

function avertEscalation(s: GameState, which: 'chips' | 'theft'): void {
  const r = ACTOR_RULES.us_escalation_averted;
  addLog(s, { kind: 'actor', id: `us_escalation_averted:${which}`, actor: r.actor, title: r.title, visibleDeltas: [], hiddenDeltas: [], briefing: r.briefing, debrief: r.debrief });
}

function runActors(s: GameState): void {
  const a = TUNING.actors;
  const rule = (id: keyof typeof ACTOR_RULES, deltas: Delta[]) => {
    const r = ACTOR_RULES[id];
    addLog(s, { kind: 'actor', id: r.id, actor: r.actor, title: r.title, visibleDeltas: deltas.filter((d) => d.amount !== 0), hiddenDeltas: [], briefing: r.briefing, debrief: r.debrief });
  };
  rule('labs_report', [change(s, 'apparentAlignment', a.labAlignmentClaim)]);
  rule('labs_consolidate', [change(s, 'concentration', a.labConsolidation)]);
  if (s.gauges.tension >= a.chipControlsAt && !s.flags.exportControls) {
    s.flags.exportControls = true;
    if (attributionShield(s)) avertEscalation(s, 'chips');
    else rule('us_chip_controls', [change(s, 'tension', a.chipControlsTension)]);
  }
  const theft = s.firedEvents.weight_theft;
  const theftDone = s.log.some((e) => e.id === 'us_escalation' || e.id === 'us_escalation_averted:theft');
  if (theft && !theft.prepared && !theftDone && s.quarter >= theft.quarter + a.theftEscalationAfter) {
    if (attributionShield(s)) avertEscalation(s, 'theft');
    else rule('us_escalation', [change(s, 'tension', a.theftEscalationTension)]);
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
    coalitionCools ? 'From the second coalition level, coalition diplomacy cooled tension every quarter.' : 'Tension rose a little every quarter.',
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
  // One entry per cause, so the situation report names the true cause of each change (bug B1).
  const jobs = g.capability >= d.jobsAt;
  drift(
    'economy',
    'eu',
    'AI adoption lifts growth',
    [['gdp', d.gdp + (jobs ? d.gdpHighCapability : 0)]],
    'AI adoption lifted GDP every quarter, faster once capability passed 50.',
  );
  drift(
    'layoffs',
    'us_labs',
    'Layoffs hurt approval',
    [['approval', jobs && !s.flags.flexicurity ? d.approval : 0]],
    'Once capability passed 50, layoffs cost approval every quarter (unless flexicurity was in place).',
  );
  drift(
    'public_concern',
    jobs ? 'us_labs' : 'eu',
    jobs ? 'AI is taking jobs' : 'Growing public concern about AI',
    [['publicPressure', jobs ? d.publicPressureJobs : d.publicPressure]],
    'Public concern about AI grew every quarter, faster once AI started taking jobs.',
  );
}

function offerContextCards(s: GameState, event: EventId, prepared: boolean): void {
  for (const o of CONTEXT_OFFERS) {
    if (o.event !== event || (o.prepared !== null && o.prepared !== prepared)) continue;
    if ((s.cardsPlayed[o.card] ?? 0) > 0 || s.contextCards.some((x) => x.id === o.card)) continue;
    const reason = unlockReasonText(o.card) ?? o.reason;
    s.contextCards.push({ id: o.card, until: s.quarter + TUNING.contextWindow - 1, reason });
    addNotice(s, { kind: 'context_card', id: o.card, title: CARD_BY_ID[o.card].name, text: `${reason}. On offer until ${dateLabel(s.quarter + TUNING.contextWindow - 1)}.` });
  }
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
  recordOdds(s, v.short);
  offerContextCards(s, def.id, prepared);
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

/** Layoff waves the first time capability reaches each threshold (v2, from the Balance Spec v2). */
function employmentShocks(s: GameState): void {
  const e = TUNING.employmentShocks;
  for (const at of e.at) {
    const id = `employment_shock_${at}` as 'employment_shock_40' | 'employment_shock_70';
    if (s.gauges.capability < at || s.log.some((x) => x.id === id)) continue;
    const r = ACTOR_RULES[id] ?? ACTOR_RULES.employment_shock_70;
    const deltas = [change(s, 'approval', s.flags.flexicurity ? e.approvalWithFlexicurity : e.approval), change(s, 'publicPressure', e.publicPressure)].filter(
      (d) => d.amount !== 0,
    );
    addLog(s, { kind: 'actor', id, actor: r.actor, title: r.title, visibleDeltas: deltas, hiddenDeltas: [], briefing: r.briefing, debrief: r.debrief });
    addNotice(s, {
      kind: 'employment_shock',
      id,
      title: r.title,
      text: `${deltas.map((d) => capitalise(fmtDelta(d))).join(', ')}.${s.flags.flexicurity ? ' Flexicurity softened the blow.' : ''}`,
    });
    if (r.news) pushStory(s, { id: `actor.${id}`, quarter: s.quarter, actor: r.actor, region: r.region, text: r.news, at: 0.3 });
    recordOdds(s, lowerFirst(r.title));
  }
}

// ---------- Acts, unlocks, dashboard ----------

function unlockReasonText(id: CardId): string | null {
  return copyText(UNLOCKS.find((u) => u.card === id)?.reason)?.replace(/\.\s*$/, '') ?? null;
}

function actCopy(act: 1 | 2 | 3): { title: string; beat: string } {
  const c = ACTS.find((a) => a.act === act);
  return { title: copyText(c?.title) ?? ACT_FALLBACK[act].title, beat: copyText(c?.beat) ?? ACT_FALLBACK[act].beat };
}

function beatTrigger(s: GameState, b: BeatDef): 'story' | 'fallback' | null {
  const p = TUNING.progress;
  switch (b.id) {
    case 'coalition':
      return s.quarter >= p.coalitionFromQuarter ? 'story' : null;
    case 'theft_risk': {
      const def = RISKS_DEF.find((r) => r.id === 'weight_theft')!;
      return evalCondition(s, def.appear) || s.firedEvents.weight_theft ? 'story' : null;
    }
    case 'act2':
      if (s.log.some((e) => e.id === 'employment_shock_40')) return 'story';
      return s.quarter >= p.act2FallbackQuarter ? 'fallback' : null;
    case 'misuse':
      if (s.act < 2) return null;
      if (s.gauges.misuse >= p.misuseBeatAt) return 'story';
      return s.quarter >= p.misuseBeatFallbackQuarter ? 'fallback' : null;
    case 'act3':
      return s.act >= 2 && s.quarter >= p.act3FromQuarter ? 'story' : null;
  }
}

/** Story beats: acts open and cards unlock. At most one major beat (an act or a new mechanic) per quarter. */
function runBeats(s: GameState): void {
  if (s.quarter === 1 && !hasMilestone(s, 'beat:act1')) {
    addMilestone(s, 'beat:act1');
    const a = actCopy(1);
    addNotice(s, { kind: 'act', id: '1', title: a.title, text: a.beat });
  }
  let major = false;
  for (const b of BEATS) {
    if (hasMilestone(s, `beat:${b.id}`)) continue;
    const isMajor = !!b.act || !!b.indicator;
    if (isMajor && major) continue;
    const trig = beatTrigger(s, b);
    if (!trig) continue;
    addMilestone(s, `beat:${b.id}`);
    if (isMajor) major = true;
    if (b.act) {
      s.act = b.act;
      const a = actCopy(b.act);
      addNotice(s, { kind: 'act', id: String(b.act), title: a.title, text: a.beat });
    }
    for (const id of b.cards) {
      if (s.unlockedCards.includes(id)) continue;
      s.unlockedCards.push(id);
      addNotice(s, { kind: 'card_unlocked', id, title: CARD_BY_ID[id].name, text: `${unlockReasonText(id) ?? b.reason}.` });
    }
    const news = trig === 'fallback' && b.fallbackNews ? b.fallbackNews : b.news;
    if (news) pushStory(s, { id: `beat.${b.id}`, quarter: s.quarter, actor: news.actor, region: news.region, text: news.text, at: 0.2 });
  }
}

/** Indicators that a public milestone has made relevant, in the order they are introduced. */
function indicatorDue(s: GameState, key: DashboardKey): boolean {
  switch (key) {
    case 'coalition':
      return s.coalition >= 1;
    case 'publicPressure':
      return s.act >= 2;
    case 'misuse':
      return hasMilestone(s, 'beat:misuse');
    case 'concentration':
      return s.flags.oversightMandate || s.flags.openModels || s.gauges.concentration >= TUNING.progress.concentrationIndicatorAt;
    default:
      return false;
  }
}

const INTRODUCIBLE: DashboardKey[] = ['coalition', 'publicPressure', 'misuse', 'concentration'];

function relevance(s: GameState, key: DashboardKey): number {
  const r = INDICATOR_RELEVANCE;
  if (OPENING_INDICATORS.includes(key)) return Infinity;
  switch (key) {
    case 'coalition':
      return s.coalition >= 3 ? r.coalitionFull : r.coalitionBuilding;
    case 'publicPressure':
      return r.publicPressure;
    case 'misuse':
      return s.firedEvents.ransomware ? r.misuseAfterWave : r.misuseBeforeWave;
    case 'concentration':
      return s.flags.oversightMandate && !s.firedEvents.silicon_blackmail ? r.concentrationAtRisk : r.concentration;
    default:
      return 0;
  }
}

function indicatorWhy(key: DashboardKey): string {
  return copyText(INDICATOR_INTROS.find((i) => i.key === key)?.why) ?? INDICATOR_WHY[key] ?? 'It matters now.';
}

/** Introduce at most one indicator per quarter (handoff 06): 4 → 5 → 6, then replace the least relevant. */
function updateDashboard(s: GameState): void {
  const key = INTRODUCIBLE.find((k) => !hasMilestone(s, `ind:${k}`) && !s.dashboard.slots.includes(k) && indicatorDue(s, k));
  if (!key) return;
  addMilestone(s, `ind:${key}`);
  const d = s.dashboard;
  if (d.slots.length < 6) {
    d.slots.push(key);
  } else {
    let worst = -1;
    for (let i = 0; i < d.slots.length; i++) {
      if (relevance(s, d.slots[i]) === Infinity) continue;
      if (worst < 0 || relevance(s, d.slots[i]) < relevance(s, d.slots[worst])) worst = i;
    }
    d.slots[worst] = key; // keeps the other slots in place
  }
  d.cap = Math.min(6, Math.max(4, d.slots.length)) as 4 | 5 | 6;
  addNotice(s, { kind: 'indicator', id: key, title: GAUGE_INFO[key].label, text: indicatorWhy(key) });
}

function thresholdNotices(s: GameState): void {
  for (const t of THRESHOLD_NOTICES) {
    const before = s.quarterStart.gauges[t.key];
    const now = s.gauges[t.key];
    const crossed = t.below ? before >= t.at && now < t.at : before < t.at && now >= t.at;
    if (crossed) addNotice(s, { kind: 'threshold', id: t.id, title: t.title, text: t.text });
  }
}

function recordRisks(s: GameState): void {
  for (const def of RISKS_DEF) {
    if (s.dashboard.milestones.some((m) => m.startsWith(`risk:${def.id}:`))) continue;
    if (s.firedEvents[def.id] || evalCondition(s, def.appear)) addMilestone(s, `risk:${def.id}:${s.quarter}`);
  }
}

// ---------- News, notes, concerns, Léa ----------

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
  for (const rid of ['us_chip_controls', 'us_escalation', 'us_escalation_averted'] as const) {
    const e = s.log.find((x) => x.quarter === q && x.kind === 'actor' && (x.id === rid || x.id.startsWith(`${rid}:`)));
    const r = ACTOR_RULES[rid];
    if (e && r.news && !used.has(`actor.${rid}`)) must.push({ id: `actor.${rid}`, quarter: q, actor: r.actor, region: r.region, text: r.news });
  }
  // Milestones (crossing thresholds this quarter).
  for (const t of NEWS) {
    if (t.must && !used.has(`news.${t.id}`) && evalCondition(s, t.when)) {
      must.push({ id: `news.${t.id}`, quarter: q, actor: t.actor, region: t.region, text: t.text });
    }
  }

  const nw = TUNING.news;
  const placed = s.news.filter((n) => n.quarter === q); // event, beat and layoff lines are already there
  const target = randomInt(holder, nw.minLines, nw.maxLines);
  const room = Math.max(0, target - placed.length - must.length);
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

  // Story lines placed earlier this quarter count towards the maximum; a must line never pushes them out.
  const items = [...must, ...ambient].slice(0, Math.max(0, nw.maxLines - placed.length));
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

/** Themes of public concern, from what the public can see. */
function concernThemes(s: GameState): ConcernTheme[] {
  const t = CONCERN_THRESHOLDS;
  const g = s.gauges;
  const themes: ConcernTheme[] = [];
  if (g.capability >= t.jobsFromCapability) themes.push('jobs');
  if (g.misuse >= t.misuseFrom) themes.push('misuse');
  if (g.tension >= t.warFromTension) themes.push('war');
  if (g.concentration >= t.powerFromConcentration) themes.push('power');
  themes.push('safety');
  return themes;
}

function generateConcerns(s: GameState): void {
  const holder = { rng: s.rng };
  const t = CONCERN_THRESHOLDS;
  const count = 1 + t.morePressure.filter((x) => s.gauges.publicPressure >= x).length;
  const pool = CONCERNS.filter((c) => copyText(c.text)).length ? CONCERNS.filter((c) => copyText(c.text)) : CONCERN_FALLBACK;
  const lastIds = new Set(s.concerns.map((c) => c.id.replace(/^concern\.\d+\./, '')));
  const themes = shuffle(holder, concernThemes(s));
  const chosen: typeof pool = [];
  for (let i = 0; i < count; i++) {
    const theme = themes[i % themes.length];
    const fresh = (th: ConcernTheme) => pool.filter((c) => c.theme === th && !lastIds.has(c.id) && !chosen.includes(c));
    const options = fresh(theme).length ? fresh(theme) : fresh('general').length ? fresh('general') : pool.filter((c) => !chosen.includes(c));
    if (!options.length) break;
    chosen.push(options[Math.floor(random(holder) * options.length)]);
  }
  s.concerns = chosen.map((c, i) => ({
    id: `concern.${s.quarter}.${c.id}`,
    region: c.region,
    text: c.text,
    at: Math.round((0.15 + (0.7 * (i + 0.5)) / chosen.length + (random(holder) - 0.5) * 0.1) * 100) / 100,
  }));
  s.rng = holder.rng;
}

const LEA_SLOTS: Partial<Record<number, LeaScene['slot']>> = { 1: 'q1', 6: 'q6', 11: 'q11' };

function deliverLetter(s: GameState, slot: LeaScene['slot']): void {
  if (s.leaLetters.some((l) => l.slot === slot)) return;
  s.leaLetters.push({ ...leaScene(s, slot), quarter: s.quarter });
}

export function startQuarter(state: GameState): GameState {
  const s = cloneState(state);
  if (s.phase !== 'quarter' || quarterStarted(s)) return s;
  s.quarterStart = { gauges: { ...s.gauges }, coalition: s.coalition, pc: s.pc, budget: s.budget };
  s.bubblesThisQuarter = 0;
  s.decidedThisQuarter = false;
  s.pendingEvent = null;
  s.notices = [];
  s.contextCards = s.contextCards.filter((c) => c.until >= s.quarter);
  if (s.quarter > 1) applyIncome(s);
  runActors(s);
  runDrift(s);
  recordOdds(s, 'the race went on', true);
  checkEvents(s);
  employmentShocks(s);
  runBeats(s);
  updateDashboard(s);
  recordRisks(s);
  thresholdNotices(s);
  generateNews(s);
  generateNotes(s);
  generateConcerns(s);
  const slot = LEA_SLOTS[s.quarter];
  if (slot) deliverLetter(s, slot);
  return s;
}

/** v2: concern bubbles explain public concern; collecting one pays nothing (kept for compatibility). */
export function collectBubble(state: GameState, _region: RegionId): GameState {
  const s = cloneState(state);
  if (s.phase !== 'quarter') return s;
  s.bubblesThisQuarter = Math.min(TUNING.bubbles.maxPerQuarter, s.bubblesThisQuarter + 1);
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
    recordOdds(s, `you chose to ${opt.label.toLowerCase()}`);
  }
  s.pendingEvent = null;
  return s;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function cardLimit(card: CardDef): number | null {
  return card.steps ? card.steps.length : card.limit;
}

function cardLimitReached(s: GameState, card: CardDef): boolean {
  const limit = cardLimit(card);
  return limit !== null && (s.cardsPlayed[card.id] ?? 0) >= limit;
}

/** The step (level or use) the next play of this card is. */
function stepOf(s: GameState, card: CardDef): CardStepDef | null {
  if (!card.steps) return null;
  return card.steps[Math.min(s.cardsPlayed[card.id] ?? 0, card.steps.length - 1)];
}

function costOf(s: GameState, card: CardDef): { pc: number; budget: number; token?: boolean } {
  return stepOf(s, card)?.cost ?? card.cost;
}

function contextOffer(s: GameState, id: CardId) {
  return s.contextCards.find((c) => c.id === id && c.until >= s.quarter) ?? null;
}

/** In the hand: unlocked by the story, or a context card currently on offer. */
function inHand(s: GameState, card: CardDef): boolean {
  return card.context ? !!contextOffer(s, card.id) : s.unlockedCards.includes(card.id);
}

function cooldownUntil(s: GameState, card: CardDef): number | null {
  const last = s.cardLastPlayed[card.id];
  if (!card.cooldown || last === undefined) return null;
  const until = last + card.cooldown + 1;
  return until > s.quarter ? until : null;
}

function lockedReason(s: GameState, card: CardDef): string | null {
  if (s.phase === 'ended') return 'The game is over';
  if (!inHand(s, card)) return card.context ? 'Not on offer now' : 'Not unlocked yet';
  if (cardLimitReached(s, card)) return cardLimit(card) === 1 ? 'Already played' : card.levelled ? 'All levels reached' : 'No uses left';
  const cd = cooldownUntil(s, card);
  if (cd !== null) return `Needs rest after the last round: available again in ${dateLabel(cd)}`;
  // one audit at a time: buying another while one runs would reveal nothing new
  if (card.special === 'measure' && s.quarter <= s.revealUntil) return `An audit is already running (until ${dateLabel(s.revealUntil)})`;
  for (const r of card.requirements) if (!evalCondition(s, r.when)) return r.reason;
  return null;
}

function isFree(s: GameState): boolean {
  return s.phase === 'tipping';
}

function canAfford(s: GameState, card: CardDef): boolean {
  if (isFree(s)) return true;
  const cost = costOf(s, card);
  return s.pc >= cost.pc && s.budget >= cost.budget;
}

/** Whether a quarter follows the current decision (false on the last quarter or at the tipping point). */
function nextQuarterExists(s: GameState): boolean {
  return s.phase === 'quarter' && s.quarter < TUNING.lastQuarter && s.gauges.capability < TUNING.tippingAt;
}

function statLabel(key: StatKey): string {
  return capitalise(STAT_LABELS[key]);
}

function tone(key: StatKey, amount: number): EffectChip['tone'] {
  const dir = GOOD_DIRECTION[key];
  if (!dir || amount === 0) return 'neutral';
  return Math.sign(amount) === dir ? 'good' : 'bad';
}

function faceChips(s: GameState, card: CardDef): EffectChip[] {
  const step = stepOf(s, card);
  const sums = new Map<StatKey, number>();
  for (const e of [...card.effects, ...(step?.effects ?? [])]) {
    if (isHiddenKey(e.key) || (e.when && !evalCondition(s, e.when))) continue;
    sums.set(e.key, (sums.get(e.key) ?? 0) + e.amount);
  }
  const visible: EffectChip[] = [...sums]
    .filter(([, n]) => n !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([key, n]) => ({ key, text: `${statLabel(key)} ${signed(n)}`, tone: tone(key, n) }));
  for (const p of card.pending ?? []) visible.push({ key: p.key, text: `${statLabel(p.key)} ${signed(p.amount)} next quarter`, tone: tone(p.key, p.amount) });
  const extra: EffectChip[] = [];
  if (card.infoChip) extra.push({ key: 'info', text: card.infoChip, tone: 'good' });
  const hidden = card.hasHiddenEffects || card.hiddenEffects.length > 0 || (step?.hiddenEffects?.length ?? 0) > 0;
  if (hidden) extra.push({ key: 'hidden', text: '+ hidden effect', tone: 'neutral' });
  return [...visible.slice(0, Math.max(0, 3 - extra.length)), ...extra];
}

function realCostOf(id: CardId): CardView['realCost'] {
  const r = REAL_COSTS.find((x) => x.card === id && copyText(x.text));
  return r ? { text: r.text, source: { ...r.source } } : null;
}

function preparesFor(id: CardId): EventId[] {
  return RISKS_DEF.filter((r) => r.preparingCards.includes(id)).map((r) => r.id);
}

function unlockReasonFor(s: GameState, card: CardDef): string | null {
  if (card.context) return contextOffer(s, card.id)?.reason ?? null;
  if (INITIAL_CARDS.includes(card.id)) return null;
  return unlockReasonText(card.id) ?? BEATS.find((b) => b.cards.includes(card.id))?.reason ?? null;
}

function cardView(s: GameState, card: CardDef): CardView {
  const reason = lockedReason(s, card);
  const step = stepOf(s, card);
  const limit = cardLimit(card);
  const played = s.cardsPlayed[card.id] ?? 0;
  const offer = card.context ? contextOffer(s, card.id) : null;
  const token = costOf(s, card).token;
  return {
    id: card.id,
    name: step?.name ?? card.name,
    family: card.family,
    playerText: card.playerText,
    costLabel: isFree(s) ? `Free (tipping point)${token ? ', uses a token' : ''}` : (step?.costLabel ?? card.costLabel),
    available: reason === null,
    affordable: canAfford(s, card),
    lockedReason: reason,
    downside: card.downside,
    dependencies: card.dependencies.map((d) => ({ text: d.text, met: evalCondition(s, d.met) })),
    options: (card.options ?? []).map((o) => ({ id: o.id, label: o.label })),
    source: { ...card.source },
    isLouis: card.isLouis,
    isNew: s.notices.some((n) => (n.kind === 'card_unlocked' || n.kind === 'context_card') && n.id === card.id),
    unlockReason: unlockReasonFor(s, card),
    level: card.levelled && card.steps ? { next: Math.min(played + 1, card.steps.length), max: card.steps.length, name: step!.name } : null,
    usesLeft: limit === null ? null : Math.max(0, limit - played),
    cooldownUntil: cooldownUntil(s, card),
    face: faceChips(s, card),
    prepares: preparesFor(card.id),
    context: offer ? { until: offer.until, reason: offer.reason } : null,
    realCost: realCostOf(card.id),
  };
}

/** The hand: unlocked cards and context cards on offer (locked-but-unlocked ones greyed with their reason). */
export function cardViews(state: GameState): CardView[] {
  return CARDS.filter((card) => inHand(state, card)).map((card) => cardView(state, card));
}

interface CardApplication {
  costs: Delta[];
  deltas: Delta[];
  option?: CardOptionDef;
  step: CardStepDef | null;
}

/** Applies a card to a draft state (mutates it). No validation. */
function applyCard(s: GameState, card: CardDef, optionId?: string): CardApplication {
  const option = card.options?.find((o) => o.id === optionId) ?? card.options?.[0];
  const step = stepOf(s, card);
  const cost = costOf(s, card);
  const costs: Delta[] = [];
  if (!isFree(s)) {
    if (cost.pc) costs.push(change(s, 'pc', -cost.pc));
    if (cost.budget) costs.push(change(s, 'budget', -cost.budget));
  }
  if (cost.token) s.asmlTokens = Math.max(0, s.asmlTokens - 1);
  const specs = [
    ...card.effects,
    ...card.hiddenEffects,
    ...(step?.effects ?? []),
    ...(step?.hiddenEffects ?? []),
    ...(option ? [...option.effects, ...option.hiddenEffects] : []),
  ];
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
  s.cardLastPlayed[card.id] = s.quarter;
  if (card.context) s.contextCards = s.contextCards.filter((c) => c.id !== card.id);
  return { costs: costs.filter((d) => d.amount !== 0), deltas, option, step };
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

const readableCount = (s: GameState) => s.notes.filter((n) => n.readable).length;

/**
 * What the player learns or sees better after a decision, from the real before/after (handoff 01, bug B7):
 * narrower error bars, notes that become readable, the audit window. Never a hidden value.
 */
function infoGains(before: GameState, after: GameState): InfoGain[] {
  const gains: InfoGain[] = [];
  const bar = (key: 'capability' | 'apparentAlignment', label: string) => {
    const a = errorBar(before, key);
    const b = errorBar(after, key);
    if (a !== b) gains.push({ label: `${label} uncertainty`, from: `±${a}`, to: `±${b}`, text: `${label} error bar ±${a} → ±${b}` });
  };
  bar('capability', 'Capability');
  bar('apparentAlignment', 'Apparent alignment');
  const newly = readableCount(after) - readableCount(before);
  if (newly > 0) {
    gains.push({ label: 'Internal notes', text: `${newly} internal note${newly === 1 ? '' : 's'} you already received ${newly === 1 ? 'becomes' : 'become'} readable now` });
  }
  const follows = nextQuarterExists(after);
  if (after.flags.aiOffice && !before.flags.aiOffice && follows) gains.push({ label: 'Internal notes', text: 'Every internal note from now on is readable' });
  if (after.revealUntil > before.revealUntil && after.revealUntil >= after.quarter) {
    const until = !follows || after.revealUntil >= TUNING.lastQuarter ? 'for the rest of the game' : `until ${dateLabel(after.revealUntil)}`;
    gains.push({ label: 'Human influence in Europe', text: `Europe’s three human-influence scores shown ${until}` });
    if (!after.flags.aiOffice && follows) gains.push({ label: 'Internal notes', text: `Internal notes readable ${until}` });
  }
  return gains;
}

function costDeltas(s: GameState, card: CardDef): Delta[] {
  if (isFree(s)) return [];
  const cost = costOf(s, card);
  return [
    ...(cost.pc ? [{ key: 'pc' as const, amount: -cost.pc, hidden: false }] : []),
    ...(cost.budget ? [{ key: 'budget' as const, amount: -cost.budget, hidden: false }] : []),
  ];
}

export function previewCard(state: GameState, id: CardId, option?: string): CardPreview {
  const card = CARD_BY_ID[id];
  const oddsBefore = planOdds(state);
  const realCost = realCostOf(id);
  const opt0 = card.options?.find((o) => o.id === option) ?? card.options?.[0];
  const reason = lockedReason(state, card);
  if (reason) {
    // A locked card claims nothing: no deltas, no odds shift, just why it is locked (bug B5).
    return { cardId: id, option: opt0?.id, costs: costDeltas(state, card), visibleDeltas: [], notes: [`${reason}.`], oddsBefore, oddsAfter: oddsBefore, infoGains: [], realCost };
  }
  const draft = cloneState(state);
  const { deltas, option: opt, step } = applyCard(draft, card, option);
  const costs = costDeltas(state, card);
  const notes: string[] = [];
  if (!canAfford(state, card)) {
    const cost = costOf(state, card);
    const missing = [cost.pc > state.pc ? `${cost.pc - state.pc} PC` : '', cost.budget > state.budget ? `${cost.budget - state.budget} Budget` : ''].filter(Boolean);
    notes.push(`Not affordable yet: ${missing.join(' and ')} short.`);
  }
  for (const dep of card.dependencies) {
    notes.push(`${dep.text}${evalCondition(state, dep.met) ? ' (met).' : ' (not yet).'}`);
  }
  notes.push(...card.previewNotes);
  const future = nextQuarterExists(state);
  if (future) notes.push(...(card.futureNotes ?? []));
  if (future && card.pending?.length) {
    notes.push(`Next quarter: ${card.pending.map((p) => fmtDelta({ key: p.key, amount: p.amount, hidden: false })).join(', ')}.`);
  }
  if (card.hasHiddenEffects || card.hiddenEffects.length || step?.hiddenEffects?.length || (opt && opt.hiddenEffects.length > 0)) {
    notes.push('This decision has hidden effects. They will be revealed at the end.');
  }
  if (isFree(state)) notes.unshift('Tipping point: this last decision is free.');
  return {
    cardId: id,
    option: opt?.id,
    costs,
    visibleDeltas: deltas.filter((d) => !d.hidden),
    notes,
    oddsBefore,
    oddsAfter: planOdds(maskHidden(draft, state)),
    infoGains: infoGains(state, draft),
    realCost,
  };
}

function recordDecision(s: GameState, before: GameState, decision: GameState['history'][number]['decision']): void {
  if (before.phase !== 'quarter' && before.phase !== 'tipping') return;
  s.history.push({ quarter: s.quarter, report: situationReport(before), decision });
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
  const { costs, deltas, option: opt, step } = applyCard(s, card, option);
  s.decidedThisQuarter = true;
  const oddsAfter = planOdds(s);
  const { visible, hidden } = splitDeltas(deltas);
  const advisorNote = opt ? opt.advisorNote : pickText(s, card.advisorNotes);
  const name = step?.name ?? card.name;
  const title = opt ? `${name}: ${opt.label.toLowerCase()}` : name;
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
  recordOdds(s, card.did);
  recordDecision(s, state, { cardId: card.id, title, option: opt?.id });
  const consequence = card.consequence?.length ? pickText(s, card.consequence) : null;
  return {
    state: s,
    briefing: { title, visibleDeltas: [...costs, ...visible], advisorNote, infoGains: infoGains(state, s), consequence },
  };
}

export function pass(state: GameState): GameState {
  const s = cloneState(state);
  if (s.phase === 'ended' || s.decidedThisQuarter) return s;
  s.decidedThisQuarter = true;
  recordOdds(s, 'you passed');
  recordDecision(s, state, { cardId: null, title: 'No decision (saved resources)' });
  return s;
}

function deliverEnd(s: GameState): void {
  deliverLetter(s, 'end');
}

export function endQuarter(state: GameState): { state: GameState; outcome: QuarterOutcome } {
  const s = cloneState(state);
  if (s.phase === 'ended') return { state: s, outcome: 'game_over' };
  if (s.phase === 'tipping') return { state: s, outcome: 'tipping_point' };
  if (s.pendingEvent) throw new Error('Resolve the current event before ending the quarter');
  if (!s.history.some((h) => h.quarter === s.quarter)) {
    s.history.push({ quarter: s.quarter, report: situationReport(state), decision: { cardId: null, title: 'No decision' } });
  }
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
    deliverEnd(s);
    return { state: s, outcome: 'game_over' };
  }
  s.quarter += 1;
  return { state: s, outcome: 'next_quarter' };
}

// ---------------------------------------------------------------------------
// Tipping point, plans, endings
// ---------------------------------------------------------------------------

/**
 * Plan weights. `withHidden` adds the one term that reads a hidden value (shut it all down after a
 * warning shot from AIs that really are unsafe): the superpowers' real draw uses it, the odds shown
 * to the player do not.
 */
function planWeights(s: GameState, withHidden: boolean): Record<PlanId, number> {
  const p = TUNING.plans;
  const g = s.gauges;
  const sd = p.slowdown;
  const slowdown =
    sd.base +
    sd.verification * g.verification +
    sd.pressure * g.publicPressure +
    sd.coalition * s.coalition +
    (s.flags.warningShotPrepared ? sd.warningShot : 0) +
    ((s.cardsPlayed.emergency_summit ?? 0) > 0 ? sd.summit : 0) +
    sd.tension * g.tension;
  const sh = p.shutDown;
  const shutDown =
    sh.base +
    (g.publicPressure >= sh.pressureAt ? sh.pressure * g.publicPressure : 0) +
    (withHidden && s.firedEvents.warning_shot && g.trueAlignment < sh.unsafeBelow ? sh.unsafeBonus : 0);
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

function normalise(w: Record<PlanId, number>): Record<PlanId, number> {
  const total = PLAN_IDS.reduce((acc, k) => acc + w[k], 0);
  return Object.fromEntries(PLAN_IDS.map((k) => [k, w[k] / total])) as Record<PlanId, number>;
}

/** The superpowers' odds as the player can know them (public values only). */
export function planOdds(state: GameState): Record<PlanId, number> {
  return normalise(planWeights(state, false));
}

/** The real odds of the draw at the tipping point (includes the hidden term). */
function realOdds(state: GameState): Record<PlanId, number> {
  return normalise(planWeights(state, true));
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
  const odds = realOdds(s);
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
  deliverEnd(s);
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

/** Actor moves that happen every quarter, like drift. */
const ROUTINE_ACTOR_RULES = new Set(['labs_report', 'labs_consolidate']);
/** Lead-ins for the background line, varied by quarter so the report does not read the same every time. */
const BACKGROUND_LEADS = ['Background drift', 'Meanwhile, as every quarter', 'The usual drift', 'Underneath, as usual'];

/**
 * Routine = the same background move as last quarter: a drift or a regular actor move.
 * A drift whose wording changed since last quarter marks a threshold crossed, so it is news.
 */
function isRoutine(s: GameState, e: LogEntry): boolean {
  if (e.kind === 'actor') return ROUTINE_ACTOR_RULES.has(e.id);
  if (e.kind !== 'drift') return false;
  if (e.quarter <= 1) return true;
  return previousDrifts(s, e.quarter).has(`${e.id}|${e.title}`);
}

/** Drift entries (id|title) of the quarter before `quarter`, memoised per log array. */
const driftMemo = new WeakMap<LogEntry[], Map<number, Set<string>>>();
function previousDrifts(s: GameState, quarter: number): Set<string> {
  let byQ = driftMemo.get(s.log);
  if (!byQ) driftMemo.set(s.log, (byQ = new Map()));
  let set = byQ.get(quarter);
  if (!set) {
    set = new Set(s.log.filter((x) => x.kind === 'drift' && x.quarter === quarter - 1).map((x) => `${x.id}|${x.title}`));
    byQ.set(quarter, set);
  }
  return set;
}

/** The id under which the copy's suggested causes file this entry (its drift branch included). */
function causeId(e: LogEntry): string {
  if (e.kind === 'drift') {
    if (e.id === 'capability' && e.title.includes('high tension')) return 'capability_high_tension';
    if (e.id === 'tension' && e.actor === 'eu') return 'tension_coalition';
    if (e.id === 'misuse') return e.title.startsWith('Open models') ? 'misuse_open_models' : e.title.startsWith('Capable') ? 'misuse_capable' : 'misuse';
    if (e.id === 'layoffs') return 'economy_jobs';
    if (e.id === 'public_concern') return e.actor === 'us_labs' ? 'economy_jobs' : 'economy';
  }
  if (e.id.startsWith('employment_shock')) return 'employment_shock';
  return e.id;
}

/** The real cause of one key's change in one log entry (never a neighbour's: bug B1). */
function causeText(e: LogEntry, key: StatKey): string {
  const own = CAUSE_TEXT[e.id]?.[key];
  if (own) return own;
  const fromCopy = copyText(CAUSES.find((c) => c.id === causeId(e) && c.key === key)?.text);
  return fromCopy?.replace(/\.\s*$/, '') ?? e.title;
}

function lineKind(s: GameState, e: LogEntry): ReportLine['kind'] {
  if (e.kind === 'event') return 'event';
  if (e.kind === 'income') return 'card';
  if (e.kind === 'actor') return e.id.startsWith('employment_shock') ? 'threshold' : isRoutine(s, e) ? 'background' : 'actor';
  if (e.kind === 'drift') return isRoutine(s, e) ? 'background' : 'threshold';
  return 'actor';
}

const KIND_RANK: Record<ReportLine['kind'], number> = { event: 0, threshold: 1, card: 2, actor: 3, background: 4 };

/**
 * What a level means for winning, from public rules and thresholds only (tuning.ts): never a hidden value.
 * "Verification 37: 8 more needed for a verified deal (45)". '' when there is nothing useful to say.
 */
export function levelMeaning(s: GameState, key: DashboardKey): string {
  const e = TUNING.endings;
  const v = key === 'coalition' ? s.coalition : s.gauges[key];
  const label = GAUGE_INFO[key].label;
  const head = `${label} ${v}`;
  switch (key) {
    case 'capability':
      return v >= TUNING.tippingAt ? `${head}: AI now improves itself` : `${head}: at ${TUNING.tippingAt} AI starts improving itself`;
    case 'verification':
      return v >= e.utopiaVerification
        ? `${head}: enough inspectors to verify a deal (${e.utopiaVerification}+)`
        : `${head}: ${e.utopiaVerification - v} more needed for a verified deal (${e.utopiaVerification})`;
    case 'tension': {
      const hi = TUNING.drift.highTensionAt;
      if (v > e.multipolarMaxTension) return `${head}: above ${e.multipolarMaxTension}, partners stay away and a US–China fight would turn into a hot war`;
      if (v >= hi) return `${head}: above ${hi} the race speeds up and a fight becomes likelier`;
      return `${head}: ${hi - v} below the level where the race speeds up (${hi})`;
    }
    case 'coalition':
      if (v === 0) return `${head} of 3: one partner lets Europe mediate a US–China fight; each level makes a verified slowdown likelier`;
      if (v < TUNING.drift.coalitionCoolsAt) return `${head} of 3: from level ${TUNING.drift.coalitionCoolsAt}, coalition diplomacy cools tension every quarter`;
      return `${head} of 3: coalition diplomacy cools tension every quarter`;
    case 'publicPressure': {
      const at = TUNING.income.highPressureAt;
      const shut = TUNING.plans.shutDown.pressureAt;
      if (v >= shut) return `${head}: +1 PC every quarter, and a full shutdown becomes possible (${shut}+)`;
      if (v >= at) return `${head}: +1 PC every quarter while it stays at ${at}+`;
      return `${head}: at ${at}, you get 1 more PC every quarter`;
    }
    case 'misuse': {
      const wave = TUNING.risks.ransomwareMisuse;
      if (s.firedEvents.ransomware) return '';
      return v >= wave ? `${head}: a ransomware wave can hit at any time` : `${head}: at ${wave} a ransomware wave hits Europe`;
    }
    case 'concentration': {
      const big = TUNING.endings.bigAiConcentration;
      if (v > e.utopiaMaxConcentration) return `${head}: above ${e.utopiaMaxConcentration}, a verified deal would not hold`;
      if (v >= big) return `${head}: at ${big}+ a few labs can bend Europe’s rules`;
      return `${head}: at ${big} a few labs can bend Europe’s rules`;
    }
    case 'approval': {
      const low = TUNING.income.lowApprovalBelow;
      return v < low ? `${head}: below ${low}, you get 1 PC less every quarter` : `${head}: below ${low}, you would get 1 PC less every quarter`;
    }
    case 'apparentAlignment':
      return `${head}: what the labs claim, not necessarily what is true`;
    default:
      return '';
  }
}

/** The state as it was when the quarter started, as far as the risk track can tell (public values only). */
function startOfQuarter(s: GameState): GameState {
  const fired: GameState['firedEvents'] = {};
  for (const [k, v] of Object.entries(s.firedEvents)) if (v!.quarter < s.quarter) fired[k as EventId] = v;
  return { ...s, gauges: { ...s.quarterStart.gauges }, coalition: s.quarterStart.coalition, firedEvents: fired, quarter: s.quarter - 1 };
}

export function situationReport(state: GameState): SituationReport {
  const s = state;
  const q = s.quarter;
  const entries = s.log.filter((e) => e.quarter === q && e.kind !== 'card' && e.kind !== 'tipping');
  const keys: (GaugeKey | 'coalition')[] = [...VISIBLE_GAUGES, 'coalition'];
  const changes: SituationReport['changes'] = [];
  const candidates: { key: DashboardKey; amount: number; e: LogEntry; kind: ReportLine['kind'] }[] = [];
  for (const key of keys) {
    const now = key === 'coalition' ? s.coalition : s.gauges[key];
    const start = key === 'coalition' ? s.quarterStart.coalition : s.quarterStart.gauges[key];
    const delta = now - start;
    if (delta === 0) continue;
    const contributors = entries
      .map((e) => ({ e, amount: e.visibleDeltas.filter((d) => d.key === key).reduce((acc, d) => acc + d.amount, 0) }))
      .filter((x) => x.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const titles = contributors.slice(0, 2).map((x, i) => (i === 0 ? causeText(x.e, key) : lowerFirst(causeText(x.e, key))));
    const cause = titles.length ? titles.join('; ') : 'Several causes';
    const routine = contributors.length > 0 && contributors.every((x) => isRoutine(s, x.e));
    changes.push({ key, label: GAUGE_INFO[key].label, delta, cause, value: now, routine });
    for (const x of contributors) candidates.push({ key: key as DashboardKey, amount: x.amount, e: x.e, kind: lineKind(s, x.e) });
  }
  changes.sort((a, b) => Number(a.routine) - Number(b.routine) || Math.abs(b.delta) - Math.abs(a.delta));

  // Headline: the 1–3 things that matter, each with its own real cause.
  const valueOf = (k: DashboardKey) => (k === 'coalition' ? s.coalition : s.gauges[k]);
  const deltaOf = (k: DashboardKey) => changes.find((c) => c.key === k)?.delta ?? 0;
  const headline: ReportLine[] = [];
  const news = candidates.filter((c) => c.kind !== 'background').sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || Math.abs(b.amount) - Math.abs(a.amount));
  for (const c of news) {
    if (headline.length >= 3 || headline.some((h) => h.key === c.key)) continue;
    headline.push({ key: c.key, label: GAUGE_INFO[c.key].label, value: valueOf(c.key), delta: deltaOf(c.key), cause: causeText(c.e, c.key), kind: c.kind, meaning: levelMeaning(s, c.key) });
  }
  if (!headline.length) {
    const primary = s.dashboard.slots;
    const bg = candidates
      .filter((c) => c.kind === 'background')
      .sort((a, b) => Number(primary.includes(b.key)) - Number(primary.includes(a.key)) || Math.abs(b.amount) - Math.abs(a.amount))[0];
    if (bg) headline.push({ key: bg.key, label: GAUGE_INFO[bg.key].label, value: valueOf(bg.key), delta: deltaOf(bg.key), cause: causeText(bg.e, bg.key), kind: 'background', meaning: levelMeaning(s, bg.key) });
  }
  const routine = changes.filter((c) => c.routine);
  const background = routine.length
    ? `${BACKGROUND_LEADS[(q - 1) % BACKGROUND_LEADS.length]}: ${routine.map((c) => `${STAT_LABELS[c.key]} ${c.value} (${signed(c.delta)})`).join(', ')}.`
    : '';

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
    } else if (e.id === 'us_escalation') {
      why.push('Two quarters after the stolen model, Washington widened export controls on its own.');
    } else if (e.id.startsWith('us_escalation_averted')) {
      why.push('Because you attributed the theft with your partners, Washington held back new export controls.');
    } else if (e.id.startsWith('employment_shock')) {
      why.push(`${e.title}: approval fell and public pressure rose${s.flags.flexicurity ? ', softened by flexicurity' : ''}.`);
    } else if (e.kind === 'drift' && e.id === 'tension' && e.actor === 'eu') {
      const first = !s.log.some((x) => x.kind === 'drift' && x.id === 'tension' && x.actor === 'eu' && x.quarter < q);
      if (first) why.push('With two coalition levels, diplomacy now cools tension every quarter.');
    }
  }
  if (s.phase === 'tipping') why.unshift('AI can now automate its own research. The US and China are about to choose a path.');

  const before = new Map(riskViews(startOfQuarter(s)).map((r) => [r.id, r.stage]));
  const risksMoved = riskViews(s).filter((r) => before.get(r.id) !== r.stage);

  const notesQ = s.notes.filter((n) => n.quarter === q);
  const slot = LEA_SLOTS[q] ?? null;
  const letter = slot ? s.leaLetters.find((l) => l.slot === slot) : undefined;
  return {
    quarter: q,
    dateLabel: dateLabel(q),
    changes,
    background,
    why,
    forecast: forecast(s),
    newNews: s.news.filter((n) => n.quarter === q).length,
    newNotes: { total: notesQ.length, readable: notesQ.filter((n) => n.readable).length },
    lea: slot && s.phase === 'quarter' ? (letter ? { slot: letter.slot, variant: letter.variant, text: letter.text } : leaScene(s, slot)) : null,
    headline,
    risksMoved,
    trajectoryChange: trajectory(s).change,
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

/** "a", "a and b", "a, b and c" */
function joinClauses(xs: string[], word = 'and'): string {
  return xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${word} ${xs[xs.length - 1]}` : (xs[0] ?? '');
}

/**
 * The ending's text and "why" line for this game: the `{causes}` slot holds what actually happened,
 * and the why line names the conditions that held or failed, with their values.
 */
function endingStory(s: GameState, id: EndingId): { text: string; why: string } {
  const def = ENDING_BY_ID[id];
  const held = def.reasons.filter((r) => !r.when || evalCondition(s, r.when));
  let clauses = held.flatMap((r) => (r.clause ? [r.clause] : []));
  // a state that does not match its ending (only in crafted states): name every possibility
  const or = !clauses.length;
  if (or) clauses = def.reasons.flatMap((r) => (r.clause ? [r.clause] : []));
  let text = def.text;
  const at = text.indexOf('{causes}');
  if (at >= 0) {
    const joined = joinClauses(clauses, or ? 'or' : 'and');
    const startsSentence = at === 0 || /[.!?]\s+$|\n$/.test(text.slice(0, at));
    text = text.replace('{causes}', startsSentence ? capitalise(joined) : joined);
  }
  const fill = (x: string) =>
    x.replace(/\{([\w.]+)\}/g, (_, key: string) => {
      const v = lookup(s, key);
      return typeof v === 'number' ? String(Math.round(v)) : String(v);
    });
  return { text, why: held.map((r) => fill(r.why)).join(' ') };
}

function endingView(s: GameState): EndingView {
  const id = s.ending ?? resolveEnding(s);
  const def = ENDING_BY_ID[id];
  const story = endingStory(s, id);
  return {
    id,
    world: def.world,
    good: def.good,
    title: def.title,
    text: story.text,
    why: story.why,
    epilogue: EPILOGUES[influenceBand(s)],
    lea: leaScene({ ...s, ending: id }, 'end'),
    source: { ...def.source },
  };
}

function sumDeltas(lists: Delta[][]): Delta[] {
  const out: Delta[] = [];
  for (const d of lists.flat()) {
    const x = out.find((y) => y.key === d.key);
    if (x) x.amount += d.amount;
    else out.push({ ...d });
  }
  return out.filter((d) => d.amount !== 0);
}

/**
 * One debrief entry per card (and option), however often it was played (bug B3): the deltas are summed,
 * the card's explanation is given once, and what differed between plays (the odds shift) is dated.
 */
function groupDecisions(entries: LogEntry[]): Debrief['decisions'] {
  const groups = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const card = CARD_BY_ID[e.id as CardId];
    const opt = card?.options?.find((o) => e.title.endsWith(`: ${o.label.toLowerCase()}`));
    const k = `${e.id}|${opt?.id ?? ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  return [...groups.values()].map((list) => {
    const first = list[0];
    const last = list[list.length - 1];
    const card = CARD_BY_ID[first.id as CardId];
    let title = first.title;
    let explanation = first.debrief;
    if (list.length > 1) {
      // the UI adds ×n from `quarters`; a levelled card is named after the level it reached
      if (card?.levelled) title = last.title;
      const opt = card?.options?.find((o) => first.title.endsWith(`: ${o.label.toLowerCase()}`));
      const base = [card?.debrief, opt?.debrief].filter(Boolean).join(' ');
      const rests = list.map((e) => (base && e.debrief.startsWith(base) ? e.debrief.slice(base.length).trim() : e.debrief));
      const same = rests.every((r) => r === rests[0]);
      explanation = [base, same ? rests[0] : list.map((e, i) => `${dateLabel(e.quarter)}: ${rests[i]}`).join(' ')].filter(Boolean).join(' ');
    }
    return {
      quarter: first.quarter,
      quarters: list.map((e) => e.quarter),
      title,
      visibleDeltas: list.length > 1 ? sumDeltas(list.map((e) => e.visibleDeltas)) : first.visibleDeltas,
      hiddenDeltas: list.length > 1 ? sumDeltas(list.map((e) => e.hiddenDeltas)) : first.hiddenDeltas,
      explanation,
    };
  });
}

export function debrief(state: GameState): Debrief {
  const s = state;
  if (s.phase !== 'ended') throw new Error('The debrief is only available once the game has ended');
  const decisions = groupDecisions(s.log.filter((e) => e.kind === 'card'));
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
// v2 views: dashboard, risks, advisor, trajectory, income, tips, journal
// ---------------------------------------------------------------------------

export function dashboard(state: GameState): DashboardView {
  const views = gaugeViews(state).filter((g) => g.visible);
  const slots = state.dashboard.slots;
  const primary = slots
    .map((k) => views.find((g) => g.key === k))
    .filter((g): g is GaugeView => !!g)
    .slice(0, state.dashboard.cap);
  const secondary = views.filter((g) => !slots.includes(g.key as DashboardKey));
  const n = state.notices.find((x) => x.kind === 'indicator');
  return { cap: state.dashboard.cap, primary, secondary, introduced: n ? { key: n.id as DashboardKey, why: n.text } : null };
}

type Stage = RiskView['stage'];

function stageOf(s: GameState, def: RiskDef): Exclude<Stage, 'happened'> {
  const margins = TUNING.risks.margins;
  let level = 2; // imminent, unless a target is still far
  for (const t of def.targets) {
    const gap = t.at - s.gauges[t.key];
    const m = margins[t.key];
    const l = gap <= m.imminent ? 2 : gap <= m.rising ? 1 : 0;
    level = Math.min(level, l);
  }
  return level === 2 ? 'imminent' : level === 1 ? 'rising' : 'watch';
}

function riskAppeared(s: GameState, def: RiskDef): boolean {
  if (s.firedEvents[def.id]) return true;
  const recorded = s.dashboard.milestones.some((m) => {
    if (!m.startsWith(`risk:${def.id}:`)) return false;
    return Number(m.split(':')[2]) <= s.quarter;
  });
  return recorded || evalCondition(s, def.appear);
}

/** The risk track: telegraphed crises, read from public values only (never true alignment or human influence). */
export function riskViews(state: GameState): RiskView[] {
  const s = state;
  const out: RiskView[] = [];
  for (const def of RISKS_DEF) {
    if (!riskAppeared(s, def)) continue;
    const fired = s.firedEvents[def.id];
    const copy = RISKS.find((r) => r.id === def.id);
    const stage: Stage = fired ? 'happened' : stageOf(s, def);
    const prepared = fired ? fired.prepared : evalCondition(s, EVENT_BY_ID[def.id].preparedWhen);
    const why = fired
      ? `${dateLabel(fired.quarter)}: Europe was ${fired.prepared ? 'prepared' : 'not prepared'}.`
      : def.targets.map((t) => `${GAUGE_INFO[t.key].label} ${s.gauges[t.key]} (danger at ${t.at})`).join(', ') + '.';
    out.push({
      id: def.id,
      title: copyText(copy?.title) ?? def.fallback.title,
      stage,
      certainty: def.certainty,
      prepared,
      preparedBy: copyText(copy?.preparedBy) ?? def.fallback.preparedBy,
      preparingCards: def.preparingCards.slice(),
      why,
    });
  }
  return out;
}

function riskStageText(id: EventId, stage: Stage): string {
  const def = RISKS_DEF.find((r) => r.id === id)!;
  return copyText(RISKS.find((r) => r.id === id)?.stages[stage]) ?? def.fallback[stage];
}

/** Copy template ids (src/data/copy/engine-words.ts) for the engine's advisor templates. */
const ADVISOR_COPY_ID: Partial<Record<keyof typeof ADVISOR_TEXT, string>> = {
  prepareRisk: 'prepare_risk',
  prepareRiskImminent: 'risk_imminent',
  tension: 'cool_tension',
  verification: 'build_verification',
  aiOffice: 'see_clearly',
  coalition: 'grow_coalition',
  social: 'protect_people',
  context: 'context_window',
  saveFor: 'save_resources',
  alternative: 'alternative',
};

function advisorText(id: keyof typeof ADVISOR_TEXT, vars: Record<string, string>): string {
  const copyId = ADVISOR_COPY_ID[id];
  const fromCopy = copyId ? copyText(ADVISOR.find((a) => a.id === copyId)?.text) : null;
  const out = fill(fromCopy ?? ADVISOR_TEXT[id], vars);
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

/** One recommendation with its reason and an alternative. Reads only what the player can know. */
export function advisor(state: GameState): AdvisorView {
  const s = state;
  if (s.phase === 'ended') return { text: 'The game is over.', recommend: null, reason: '', alternative: null };
  const views = new Map(cardViews(s).map((c) => [c.id, c]));
  const ok = (id: CardId) => {
    const v = views.get(id);
    return !!v && v.available && v.affordable;
  };
  const nameOf = (id: CardId) => views.get(id)?.name ?? CARD_BY_ID[id].name;
  type Option = { card: CardId; text: string; reason: string };
  const options: Option[] = [];
  const push = (card: CardId, text: string, reason: string) => {
    if (ok(card) && !options.some((o) => o.card === card)) options.push({ card, text, reason });
  };
  const g = s.gauges;
  /** Cards that would still change whether Europe is prepared for this risk. */
  const stillHelps = (r: RiskView, card: CardId) =>
    !(r.id === 'warning_shot' && card === 'coalition' && s.coalition >= 1) && !(r.id === 'warning_shot' && card === 'host_verification' && g.verification >= 30);
  const rank: Record<Stage, number> = { imminent: 0, rising: 1, watch: 2, happened: 3 };
  const open = riskViews(s)
    .filter((r) => r.stage !== 'happened' && !r.prepared)
    .sort((a, b) => rank[a.stage] - rank[b.stage]);

  // 1. Unprepared risks that are rising or imminent, most urgent first.
  let blocked: { card: CardId; risk: string; reason: string } | null = null;
  for (const r of open.filter((x) => x.stage !== 'watch')) {
    const reason = fill(ADVISOR_REASON.risk, { risk: r.title, stage: riskStageText(r.id, r.stage) });
    for (const card of r.preparingCards.filter((c) => stillHelps(r, c))) {
      if (ok(card)) push(card, advisorText(r.stage === 'imminent' ? 'prepareRiskImminent' : 'prepareRisk', { risk: r.title, card: nameOf(card) }), reason);
      else if (!blocked && views.get(card)?.available) blocked = { card, risk: r.title, reason };
    }
  }
  const fromRisks = options.length;
  // 2. A window of opportunity that will close.
  for (const c of s.contextCards) push(c.id, advisorText('context', { card: nameOf(c.id) }), fill(ADVISOR_REASON.context, { reason: c.reason.replace(/\.$/, '') }));
  // 3. Risks on watch.
  for (const r of open.filter((x) => x.stage === 'watch')) {
    const reason = fill(ADVISOR_REASON.risk, { risk: r.title, stage: riskStageText(r.id, r.stage) });
    for (const card of r.preparingCards.filter((c) => stillHelps(r, c))) push(card, advisorText('prepareRisk', { risk: r.title, card: nameOf(card) }), reason);
  }
  // 4. The trajectory and the basics of a verifiable deal.
  if (g.tension >= 50) {
    push('diplomatic_talks', advisorText('tension', { card: nameOf('diplomatic_talks') }), ADVISOR_REASON.tension);
    push('coalition', advisorText('tension', { card: nameOf('coalition') }), ADVISOR_REASON.tension);
  }
  if (!s.flags.aiOffice) push('ai_office', advisorText('aiOffice', { card: nameOf('ai_office') }), ADVISOR_REASON.aiOffice);
  if (s.coalition === 0) push('coalition', advisorText('coalition', { card: nameOf('coalition') }), ADVISOR_REASON.coalition);
  if (g.verification < 50) push('host_verification', advisorText('verification', { card: nameOf('host_verification') }), ADVISOR_REASON.verification);
  if (s.coalition < 2) push('coalition', advisorText('coalition', { card: nameOf('coalition') }), ADVISOR_REASON.coalition);
  if (g.capability >= 30 && !s.flags.flexicurity) push('flexicurity', advisorText('social', { card: nameOf('flexicurity') }), ADVISOR_REASON.social);
  push('fund_alignment', advisorText('safety', { card: nameOf('fund_alignment') }), ADVISOR_REASON.safety);
  if (g.tension >= 40) push('diplomatic_talks', advisorText('tension', { card: nameOf('diplomatic_talks') }), ADVISOR_REASON.tension);
  if (s.coalition < 3) push('coalition', advisorText('coalition', { card: nameOf('coalition') }), ADVISOR_REASON.coalition);

  const altOf = (o: Option | undefined) =>
    o ? { card: o.card, text: advisorText('alternative', { alt: nameOf(o.card) }) } : { card: null, text: advisorText('noAlternative', {}) };
  if (blocked && fromRisks === 0) {
    // The answer to an urgent risk is not affordable yet: say so rather than push something else first.
    return { text: advisorText('prepareRiskLater', { risk: blocked.risk, card: nameOf(blocked.card) }), recommend: null, reason: blocked.reason, alternative: altOf(options[0]) };
  }
  if (!options.length) {
    // Nothing affordable worth doing: name what saving is for, when there is something.
    const later = [...views.values()].find((v) => v.available && !v.affordable);
    const text = later ? advisorText('saveFor', { card: later.name }) : advisorText('save', {});
    return { text, recommend: null, reason: ADVISOR_REASON.save, alternative: null };
  }
  return { text: options[0].text, recommend: options[0].card, reason: options[0].reason, alternative: altOf(options[1]) };
}

/** Append the odds after something that may move them. Background drift is recorded only when it moved them. */
function recordOdds(s: GameState, cause: string, onlyIfMoved = false): void {
  const odds = planOdds(s);
  const last = s.oddsHistory[s.oddsHistory.length - 1];
  if (onlyIfMoved && last && PLAN_IDS.every((p) => Math.round(last.odds[p] * 100) === Math.round(odds[p] * 100))) return;
  s.oddsHistory.push({ quarter: s.quarter, odds, cause });
}

export function trajectory(state: GameState): TrajectoryView {
  const odds = planOdds(state);
  const h = state.oddsHistory;
  let change: TrajectoryView['change'] = null;
  for (let i = h.length - 1; i > 0 && !change; i--) {
    const diff = PLAN_IDS.map((p) => ({ p, d: h[i].odds[p] - h[i - 1].odds[p] }));
    const top = diff.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) + 1e-9 ? b : a));
    if (Math.round(Math.abs(top.d) * 100) >= 1) change = { plan: top.p, delta: top.d, because: h[i].cause };
  }
  return { odds, mostLikely: mostLikely(odds), change };
}

export function nextIncome(state: GameState): IncomeView {
  const { pc, budget, reasons } = incomeParts(state);
  const pendingPc = pendingOf(state, 'pc');
  const pendingBudget = pendingOf(state, 'budget');
  if (pendingPc) reasons.push(`${signed(pendingPc)} PC: delayed effect of last decision`);
  if (pendingBudget) reasons.push(`${signed(pendingBudget)} Budget: delayed effect of last decision`);
  const cap = TUNING.income.cap;
  if (state.pc + pc + pendingPc > cap || state.budget + budget + pendingBudget > cap) reasons.push(`PC and Budget are capped at ${cap}: spend or lose the rest`);
  const nextQuarterExistsNow = state.phase === 'quarter' && state.quarter < TUNING.lastQuarter && state.gauges.capability < TUNING.tippingAt;
  return { pc: pc + pendingPc, budget: budget + pendingBudget, reasons, nextQuarterExists: nextQuarterExistsNow };
}

function tipDue(s: GameState, id: (typeof TIP_ORDER)[number]): boolean {
  switch (id) {
    case 'tip_clock':
    case 'tip_decision':
      return true;
    case 'tip_hidden':
      return s.notes.length > 0 || s.flags.alignmentErrorDoubled;
    case 'tip_trajectory':
      return s.quarter >= 2;
    case 'tip_risks':
      return riskViews(s).length > 0;
    case 'tip_coalition':
      return s.unlockedCards.includes('coalition');
    case 'tip_pressure':
      return s.dashboard.slots.includes('publicPressure') || hasMilestone(s, 'ind:publicPressure');
    case 'tip_misuse':
      return hasMilestone(s, 'ind:misuse');
    case 'tip_context':
      return s.contextCards.some((c) => c.until >= s.quarter);
    case 'tip_human_influence':
      return s.act >= 3;
    case 'tip_tipping':
      return s.gauges.capability >= 70;
  }
}

function tipFor(id: string): Tip {
  const c = TIPS.find((t) => t.id === id);
  const f = TIP_FALLBACK[id as (typeof TIP_ORDER)[number]] ?? { title: 'Tip', text: '' };
  const t: Tip = { id, title: copyText(c?.title) ?? f.title, text: copyText(c?.text) ?? f.text };
  if (c?.fact) t.fact = { text: c.fact.text, source: { ...c.fact.source } };
  return t;
}

/**
 * The tip to show now, at most one per quarter (the guided first quarter shows two: the clock, then the
 * decision). Highest priority first among those due and not yet shown.
 */
export function tip(state: GameState): Tip | null {
  const s = state;
  if (s.phase === 'ended') return null;
  const shown = s.tipLog.filter((t) => t.quarter === s.quarter).map((t) => t.id);
  const firstQuarterPair = s.quarter === 1 && shown.length === 1 && shown[0] === 'tip_clock';
  if (shown.length && !firstQuarterPair) return null;
  for (const id of TIP_ORDER) {
    if (s.tipsShown.includes(id) || !tipDue(s, id)) continue;
    if (firstQuarterPair && id !== 'tip_decision') return null;
    return tipFor(id);
  }
  return null;
}

export function markTipShown(state: GameState, tipId: string): GameState {
  const s = cloneState(state);
  if (!s.tipsShown.includes(tipId)) {
    s.tipsShown.push(tipId);
    s.tipLog.push({ id: tipId, quarter: s.quarter });
  }
  return s;
}

export function journal(state: GameState): JournalEntry[] {
  return state.history.map((h) => ({
    quarter: h.quarter,
    dateLabel: dateLabel(h.quarter),
    report: h.report,
    decision: h.decision,
    events: (Object.entries(state.firedEvents) as [EventId, NonNullable<GameState['firedEvents'][EventId]>][])
      .filter(([, f]) => f.quarter === h.quarter)
      .map(([id, f]) => ({ id, title: EVENT_BY_ID[id].title, prepared: f.prepared })),
    lea: state.leaLetters.find((l) => l.quarter === h.quarter && l.slot !== 'end') ?? null,
    tips: state.tipLog.filter((t) => t.quarter === h.quarter).map((t) => tipFor(t.id)),
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
