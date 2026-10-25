// Shared contract between the engine (src/engine, src/data) and the UI (src/ui).
// Rules and numbers: docs/DEVELOPER_NOTES.md. Player-facing design: docs/SPEC.md.
// Change this file only with care: both sides depend on it.

export type Speed = 'slow' | 'steady' | 'fast';

export type GaugeKey =
  | 'capability'
  | 'concentration'
  | 'apparentAlignment'
  | 'trueAlignment' // hidden
  | 'verification'
  | 'tension'
  | 'misuse'
  | 'publicPressure'
  | 'gdp'
  | 'approval';

export type EuKey = 'economy' | 'culture' | 'state'; // hidden human influence in Europe

/** Anything a delta can touch. 'eu.economy' etc. address the hidden EU scores. */
export type StatKey = GaugeKey | 'coalition' | 'pc' | 'budget' | `eu.${EuKey}`;

export type ActorId = 'eu' | 'us' | 'china' | 'us_labs' | 'open_source' | 'ai_systems';
export type RegionId = 'eu' | 'us' | 'cn';

export type CardId =
  | 'coalition'
  | 'host_verification'
  | 'asml'
  | 'ai_office'
  | 'measure'
  | 'open_models'
  | 'oversight_mandate'
  | 'flexicurity'
  | 'weight_security'
  | 'fund_alignment'
  | 'cyber_defence'
  // v2
  | 'diplomatic_talks'
  // v2 context cards: appear only when the situation creates them, for a limited time
  | 'emergency_summit'
  | 'joint_attribution';

export type EventId = 'warning_shot' | 'weight_theft' | 'opaque_reasoning' | 'silicon_blackmail' | 'ransomware';

export type PlanId = 'verified_slowdown' | 'shut_down' | 'fight_china' | 'race';

export type WorldKind = 'plateau' | 'big_ai' | 'diplomacy' | 'arms_race' | 'take_off';

export type EndingId =
  | 'bright_winter'
  | 'decentralised_mayhem'
  | 'agent_economy'
  | 'silicon_blackmail'
  | 'licensed_utopia'
  | 'unstable_pause'
  | 'multipolar_world'
  | 'hot_war'
  | 'cognitive_revolution'
  | 'loss_of_control';

export interface Delta {
  key: StatKey;
  amount: number; // signed, already applied after clamping
  hidden: boolean; // true for trueAlignment, eu.* and anything the player must not see before the debrief
}

export interface Source {
  label: string; // e.g. "Europe 2031 (recommendations)"
  url: string;
}

/** One line in the public feed. Revealed progressively by the UI while the clock runs. */
export interface NewsItem {
  id: string;
  quarter: number;
  actor: ActorId;
  region: RegionId;
  text: string;
  /** 0..1: when during the quarter's clock animation the UI should show it. */
  at: number;
}

/** Confidential note from labs or intelligence services. */
export interface InternalNote {
  id: string;
  quarter: number;
  actor: ActorId;
  region: RegionId;
  text: string; // full text, revealed in the debrief in any case
  readable: boolean; // false → UI shows it redacted (█████) during play
  at: number;
}

export interface LogEntry {
  quarter: number;
  kind: 'card' | 'event' | 'actor' | 'drift' | 'income' | 'bubble' | 'tipping';
  id: string; // card id, event id, actor rule id...
  actor: ActorId;
  title: string; // short label, e.g. "Weight theft"
  visibleDeltas: Delta[];
  hiddenDeltas: Delta[];
  briefing: string; // what the player was told at the time
  debrief: string; // what really happened (shown at the end)
}

export interface EventOption {
  id: string;
  label: string;
  description: string;
  preview: Delta[]; // visible deltas only
}

/** An event that fired this quarter and is waiting for the player to read it (and maybe choose). */
export interface PendingEvent {
  id: EventId;
  actor: ActorId;
  region: RegionId;
  title: string;
  prepared: boolean;
  scene: string; // 2–4 vivid lines (Louis's style)
  whyItMatters: string;
  alreadyReal: { text: string; source: Source };
  appliedDeltas: Delta[]; // visible deltas already applied when it fired
  options: EventOption[]; // empty → just "Continue"
  at: number; // 0..1 moment in the clock when it interrupts
}

