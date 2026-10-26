// The deck: fifteen cards and three opportunities (docs/V3_SPEC.md, "The cards"; the content rewrite of 26 Oct in
// docs/V4_BUILD_NOTES.md). Europe's policies act on Europe's ground: its AI Office, its compute, its market, its money,
// and mediation once the superpowers ask; never directly on the hidden alignment of US or Chinese models.
// Every card helps something and costs something visible. Numbers come from TUNING.cards; the chips
// on the card face are built from them, so the face and the rules always agree.
// Texts: `text` ≤ 25 words (card face), `proposal` ≤ 60 words (opened card).

import type { Basis, CardId, Chip, Fact, MilestoneId, ThreatId } from '../engine/types';
import { ai2027, cfg, game, real } from './basis';
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
  | { milestone: MilestoneId }
  /** once US–China cooperation is in the Pause zone and a deal has been tested (the summit, or the inspection accord) */
  | { pauseDeal: true }
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
    text: 'Bring US and Chinese envoys to one table in Geneva. Trust rises a little; at home, some call you soft on rivals.',
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
    name: 'Push for inspections',
    levels: ['Test the labs’ models in Europe', 'Inspection accord', 'Joint inspectorate'],
    text: 'European inspectors test the labs’ models. What you can verify grows; Washington and Beijing resist letting foreigners in.',
    proposal:
      'First, the AI Office tests every frontier model sold in Europe. Then, only once a crisis or a pause makes the superpowers willing, an accord lets European inspectors into their labs, and finally a joint inspectorate. Verification is what makes a deal possible; each step costs diplomatic capital. With a coalition, testing prepares the world for an AI incident.',
    costLine: {
      text: 'The IAEA, which checks nuclear programmes worldwide, spends about €171 million a year on verification (2025).',
      source: SOURCES.iaeaBudget2025,
    },
    ups: [up('AI safety: more verified'), up(`Accord: US–China cooperation ${n(C.inspections.cooperation[1])}`), up('Accord: real safety up (not shown)')],
    downs: [down('Accord: only after a crisis or in a pause'), down(`Accord: Influence ${n(C.inspections.influence)} next round`)],
    protects: 'incident',
    arrives: { round: TUNING.arrive.inspections },
    basis: cfg('Diplomacy: “without verification any deal would be meaningless”; Licensed utopia’s IAEA-style enforcement'),
  },
  {
    id: 'ai_office',
    name: 'AI Office capacity',
    text: 'Hire top model testers for the EU AI Office. Your AI safety uncertainty halves; opaque reasoning hurts less. The money comes from elsewhere.',
    proposal:
      'The EU AI Office already has the power to evaluate general-purpose AI models. This gives it the people: testers paid like lab engineers, with their own computing power. They halve what you don’t know about the labs’ claims and sharpen every inspection. If models start reasoning in a code no one can read, they keep testing what the models do.',
    example: {
      text: 'Under the AI Act, the European Commission’s AI Office has “the ability to conduct evaluations of GPAI models”.',
      source: SOURCES.aiOffice,
    },
    ups: [up('AI safety: much more verified'), up('Inspections sharper')],
    downs: [down(`Social cohesion ${n(C.ai_office.cohesion)}`)],
    protects: 'opaque',
    arrives: { round: TUNING.arrive.ai_office },
    basis: real('aiOffice: the AI Office’s evaluation powers (with AI 2027, March 2027: neuralese makes reasoning unreadable)'),
  },
  {
    id: 'alignment',
    name: 'Fund alignment research',
    text: 'Pay independent teams to work on making AI safe. The labs adopt little of it unless inspectors give your teams access.',
    proposal:
      'Europe funds independent alignment teams in universities and institutes. Their papers are public, but the labs that build frontier AI take up little of it on their own. Once an inspection accord opens the labs to European teams, their work counts for far more. Most of it never shows in the labs’ reports. The money comes out of other budgets.',
    costLine: { text: 'In July 2025, the UK’s AI Security Institute launched a fund of over £15 million for alignment research.', source: SOURCES.aisiAlignment },
    ups: [up(`AI safety ${n(C.alignment.estimate)} shown`), up('Real safety up (not shown), more with an accord')],
    downs: [down(`Social cohesion ${n(C.alignment.cohesion)}`)],
    arrives: { round: TUNING.arrive.alignment },
    basis: ai2027('Slowdown ending: “several dozen” outside alignment researchers are let into the lab, and build Safer-1'),
  },
  {
    id: 'coalition',
    name: 'Middle-power coalition',
    levels: ['UK and Norway join', 'Canada joins', 'Japan and Korea join'],
    text: 'Team up with the UK, Norway, Canada, Japan and Korea. Allies add weight; from level 2 they share the load.',
    proposal:
      'Europe builds a small, nimble coalition: the UK and Norway first, then Canada, then Japan and South Korea. Together they speak with one voice in Washington and Beijing. From level 2, allies share the load: +1 Influence every round. Washington may tempt its Five Eyes partners away with privileged access, and compromises cost goodwill at home.',
    example: {
      text: 'The Europe 2031 report recommends to “build a small, nimble coalition with countries like Norway, the UK, Canada, Japan and South Korea”.',
      source: SOURCES.europe2031,
    },
    ups: [up(`US–China cooperation ${n(C.coalition.cooperation)}`), up('Level 2: Influence +1 a round')],
    downs: [down(`Social cohesion ${n(C.coalition.cohesion)}`), down('Washington may lure partners away')],
    protects: 'incident',
    arrives: { round: TUNING.arrive.coalition },
    basis: real('europe2031: Europe 2031, recommendation 2 (coalition of middle powers); with CFG, Arms race, Ending B'),
  },
  {
    id: 'audit',
    name: 'Independent audit',
    text: 'A game shortcut: auditors show you the true AI safety for two rounds. Real audits only narrow the doubt. Nothing else moves.',
    proposal:
      'This card is a device of the game: for two rounds, your AI safety gauge shows the truth instead of the labs’ reports. No real audit can see that much; in AI 2027 even the lab cannot tell whether its AI is aligned. It changes nothing by itself: you spend a turn learning where you really stand.',
    example: {
      text: 'In late 2024, the UK and US AI Safety Institutes tested OpenAI’s o1 model before its release, during a limited period of access.',
      source: SOURCES.aisiO1,
    },
    ups: [up(`Shows the true AI safety for ${C.audit.rounds} rounds`)],
    downs: [down('No gauge gain')],
    arrives: { round: TUNING.arrive.audit },
    basis: game('an audit that sees the true AI safety (real pre-deployment tests only narrow the doubt: aisiO1)'),
  },
  {
    id: 'asml',
    name: 'Push to use the ASML lever',
    text: 'Push the Dutch to tie ASML’s lithography exports to a deal. Labs concede; Washington answers with its own ban on European chip tools.',
    proposal:
      'Export licences for the lithography machines every advanced chip needs are a Dutch decision, coordinated with Washington. Europe pushes to use them as leverage: ask the labs to open their newest models to European testers, or to give European firms and public services access. Washington will not let Europe set terms: expect it to block European chip-tool sales to China.',
    example: {
      text: 'The Europe 2031 report: “The only card Europe still holds is ASML - the one bottleneck the entire AI race runs through.”',
      source: SOURCES.europe2031,
    },
    ups: [up('AI safety: more verified, or Social cohesion ' + n(C.asml.access.cohesion))],
    downs: [down(`US–China cooperation ${n(C.asml.cooperation)}`), down('Washington retaliates: a chip-tool ban')],
    options: [
      { id: 'safety', label: 'Labs open their models to EU testers', ups: [up('AI safety: more verified')] },
      { id: 'access', label: 'Model access for European firms', ups: [up(`Social cohesion ${n(C.asml.access.cohesion)}`)] },
    ],
    arrives: { aiPower: C.asml.arrivesAt },
    basis: cfg('Arms race: “Control over chips becomes a geopolitical weapon”; the US invokes the Foreign Direct Product Rule against European toolmakers'),
  },
  {
    id: 'weight_security',
    name: 'Weight security standards',
    text: 'Labs selling in Europe must lock down their model weights. A theft gets harder, not impossible; only big labs can afford it.',
    proposal:
      'Any lab that sells advanced AI in Europe must protect its model weights to military standards: vetted staff, sealed data centres, constant monitoring. Europe reaches US data centres only through market access, so a theft would be cut short, not stopped. Only big labs can pay: unless Europe funds its own models’ security, it relies on them.',
    example: {
      text: 'The EU AI Act requires providers of general-purpose AI models with systemic risk to “ensure an adequate level of cybersecurity protection” for the model.',
      source: SOURCES.aiAct,
    },
    costLine: {
      text: 'A 2024 RAND study found that securing model weights against the most capable attackers “will require significantly more investment over the coming years”.',
      source: SOURCES.rand,
    },
    ups: [up('Model theft: cut short, partly')],
    downs: [down('Europe’s AI → Dependent, unless it funds its own'), down(`Social cohesion ${n(C.weight_security.cohesion)}`)],
    protects: 'theft',
    arrives: { threatSeen: 'theft' },
    basis: ai2027('February 2027: China Steals Agent-2 (with AI Act Article 55(1)(d): cybersecurity of models with systemic risk)'),
  },
  {
    id: 'open_models',
    name: 'Fund open models',
    text: 'Fund open European models anyone can run. Europe’s AI turns Open and local firms grow, but criminals get the same tools.',
    proposal:
      'Europe funds open models that run on European computers, in every European language, for firms and public services, and asks that publicly funded models be open-weight. Fewer companies hold the keys to Europe’s AI. But criminals get the same tools, and nobody can recall a model once it is out.',
    costLine: { text: 'OpenEuroLLM, an EU project to build open models for all EU languages, has a budget of €37.4 million (2025).', source: SOURCES.openEuroLlm },
    ups: [up('Europe’s AI → Open'), up(`Social cohesion ${n(C.open_models.cohesion)}`)],
    downs: [down('Ransomware threat grows')],
    arrives: { round: C.open_models.arrivesRound },
    basis: cfg('Big AI, Ending A: “any AI models developed with public funding must be open-weight”; Plateau: miniaturisation and openness'),
  },
  {
    id: 'flexicurity',
    name: 'Back flexicurity in member states',
    text: 'Back Danish-style deals in member states with EU retraining funds. Job shocks soften; unions distrust the bargain at first.',
    proposal:
      'Labour law is national, but the EU can fund and coordinate. Europe backs Danish-style deals in member states, with EU retraining funds: firms adopt AI more freely, and workers who lose their jobs get generous income support and paid retraining. Job shocks hurt far less. Unions distrust the bargain at first, and it costs you political goodwill for a while.',
    example: {
      text: 'The Europe 2031 report: “A flexicurity model, like the Danish example, allows firms to adopt AI more deeply.”',
      source: SOURCES.europe2031,
    },
    ups: [up(`Social cohesion ${n(C.flexicurity.cohesion)}`), up('Softens job shocks')],
    downs: [down(`Influence ${n(C.flexicurity.influence)} for ${C.flexicurity.rounds} rounds`)],
    protects: undefined,
    arrives: { milestone: 'ai_takes_jobs' },
    basis: real('europe2031: Europe 2031’s flexicurity recommendation (with AI 2027, Late 2026: AI Takes Some Jobs)'),
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
    text: 'A human must sign off on AI decisions in hospitals, courts and grids. People trust it; some labs withhold their newest models from Europe.',
    proposal:
      'A trained human must approve every important AI decision in hospitals, courts, grids and public services. People trust the result. Some labs keep their newest models, open ones included, out of Europe: unless Europe runs open models it funded, it leans on the big labs that stay, and they may threaten to pull out unless the rule goes.',
    example: {
      text: 'The EU AI Act already requires high-risk AI systems to be designed so that “they can be effectively overseen by natural persons”.',
      source: SOURCES.aiActArt14,
    },
    costLine: {
      text: 'In July 2024, Meta said it would release a multimodal Llama model “but not in the EU due to the unpredictable nature of the European regulatory environment”.',
      source: SOURCES.metaEu,
    },
    ups: [up(`Social cohesion ${n(C.oversight_mandate.cohesion)}`)],
    downs: [down('Models withheld: Europe’s AI → Dependent'), down('Silicon blackmail threat if Dependent')],
    arrives: { round: C.oversight_mandate.arrivesRound },
    basis: cfg('Big AI, Ending B (Silicon blackmail): US firms threaten to withdraw from the EU over its rules'),
  },
  {
    id: 'cern_ai',
    name: 'A CERN for AI on Europe’s gigafactories',
    text: 'Pledge a third of Europe’s new AI gigafactories to safety research under a “CERN for AI”. What you can verify grows; taxpayers ask why.',
    proposal:
      'Europe is building AI gigafactories with public money. This turns a third of their computing power over to safety and security research, run by a new “CERN for AI”. European testers can then check frontier models as deeply as the labs do. Taxpayers ask why their gigafactories do not build European champions instead.',
    costLine: {
      text: 'In February 2025, the EU’s InvestAI initiative announced “a new European fund of €20 billion for AI gigafactories”.',
      source: SOURCES.investAi,
    },
    ups: [up('AI safety: more verified')],
    downs: [down(`Social cohesion ${n(C.cern_ai.cohesion)}`)],
    arrives: { round: C.cern_ai.arrivesRound },
    basis: cfg('Diplomacy: the Commission pledges “35% of the Gigafactories’ compute capacity for AI safety and security research”, overseen by a “CERN for AI”'),
  },
  {
    id: 'chip_verification',
    name: 'Fund chips that prove where they run',
    text: 'Fund hardware that lets AI chips prove where they run. A pause becomes checkable; both capitals distrust the idea at first.',
    proposal:
      'Europe’s toolmakers and chip researchers develop tamper-resistant features that let a chip report where it runs and what it trains. Without them, any pause is a promise nobody can check. Washington and Beijing both suspect the other would cheat, and both suspect Europe’s motives at first: it costs diplomatic capital.',
    ups: [up(`US–China cooperation ${n(C.chip_verification.cooperation)}`), up('AI safety: more verified')],
    downs: [down(`Influence ${n(C.chip_verification.influence)} next round`)],
    arrives: { aiPower: C.chip_verification.arrivesAt },
    basis: cfg('Diplomacy, Ending B: hardware-enabled verification, such as tamper-resistant chips, discussed but uncertain (with AI 2027, slowdown, December 2027: chips fitted with location tracking)'),
  },
  {
    id: 'licensing_treaty',
    name: 'Push for a licensing treaty',
    text: 'In a pause, draft a treaty: frontier AI only under licence, audited by an expanded IAEA. Labs lobby hard; prices rise at home.',
    proposal:
      'With the superpowers ready to slow down, Europe drafts the treaty that makes it last: the most powerful AI may only be trained and run under licence, audited by an expanded IAEA, and taxed. The labs lobby hard, and AI gets dearer at home. It only works while Washington and Beijing both want a pause.',
    ups: [up('AI safety: more verified'), up('Real safety up (not shown)'), up(`US–China cooperation ${n(C.licensing_treaty.cooperation)}`)],
    downs: [down(`Social cohesion ${n(C.licensing_treaty.cohesion)}`), down('Only in a pause')],
    arrives: { pauseDeal: true },
    basis: cfg('Diplomacy, Ending A (Licensed utopia): “a licensing regime for advanced AI systems”, the IAEA expands to enforce it'),
  },
  {
    id: 'biosecurity',
    name: 'Lead a global biosecurity pact',
    text: 'Rally Washington, Beijing and others to screen DNA orders and test AI for bioweapon help. A rare shared cause; labs grumble.',
    proposal:
      'New AI can coach an amateur through making a pathogen. Europe leads an international initiative: DNA synthesis orders screened everywhere, frontier models tested for bioweapon help before release, a shared alert network. Washington and Beijing both fear this one, so it brings them closer. The labs grumble about delays.',
    ups: [up('Protects against bioweapon uplift'), up(`US–China cooperation ${n(C.biosecurity.cooperation)}`)],
    downs: [down(`Social cohesion ${n(C.biosecurity.cohesion)}`)],
    protects: 'bio',
    arrives: { threatSeen: 'bio' },
    basis: cfg('Take-off: a bioterror plot with an open model; “Europe leads a new international initiative to establish a global biosecurity framework”'),
  },
  {
    id: 'summit',
    name: 'AI security summit',
    text: 'After the incident, everyone is listening. Push for shared incident reports and inspections of the largest training runs.',
    proposal:
      'The AI incident frightened Washington and Beijing alike, and a security summit meets. Europe pushes for shared incident reports and inspections of the largest training runs. If Europe’s testers and coalition were ready, it leads the talks; otherwise it follows. The window closes in two rounds.',
    ups: [up(`US–China cooperation +${C.summit.cooperationFollow} to +${C.summit.cooperation}`), up('AI safety: more verified'), up('Real safety up (not shown)')],
    downs: [down('Only for two rounds')],
    arrives: { opportunity: true },
    opportunity: true,
    basis: cfg('Diplomacy: the “Nova” warning shot leads to an AI security summit, convened in Washington'),
  },
  {
    id: 'attribution',
    name: 'Joint attribution with allies',
    text: 'Name the thieves with your partners, calmly and with evidence. Washington feels backed and keeps its retaliation limited.',
    proposal:
      'With your coalition partners, Europe publishes a joint, evidence-based attribution of the theft. Washington feels supported and keeps its retaliation limited; Beijing gets a firm but calm message instead of more attacks. The window closes in two rounds.',
    example: {
      text: 'In July 2021, the EU said malicious cyber activity, including the Microsoft Exchange hack, was “undertaken from the territory of China”.',
      source: SOURCES.euAttribution2021,
    },
    ups: [up(`US–China cooperation ${n(C.attribution.cooperation)}`), up('Less US escalation')],
    downs: [down('Only for two rounds')],
    arrives: { opportunity: true },
    opportunity: true,
    basis: ai2027('February 2027: China Steals Agent-2 (the US retaliates; both sides move forces around Taiwan)'),
  },
  {
    id: 'pause_call',
    name: 'Call for a pause with other capitals',
    text: 'The memo is out. Demand a pause with India and others; Beijing joins, Washington calls it betrayal. Sways its oversight committee toward slowing down.',
    proposal:
      'Europe’s leaders accuse Washington of building an AI it cannot control and host a summit demanding a pause. India and others join; Beijing says yes. Washington’s new oversight committee will vote at the tipping point: race on, or slow down. Your call adds one vote for slowing down. Washington will make you pay for it.',
    ups: [up(`US–China cooperation ${n(C.pause_call.cooperation)}`), up('One more vote to slow down')],
    downs: [down(`Influence ${n(C.pause_call.influence)} next round`)],
    arrives: { opportunity: true },
    opportunity: true,
    basis: ai2027('October 2027: Government Oversight (European leaders “hold summits demanding a pause, with India, Israel, Russia, and China all joining in”)'),
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
