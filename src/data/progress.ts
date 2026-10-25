// v2 progression: which cards start in hand, the story beats that open acts and unlock cards and
// indicators, the risk track, tips, concerns and the advisor. Numbers live in tuning.ts; the engine decides
// WHEN (src/engine/index.ts), these tables say WHAT. Player-facing words come from src/data/copy when the
// content workstream provides them; the texts below are the engine's fallbacks (and its own words for
// report causes and advisor recommendations, which the engine owns).

import type { ActorId, CardId, DashboardKey, EventId, RegionId } from '../engine/types';
import { any, c, type Condition } from './conditions';
import { TUNING } from './tuning';

const R = TUNING.risks;

/** Act 1 hand: the four cards of "A seat at the table". */
export const INITIAL_CARDS: CardId[] = ['ai_office', 'host_verification', 'diplomatic_talks', 'fund_alignment'];

/** The opening four indicators (handoff 06). */
export const OPENING_INDICATORS: DashboardKey[] = ['capability', 'apparentAlignment', 'verification', 'tension'];

export type BeatId = 'coalition' | 'theft_risk' | 'act2' | 'misuse' | 'act3';

export interface BeatDef {
  id: BeatId;
  /** Opens this act, if any. */
  act?: 2 | 3;
  cards: CardId[];
  /** Indicator this beat makes relevant (introduced on the dashboard, one per quarter). */
  indicator?: DashboardKey;
  /** Must-show news line the quarter the beat happens (when the story trigger has no news line of its own). */
  news: { actor: ActorId; region: RegionId; text: string } | null;
  /** The calendar fallback's news line, when the beat opens without its story trigger (slow worlds). */
  fallbackNews?: { actor: ActorId; region: RegionId; text: string };
  /** Fallback unlock reason (copy UNLOCKS overrides it). */
  reason: string;
}

/** Checked in this order every quarter; a beat happens once. At most one act opens per quarter. */
export const BEATS: BeatDef[] = [
  {
    id: 'coalition',
    cards: ['coalition'],
    news: { actor: 'eu', region: 'eu', text: 'Tokyo, Ottawa and Seoul call Brussels: would Europe lead a bloc of middle powers on AI?' },
    reason: 'Unlocked because partners are calling Brussels',
  },
  {
    id: 'theft_risk',
    cards: ['weight_security'],
    news: { actor: 'china', region: 'cn', text: 'European intelligence services warn that foreign hackers are probing AI labs’ networks.' },
    reason: 'Unlocked because intelligence services warn that labs are being probed',
  },
  {
    id: 'act2',
    act: 2,
    cards: ['flexicurity', 'asml'],
    indicator: 'publicPressure',
    // Story trigger: the first wave of AI layoffs (its own news line, ACTOR_RULES.employment_shock_40).
    news: null,
    fallbackNews: { actor: 'eu', region: 'eu', text: 'AI goes mainstream: for the first time, it tops the list of what Europeans talk about at home.' },
    reason: 'Unlocked because the race has gone public',
  },
  {
    id: 'misuse',
    cards: ['open_models', 'cyber_defence'],
    indicator: 'misuse',
    news: { actor: 'open_source', region: 'eu', text: 'First AI-enabled cyberattack on a European city: a town hall’s systems held to ransom by AI-written malware.' },
    reason: 'Unlocked because AI-enabled cyberattacks are in the news',
  },
  {
    id: 'act3',
    act: 3,
    cards: ['measure', 'oversight_mandate'],
    news: { actor: 'eu', region: 'eu', text: 'A newspaper asks: who really runs Europe’s firms now that AI drafts every decision?' },
    reason: 'Unlocked because people ask who really decides',
  },
];

/** Fallback act titles and beats (copy ACTS overrides them). */
export const ACT_FALLBACK: Record<1 | 2 | 3, { title: string; beat: string }> = {
  1: { title: 'A seat at the table', beat: 'You are Europe’s AI Envoy. Prepare before the crises come.' },
  2: { title: 'The race goes public', beat: 'AI is now taking jobs and making headlines. Public pressure brings you Political Capital, and new tools.' },
  3: { title: 'Who decides?', beat: 'GDP can rise while people quietly lose control. You can now measure it, and act on it.' },
};

