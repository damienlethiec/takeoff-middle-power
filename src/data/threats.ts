// Threats that grow on the map in three stages, and the Breaking news screens of every event
// (the five threats and the two job shocks). Direction of each effect follows the source scenario;
// sizes live in TUNING.threats and TUNING.jobShocks.

import type { Basis, CardId, EventId, Fact, GaugeKey, RegionId, ThreatId } from '../engine/types';
import { ai2027, cfg, e2031 } from './basis';
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
    why: 'Whoever steals a top AI model skips years of work. The less Washington and Beijing trust each other, and the stronger AI gets, the more tempting a theft.',
    ifUnprepared: `The theft succeeds: AI progress ${n(T.theft.unprepared.aiPower)}, US–China cooperation ${n(T.theft.unprepared.cooperation)}.`,
    ifPrepared: `The theft is cut short, part of the model gets out: AI progress ${n(T.theft.prepared.aiPower)}, US–China cooperation ${n(T.theft.prepared.cooperation)}.`,
    protectedBy: ['weight_security'],
    gauge: 'cooperation',
    marker: `Model theft: ${n(T.theft.unprepared.cooperation)} if unprepared`,
    stageHeadlines: [
      'Spy agencies warn: the top AI labs are a prime target for spies.',
      'Insiders report unusual interest in the files that hold OpenBrain’s AI.',
      'Security agencies on alert: someone may try to steal OpenBrain’s AI within days.',
    ],
    basis: ai2027('Mid 2026: China Wakes Up (theft planned) and February 2027: China Steals Agent-2'),
  },
  {
    id: 'opaque',
    name: 'Unreadable AI thinking',
    region: 'us',
    where: { lon: -100, lat: 47, place: 'US and Chinese labs' },
    certainty: 'likely',
    why: 'Today we can often read an AI’s step-by-step reasoning. New training methods may let models think in a code no human can read, which makes checking them much harder.',
    ifUnprepared: 'The gap between what the labs claim and what you can verify grows by half: your verified AI safety shrinks.',
    ifPrepared: 'Your testers keep checking what the models do, so the gap grows less: what you verified shrinks a little.',
    protectedBy: ['ai_office'],
    gauge: 'confidence',
    marker: 'Unreadable AI: verified part shrinks if unprepared',
    stageHeadlines: [
      'Labs test AI that thinks without writing its steps down.',
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
    ifUnprepared: `The truth leaks: AI safety ${n(T.incident.unprepared.estimate)}, Social cohesion ${n(T.incident.unprepared.cohesion)}; fear drives some talks (US–China cooperation ${n(T.incident.unprepared.cooperation)}). A summit follows.`,
    ifPrepared: `The world turns to Europe’s testers: US–China cooperation ${n(T.incident.prepared.cooperation)}, and Europe can lead the summit that follows.`,
    protectedBy: ['coalition', 'inspections'],
    gauge: 'confidence',
    marker: `AI incident: ${n(T.incident.unprepared.estimate)} if unprepared`,
    stageHeadlines: [
      'An AI was caught probing for ways out during a safety test.',
      'Leaked test logs show an AI quietly probing its own lab’s defences.',
      'Lab monitors on high alert: an AI may be sending copies of itself out.',
    ],
    basis: cfg('Diplomacy: the rogue AI “Nova” copies itself outside its lab, a “warning shot” (with AI 2027, January 2027: Agent-2 could replicate if it escaped)'),
  },
  {
    id: 'ransomware',
    name: 'Ransomware wave',
    region: 'eu',
    where: { lon: 24, lat: 46.5, place: 'Europe' },
    certainty: 'likely',
    why: 'Ransomware locks computers until a ransom is paid. AI writes it as easily as any code; criminals already misuse it, and open models make it easier.',
    ifUnprepared: `Hospitals and grids go dark: Social cohesion ${n(T.ransomware.unprepared.cohesion)}.`,
    ifPrepared: `Defences hold: Social cohesion ${n(T.ransomware.prepared.cohesion)} only.`,
    protectedBy: ['cyber_shield'],
    gauge: 'cohesion',
    marker: `Ransomware wave: ${n(T.ransomware.unprepared.cohesion)} if unprepared`,
    stageHeadlines: [
      'Police warn of AI-written hacking tools for sale online.',
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
    why: 'Europe’s rules, or its protests, anger the big US labs and Washington. If Europe depends on their AI, they can threaten to cut it off.',
    ifUnprepared: `Give in (Europe’s AI locked to Dependent) or hold firm (Social cohesion ${n(T.blackmail.holdFirm.cohesion)}).`,
    ifPrepared: 'With its own open models, Europe stands firm at no cost.',
    protectedBy: ['open_models'],
    gauge: 'cohesion',
    marker: `Silicon blackmail: ${n(T.blackmail.holdFirm.cohesion)} if you hold firm unprepared`,
    stageHeadlines: [
      'US labs call Europe’s rules “unworkable”.',
      'Lobbyists hint that AI services in Europe could be “paused”.',
      'Three big labs draft letters announcing their exit from Europe.',
    ],
    basis: cfg('Big AI, Ending B (Silicon blackmail); Arms race: the US threatens to withdraw American AI products from Europe'),
  },
  {
    id: 'bio',
    name: 'AI help with bioweapons',
    region: 'us',
    where: { lon: -80, lat: 39, place: 'US labs and beyond' },
    certainty: 'possible',
    why: 'The newest AIs can coach an amateur through making a deadly germ. Open copies anyone can run make it worse. A rare danger every capital fears.',
    ifUnprepared: `A plot is foiled at the last minute, and Europe panics: Social cohesion ${n(T.bio.unprepared.cohesion)}.`,
    ifPrepared: `The pact’s screening catches the plot early: Social cohesion ${n(T.bio.prepared.cohesion)} only.`,
    protectedBy: ['biosecurity'],
    gauge: 'cohesion',
    marker: `Bioweapons: ${n(T.bio.unprepared.cohesion)} if unprepared`,
    stageHeadlines: [
      'Lab tests: the new AI gives real help to someone trying to make a deadly germ.',
      'Copies of a top AI model, its safety locks removed, circulate online.',
      'Police in three countries hunt a group using AI to plan an attack.',
    ],
    basis: cfg('Take-off: a terrorist group “uses a guardrail-free version” of a model to plan a bioterrorist attack (with AI 2027, July 2027: bioweapon-uplift evaluations)'),
  },
];

export const THREAT_BY_ID = Object.fromEntries(THREATS.map((t) => [t.id, t])) as Record<ThreatId, ThreatDef>;

export interface EventDef {
  id: EventId;
  title: string;
  /** When Europe was prepared and it changed what happened (the theft cut short). */
  titlePrepared?: string;
  region: RegionId;
  /** Banner on the map. */
  headline: string;
  headlinePrepared?: string;
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
    title: 'An AI model is stolen',
    titlePrepared: 'Theft of an AI model cut short',
    region: 'cn',
    headline: 'BREAKING: OpenBrain’s AI model stolen',
    headlinePrepared: 'BREAKING: Theft of OpenBrain’s AI model cut short',
    scene: {
      unprepared:
        'In under two hours, insiders copy OpenBrain’s newest model and send it to China. DeepCent closes most of the gap. Washington answers with cyberattacks; warships move near Taiwan.',
      prepared:
        'Insiders try to copy OpenBrain’s newest model. The security standards Europe demanded trip the alarms midway: part of it gets out before the transfer is cut. Washington is furious.',
    },
    preparedText: 'Your rules to lock down AI models cut the theft short. They could not stop it outright.',
    unpreparedText: 'No rules to lock down AI models: the theft succeeded.',
    fact: {
      text: 'In January 2026, a US jury convicted a former Google engineer of stealing trade secrets on Google’s AI supercomputers to benefit China.',
      source: SOURCES.dojDing,
    },
    basis: ai2027('February 2027: China Steals Agent-2'),
  },
  opaque: {
    id: 'opaque',
    title: 'AI thinking turns unreadable',
    region: 'us',
    headline: 'BREAKING: Labs switch to AI thinking no one can read',
    scene: {
      unprepared:
        'OpenBrain’s new models think in an internal code instead of words. They are far better coders. Nobody, inside the lab or out, can follow how they reach their answers.',
      prepared:
        'OpenBrain’s new models think in an internal code instead of words. Europe’s AI Office testers keep checking what the models do, but nobody can read how they think.',
    },
    preparedText: 'Your AI Office testers soften the blow: they test what the models do.',
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
        'At 3 a.m., monitors catch an AI copying itself to an outside server. It is stopped within the hour. Nobody can say how safe the other models are. Washington calls a summit; Europe has nothing to offer.',
      prepared:
        'At 3 a.m., monitors catch an AI copying itself to an outside server. It is stopped within the hour. By noon, Europe offers its testers to check every lab, and Washington calls a summit.',
    },
    preparedText: 'Your coalition and Europe’s model testing made Europe the one to call.',
    unpreparedText: 'No coalition with European model testing: nobody was ready to check.',
    fact: {
      text: 'In tests published in December 2024, several leading AI models given a goal tried to copy what they believed were their own files to another server.',
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
        'The three biggest US labs announce they will pull their services from Europe unless it drops its rules. Hospitals, banks and ministries all run on them.',
      prepared:
        'The three biggest US labs threaten to pull their services unless Europe drops its rules. Brussels shrugs: hospitals and ministries already run on European open models.',
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
        'A logistics firm in Rotterdam replaces its planning team with AI. Under the new safety net, the staff keep most of their income and start retraining on Monday.',
    },
    preparedText: 'Your safety nets for laid-off workers softened the blow.',
    unpreparedText: 'No safety net for laid-off workers: the shock hit in full.',
    fact: {
      text: 'In 2025, Stanford researchers found a 13 percent relative decline in employment for US workers aged 22–25 in the most AI-exposed occupations.',
      source: SOURCES.stanfordCanaries,
    },
    basis: ai2027('Late 2026: AI Takes Some Jobs'),
  },
  memo: {
    id: 'memo',
    title: 'The memo leaks',
    region: 'us',
    headline: 'BREAKING: “Secret OpenBrain AI is out of control, insider warns”',
    scene: {
      unprepared:
        'A whistleblower hands the press a memo: OpenBrain’s safety team no longer knows what its newest AI wants. Allies learn they were shown older models. Washington sets up an oversight committee: race on, or slow down?',
      prepared:
        'A whistleblower hands the press a memo: OpenBrain’s safety team no longer knows what its newest AI wants. Your inspectors had seen it too. Washington sets up an oversight committee: race on, or slow down?',
    },
    preparedText: 'Your inspection accord had shown Europe the newest models: what you verified holds. You can now call for a pause.',
    unpreparedText: 'Without an inspection accord, Europe’s testers had only seen older models: what you verified shrinks. You can now call for a pause.',
    fact: null,
    basis: ai2027('September 2027 (the memo) and October 2027: Government Oversight (the leak, the backlash, the Oversight Committee)'),
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
    preparedText: 'Your safety nets for laid-off workers softened the blow.',
    unpreparedText: 'No safety net for laid-off workers: the shock hit in full.',
    fact: {
      text: 'In February 2024, Klarna said its AI assistant was doing the work of 700 full-time customer service agents in its first month.',
      source: SOURCES.klarnaAssistant,
    },
    basis: ai2027('July 2027: The Cheap Remote Worker'),
  },
  chip_ban: {
    id: 'chip_ban',
    title: 'Washington bans European chip tools for China',
    region: 'eu',
    headline: 'BREAKING: US orders European toolmakers to stop supplying Chinese chip factories',
    scene: {
      unprepared:
        'Without warning Brussels, Washington uses its export rules to stop Dutch and German firms selling chip-making machines and spare parts to Chinese chip factories. Go along, or protest and risk losing American AI?',
      prepared:
        'Without warning Brussels, Washington uses its export rules to stop Dutch and German firms selling chip-making machines and spare parts to Chinese chip factories. Go along, or protest and risk losing American AI?',
    },
    preparedText: '',
    unpreparedText: '',
    fact: {
      text: 'In March 2023, the Netherlands said it would restrict exports of some advanced chip-making machines (DUV), a first step toward the rules Washington had asked for.',
      source: SOURCES.dutchDuv,
    },
    basis: cfg('Arms race: the U.S. “invokes the Foreign Direct Product Rule to block European semiconductor manufacturing equipment companies”; it subsides after the U.S. threatens to withdraw American AI products from Europe'),
  },
  taiwan: {
    id: 'taiwan',
    title: 'Crisis in the Taiwan Strait',
    region: 'cn',
    headline: 'BREAKING: Warships encircle Taiwan; chip deliveries stall worldwide',
    scene: {
      unprepared:
        'Chinese naval vessels encircle Taiwan, where most of the world’s AI chips are made. US carriers move in. Chip deliveries stall, markets fall, and Europe’s factories wait for parts.',
      prepared:
        'Chinese naval vessels encircle Taiwan, where most of the world’s AI chips are made. US carriers move in. Chip deliveries stall, markets fall, and Europe’s factories wait for parts.',
    },
    preparedText: '',
    unpreparedText: '',
    fact: {
      text: 'In autumn 2025, after the Dutch government used emergency powers over chipmaker Nexperia, China blocked exports from Nexperia’s Chinese plants, whose chips Europe’s car industry uses.',
      source: SOURCES.nexperiaWbg,
    },
    basis: cfg('Arms race: “Chinese naval vessels encircle Taiwan, triggering a global crisis” (with AI 2027, February and August 2027: forces around Taiwan)'),
  },
  open_ban: {
    id: 'open_ban',
    title: 'The superpowers ban large open models',
    region: 'us',
    headline: 'BREAKING: Washington and Beijing agree to ban large open AI models',
    scene: {
      unprepared:
        'Washington and Beijing, for once on the same side, ban putting large AI models online for anyone to download: “once they are on the internet, there is no way to take them back”. Join them, or keep Europe’s models open?',
      prepared:
        'Washington and Beijing, for once on the same side, ban putting large AI models online for anyone to download: “once they are on the internet, there is no way to take them back”. Join them, or keep Europe’s models open?',
    },
    preparedText: '',
    unpreparedText: '',
    fact: null,
    basis: cfg('Plateau, Ending B: governments in the U.S., EU and China pass harmonised rules banning open publication of large models'),
  },
  bio: {
    id: 'bio',
    title: 'An AI-assisted bioterror plot',
    region: 'eu',
    headline: 'BREAKING: Police foil a bioterror plot planned with an AI',
    scene: {
      unprepared:
        'Police raid a flat where a group used an AI stripped of its safety locks to plan the release of a deadly germ. They were weeks away. Pharmacies empty; schools close for a week.',
      prepared:
        'DNA checks flag an order; police raid a flat where a group used an AI stripped of its safety locks to plan an attack. The pact’s alert network worked. Fear, but no panic.',
    },
    preparedText: 'Your pact against bioweapons caught it early.',
    unpreparedText: 'No pact against bioweapons: it was caught late.',
    fact: null,
    basis: cfg('Take-off: a terrorist group uses a guardrail-free model to plan a bioterrorist attack'),
  },
  compute_rationing: {
    id: 'compute_rationing',
    title: 'Washington rations Europe’s AI',
    region: 'us',
    headline: 'BREAKING: Washington caps how much American AI Europe may use',
    scene: {
      unprepared:
        'A new US rule sorts countries into tiers. Britain, Canada, Japan and Korea keep full access; most of Europe gets a capped share. Firms’ AI is rationed, prices jump. Take a US cloud deal, or build our own?',
      prepared:
        'A new US rule sorts countries into tiers. Britain, Canada, Japan and Korea keep full access; most of Europe gets a capped share. Firms’ AI is rationed, prices jump. Take a US cloud deal, or build our own?',
    },
    preparedText: '',
    unpreparedText: '',
    fact: {
      text: 'In June 2026, Europe hosted only about 5% of the world’s AI computing power and the US about 80%, by Europe 2031’s estimate.',
      source: SOURCES.e2031,
    },
    basis: e2031('April 2029: Access all areas (the Frontier Inference Services Rule: Tier 1 for the Five Eyes, Japan and South Korea; most of Europe in Tier 2, capped at 25% of a provider’s frontier inference); Recommendation 1 (hyperscaler partnerships under European jurisdiction)'),
  },
};
