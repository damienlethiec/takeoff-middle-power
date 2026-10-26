// The engine's public API (v4, on v3's model). Pure functions: no DOM, no Math.random (the seeded RNG lives in
// state.rng). Every function returns a NEW state or a read-only view; none mutates its input.
//
// One round (six months), as the UI drives it:
//   s = startRound(s)        Influence arrives; AI capabilities rise at the hidden pace; cooperation and cohesion
//                            drift; the labs' reports raise what they claim about AI safety (what is verified does
//                            not move); AI 2027 milestones are reached in order; threats grow (public values only);
//                            maybe one event (s.event); headlines, voices, a leak every two or three rounds, Léa's
//                            letter at rounds 1, 4 and 8; cards arrive.
//   The UI plays the six months (about 8 s): feed(s) gives the round's items with their `at`; they appear in the
//   news feed and on the map as the clock passes them.
//   if s.event: the clock stops at event.at for its Breaking news screen →
//   s = resolveEvent(s, choice?)   (choice required when event.options is non-empty: silicon blackmail)
//   while request(s): a character arrives at its `at`, the clock stops →
//   { state: s } = answerRequest(s, 'left' | 'right')   (free of Influence; the cost is in the answer)
//   The clock stops ("What changed" tops the feed); when the player asks for the decisions:
//     hand(s), advisor(s)    the hand and the chief of staff's one recommendation
//     preview(s, picks)      the selection's effect, in public values only (nothing committed), with
//                            outlookAfter: where the world would head
//   s = playCard(s, pick)    as many cards as Influence covers, each at most once a round
//   { state, outcome } = endRound(s)
//     'next'  → startRound again (no stop between rounds)
//     'ended' → the tipping point was reached this round, or round 12 is over; s.phase === 'ended'
//   ending(s)                the ending, its one-sentence explanation, the reveal and the debrief
//
// Always available: gauges(s), heading(s), threats(s), nextIncome(s), letters(s), feed(s), report(s) (this round's
// biggest changes), trends(s), dateLabel(round).
// Hidden values (the true AI safety, the AI pace) appear only in ending(s), and in gauges(s) while an
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
  LetterView,
  Pick,
  PreviewView,
  ReportView,
  RequestOutcome,
  RequestView,
  Side,
  ThreatView,
} from './types';

export interface EngineApi {
  createInitialState(seed: number): GameState;
  startRound(state: GameState): GameState;
  resolveEvent(state: GameState, choice?: string): GameState;
  /** The next request to answer this round (it comes at its `at` while the clock runs), or null. */
  request(state: GameState): RequestView | null;
  /** Answer the next request: free of Influence, the cost is in the answer. */
  answerRequest(state: GameState, side: Side): { state: GameState; outcome: RequestOutcome };
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
  /** The live feed: every round so far, the current one last; the UI reveals the current round's items at their `at`. */
  feed(state: GameState): FeedRound[];
  /** Public values over time (start, then the end of each round, then now), for sparklines. */
  trends(state: GameState): Record<GaugeKey, number[]>;
  /** "H1 2028" */
  dateLabel(round: number): string;
}
