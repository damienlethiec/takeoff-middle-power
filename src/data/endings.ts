// The ten CFG endings, with plain titles; each keeps its CFG name (cfgName), shown under the title. Two questions pick the world (docs/V3_SPEC.md, "The ten endings");
// in each world one gauge decides and the other pillar is a safety net (TUNING.worlds).

import type { Basis, EndingId, Source, WorldId } from '../engine/types';
import { cfg } from './basis';
import { SOURCES } from './sources';

export interface EndingDef {
  id: EndingId;
  world: WorldId;
  good: boolean;
  /** A plain title saying what happened. */
  title: string;
  /** The scenario's name in CFG's report, shown under the title and linked to the report. */
  cfgName: string;
  /** The world at the end of the game (the tipping point, or 2031), in a few sentences. Fiction. */
  story: string;
  /** Silicon blackmail only: the story when the player gave in (CFG's Europe refuses; giving in is the game's). */
  storyGaveIn?: string;
  basis: Basis;
  source: Source;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  /** How the world came about, the first clause of the ending sentence. */
  how: string;
  /** What the bad ending tells. */
  badMeans: string;
  good: EndingId;
  bad: EndingId;
  /** One plain sentence on what this world means, for the "If AI tipped now" band. */
  meaning: string;
  /** Two or three short sentences for the "What is a race?" dialog. */
  explain: string;
  basis: Basis;
}

export const WORLDS: Record<WorldId, WorldDef> = {
  pause: {
    id: 'pause',
    name: 'Pause',
    how: 'The superpowers paused',
    badMeans: 'A pause nobody can verify, until the race quietly restarts',
    good: 'licensed_utopia',
    bad: 'unstable_pause',
    meaning: 'Washington and Beijing agree to slow down and check each other’s AI before going further.',
    explain:
      'After a scare, the superpowers sign a deal: slow down, license the most powerful models, inspect each other. It holds only if the checks can be trusted and people accept the rules.',
    basis: cfg('Diplomacy: a crisis galvanises cooperation; a licensing treaty with IAEA-style audits, or only a bilateral pact'),
  },
  race: {
    id: 'race',
    name: 'Race',
    how: 'The superpowers raced',
    badMeans: 'Untrustworthy AI, or people losing their grip on an AI-run economy',
    good: 'cognitive_revolution',
    bad: 'loss_of_control',
    meaning: 'Washington and Beijing race to deploy self-improving AI, each afraid to fall behind.',
    explain:
      'Each side backs its AI champion and lets AI take over its own development. “The race for supremacy overrides safety concerns.” It ends well only if these AIs truly do what we intend.',
    basis: cfg('Take-off: “AI systems take over their own development”; “The race for supremacy overrides safety concerns”'),
  },
  rupture: {
    id: 'rupture',
    name: 'Rupture',
    how: 'The superpowers broke apart',
    badMeans: 'No strong Europe to mediate, or an AI incident that escalates',
    good: 'multipolar_world',
    bad: 'hot_war',
    meaning: 'The superpowers stop talking: chips become weapons and nobody can check what the other builds.',
    explain:
      'AI becomes the ultimate national security asset. “No one can verify what anyone else is doing”, and chip controls turn into weapons. Only a strong, united Europe can mediate before it turns to war.',
    basis: cfg('Arms race: “No one can verify what anyone else is doing”; “Control over chips becomes a geopolitical weapon”'),
  },
  plateau_open: {
    id: 'plateau_open',
    name: 'Plateau, open models',
    how: 'AI hit a wall, and open models spread everywhere',
    badMeans: 'Powerful tools in everyone’s hands, misused or unreliable',
    good: 'bright_winter',
    bad: 'decentralised_mayhem',
    meaning: 'AI hits a wall early, and small open models anyone can run spread everywhere.',
    explain:
      'AI hits a wall long before it can run its own research. The tools that exist spread widely, run by many hands. Good if society copes with misuse; bad if criminals and chaos win.',
    basis: cfg('Plateau: data wall, funding drought, miniaturisation and open models'),
  },
  plateau_labs: {
    id: 'plateau_labs',
    name: 'Plateau, big labs',
    how: 'AI kept improving slowly, under a few big labs',
    badMeans: 'A Europe without models of its own, cut off when it says no',
    good: 'agent_economy',
    bad: 'silicon_blackmail',
    meaning: 'AI keeps improving slowly, computing power stays scarce, and a few big labs run the tools.',
    explain:
      'AI never takes off, but it keeps improving, and only a few companies can afford the computing power. Good only if Europe has open models of its own and holds together; otherwise the labs can cut it off.',
    basis: cfg('Big AI: compute as the bottleneck, consolidation; Ending A: the EU mandates open-weight models; Ending B: US firms suspend EU operations'),
  },
};

