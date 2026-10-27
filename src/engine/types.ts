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
  | 'cern_ai'
  | 'chip_verification'
  | 'licensing_treaty'
  | 'biosecurity'
  // opportunities: appear after a crisis, for two rounds only
  | 'summit'
  | 'attribution'
  | 'pause_call';

/** v4 (playtests, 26 Oct): the hand is grouped into families with a short heading each (src/data/cards.ts, FAMILIES). */
export type CardFamily = 'diplomacy' | 'oversight' | 'tech' | 'home';

export type ThreatId = 'theft' | 'opaque' | 'incident' | 'ransomware' | 'blackmail' | 'bio';
/** Breaking news: the threats when they strike, the two job shocks, and the scenarios' turning points that are not
 *  threats: the leaked misalignment memo (AI 2027, October 2027), Washington's ban on European chip-tool sales to China
 *  (CFG, Arms race), a Taiwan Strait crisis (AI 2027, CFG), and a US–China ban on large open models (CFG). */
export type EventId = ThreatId | 'job_shock_1' | 'job_shock_2' | 'memo' | 'chip_ban' | 'taiwan' | 'open_ban' | 'compute_rationing';

/** AI 2027's Oversight Committee vote (October 2027): race on, or slow down. Held at the tipping point once the memo
 *  has leaked; built from public values only (the leak, Europe's pause call, what is verified, the zone). */
export interface CommitteeVote {
  slowdown: number;
  race: number;
  outcome: 'slowdown' | 'race';
  /** What swayed the votes, in words ("The leaked memo: +1 to slow down"). */
  reasons: string[];
}

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

/** Where a piece of content comes from: a scenario section, a real source, or a game device ('game': invented for
 *  the game, e.g. the independent audit). Required on all content. Players see it as a tag (provenanceOf in src/data/basis.ts). */
export interface Basis {
  kind: 'ai2027' | 'cfg' | 'e2031' | 'real' | 'game';
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
  /** A request answer's chip before the player answers: its text is in words ("up a lot"), and this keeps the public
   *  move it stands for (`margin`: the verified part of AI safety) for the simulation's players. Never shown. */
  move?: { key: GaugeKey | 'margin' | 'influence'; delta: number };
}

// ---------------------------------------------------------------- requests (v4, from the hybrid)

export type CharacterId = 'us_envoy' | 'cn_delegate' | 'openbrain_ceo' | 'researcher' | 'union' | 'open_source' | 'security' | 'partner' | 'journalist' | 'lea' | 'mother' | 'malik' | 'ai';
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
  /** v4 (26 Oct): Europe's political capital, spent at once (a number, like a card's cost) */
  influence?: number;
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
  /** Does this answer go along with the request ('accept') or refuse it / put it off ('refuse')?
   *  Convention: the right answer accepts, the left one refuses (tests/requests.test.ts enforces it). */
  stance: 'accept' | 'refuse';
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
  /** false: not first in line in the round its milestone is reached (for a request that would otherwise come in
   *  nearly every game at that milestone) */
  priority?: boolean;
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
  /** Where a voice comes from when it is outside Europe, the US and China ("India"): the feed says "Heard in India";
   *  the map groups it with the nearest region. */
  place?: string;
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
  /** Set by the engine on a played card that did not work (v4: diplomatic and external cards can fail). */
  failed?: boolean;
}

/** How likely a card that can fail is to work, in words only (public values; never a number). */
export interface CardOdds {
  word: 'Likely to work' | 'Uncertain' | 'Long shot';
  /** What makes it easier or harder now ("harder in a rupture", "Europe holds together"); may be empty. */
  why: string[];
}

/** A Breaking news once resolved (for the feed and the history). */
export interface EventRecord {
  id: EventId;
  title: string;
  prepared: boolean | null;
  choice: string | null;
  at: number;
  region: RegionId;
}

