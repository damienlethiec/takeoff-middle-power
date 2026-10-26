// "Words used in the game": the terms that must stay, each defined in 20 plain words or fewer. Shown in Help, and
// inline: the first time a term appears in a request, an opened card, Breaking news or a threat, it is a button that
// opens its definition (src/ui/glossary.ts). A definition that states a real fact cites its source; the game's own
// words (Influence, the tipping point, "verified") say "In this game". Fiction (OpenBrain, DeepCent) is labelled.

import type { Basis, Source } from '../engine/types';
import { ai2027, cfg, game, real } from './basis';
import { SOURCES } from './sources';

export interface GlossaryEntry {
  id: string;
  /** The term as Help lists it. */
  term: string;
  /** ≤ 20 words, plain English. */
  def: string;
  /** What marks it inline: its first match in a text becomes the button (case-insensitive unless `exact`). */
  match: RegExp;
  basis: Basis;
  source?: Source;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'alignment',
    term: 'AI safety, alignment',
    def: 'Whether an AI reliably does what people intend, and nothing harmful. Nobody yet knows how to guarantee it.',
    match: /\b(?:alignment|aligned)\b/i,
    basis: ai2027('the alignment problem the scenario turns on (April 2027: Alignment for Agent-3)'),
  },
  {
    id: 'verified',
    term: 'Verified',
    def: 'In this game, the part of AI safety that independent testers have actually checked, not just what the labs claim.',
    match: /\bverif(?:ied|y)\b/i,
    basis: game('the AI safety gauge’s verified part'),
  },
  {
    id: 'weights',
    term: 'Model weights',
    def: 'The billions of numbers, learned in training, that make up an AI model. Whoever copies them has the AI.',
    match: /\b(?:model )?weights\b/i,
    basis: real('rand: securing model weights'),
    source: SOURCES.rand,
  },
  {
    id: 'open',
    term: 'Open models',
    def: 'AI models published for anyone to download, run and change. Once they are out, nobody can take them back.',
    match: /\bopen(?:-weight)? models?\b/i,
    basis: cfg('Plateau: open models and miniaturisation'),
  },
  {
    id: 'agent',
    term: 'AI agent',
    def: 'An AI that carries out tasks by itself, step by step, instead of only answering questions.',
    match: /\bAI agents?\b/i,
    basis: ai2027('Mid 2025: Stumbling Agents'),
  },
  {
    id: 'compute',
    term: 'Chips and data centres',
    def: 'AI is trained and run on special chips, packed by the thousand into huge buildings called data centres.',
    match: /\b(?:data cent(?:re|er)s?|computing power)\b/i,
    basis: ai2027('Late 2025: The World’s Most Expensive AI (compute and datacenters)'),
  },
  {
    id: 'gigafactories',
    term: 'AI gigafactories',
    def: 'Giant computer centres for training AI that the EU plans to fund through its InvestAI plan.',
    match: /\bgigafactor(?:y|ies)\b/i,
    basis: real('investAi: InvestAI’s fund for AI gigafactories'),
    source: SOURCES.investAi,
  },
  {
    id: 'export',
    term: 'Export controls',
    def: 'Rules that stop some goods, such as advanced AI chips, being sold abroad without a government licence.',
    match: /\bexport (?:controls?|rules|limits)\b/i,
    basis: real('bisChips: US export controls on advanced computing'),
    source: SOURCES.bisChips,
  },
  {
    id: 'asml',
    term: 'ASML',
    def: 'A Dutch company, the only maker of the machines needed to print the most advanced chips.',
    match: /\bASML\b/,
    basis: real('asmlCnbc: ASML, sole maker of EUV lithography machines'),
    source: SOURCES.asmlCnbc,
  },
  {
    id: 'ai_office',
    term: 'The AI Office',
    def: 'The European Commission’s team that oversees the most powerful AI models under the EU’s AI law, the AI Act.',
    match: /\bAI Office\b/,
    basis: real('aiOffice: the European AI Office'),
    source: SOURCES.aiOffice,
  },
  {
    id: 'iaea',
    term: 'IAEA',
    def: 'The International Atomic Energy Agency: its inspectors check that countries’ nuclear programmes stay peaceful.',
    match: /\bIAEA\b/,
    basis: real('iaeaBudget2025: the IAEA’s verification work'),
    source: SOURCES.iaeaBudget2025,
  },
  {
    id: 'flexicurity',
    term: 'Flexicurity',
    def: 'The Danish model: firms can hire and lay off easily, and laid-off workers get good pay and retraining.',
    match: /\bflexicurity\b/i,
    basis: real('europe2031: Europe 2031’s flexicurity recommendation'),
    source: SOURCES.europe2031,
  },
  {
    id: 'ransomware',
    term: 'Ransomware',
    def: 'Malicious software that locks a computer’s files until the victim pays a ransom.',
    match: /\bransomware\b/i,
    basis: real('anthropicMisuse: AI-written ransomware sold to criminals'),
    source: SOURCES.anthropicMisuse,
  },
  {
    id: 'labs',
    term: 'OpenBrain and DeepCent',
    def: 'The leading US and Chinese AI labs of the AI 2027 scenario. Both are fictional.',
    match: /\b(?:OpenBrain|DeepCent)\b/,
    basis: ai2027('its two fictional labs'),
    source: SOURCES.ai2027,
  },
  {
    id: 'tipping',
    term: 'Tipping point',
    def: 'In this game, the moment AI can do AI research by itself, faster than people, speeding up its own progress.',
    match: /\btipping point\b/i,
    basis: ai2027('September 2027: Agent-4, the Superhuman AI Researcher'),
  },
  {
    id: 'influence',
    term: 'Influence',
    def: 'In this game, your political weight. You earn some every round and spend it on policy cards.',
    match: /\bInfluence\b/,
    basis: game('the Envoy’s one resource'),
  },
  {
    id: 'ai2027',
    term: 'AI 2027',
    def: 'A 2025 forecast, told as a story, of AI learning to improve itself by late 2027. The game follows it.',
    match: /\bAI 2027\b/,
    basis: real('ai2027: the scenario itself'),
    source: SOURCES.ai2027,
  },
  {
    id: 'cfg',
    term: 'CFG',
    def: 'The Centre for Future Generations, a Brussels think tank. Its 2025 report imagines five possible worlds shaped by AI.',
    match: /\bCFG\b/,
    basis: real('cfg: Advanced AI: Possible Futures'),
    source: SOURCES.cfg,
  },
];

export const GLOSSARY_BY_ID: Record<string, GlossaryEntry> = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]));
