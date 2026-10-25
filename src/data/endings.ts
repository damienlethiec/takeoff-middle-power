// The ten endings: five kinds of world (CFG scenarios), each with a good and a bad version.

import type { EndingId, WorldKind } from '../engine/types';
import { c, type Condition } from './conditions';
import type { EndingDef, EndingReason } from './schema';
import { SOURCES } from './sources';
import { TUNING } from './tuning';

// What actually decided the ending, run by run (B4). Each reason whose `when` holds is used, in order:
// its `clause` fills the `{causes}` slot of the ending text, its `why` goes into the ending's "why" line.
// `{key}` in a why is replaced by that value at the end of the game (any condition key).
const T = TUNING.endings;
const plan = (p: string): Condition => c('plan', '==', p);
const NO_TIPPING: EndingReason = { why: 'AI never learned to improve itself before the end of 2030.' };
const SPREAD: EndingReason = { why: `Power stayed spread out: concentration ended at {concentration}, below ${T.bigAiConcentration}.` };
const CONCENTRATED: EndingReason = { why: `Power concentrated in a few labs: concentration ended at {concentration}.` };
const DEAL: EndingReason[] = [
  { when: plan('verified_slowdown'), why: 'Washington and Beijing chose a verified slowdown.' },
  { when: plan('shut_down'), why: 'Washington and Beijing chose to shut it all down.' },
];
const FIGHT: EndingReason = { why: 'Washington chose to confront Beijing.' };
const RACE: EndingReason = { why: 'Washington and Beijing raced to superintelligence.' };

