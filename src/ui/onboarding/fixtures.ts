// DEV ONLY: stand-ins for the v2 engine features the onboarding UI depends on (notices, tips, journal, Léa's
// letters), so every onboarding state can be seen and tested before the engine implements them.
// Enabled in the dev server with ?obfixtures (never in a production build: see index.ts).
// The script is keyed on the quarter only; it reads the real state for everything else.

import type { EngineApi } from '../../engine/api';
import type { CardId, GameState, JournalEntry, LeaScene, Notice, SituationReport, Tip } from '../../engine/types';
import { ACTS, TIPS } from '../../data/copy';
import { STAT_LABEL } from '../format';
import type { DeliveredLetter, OnboardingReads } from './reads';

const FALLBACK_TIPS: Record<string, Tip> = {
  tip_clock: {
    id: 'tip_clock',
    title: 'The clock runs, then stops for you',
    text: 'Each quarter plays out in a few seconds: news arrives, labs move. Press Space or the pause button to stop and look. At the end of the quarter, the game waits for your decision.',
  },
  tip_decision: {
    id: 'tip_decision',
    title: 'One decision per quarter',
    text: 'Pick one card, or pass. Budget pays for investments, Political Capital for rules and diplomacy. Select a card to see what it would change before you confirm.',
  },
  tip_trajectory: {
    id: 'tip_trajectory',
    title: 'Where the superpowers are heading',
    text: 'If AI starts improving itself, the US and China will choose a path. This bar shows what they would probably do today. Your decisions move it.',
  },
  tip_pressure: {
    id: 'tip_pressure',
    title: 'Public pressure',
    text: 'When people worry about AI, governments listen. High public pressure brings you more Political Capital every quarter.',
  },
  tip_risks: {
    id: 'tip_risks',
    title: 'Crises are announced',
    text: 'A crisis shows on the risk track before it happens. Prepare for it with the card named under the risk, and it will hurt far less.',
  },
  tip_human_influence: {
    id: 'tip_human_influence',
    title: 'Who decides?',
    text: 'The economy can grow while people quietly lose control of decisions. You cannot see that loss unless you measure it.',
  },
};

/** Which tip each quarter offers in the fixture script (at most one per quarter). */
const TIP_BY_QUARTER: Record<number, string> = { 1: 'tip_clock', 2: 'tip_decision', 3: 'tip_pressure', 4: 'tip_trajectory', 5: 'tip_risks', 6: 'tip_human_influence' };

const actNotice = (act: 1 | 2 | 3): Notice => {
  const a = ACTS.find((x) => x.act === act)!;
  return { kind: 'act', id: String(act), title: a.title, text: a.beat };
};

/** The notices each quarter brings in the fixture script. */
function noticesFor(q: number): Notice[] {
  switch (q) {
    case 1:
      return [actNotice(1)];
    case 2:
      return [
        { kind: 'card_unlocked', id: 'coalition', title: 'Middle-power coalition', text: 'Unlocked because partners are calling Brussels.' },
        { kind: 'indicator', id: 'coalition', title: 'Coalition', text: 'Allies make a deal more likely and cool tension.' },
      ];
    case 3:
      return [
        actNotice(2),
        { kind: 'indicator', id: 'publicPressure', title: 'Public pressure', text: 'The first AI layoffs made safety a political issue.' },
        { kind: 'card_unlocked', id: 'flexicurity', title: 'Flexicurity reform', text: 'Unlocked because the first wave of AI layoffs hit Europe.' },
        { kind: 'card_unlocked', id: 'asml', title: 'Use the ASML lever', text: 'Unlocked because the race is now public.' },
      ];
    case 4:
      return [
        { kind: 'employment_shock', id: 'capability_40', title: 'A wave of AI layoffs', text: 'Translation, support and back-office jobs are cut across Europe. Approval falls and the public demands action.' },
        { kind: 'threshold', id: 'tension_60', title: 'Tension passed 60', text: 'The race speeds up: both superpowers cut safety corners.' },
      ];
    case 5:
      return [{ kind: 'context_card', id: 'emergency_summit', title: 'Emergency inspection summit', text: 'The world is listening after the incident. Available for two quarters.' }];
    case 6:
      return [
        actNotice(3),
        { kind: 'card_unlocked', id: 'measure', title: 'Measure human influence', text: 'Unlocked because Léa asked who really decides.' },
        { kind: 'card_unlocked', id: 'oversight_mandate', title: 'Human oversight mandate', text: 'Unlocked because AI now runs whole firms.' },
      ];
    default:
      return [];
  }
}

function tipById(id: string): Tip {
  const c = TIPS.find((t) => t.id === id);
  return c ? { id: c.id, title: c.title, text: c.text } : FALLBACK_TIPS[id] ?? { id, title: id, text: 'Placeholder tip.' };
}

const LEA_SLOTS: [LeaScene['slot'], number][] = [
  ['q1', 1],
  ['q6', 6],
  ['q11', 11],
];

function report(e: EngineApi, s: GameState, q: number): SituationReport {
  const entries = s.log.filter((l) => l.quarter === q && l.kind !== 'card');
  const changes = entries.flatMap((l) =>
    l.visibleDeltas
      .filter((d) => d.key !== 'pc' && d.key !== 'budget' && !d.key.startsWith('eu.'))
      .map((d) => ({ key: d.key as SituationReport['changes'][number]['key'], label: STAT_LABEL[d.key] ?? d.key, delta: d.amount, cause: l.title })),
  );
  return {
    quarter: q,
    dateLabel: e.dateLabel(q),
    changes,
    why: entries.filter((l) => l.kind === 'event' || l.kind === 'actor').map((l) => l.briefing).slice(0, 3),
    forecast: { mostLikely: 'race', probability: 0.5, sentence: '', whatWouldHelp: '' },
    newNews: s.news.filter((n) => n.quarter === q).length,
    newNotes: { total: 0, readable: 0 },
    lea: null,
    headline: [],
    background: '',
    risksMoved: [],
    trajectoryChange: null,
  };
}

export function fixtureReads(e: EngineApi): OnboardingReads {
  const letters = (s: GameState): DeliveredLetter[] =>
    LEA_SLOTS.filter(([, q]) => q <= s.quarter).map(([slot, quarter]) => ({ ...e.leaScene(s, slot), quarter }));
  return {
    notices: (s) => noticesFor(s.quarter),
    tip: (s) => {
      const id = TIP_BY_QUARTER[s.quarter];
      return id && !s.tipsShown.includes(id) ? tipById(id) : null;
    },
    markTipShown: (s, id) => e.markTipShown(s, id),
    journal: (s): JournalEntry[] =>
      Array.from({ length: Math.max(0, s.quarter - 1) }, (_, i) => i + 1).map((q) => {
        const card = s.log.find((l) => l.quarter === q && l.kind === 'card');
        return {
          quarter: q,
          dateLabel: e.dateLabel(q),
          report: report(e, s, q),
          decision: { cardId: (card?.id as CardId) ?? null, title: card?.title ?? 'You passed' },
          events: s.log.filter((l) => l.quarter === q && l.kind === 'event').map((l) => ({ id: l.id as JournalEntry['events'][number]['id'], title: l.title, prepared: !!s.firedEvents[l.id as keyof GameState['firedEvents']]?.prepared })),
          lea: letters(s).find((l) => l.quarter === q) ?? null,
          tips: TIP_BY_QUARTER[q] && s.tipsShown.includes(TIP_BY_QUARTER[q]) ? [tipById(TIP_BY_QUARTER[q])] : [],
        };
      }),
    leaLetters: letters,
  };
}
