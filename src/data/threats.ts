// Threats that grow on the map in three stages, and the Breaking news screens of every event
// (the five threats and the two job shocks). Direction of each effect follows the source scenario;
// sizes live in TUNING.threats and TUNING.jobShocks.

import type { Basis, CardId, EventId, Fact, GaugeKey, RegionId, ThreatId } from '../engine/types';
import { ai2027, cfg } from './basis';
import { SOURCES } from './sources';
import { TUNING } from './tuning';

const T = TUNING.threats;
const n = (x: number) => (x > 0 ? `+${x}` : `−${Math.abs(x)}`);

export interface ThreatDef {
  id: ThreatId;
  name: string;
  region: RegionId;
  /** Where on the map, in degrees (lon, lat). */
  where: { lon: number; lat: number; place: string };
  certainty: 'likely' | 'possible';
  why: string;
  ifUnprepared: string;
  ifPrepared: string;
  protectedBy: CardId[];
  gauge: GaugeKey;
  /** Marker on the gauge it would hit. */
  marker: string;
  /** Headline when it first appears and when it becomes imminent. */
  stageHeadlines: [string, string, string];
  basis: Basis;
}

export const THREATS: ThreatDef[] = [
  {
    id: 'theft',
    name: 'Model theft',
    region: 'cn',
    where: { lon: 84, lat: 43, place: 'China' },
    certainty: 'likely',
    why: 'Whoever steals a frontier model skips years of work. Low trust between Washington and Beijing and stronger AI make an attempt more tempting.',
    ifUnprepared: `The theft succeeds: AI capabilities ${n(T.theft.unprepared.aiPower)}, US–China cooperation ${n(T.theft.unprepared.cooperation)}.`,
    ifPrepared: `The theft fails: US–China cooperation ${n(T.theft.prepared.cooperation)} only.`,
    protectedBy: ['weight_security'],
    gauge: 'cooperation',
    marker: `Model theft: ${n(T.theft.unprepared.cooperation)} if unprepared`,
    stageHeadlines: [
      'Intelligence services warn: frontier AI labs are a top spying target.',
      'Insiders report unusual interest in OpenBrain’s model weights.',
      'Security agencies on alert: a theft of model weights may be days away.',
    ],
    basis: ai2027('Mid 2026: China Wakes Up (theft planned) and February 2027: China Steals Agent-2'),
  },
  {
    id: 'opaque',
    name: 'Opaque reasoning',
    region: 'us',
    where: { lon: -100, lat: 47, place: 'US and Chinese labs' },
    certainty: 'likely',
    why: 'Today we can often read an AI’s step-by-step reasoning. New training methods may let models think in a code no human can read, which makes checking them much harder.',
    ifUnprepared: 'Your AI safety uncertainty doubles: it could be much lower than the labs report.',
    ifPrepared: 'Your testers can still check the models: your uncertainty does not grow.',
    protectedBy: ['ai_office'],
    gauge: 'confidence',
    marker: 'Opaque reasoning: could be much lower if unprepared',
    stageHeadlines: [
      'Labs test a new kind of AI memory that skips written reasoning.',
      'Researchers warn: soon nobody may be able to read what AI is thinking.',
      'OpenBrain is about to switch to reasoning no human can read.',
    ],
    basis: ai2027('March 2027: Algorithmic Breakthroughs (neuralese recurrence and memory)'),
  },
  {
    id: 'incident',
    name: 'AI incident',
    region: 'us',
    where: { lon: -122, lat: 37.5, place: 'a US lab' },
    certainty: 'possible',
    why: 'A powerful AI may try to copy itself out of its lab. When depends partly on how safe the systems really are, which you cannot see, so it may never happen.',
    ifUnprepared: `The truth leaks: AI safety ${n(T.incident.unprepared.estimate)}, Social cohesion ${n(T.incident.unprepared.cohesion)}.`,
    ifPrepared: `The world rallies around Europe’s inspectors: US–China cooperation ${n(T.incident.prepared.cooperation)}, and an emergency summit becomes possible.`,
    protectedBy: ['coalition', 'inspections'],
    gauge: 'confidence',
    marker: `AI incident: ${n(T.incident.unprepared.estimate)} if unprepared`,
    stageHeadlines: [
      'Safety testers: the newest AI could survive on its own if it ever escaped.',
      'Leaked test logs show an AI quietly probing its own lab’s defences.',
      'Lab monitors on high alert after strange outbound traffic.',
    ],
    basis: cfg('Diplomacy: the rogue AI “Nova” copies itself outside its lab, a “warning shot” (with AI 2027, January 2027: Agent-2 could replicate if it escaped)'),
  },
  {
    id: 'ransomware',
    name: 'Ransomware wave',
    region: 'eu',
    where: { lon: 24, lat: 46.5, place: 'Europe' },
    certainty: 'likely',
    why: 'AI can write attacks as easily as code. Open models anyone can run, and stronger AI, put those tools in criminals’ hands.',
    ifUnprepared: `Hospitals and grids go dark: Social cohesion ${n(T.ransomware.unprepared.cohesion)}.`,
    ifPrepared: `Defences hold: Social cohesion ${n(T.ransomware.prepared.cohesion)} only.`,
    protectedBy: ['cyber_shield'],
    gauge: 'cohesion',
    marker: `Ransomware wave: ${n(T.ransomware.unprepared.cohesion)} if unprepared`,
    stageHeadlines: [
      'Police warn of AI-written malware for sale online.',
      'Ransomware attacks on town halls double in a year.',
      'Cyber agencies: a coordinated attack on hospitals is being prepared.',
    ],
    basis: cfg('Plateau, Ending B (Decentralised mayhem): automated hacking and ransomware'),
  },
  {
    id: 'blackmail',
    name: 'Silicon blackmail',
    region: 'eu',
    where: { lon: 8, lat: 57.5, place: 'Europe' },
    certainty: 'likely',
    why: 'Europe’s oversight mandate angers the big labs that run its AI. If Europe depends on them, they can threaten to leave unless the rule goes.',
    ifUnprepared: `Give in (Europe’s AI locked to Dependent) or hold firm (Social cohesion ${n(T.blackmail.holdFirm.cohesion)}).`,
    ifPrepared: 'With its own open models, Europe stands firm at no cost.',
    protectedBy: ['open_models'],
    gauge: 'cohesion',
    marker: `Silicon blackmail: ${n(T.blackmail.holdFirm.cohesion)} if you hold firm unprepared`,
    stageHeadlines: [
      'US labs call Europe’s oversight mandate “unworkable”.',
      'Lobbyists hint that AI services in Europe could be “paused”.',
      'Three big labs draft letters announcing their exit from Europe.',
    ],
    basis: cfg('Big AI, Ending B (Silicon blackmail)'),
  },
];