export interface Flags {
  aiOffice: boolean;
  openModels: boolean;
  oversightMandate: boolean;
  flexicurity: boolean;
  weightSecurity: boolean;
  cyberDefence: boolean;
  exportControls: boolean;
  warningShotPrepared: boolean;
  alignmentErrorDoubled: boolean;
}

export interface FiredEvent {
  quarter: number;
  prepared: boolean;
  choice?: string;
}

export interface TippingResult {
  odds: Record<PlanId, number>; // probabilities summing to 1
  plan: PlanId;
  labRestraint: boolean | null; // null unless plan === 'race'
}

export type Phase =
  | 'quarter' // between startQuarter and the end of the decision
  | 'tipping' // capability reached 80: free last decision, then plans
  | 'ended';

export interface GameState {
  seed: number;
  rng: number; // internal seeded RNG state
  phase: Phase;
  quarter: number; // 1..16 (Q1 2027 .. Q4 2030)
  gauges: Record<GaugeKey, number>;
  coalition: number; // 0..3
  eu: Record<EuKey, number>;
  takeoffSpeed: Speed;
  pc: number;
  budget: number;
  asmlTokens: number;
  flags: Flags;
  cardsPlayed: Partial<Record<CardId, number>>;
  firedEvents: Partial<Record<EventId, FiredEvent>>;
  pendingEvent: PendingEvent | null;
  pending: Delta[]; // applied at the start of next quarter
  revealUntil: number; // eu scores visible while quarter <= revealUntil
  bubblesThisQuarter: number;
  decidedThisQuarter: boolean;
  news: NewsItem[];
  notes: InternalNote[];
  log: LogEntry[];
  /** Visible gauges at the start of the current quarter, for the situation report. */
  quarterStart: { gauges: Record<GaugeKey, number>; coalition: number; pc: number; budget: number };
  tipping: TippingResult | null;
  ending: EndingId | null;

  // ---------- v2 ----------
  /** Story act: 1 "A seat at the table" (2027), 2 "The race goes public", 3 "Who decides?". */
  act: ActId;
  /** Cards the player has unlocked (permanent) and context cards currently on offer. */
  unlockedCards: CardId[];
  contextCards: { id: CardId; until: number; reason: string }[];
  /** Quarter each card was last played, for cooldowns. */
  cardLastPlayed: Partial<Record<CardId, number>>;
  /** Indicator dashboard: stage cap and stable slot order (handoff 06). */
  dashboard: { cap: 4 | 5 | 6; slots: DashboardKey[]; milestones: string[] };
  /** What happened this quarter that the UI should introduce: unlocks, new act, tips, thresholds crossed. */
  notices: Notice[];
  /** Tips already shown (by id), so each shows once. */
  tipsShown: string[];
  /** Public concern of the quarter, shown as map bubbles; clicking explains, it pays nothing. */
  concerns: Concern[];
  /** Every Léa letter delivered so far, oldest first. */
  leaLetters: (LeaScene & { quarter: number })[];
  /** One snapshot per finished quarter, for the journal (re-readable reports). */
  history: QuarterRecord[];
  /** Superpowers' odds after each decision, oldest first, for the trajectory bar. */
  oddsHistory: { quarter: number; odds: Record<PlanId, number>; cause: string }[];
}

export type ActId = 1 | 2 | 3;

/** Indicators that can sit on the primary dashboard. */
export type DashboardKey = Exclude<GaugeKey, 'trueAlignment'> | 'coalition';

export interface Notice {
  kind: 'act' | 'card_unlocked' | 'context_card' | 'indicator' | 'threshold' | 'tip' | 'employment_shock';
  id: string; // act number, card id, indicator key, threshold id or tip id
  title: string;
  text: string; // one or two plain sentences: what is new and why it matters now
}

export interface Concern {
  id: string;
  region: RegionId;
  /** One line: who worries about what ("Teachers in Lyon worry AI tutors will replace them"). */
  text: string;
  at: number; // 0..1 moment in the clock
}

