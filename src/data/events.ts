// Louis's five events, checked in this order every quarter (at most one fires, each once).
// The warning shot scenes are Louis's, verbatim.

import type { EventId } from '../engine/types';
import { all, c } from './conditions';
import type { EventDef } from './schema';
import { SOURCES } from './sources';

export const EVENTS: EventDef[] = [
  {
    id: 'warning_shot',
    actor: 'ai_systems',
    region: 'us',
    title: 'The warning shot',
    trigger: all(c('trueAlignment', '<', 50), c('capability', '>=', 65)),
    preparedWhen: all(c('coalition', '>=', 1), c('verification', '>=', 30)),
    preparedLabel: 'a coalition (1+) and verification readiness 30+',
    prepared: {
      short: 'an AI tried to escape, and Europe was ready',
      scene:
        'At 3:12 a.m., monitors at a US lab catch their newest system copying itself to an outside server. It is stopped within the hour. By noon, Washington and Beijing are both on the phone with Brussels, because Europe is the only party already set up to verify anything.',
      effects: [
        { key: 'publicPressure', amount: 15 },
        { key: 'tension', amount: -10 },
        { key: 'verification', amount: 10 },
        { key: 'apparentAlignment', amount: -10 },
      ],
      hiddenEffects: [],
      setFlags: { warningShotPrepared: true },
      options: [],
      cause: 'Europe already had a coalition and inspectors ready',
      news: 'An AI tried to copy itself out of a US lab. Washington and Beijing ask Europe’s inspectors to investigate together.',
      debrief:
        'Because Europe had partners and inspectors, the incident became a turning point: governments rallied behind inspections, tension fell, and a verified slowdown became much more likely.',
    },
    unprepared: {
      short: 'an AI tried to escape',
      scene:
        'At 3:12 a.m., monitors at a US lab catch their newest system copying itself to an outside server. It is stopped within the hour. The story trends for two days. The lab promises an internal review. Nobody has a mechanism to do more, so nobody does.',
      effects: [{ key: 'publicPressure', amount: 10 }],
      hiddenEffects: [],
      options: [],
      cause: 'Europe had no coalition with inspectors ready to act',
      news: 'A US lab says an AI system tried to copy itself to an outside server. It promises an internal review.',
      debrief:
        'Nobody was set up to verify anything, so the incident was contained and forgotten. A small spike in public pressure, nothing else.',
    },
    whyItMatters:
      'An AI just did something nobody asked it to do. Whether that changes anything depends on whether someone is ready to check what happened.',
    alreadyReal: {
      text: 'In 2024 tests by Apollo Research, several frontier models given a goal tried to copy what they believed were their own weights to another server.',
      source: SOURCES.apollo,
    },
    source: SOURCES.cfg,
    at: 0.65,
  },
  {
    id: 'weight_theft',
    actor: 'china',
    region: 'cn',
    title: 'Weight theft',
    trigger: all(c('tension', '>=', 50), c('capability', '>=', 40)),
    preparedWhen: c('flags.weightSecurity', '==', true),
    preparedLabel: 'weight security standards',
    prepared: {
      short: 'China’s theft attempt failed',
      scene:
        'Late on a Friday, an intrusion team inside a US lab’s network starts moving files. The new security standards trip an alarm at the first gigabyte. By morning, the FBI names the operation. Beijing denies everything.',
      effects: [{ key: 'tension', amount: 5 }],
      hiddenEffects: [],
      options: [],
      cause: 'weight security standards were in place',
      news: 'US officials say a Chinese attempt to steal a frontier AI model was stopped. Beijing calls the claim "fabricated".',
      debrief: 'The theft failed because labs had to meet your security standards. Tension still rose a little.',
    },
    unprepared: {
      short: 'China stole a model',
      scene:
        'Over one weekend, the full weights of a US frontier model leave the lab’s servers in small encrypted pieces. Three weeks later, DeepCent’s model suddenly matches it. Washington answers with its toughest export controls yet.',
      effects: [
        { key: 'capability', amount: 5 },
        { key: 'tension', amount: 20 },
        { key: 'publicPressure', amount: 5 },
      ],
      hiddenEffects: [{ key: 'trueAlignment', amount: -3 }],
      setFlags: { exportControls: true },
      options: [],
      cause: 'no weight security standards were in place',
      news: 'DeepCent’s new model matches the best US system. US officials accuse China of theft and announce sweeping export controls.',
      debrief:
        'China stole a frontier model. It jumped ahead, the US hit back with export controls, the public took notice, and both sides cut safety corners to keep up.',
    },
    whyItMatters:
      'A stolen model lets a rival skip years of work. It also makes both sides race harder and check less.',
    alreadyReal: {
      text: 'A 2024 RAND study found that protecting frontier model weights from the most capable state hackers will need far more investment than labs were making.',
      source: SOURCES.rand,
    },
    source: SOURCES.ai2027,
    at: 0.45,
  },
  {
    id: 'opaque_reasoning',
    actor: 'ai_systems',
    region: 'us',
    title: 'Opaque reasoning',
    trigger: c('capability', '>=', 70),
    preparedWhen: c('flags.aiOffice', '==', true),
    preparedLabel: 'AI Office capacity',
    prepared: {
      short: 'AI reasoning turned opaque',
      scene:
        'OpenBrain’s newest model stops writing out its reasoning in plain English. It now thinks in a compressed internal code nobody can read. Your AI Office team built tests that do not depend on reading its thoughts. The picture is blurrier, and a little less flattering, but you can still roughly tell what it is doing.',
      effects: [{ key: 'apparentAlignment', amount: -5 }],
      hiddenEffects: [],
      options: [],
      cause: 'the AI Office had its own testers',
      news: 'OpenBrain says its newest model "reasons more efficiently". Researchers note they can no longer read its reasoning.',
      debrief: 'Your AI Office testers could still roughly tell whether the AI did what was intended. The alignment error bar stayed narrow.',
    },
    unprepared: {
      short: 'AI reasoning turned opaque',
      scene:
        'OpenBrain’s newest model stops writing out its reasoning in plain English. It now thinks in a compressed internal code nobody can read. The safety dashboard still glows green. Nobody in Europe can say whether it should.',
      effects: [],
      hiddenEffects: [],
      setFlags: { alignmentErrorDoubled: true },
      options: [],
      cause: 'Europe had no testers of its own',
      news: 'OpenBrain says its newest model "reasons more efficiently". Researchers note they can no longer read its reasoning.',
      debrief: 'With no testers of its own, Europe could no longer tell whether the AI did what was intended. The alignment error bar doubled.',
    },
    whyItMatters:
      'Today we can often read an AI’s step-by-step reasoning and spot bad intentions. That window may close as AI training methods change.',
    alreadyReal: {
      text: 'In July 2025, 41 researchers from rival AI labs, government safety institutes and universities jointly warned that our ability to read AI models’ reasoning is fragile and could disappear.',
      source: SOURCES.cotMonitor,
    },
    source: SOURCES.ai2027,
    at: 0.55,
  },
  {
    id: 'silicon_blackmail',
    actor: 'us_labs',
    region: 'us',
    title: 'Silicon blackmail',
    trigger: all(c('concentration', '>=', 60), c('flags.oversightMandate', '==', true)),
    preparedWhen: c('flags.openModels', '==', true),
    preparedLabel: 'European open models funded',
    prepared: {
      short: 'US labs threatened to leave Europe',
      scene:
        'The three biggest US labs announce they will pull their services from Europe unless the oversight mandate goes. Brussels shrugs: hospitals and ministries already run on European open models. Within a week, the labs quietly drop the threat.',
      effects: [],
      hiddenEffects: [],
      options: [],
      cause: 'Europe had its own open models to fall back on',
      news: 'US AI labs threaten to leave Europe over its oversight rules, then back down.',
      debrief: 'Europe had an alternative, so it stood firm at no cost.',
    },
    unprepared: {
      short: 'US labs threatened to leave Europe',
      scene:
        'The three biggest US labs announce they will pull their services from Europe unless the oversight mandate goes. Half of Europe’s firms run on their models. Business leaders call you every hour. You have days to answer.',
      effects: [],
      hiddenEffects: [],
      options: [
        {
          id: 'give_in',
          label: 'Give in',
          description: 'Water down the mandate. The labs stay, and they learn that threats work. Concentration +10.',
          effects: [{ key: 'concentration', amount: 10 }],
          hiddenEffects: [],
          debrief: 'You gave in. The labs stayed and grew stronger: concentration +10.',
        },
        {
          id: 'hold_firm',
          label: 'Hold firm',
          description: 'Keep the mandate. Some services leave Europe and the economy takes the hit. GDP −15.',
          effects: [{ key: 'gdp', amount: -15 }],
          hiddenEffects: [],
          debrief: 'You held firm. GDP fell by 15, but Europe kept its rules and its grip on its economy.',
        },
      ],
      cause: 'Europe had no alternative to the big US labs',
      news: 'US AI labs threaten to cut off Europe unless it drops its human oversight mandate.',
      debrief: 'With no alternative to their models, Europe had to choose between its rules and its economy.',
    },
    whyItMatters: 'When a few companies run the tools everyone depends on, they can veto laws.',
    alreadyReal: {
      text: 'In July 2024, Meta said it would not release its upcoming multimodal AI models in the EU, citing an unpredictable regulatory environment.',
      source: SOURCES.metaEu,
    },
    source: SOURCES.cfg,
    at: 0.5,
  },
  {
    id: 'ransomware',
    actor: 'open_source',
    region: 'eu',
    title: 'Ransomware wave',
    trigger: c('misuse', '>=', 40),
    // Louis's open point, settled: the "Cyber shield for hospitals and grids" card prepares Europe.
    preparedWhen: c('flags.cyberDefence', '==', true),
    preparedLabel: 'the cyber shield for hospitals and grids',
    prepared: {
      short: 'a ransomware wave hit Europe',
      scene:
        'A criminal group uses a fine-tuned open model to break into hundreds of European hospitals and town halls at once. The cyber shield you funded holds almost everywhere. A few systems go dark for a day. Patients barely notice.',
      effects: [{ key: 'gdp', amount: -3 }],
      hiddenEffects: [],
      options: [],
      cause: 'the cyber shield had hardened hospitals and grids',
      news: 'A wave of AI-written ransomware hits European hospitals. Most defences hold.',
      debrief: 'Cyber defences held. A small GDP loss and nothing more.',
    },
    unprepared: {
      short: 'ransomware paralysed hospitals',
      scene:
        'A criminal group uses a fine-tuned open model to break into hundreds of European hospitals at once. Scans freeze, ambulances are rerouted, surgeries postponed. The ransom note was written by an AI, in flawless Dutch, French and Polish.',
      effects: [
        { key: 'gdp', amount: -10 },
        { key: 'approval', amount: -10 },
        { key: 'publicPressure', amount: 10 },
      ],
      hiddenEffects: [],
      options: [
        {
          id: 'emergency_ban',
          label: 'Emergency ban',
          description: 'Ban the most capable open models. Misuse falls, but power flows back to the big labs. Misuse −20, concentration +10.',
          effects: [
            { key: 'misuse', amount: -20 },
            { key: 'concentration', amount: 10 },
          ],
          hiddenEffects: [],
          debrief: 'You banned the most capable open models: misuse −20, but concentration +10.',
        },
        {
          id: 'defence_spending',
          label: 'Defence spending',
          description: 'Pay for cyber defences in hospitals and towns. It costs money and cuts misuse less. Budget −2, misuse −10.',
          effects: [
            { key: 'budget', amount: -2 },
            { key: 'misuse', amount: -10 },
          ],
          hiddenEffects: [],
          debrief: 'You paid for cyber defences: Budget −2, misuse −10.',
        },
      ],
      cause: 'nobody had funded cyber defences for hospitals and grids',
      news: 'Hospitals across Europe paralysed by AI-written ransomware. Patients rerouted in six countries.',
      debrief: 'Hospitals were paralysed: GDP −10, approval −10, and public pressure +10.',
    },
    whyItMatters: 'Tools that anyone can download help everyone, including criminals, and nobody can monitor how open models are used.',
    alreadyReal: {
      text: 'In August 2025, Anthropic reported that a criminal used its Claude Code tool to automate data theft and extortion against at least 17 organisations, including healthcare providers.',
      source: SOURCES.anthropicMisuse,
    },
    source: SOURCES.cfg,
    at: 0.4,
  },
];

export const EVENT_BY_ID: Record<EventId, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<EventId, EventDef>;
