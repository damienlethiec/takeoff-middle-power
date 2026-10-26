// The v3 deck: twelve cards and two opportunities (docs/V3_SPEC.md, "The cards").
// Every card helps something and costs something visible. Numbers come from TUNING.cards; the chips
// on the card face are built from them, so the face and the rules always agree.
// Texts: `text` ≤ 25 words (card face), `proposal` ≤ 60 words (opened card).

import type { Basis, CardId, Chip, Fact, ThreatId } from '../engine/types';
import { ai2027, cfg, real } from './basis';
import { SOURCES } from './sources';
import { TUNING } from './tuning';

const C = TUNING.cards;
const up = (text: string): Chip => ({ text, tone: 'up' });
const down = (text: string): Chip => ({ text, tone: 'down' });
const n = (x: number) => (x > 0 ? `+${x}` : `−${Math.abs(x)}`);

/** When a card first enters the hand. */
export type Arrival =
  | { round: number }
  | { aiPower: number }
  | { threatSeen: ThreatId }
  | { jobShock: number }
  | { opportunity: true };

export interface CardDef {
  id: CardId;
  name: string;
  /** Names of each level, for cards with levels. */
  levels?: string[];
  text: string;
  proposal: string;
  example?: Fact;
  costLine?: Fact;
  ups: Chip[];
  downs: Chip[];
  protects?: ThreatId;
  options?: { id: string; label: string; ups: Chip[] }[];
  arrives: Arrival;
  opportunity?: boolean;
  basis: Basis;
}

