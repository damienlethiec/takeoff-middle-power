// Headlines and public voices that appear on the map, where they happen. All fiction set after today,
// each tied to its scenario basis. A predicate picks the ones that fit the public state of the world.

import type { Basis, EuropeAi, RegionId, Zone } from '../engine/types';
import { ai2027, cfg, real } from './basis';

/** What a headline or a voice may depend on: public values only. */
export interface PublicWorld {
  round: number;
  zone: Zone;
  aiPower: number;
  cohesion: number;
  europeAi: EuropeAi;
  coalition: number;
  jobShocks: number;
  threatsSeen: string[];
}

export interface MapLine {
  id: string;
  region: RegionId;
  text: string;
  when?: (w: PublicWorld) => boolean;
  basis: Basis;
}

export const WORLD_HEADLINES: MapLine[] = [
  {
    id: 'h_race_money',
    region: 'us',
    text: 'Both superpowers pour record sums into new AI data centres.',
    when: (w) => w.zone !== 'pause',
    basis: cfg('Take-off: “Massive infrastructure investments pay off spectacularly”'),
  },
  {
    id: 'h_cdz',
    region: 'cn',
    text: 'DeepCent’s giant computing zone doubles in size.',
    when: (w) => w.aiPower >= 28,
    basis: ai2027('Mid 2026: China Wakes Up (the Centralized Development Zone)'),
  },
  {
    id: 'h_chips',
    region: 'us',
    text: 'Washington tightens chip export rules again.',
    basis: cfg('Arms race: “Control over chips becomes a geopolitical weapon”'),
  },
  {
    id: 'h_rupture',
    region: 'cn',
    text: 'Washington and Beijing expel each other’s diplomats in an AI spying row.',
    when: (w) => w.zone === 'rupture',
    basis: ai2027('February 2027: China Steals Agent-2 (retaliation and military moves)'),
  },
  {
    id: 'h_taiwan',
    region: 'cn',
    text: 'Warships gather near Taiwan, home of the world’s chip factories.',
    when: (w) => w.zone === 'rupture',
    basis: cfg('Arms race: chip chokepoints, especially Taiwan’s fabrication plants'),
  },
  {
    id: 'h_pause',
    region: 'eu',
    text: 'US and Chinese officials meet quietly in Geneva to talk AI safety.',
    when: (w) => w.zone === 'pause',
    basis: cfg('Diplomacy: safety moves to the top of diplomatic agendas'),
  },
  {
    id: 'h_stocks',
    region: 'us',
    text: 'Stock markets hit new records on AI hype.',
    when: (w) => w.aiPower >= 40,
    basis: ai2027('Late 2026: AI Takes Some Jobs (the stock market rises 30%)'),
  },
  {
    id: 'h_lead',
    region: 'us',
    text: 'OpenBrain and DeepCent each claim to lead the race.',
    basis: ai2027('the race between OpenBrain and DeepCent'),
  },
  {
    id: 'h_poll',
    region: 'eu',
    text: 'Poll: most Europeans say AI is moving too fast.',
    when: (w) => w.cohesion < 50,
    basis: ai2027('July 2027: The Cheap Remote Worker (public approval of OpenBrain at −35%)'),
  },
  {
    id: 'h_retrain',
    region: 'eu',
    text: 'Retraining centres open in every EU capital.',
    when: (w) => w.cohesion >= 60 && w.jobShocks > 0,
    basis: real('Europe 2031, recommendation 3 (flexicurity and retraining)'),
  },
  {
    id: 'h_open',
    region: 'eu',
    text: 'European open models now run in thousands of town halls and clinics.',
    when: (w) => w.europeAi === 'open',
    basis: cfg('Plateau: open-weight models seen as a lifeline for public services'),
  },
  {
    id: 'h_dependent',
    region: 'us',
    text: 'Three US firms now run most of Europe’s AI services.',
    when: (w) => w.europeAi === 'dependent' && w.round >= 3,
    basis: cfg('Big AI: three American companies control about 85% of the market'),
  },
  {
    id: 'h_coalition',
    region: 'eu',
    text: 'London, Oslo and Brussels speak with one voice on AI.',
    when: (w) => w.coalition >= 1,
    basis: real('Europe 2031, recommendation 2 (coalition of middle powers)'),
  },
  {
    id: 'h_protest',
    region: 'us',
    text: 'Thousands march on Washington to demand a pause on AI.',
    when: (w) => w.aiPower >= 34,
    basis: ai2027('Late 2026: AI Takes Some Jobs (anti-AI protest in DC)'),
  },
];