/** Context cards: offered for a short window after an event (TUNING.contextWindow). */
export const CONTEXT_OFFERS: { card: CardId; event: EventId; prepared: boolean | null; reason: string }[] = [
  { card: 'emergency_summit', event: 'warning_shot', prepared: true, reason: 'Offered because the world just saw an AI try to escape' },
  { card: 'joint_attribution', event: 'weight_theft', prepared: null, reason: 'Offered because a model theft was attempted' },
];

/** Indicators that can join the dashboard after the opening four, and why they matter (fallback for copy). */
export const INDICATOR_WHY: Partial<Record<DashboardKey, string>> = {
  coalition: 'Your partners now count: each level makes a verified slowdown more likely and cools tension.',
  publicPressure: 'The race has gone public. Pressure of 50+ brings 1 more PC every quarter and can push a shutdown.',
  misuse: 'AI-enabled attacks are in the news. At misuse 40, a ransomware wave hits Europe.',
  concentration: 'A few labs hold more and more of the keys. At 60, they can bend Europe’s rules.',
  gdp: 'AI is reshaping Europe’s economy.',
  approval: 'Layoffs are testing your government’s support.',
};

/** How much an indicator matters now, to choose which one leaves a full dashboard. Opening four never leave. */
export const INDICATOR_RELEVANCE = {
  coalitionBuilding: 50,
  coalitionFull: 30,
  publicPressure: 60,
  misuseBeforeWave: 70,
  misuseAfterWave: 20,
  concentrationAtRisk: 80,
  concentration: 40,
};

// ---------------------------------------------------------------------------
// Risk track (spec phase 2). Public values only: the stage follows `targets`; `prepared` reuses the event's
// own preparedWhen (always public flags and gauges). The warning shot also depends on hidden true alignment,
// so its certainty is 'possible'.
// ---------------------------------------------------------------------------

export interface RiskDef {
  id: EventId;
  appear: Condition;
  targets: { key: 'capability' | 'tension' | 'misuse' | 'concentration'; at: number }[];
  certainty: 'possible' | 'likely';
  preparingCards: CardId[];
  fallback: { title: string; watch: string; rising: string; imminent: string; happened: string; preparedBy: string };
}

export const RISKS_DEF: RiskDef[] = [
  {
    id: 'weight_theft',
    appear: any(c('tension', '>=', R.theftAppearTension), c('capability', '>=', R.theftAppearCapability)),
    targets: [
      { key: 'tension', at: R.theftTension },
      { key: 'capability', at: R.theftCapability },
    ],
    certainty: 'likely',
    preparingCards: ['weight_security'],
    fallback: {
      title: 'Model theft',
      watch: 'Intelligence services say foreign hackers are probing AI labs’ networks.',
      rising: 'The probing gets bolder as the race tightens.',
      imminent: 'A theft attempt could come any quarter now.',
      happened: 'A theft was attempted.',
      preparedBy: 'Weight security standards would make a theft fail',
    },
  },
  {
    id: 'warning_shot',
    appear: c('capability', '>=', R.warningShotAppearCapability),
    targets: [{ key: 'capability', at: R.warningShotCapability }],
    certainty: 'possible',
    preparingCards: ['coalition', 'host_verification'],
    fallback: {
      title: 'AI incident',
      watch: 'AI systems can now act on their own in ways nobody asked for.',
      rising: 'Labs report odd behaviour they cannot fully explain.',
      imminent: 'An incident is possible at any time. Whether it happens depends on how safe the AIs really are.',
      happened: 'An AI tried to escape its lab.',
      preparedBy: 'A coalition partner and verification readiness 30+ would let Europe lead the response',
    },
  },
  {
    id: 'opaque_reasoning',
    appear: c('capability', '>=', R.opaqueAppearCapability),
    targets: [{ key: 'capability', at: R.opaqueCapability }],
    certainty: 'likely',
    preparingCards: ['ai_office'],
    fallback: {
      title: 'Opaque reasoning',
      watch: 'Researchers warn that AI reasoning may soon stop being readable.',
      rising: 'Labs are testing training methods that hide the reasoning.',
      imminent: 'The next generation of models may think in a code nobody can read.',
      happened: 'AI reasoning turned opaque.',
      preparedBy: 'AI Office testers would still be able to check the AIs',
    },
  },
  {
    id: 'silicon_blackmail',
    appear: c('flags.oversightMandate', '==', true),
    targets: [{ key: 'concentration', at: R.blackmailConcentration }],
    certainty: 'likely',
    preparingCards: ['open_models'],
    fallback: {
      title: 'Silicon blackmail',
      watch: 'Big US labs are unhappy with Europe’s oversight mandate.',
      rising: 'As power concentrates, lab lobbyists hint they could leave Europe.',
      imminent: 'The biggest labs are ready to threaten to leave.',
      happened: 'The labs threatened to leave Europe.',
      preparedBy: 'European open models would let Europe stand firm',
    },
  },
  {
    id: 'ransomware',
    appear: c('misuse', '>=', R.ransomwareAppearMisuse),
    targets: [{ key: 'misuse', at: R.ransomwareMisuse }],
    certainty: 'likely',
    preparingCards: ['cyber_defence'],
    fallback: {
      title: 'Ransomware wave',
      watch: 'AI-written attacks are starting to hit European networks.',
      rising: 'Criminal forums trade tools that break into hospitals.',
      imminent: 'A large wave of attacks could hit any quarter now.',
      happened: 'A ransomware wave hit Europe.',
      preparedBy: 'A cyber shield for hospitals and grids would hold',
    },
  },
];