export const CARDS: CardDef[] = [
  {
    id: 'talks',
    name: 'Diplomatic talks',
    text: 'Bring US and Chinese envoys to one table in Geneva. Trust rises; at home, some call you soft on rivals.',
    proposal:
      'Europe hosts quiet talks between Washington and Beijing on the risks both fear: AI in military command, stolen models, accidents. No treaty, only channels that stay open. Critics at home say Europe is cosying up to rivals. After each round of talks, the envoys need a round off.',
    example: {
      text: 'In November 2024, Presidents Biden and Xi agreed on “the need to maintain human control over the decision to use nuclear weapons”.',
      source: SOURCES.bidenXi,
    },
    ups: [up(`US–China cooperation ${n(C.talks.cooperation)}`)],
    downs: [down(`Social cohesion ${n(C.talks.cohesion)}`)],
    arrives: { round: TUNING.arrive.talks },
    basis: cfg('Arms race, Ending B (Multipolar world): the EU and neutral states mediate between the superpowers'),
  },
  {
    id: 'inspections',
    name: 'Offer to host inspections',
    levels: ['Offer to host inspections', 'Inspection accord', 'Joint inspectorate'],
    text: 'European inspectors check what the labs build. AI safety rises and your uncertainty narrows; Beijing sees Western pressure.',
    proposal:
      'Europe offers neutral inspectors, trained and paid by the EU, to check frontier models and data centres on both sides. Each level goes further: an offer, then an accord, then a joint inspectorate with access to both labs. The accord, with a coalition, prepares the world for an AI incident.',
    costLine: {
      text: 'The IAEA, which checks nuclear programmes worldwide, spends about €171 million a year on verification (2025).',
      source: SOURCES.iaeaBudget2025,
    },
    ups: [up(`AI safety ${n(C.inspections.estimate)}`), up('AI safety: more certain')],
    downs: [down(`US–China cooperation ${n(C.inspections.cooperation)}`)],
    protects: 'incident',
    arrives: { round: TUNING.arrive.inspections },
    basis: cfg('Diplomacy: verification of a pause, and Licensed utopia’s IAEA-style enforcement'),
  },
  {
    id: 'ai_office',
    name: 'AI Office capacity',
    text: 'Hire top model testers for the EU AI Office. Your AI safety uncertainty halves and inspections get sharper. The money comes from elsewhere.',
    proposal:
      'The EU AI Office already has the power to evaluate general-purpose AI models. This gives it the people: testers paid like lab engineers, with their own computing power. They halve what you don’t know about the labs’ claims, sharpen every inspection, and can still check models whose reasoning turns opaque.',
    example: {
      text: 'Under the AI Act, the European Commission’s AI Office has “the ability to conduct evaluations of GPAI models”.',
      source: SOURCES.aiOffice,
    },
    ups: [up('AI safety: much more certain'), up('Inspections sharper')],
    downs: [down(`Social cohesion ${n(C.ai_office.cohesion)}`)],
    protects: 'opaque',
    arrives: { round: TUNING.arrive.ai_office },
    basis: ai2027('March 2027: Algorithmic Breakthroughs (neuralese makes reasoning unreadable)'),
  },
  {
    id: 'alignment',
    name: 'Fund alignment research',
    text: 'Pay independent teams to make AI systems truly safe. The real gain is larger than the labs’ reports will show.',
    proposal:
      'Europe funds independent alignment teams in universities and institutes, with access to frontier models. Their work makes the systems genuinely safer, but most of it never shows in the labs’ reports, so the reported value moves less than the real one. The money comes out of other budgets.',
    costLine: { text: 'In July 2025, the UK’s AI Security Institute launched a fund of over £15 million for alignment research.', source: SOURCES.aisiAlignment },
    ups: [up(`AI safety ${n(C.alignment.estimate)} shown`), up('Real safety up (not shown)')],
    downs: [down(`Social cohesion ${n(C.alignment.cohesion)}`)],
    arrives: { round: TUNING.arrive.alignment },
    basis: ai2027('Slowdown ending: outside alignment researchers are brought in and build Safer-1'),
  },
  {
    id: 'coalition',
    name: 'Middle-power coalition',
    levels: ['UK and Norway join', 'Canada joins', 'Japan and Korea join'],
    text: 'Team up with the UK, Norway, Canada, Japan and Korea. Allies cool the race; from level 2 they share the load.',
    proposal:
      'Europe builds a small, nimble coalition: the UK and Norway first, then Canada, then Japan and South Korea. Together they speak with one voice in Washington and Beijing. From level 2, allies share the load: +1 Influence every round. Every partner wants something in return, and compromises cost goodwill at home.',
    example: {
      text: 'The Europe 2031 report recommends to “build a small, nimble coalition with countries like Norway, the UK, Canada, Japan and South Korea”.',
      source: SOURCES.europe2031,
    },
    ups: [up(`US–China cooperation ${n(C.coalition.cooperation)}`), up('Level 2: Influence +1 a round')],
    downs: [down(`Social cohesion ${n(C.coalition.cohesion)}`)],
    protects: 'incident',
    arrives: { round: TUNING.arrive.coalition },
    basis: real('Europe 2031, recommendation 2 (coalition of middle powers); CFG, Arms race, Ending B'),
  },
  {
    id: 'audit',
    name: 'Independent audit',
    text: 'Send independent auditors into the labs. For two rounds you see the true AI safety. Nothing else moves.',
    proposal:
      'Europe pays independent auditors to test the labs’ models before release, with full access. For two rounds, your AI safety gauge shows the truth instead of the labs’ reports. It changes nothing by itself: you spend a turn learning where you really stand.',
    example: {
      text: 'In December 2024, the UK and US AI Safety Institutes jointly tested OpenAI’s o1 model before its public release.',
      source: SOURCES.aisiO1,
    },
    ups: [up(`Shows the true AI safety for ${C.audit.rounds} rounds`)],
    downs: [down('No gauge gain')],
    arrives: { round: TUNING.arrive.audit },
    basis: ai2027('May 2027: National Security (outside testers only see what labs deploy)'),
  },
  {
    id: 'asml',
    name: 'Use the ASML lever',
    text: 'Europe makes the lithography machines every AI chip needs. Threaten exports to win a concession. Washington and Beijing both resent it.',
    proposal:
      'Brussels threatens to slow exports of the Dutch lithography machines that every advanced chip depends on. Choose what to ask for: a safety concession from the labs, or access to frontier models for European firms and public services. Washington and Beijing both resent being squeezed.',
    example: {
      text: 'The Europe 2031 report: “The only card Europe still holds is ASML - the one bottleneck the entire AI race runs through.”',
      source: SOURCES.europe2031,
    },
    ups: [up(`AI safety ${n(C.asml.safety.estimate)} or Social cohesion ${n(C.asml.access.cohesion)}`)],
    downs: [down(`US–China cooperation ${n(C.asml.cooperation)}`)],
    options: [
      { id: 'safety', label: 'Safety concession', ups: [up(`AI safety ${n(C.asml.safety.estimate)}`)] },
      { id: 'access', label: 'Model access', ups: [up(`Social cohesion ${n(C.asml.access.cohesion)}`)] },
    ],
    arrives: { aiPower: C.asml.arrivesAt },
    basis: cfg('Arms race: “Control over chips becomes a geopolitical weapon”'),
  },
  {
    id: 'weight_security',
    name: 'Weight security standards',
    text: 'Labs serving Europe must lock down their model weights. Theft gets much harder, but only big labs can afford it.',
    proposal:
      'Any lab that sells advanced AI in Europe must protect its model weights to military standards: vetted staff, sealed data centres, constant monitoring. A theft would most likely fail. Only the biggest labs can pay for this, so Europe ends up relying on them.',
    example: {
      text: 'A 2024 RAND study found that securing model weights against the most capable attackers “will require significantly more investment over the coming years”.',
      source: SOURCES.rand,
    },
    ups: [up('Protects against model theft')],
    downs: [down('Europe’s AI → Dependent'), down(`Social cohesion ${n(C.weight_security.cohesion)}`)],
    protects: 'theft',
    arrives: { threatSeen: 'theft' },
    basis: ai2027('February 2027: China Steals Agent-2'),
  },
  {
    id: 'open_models',
    name: 'Fund open models',
    text: 'Fund open European models anyone can run. Europe’s AI turns Open and local jobs grow, but misuse gets easier.',
    proposal:
      'Europe funds open models that run on European computers, in every European language, for firms and public services. Fewer companies hold the keys, and local jobs grow around them. But criminals get the same tools, and nobody can recall a model once it is out.',
    costLine: { text: 'OpenEuroLLM, an EU project to build open models for all EU languages, has a budget of €37.4 million (2025).', source: SOURCES.openEuroLlm },
    ups: [up('Europe’s AI → Open'), up(`Social cohesion ${n(C.open_models.cohesion)}`)],
    downs: [down(`AI safety ${n(C.open_models.estimate)}`), down('Ransomware threat grows')],
    arrives: { jobShock: 1 },
    basis: cfg('Plateau: “Miniaturisation and openness”; Big AI, Ending A: publicly funded models must be open-weight'),
  },
  {
    id: 'flexicurity',
    name: 'Flexicurity reform',
    text: 'A Danish-style deal: easier hiring, generous support and retraining. Social cohesion rises and job shocks soften; unions push back.',
    proposal:
      'Europe backs a Danish-style labour deal: firms adopt AI more freely, and workers who lose their jobs get generous income support and paid retraining. Job shocks hurt far less. Unions distrust the bargain at first, and it costs you political goodwill for a while.',
    example: {
      text: 'The Europe 2031 report: “A flexicurity model, like the Danish example, allows firms to adopt AI more deeply.”',
      source: SOURCES.europe2031,
    },
    ups: [up(`Social cohesion ${n(C.flexicurity.cohesion)}`), up('Softens job shocks')],
    downs: [down(`Influence ${n(C.flexicurity.influence)} for ${C.flexicurity.rounds} rounds`)],
    protects: undefined,
    arrives: { jobShock: 1 },
    basis: ai2027('Late 2026: AI Takes Some Jobs'),
  },
  {
    id: 'cyber_shield',
    name: 'Cyber shield for hospitals and grids',
    text: 'Harden hospitals, grids and town halls before AI-written attacks arrive. Ransomware bounces off; the bill strains budgets for a while.',
    proposal:
      'Europe funds cyber teams, backups and drills for hospitals, power grids and town halls, and gives ENISA, its cyber agency, powers to step in during an attack. When AI-written ransomware arrives, most of it bounces off. The bill strains national budgets for a while.',
    costLine: {
      text: 'In June 2025, the EU set aside €30 million to protect hospitals and healthcare providers from cyberattacks, ransomware first.',
      source: SOURCES.euCyberHealth,
    },
    ups: [up('Protects against ransomware'), up(`Social cohesion ${n(C.cyber_shield.cohesion)}`)],
    downs: [down(`Influence ${n(C.cyber_shield.influence)} for ${C.cyber_shield.rounds} rounds`)],
    protects: 'ransomware',
    arrives: { threatSeen: 'ransomware' },
    basis: cfg('Plateau, Ending B (Decentralised mayhem): ransomware waves, the EU expands ENISA'),
  },
  {
    id: 'oversight_mandate',
    name: 'Human oversight mandate',
    text: 'A human must sign off on AI decisions in hospitals, courts and grids. People trust it; big labs may threaten to leave.',
    proposal:
      'Europe requires a trained human to approve every important AI decision in hospitals, courts, grids and public services. People trust the result, and AI spreads a little more slowly. If Europe relies on a few big labs, they may threaten to pull out unless the rule goes.',
    example: {
      text: 'The EU AI Act already requires high-risk AI systems to be designed so that “they can be effectively overseen by natural persons”.',
      source: SOURCES.aiActArt14,
    },
    ups: [up(`Social cohesion ${n(C.oversight_mandate.cohesion)}`), up(`AI capabilities ${n(C.oversight_mandate.aiPower)}`)],
    downs: [down('Silicon blackmail threat if Europe’s AI is Dependent')],
    arrives: { round: C.oversight_mandate.arrivesRound },
    basis: cfg('Big AI, Ending B (Silicon blackmail): US firms threaten to withdraw from the EU'),
  },
  {
    id: 'summit',
    name: 'Emergency inspection summit',
    text: 'After the incident, everyone is listening. Call an inspection summit while the shock is fresh.',
    proposal:
      'The AI incident frightened Washington and Beijing alike. Europe’s inspectors were ready, so Europe can call an emergency summit and turn fear into rules: shared incident reports, inspections of the largest training runs. The window closes in two rounds.',
    ups: [up(`US–China cooperation ${n(C.summit.cooperation)}`), up(`AI safety ${n(C.summit.estimate)}`)],
    downs: [down('Only for two rounds')],
    arrives: { opportunity: true },
    opportunity: true,
    basis: cfg('Diplomacy: the “Nova” warning shot leads to an AI security summit and pooled safety funding'),
  },
  {
    id: 'attribution',
    name: 'Joint attribution with allies',
    text: 'Name the thieves together with your partners, calmly and with evidence. Washington feels backed and holds off striking back.',
    proposal:
      'With your coalition partners, Europe publishes a joint, evidence-based attribution of the theft. Washington feels supported and holds off on cyber retaliation; Beijing gets a firm but calm message instead of an attack. The window closes in two rounds.',
    example: {
      text: 'In July 2021, the EU and partners said the Microsoft Exchange hack was “undertaken from the territory of China”.',
      source: SOURCES.euAttribution2021,
    },
    ups: [up(`US–China cooperation ${n(C.attribution.cooperation)}`), up('No US escalation')],
    downs: [down('Only for two rounds')],
    arrives: { opportunity: true },
    opportunity: true,
    basis: ai2027('February 2027: China Steals Agent-2 (the US retaliates; both sides move forces around Taiwan)'),
  },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<CardId, CardDef>;

/** Cost of a card's next use (cards with levels cost more as they climb). */
export function cardCost(id: CardId, usesSoFar: number): number {
  const cost = TUNING.cards[id].cost as number | readonly number[];
  return typeof cost === 'number' ? cost : cost[Math.min(usesSoFar, cost.length - 1)];
}

/** Total uses allowed. */
export function cardUses(id: CardId): number {
  const c = TUNING.cards[id] as { uses?: number };
  return c.uses ?? 1;
}
