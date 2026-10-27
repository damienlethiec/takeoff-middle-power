// The deck: fifteen cards and three opportunities (docs/V3_SPEC.md, "The cards"; the content rewrite of 26 Oct in
// docs/V4_BUILD_NOTES.md). Europe's policies act on Europe's ground: its AI Office, its compute, its market, its money,
// and mediation once the superpowers ask; never directly on the hidden alignment of US or Chinese models.
// Every card helps something and costs something visible. Numbers come from TUNING.cards; the chips
// on the card face are built from them, so the face and the rules always agree.
// Texts: `text` ≤ 25 words (card face), `proposal` ≤ 60 words (opened card).

import type { Basis, CardFamily, CardId, Chip, Fact, MilestoneId, ThreatId } from '../engine/types';
import { ai2027, cfg, e2031, game, real } from './basis';
import { GAUGE_LABEL } from './copy';
import { moveText, moveWord, sizeWord } from './effects';
import { SOURCES } from './sources';
import { TUNING } from './tuning';

const C = TUNING.cards;
const up = (text: string): Chip => ({ text, tone: 'up' });
const down = (text: string): Chip => ({ text, tone: 'down' });
const n = (x: number) => (x > 0 ? `+${x}` : `−${Math.abs(x)}`);
// gauge moves in words on the card (numbers show once the card is played: src/data/effects.ts); Influence stays a number
const COOP = (x: number) => moveText(GAUGE_LABEL.cooperation, x);
const COH = (x: number) => moveText(GAUGE_LABEL.cohesion, x);

/** One effect on a card's face, drawn as an icon (src/ui/fx.ts; v4, 27 Oct: compact cards). A gauge with 1 to 3
 *  arrows (`size`: ±1 a little, ±2 some, ±3 a lot, the scale of the words on the chips; AI safety by its verified
 *  part), the hidden real safety (no size: it is not shown), Influence as a number, Europe's AI's new state, a
 *  protection, a risk the card brings, or the audit's look at the truth. `when`: only with the inspection accord, or
 *  from level 2. Built from the same numbers as the chips, so the face and the rules agree. Conditions, levels and
 *  the reasons stay in Details. */
export type Face =
  | { kind: 'move'; gauge: 'cooperation' | 'cohesion' | 'confidence'; size: number; upTo?: number; when?: FaceWhen }
  | { kind: 'truth'; when?: FaceWhen }
  | { kind: 'influence'; n: number; span: 'next' | 'each' | number; when?: FaceWhen }
  | { kind: 'europeAi'; to: 'Open' | 'Dependent' }
  | { kind: 'protects'; threat: ThreatId | 'job_shock'; partly?: boolean }
  | { kind: 'risk'; what: 'ransomware' | 'blackmail' | 'chip_ban' }
  | { kind: 'reveal'; rounds: number };
export type FaceWhen = 'accord' | 'level2';
const SIZES = ['a little', 'some', 'a lot'];
/** A gauge's move on the face: its sign and its size in arrows (`delta` as the gauge sees it). */
const mv = (gauge: 'cooperation' | 'cohesion' | 'confidence', delta: number) =>
  ({ kind: 'move', gauge, size: Math.sign(delta) * (SIZES.indexOf(sizeWord(delta)) + 1) }) as const;

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

/** The hand's families, in the order they are shown (v4, playtests of 26 Oct: one long hand was hard to scan). */
export const FAMILIES: { id: CardFamily; name: string }[] = [
  { id: 'diplomacy', name: 'Diplomacy' },
  { id: 'oversight', name: 'Oversight & security' },
  { id: 'tech', name: 'Research & chips' },
  { id: 'home', name: 'At home' },
];

export interface CardDef {
  id: CardId;
  name: string;
  family: CardFamily;
  /** Names of each level, for cards with levels. */
  levels?: string[];
  text: string;
  /** The face's one line (≤ 12 words): what the card is for. The full text is in Details. */
  short: string;
  proposal: string;
  example?: Fact;
  costLine?: Fact;
  ups: Chip[];
  downs: Chip[];
  /** The face's effects as icons; a card with options adds the chosen option's. */
  face: Face[];
  protects?: ThreatId;
  options?: { id: string; label: string; ups: Chip[]; face: Face[] }[];
  arrives: Arrival;
  opportunity?: boolean;
  basis: Basis;
  /** Cards that can fail (TUNING.failure): the one plain sentence the news gives when it does not work, and its basis. */
  failure?: { text: string; basis: Basis };
}