export interface QuarterRecord {
  quarter: number;
  report: SituationReport;
  decision: { cardId: CardId | null; title: string; option?: string };
}

// ---------- Views the engine builds for the UI ----------

export interface GaugeView {
  key: GaugeKey | 'coalition';
  label: string;
  value: number;
  /** ± uncertainty shown as an error bar, 0 if none. */
  errorBar: number;
  visible: boolean;
  risesWhen: string;
  fallsWhen: string;
  /** Change since the start of the quarter. */
  delta: number;
}

/** Something you learn or can see better, as opposed to a gauge change (handoff 01). */
export interface InfoGain {
  label: string; // "Capability uncertainty"
  from?: string; // "±10"
  to?: string; // "±5"
  text: string; // full sentence, e.g. "2 confidential reports become readable now"
}

/** A short effect shown on the card face. */
export interface EffectChip {
  key: StatKey | 'info' | 'hidden';
  text: string; // "Tension −6", "+ hidden effect", "Narrows uncertainty"
  tone: 'good' | 'bad' | 'neutral';
}

export interface CardView {
  id: CardId;
  name: string;
  family: string; // Diplomacy, Safety, Industry...
  playerText: string; // max ~25 words
  costLabel: string; // "2 Budget", "2 PC, then 1 PC per quarter", "Free (1 of 2 tokens)"
  available: boolean; // conditions met and limit not reached
  affordable: boolean;
  lockedReason: string | null; // plain words: "Needs capability 30+", "Already played"
  downside: string;
  /** Dependencies in plain words, e.g. "Full effect needs AI Office capacity" (met or not). */
  dependencies: { text: string; met: boolean }[];
  options: { id: string; label: string }[]; // e.g. ASML: model access / safety commitment
  source: Source;
  isLouis: boolean; // from Louis's draft (true) or restored by us (false)
  // v2
  /** Hidden from the hand until unlocked (cardViews returns only unlocked and context cards). */
  isNew: boolean; // unlocked this quarter
  unlockReason: string | null; // "Unlocked because partners are calling Brussels"
  /** Levelled cards: the next level's name and number ("Inspection accord", 2 of 3). */
  level: { next: number; max: number; name: string } | null;
  usesLeft: number | null; // null = unlimited
  cooldownUntil: number | null; // quarter from which it can be played again
  /** Up to three chips for the card face. */
  face: EffectChip[];
  /** Crises this card prepares Europe for. */
  prepares: EventId[];
  context: { until: number; reason: string } | null;
  /** Sourced real-world cost line, when one exists. */
  realCost: { text: string; source: Source } | null;
}

export interface CardPreview {
  cardId: CardId;
  option?: string;
  costs: Delta[];
  visibleDeltas: Delta[];
  /** Plain-language consequences the player can know: "Unlocks the full effect of hosting verification". */
  notes: string[];
  /** Plan odds now vs after the card (visible effects only). */
  oddsBefore: Record<PlanId, number>;
  oddsAfter: Record<PlanId, number>;
  // v2
  /** What the card lets the player see, computed from the state before and after: "Capability error bar ±10 → ±5". */
  infoGains: InfoGain[];
  realCost: { text: string; source: Source } | null;
}

export interface Briefing {
  title: string;
  visibleDeltas: Delta[];
  advisorNote: string; // hints at hidden effects without giving numbers
  // v2
  /** What the player can now see that they could not before (same lines as the preview's). */
  infoGains: InfoGain[];
  /** What this will matter for: "Ready if a theft is attempted". */
  consequence: string | null;
}

export interface SituationReport {
  quarter: number;
  dateLabel: string; // "Q3 2027"
  /**
   * Every visible change since the start of the quarter: non-routine first (events, actor moves,
   * delayed card effects, thresholds crossed), then routine background drift; biggest first in each group.
   */
  changes: { key: GaugeKey | 'coalition'; label: string; delta: number; cause: string; value: number; routine: boolean }[];
  /** The routine changes folded into one line ("Background drift: capability 36 (+4), …"); '' when none. */
  background: string;
  why: string[]; // short causal sentences from the log
  forecast: { mostLikely: PlanId; probability: number; sentence: string; whatWouldHelp: string };
  newNews: number;
  newNotes: { total: number; readable: number };
  lea: LeaScene | null;
  // v2: a report that tells a story
  /** The 1–3 things that matter this quarter, with absolute levels and their real cause. */
  headline: ReportLine[];
  risksMoved: RiskView[];
  trajectoryChange: TrajectoryView['change'];
}

