// Every number of the v3 rules. Change them only through the simulation (npm run sim) and record each
// change, its old value and the reason in the "Tuning changes" table of docs/DEVELOPER_NOTES.md.

import type { CardId, FriendId, Pace } from '../engine/types';

export const TUNING = {
  /** Ten rounds of six months, H1 2027 to H2 2031 (12 → 10, user decision of 26 Oct; rebalanced the same day). */
  rounds: 10,
  /** The tipping point: AI can do AI research by itself. */
  tippingAt: 80,
  /** No tipping point before this round. */
  earliestTipping: 6,

  start: { aiPower: 18, cooperation: 52, truth: 52, estimate: 55, margin: 15, cohesion: 66, influence: 6 },

  /** Hidden pace: how fast AI power rises each round. The rise grows with AI power (AI speeds up AI research). */
  pace: {
    weights: { slow: 0.4, steady: 0.33, fast: 0.27 } as Record<Pace, number>,
    base: { slow: 4.0, steady: 5.8, fast: 7.2 } as Record<Pace, number>,
    /** Extra rise per 10 points of AI power above 20, as a share of the base. */
    accel: 0.15,
    noise: 1.2,
  },

  drift: {
    /** The race heats up: Cooperation lost each round, more once AI power passes `highPower`. */
    cooperation: 0,
    cooperationHigh: -1,
    cooperationHighPower: 60,
    /** AI disrupts work: Cohesion lost each round, more once AI power passes `highPower`. */
    cohesion: 0,
    cohesionHigh: 0,
    highPower: 50,
    /** Cohesion erodes only once AI does whole jobs. */
    cohesionHighPower: 60,
    /** In the Rupture zone the arms race hits Europe too (sanctions, energy, cyberattacks): Cohesion lost each round. */
    cohesionRupture: -3,
    /** Harder to align as AI grows: true Confidence lost each round past `truthHighPower` (the low end drops with it). */
    truth: -1,
    truthHighPower: 60,
    /** The labs' reports push the reported value up each round; the uncertainty widens by as much (the low end stays). */
    labReports: 1,
  },

  /** AI safety (v4): the uncertainty lies only below the reported value, between these bounds. The cap keeps
   *  "could be as low as" meaningful; it rarely binds for a player who builds oversight (the labs' reports widen
   *  the band by `drift.labReports` a round, opaque reasoning by `threats.opaque.marginFactor`). */
  confidence: { minMargin: 3, maxMargin: 40 },

  /** "At this pace" on the capabilities gauge, from public values only (the last rise): the range of rounds
   *  left to the tipping point is (gap / last rise) × these factors. Low under 1 because AI speeds up AI. */
  eta: { low: 0.6, high: 1.1, showWithin: 4 },

  /** "Or change course" in the band: another world is offered only when the cooperation gap is this small. */
  outlook: { altGap: 15 },

  /** Requests (v4): characters who arrive during the six months. 6 to 10 a game, at most one a round
   *  (two when a follow-up is due). `chance` is the share of other rounds that get one; `minRate` keeps the
   *  count up (a request is forced when fewer than round × minRate have come). */
  requests: { maxPerGame: 8, chance: 0.6, minRate: 1, firstRound: 1 },

  influence: { base: 2, highCohesion: 60, lowCohesion: 35, coalitionLevel: 2, cap: 10, minIncome: 1 },

  zones: { pause: 60, race: 30 },
  /** Small suspense at the tipping point: the final Cooperation moves by up to this much, either way. */
  tippingNoise: 2,

  /** Deciding gauge and safety net of each world. */
  worlds: {
    pause: { decides: 'confidence', target: 60, net: 'cohesion', floor: 42 },
    race: { decides: 'confidence', target: 62, net: 'cohesion', floor: 47 },
    rupture: { decides: 'cohesion', target: 82, net: 'confidence', floor: 60 },
    plateau_open: { decides: 'cohesion', target: 60, net: 'confidence', floor: 40 },
    plateau_labs: { decides: 'cohesion', target: 60, net: 'confidence', floor: 40 },
  },

  /** Without a tipping point, how far AI got picks CFG's gradual world: below `bigAiFrom` AI hit a wall (Plateau,
   *  open models everywhere); from it, AI kept improving slowly under a few labs' compute (Big AI). In Big AI only a
   *  Europe with its own open models ends well (CFG's agent economy: publicly funded models must be open-weight). */
  plateau: { bigAiFrom: 70 },

  jobShocks: { at: [40, 70], hit: -5, softened: -1 },

  /** AI 2027 milestones (src/data/milestones.ts): the AI power that reaches each, and the size of its effect. */
  milestones: {
    at: { china_wakes_up: 28, ai_takes_jobs: 34, agent2_internal: 42, alignment_inconclusive: 58, national_security: 62, self_improving: 66, cheap_remote_worker: 70, geopolitics: 75, tipping_point: 80 },
    effect: { china_wakes_up: -2, ai_takes_jobs: -2, agent2_internal: 2, alignment_inconclusive: 4, national_security: 2, geopolitics: -4 },
  },

  /** Effects in words before deciding (playtests of 26 Oct: players computed from exact numbers). A move of at most
   *  `little` reads "a little", at most `some` reads "some", more reads "a lot" (src/data/effects.ts). Numbers show
   *  after the decision. Presentation only: no rule reads these. */
  effectWords: { little: 3, some: 7 },

  /** Actions can fail (v4, playtests of 26 Oct: "too easy", one player asked for it). Diplomatic and external cards
   *  work only with some chance, from public values only: `base`, plus `pause` / `rupture` in that cooperation zone,
   *  `highCohesion` from `cohesion.high`, `lowCohesion` below `cohesion.low`, `perCoalition` per coalition level;
   *  kept within [`min`, `max`]. The card says it in words: from `likely` "Likely to work", from `uncertain`
   *  "Uncertain", below "Long shot". A failed card costs its Influence and does nothing else (no level climbed, no
   *  blowback); it can be tried again in a later round. Europe's own testing (inspections, level 1) and the cards
   *  that spend Europe's own money never fail. Each roll draws from its own stream (seed, round, card). */
  failure: {
    likely: 0.75,
    uncertain: 0.5,
    min: 0.15,
    max: 0.95,
    cohesion: { high: 60, low: 45 },
    cards: {
      talks: { base: 0.75, pause: 0.15, rupture: -0.3 },
      coalition: { base: 0.75, highCohesion: 0.1, lowCohesion: -0.25 },
      inspections: { base: 0.65, pause: 0.15, rupture: -0.3 },
      pause_call: { base: 0.65, perCoalition: 0.1 },
      licensing_treaty: { base: 0.55, perCoalition: 0.1 },
      biosecurity: { base: 0.8, rupture: -0.3 },
      asml: { base: 0.7, highCohesion: 0.1, lowCohesion: -0.25 },
    } satisfies Partial<Record<CardId, { base: number; pause?: number; rupture?: number; highCohesion?: number; lowCohesion?: number; perCoalition?: number }>>,
  },

  /** Card effects. Costs per level for cards with levels. */
  cards: {
    talks: { cost: 1, cooperation: 3, cohesion: -2, uses: 3, rest: 1 },
    /** Level 1 (EU testing of the models sold in Europe) from round 1; the accord and the joint inspectorate only
     *  after an AI incident, the summit, or with US–China cooperation in the Pause zone. Cooperation per level (0
     *  for the first: Europe tests at home); hidden `truth` per level (inspectors inside the labs, under a deal, can
     *  demand fixes); Influence lost the next round from the accord on. */
    inspections: { cost: [2, 3, 3], margin: -8, cooperation: [0, 2, 2], truth: [0, 3, 3], influence: -1, uses: 3 },
    /** Influence next round (was Social cohesion −1 until 27 Oct: no honest reason; paying testers like lab engineers
     *  squeezes other budgets, which costs political capital). */
    ai_office: { cost: 1, marginFactor: 0.5, influence: -1, inspectionsBonus: -2 },
    /** Hidden gain `truth`, plus `accessTruth` once the inspection accord (`accessInspections`) opens the labs. */
    alignment: { cost: 2, truth: 5, accessTruth: 4, accessInspections: 2, estimate: 2, cohesion: 0, uses: 3 },
    coalition: { cost: [2, 2, 3], cooperation: 2, cohesion: 0, uses: 3 },
    audit: { cost: 1, rounds: 2, uses: 2 },
    asml: { cost: 2, safety: { margin: -8 }, access: { cohesion: 6 }, cooperation: -2, uses: 2, arrivesAt: 35 },
    weight_security: { cost: 1, cohesion: -2 },
    open_models: { cost: 2, cohesion: 6, arrivesRound: 2 },
    flexicurity: { cost: 3, cohesion: 10, influence: -1, rounds: 2 },
    cyber_shield: { cost: 2, cohesion: 3, influence: -1, rounds: 2 },
    oversight_mandate: { cost: 2, cohesion: 6, arrivesRound: 6 },
    cern_ai: { cost: 3, margin: -8, cohesion: -3, arrivesRound: 3 },
    chip_verification: { cost: 3, cooperation: 2, margin: -3, influence: -1, arrivesAt: 50 },
    /** Only with US–China cooperation in the Pause zone (`zones.pause`). */
    licensing_treaty: { cost: 3, margin: -6, truth: 6, cooperation: 2, cohesion: -2 },
    /** Influence next round (was Social cohesion −1 until 27 Oct: leading a worldwide pact spends political capital). */
    biosecurity: { cost: 1, cooperation: 2, influence: -1 },
    /** Opens after any AI incident: `cooperation` when Europe was prepared (it leads), `cooperationFollow` otherwise. */
    summit: { cost: 1, cooperation: 10, cooperationFollow: 5, margin: -5, truth: 4, rounds: 2 },
    attribution: { cost: 1, cooperation: 3, rounds: 2 },
    /** AI 2027, October 2027: after the memo leaks, Europe calls for a pause with other capitals. Beijing joins
     *  (cooperation), Washington calls it betrayal (Influence next round); one vote toward slowing down. */
    pause_call: { cost: 2, cooperation: 2, influence: -2, rounds: 2 },
  } satisfies Record<CardId, object>,

  /** When cards first arrive. */
  arrive: { talks: 1, inspections: 1, ai_office: 1, alignment: 2, coalition: 3, audit: 4 },

  threats: {
    /** Theft pressure = AI power + (50 − Cooperation) × coopWeight. Stages at these pressures. */
    /** Prepared (weight security) cuts the theft short: part of the model gets out (partial protection). */
    theft: { coopWeight: 0.4, stages: [28, 33, 38], unprepared: { aiPower: 5, cooperation: -15 }, prepared: { aiPower: 2, cooperation: -6 } },
    /** Opaque reasoning: AI power stages, after the theft. The uncertainty grows by `marginFactor`, by
     *  `preparedFactor` with the AI Office's testers (they test behaviour; nobody can read the reasoning). */
    opaque: { stages: [45, 48, 51], marginFactor: 1.5, preparedFactor: 1.2 },
    /** AI incident: AI power stages, once opaque reasoning is imminent; strike chance per round at stage 3 depends on
     *  hidden safety (`chanceBase` + `chancePerPoint` × (`chanceCenter` − truth)). */
    incident: {
      stages: [50, 54, 58],
      chanceBase: 0.2,
      chancePerPoint: 0.01,
      chanceMin: 0.08,
      chanceMax: 0.85,
      chanceCenter: 60,
      /** Unprepared, fear still drives some talks (CFG: the warning shot galvanises cooperation). */
      unprepared: { estimate: -10, cohesion: -5, cooperation: 3 },
      prepared: { cooperation: 10 },
      needs: { coalition: 1, inspections: 1 },
    },
    /** Ransomware pressure = AI power × powerWeight + openBonus if Europe's AI is Open (closed models are misused
     *  too: a Dependent Europe meets it from about AI capabilities 53). */
    ransomware: { powerWeight: 0.6, openBonus: 15, stages: [32, 37, 42], unprepared: { cohesion: -15 }, prepared: { cohesion: -3 } },
    /** Silicon blackmail: appears with the oversight mandate while Dependent, grows one stage a round. */
    blackmail: { holdFirm: { cohesion: -10 } },
    /** Bioweapon uplift (AI 2027, July 2027; CFG, Take-off): AI capabilities stages after self-improving AI,
     *  `openBonus` more if Europe's AI is Open. Unprepared: a lockdown scare; prepared (the biosecurity pact): fear
     *  shared, a little cooperation. Once imminent it strikes with `chance` a round: AI 2027 names the uplift as a
     *  risk the labs test for, not an attack that happens. */
    bio: { stages: [66, 69, 72], openBonus: 3, chance: 0.3, unprepared: { cohesion: -6 }, prepared: { cohesion: -1 } },
  },

  /** Breaking news a round (v4, 27 Oct). One scenario event at most (an AI 2027 milestone's threat, the memo, a job
   *  shock, a crisis); when it takes the slot, a threat that is due (the AI incident, bioweapon uplift, silicon
   *  blackmail, ransomware) may still strike as a second, `gap` later in the six months, so the scenario's crowded
   *  late rounds never starve the threats. With two, at most `requestsWithTwo` request, early in the six months
   *  (`requestAt`), so the player is never flooded. */
  breaking: { max: 2, gap: 0.25, latest: 0.9, requestsWithTwo: 1, requestAt: 0.15 },

  /** Breaking news that are not threats (CFG, AI 2027). Each comes once. */
  events: {
    /** Washington blocks European chip-tool sales to China (CFG, Arms race): after the ASML lever, or in the Rupture
     *  zone once the theft struck. Comply: lost exports, Beijing sees Europe join the blockade. Protest: Washington
     *  threatens to withdraw its AI from Europe (the silicon blackmail threat appears or grows). */
    chipBan: { comply: { cohesion: -4, cooperation: -3 } },
    /** A Taiwan Strait crisis: in the Rupture zone once the theft struck, from AI capabilities `from`. */
    taiwan: { from: 50, cooperation: -5, cohesion: -4, aiPower: -2 },
    /** Washington and Beijing ban open models above a size (CFG): when Europe's AI is Open, from AI capabilities
     *  `from`, outside the Rupture zone. Join: Europe's AI → Dependent, open developers leave. Keep open: cooperation,
     *  and the ransomware threat grows a stage. */
    openBan: { from: 55, join: { cohesion: -2 }, keep: { cooperation: -4 } },
    /** Washington rations Europe's access to American AI (Europe 2031, April 2029: the Frontier Inference Services
     *  Rule puts most of Europe in Tier 2): once AI 2027's national-security milestone is reached, while Europe's AI
     *  is Dependent, outside the Pause zone. Cloud deal (recommendation 1: US hyperscalers build in Europe under
     *  European law): Beijing sees Europe pick a side, and the race gets more computers. Build our own: firms ration
     *  AI for years. */
    rationing: { deal: { cooperation: -2, aiPower: 1 }, own: { cohesion: -3 } },
  },

  /** The geopolitics milestone (AI 2027, August 2027): Five Eyes allies get privileged access. A coalition below
   *  level `holds` (Canada not yet in) wavers: Influence lost at once. */
  fiveEyes: { holds: 2, influence: -2 },

  /** The misalignment memo leaks to the press (AI 2027, September–October 2027): Breaking news in the first round
   *  with AI capabilities `at` or more, after the geopolitics milestone (so always at or before the tipping point).
   *  Backlash: Social cohesion. Unless Europe's inspections reached `seesFrontier` (the accord), Europe's testers had
   *  only been shown older models: the uncertainty widens by `obsoleteMargin` (verified falls). It opens the pause
   *  call and forms the Oversight Committee. */
  memo: { at: 76, cohesion: -3, seesFrontier: 2, obsoleteMargin: 4 },

  /** AI 2027's Oversight Committee vote at the tipping point (once the memo leaked): ten votes, `base` to slow down,
   *  +1 for the leaked memo, +1 for Europe's pause call, +1 when what is verified about AI safety is below
   *  `doubtBelow` after an AI incident (nobody outside can vouch for it, and the warning shot made it public), −1 in
   *  the Rupture zone (hawks). Slow down at `needed` or more.
   *  Slowing down moves the final US–China cooperation by `slowdown.cooperation` and the true AI safety by
   *  `slowdown.truth` (outside researchers brought in, Agent-4 shut down); racing on moves cooperation by
   *  `race.cooperation` (China's offer of a pause refused). */
  committee: { base: 4, needed: 6, doubtBelow: 30, slowdown: { cooperation: 10, truth: 8 }, race: { cooperation: -4 } },

  /** Leaks: a leak round every two or three rounds; each leak comes at the first leak round after its AI 2027
   *  milestone (src/data/leaks.ts), readable with enough oversight. */
  leaks: { firstRound: 2, gapMin: 2, gapMax: 3, levels: [1, 1, 2, 2] },

  /** Oversight points: AI Office 2, each inspection level 1, an audit 1. */
  oversight: { aiOffice: 2, perInspection: 1, audit: 1 },

  /** Gap (estimate − truth) above which leaks hint that the labs are too optimistic. */
  overconfidentGap: 6,

  /** v4: the three friends write at these rounds (each letter opens its round as a postcard); each friend's
   *  n-th letter in the schedule is their first, second or third (src/data/letters.ts). All write an epilogue at
   *  the end. The pools are picked from public values only: */
  letters: {
    schedule: [
      { round: 1, friend: 'lea' },
      { round: 2, friend: 'malik' },
      { round: 3, friend: 'mother' },
      { round: 5, friend: 'lea' },
      { round: 6, friend: 'malik' },
      { round: 7, friend: 'mother' },
      { round: 9, friend: 'lea' },
    ] as { round: number; friend: FriendId }[],
    /** Rounds where the game's generator still makes one unused draw, where Léa's letters drew before the friends
     *  (26 Oct), so seeded games and the simulation stay identical. Not a balance setting. */
    legacyDraws: [1, 4, 8] as number[],
    /** Léa's second letter is the hard one after a job shock or below this Social cohesion; her third is the
     *  "holding" one at or above `leaHolding`. */
    leaHard: 55,
    leaHolding: 50,
    /** Malik's first letter is tense below this US–China cooperation; his second tells of rupture below `malikRupture`. */
    malikTense: 45,
    malikRupture: 30,
    /** Your mother's letters follow what is verified about AI safety (the low end of the band): doubt below
     *  `motherDoubt` (first letter), a near miss below `motherNearMiss` (second), checked at `motherChecked`+. */
    motherDoubt: 42,
    motherNearMiss: 45,
    motherChecked: 60,
  },

  /** v4: AI weighs on jobs every round (automation spreading, AI 2027's agents taking office work): Social
   *  cohesion loses round(min(max, (AI capabilities − from) / per) × factor) a round. The factor is 1, minus
   *  `flexicurity` once the flexicurity reform is played, minus `answer` per answer that protects workers
   *  (src/data/social.ts, WORKER_ANSWERS), never below `minFactor`. The two job shocks stay as visible moments. */
  jobDrift: { from: 35, per: 25, max: 2, flexicurity: 0.75, answer: 0.25, minFactor: 0.25 },

  /** v4: social events (src/data/social.ts), one a round from `firstRound`, a second with chance
   *  min(secondMax, secondChance + unrest × secondPerUnrest). Unrest, from public values only:
   *  max(0, (cohesionCalm − Social cohesion) / cohesionSpan) + max(0, (AI capabilities − aiFrom) / aiSpan).
   *  Draw weights: bad news 1 + unrest × badPerUnrest; good news goodBase + protections × goodPerProtection
   *  (flexicurity, worker answers). A job event's hit is softened by `softenPerProtection` per protection, never
   *  below 1. Sizes: the points an event moves its gauge (for "verified", how much more of AI safety is verified). */
  social: {
    firstRound: 1,
    secondChance: 0.3,
    secondPerUnrest: 0.25,
    secondMax: 0.75,
    unrest: { cohesionCalm: 60, cohesionSpan: 20, aiFrom: 40, aiSpan: 30 },
    badPerUnrest: 0.5,
    goodBase: 1.6,
    goodPerProtection: 0.5,
    softenPerProtection: 1,
    size: { small: 2, medium: 3, large: 4 },
  },

  /** v4.1: variety. Headlines and voices never repeat inside a game. Items the player saw in their last two finished
   *  games (localStorage `takeoff.recent`, passed to createInitialState) are drawn with `recentWeight` times their
   *  weight (never 0, so small pools never run dry): headlines, voices, letters, social events and requests. The
   *  seeded simulation passes no memory. Lines that echo the player's own decisions (`echo` in mapcontent.ts) are
   *  drawn first, at most `echoVoices` voices and `echoHeadlines` headlines a game. */
  news: { recentWeight: 0.25, echoVoices: 2, echoHeadlines: 3 },
} as const;

export type Tuning = typeof TUNING;
