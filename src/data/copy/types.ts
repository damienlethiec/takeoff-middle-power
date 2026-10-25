// v2 player-facing copy. Owned by the content workstream: words only, no rules.
// The engine decides WHEN something shows (conditions live in src/data, numbers in tuning.ts);
// these files decide WHAT it says. Every real-world claim carries a Source.

import type { ActId, CardId, DashboardKey, EventId, RegionId, Source } from '../../engine/types';

export interface IntroScreen {
  title: string;
  paragraphs: string[]; // plain words; "AI is grown, not built" framing; no unexplained jargon
  fact?: { text: string; source: Source };
}

export interface ActCopy {
  act: ActId;
  title: string; // "A seat at the table"
  /** Shown when the act opens: the story beat that justifies the new mechanics. */
  beat: string;
}

export interface TipCopy {
  id: string; // stable id the engine triggers, e.g. 'tip_clock', 'tip_hidden_alignment'
  title: string;
  text: string; // one screen
}

export interface ConcernCopy {
  id: string;
  region: RegionId;
  /** Which public worry this illustrates; the engine picks by theme. */
  theme: 'jobs' | 'safety' | 'misuse' | 'power' | 'war' | 'general';
  text: string; // "Teachers in Lyon worry AI tutors will replace them"
}

export interface RiskCopy {
  id: EventId;
  title: string; // "Model theft"
  stages: { watch: string; rising: string; imminent: string; happened: string };
  /** "Weight security standards would make a theft fail". */
  preparedBy: string;
}

export interface UnlockCopy {
  card: CardId;
  /** "Unlocked because partners are calling Brussels". */
  reason: string;
}

export interface IndicatorIntroCopy {
  key: DashboardKey;
  /** Why it matters now, one line. */
  why: string;
}

export interface RealCostCopy {
  card: CardId;
  text: string; // "The EU is investing about €X in AI factories (2025)"
  source: Source;
}

export interface CauseCopy {
  /** Log entry id or drift id → plain cause, per affected key. */
  id: string;
  key: string;
  text: string; // "Growing public concern about AI"
}

export interface AdvisorCopy {
  id: string; // template id used by the engine
  text: string; // may contain {card}, {risk}, {alt}
}
