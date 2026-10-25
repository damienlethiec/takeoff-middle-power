// Suggested words for engine-owned texts. The engine decides whether and how to use them.
//
// CAUSES: one plain cause per (log entry id, affected key), so a report line never pins two effects on
// one cause (bug B1). Ids match the drift and actor entries in src/engine/index.ts and src/data/news.ts;
// variants (`_jobs`, `_high_tension`...) match the branches the engine already takes.
//
// ADVISOR: templates with {card}, {risk}, {alt}. No numbers, no hidden values (house rule).

import type { AdvisorCopy, CauseCopy } from './types';

export const CAUSES: CauseCopy[] = [
  { id: 'capability', key: 'capability', text: 'AI keeps improving' },
  { id: 'capability_high_tension', key: 'capability', text: 'AI keeps improving, faster under high tension' },
  { id: 'tension', key: 'tension', text: 'The race heats up' },
  { id: 'tension_coalition', key: 'tension', text: 'Coalition diplomacy cools tension' },
  { id: 'misuse', key: 'misuse', text: 'AI tools spread' },
  { id: 'misuse_capable', key: 'misuse', text: 'Capable AI is easier to misuse' },
  { id: 'misuse_open_models', key: 'misuse', text: 'Open models spread, criminals included' },
  { id: 'economy', key: 'gdp', text: 'AI adoption lifts growth' },
  { id: 'economy', key: 'publicPressure', text: 'Growing public concern about AI' },
  { id: 'economy_jobs', key: 'gdp', text: 'AI adoption lifts growth' },
  { id: 'economy_jobs', key: 'approval', text: 'AI layoffs cost the government support' },
  { id: 'economy_jobs', key: 'publicPressure', text: 'AI layoffs raise public concern' },
  { id: 'labs_report', key: 'apparentAlignment', text: 'Labs report safety progress' },
  { id: 'labs_consolidate', key: 'concentration', text: 'Big labs buy up smaller ones' },
  { id: 'us_chip_controls', key: 'tension', text: 'The US tightens chip controls' },
  { id: 'employment_shock', key: 'approval', text: 'A wave of AI layoffs' },
  { id: 'employment_shock', key: 'publicPressure', text: 'A wave of AI layoffs' },
];

export const ADVISOR: AdvisorCopy[] = [
  { id: 'prepare_risk', text: '{risk} is on the horizon. {card} would leave Europe ready when it comes.' },
  { id: 'risk_imminent', text: '{risk} could hit any time now. {card} is our last chance to be ready.' },
  { id: 'cool_tension', text: 'Washington and Beijing are edging closer to a clash. {card} would cool things before the race speeds up.' },
  { id: 'build_verification', text: 'If AI starts improving itself, someone must be able to check a deal. {card} builds that capacity.' },
  { id: 'see_clearly', text: 'We are judging the AIs by what the labs tell us. {card} would let us check for ourselves.' },
  { id: 'grow_coalition', text: 'Alone, Europe is easy to ignore. {card} gives us a bloc that both sides have to call.' },
  { id: 'protect_people', text: 'Layoffs are spreading and voters are restless. {card} would keep people from falling through the cracks.' },
  { id: 'context_window', text: '{card} is only on the table for a short time, and it fits what we need now.' },
  { id: 'save_resources', text: 'Nothing urgent this quarter. Passing now leaves more for {card} later.' },
  { id: 'alternative', text: 'Alternative: {alt}' },
];