export interface RoundRecord {
  round: number;
  headlines: MapItem[];
  voices: MapItem[];
  leak: Leak | null;
  event: EventRecord | null;
  /** v4: a second Breaking news this round (a threat that was due while a scenario event took the first slot). */
  event2?: EventRecord | null;
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

/** v4: three friends back home write to you, each the human face of one part of the world: Léa (Social cohesion),
 *  your mother (AI safety as lived) and Malik (AI capabilities, US–China cooperation, Europe's AI).
 *  Their names, labels and cities are in src/data/friends.ts. Letters never move a gauge. */
export type FriendId = 'lea' | 'mother' | 'malik';
export type FriendMood = 'hopeful' | 'worried' | 'relieved' | 'sad';
/** The round a letter was written for ('r1'…'r12'), or 'end' for the epilogue. */
export type LetterSlot = `r${number}` | 'end';

export interface LetterRecord {
  slot: LetterSlot;
  round: number;
  id: string;
  friend: FriendId;
}

export interface GameState {
  version: 3;
  seed: number;
  rng: number;
  /** 0 before the first round, then 1..TUNING.rounds (10). */
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
  /** v4: this round's second Breaking news, still to come: it is built (its preparation and impacts read from the
   *  state then) when the first is resolved, and comes at `at`. */
  eventNext: { id: EventId; at: number } | null;
  /** This round's event once resolved (for the feed). */
  roundEvent: EventRecord | null;
  /** This round's second event once resolved. */
  roundEvent2: EventRecord | null;
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
  /** The ids of the news, letters, social events and requests seen in the player's last two finished games
   *  (from localStorage, passed to createInitialState): drawn with a lower weight so the next game differs.
   *  Empty in the seeded simulation. Never moves a gauge by itself. */
  recent: string[];
  ending: EndingId | null;
  /** Cooperation zone at the end (after the small suspense draw at the tipping point). */
  finalCooperation: number | null;
  /** AI 2027's Oversight Committee vote, held at the tipping point once the memo has leaked (null otherwise). */
  committee: CommitteeVote | null;
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
  /** Big AI (plateau with big labs): a good ending also needs Europe's AI Open; `now` is the badge today. */
  needsOpen: { now: EuropeAi } | null;
  /** Once the memo has leaked: how the Oversight Committee would vote now (public values), and how far its vote
   *  would move US–China cooperation at the tipping point. The world above already includes it. */
  committee: (CommitteeVote & { shift: number }) | null;
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
  /** The family it is shown under in the hand (Diplomacy, Oversight & security…). */
  family: CardFamily;
  /** Null for a card that always works; else how likely it is to work now, in words. */
  odds: CardOdds | null;
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
  slot: LetterSlot;
  round: number;
  id: string;
  friend: FriendId;
  mood: FriendMood;
  text: string;
  /** The letter opens its round: the UI shows it full screen (a postcard) before the round's clock starts. */
  postcard: boolean;
  basis: Basis;
}

/** One friend's epilogue on the ending screen ("Back home, 2031": the year the game ended). */
export interface FriendEpilogue {
  friend: FriendId;
  mood: FriendMood;
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
  /** The year the game ended in (the tipping point's, or 2031 after the last round): "The world in 2029". */
  year: number;
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
  decisions: { round: number; date: string; name: string; ups: Chip[]; downs: Chip[]; failed?: string }[];
  threats: { id: ThreatId; name: string; struck: boolean; prepared: boolean | null; by: string }[];
  /** One short epilogue per friend, in the order lea, mother, malik. */
  friends: FriendEpilogue[];
  /** The Oversight Committee's vote at the tipping point, if it was held (it moved the final US–China cooperation). */
  committee: (CommitteeVote & { shift: number }) | null;
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
  /** "Headline", "AI 2027 milestone", "Threat", "Heard in Europe", "Leak", "Breaking news", "Letter from Léa, your friend in Lyon", "Your decision".
   *  kind 'lea' is historical: it is any friend's letter (see `friend`). */
  label: string;
  text: string;
  /** What it changed, in words ("US–China cooperation 51 → 55"). */
  detail: string | null;
  region: RegionId | null;
  threat: ThreatId | null;
  tone: -1 | 0 | 1;
  /** A friend's letter (kind 'lea'): who wrote it, their mood (the feed shows a small portrait), and whether it
   *  opened the round as a full-screen postcard. */
  friend?: FriendId;
  mood?: FriendMood;
  postcard?: boolean;
  /** A social event (v4): its kind and city (the map shows it there). */
  social?: { kind: SocialKind; city: string; lon: number; lat: number };
  /** Where it comes from, for the provenance tag (Real / From AI 2027 / From CFG / From Europe 2031 / Invented). A story event set after
   *  today that rests on a real precedent is tagged Invented (its precedent is in `detail`): only the player's own
   *  decisions can be tagged Real. */
  prov?: Basis;
}

export interface FeedRound {
  round: number;
  date: string;
  items: FeedItem[];
  /** "What changed": the three biggest changes of the six months with their cause (not the player's own). */
  summary: Change[];
}