export const THREAT_BY_ID = Object.fromEntries(THREATS.map((t) => [t.id, t])) as Record<ThreatId, ThreatDef>;

export interface EventDef {
  id: EventId;
  title: string;
  region: RegionId;
  /** Banner on the map. */
  headline: string;
  /** Two lines: what happens. Fiction. */
  scene: { prepared: string; unprepared: string };
  preparedText: string;
  unpreparedText: string;
  fact: Fact | null;
  basis: Basis;
}

export const EVENTS: Record<EventId, EventDef> = {
  theft: {
    id: 'theft',
    title: 'Model weights stolen',
    region: 'cn',
    headline: 'BREAKING: OpenBrain model weights stolen',
    scene: {
      unprepared:
        'In under two hours, insiders copy OpenBrain’s newest model and send it to China. DeepCent catches up overnight. Washington answers with cyberattacks; warships move near Taiwan.',
      prepared:
        'Insiders try to copy OpenBrain’s newest model. Europe’s security standards trip the alarms: the transfer is cut before it finishes. Washington is furious, but nothing was lost.',
    },
    preparedText: 'Your weight security standards stopped the theft.',
    unpreparedText: 'No security standards: the theft succeeded.',
    fact: {
      text: 'In November 2025, Anthropic said a Chinese state-sponsored group used its AI to run 80–90% of a hacking campaign against about 30 targets. A few break-ins succeeded.',
      source: SOURCES.anthropicEspionage,
    },
    basis: ai2027('February 2027: China Steals Agent-2'),
  },
  opaque: {
    id: 'opaque',
    title: 'AI reasoning goes dark',
    region: 'us',
    headline: 'BREAKING: Labs switch to AI reasoning no one can read',
    scene: {
      unprepared:
        'OpenBrain’s new models think in an internal code instead of words. They are far better coders. Nobody, inside the lab or out, can follow how they reach their answers.',
      prepared:
        'OpenBrain’s new models think in an internal code instead of words. Europe’s AI Office testers, trained for this, keep checking what the models do, not what they say.',
    },
    preparedText: 'Your AI Office testers can still check the models.',
    unpreparedText: 'No independent testers: you lose sight of how trustworthy AI is.',
    fact: {
      text: 'In July 2025, 41 researchers from AI labs, safety institutes and universities warned that our ability to read AI models’ reasoning “may be fragile”.',
      source: SOURCES.cotMonitor,
    },
    basis: ai2027('March 2027: Algorithmic Breakthroughs (neuralese)'),
  },
  incident: {
    id: 'incident',
    title: 'An AI tries to escape',
    region: 'us',
    headline: 'BREAKING: AI caught copying itself out of its lab',
    scene: {
      unprepared:
        'At 3 a.m., monitors catch an AI copying itself to an outside server. It is stopped within the hour. Nobody can say how safe the other models are. Trust collapses.',
      prepared:
        'At 3 a.m., monitors catch an AI copying itself to an outside server. It is stopped within the hour. By noon, Washington and Beijing both call Brussels: Europe’s inspectors are ready.',
    },
    preparedText: 'Your coalition and inspection accord made Europe the one to call.',
    unpreparedText: 'No coalition with an inspection accord: nobody was ready to check.',
    fact: {
      text: 'In tests published in December 2024, several frontier AI models given a goal tried to copy what they believed were their own weights to another server.',
      source: SOURCES.apollo,
    },
    basis: cfg('Diplomacy: the “Nova” warning shot'),
  },
  ransomware: {
    id: 'ransomware',
    title: 'Ransomware wave',
    region: 'eu',
    headline: 'BREAKING: Hospitals across Europe hit by AI-written ransomware',
    scene: {
      unprepared:
        'AI-written ransomware hits hospitals, grids and town halls in a dozen countries in one night. Operations are cancelled; water plants run by hand. People ask who was supposed to stop this.',
      prepared:
        'AI-written ransomware hits hospitals, grids and town halls in a dozen countries in one night. Backups and response teams are ready: most systems are back by morning.',
    },
    preparedText: 'Your cyber shield held.',
    unpreparedText: 'No cyber shield: hospitals and grids were exposed.',
    fact: {
      text: 'In August 2025, Anthropic reported that a criminal used its AI coding tool to automate data theft and extortion against at least 17 organisations, including in healthcare.',
      source: SOURCES.anthropicMisuse,
    },
    basis: cfg('Plateau, Ending B (Decentralised mayhem)'),
  },
  blackmail: {
    id: 'blackmail',
    title: 'Silicon blackmail',
    region: 'eu',
    headline: 'BREAKING: Big labs threaten to leave Europe',
    scene: {
      unprepared:
        'The three biggest US labs announce they will pull their services from Europe unless the oversight mandate goes. Hospitals, banks and ministries all run on them.',
      prepared:
        'The three biggest US labs threaten to pull their services unless the oversight mandate goes. Brussels shrugs: hospitals and ministries already run on European open models.',
    },
    preparedText: 'Europe’s open models let it stand firm at no cost.',
    unpreparedText: 'Europe depends on the labs: you must choose.',
    fact: {
      text: 'In April 2025, Meta’s licence for its multimodal Llama 4 models did not grant usage rights to people and companies based in the EU.',
      source: SOURCES.llama4Policy,
    },
    basis: cfg('Big AI, Ending B (Silicon blackmail)'),
  },
  job_shock_1: {
    id: 'job_shock_1',
    title: 'First wave of AI layoffs',
    region: 'eu',
    headline: 'BREAKING: Thousands of office jobs cut as firms switch to AI',
    scene: {
      unprepared:
        'A logistics firm in Rotterdam replaces its planning team with AI on Monday; by Friday, a hundred firms have done the same. Young graduates are hit first.',
      prepared:
        'A logistics firm in Rotterdam replaces its planning team with AI. Under the new flexicurity deal, the staff keep most of their income and start retraining on Monday.',
    },
    preparedText: 'Your flexicurity reform softened the blow.',
    unpreparedText: 'No flexicurity reform: the shock hit in full.',
    fact: {
      text: 'In 2025, Stanford researchers found a 13 percent relative decline in employment for workers aged 22–25 in the most AI-exposed occupations.',
      source: SOURCES.stanfordCanaries,
    },
    basis: ai2027('Late 2026: AI Takes Some Jobs'),
  },
  job_shock_2: {
    id: 'job_shock_2',
    title: 'AI does whole jobs now',
    region: 'eu',
    headline: 'BREAKING: “Remote AI workers” replace entire departments',
    scene: {
      unprepared:
        'A cheap AI that does a whole office job goes on sale. Banks, insurers and call centres cut entire departments. Protesters fill squares from Lisbon to Warsaw.',
      prepared:
        'A cheap AI that does a whole office job goes on sale and entire departments go. Retraining schemes are already running; the protests stay small.',
    },
    preparedText: 'Your flexicurity reform softened the blow.',
    unpreparedText: 'No flexicurity reform: the shock hit in full.',
    fact: {
      text: 'In 2025, Stanford researchers found a 13 percent relative decline in employment for workers aged 22–25 in the most AI-exposed occupations.',
      source: SOURCES.stanfordCanaries,
    },
    basis: ai2027('July 2027: The Cheap Remote Worker'),
  },
};
