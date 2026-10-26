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

// ---------------------------------------------------------------- requests (v4, from the hybrid)

export type CharacterId = 'us_envoy' | 'cn_delegate' | 'openbrain_ceo' | 'researcher' | 'union' | 'open_source' | 'security' | 'partner' | 'journalist' | 'lea' | 'ai';
export type Side = 'left' | 'right';

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  /** where they speak from on the map */
  region: RegionId;
}

/** One fact behind a request, shown under "Learn more". Real-world facts cite a primary source. */
export interface LearnMore {
  text: string;
  source: Source;
}

/** What an answer changes. `truth` moves the hidden true AI safety and is never shown as a number. */
export interface ReqEffects {
  ai?: number;
  coop?: number;
  /** the AI safety estimate (what the labs and testers report) */
  conf?: number;
  /** the uncertainty below the reported value: negative narrows it (oversight). v4: answers never widen it. */
  margin?: number;
  cohesion?: number;
  /** hidden: the true AI safety */
  truth?: number;
}

/** All listed conditions must hold. */
export interface Condition {
  minRound?: number;
  maxRound?: number;
  minAi?: number;
  maxAi?: number;
  minCoop?: number;
  maxCoop?: number;
  minCohesion?: number;
  maxCohesion?: number;
  /** reached (in AI 2027's order) */
  milestone?: MilestoneId;
  /** not reached yet */
  beforeMilestone?: MilestoneId;
  flags?: string[];
  notFlags?: string[];
  badge?: EuropeAi;
  minCoalition?: number;
  maxCoalition?: number;
  minInspections?: number;
  maxInspections?: number;
  threat?: { id: ThreatId; minStage?: 0 | 1 | 2 | 3; maxStage?: 0 | 1 | 2 | 3; struck?: boolean; prepared?: boolean };
}

/** One answer of a request. */
export interface Answer {
  /** ≤ 5 words */
  label: string;
  effects: ReqEffects;
  /** flags set by this answer (protections and follow-ups) */
  set?: string[];
  /** Europe's AI badge after this answer */
  badge?: EuropeAi;
  /** coalition level +n (the coalition card moves up a level too) */
  coalition?: number;
  /** inspection level +n (the inspections card moves up a level too) */
  inspections?: number;
  /** threats that grow one stage */
  grow?: ThreatId[];
  /** a delayed cost or gain, applied at the start of a later round */
  later?: { rounds: number; effects: ReqEffects; why: string };
  /** a short reason for the main cost (≤ 8 words) */
  why?: string;
  tag?: 'safety' | 'claim';
  /** the character's one-line reaction */
  reaction: string;
}

export interface RequestCard {
  id: string;
  character: CharacterId;
  /** the request, ≤ 40 words, in the character's voice */
  text: string;
  left: Answer;
  right: Answer;
  when?: Condition;
  basis: Basis;
  learnMore: LearnMore;
  /** the threat this request relates to: drawn first while that threat is growing */
  prepares?: ThreatId;
  /** a follow-up to an earlier answer ("I warned you"): shown as soon as its condition holds */
  followup?: boolean;
  /** an opportunity: available only for `window` rounds after its condition first holds */
  opportunity?: { window: number };
  /** draw weight (default 1) */
  weight?: number;
}

export interface RequestState {
  /** every answer so far, in order */
  done: { id: string; round: number; side: Side }[];
  /** this round's requests still to answer, with when they come during the six months (0–1) */
  pending: { id: string; at: number }[];
  /** this round's requests, answered or not (for the feed) */
  round: { id: string; at: number; side: Side | null }[];
  /** delayed effects of earlier answers */
  later: { round: number; effects: ReqEffects; why: string }[];
  /** the round each opportunity's window opened */
  opened: Record<string, number>;
}

/** An answer as the player sees it before choosing: visible effects only (never the hidden truth as a number). */
export interface AnswerView {
  side: Side;
  label: string;
  chips: Chip[];
  /** the chips in words, for the button's accessible name */
  words: string;
  why: string | null;
  tag: 'safety' | 'claim' | null;
  /** "Race → Pause" when the world would change, else null */
  world: string | null;
}

