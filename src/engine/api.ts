// The engine's public API. Pure functions: no DOM, no Math.random (use the seeded RNG in state).
// Every function returns a NEW state (never mutates its input).
//
// Flow of one quarter, as the UI drives it:
//   s = startQuarter(s)            income, pending effects, actors, drift, news & notes, maybe an event
//   UI runs the clock ~10 s, revealing s.news / s.notes by their `at`, letting the player click bubbles:
//   s = collectBubble(s, region)   (max 2 per quarter)
//   if s.pendingEvent: the clock stops at pendingEvent.at → UI shows it →
//   s = resolveEvent(s, optionId?) (optionId required when options is non-empty)
//   report = situationReport(s)    the pause to assess
//   cards = cardViews(s); preview = previewCard(s, id, option)
//   { state, briefing } = playCard(s, id, option)  or  s = pass(s)
//   { state, outcome } = endQuarter(s)
//     'next_quarter'  → startQuarter again
//     'tipping_point' → s.phase === 'tipping': one free decision (playCard ignores costs), then
//                        s = runTippingPoint(s) → s.tipping set, s.phase 'ended'
//     'game_over'     → s.phase 'ended' (no tipping point: slow world)
//   debrief(s) once s.phase === 'ended'
//
// v2 additions (all pure, read-only views):
//   s.notices after startQuarter: act changes, unlocks, context cards, indicator introduced, tips, thresholds
//   s.concerns: the quarter's public concerns (map bubbles); PC now arrives automatically in startQuarter,
//              collectBubble is kept for compatibility but pays nothing (it only marks the concern as read)
//   dashboard(s), riskViews(s), advisor(s), trajectory(s), nextIncome(s), tip(s), journal(s), leaLetters(s)

export type {
  GameState,
  CardId,
  PlanId,
  RegionId,
  Briefing,
  CardPreview,
  CardView,
  Debrief,
  GaugeView,
  SituationReport,
  QuarterOutcome,
  EndingView,
  LeaScene,
  AdvisorView,
  DashboardView,
  IncomeView,
  JournalEntry,
  RiskView,
  Tip,
  TrajectoryView,
} from './types';

import type {
  AdvisorView,
  DashboardView,
  IncomeView,
  JournalEntry,
  RiskView,
  Tip,
  TrajectoryView,
  GameState,
  CardId,
  PlanId,
  RegionId,
  Briefing,
  CardPreview,
  CardView,
  Debrief,
  GaugeView,
  SituationReport,
  QuarterOutcome,
  LeaScene,
} from './types';

export interface EngineApi {
  createInitialState(seed: number): GameState;
  startQuarter(state: GameState): GameState;
  collectBubble(state: GameState, region: RegionId): GameState;
  resolveEvent(state: GameState, optionId?: string): GameState;
  situationReport(state: GameState): SituationReport;
  gaugeViews(state: GameState): GaugeView[];
  cardViews(state: GameState): CardView[];
  previewCard(state: GameState, id: CardId, option?: string): CardPreview;
  playCard(state: GameState, id: CardId, option?: string): { state: GameState; briefing: Briefing };
  pass(state: GameState): GameState;
  endQuarter(state: GameState): { state: GameState; outcome: QuarterOutcome };
  planOdds(state: GameState): Record<PlanId, number>;
  runTippingPoint(state: GameState): GameState;
  debrief(state: GameState): Debrief;
  /** Léa's scene for a slot, picked from the hidden state ('end' needs phase 'ended'). */
  leaScene(state: GameState, slot: LeaScene['slot']): LeaScene;
  /** "Q3 2027" */
  dateLabel(quarter: number): string;
  /** One-line goal and forecast shown at all times. */
  goalLine(): string;
  forecastLine(state: GameState): string;

  // ---------- v2 ----------
  /** Primary indicators (4 → 5 → 6) and the rest for "More indicators". */
  dashboard(state: GameState): DashboardView;
  /** Telegraphed crises, public values only. */
  riskViews(state: GameState): RiskView[];
  /** One recommendation with its reason; never uses hidden values. */
  advisor(state: GameState): AdvisorView;
  /** Where the superpowers are heading, and the last movement with its cause. */
  trajectory(state: GameState): TrajectoryView;
  /** Next quarter's income and why. */
  nextIncome(state: GameState): IncomeView;
  /** The tip to show now (at most one per quarter), or null. Showing it is recorded by markTipShown. */
  tip(state: GameState): Tip | null;
  markTipShown(state: GameState, tipId: string): GameState;
  /** Past quarters, oldest first: reports, decisions, events, Léa, tips. */
  journal(state: GameState): JournalEntry[];
}
