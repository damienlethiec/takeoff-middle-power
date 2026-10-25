// Progressive complexity (spec phase 1): why a card unlocks, and why a new indicator matters now.

import type { IndicatorIntroCopy, UnlockCopy } from './types';

export const UNLOCKS: UnlockCopy[] = [
  { card: 'coalition', reason: 'Unlocked because partners are calling Brussels: London, Tokyo, Seoul, Ottawa and Oslo want to act together.' },
  { card: 'weight_security', reason: 'Unlocked because intelligence services warn that lab networks are being probed.' },
  { card: 'flexicurity', reason: 'Unlocked because the first wave of AI layoffs has reached Europe.' },
  { card: 'asml', reason: 'Unlocked because the race now runs on chips, and Europe makes the lithography machines they depend on.' },
  { card: 'open_models', reason: 'Unlocked because the first AI-enabled cyberattack has Europe asking who should hold powerful AI.' },
  { card: 'cyber_defence', reason: 'Unlocked because the first AI-enabled cyberattack is in the news.' },
  { card: 'measure', reason: 'Unlocked because people are asking who really decides in Europe’s firms and ministries.' },
  { card: 'oversight_mandate', reason: 'Unlocked because AI now drafts decisions that people sign without reading.' },
  { card: 'emergency_summit', reason: 'Offered because the AI incident has the whole world listening. The window will not stay open long.' },
  { card: 'joint_attribution', reason: 'Offered because a model was stolen, and your partners want to name the thief together.' },
];

export const INDICATOR_INTROS: IndicatorIntroCopy[] = [
  { key: 'coalition', why: 'Partners are ready to join. The more stand with Europe, the likelier a deal, and the cooler the tension.' },
  { key: 'publicPressure', why: 'Layoffs have started. How much Europeans want AI under control now decides how much backing you get.' },
  { key: 'misuse', why: 'AI tools are turning up in crimes. This shows how easily AI can be used against people.' },
  { key: 'concentration', why: 'A few companies are pulling ahead. This shows how much of AI sits in very few hands.' },
  { key: 'gdp', why: 'AI is reshaping the economy. Growth can rise even while people lose control.' },
  { key: 'approval', why: 'Voters are watching. If they turn against you, Political Capital dries up.' },
];
