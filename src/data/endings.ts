// The ten endings: five kinds of world (CFG scenarios), each with a good and a bad version.

import type { EndingId, WorldKind } from '../engine/types';
import { c } from './conditions';
import type { EndingDef } from './schema';
import { TUNING } from './tuning';

const E = TUNING.endings;
import { SOURCES } from './sources';

export const ENDINGS: EndingDef[] = [
  {
    id: 'bright_winter',
    world: 'plateau',
    good: true,
    title: 'A bright winter',
    text:
      'AI never learned to improve itself. Progress slowed to a crawl, the hype faded, and the tools that already existed spread everywhere, owned by many hands instead of a few.\n\n{cause} The world got a few calm years to learn how to live with what it had built.',
    causes: [
      { when: c('fired.ransomware', '==', 1), text: 'There were scares, but no catastrophe: when criminals turned open models into weapons, Europe’s defences held.' },
      { when: c('fired.ransomware', '==', 0), text: 'There were scares, but criminals never managed a wave of attacks Europe could not absorb.' },
    ],
    why: 'No tipping point came, power stayed spread out, and the ransomware wave either never came or met prepared defences.',
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
    source: SOURCES.cfg,
  },
  {
    id: 'agent_economy',
    world: 'big_ai',
    good: true,
    title: 'The agent economy',
    text:
      'AI never took off on its own, but a few giant companies built agents that run much of the world’s economy. Europe uses them every day, on its own terms.\n\n{cause} People still sign off on the decisions that matter. It is a slower, more expensive way to run a continent, and it is still theirs.',
    causes: [
      { when: c('fired.silicon_blackmail', '==', 1), text: 'When the labs tried to bend Europe’s rules, Europe did not bend.' },
      { when: c('fired.silicon_blackmail', '==', 0), text: 'The labs grumbled about Europe’s rules but never dared to threaten it.' },
    ],
    why: 'Power concentrated in a few labs, but Europe stood firm against silicon blackmail and kept a grip on its economy.',
    source: SOURCES.cfg,
  },
  {
    id: 'silicon_blackmail',
    world: 'big_ai',
    good: false,
    title: 'Silicon blackmail',
    text:
      'AI never took off on its own, but a handful of companies came to run the tools every firm and ministry depends on. {cause}\n\nLaws are now written with the labs’ lawyers in the room. Nobody voted for this. GDP looks fine. Who decides is another matter.',
    causes: [
      { when: c('choice.silicon_blackmail', '==', 'give_in'), text: 'When the labs threatened to leave, Europe gave in, and they learned that threats work.' },
      { when: c('eu.economy', '<', E.bigAiEconomy), text: 'Quietly, firm by firm, AI took over the decisions people used to make in Europe’s economy.' },
    ],
    why: 'Power concentrated in a few labs, and Europe lost its grip on its own economy.',
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
    source: SOURCES.cfg,
  },
  {
    id: 'unstable_pause',
    world: 'diplomacy',
    good: false,
    title: 'Unstable pause',
    text:
      'At the decisive moment, Washington and Beijing agreed to stop. {cause}\n\nThe pause holds, for now. Every month someone accuses someone else of cheating. Everyone is waiting for the first side to break it.',
    causes: [
      { when: c('verification', '<', E.utopiaVerification), text: 'But nobody was ready to check the other side.' },
      { when: c('trueAlignment', '<', E.utopiaTrueAlignment), text: 'But the AIs already running were less trustworthy than they looked.' },
      { when: c('concentration', '>', E.utopiaMaxConcentration), text: 'But a few companies held all the cards.' },
    ],
    why: 'The superpowers chose a deal or a halt, but what a lasting deal needs fell short.',
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
    source: SOURCES.cfg,
  },
  {
    id: 'hot_war',
    world: 'arms_race',
    good: false,
    title: 'Hot war',
    text:
      'At the decisive moment, the US moved against China. Cyberattacks on data centres turned into strikes on them. {cause}\n\nThe war is fought by AI systems no one fully understands, on both sides. Europe watches, unable to stop it.',
    causes: [
      { when: c('coalition', '<', 1), text: 'Europe stood alone, with no partners to carry messages between the two.' },
      { when: c('tension', '>', E.multipolarMaxTension), text: 'Tension had gone too far for talks.' },
    ],
    why: 'The US chose confrontation, and Europe could not mediate.',
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