export const CARDS: CardDef[] = [
  {
    id: 'talks',
    family: 'diplomacy',
    name: 'Host US–China talks',
    text: 'Bring US and Chinese diplomats to one table in Geneva. Trust rises a little; at home, some call you soft on rivals.',
    short: 'Host US and Chinese diplomats in Geneva to keep them talking.',
    proposal:
      'Europe hosts quiet talks between Washington and Beijing on the risks both fear: AI in military command, stolen models, accidents. No treaty, only ways to keep talking. Critics at home say Europe is cosying up to rivals. After each round of talks, the envoys need a round off.',
    example: {
      text: 'In November 2024, Presidents Biden and Xi agreed on “the need to maintain human control over the decision to use nuclear weapons”.',
      source: SOURCES.bidenXi,
    },
    ups: [up(COOP(C.talks.cooperation))],
    downs: [down(COH(C.talks.cohesion))],
    face: [mv('cooperation', C.talks.cooperation), mv('cohesion', C.talks.cohesion)],
    arrives: { round: TUNING.arrive.talks },
    basis: cfg('Arms race, Ending B (Multipolar world): the EU and neutral states mediate between the superpowers'),
    failure: { text: 'The Geneva talks broke up: neither side trusts what the other says it is building.', basis: cfg('Arms race: “No one can verify what anyone else is doing”') },
  },
  {
    id: 'inspections',
    family: 'oversight',
    name: 'Inspect the AI labs',
    levels: ['Test the labs’ models in Europe', 'Inspection accord', 'Joint inspection agency'],
    text: 'European inspectors test the AI labs’ models. You can check more of their claims; Washington and Beijing resist letting foreigners in.',
    short: 'European inspectors test the labs’ AI models, later inside the labs.',
    proposal:
      'First, the AI Office tests every top AI model sold in Europe. Later, once a crisis or a pause makes the superpowers willing, an accord lets European inspectors into their labs, then a joint inspection agency. No deal holds unless someone can check it; each step costs goodwill. With a coalition, testing prepares the world for an AI incident.',
    costLine: {
      text: 'The IAEA, which checks nuclear programmes worldwide, spends about €171 million a year on verification (2025).',
      source: SOURCES.iaeaBudget2025,
    },
    ups: [up('AI safety: more verified'), up(`Accord: ${COOP(C.inspections.cooperation[1])}`), up('Accord: real safety up (not shown)')],
    downs: [down('Accord: only after a crisis or in a pause'), down(`Accord: Influence ${n(C.inspections.influence)} next round`)],
    face: [mv('confidence', -C.inspections.margin), { ...mv('cooperation', C.inspections.cooperation[1]), when: 'accord' }, { kind: 'truth', when: 'accord' }, { kind: 'influence', n: C.inspections.influence, span: 'next', when: 'accord' }, { kind: 'protects', threat: 'incident' }],
    protects: 'incident',
    arrives: { round: TUNING.arrive.inspections },
    basis: cfg('Diplomacy: “without verification any deal would be meaningless”; Licensed utopia’s IAEA-style enforcement'),
    failure: { text: 'Washington and Beijing refused to let European inspectors into their labs.', basis: ai2027('May 2027: National Security (allies are kept out of the loop)') },
  },
  {
    id: 'ai_office',
    family: 'oversight',
    name: 'Hire testers for the AI Office',
    text: 'Hire top AI testers for the AI Office. You check far more of the labs’ claims, even when AI thinking turns unreadable. Other budgets pay.',
    short: 'Hire top testers so the AI Office can check the labs’ claims.',
    proposal:
      'The EU’s AI Office already has the power to test big AI models. This gives it the people: testers paid like lab engineers, with their own computers. They halve what you don’t know about the labs’ claims and sharpen every inspection. If AI starts thinking in a code no one can read, they keep testing what it does.',
    example: {
      text: 'Under the AI Act, the European Commission’s AI Office has “the ability to conduct evaluations of GPAI models”.',
      source: SOURCES.aiOffice,
    },
    ups: [up('AI safety: much more verified'), up('Inspections sharper')],
    downs: [down(COH(C.ai_office.cohesion))],
    face: [{ kind: 'move', gauge: 'confidence', size: 3 }, mv('cohesion', C.ai_office.cohesion), { kind: 'protects', threat: 'opaque', partly: true }],
    protects: 'opaque',
    arrives: { round: TUNING.arrive.ai_office },
    basis: real('aiOffice: the AI Office’s evaluation powers (with AI 2027, March 2027: neuralese makes reasoning unreadable)'),
  },
  {
    id: 'alignment',
    family: 'tech',
    name: 'Fund AI safety research',
    text: 'Pay independent teams to work on making AI safe. The labs adopt little of it unless inspectors give your teams access.',
    short: 'Pay independent teams to work on making AI safe.',
    proposal:
      'Europe funds independent teams in universities working on alignment: making AI reliably do what we intend. Their papers are public, but the big labs use little of them on their own. Once an inspection accord opens the labs to European teams, their work counts for far more. Most of it never shows in the labs’ reports. Other budgets pay.',
    costLine: { text: 'In July 2025, the UK’s AI Security Institute launched a fund of over £15 million for alignment research.', source: SOURCES.aisiAlignment },
    ups: [up(`${GAUGE_LABEL.confidence} shown: ${moveWord(C.alignment.estimate)}`), up('Real safety up (not shown), more with an accord')],
    downs: [down('Labs adopt little without inspectors')],
    face: [mv('confidence', C.alignment.estimate), { kind: 'truth' }],
    arrives: { round: TUNING.arrive.alignment },
    basis: ai2027('Slowdown ending: “several dozen” outside alignment researchers are let into the lab, and build Safer-1'),
  },
  {
    id: 'coalition',
    family: 'diplomacy',
    name: 'Team up with friendly countries',
    levels: ['UK and Norway join', 'Canada joins', 'Japan and Korea join'],
    text: 'Team up with the UK, Norway, Canada, Japan and Korea. Allies add weight; from level 2 they share the load.',
    short: 'Team up with the UK, Canada, Japan and other mid-sized countries.',
    proposal:
      'Europe builds a small, nimble coalition: the UK and Norway first, then Canada, then Japan and South Korea. Together they speak with one voice in Washington and Beijing. From level 2, allies share the load: +1 Influence every round. Washington may tempt its closest allies away with special access, and compromises cost goodwill at home.',
    example: {
      text: 'The Europe 2031 report recommends to “build a small, nimble coalition with countries like Norway, the UK, Canada, Japan and South Korea”.',
      source: SOURCES.europe2031,
    },
    ups: [up(COOP(C.coalition.cooperation)), up('Level 2: Influence +1 a round')],
    downs: [down('Washington may lure partners away')],
    face: [mv('cooperation', C.coalition.cooperation), { kind: 'influence', n: 1, span: 'each', when: 'level2' }, { kind: 'protects', threat: 'incident' }],
    protects: 'incident',
    arrives: { round: TUNING.arrive.coalition },
    basis: e2031('Recommendation 2: a small, nimble coalition of middle powers whose chokepoints are joint leverage, and which could mediate between the US and China (with CFG, Arms race, Ending B)'),
    failure: { text: 'The partners held back this time: Washington offered them privileged access to its AI instead.', basis: e2031('April 2029: Access all areas (the Five Eyes, Japan and South Korea get Tier 1 access to US AI; most of Europe Tier 2)') },
  },
  {
    id: 'audit',
    family: 'oversight',
    name: 'Independent audit',
    text: 'A game shortcut: auditors show you the true AI safety for two rounds. Real audits only narrow the doubt. Nothing else moves.',
    short: 'A game shortcut: see the true AI safety for two rounds.',
    proposal:
      'This card is a device of the game: for two rounds, your AI safety gauge shows the truth instead of the labs’ reports. No real audit can see that much; in AI 2027 even the lab cannot tell whether its AI truly does what it intends. It changes nothing by itself: you spend a turn learning where you really stand.',
    example: {
      text: 'In late 2024, the UK and US AI Safety Institutes tested OpenAI’s o1 model before its release, during a limited period of access.',
      source: SOURCES.aisiO1,
    },
    ups: [up(`Shows the true AI safety for ${C.audit.rounds} rounds`)],
    downs: [down('No gauge gain')],
    face: [{ kind: 'reveal', rounds: C.audit.rounds }],
    arrives: { round: TUNING.arrive.audit },
    basis: game('an audit that sees the true AI safety (real pre-deployment tests only narrow the doubt: aisiO1)'),
  },
  {
    id: 'asml',
    family: 'tech',
    name: 'Bargain with ASML’s chip machines',
    text: 'ASML, a Dutch firm, alone makes the machines for the best chips. Tie their sales to a deal: labs give way; Washington hits back.',
    short: 'Tie ASML’s chip-machine sales to a deal. You choose the ask.',
    proposal:
      'Every advanced chip needs ASML’s chip-printing machines, and the Dutch government decides, with Washington, who may buy them. Europe pushes for that leverage: ask the labs to open their newest models to European testers, or to give European firms and public services access. Washington won’t let Europe set terms: expect it to block European chip-tool sales to China.',
    example: {
      text: 'The Europe 2031 report: “The only card Europe still holds is ASML - the one bottleneck the entire AI race runs through.”',
      source: SOURCES.europe2031,
    },
    ups: [up(`AI safety: more verified, or cohesion ${moveWord(C.asml.access.cohesion)}`)],
    downs: [down(COOP(C.asml.cooperation)), down('Washington retaliates: a chip-tool ban')],
    face: [mv('cooperation', C.asml.cooperation), { kind: 'risk', what: 'chip_ban' }],
    options: [
      { id: 'safety', label: 'Labs open their models to EU testers', ups: [up('AI safety: more verified')], face: [mv('confidence', -C.asml.safety.margin)] },
      { id: 'access', label: 'Model access for European firms', ups: [up(COH(C.asml.access.cohesion))], face: [mv('cohesion', C.asml.access.cohesion)] },
    ],
    arrives: { aiPower: C.asml.arrivesAt },
    basis: e2031('Recommendation 2 (supply-chain chokepoints as joint leverage for frontier access or safer models) and May 2028: The compute crunch (Washington answers with the Foreign Direct Product Rule); with CFG, Arms race'),
    failure: { text: 'The lever failed: US export rules, not Europe, decide where ASML may sell.', basis: e2031('May 2028: The compute crunch (Washington threatens the Foreign Direct Product Rule; The Hague backs down)') },
  },
  {
    id: 'weight_security',
    family: 'oversight',
    name: 'Guard AI from theft',
    text: 'Labs selling in Europe must guard their model weights, the files that are the AI. Harder to steal, not impossible; only big labs can pay.',
    short: 'Make the labs guard their model files against theft.',
    proposal:
      'Any lab selling advanced AI in Europe must guard its model weights like military secrets: vetted staff, sealed computer centres, constant watch. Europe has no say inside US labs, only over its own market, so a theft would be cut short, not stopped. Only big labs can pay: unless Europe funds its own models’ security, it relies on them.',
    example: {
      text: 'The EU AI Act requires providers of general-purpose AI models with systemic risk to “ensure an adequate level of cybersecurity protection” for the model.',
      source: SOURCES.aiAct,
    },
    costLine: {
      text: 'A 2024 RAND study found that securing model weights against the most capable attackers “will require significantly more investment over the coming years”.',
      source: SOURCES.rand,
    },
    ups: [up('AI theft: cut short, partly')],
    downs: [down('Europe’s AI → Dependent, unless it funds its own'), down(COH(C.weight_security.cohesion))],
    face: [{ kind: 'protects', threat: 'theft', partly: true }, { kind: 'europeAi', to: 'Dependent' }, mv('cohesion', C.weight_security.cohesion)],
    protects: 'theft',
    arrives: { threatSeen: 'theft' },
    basis: ai2027('February 2027: China Steals Agent-2 (with AI Act Article 55(1)(d): cybersecurity of models with systemic risk)'),
  },
  {
    id: 'open_models',
    family: 'home',
    name: 'Fund open European AI',
    text: 'Fund open European models anyone can run. Europe’s AI turns Open and local firms grow, but criminals get the same tools.',
    short: 'Fund open European AI models that anyone can run.',
    proposal:
      'Europe funds open models that run on European computers, in every European language, for firms and public services, and asks that models paid for with public money be published for anyone to use. Fewer companies hold the keys to Europe’s AI. But criminals get the same tools, and nobody can recall a model once it is out.',
    costLine: { text: 'OpenEuroLLM, an EU project to build open models for all EU languages, has a budget of €37.4 million (2025).', source: SOURCES.openEuroLlm },
    ups: [up('Europe’s AI → Open'), up(COH(C.open_models.cohesion))],
    downs: [down('Ransomware threat grows')],
    face: [{ kind: 'europeAi', to: 'Open' }, mv('cohesion', C.open_models.cohesion), { kind: 'risk', what: 'ransomware' }],
    arrives: { round: C.open_models.arrivesRound },
    basis: cfg('Big AI, Ending A: “any AI models developed with public funding must be open-weight”; Plateau: miniaturisation and openness'),
  },
  {
    id: 'flexicurity',
    family: 'home',
    name: 'Help workers learn new jobs',
    text: 'Back the Danish model, “flexicurity”: firms adopt AI freely, laid-off workers get pay and retraining. Job shocks soften; unions are wary at first.',
    short: 'Pay and retrain the workers AI puts out of a job.',
    proposal:
      'Labour law is national, but the EU can fund and coordinate. Europe backs Danish-style “flexicurity” deals in each country, with EU retraining funds: firms adopt AI more freely, and workers who lose their jobs get generous income support and paid retraining. Job shocks hurt far less. Unions distrust the bargain at first, and it costs you political goodwill.',
    example: {
      text: 'The Europe 2031 report: “A flexicurity model, like the Danish example, allows firms to adopt AI more deeply.”',
      source: SOURCES.europe2031,
    },
    ups: [up(COH(C.flexicurity.cohesion)), up('Softens job shocks')],
    downs: [down(`Influence ${n(C.flexicurity.influence)} for ${C.flexicurity.rounds} rounds`)],
    face: [mv('cohesion', C.flexicurity.cohesion), { kind: 'protects', threat: 'job_shock', partly: true }, { kind: 'influence', n: C.flexicurity.influence, span: C.flexicurity.rounds }],
    protects: undefined,
    arrives: { milestone: 'ai_takes_jobs' },
    basis: e2031('Recommendation 3: a Danish-style flexicurity model to adopt AI while protecting displaced workers (with AI 2027, Late 2026: AI Takes Some Jobs)'),
  },
  {
    id: 'cyber_shield',
    family: 'home',
    name: 'Shield hospitals from hackers',
    text: 'Harden hospitals, grids and town halls before AI-written attacks arrive. Ransomware bounces off; the bill strains budgets for a while.',
    short: 'Harden hospitals, grids and town halls against AI-written attacks.',
    proposal:
      'Europe funds cyber teams, backups and drills for hospitals, power grids and town halls, and gives ENISA, its cyber agency, powers to step in during an attack. When AI-written ransomware arrives, most of it bounces off. The bill strains national budgets for a while.',
    costLine: {
      text: 'In June 2025, the EU set aside €30 million to protect hospitals and healthcare providers from cyberattacks, ransomware first.',
      source: SOURCES.euCyberHealth,
    },
    ups: [up('Protects against ransomware'), up(COH(C.cyber_shield.cohesion))],
    downs: [down(`Influence ${n(C.cyber_shield.influence)} for ${C.cyber_shield.rounds} rounds`)],
    face: [{ kind: 'protects', threat: 'ransomware' }, mv('cohesion', C.cyber_shield.cohesion), { kind: 'influence', n: C.cyber_shield.influence, span: C.cyber_shield.rounds }],
    protects: 'ransomware',
    arrives: { threatSeen: 'ransomware' },
    basis: cfg('Plateau, Ending B (Decentralised mayhem): ransomware waves, the EU expands ENISA'),
  },
  {
    id: 'oversight_mandate',
    family: 'home',
    name: 'Humans sign off on AI decisions',
    text: 'A human must sign off on AI decisions in hospitals, courts and grids. People trust it; some labs withhold their newest models from Europe.',
    short: 'A human signs off on AI decisions in hospitals, courts and grids.',
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
    ups: [up(COH(C.oversight_mandate.cohesion))],
    downs: [down('Models withheld: Europe’s AI → Dependent'), down('Threat to cut Europe off, if Dependent')],
    face: [mv('cohesion', C.oversight_mandate.cohesion), { kind: 'europeAi', to: 'Dependent' }, { kind: 'risk', what: 'blackmail' }],
    arrives: { round: C.oversight_mandate.arrivesRound },
    basis: cfg('Big AI, Ending B (Silicon blackmail): US firms threaten to withdraw from the EU over its rules'),
  },
  {
    id: 'cern_ai',
    family: 'tech',
    name: 'A public lab for AI safety',
    text: 'Give a third of Europe’s new giant AI computer centres to safety research, run like CERN. You can check more; taxpayers ask why.',
    short: 'Give a third of Europe’s big AI computer centres to safety research.',
    proposal:
      'Europe is building giant AI computer centres, “gigafactories”, with public money. This turns a third of their computing power over to safety research, run by a new “CERN for AI”. European testers can then check the top models as deeply as the labs do. Taxpayers ask why their money does not build European champions instead.',
    costLine: {
      text: 'In February 2025, the EU’s InvestAI initiative announced “a new European fund of €20 billion for AI gigafactories”.',
      source: SOURCES.investAi,
    },
    ups: [up('AI safety: more verified')],
    downs: [down(COH(C.cern_ai.cohesion))],
    face: [mv('confidence', -C.cern_ai.margin), mv('cohesion', C.cern_ai.cohesion)],
    arrives: { round: C.cern_ai.arrivesRound },
    basis: cfg('Diplomacy: the Commission pledges “35% of the Gigafactories’ compute capacity for AI safety and security research”, overseen by a “CERN for AI”'),
  },
  {
    id: 'chip_verification',
    family: 'tech',
    name: 'Track where AI chips are',
    text: 'Fund AI chips that can report where they are and what they run. A pause becomes checkable; both capitals distrust the idea at first.',
    short: 'Fund AI chips that report where they are, so pauses are checkable.',
    proposal:
      'Europe’s toolmakers and chip researchers develop features, hard to fake, that let a chip report where it runs and what it trains. Without them, any pause is a promise nobody can check. Washington and Beijing both suspect the other would cheat, and both suspect Europe’s motives at first: it costs goodwill.',
    ups: [up(COOP(C.chip_verification.cooperation)), up('AI safety: more verified')],
    downs: [down(`Influence ${n(C.chip_verification.influence)} next round`)],
    face: [mv('cooperation', C.chip_verification.cooperation), mv('confidence', -C.chip_verification.margin), { kind: 'influence', n: C.chip_verification.influence, span: 'next' }],
    arrives: { aiPower: C.chip_verification.arrivesAt },
    basis: cfg('Diplomacy, Ending B: hardware-enabled verification, such as tamper-resistant chips, discussed but uncertain (with AI 2027, slowdown, December 2027: chips fitted with location tracking)'),
  },
  {
    id: 'licensing_treaty',
    family: 'diplomacy',
    name: 'Treaty to license the strongest AI',
    text: 'In a pause, draft a treaty: the strongest AI only under licence, checked like nuclear power is. Labs lobby hard; prices rise at home.',
    short: 'A treaty: the strongest AI only under licence, checked like nuclear power.',
    proposal:
      'With the superpowers ready to slow down, Europe drafts the treaty that makes it last: the most powerful AI may only be trained and run under licence, checked by an expanded IAEA, the UN’s nuclear watchdog, and taxed. The labs lobby hard, and AI gets dearer at home. It only works while Washington and Beijing both want a pause.',
    ups: [up('AI safety: more verified'), up('Real safety up (not shown)'), up(COOP(C.licensing_treaty.cooperation))],
    downs: [down(COH(C.licensing_treaty.cohesion)), down('Only in a pause')],
    face: [mv('confidence', -C.licensing_treaty.margin), { kind: 'truth' }, mv('cooperation', C.licensing_treaty.cooperation), mv('cohesion', C.licensing_treaty.cohesion)],
    arrives: { pauseDeal: true },
    basis: cfg('Diplomacy, Ending A (Licensed utopia): “a licensing regime for advanced AI systems”, the IAEA expands to enforce it'),
    failure: { text: 'The treaty talks stalled: the labs’ lobbying split the negotiators.', basis: cfg('Diplomacy, Ending B (Unstable pause): only a bilateral pact, frontier models withheld, no treaty') },
  },
  {
    id: 'biosecurity',
    family: 'diplomacy',
    name: 'Lead a pact against bioweapons',
    text: 'Rally Washington, Beijing and others to screen DNA orders and test AI for bioweapon help. A rare shared cause; labs grumble.',
    short: 'Rally the powers to stop AI from helping anyone make bioweapons.',
    proposal:
      'New AI can coach an amateur through making a deadly germ. Europe leads a worldwide effort: orders for lab-made DNA checked everywhere, new AI models tested for bioweapon help before release, a shared alert network. Washington and Beijing both fear this one, so it brings them closer. The labs grumble about delays.',
    ups: [up('Protects against AI help with bioweapons'), up(COOP(C.biosecurity.cooperation))],
    downs: [down(COH(C.biosecurity.cohesion))],
    face: [{ kind: 'protects', threat: 'bio' }, mv('cooperation', C.biosecurity.cooperation), mv('cohesion', C.biosecurity.cohesion)],
    protects: 'bio',
    arrives: { threatSeen: 'bio' },
    basis: cfg('Take-off: a bioterror plot with an open model; “Europe leads a new international initiative to establish a global biosecurity framework”'),
    failure: { text: 'The pact stalled: Washington and Beijing would not share what their labs test.', basis: cfg('Arms race: “No one can verify what anyone else is doing”') },
  },
  {
    id: 'summit',
    family: 'diplomacy',
    name: 'AI security summit',
    text: 'After the incident, everyone is listening. Push for shared incident reports and inspections when the biggest AIs are trained.',
    short: 'After the incident, push for shared incident reports and inspections.',
    proposal:
      'The AI incident frightened Washington and Beijing alike, and a security summit meets. Europe pushes for shared incident reports and inspections when the biggest AIs are trained. If Europe’s testers and coalition were ready, it leads the talks; otherwise it follows. The window closes in two rounds.',
    ups: [up(sizeWord(C.summit.cooperationFollow) === sizeWord(C.summit.cooperation) ? COOP(C.summit.cooperation) : `${COOP(C.summit.cooperationFollow)} to ${sizeWord(C.summit.cooperation)}`), up('AI safety: more verified'), up('Real safety up (not shown)')],
    downs: [down('Only for two rounds')],
    face: [{ ...mv('cooperation', C.summit.cooperationFollow), upTo: mv('cooperation', C.summit.cooperation).size }, mv('confidence', -C.summit.margin), { kind: 'truth' }],
    arrives: { opportunity: true },
    opportunity: true,
    basis: cfg('Diplomacy: the “Nova” warning shot leads to an AI security summit, convened in Washington'),
  },
  {
    id: 'attribution',
    family: 'diplomacy',
    name: 'Name the thieves with allies',
    text: 'Name the thieves with your partners, calmly and with evidence. Washington feels backed and keeps its retaliation limited.',
    short: 'Name the model thieves with your partners, calmly and with evidence.',
    proposal:
      'With your coalition partners, Europe publicly names who stole the model, with the evidence. Washington feels supported and keeps its retaliation limited; Beijing gets a firm but calm message instead of more attacks. The window closes in two rounds.',
    example: {
      text: 'In May 2025, the EU backed Czechia in publicly naming APT31, a group linked to China’s Ministry of State Security, for hacking its foreign ministry.',
      source: SOURCES.euCzechia2025,
    },
    ups: [up(COOP(C.attribution.cooperation)), up('Less US escalation')],
    downs: [down('Only for two rounds')],
    face: [mv('cooperation', C.attribution.cooperation)],
    arrives: { opportunity: true },
    opportunity: true,
    basis: ai2027('February 2027: China Steals Agent-2 (the US retaliates; both sides move forces around Taiwan)'),
  },
  {
    id: 'pause_call',
    family: 'diplomacy',
    name: 'Call for a pause with other countries',
    text: 'The memo is out. Demand a pause with India and others; Beijing joins, Washington cries betrayal. It sways Washington’s new AI committee toward slowing down.',
    short: 'Call for a pause on AI, with India and other capitals.',
    proposal:
      'Europe’s leaders accuse Washington of building an AI it cannot control and host a summit demanding a pause. India and others join; Beijing says yes. Washington’s new oversight committee will vote at takeoff: race on, or slow down. Your call adds one vote for slowing down. Washington will make you pay for it.',
    ups: [up(COOP(C.pause_call.cooperation)), up('One more vote to slow down')],
    downs: [down(`Influence ${n(C.pause_call.influence)} next round`)],
    face: [mv('cooperation', C.pause_call.cooperation), { kind: 'influence', n: C.pause_call.influence, span: 'next' }],
    arrives: { opportunity: true },
    opportunity: true,
    basis: ai2027('October 2027: Government Oversight (European leaders “hold summits demanding a pause, with India, Israel, Russia, and China all joining in”)'),
    failure: { text: 'The pause call fell flat: few capitals joined, and Washington shrugged it off.', basis: ai2027('Race ending: the Oversight Committee votes 6–4 to continue (“A slowdown would sacrifice America’s lead”)') },
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
