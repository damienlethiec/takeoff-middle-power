// Every number of the v3 rules. Change them only through the simulation (npm run sim) and record each
// change, its old value and the reason in the "Tuning changes" table of docs/DEVELOPER_NOTES.md.

import type { CardId, Pace } from '../engine/types';

export const TUNING = {
  rounds: 12,
  /** The tipping point: AI can do AI research by itself. */
  tippingAt: 80,
  /** No tipping point before this round. */
  earliestTipping: 6,

  start: { aiPower: 18, cooperation: 52, truth: 52, estimate: 55, margin: 15, cohesion: 66, influence: 6 },

  /** Hidden pace: how fast AI power rises each round. The rise grows with AI power (AI speeds up AI research). */
  pace: {
    weights: { slow: 0.4, steady: 0.33, fast: 0.27 } as Record<Pace, number>,
    base: { slow: 3.6, steady: 5.6, fast: 7.6 } as Record<Pace, number>,
    /** Extra rise per 10 points of AI power above 20, as a share of the base. */
    accel: 0.07,
    noise: 1.2,
  },

  drift: {
    /** The race heats up: Cooperation lost each round, more once AI power passes `highPower`. */
    cooperation: -1,
    cooperationHigh: -1,
    cooperationHighPower: 60,
    /** AI disrupts work: Cohesion lost each round, more once AI power passes `highPower`. */
    cohesion: 0,
    cohesionHigh: -1,
    highPower: 50,
    /** Cohesion erodes only once AI does whole jobs. */
    cohesionHighPower: 60,
    /** In the Rupture zone the arms race hits Europe too (sanctions, energy, cyberattacks): Cohesion lost each round. */
    cohesionRupture: -3,
    /** Harder to align as AI grows: true Confidence lost each round past `truthHighPower` (the low end drops with it). */
    truth: -2,
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
  requests: { maxPerGame: 10, chance: 0.6, minRate: 0.9, firstRound: 1 },

  influence: { base: 2, highCohesion: 60, lowCohesion: 35, coalitionLevel: 2, cap: 10, minIncome: 1 },

  zones: { pause: 60, race: 30 },
  /** Small suspense at the tipping point: the final Cooperation moves by up to this much, either way. */
  tippingNoise: 2,

  /** Deciding gauge and safety net of each world. */
  worlds: {
    pause: { decides: 'confidence', target: 68, net: 'cohesion', floor: 45 },
    race: { decides: 'confidence', target: 75, net: 'cohesion', floor: 55 },
    rupture: { decides: 'cohesion', target: 82, net: 'confidence', floor: 65 },
    plateau_open: { decides: 'cohesion', target: 60, net: 'confidence', floor: 40 },
    plateau_labs: { decides: 'cohesion', target: 60, net: 'confidence', floor: 40 },
  },

  jobShocks: { at: [40, 70], hit: -5, softened: -1 },

  /** AI 2027 milestones (src/data/milestones.ts): the AI power that reaches each, and the size of its effect. */
  milestones: {
    at: { china_wakes_up: 28, ai_takes_jobs: 34, agent2_internal: 42, alignment_inconclusive: 58, national_security: 62, self_improving: 66, cheap_remote_worker: 70, geopolitics: 75, tipping_point: 80 },
    effect: { china_wakes_up: -2, ai_takes_jobs: -2, agent2_internal: 2, alignment_inconclusive: 4, national_security: 2, geopolitics: -4 },
  },

  /** Card effects. Costs per level for cards with levels. */
  cards: {
    talks: { cost: 1, cooperation: 8, cohesion: -2, uses: 3, rest: 1 },
    inspections: { cost: [2, 2, 3], estimate: 8, truth: 6, margin: -4, cooperation: -4, uses: 3 },
    ai_office: { cost: 2, marginFactor: 0.5, cohesion: -1, inspectionsBonus: -2 },
    alignment: { cost: 2, truth: 6, estimate: 2, cohesion: -1, uses: 3 },
    coalition: { cost: [2, 2, 3], cooperation: 6, cohesion: -1, uses: 3 },
    audit: { cost: 1, rounds: 2, uses: 2 },
    asml: { cost: 2, safety: { estimate: 10, truth: 8 }, access: { cohesion: 8 }, cooperation: -12, uses: 2, arrivesAt: 35 },
    weight_security: { cost: 1, cohesion: -2 },
    open_models: { cost: 2, cohesion: 6, estimate: -6, truth: -6 },
    flexicurity: { cost: 3, cohesion: 10, influence: -1, rounds: 2 },
    cyber_shield: { cost: 2, cohesion: 3, influence: -1, rounds: 2 },
    oversight_mandate: { cost: 2, cohesion: 6, aiPower: -2, arrivesRound: 6 },
    summit: { cost: 1, cooperation: 10, estimate: 5, truth: 5, rounds: 2 },
    attribution: { cost: 1, cooperation: 5, rounds: 2 },
  } satisfies Record<CardId, object>,

  /** When cards first arrive. */
  arrive: { talks: 1, inspections: 1, ai_office: 1, alignment: 2, coalition: 3, audit: 4 },

  threats: {
    /** Theft pressure = AI power + (50 − Cooperation) × coopWeight. Stages at these pressures. */
    theft: { coopWeight: 0.4, stages: [28, 36, 42], unprepared: { aiPower: 5, cooperation: -15 }, prepared: { cooperation: -3 } },
    /** Opaque reasoning: AI power stages, after the theft. */
    opaque: { stages: [45, 50, 55], marginFactor: 1.5 },
    /** AI incident: AI power stages, after opaque reasoning; strike chance per round at stage 3 depends on hidden safety. */
    incident: {
      stages: [52, 57, 62],
      chanceBase: 0.2,
      chancePerPoint: 0.02,
      chanceMin: 0.08,
      chanceMax: 0.85,
      chanceCenter: 60,
      unprepared: { estimate: -10, cohesion: -5 },
      prepared: { cooperation: 10 },
      needs: { coalition: 1, inspections: 2 },
    },
    /** Ransomware pressure = AI power × powerWeight + 25 if Europe's AI is Open. */
    ransomware: { powerWeight: 0.5, openBonus: 25, stages: [32, 40, 48], unprepared: { cohesion: -15 }, prepared: { cohesion: -3 } },
    /** Silicon blackmail: appears with the oversight mandate while Dependent, grows one stage a round. */
    blackmail: { holdFirm: { cohesion: -10 } },
  },

  /** Leaks: every two or three rounds, readable with enough oversight. */
  leaks: { firstRound: 2, gapMin: 2, gapMax: 3, levels: [1, 1, 2, 2, 3, 3] },

  /** Oversight points: AI Office 2, each inspection level 1, an audit 1. */
  oversight: { aiOffice: 2, perInspection: 1, audit: 1 },

  /** Gap (estimate − truth) above which leaks and letters hint that the labs are too optimistic. */
  overconfidentGap: 6,

  /** Léa writes at these rounds, and at the end. */
  letters: { r1: 1, r4: 4, r8: 8 },
} as const;

export type Tuning = typeof TUNING;
