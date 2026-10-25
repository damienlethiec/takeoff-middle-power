// v2 copy: placeholders so everything compiles; the content workstream fills them.
import type {
  ActCopy,
  AdvisorCopy,
  CauseCopy,
  ConcernCopy,
  IndicatorIntroCopy,
  IntroScreen,
  RealCostCopy,
  RiskCopy,
  TipCopy,
  UnlockCopy,
} from './types';

export const INTRO: IntroScreen[] = [
  { title: 'The world in 2027', paragraphs: ['Placeholder.'] },
  { title: 'Your role', paragraphs: ['Placeholder.'] },
];

export const ACTS: ActCopy[] = [
  { act: 1, title: 'A seat at the table', beat: 'Placeholder.' },
  { act: 2, title: 'The race goes public', beat: 'Placeholder.' },
  { act: 3, title: 'Who decides?', beat: 'Placeholder.' },
];

export const TIPS: TipCopy[] = [];
export const CONCERNS: ConcernCopy[] = [];
export const RISKS: RiskCopy[] = [];
export const UNLOCKS: UnlockCopy[] = [];
export const INDICATOR_INTROS: IndicatorIntroCopy[] = [];
export const REAL_COSTS: RealCostCopy[] = [];
export const CAUSES: CauseCopy[] = [];
export const ADVISOR: AdvisorCopy[] = [];