// ---------------------------------------------------------------------------
// Tips (ids shared with the content workstream, docs/V2_WORKSTREAMS.md), in priority order.
// ---------------------------------------------------------------------------

export const TIP_ORDER = [
  'tip_clock',
  'tip_decision',
  'tip_hidden',
  'tip_trajectory',
  'tip_risks',
  'tip_coalition',
  'tip_pressure',
  'tip_misuse',
  'tip_context',
  'tip_human_influence',
  'tip_tipping',
] as const;

export const TIP_FALLBACK: Record<(typeof TIP_ORDER)[number], { title: string; text: string }> = {
  tip_clock: { title: 'The clock', text: 'Each quarter runs on a clock. News and reports arrive as it runs. Pause it whenever you want to read.' },
  tip_decision: {
    title: 'One decision per quarter',
    text: 'At the end of each quarter you take one decision, paid with Budget and Political Capital. Open a card to preview what it does before you confirm.',
  },
  tip_hidden: {
    title: 'What the labs say is not the truth',
    text: 'Labs report how safe their AIs look. How safe they really are stays hidden until the end. Confidential reports and your own testers help you tell the difference.',
  },
  tip_trajectory: {
    title: 'Where the superpowers are heading',
    text: 'If AI starts improving itself, the US and China will choose a path. This bar shows what they would probably do today. Your decisions move it.',
  },
  tip_risks: {
    title: 'Risks are telegraphed',
    text: 'Crises are announced before they happen. Each risk shows how close it is and which decision would prepare Europe for it.',
  },
  tip_coalition: {
    title: 'Middle powers together',
    text: 'Partners make a verified slowdown more likely and cool tension. Each new level costs more Political Capital.',
  },
  tip_pressure: {
    title: 'Public pressure',
    text: 'Layoffs and incidents raise public pressure. When it is high you get more Political Capital, and leaders listen.',
  },
  tip_misuse: {
    title: 'Openness against misuse',
    text: 'Open models spread power away from a few labs, but criminals get the same tools. Watch misuse risk.',
  },
  tip_context: {
    title: 'A window of opportunity',
    text: 'Some decisions appear only when the moment calls for them. They disappear after two quarters.',
  },
  tip_human_influence: {
    title: 'Who decides?',
    text: 'GDP can rise while people lose control of their own firms and ministries. You cannot see it directly, but you can pay for an audit.',
  },
  tip_tipping: {
    title: 'Close to the tipping point',
    text: 'At capability 80, AI starts improving itself and the superpowers choose their path. You will get one last, free decision.',
  },
};

// ---------------------------------------------------------------------------
// Concerns (map bubbles). Themes picked from the state; words from copy CONCERNS, these as fallback.
// ---------------------------------------------------------------------------

export type ConcernTheme = 'jobs' | 'safety' | 'misuse' | 'power' | 'war' | 'general';

