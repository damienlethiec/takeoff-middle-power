// Dana Whitfield, Washington's envoy for AI and chips. Pushes Europe to side with the US:
// usually Confidence or Cohesion up, Cooperation down.

import type { RequestCard } from '../../engine/types';
import { SOURCES } from '../sources';

export const US_ENVOY: RequestCard[] = [
  {
    id: 'us_chip_controls',
    character: 'us_envoy',
    text: 'Washington is tightening chip export controls on China. We want Europe in: no advanced chips or chip tools for Chinese labs. Allies stand together, or they don’t.',
    left: {
      label: 'Keep trading',
      stance: 'refuse',
      set: ['kept_trading'],
      effects: { coop: 3 },
      later: { rounds: 2, effects: { cohesion: -4 }, why: 'US tariffs on European goods' },
      reaction: 'Then don’t be surprised by our next tariff list.',
    },
    right: {
      label: 'Join the controls',
      stance: 'accept',
      effects: { coop: -7, margin: -3 },
      set: ['chip_controls'],
      why: 'Beijing sees Europe pick a side',
      reaction: 'Good. We’ll share more of what our labs show us.',
    },
    when: { maxRound: 6 },
    basis: { kind: 'real', ref: 'US export controls on advanced computing to China (Oct 2022); CFG, Arms race, main scenario (US blocks European chip-tool sales)' },
    learnMore: {
      text: 'Since October 2022, US exporters need a licence to send advanced AI chips and many chip-making tools to China.',
      source: SOURCES.bisChips,
    },
  },
  {
    id: 'us_security_pact',
    character: 'us_envoy',
    text: 'Our newest models are national security now. Your testers can see them only if Europe signs our security pact and keeps quiet about what it sees.',
    left: {
      label: 'Demand open access',
      stance: 'refuse',
      effects: { coop: 2 },
      why: 'Europe stays in the dark',
      reaction: 'Open access? Not while China is two months behind.',
    },
    right: {
      label: 'Sign the pact',
      stance: 'accept',
      effects: { margin: -5, coop: -4, cohesion: -2 },
      why: 'A secret deal, and Beijing sees a bloc',
      reaction: 'Welcome inside the tent.',
    },
    when: { milestone: 'national_security' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "May 2027: National Security" (allies kept in the dark; the UK AISI only sees released models)' },
    learnMore: {
      text: 'In AI 2027, the UK’s AI Security Institute is left “in the dark” about OpenBrain’s newest models, because its agreement only covers released ones.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'us_strike_support',
    character: 'us_envoy',
    text: 'If talks fail, the Pentagon has plans to hit Chinese datacenters. We need to know Europe will back us in public.',
    left: {
      label: 'Refuse publicly',
      stance: 'refuse',
      effects: { coop: 5, cohesion: -2 },
      why: 'Washington shares less with Europe',
      reaction: 'Brussels just told Beijing we’re divided. Thanks.',
    },
    right: {
      label: 'Back Washington',
      stance: 'accept',
      effects: { coop: -10, margin: -4 },
      why: 'Beijing sees Europe back a strike',
      reaction: 'Noted. We’ll keep you closer from now on.',
    },
    when: { milestone: 'geopolitics' },
    basis: { kind: 'ai2027', ref: 'AI 2027, "Aug 2027: The Geopolitics of Superintelligence" (Pentagon plans for kinetic attacks on Chinese datacenters)' },
    learnMore: {
      text: 'In AI 2027, as AI nears superhuman research, the White House weighs “kinetic attacks” on Chinese datacenters if the race turns against it.',
      source: SOURCES.ai2027,
    },
  },
  {
    id: 'us_compute_club',
    character: 'us_envoy',
    text: 'Join our trusted compute club: American chips for Europe’s new AI gigafactories, as long as every one follows US security rules and buys US models.',
    left: {
      label: 'Build our own way',
      stance: 'refuse',
      effects: { cohesion: -3, coop: 1 },
      why: 'Slower and more expensive',
      reaction: 'Good luck building it without our chips.',
    },
    right: {
      label: 'Join the club',
      stance: 'accept',
      effects: { cohesion: 5, ai: 2, coop: -3 },
      badge: 'dependent',
      why: 'Europe runs on US rules and models',
      reaction: 'Smart. The chips ship next month.',
    },
    when: { minRound: 2, maxRound: 8 },
    basis: { kind: 'cfg', ref: 'CFG, Big AI, main scenario (Europe’s sovereign AI push stalls; dependence on US firms)' },
    learnMore: {
      text: 'In February 2025, the European Commission launched InvestAI to mobilise €200 billion for AI, including a €20 billion fund for AI gigafactories.',
      source: SOURCES.investAi,
    },
  },
  {
    id: 'us_licence_treaty',
    character: 'us_envoy',
    text: 'If Beijing accepts inspectors, Washington could accept an international licence for training frontier AI. Will Europe draft the treaty and host its inspectors?',
    left: {
      label: 'Too early for that',
      stance: 'refuse',
      effects: { coop: -4 },
      reaction: 'The window won’t stay open long.',
    },
    right: {
      label: 'Draft the treaty',
      stance: 'accept',
      effects: { coop: 7, cohesion: -3, truth: 3 },
      inspections: 1,
      why: 'Years of costly diplomacy',
      reaction: 'Then let’s make it airtight.',
    },
    when: { minCoop: 50, milestone: 'self_improving' },
    basis: { kind: 'cfg', ref: 'CFG, Diplomacy, Ending A "Licensed utopia" (a global licensing treaty, IAEA-style enforcement)' },
    learnMore: {
      text: 'In CFG’s “Licensed utopia”, the US, the EU, China and dozens of countries sign an AI treaty with a licensing regime, enforced by an expanded IAEA.',
      source: SOURCES.cfg,
    },
  },
  {
    id: 'us_tariffs',
    character: 'us_envoy',
    text: 'You kept selling chip tools to China. Washington has just put tariffs on European cars and machines. Join our export controls now, and they go away.',
    left: {
      label: 'Hold our line',
      stance: 'refuse',
      effects: { cohesion: -3, coop: 2 },
      why: 'The tariffs stay; factories suffer',
      reaction: 'Your carmakers will thank you, I’m sure.',
    },
    right: {
      label: 'Join the controls',
      stance: 'accept',
      effects: { coop: -6, margin: -2 },
      set: ['chip_controls'],
      why: 'Beijing sees Europe give in',
      reaction: 'Smart. The tariffs come off on Monday.',
    },
    when: { flags: ['kept_trading'], notFlags: ['chip_controls'], minRound: 3 },
    followup: true,
    basis: { kind: 'cfg', ref: 'CFG, Arms race, main scenario: the US presses European chip-equipment makers to stop selling to China' },
    learnMore: {
      text: 'Since October 2022, US exporters need a licence to send advanced AI chips and many chip-making tools to China.',
      source: SOURCES.bisChips,
    },
  },
];