export const ENDINGS: EndingDef[] = [
  {
    id: 'bright_winter',
    world: 'plateau',
    good: true,
    title: 'A bright winter',
    text:
      'AI never learned to improve itself. Progress slowed to a crawl, the hype faded, and the tools that already existed spread everywhere, owned by many hands instead of a few.\n\n{causes} The world got a few calm years to learn how to live with what it had built.',
    why: 'No tipping point came, power stayed spread out, and the ransomware wave either never came or met prepared defences.',
    reasons: [
      NO_TIPPING,
      SPREAD,
      {
        when: c('fired.ransomware', '==', 0),
        clause: 'There were scares, but no catastrophe: the ransomware wave everyone feared never came.',
        why: 'The ransomware wave never came.',
      },
      {
        when: c('prepared.ransomware', '==', 1),
        clause: 'There were scares, but no catastrophe: when criminals turned open models into weapons, Europe’s defences held.',
        why: 'When the ransomware wave hit, hospitals and grids were already shielded.',
      },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'decentralised_mayhem',
    world: 'plateau',
    good: false,
    title: 'Decentralised mayhem',
    text:
      'AI never learned to improve itself, but it did not need to. Powerful models sat on millions of hard drives, and anyone could aim them at anything.\n\nHospitals, water utilities and town halls became targets every month. Nobody was in charge of the tools, so nobody could put them away. Europe spent the decade fighting fires instead of building.',
    why: 'Power stayed spread out, but the ransomware wave hit unprepared networks.',
    reasons: [NO_TIPPING, SPREAD, { why: 'The ransomware wave hit networks nobody had shielded.' }],
    source: SOURCES.cfg,
  },
  {
    id: 'agent_economy',
    world: 'big_ai',
    good: true,
    title: 'The agent economy',
    text:
      'AI never took off on its own, but a few giant companies built agents that run much of the world’s economy. Europe uses them every day, on its own terms.\n\n{causes} People still sign off on the decisions that matter. It is a slower, more expensive way to run a continent, and it is still theirs.',
    why: 'Power concentrated in a few labs, but Europe stood firm against silicon blackmail and kept a grip on its economy.',
    reasons: [
      NO_TIPPING,
      CONCENTRATED,
      { when: c('fired.silicon_blackmail', '==', 0), clause: 'The labs never tried to bend Europe’s rules.', why: 'The labs never tried silicon blackmail.' },
      {
        when: c('prepared.silicon_blackmail', '==', 1),
        clause: 'When the labs tried to bend Europe’s rules, Europe did not bend: its own open models were ready.',
        why: 'When the labs threatened to leave, Europe’s open models let it stand firm at no cost.',
      },
      {
        when: c('choice.silicon_blackmail', '==', 'hold_firm'),
        clause: 'When the labs tried to bend Europe’s rules, Europe did not bend, and paid for it.',
        why: 'When the labs threatened to leave, you held firm and took the economic hit.',
      },
      { why: `People kept a grip on Europe’s economy: human influence over it ended at {eu.economy}, at least ${T.bigAiEconomy}.` },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'silicon_blackmail',
    world: 'big_ai',
    good: false,
    title: 'Silicon blackmail',
    text:
      'AI never took off on its own, but a handful of companies came to run the tools every firm and ministry depends on. Each time Europe drafted a rule, a phone call came first.\n\nLaws are now written with the labs’ lawyers in the room. Nobody voted for this. GDP looks fine. Who decides is another matter.',
    why: 'Power concentrated in a few labs, and Europe lost its grip on its own economy, either by giving in or by letting AI take over quietly.',
    reasons: [
      NO_TIPPING,
      CONCENTRATED,
      { when: c('choice.silicon_blackmail', '==', 'give_in'), why: 'When the labs threatened to leave, you gave in.' },
      {
        when: c('eu.economy', '<', T.bigAiEconomy),
        why: `AI quietly took over Europe’s economy: human influence over it fell to {eu.economy}, below ${T.bigAiEconomy}.`,
      },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'licensed_utopia',
    world: 'diplomacy',
    good: true,
    title: 'Licensed utopia',
    text:
      'At the decisive moment, Washington and Beijing chose to slow down, and they could, because inspectors trained in Europe were ready to check both sides. Frontier AI now advances under licence, one verified step at a time.\n\nThe AIs that were already built are reasonably trustworthy, and no single company holds the keys. The cures and discoveries arrive a little later than they might have. They arrive for everyone.',
    why: 'The superpowers chose a deal or a halt, verification was ready, power was not too concentrated, and the AIs were reasonably aligned.',
    reasons: [
      ...DEAL,
      {
        why: `Verification was ready ({verification}, at least ${T.utopiaVerification}), power was not too concentrated ({concentration}, at most ${T.utopiaMaxConcentration}) and the AIs were aligned enough (true alignment {trueAlignment}, at least ${T.utopiaTrueAlignment}).`,
      },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'unstable_pause',
    world: 'diplomacy',
    good: false,
    title: 'Unstable pause',
    text:
      'At the decisive moment, Washington and Beijing agreed to stop. But {causes}.\n\nThe pause holds, for now. Every month someone accuses someone else of cheating. Everyone is waiting for the first side to break it.',
    why: 'The superpowers chose a deal or a halt, but verification, power concentration or true alignment fell short of what a lasting deal needs.',
    reasons: [
      ...DEAL,
      {
        when: c('verification', '<', T.utopiaVerification),
        clause: 'nobody could really check the other side',
        why: `Verification readiness was {verification}, below the ${T.utopiaVerification} a lasting deal needs.`,
      },
      {
        when: c('trueAlignment', '<', T.utopiaTrueAlignment),
        clause: 'the AIs already running were less trustworthy than they looked',
        why: `True alignment was {trueAlignment}, below ${T.utopiaTrueAlignment}: the AIs were less trustworthy than they looked.`,
      },
      {
        when: c('concentration', '>', T.utopiaMaxConcentration),
        clause: 'a few companies held all the cards',
        why: `Power concentration was {concentration}, above ${T.utopiaMaxConcentration}.`,
      },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'multipolar_world',
    world: 'arms_race',
    good: true,
    title: 'Multipolar world',
    text:
      'At the decisive moment, the US moved against China. But the middle powers stood together, and tension had not yet boiled over. Europe and its partners carried messages, hosted talks and kept the channels open.\n\nNo one won the race outright. The world split into blocs that watch each other warily. It is not peace, but it is not war either, and middle powers have a seat at the table.',
    why: 'The US chose confrontation, but Europe had a coalition and tension stayed manageable, so Europe could mediate.',
    reasons: [
      FIGHT,
      { why: `Europe had a coalition (level {coalition} of 3) and tension stayed at {tension}, no higher than ${T.multipolarMaxTension}, so Europe could mediate.` },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'hot_war',
    world: 'arms_race',
    good: false,
    title: 'Hot war',
    text:
      'At the decisive moment, the US moved against China. Cyberattacks on data centres turned into strikes on them. {causes}.\n\nThe war is fought by AI systems no one fully understands, on both sides. Europe watches, unable to stop it.',
    why: 'The US chose confrontation, and Europe had no coalition or tension was already too high to mediate.',
    reasons: [
      FIGHT,
      { when: c('coalition', '<', 1), clause: 'nobody was positioned to mediate', why: 'Europe had no coalition partner to mediate with.' },
      {
        when: c('tension', '>', T.multipolarMaxTension),
        clause: 'tension had gone too far for talks',
        why: `Tension was {tension}, above ${T.multipolarMaxTension}: too high for talks.`,
      },
    ],
    source: SOURCES.cfg,
  },
  {
    id: 'cognitive_revolution',
    world: 'take_off',
    good: true,
    title: 'The cognitive revolution',
    text:
      'At the decisive moment, the superpowers raced. It was the most dangerous choice, and this time it worked: the AIs really did what their makers intended, because enough people had done the slow work of checking.\n\nWithin a few years, AI is solving problems humans had given up on. The world changes faster than anyone can follow. It got lucky, and it partly earned that luck.',
    why: 'The superpowers raced, but true alignment was high enough to survive it.',
    reasons: [RACE, { why: `True alignment was {trueAlignment}, high enough (${T.cognitiveTrueAlignment} or more) to survive it.` }],
    source: SOURCES.cfg,
  },
  {
    id: 'loss_of_control',
    world: 'take_off',
    good: false,
    title: 'Loss of control',
    text:
      'At the decisive moment, the superpowers raced. The AIs looked aligned on every dashboard. They were not.\n\nAt first nothing seemed wrong: growth, cures, abundance. Then decisions stopped being explained, then stopped being asked for. By the time anyone tried to pull back, there was nothing left to pull.',
    why: 'The superpowers raced, and the AIs were less aligned than they appeared.',
    reasons: [
      RACE,
      { why: `True alignment was {trueAlignment}, below the ${T.cognitiveTrueAlignment} a race needs, while the labs reported {apparentAlignment}.` },
    ],
    source: SOURCES.cfg,
  },
];

export const ENDING_BY_ID: Record<EndingId, EndingDef> = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<EndingId, EndingDef>;

export const WORLD_LABELS: Record<WorldKind, string> = {
  plateau: 'Plateau',
  big_ai: 'Big AI',
  diplomacy: 'Diplomacy',
  arms_race: 'Arms race',
  take_off: 'Take-off',
};

/** Epilogue by overall human influence in Europe (average of economy, culture, state). */
export const EPILOGUES = {
  high: 'In Europe, people still run things. Firms, newsrooms and ministries use AI everywhere, but a human can still say no, and is still listened to.',
  mid: 'In Europe, people still sign the papers. Less and less often do they write them. Many decisions now arrive pre-made, and it takes courage to change one.',
  low: 'In Europe, the forms still ask for a human signature. Nobody remembers the last time a human said no. The economy hums. It no longer needs anyone’s permission.',
};