export interface RequestView {
  id: string;
  character: Character;
  text: string;
  kind: 'request' | 'followup' | 'opportunity' | 'prepares';
  threat: ThreatId | null;
  threatName: string | null;
  left: AnswerView;
  right: AnswerView;
  learnMore: LearnMore;
  basis: Basis;
  at: number;
  /** 1-based position among this round's requests, and how many there are */
  index: number;
  count: number;
}

export interface RequestOutcome {
  reaction: string;
  chips: Chip[];
  notes: string[];
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

/** v4 social events: what kind of thing happens in a European city (the map's icon). */
export type SocialKind = 'jobs' | 'strike' | 'protest' | 'scandal' | 'breakthrough';

/** A social event of one round: when it shows (0–1) and what it changed, in public values only
 *  (after − before: Social cohesion, US–China cooperation, AI safety's claim and uncertainty). */
export interface SocialRecord {
  id: string;
  at: number;
  moved: { cohesion: number; cooperation: number; estimate: number; margin: number };
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
  /** What to do about it, one short line (v4). */
  advice: string;
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
  /** Set when the player caused it (a card, or an answer to a request): kept out of "What changed". */
  by?: 'card' | 'request';
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
  event: { id: EventId; title: string; prepared: boolean | null; choice: string | null; at: number; region: RegionId } | null;
  changes: Change[];
  decisions: Pick[];
  letter: string | null;
  /** Public values at the end of the round (after decisions), for the gauges' sparklines. */
  values: PublicValues;
  /** The round's requests and the answers given. */
  requests: { id: string; at: number; side: Side | null }[];
  /** v4: the round's social events (strikes, protests, scandals, good news). */
  social?: SocialRecord[];
}

export interface PublicValues {
  aiPower: number;
  cooperation: number;
  estimate: number;
  margin: number;
  cohesion: number;
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
  /** v4: the estimate is what the labs report; the truth (hidden) is never above it and never below estimate − margin. */
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
  /** This round's event once resolved (for the feed). */
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
  /** Flags set by answers to requests (protections and follow-ups). */
  flags: string[];
  requests: RequestState;
  /** v4 social events: every one so far (never twice a game) and this round's. */
  social: { done: string[]; round: SocialRecord[] };
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
  /** "47 verified, 62 claimed", "58", or "60 (audited)". */
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
  /** Full sentence, e.g. "If AI tipped now: Race. To end well: AI safety 75 (you: 47 verified, 62 claimed) and Social cohesion 55 or more (you: 58)." */
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
  /** The outlook ("If AI tipped now") after these cards, in public values: for the preview in the outlook column. */
  outlookAfter: HeadingView;
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
    /** The band the player saw: from estimate − margin (low, ≥ 0) up to the reported estimate (high). */
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

/** One item of the live feed beside the map. `at` (0–1) is when it appears while the six months play out;
 *  items the player causes (decisions, answers) come after the clock (at > 1). */
export interface FeedItem {
  id: string;
  round: number;
  at: number;
  kind: 'headline' | 'milestone' | 'threat' | 'voice' | 'leak' | 'event' | 'lea' | 'decision' | 'request' | 'social';
  /** "Headline", "AI 2027 milestone", "Threat", "Heard in Europe", "Leak", "Breaking news", "Letter from Léa, your friend in Lyon", "Your decision" */
  label: string;
  text: string;
  /** What it changed, in words ("US–China cooperation 51 → 55"). */
  detail: string | null;
  region: RegionId | null;
  threat: ThreatId | null;
  tone: -1 | 0 | 1;
  /** Léa's letter: her mood (the feed shows her small portrait). */
  mood?: LeaMood;
  /** A social event (v4): its kind and city (the map shows it there). */
  social?: { kind: SocialKind; city: string; lon: number; lat: number };
}

export interface FeedRound {
  round: number;
  date: string;
  items: FeedItem[];
  /** "What changed": the three biggest changes of the six months with their cause (not the player's own). */
  summary: Change[];
}
