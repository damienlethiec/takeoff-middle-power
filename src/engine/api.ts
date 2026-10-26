// The engine's public API (v3). Pure functions: no DOM, no Math.random (the seeded RNG lives in state.rng).
// Every function returns a NEW state or a read-only view; none mutates its input.
//
// One round (six months), as the UI drives it:
//   s = startRound(s)        Influence arrives; AI power rises at the hidden pace; Cooperation and Cohesion drift;
//                            the labs push the Confidence estimate up; AI 2027 milestones are reached in order;
//                            threats grow (public values only); maybe one event (s.event); headlines, voices,
//                            a leak every two or three rounds, Léa's letter at rounds 1, 4 and 8; cards arrive.
//   The UI plays the six months on the map (about 8 s): s.headlines, s.voices and s.leak appear at their `at`.
//   if s.event: the clock stops at event.at for its Breaking news screen →
//   s = resolveEvent(s, choice?)   (choice required when event.options is non-empty: silicon blackmail)
//   The clock stops; the player asks for:
//     report(s)              "See what changed": heading line, up to three changes with their cause, threats that moved
//     hand(s), advisor(s)    "Make my decisions": the hand and the chief of staff's one recommendation
//     preview(s, picks)      before → after for one or two cards, in public values only (nothing committed)
//   s = playCard(s, pick)    up to two cards per round, within Influence
//   { state, outcome } = endRound(s)
//     'next'  → startRound again
//     'ended' → the tipping point was reached this round, or round 12 is over; s.phase === 'ended'
//   ending(s)                the ending, its one-sentence explanation, the reveal and the debrief
//
// Always available: gauges(s), heading(s), threats(s), nextIncome(s), letters(s), journal(s), dateLabel(round).
// Hidden values (the true Confidence, the AI pace) appear only in ending(s), and in gauges(s) while an
// independent audit runs (by the player's choice).

import type {
  AdvisorView,
  CardView,
  EndingView,
  FeedRound,
  GaugeKey,
  GameState,
  GaugeView,
  HeadingView,
  IncomeView,
  JournalRound,
  LetterView,
  Pick,
  PreviewView,
  ReportView,
  ThreatView,
} from './types';

export interface EngineApi {
  createInitialState(seed: number): GameState;
  startRound(state: GameState): GameState;
  resolveEvent(state: GameState, choice?: string): GameState;
  endRound(state: GameState): { state: GameState; outcome: 'next' | 'ended' };
  hand(state: GameState): CardView[];
  playCard(state: GameState, pick: Pick): GameState;
  preview(state: GameState, picks: Pick[]): PreviewView;
  gauges(state: GameState): GaugeView[];
  heading(state: GameState): HeadingView;
  threats(state: GameState): ThreatView[];
  report(state: GameState): ReportView;
  advisor(state: GameState): AdvisorView;
  nextIncome(state: GameState): IncomeView;
  letters(state: GameState): LetterView[];
  ending(state: GameState): EndingView;
  journal(state: GameState): JournalRound[];
  /** The live feed: every round so far, the current one last; the UI reveals the current round's items at their `at`. */
  feed(state: GameState): FeedRound[];
  /** Public values over time (start, then the end of each round, then now), for sparklines. */
  trends(state: GameState): Record<GaugeKey, number[]>;
  /** "H1 2028" */
  dateLabel(round: number): string;
}