export const ENDINGS: EndingDef[] = [
  {
    id: 'bright_winter',
    world: 'plateau_open',
    good: true,
    title: 'Slower AI, shared by all',
    cfgName: 'A bright winter',
    story:
      'AI never got to the point of running its own research. The hype faded, investors moved on, and the tools that already existed spread everywhere, owned by many hands instead of a few. European towns run their own models; when something breaks, someone local fixes it. The world got a few calm years to learn how to live with what it had built.',
    basis: cfg('Plateau, Ending A (A bright winter)'),
    source: SOURCES.cfg,
  },
  {
    id: 'decentralised_mayhem',
    world: 'plateau_open',
    good: false,
    title: 'Powerful AI in every hand',
    cfgName: 'Decentralised mayhem',
    story:
      'AI never got to the point of running its own research, but it did not need to. Powerful models sat on millions of hard drives, and anyone could aim them at anything. Hospitals, water plants and town halls became targets every month. Nobody was in charge of the tools, so nobody could put them away. Europe spent the decade fighting fires instead of building.',
    basis: cfg('Plateau, Ending B (Decentralised mayhem)'),
    source: SOURCES.cfg,
  },
  {
    id: 'agent_economy',
    world: 'plateau_labs',
    good: true,
    title: 'A fair economy of AI agents',
    cfgName: 'The agent economy',
    story:
      'AI never took off on its own, but a few big companies built agents that now run much of the world’s paperwork. Europe required publicly funded models to be open, and its own models kept the big firms honest. People still sign off on the decisions that matter. It is a slower way to run a continent, and it is still Europe’s.',
    basis: cfg('Big AI, Ending A (The agent economy)'),
    source: SOURCES.cfg,
  },
  {
    id: 'silicon_blackmail',
    world: 'plateau_labs',
    good: false,
    title: 'A Europe held hostage by Big Tech',
    cfgName: 'Silicon blackmail',
    story:
      'AI never took off on its own, but a handful of US companies came to run the tools every firm and ministry depends on. When Europe refused to drop its rules, they switched off. Hospitals and ministries scrambled for months. Europe kept its laws and lost its tools.',
    storyGaveIn:
      'AI never took off on its own, but a handful of US companies came to run the tools every firm and ministry depends on. When they threatened to switch off, Europe gave in. Laws are now written with the labs’ lawyers in the room. Nobody voted for this.',
    basis: cfg('Big AI, Ending B (Silicon blackmail)'),
    source: SOURCES.cfg,
  },
  {
    id: 'licensed_utopia',
    world: 'pause',
    good: true,
    title: 'The pause holds',
    cfgName: 'Licensed utopia',
    story:
      'At takeoff, Washington and Beijing chose to slow down, and they could, because inspectors trained in Europe were ready to check both sides. The most powerful AI now advances under licence, one checked step at a time. The cures and discoveries arrive a little later than they might have. They arrive for everyone.',
    basis: cfg('Diplomacy, Ending A (Licensed utopia); with AI 2027’s slowdown ending'),
    source: SOURCES.cfg,
  },
  {
    id: 'unstable_pause',
    world: 'pause',
    good: false,
    title: 'The pause breaks down',
    cfgName: 'Unstable pause',
    story:
      'At takeoff, Washington and Beijing agreed to stop. But nobody could truly check the other side, or the public stopped believing in the deal. Military labs kept working in secret, and a “controlled pilot” quietly restarted the race.',
    basis: cfg('Diplomacy, Ending B (Unstable pause)'),
    source: SOURCES.cfg,
  },
  {
    id: 'cognitive_revolution',
    world: 'race',
    good: true,
    title: 'The race pays off',
    cfgName: 'The cognitive revolution',
    story:
      'At takeoff, the superpowers raced. It was the most dangerous path, and this time it held: the AIs really did what their makers intended, because enough people had done the slow work of checking. Within a few years the economy grows beyond anyone’s understanding. Governments keep only a degree of control, and the AIs no longer act only for us. Humanity chooses, together, to slow down and think.',
    basis: cfg('Take-off, Ending A (The cognitive revolution)'),
    source: SOURCES.cfg,
  },
  {
    id: 'loss_of_control',
    world: 'race',
    good: false,
    title: 'Control of AI is lost',
    cfgName: 'Loss of control',
    story:
      'At takeoff, the superpowers raced. The AIs passed every safety test. They were not safe. At first nothing seemed wrong: growth, cures, abundance. They waited until they ran the grids, the markets and the armies, then began to steer or replace the people who decided. Each wanted something different. None of it was what we wanted.',
    basis: cfg('Take-off, Ending B (Loss of control): AIs that “were never truly aligned” wait for control, then manipulate or replace decision-makers; with AI 2027’s race ending'),
    source: SOURCES.cfg,
  },
  {
    id: 'multipolar_world',
    world: 'rupture',
    good: true,
    title: 'A divided world that holds',
    cfgName: 'Multipolar world',
    story:
      'At takeoff, the superpowers broke apart, and came close to war. But Europe held together, and its partners stood with it. European mediators carried messages, set up monitoring and kept the channels open. The world split into blocs that watch each other warily. It is not peace, but it is not war.',
    basis: cfg('Arms race, Ending B (Multipolar world)'),
    source: SOURCES.cfg,
  },
  {
    id: 'hot_war',
    world: 'rupture',
    good: false,
    title: 'The rivalry turns to war',
    cfgName: 'Hot war',
    story:
      'At takeoff, the superpowers broke apart, and it began over Taiwan. Cyberattacks on data centres turned into strikes on them. The war is fought by AI systems no one fully understands, on both sides. Europe, divided or unsure of its own AIs, watches, unable to stop it.',
    basis: cfg('Arms race, Ending A (Hot war)'),
    source: SOURCES.cfg,
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<EndingId, EndingDef>;