export const CONCERN_FALLBACK: { id: string; region: RegionId; theme: ConcernTheme; text: string }[] = [
  { id: 'f_jobs1', region: 'eu', theme: 'jobs', text: 'Call-centre workers in Porto worry AI voices will replace them' },
  { id: 'f_jobs2', region: 'eu', theme: 'jobs', text: 'Junior accountants in Frankfurt wonder who will hire them now' },
  { id: 'f_safety1', region: 'eu', theme: 'safety', text: 'Parents in Lyon ask who checks the AI tutors their children use' },
  { id: 'f_safety2', region: 'us', theme: 'safety', text: 'Engineers in California ask whether anyone tests these systems for real' },
  { id: 'f_misuse1', region: 'eu', theme: 'misuse', text: 'Hospital staff in Ghent fear the next AI-written cyberattack' },
  { id: 'f_power1', region: 'eu', theme: 'power', text: 'Small firms in Milan worry a few US labs set all the prices' },
  { id: 'f_war1', region: 'eu', theme: 'war', text: 'People in Tallinn fear the chip war between Washington and Beijing could turn hot' },
  { id: 'f_general1', region: 'eu', theme: 'general', text: 'People across Europe wonder where AI is taking them' },
];

/** Thresholds whose crossing is announced as a notice ("the race speeds up"). */
export const THRESHOLD_NOTICES: { id: string; key: 'publicPressure' | 'tension' | 'capability' | 'approval'; at: number; below?: boolean; title: string; text: string }[] = [
  { id: 'pressure_high', key: 'publicPressure', at: TUNING.income.highPressureAt, title: 'Public pressure is high', text: 'While public pressure stays at 50 or more, you get 1 more PC every quarter.' },
  { id: 'tension_high', key: 'tension', at: TUNING.drift.highTensionAt, title: 'The race speeds up', text: 'At tension 60 or more, AI improves faster and labs cut safety corners.' },
  { id: 'capability_70', key: 'capability', at: 70, title: 'Close to the tipping point', text: 'At capability 80, AI starts improving itself and the superpowers choose their path.' },
  { id: 'approval_low', key: 'approval', at: TUNING.income.lowApprovalBelow, below: true, title: 'Approval is low', text: 'While approval stays below 30, you get 1 PC less every quarter.' },
];

export const CONCERN_THRESHOLDS = {
  jobsFromCapability: 40,
  misuseFrom: 25,
  warFromTension: 55,
  powerFromConcentration: 60,
  /** 1 bubble, +1 from this public pressure, +1 more from the next. */
  morePressure: [35, 50],
};

// ---------------------------------------------------------------------------
// Advisor (engine-owned words). Placeholders: {card}, {risk}, {alt}.
// ---------------------------------------------------------------------------

export const ADVISOR_TEXT = {
  prepareRisk: '{risk} is getting close. {card} would prepare Europe for it.',
  prepareRiskLater: '{risk} is getting close. You cannot afford {card} yet; save for next quarter.',
  context: 'A window is open: {card} is on offer only for a short time.',
  tension: 'Tension is pushing the superpowers towards a fight. {card} would cool it.',
  aiOffice: 'Nobody in Europe can test the most advanced AI yet. {card} would change that, and make inspections count.',
  verification: 'If AI took off now, nobody could verify a deal. {card} builds that capacity.',
  coalition: 'A lone envoy carries little weight. {card} makes a verified slowdown more likely.',
  safety: 'The labs’ safety reports may not be the whole truth. {card} works on what is really there.',
  social: 'Layoffs are coming. {card} would keep people on board.',
  save: 'Nothing urgent this quarter. Saving lets you afford a bigger move next quarter.',
  alternative: 'Alternative: {alt}.',
  noAlternative: 'Alternative: pass and save resources.',
};

/** Why each risk matters, in the advisor's reason line. */
export const ADVISOR_REASON = {
  risk: '{risk}: {stage}',
  context: '{reason}.',
  tension: 'High tension makes a US–China fight more likely and speeds up the race.',
  aiOffice: 'Without testers of its own, Europe’s inspections count for half.',
  verification: 'A deal at the tipping point needs inspectors ready to check it.',
  coalition: 'Washington and Beijing take calls from a bloc, not from a lone envoy.',
  safety: 'Hidden safety work takes years to show, so it has to start early.',
  social: 'AI is starting to take jobs, and approval follows.',
  save: 'Your income arrives every quarter, up to a cap.',
};
