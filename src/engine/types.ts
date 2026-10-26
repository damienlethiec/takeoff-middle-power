// Shared contract between the engine (src/engine, src/data) and the UI (src/ui), v3.
// Rules and numbers: docs/DEVELOPER_NOTES.md. Player-facing design: docs/V3_SPEC.md.
// The flow of a round is documented at the top of src/engine/api.ts.

/** Hidden AI pace, drawn at the start and revealed at the end. */
export type Pace = 'slow' | 'steady' | 'fast';
/** Cooperation zones: Pause 60+, Race 30–59, Rupture below 30. */
export type Zone = 'pause' | 'race' | 'rupture';
/** The five CFG worlds. */
export type WorldId = 'plateau_open' | 'plateau_labs' | 'pause' | 'race' | 'rupture';
export type EuropeAi = 'open' | 'dependent';
export type RegionId = 'eu' | 'us' | 'cn';
/** The visible pillars and clock. */
export type GaugeKey = 'aiPower' | 'cooperation' | 'confidence' | 'cohesion';

export type CardId =
  | 'talks'
  | 'inspections'
  | 'ai_office'
  | 'alignment'
  | 'coalition'
  | 'audit'
  | 'asml'
  | 'weight_security'
  | 'open_models'
  | 'flexicurity'
  | 'cyber_shield'
  | 'oversight_mandate'
  // opportunities: appear after a crisis, for two rounds only
  | 'summit'
  | 'attribution';

export type ThreatId = 'theft' | 'opaque' | 'incident' | 'ransomware' | 'blackmail';
export type EventId = ThreatId | 'job_shock_1' | 'job_shock_2';

export type MilestoneId =
  | 'coding_automation'
  | 'china_wakes_up'
  | 'ai_takes_jobs'
  | 'agent2_internal'
  | 'weight_theft'
  | 'superhuman_coder'
  | 'alignment_inconclusive'
  | 'national_security'
  | 'self_improving'
  | 'cheap_remote_worker'
  | 'geopolitics'
  | 'tipping_point';

export type EndingId =
  | 'bright_winter'
  | 'decentralised_mayhem'
  | 'agent_economy'
  | 'silicon_blackmail'
  | 'licensed_utopia'
  | 'unstable_pause'
  | 'cognitive_revolution'
  | 'loss_of_control'
  | 'multipolar_world'
  | 'hot_war';

export interface Source {
  label: string;
  url: string;
}

/** Where a piece of content comes from: a scenario section, or a real source. Required on all content. */
export interface Basis {
  kind: 'ai2027' | 'cfg' | 'real';
  ref: string;
}

/** A real-world fact shown to players, with its primary source. */
export interface Fact {
  text: string;
  source: Source;
}

/** A visible effect on a card face or in a debrief: green for what goes up, red for what goes down. */
export interface Chip {
  text: string;
  tone: 'up' | 'down';
}

// ---------------------------------------------------------------- state

export interface ThreatState {
  /** 0 not shown yet, 1 watch, 2 rising, 3 imminent. */
  stage: 0 | 1 | 2 | 3;
  /** Round when stage 3 was first shown (a threat strikes at the earliest the round after). */
  imminentSince: number | null;
  struck: boolean;
  struckRound: number | null;
  prepared: boolean | null;
  /** Silicon blackmail: the player's answer. */
  choice: string | null;
}

/** A headline banner or a public voice on the map, revealed while the clock runs (`at` in 0–1). */
export interface MapItem {
  id: string;
  round: number;
  region: RegionId;
  text: string;
  at: number;
  basis: Basis;
}

export interface Leak {
  id: string;
  round: number;
  at: number;
  /** Oversight needed to read it. */
  level: number;
  readable: boolean;
  text: string;
  basis: Basis;
}

/** One gauge's movement in a Breaking news screen or a preview. */
export interface Impact {
  key: GaugeKey | 'margin' | 'europeAi' | 'influence';
  label: string;
  before: string;
  after: string;
  /** +1 good for the player, −1 bad, 0 neutral. */
  tone: -1 | 0 | 1;
}

export interface EventOption {
  id: string;
  label: string;
  detail: string;
}

/** The event that strikes this round (Breaking news). Its impacts are applied by resolveEvent. */
export interface PendingEvent {
  id: EventId;
  round: number;
  at: number;
  region: RegionId;
  title: string;
  headline: string;
  scene: string;
  prepared: boolean | null;
  /** Card that prepared Europe, or the card that would have. */
  preparedBy: CardId[];
  preparedText: string;
  impacts: Impact[];
  options: EventOption[];
  fact: Fact | null;
  basis: Basis;
}