export interface ReportLine {
  key: DashboardKey;
  label: string;
  value: number; // absolute level now
  delta: number;
  cause: string; // the real cause, from the log (never a neighbour's)
  kind: 'card' | 'event' | 'actor' | 'threshold' | 'background';
  /** What this level means for the player's goal, from public rules only:
   *  "Verification 37: 13 more needed for a verified deal (50)". Empty string when nothing to say. */
  meaning: string;
}

/** A crisis telegraphed before it happens. Reads only public values. */
export interface RiskView {
  id: EventId;
  title: string;
  stage: 'watch' | 'rising' | 'imminent' | 'happened';
  /** 'possible' when it also depends on something hidden (the warning shot). */
  certainty: 'possible' | 'likely';
  prepared: boolean;
  /** Plain words: "Weight security standards would make a theft fail". */
  preparedBy: string;
  preparingCards: CardId[];
  /** Why it moved: "Tension 48 and rising; capability 38". */
  why: string;
}

export interface AdvisorView {
  text: string; // one or two sentences
  recommend: CardId | null;
  reason: string;
  alternative: { card: CardId | null; text: string } | null;
}

export interface TrajectoryView {
  odds: Record<PlanId, number>;
  mostLikely: PlanId;
  /** The last movement and its cause, null at the start. */
  change: { plan: PlanId; delta: number; because: string } | null;
}

export interface IncomeView {
  pc: number;
  budget: number;
  /** "+2 PC per quarter", "+1 PC: public pressure is high", "−1 PC: approval below 30". */
  reasons: string[];
  /** False on the last quarter or at the tipping point. */
  nextQuarterExists: boolean;
}

export interface DashboardView {
  cap: 4 | 5 | 6;
  primary: GaugeView[]; // in stable slot order, never more than cap
  secondary: GaugeView[]; // "More indicators"
  /** The indicator introduced this quarter, with why it matters now. */
  introduced: { key: DashboardKey; why: string } | null;
}

export interface Tip {
  id: string;
  title: string;
  text: string; // one screen, plain words
}

export interface JournalEntry {
  quarter: number;
  dateLabel: string;
  report: SituationReport;
  decision: QuarterRecord['decision'];
  events: { id: EventId; title: string; prepared: boolean }[];
  lea: (LeaScene & { quarter: number }) | null;
  tips: Tip[];
}

export interface LeaScene {
  slot: 'q1' | 'q6' | 'q11' | 'end';
  variant: string;
  text: string;
}

export interface EndingView {
  id: EndingId;
  world: WorldKind;
  good: boolean;
  title: string;
  text: string; // 1–2 paragraphs, telling what happened in this game
  /** What decided this ending in this game: the conditions that held or failed, with their values. */
  why: string;
  epilogue: string; // human influence band
  lea: LeaScene;
  source: Source;
}

export interface Debrief {
  ending: EndingView;
  reveal: {
    takeoffSpeed: Speed;
    trueAlignment: number;
    apparentAlignment: number;
    eu: Record<EuKey, number>;
    gdp: number;
    approval: number;
  };
  tipping: TippingResult | null;
  notes: InternalNote[]; // all, unredacted
  /** One entry per decision, repeated plays grouped: `quarter` is the first play, `quarters` all of them; deltas are summed. */
  decisions: { quarter: number; quarters: number[]; title: string; visibleDeltas: Delta[]; hiddenDeltas: Delta[]; explanation: string }[];
  events: { quarter: number; title: string; actor: ActorId; prepared: boolean; explanation: string; source: Source }[];
}

export type QuarterOutcome = 'next_quarter' | 'tipping_point' | 'game_over';
