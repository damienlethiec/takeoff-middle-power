// Every number of the quarter loop in one place, so the simulation can tune them.
// Starting values come from docs/DEVELOPER_NOTES.md; deviations are documented there
// in the "Tuning changes" section.

import type { GaugeKey, EuKey, PlanId, Speed } from '../engine/types';

export const TUNING = {
  start: {
    gauges: {
      capability: 20,
      concentration: 50,
      apparentAlignment: 60,
      trueAlignment: 50,
      verification: 0,
      tension: 40,
      misuse: 10,
      publicPressure: 20,
      gdp: 50,
      approval: 50,
    } as Record<GaugeKey, number>,
    eu: { economy: 80, culture: 80, state: 80 } as Record<EuKey, number>,
    pc: 4, // v2 (was 6)
    budget: 5, // v2 (was 3)
    asmlTokens: 2,
    speedOdds: { slow: 0.25, steady: 0.5, fast: 0.25 } as Record<Speed, number>,
    /** v2: hidden true alignment is drawn among these, equally likely (was always 50). */
    trueAlignmentOptions: [45, 55, 65],
  },

  /** v2: both currencies arrive automatically every quarter from Q2, capped. */
  income: {
    pc: 2,
    pcHighPressureBonus: 1,
    highPressureAt: 50,
    pcLowApprovalPenalty: 1,
    lowApprovalBelow: 30,
    budget: 2,
    cap: 8, // PC and Budget never exceed this
  },

  /** v2: concern bubbles explain; they pay nothing. Kept for the UI's count. */
  bubbles: { maxPerQuarter: 3 },

  actors: {
    labAlignmentClaim: 1, // apparentAlignment per quarter
    labConsolidation: 1, // concentration per quarter (notes: 2)
    chipControlsAt: 60,
    chipControlsTension: 3,
    /** v2: after a successful theft, Washington widens export controls this many quarters later (unless averted). */
    theftEscalationAfter: 2,
    theftEscalationTension: 5,
  },

  /** v2: employment shocks the first time capability reaches each threshold. */
  employmentShocks: {
    at: [40, 70],
    approval: -5,
    approvalWithFlexicurity: -2,
    publicPressure: 5,
  },

  /** v2: acts and unlocks (src/data/progress.ts). */
  progress: {
    coalitionFromQuarter: 2, // partners call Brussels
    act2FallbackQuarter: 6, // slow worlds: the race goes public anyway
    misuseBeatAt: 25, // first AI-enabled cyberattack in the news
    misuseBeatFallbackQuarter: 9,
    act3FromQuarter: 6, // Léa's Q6 letter
    concentrationIndicatorAt: 60,
  },

  /** v2: context cards stay on offer this many quarters (the quarter they appear included). */
  contextWindow: 2,

  /** v2: risk track. A risk appears at `appear`, then each public target sets its stage by distance. */
  risks: {
    theftAppearTension: 45,
    theftAppearCapability: 30,
    theftTension: 50,
    theftCapability: 40,
    warningShotAppearCapability: 50,
    warningShotCapability: 65,
    opaqueAppearCapability: 55,
    opaqueCapability: 70,
    blackmailConcentration: 60,
    ransomwareAppearMisuse: 25,
    ransomwareMisuse: 40,
    /** A target is "rising" within `rising` points, "imminent" within `imminent` points. */
    margins: {
      capability: { rising: 12, imminent: 6 },
      tension: { rising: 8, imminent: 4 },
      misuse: { rising: 8, imminent: 4 },
      concentration: { rising: 8, imminent: 4 },
    } as Record<string, { rising: number; imminent: number }>,
  },

  drift: {
    capability: { slow: 2, steady: 4, fast: 6 } as Record<Speed, number>,
    capabilityHighTension: 1,
    highTensionAt: 60,
    trueAlignment: -1,
    trueAlignmentHighTension: -2,
    tension: 1,
    /** With coalition at this level or more, coalition diplomacy cools tension instead. */
    coalitionCoolsAt: 2,
    tensionWithCoalition: -1,
    euEconomy: -2,
    euEconomyHighCapability: -4, // once capability >= euHighCapabilityAt (notes: always -2)
    euCulture: -1,
    euCultureHighCapability: -2, // once capability >= euHighCapabilityAt (notes: always -1)
    euState: -1,
    euStateHighCapability: -2,
    euHighCapabilityAt: 35,
    euStateHighCapabilityAt: 50,
    misuseEarly: 1, // per quarter below misuseFromCapability (notes: 0)
    misuse: 2,
    misuseFromCapability: 40,
    misuseOpenModels: 1, // extra per quarter once open models are funded (notes: 0)
    gdp: 1,
    gdpHighCapability: 1,
    jobsAt: 50, // capability where jobs, approval and public pressure start to move
    approval: -1,
    publicPressure: 1, // every quarter (notes: only once capability >= 50)
    publicPressureJobs: 2, // once capability >= jobsAt
  },

  tippingAt: 80,
  lastQuarter: 16,

  /** Public news per quarter and when they appear during the clock (0..1 of the quarter). */
  news: {
    minLines: 2, // drawn uniformly between min and max, event line included
    maxLines: 4,
    firstAt: 0.08, // lines are spread evenly from firstAt over `spread`, then jittered
    spread: 0.84,
    jitter: 0.3, // total jitter range, divided by the number of lines
    earliestAt: 0.03,
    latestAt: 0.95,
  },

  /** Internal notes per quarter: 0 below noneBelow, 1 below oneBelow, else 2 (on a uniform draw). */
  notes: {
    noneBelow: 0.2,
    oneBelow: 0.7,
    firstAt: 0.2, // a note appears at firstAt + random × spread of the quarter
    spread: 0.7,
  },

  /** Thresholds behind the forecast's "What would help" lever (first match wins). */
  forecast: {
    lowVerification: 30, // below: AI Office first, then verification
    midVerification: 50,
    highVerification: 70,
    coalitionMaxTension: 70, // same as the coalition card's requirement
    highTension: 60,
    coalitionTarget: 2,
  },

  errorBars: {
    capability: 10,
    capabilityWithAiOffice: 5,
    alignment: 15,
    alignmentWithAiOffice: 5,
  },

  plans: {
    minWeight: 1,
    slowdown: { base: 5, verification: 0.6, pressure: 0.3, coalition: 10, warningShot: 15, summit: 10, tension: -0.2 },
    shutDown: { base: 2, pressureAt: 60, pressure: 0.3, unsafeBonus: 10, unsafeBelow: 40 },
    fight: { base: 10, tension: 0.5 },
    race: { base: 25, pressure: -0.2, verification: -0.1, floor: 5 },
    restraint: { base: 0.2, pressurePer: 1 / 400, trueAlignment: 8 },
    /** Hidden loss of human influence in Europe right after the superpowers choose (each organ; halved for economy and state with the oversight mandate). Notes: none. */
    aftermath: { verified_slowdown: 0, shut_down: 0, fight_china: -10, race: -25 } as Record<PlanId, number>,
  },

  endings: {
    bigAiConcentration: 60,
    bigAiEconomy: 40,
    utopiaVerification: 45,
    utopiaMaxConcentration: 70,
    utopiaTrueAlignment: 45,
    multipolarMaxTension: 70,
    cognitiveTrueAlignment: 60,
    epilogueHigh: 60,
    epilogueMid: 30,
    leaEnd: 50,
    leaQ6Economy: 65,
  },
};