export const VOICES: MapLine[] = [
  { id: 'v_teachers', region: 'eu', text: 'Teachers in Lyon worry about AI tutors.', basis: ai2027('Late 2026: AI Takes Some Jobs') },
  {
    id: 'v_nurse',
    region: 'eu',
    text: 'A nurse in Milan: “Who checks the AI that sorts our patients?”',
    basis: real('EU AI Act, Article 14 (human oversight of high-risk AI)'),
  },
  {
    id: 'v_students',
    region: 'eu',
    text: 'Students in Warsaw ask if first jobs will still exist.',
    basis: real('Stanford Digital Economy Lab, Canaries in the Coal Mine (2025)'),
  },
  {
    id: 'v_friends',
    region: 'eu',
    text: 'Parents in Madrid: “Our kids talk more to their AI than to friends.”',
    when: (w) => w.aiPower >= 45,
    basis: ai2027('July 2027: The Cheap Remote Worker (10% of Americans call an AI a close friend)'),
  },
  {
    id: 'v_docks',
    region: 'eu',
    text: 'A Rotterdam planner: “They said this would take years.”',
    when: (w) => w.jobShocks > 0,
    basis: ai2027('Late 2026: AI Takes Some Jobs'),
  },
  {
    id: 'v_switchoff',
    region: 'eu',
    text: 'Shop owners in Ghent: “What if the AI just switches off one day?”',
    when: (w) => w.europeAi === 'dependent' && w.round >= 4,
    basis: cfg('Big AI, Ending B (Silicon blackmail)'),
  },
  {
    id: 'v_hospital_it',
    region: 'eu',
    text: 'A hospital IT chief in Dublin: “We patch, they write new attacks overnight.”',
    when: (w) => w.threatsSeen.includes('ransomware'),
    basis: real('Anthropic, Detecting and countering misuse of AI (Aug 2025)'),
  },
  {
    id: 'v_welder',
    region: 'eu',
    text: 'A retrained welder in Bilbao: “Now I run the machines.”',
    when: (w) => w.cohesion >= 60 && w.jobShocks > 0,
    basis: real('Europe 2031, recommendation 3 (flexicurity)'),
  },
  {
    id: 'v_tallinn',
    region: 'eu',
    text: 'A Tallinn startup: “Finally, a model we can run ourselves.”',
    when: (w) => w.europeAi === 'open',
    basis: cfg('Plateau, Ending A (A bright winter): open tools keep AI accessible'),
  },
  {
    id: 'v_prices',
    region: 'eu',
    text: 'A clinic in Lille: “Our AI bill went up again. There is no other provider.”',
    when: (w) => w.europeAi === 'dependent' && w.round >= 5,
    basis: cfg('Big AI: consolidation in a few firms'),
  },
  {
    id: 'v_angry',
    region: 'eu',
    text: 'Crowds in Marseille: “Who voted for this?”',
    when: (w) => w.cohesion < 45,
    basis: ai2027('October 2027: Government Oversight (public backlash)'),
  },
  { id: 'v_seattle', region: 'us', text: 'Junior coders in Seattle swap tips on finding work.', basis: ai2027('Late 2026: AI Takes Some Jobs') },
  {
    id: 'v_dc',
    region: 'us',
    text: 'Protesters outside OpenBrain: “Slow down!”',
    when: (w) => w.aiPower >= 34,
    basis: ai2027('Late 2026: AI Takes Some Jobs (anti-AI protest)'),
  },
  { id: 'v_shenzhen', region: 'cn', text: 'Engineers in Shenzhen are told: catch up, whatever it takes.', basis: ai2027('Mid 2026: China Wakes Up') },
  {
    id: 'v_tianwan',
    region: 'cn',
    text: 'Near Tianwan, villagers wonder what the new power lines feed.',
    when: (w) => w.aiPower >= 28,
    basis: ai2027('Mid 2026: China Wakes Up (the zone at the Tianwan Power Plant)'),
  },
];