/** A notable change with its cause, for the report ("Cooperation 52 → 47: China accused…"). */
export interface Change {
  round: number;
  key: GaugeKey | 'margin' | 'europeAi' | 'influence' | 'threat';
  text: string;
  cause: string;
  tone: -1 | 0 | 1;
}

export interface Pick {
  id: CardId;
  option?: string;
}

export interface RoundRecord {
  round: number;
  headlines: MapItem[];
  voices: MapItem[];
  leak: Leak | null;
  event: { id: EventId; title: string; prepared: boolean | null; choice: string | null } | null;
  changes: Change[];
  decisions: Pick[];
  letter: string | null;
}

export interface LetterRecord {
  slot: LeaSlot;
  round: number;
  id: string;
}
export type LeaSlot = 'r1' | 'r4' | 'r8' | 'end';
export type LeaMood = 'hopeful' | 'worried' | 'relieved' | 'sad';

export interface GameState {
  version: 3;
  seed: number;
  rng: number;
  /** 0 before the first round, then 1..12. */
  round: number;
  phase: 'play' | 'ended';
  pace: Pace; // hidden
  aiPower: number;
  /** AI power gained over the last six months (public). */
  lastRise: number;
  cooperation: number;
  /** truth is hidden; the estimate ± margin is what the player sees. The truth always lies inside. */
  confidence: { truth: number; estimate: number; margin: number };
  cohesion: number;
  europeAi: EuropeAi;
  /** Giving in to silicon blackmail locks Europe's AI to Dependent. */
  europeAiLocked: boolean;
  influence: number;
  /** Levels 0–3. */
  coalition: number;
  inspections: number;
  /** Cards in hand, in order of arrival (spent cards leave), and the round each arrived. */
  hand: CardId[];
  arrivals: Partial<Record<CardId, number>>;
  uses: Partial<Record<CardId, number>>;
  /** A card cannot be played again until after this round (talks rest one round). */
  restUntil: Partial<Record<CardId, number>>;
  /** Influence lost at a given round, and why. */
  penalties: { round: number; amount: number; card: CardId }[];
  /** The true Confidence is shown until the end of this round (independent audit). */
  auditUntil: number;
  /** Opportunities available up to and including this round. */
  opportunities: Partial<Record<CardId, number>>;
  milestones: { id: MilestoneId; round: number }[];
  threats: Record<ThreatId, ThreatState>;
  jobShocks: number;
  /** This round's event, until resolved. */
  event: PendingEvent | null;
  /** This round's event once resolved (for the journal). */
  roundEvent: RoundRecord['event'];
  /** This round's map content and leak. */
  headlines: MapItem[];
  voices: MapItem[];
  leak: Leak | null;
  /** Every leak so far (readable or not), and the rounds when the next ones come. */
  leaks: Leak[];
  leakRounds: number[];
  /** Public values at the start of this round (before the six months play out). */
  roundStart: { aiPower: number; cooperation: number; estimate: number; margin: number; cohesion: number; influence: number };
  /** Changes worth reporting this round (routine drift is not listed). */
  changes: Change[];
  /** Cards played this round. */
  played: Pick[];
  history: RoundRecord[];
  letters: LetterRecord[];
  tipping: { round: number } | null;
  ending: EndingId | null;
  /** Cooperation zone at the end (after the small suspense draw at the tipping point). */
  finalCooperation: number | null;
}

// ---------------------------------------------------------------- views

export interface IncomeView {
  next: number;
  /** "Base +2", "Public backs you +1", "Unions (Flexicurity reform) −1"... */
  reasons: string[];
  cap: number;
  /** False in the last round: no income will follow. */
  nextRoundExists: boolean;
}

export interface GaugeView {
  key: GaugeKey;
  label: string;
  /** One plain line under the name ("How close AI is to improving itself"). */
  sub: string;
  /** AI capabilities only: "At this pace: in about 3–5 rounds", from visible values only (never the hidden pace). */
  eta: string | null;
  value: number;
  /** Confidence only: the margin (0 while audited). */
  margin: number;
  /** Confidence only: the value shown is the audited truth. */
  audited: boolean;
  /** The current world's target or floor on this gauge, if any. */
  target: number | null;
  targetKind: 'goal' | 'floor' | 'tipping' | null;
  /** Expected damage from threats that would hit this gauge ("−15 if unprepared"), public values only. */
  markers: { threat: ThreatId; text: string; prepared: boolean }[];
}

/** One gauge in the "If AI tipped now" band: what it must reach, where the player is (public values only). */
export interface OutlookGauge {
  key: GaugeKey;
  label: string;
  /** The deciding gauge's target, or the safety net's floor. */
  bar: number;
  /** "62 ± 15", "58", or "60 (audited)". */
  you: string;
  /** The value shown, and the band it may lie in (equal to it for every gauge but AI safety). */
  value: number;
  low: number;
  high: number;
  met: 'yes' | 'no' | 'maybe';
}

