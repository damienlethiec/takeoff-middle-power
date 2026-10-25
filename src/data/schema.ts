// Types for the declarative content in src/data. The engine reads these;
// nothing here contains logic.

import type { ActorId, CardId, EventId, EndingId, Flags, PlanId, RegionId, Source, StatKey, WorldKind, GaugeKey } from '../engine/types';
import type { Condition } from './conditions';

/** One change to the state. `when` makes it conditional (evaluated before any effect applies). */
export interface EffectSpec {
  key: StatKey;
  amount: number;
  when?: Condition;
}

/** A text that depends on the state: the first entry whose `when` holds is used. */
export interface ConditionalText {
  when?: Condition;
  text: string;
}

export interface Requirement {
  when: Condition; // must hold for the card to be available
  reason: string; // shown when it does not
}

export interface CardOptionDef {
  id: string;
  label: string;
  description: string;
  effects: EffectSpec[];
  hiddenEffects: EffectSpec[];
  advisorNote: string;
  debrief: string;
}

export interface CardDef {
  id: CardId;
  name: string;
  family: string;
  playerText: string; // ≤ 25 words
  isLouis: boolean;
  source: Source;
  cost: { pc: number; budget: number; token?: boolean };
  costLabel: string;
  /** Max number of plays; null = repeatable. */
  limit: number | null;
  requirements: Requirement[];
  effects: EffectSpec[];
  hiddenEffects: EffectSpec[];
  /** Applied at the start of next quarter. */
  pending?: EffectSpec[];
  setFlags?: Partial<Flags>;
  /** Engine-side behaviour that is not a stat change. */
  special?: 'ai_office' | 'measure';
  options?: CardOptionDef[];
  downside: string;
  dependencies: { text: string; met: Condition }[];
  /** Plain-language consequences shown in the preview (no hidden numbers). */
  previewNotes: string[];
  /** True when the card has consequences revealed only at the end (the preview says so, not what they are). */
  hasHiddenEffects: boolean;
  /** Hints at the hidden effect in words, never numbers. */
  advisorNotes: ConditionalText[];
  /** What the card really did, for the final debrief. */
  debrief: string;
  /** The world's reaction, shown in next quarter's news. Several for repeatable cards. */
  echoNews: string[];
}

export interface EventOptionDef {
  id: string;
  label: string;
  description: string;
  effects: EffectSpec[];
  hiddenEffects: EffectSpec[];
  debrief: string;
}

export interface EventVariantDef {
  /** Short label for the situation report: "China stole a model". */
  short: string;
  scene: string;
  effects: EffectSpec[];
  hiddenEffects: EffectSpec[];
  setFlags?: Partial<Flags>;
  options: EventOptionDef[];
  /** Why this variant happened, in a short clause: "no weight security standards were in place". */
  cause: string;
  news: string;
  debrief: string;
}

export interface EventDef {
  id: EventId;
  actor: ActorId;
  region: RegionId;
  title: string;
  trigger: Condition;
  preparedWhen: Condition;
  /** Plain words for the condition, used in the debrief. */
  preparedLabel: string;
  prepared: EventVariantDef;
  unprepared: EventVariantDef;
  whyItMatters: string;
  alreadyReal: { text: string; source: Source };
  source: Source;
  at: number;
}

export interface NewsTemplate {
  id: string;
  /** At most one template per pool per quarter. */
  pool: string;
  actor: ActorId;
  region: RegionId;
  when: Condition;
  text: string;
  /** must = always shown when its condition holds (milestones); otherwise ambient filler. */
  must?: boolean;
}

export interface NoteTemplate {
  id: string;
  pool: string;
  actor: ActorId;
  region: RegionId;
  when: Condition;
  text: string;
}

export interface GaugeInfo {
  key: GaugeKey | 'coalition';
  label: string;
  risesWhen: string;
  fallsWhen: string;
  visible: boolean;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Plain words for the forecast line: "the superpowers would likely ...". */
  plain: string;
  description: string;
  source: Source;
}

/** One thing that decided an ending, used when `when` holds (always when absent). */
export interface EndingReason {
  when?: Condition;
  /** Fills the ending text's `{causes}` slot (clauses of the matching reasons are joined with "and"). */
  clause?: string;
  /** One sentence for the ending's "why" line; `{key}` is replaced by that value (a condition key). */
  why: string;
}

export interface EndingDef {
  id: EndingId;
  world: WorldKind;
  good: boolean;
  title: string;
  /** May contain `{causes}`, filled from the reasons that hold in this game. */
  text: string;
  /** Why the player got this ending rather than its twin, in general (the run-specific line comes from `reasons`). */
  why: string;
  reasons: EndingReason[];
  source: Source;
}

export interface ActorRuleDef {
  id: string;
  actor: ActorId;
  region: RegionId;
  title: string;
  briefing: string;
  debrief: string;
}