export interface HeadingView {
  world: WorldId;
  /** "Pause", "Race", "Rupture", "Plateau, open models", "Plateau, big labs" */
  name: string;
  /** True when AI is projected to stall: the band reads "If AI stalls" instead of "If AI tipped now". */
  plateau: boolean;
  /** One plain sentence on what this world means. */
  meaning: string;
  basis: Basis;
  /** What decides whether this world ends well (its target) and the safety net (its floor). */
  decides: OutlookGauge;
  net: OutlookGauge;
  /** The nearest other world and what it takes, only when it is within reach and would help. */
  alt: { world: WorldId; name: string; text: string } | null;
  /** Full sentence, e.g. "If AI tipped now: Race. To end well: AI safety 75 (you: 62 ± 15) and Social cohesion 55 or more (you: 58)." */
  text: string;
}

export interface ThreatView {
  id: ThreatId;
  name: string;
  region: RegionId;
  stage: 0 | 1 | 2 | 3;
  stageWord: 'Watch' | 'Rising' | 'Imminent' | 'Struck';
  certainty: 'likely' | 'possible';
  prepared: boolean;
  struck: boolean;
  why: string;
  ifUnprepared: string;
  ifPrepared: string;
  protectedBy: CardId[];
  protectedByNames: string;
  gauge: GaugeKey | null;
}

export interface CardView {
  id: CardId;
  name: string;
  /** Level name for cards with levels (Inspection accord…), else the name. */
  title: string;
  cost: number;
  text: string;
  proposal: string;
  example: Fact | null;
  costLine: Fact | null;
  ups: Chip[];
  downs: Chip[];
  protects: ThreatId | null;
  protectsName: string | null;
  options: { id: string; label: string; ups: Chip[] }[];
  level: number | null;
  levels: string[] | null;
  usesLeft: number;
  opportunity: boolean;
  /** Rounds left for an opportunity (1 or 2). */
  expiresIn: number | null;
  playable: boolean;
  /** Why it cannot be played now, in words. */
  reason: string | null;
  isNew: boolean;
  basis: Basis;
}

export interface PreviewView {
  ok: boolean;
  reason: string | null;
  cost: number;
  influenceAfter: number;
  /** Public before → after, one line per gauge that moves. */
  impacts: Impact[];
  notes: string[];
  headingBefore: string;
  headingAfter: string;
  /** World names before and after ("Race" → "Pause"); equal when the world does not change. */
  worldBefore: string;
  worldAfter: string;
}

export interface AdvisorView {
  recommend: CardId | null;
  option?: string;
  text: string;
}

export interface ReportView {
  round: number;
  heading: string;
  changes: Change[];
  threats: { id: ThreatId; name: string; stageWord: string; prepared: boolean; moved: 'new' | 'up' }[];
  leak: Leak | null;
  quiet: boolean;
}

export interface LetterView {
  slot: LeaSlot;
  round: number;
  id: string;
  mood: LeaMood;
  text: string;
  basis: Basis;
}

export interface EndingGauge {
  key: GaugeKey;
  label: string;
  value: number;
  target: number | null;
  targetKind: 'goal' | 'floor' | 'tipping' | null;
  /** Shown value differs from the truth (confidence): what the player saw. */
  seen: string | null;
  met: boolean | null;
}

export interface EndingView {
  id: EndingId;
  title: string;
  good: boolean;
  world: WorldId;
  worldName: string;
  dateLabel: string;
  story: string;
  sentence: string;
  gauges: EndingGauge[];
  reveal: {
    truth: number;
    estimate: number;
    margin: number;
    /** The band the player saw: estimate ± margin, within 0–100. */
    low: number;
    high: number;
    /** The player saw the truth at the end (an independent audit was running). */
    audited: boolean;
    /** What widened the uncertainty, e.g. "Opaque reasoning doubled your uncertainty". */
    widened: string[];
    pace: Pace;
    paceText: string;
    unreadLeaks: Leak[];
    readLeaks: Leak[];
  };
  counterfactuals: string[];
  decisions: { round: number; date: string; name: string; ups: Chip[]; downs: Chip[] }[];
  threats: { id: ThreatId; name: string; struck: boolean; prepared: boolean | null; by: string }[];
  lea: LetterView;
  basis: Basis;
  source: Source;
}

export interface JournalRound {
  round: number;
  date: string;
  headlines: string[];
  voices: string[];
  event: string | null;
  leak: string | null;
  changes: string[];
  decisions: string[];
  letter: string | null;
}
