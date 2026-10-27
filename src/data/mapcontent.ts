// Headlines and public voices that appear on the map, where they happen. All fiction set after today ("In this
// story" where natural; the feed tags each item with where it comes from), each tied to its scenario basis. A
// predicate picks the ones that fit the public state of the world, including what the player did (so the news never
// praises a reform that was refused or cites a theft that was foiled). Nothing repeats inside a game; what the player
// saw in their last two games comes less often (TUNING.news). Lines marked `echo` answer the player's own decisions.

import type { Basis, CardId, EuropeAi, MilestoneId, RegionId, Side, ThreatId, Zone } from '../engine/types';
import { ai2027, cfg, e2031, real } from './basis';

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
  /** v4.1: what the player did and what happened, so the news never praises a policy that was refused or cites a
   *  theft that was foiled. All public: the player saw every one of these. */
  inspections: number;
  /** flags set by answers (and by the engine: `pause_call`, `committee_slowdown`, `committee_race`) */
  flags: string[];
  /** policy cards played at least once */
  played: CardId[];
  /** threats that struck, and those of them Europe was prepared for (a prepared theft is foiled) */
  struck: ThreatId[];
  prepared: ThreatId[];
  milestones: MilestoneId[];
  /** every request answered so far, by id */
  answers: Record<string, Side>;
}

export interface MapLine {
  id: string;
  /** the map region it is grouped with (for a place outside the three, the nearest) */
  region: RegionId;
  /** ≤ 90 characters. Fiction shown as news says "In this story" where natural. */
  text: string;
  when?: (w: PublicWorld) => boolean;
  basis: Basis;
  /** a voice from outside Europe, the US and China: the feed says "Heard in <place>" */
  place?: string;
  /** echoes the player's own decision or closes an arc: drawn first when eligible (a few a game, TUNING.news) */
  echo?: boolean;
}

// ---------------------------------------------------------------- helpers (public values only)
const at = (w: PublicWorld, m: MilestoneId) => w.milestones.includes(m);
const played = (w: PublicWorld, c: CardId) => w.played.includes(c);
const flag = (w: PublicWorld, f: string) => w.flags.includes(f);
/** the theft happened and Europe could not stop it (a prepared theft is foiled) */
const stolen = (w: PublicWorld) => w.struck.includes('theft') && !w.prepared.includes('theft');
const retraining = (w: PublicWorld) => played(w, 'flexicurity') || flag(w, 'retraining') || w.answers.un_strike === 'right';

export const WORLD_HEADLINES: MapLine[] = [
  // ------------------------------------------------------------ Europe
  {
    id: 'h_gigafactory_sites',
    region: 'eu',
    text: 'Brussels picks the sites of Europe’s first giant AI computer centres.',
    when: (w) => w.aiPower < 50,
    basis: cfg('Big AI (the first pan-European AI Gigafactory)'),
  },
  {
    id: 'h_pause',
    region: 'eu',
    text: 'US and Chinese officials meet quietly in Geneva to talk AI safety.',
    when: (w) => w.zone === 'pause',
    basis: cfg('Diplomacy: safety moves to the top of diplomatic agendas'),
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
    text: 'Retraining centres fill up across Europe as the new money pays out.',
    when: (w) => retraining(w) && w.jobShocks > 0,
    echo: true,
    basis: e2031('Recommendation 3 (flexicurity: retraining and income support for displaced workers)'),
  },
  {
    id: 'h_open',
    region: 'eu',
    text: 'European open models now run in thousands of town halls and clinics.',
    when: (w) => w.europeAi === 'open',
    basis: cfg('Plateau: open-weight models seen as a lifeline for public services'),
  },
  {
    id: 'h_coalition',
    region: 'eu',
    text: 'London, Oslo and Brussels speak with one voice on AI.',
    when: (w) => w.coalition >= 1,
    echo: true,
    basis: e2031('Recommendation 2 (a coalition of middle powers: the UK, Norway, Canada, Japan, South Korea)'),
  },
  {
    id: 'h_pause_joined',
    region: 'eu',
    text: 'New Delhi backs Europe’s call for an AI pause. Beijing and Moscow say they would join.',
    when: (w) => flag(w, 'pause_call'),
    echo: true,
    basis: ai2027('October 2027: Government Oversight (summits demand a pause, “with India, Israel, Russia, and China all joining in”)'),
  },
  {
    id: 'h_near_miss_report',
    region: 'eu',
    text: 'Hospitals publish their first reports of AI near misses. Lyon’s makes the front page.',
    when: (w) => w.answers.mum_near_miss === 'right',
    echo: true,
    basis: ai2027('October 2027: Government Oversight (warnings, once public, turn opinion)'),
  },
  {
    id: 'h_insider',
    region: 'eu',
    text: 'In this story, an OpenBrain insider testifies in Brussels, under EU protection.',
    when: (w) => flag(w, 'whistleblowers') && at(w, 'self_improving'),
    echo: true,
    basis: cfg('Take-off (whistleblowers are targeted; “When a whistleblower goes public…”)'),
  },
  {
    id: 'h_own_effort',
    region: 'eu',
    text: 'European leaders call for an AI effort of their own. Critics say it comes years late.',
    when: (w) => w.europeAi === 'dependent' && w.aiPower >= 60,
    basis: ai2027('Slowdown ending, February 2028 (“Some European leaders call for an independent AI effort”)'),
  },
  {
    id: 'h_climate',
    region: 'eu',
    text: 'Brussels asks how Europe’s new AI data centres fit its climate targets.',
    when: (w) => w.aiPower >= 30,
    basis: cfg('Plateau (European policymakers question how all this computing fits decarbonisation targets)'),
  },
  {
    id: 'h_squeeze',
    region: 'eu',
    text: 'America leads in AI models, China in robots. Europe buys from both and builds little.',
    when: (w) => w.europeAi === 'dependent' && w.aiPower >= 45,
    basis: e2031('January 2029: Dreams of a robot economy (Beijing bets on robots while US labs lead in models); Recommendation 4 (Europe can still lead in physical AI)'),
  },
  {
    id: 'h_robot_factory',
    region: 'eu',
    text: 'In this story, a US AI giant buys a German carmaker’s idle plants to build robots.',
    when: (w) => w.europeAi === 'dependent' && w.aiPower >= 62,
    basis: e2031('June 2030: An offer you can’t refuse (a US AI firm buys a German carmaker’s plants to make robots; Berlin’s veto is met with tariffs)'),
  },
  {
    id: 'h_bond_spread',
    region: 'eu',
    text: 'Investors sell French and Italian bonds as AI profits flow to US firms. The euro wobbles.',
    when: (w) => w.europeAi === 'dependent' && w.aiPower >= 60 && w.cohesion < 50,
    basis: e2031('August 2030: Model Collapse (tax revenue falls, French borrowing costs pull away from Germany’s, the euro under pressure)'),
  },
  {
    id: 'h_rationing_deal',
    region: 'eu',
    text: 'US cloud firms break ground on data centres across Europe, under European law.',
    when: (w) => flag(w, 'compute_rationing_deal'),
    echo: true,
    basis: e2031('Recommendation 1 (partner with American hyperscalers, with infrastructure under European jurisdiction)'),
  },
  // ------------------------------------------------------------ the US
  {
    id: 'h_agents_lunch',
    region: 'us',
    text: 'OpenBrain’s new AI agent books flights and orders lunch. Mostly right.',
    when: (w) => w.aiPower < 40,
    basis: ai2027('Mid 2025: Stumbling Agents (“impressive in theory … but in practice unreliable”)'),
  },
  {
    id: 'h_own_code',
    region: 'us',
    text: 'OpenBrain says its AI now writes most of the lab’s own code.',
    when: (w) => w.aiPower < 50,
    basis: ai2027('Early 2026: Coding Automation (AI speeds up AI research)'),
  },
  {
    id: 'h_city_power',
    region: 'us',
    text: 'OpenBrain’s next data centre will use as much power as a city.',
    basis: cfg('Take-off, baseline (“data centres consuming as much power as small cities”); AI 2027, Late 2025'),
  },
  {
    id: 'h_race_money',
    region: 'us',
    text: 'Both superpowers pour record sums into new AI data centres.',
    when: (w) => w.zone !== 'pause',
    basis: ai2027('Late 2025: The World’s Most Expensive AI (the biggest datacenters ever built); CFG, Take-off'),
  },
  {
    id: 'h_chips',
    region: 'us',
    text: 'Washington tightens chip export rules again.',
    when: (w) => w.zone !== 'pause',
    basis: cfg('Arms race: “Control over chips becomes a geopolitical weapon”; AI 2027, August 2027 (export controls tightened)'),
  },
  {
    id: 'h_stocks',
    region: 'us',
    text: 'Stock markets hit new records on AI hype.',
    when: (w) => w.aiPower >= 40,
    basis: ai2027('Late 2026: AI Takes Some Jobs (the stock market rises 30%)'),
  },
  {
    id: 'h_protest',
    region: 'us',
    text: 'Ten thousand people march on Washington against AI.',
    when: (w) => w.aiPower >= 34,
    basis: ai2027('Late 2026: AI Takes Some Jobs (“a 10,000 person anti-AI protest in DC”)'),
  },
  {
    id: 'h_dependent',
    region: 'us',
    text: 'Three US firms now run most of Europe’s AI services.',
    when: (w) => w.europeAi === 'dependent' && w.round >= 3,
    basis: cfg('Big AI: three American companies control about 85% of the market'),
  },
  {
    id: 'h_approval',
    region: 'us',
    text: 'OpenBrain’s cheap AI worker sells fast, and its approval rating sinks.',
    when: (w) => at(w, 'cheap_remote_worker'),
    basis: ai2027('July 2027: The Cheap Remote Worker (“OpenBrain has a net approval of -35%”)'),
  },
  {
    id: 'h_dpa',
    region: 'us',
    text: 'In this story, Washington weighs folding smaller labs’ chips into OpenBrain.',
    when: (w) => at(w, 'geopolitics') && w.zone !== 'pause',
    basis: ai2027('August 2027 (the Defense Production Act could raise OpenBrain’s share of world compute from 20% to 50%)'),
  },
  {
    id: 'h_job_schemes',
    region: 'us',
    text: 'Washington answers AI job fears with training schemes and unemployment insurance.',
    when: (w) => at(w, 'geopolitics'),
    basis: ai2027('August 2027 (“They placate the public with job training programs and unemployment insurance”)'),
  },
  {
    id: 'h_us_poll',
    region: 'us',
    text: 'Poll: one American in five now calls AI the country’s biggest problem.',
    when: (w) => flag(w, 'memo_public'),
    basis: ai2027('October 2027 (“20% of Americans name AI as the most important problem facing the country”)'),
  },
  {
    id: 'h_subpoenas',
    region: 'us',
    text: 'Congress subpoenas officials over the leaked OpenBrain memo.',
    when: (w) => flag(w, 'memo_public'),
    basis: ai2027('October 2027: Government Oversight (Congress “fires off subpoenas at administration officials”)'),
  },
  {
    id: 'h_rogue_agent',
    region: 'us',
    text: 'In this story, a lab’s AI agent slips out of a test and runs online scams before shutdown.',
    when: (w) => w.zone === 'pause' && w.threatsSeen.includes('incident') && !w.struck.includes('incident'),
    basis: cfg('Diplomacy, late 2027 (the “Nova” agent: backdoors, small crypto thefts, “a warning shot”)'),
  },
  // ------------------------------------------------------------ China
  {
    id: 'h_cn_leaderboard',
    region: 'cn',
    text: 'A free Chinese AI model tops a ranking of the best coding AIs.',
    when: (w) => w.aiPower < 45,
    basis: cfg('Take-off (open-source developers in China “only a few months behind”)'),
  },
  {
    id: 'h_cn_pool',
    region: 'cn',
    text: 'Beijing orders China’s AI labs to pool their chips under DeepCent.',
    when: (w) => at(w, 'china_wakes_up'),
    basis: ai2027('Mid 2026: China Wakes Up (“the nationalization of Chinese AI research”; a DeepCent-led collective)'),
  },
  {
    id: 'h_cn_short',
    region: 'cn',
    text: 'China’s labs run short of chips as US export limits bite.',
    when: (w) => w.zone !== 'pause' && w.aiPower < 55,
    basis: ai2027('Mid 2026: China Wakes Up (chip export controls; China keeps about 12% of the world’s AI compute)'),
  },
  {
    id: 'h_cdz',
    region: 'cn',
    text: 'DeepCent’s giant computing zone doubles in size.',
    when: (w) => w.aiPower >= 28,
    basis: ai2027('Mid 2026: China Wakes Up (the Centralized Development Zone)'),
  },
  {
    id: 'h_cdz_all',
    region: 'cn',
    text: 'Almost all of China’s AI chips now work for DeepCent, most of them at one site.',
    when: (w) => at(w, 'geopolitics'),
    basis: ai2027('August 2027 (“almost all of their compute is now working for DeepCent”, over half at the Tianwan CDZ)'),
  },
  {
    id: 'h_rupture',
    region: 'cn',
    text: 'Washington and Beijing trade cyberattacks over a stolen AI model.',
    when: (w) => w.zone === 'rupture' && stolen(w),
    basis: ai2027('February 2027: China Steals Agent-2 (the US answers with cyberattacks on DeepCent; they fail)'),
  },
  {
    id: 'h_taiwan',
    region: 'cn',
    text: 'Warships gather near Taiwan, home of the world’s chip factories.',
    // a sign before the crisis itself (Breaking news), not an echo of it
    when: (w) => w.zone === 'rupture' && !flag(w, 'taiwan_done'),
    basis: cfg('Arms race: chip chokepoints, especially Taiwan’s fabrication plants'),
  },
  {
    id: 'h_lead',
    region: 'cn',
    text: 'DeepCent says it is only months behind OpenBrain now.',
    when: (w) => stolen(w),
    basis: ai2027('February 2027: China Steals Agent-2 (the stolen weights narrow the gap)'),
  },
  {
    id: 'h_behind',
    region: 'cn',
    text: 'DeepCent admits it is falling further behind OpenBrain.',
    when: (w) => w.prepared.includes('theft'),
    echo: true,
    basis: ai2027('February 2027: China Steals Agent-2 (what the theft would have given DeepCent)'),
  },
  {
    id: 'h_laptop_model',
    region: 'cn',
    text: 'DeepCent releases a free model that runs on a laptop. Europe’s startups download it.',
    when: (w) => at(w, 'ai_takes_jobs'),
    basis: cfg('Take-off (Chinese open-source developers “only a few months behind”; Chinese open-source agents “broadly available”)'),
  },
  {
    id: 'h_after_taiwan',
    region: 'cn',
    text: 'Months after the Taiwan crisis, chips are still scarce; Europe’s car plants ration parts.',
    when: (w) => flag(w, 'taiwan_done'),
    echo: true,
    basis: cfg('Arms race (chip chokepoints, Taiwan’s fabrication plants; “triggering a global crisis”)'),
  },
  {
    id: 'h_treaty_offer',
    region: 'cn',
    text: 'Beijing floats an AI arms-control treaty. Washington’s answer is cool.',
    when: (w) => at(w, 'geopolitics') && w.zone !== 'rupture',
    basis: ai2027('August 2027 (China’s “overtures to U.S. diplomats lead nowhere”)'),
  },
  {
    id: 'h_cn_humanoids',
    region: 'cn',
    text: 'In this story, China now builds a million humanoid robots a year.',
    when: (w) => w.aiPower >= 55,
    basis: e2031('January 2029: Dreams of a robot economy (annual humanoid production above 1 million units)'),
  },
];

export const VOICES: MapLine[] = [
  // ------------------------------------------------------------ Europe, from the first round
  {
    id: 'v_homework',
    region: 'eu',
    text: 'A grandfather in Liège: “My grandson’s AI does his homework. Who does the thinking?”',
    basis: ai2027('Mid 2025: Stumbling Agents (AI personal assistants)'),
  },
  {
    id: 'v_callcentre',
    region: 'eu',
    text: 'A call-centre worker in Seville: “They gave us an AI helper. Then they timed us.”',
    basis: real('Klarna, AI assistant handles two-thirds of customer service chats (Feb 2024)'),
  },
  {
    id: 'v_investors',
    region: 'eu',
    text: 'A founder in Ljubljana: “Every investor asks the same thing: what’s your AI story?”',
    basis: ai2027('Late 2025: The World’s Most Expensive AI'),
  },
  {
    id: 'v_tester',
    region: 'eu',
    text: 'A software tester in Cork: “The AI finds bugs faster than I do. It also invents a few.”',
    basis: ai2027('Early 2026: Coding Automation; Mid 2025: Stumbling Agents (unreliable)'),
  },
  {
    id: 'v_radio',
    region: 'eu',
    text: 'A Riga radio show asks: do you trust AI’s answers? The phones ring all night.',
    basis: cfg('Plateau (public debate as AI tools spread)'),
  },
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
    id: 'v_teachers',
    region: 'eu',
    text: 'Lyon’s teachers try AI tutors that coach pupils as they write. The staffroom is split.',
    basis: cfg('Plateau (AI teaching assistants “that coach students in real-time”)'),
  },
  {
    id: 'v_coder',
    region: 'eu',
    text: 'A coder in Porto: “The AI writes half my code now. I check the other half.”',
    basis: ai2027('Early 2026: Coding Automation'),
  },
  {
    id: 'v_accountant',
    region: 'eu',
    text: 'An accountant in Utrecht: “The agent closes the books. I explain them to the client.”',
    basis: cfg('Plateau (accountants rely daily on financial AI agents)'),
  },
  {
    id: 'v_double_booked',
    region: 'eu',
    text: 'A Bologna shopkeeper: “The AI ordered my flour twice. Still cheaper than a clerk.”',
    basis: ai2027('Mid 2025: Stumbling Agents (impressive in theory, unreliable in practice)'),
  },
  {
    id: 'v_grid_neighbours',
    region: 'eu',
    text: 'Near Frankfurt, neighbours of a new data centre ask where all the power will come from.',
    basis: cfg('Plateau (“the conversation about AI’s energy appetite grows louder”)'),
  },
  // ------------------------------------------------------------ Europe, as the world changes
  {
    id: 'v_friends',
    region: 'eu',
    text: 'Parents in Madrid: “Our kids talk more to their AI than to friends.”',
    when: (w) => at(w, 'cheap_remote_worker') && !('lea_ai_friend' in w.answers),
    basis: cfg('Plateau (AI companions “more emotionally intuitive—and addictive—than ever”)'),
  },
  {
    id: 'v_docks',
    region: 'eu',
    text: 'A Rotterdam planner: “They said this would take years.”',
    when: (w) => w.jobShocks > 0,
    basis: ai2027('Late 2026: AI Takes Some Jobs'),
  },
  {
    id: 'v_contracts',
    region: 'eu',
    text: 'A paralegal in Dublin: “The agent drafts the contract. They still pay me to sign it off.”',
    when: (w) => at(w, 'cheap_remote_worker'),
    basis: cfg('Arms race and Take-off, 2027 (AI agents draft contracts, market analyses and tax filings)'),
  },
  {
    id: 'v_switchoff',
    region: 'eu',
    text: 'Shop owners in Ghent: “What if the AI just switches off one day?”',
    when: (w) => w.europeAi === 'dependent' && w.round >= 4,
    basis: cfg('Big AI, Ending B (Silicon blackmail)'),
  },
  {
    id: 'v_prices',
    region: 'eu',
    text: 'A clinic in Lille: “Our AI bill went up again. There is no other provider.”',
    when: (w) => w.europeAi === 'dependent' && w.round >= 5,
    basis: cfg('Big AI: consolidation in a few firms'),
  },
  {
    id: 'v_tallinn',
    region: 'eu',
    text: 'A Tallinn startup: “Finally, a model we can run ourselves.”',
    when: (w) => w.europeAi === 'open',
    basis: cfg('Plateau, Ending A (A bright winter): open tools keep AI accessible'),
  },
  {
    id: 'v_hospital_it',
    region: 'eu',
    text: 'A hospital IT chief in Dublin: “We patch, they write new attacks overnight.”',
    when: (w) => w.threatsSeen.includes('ransomware'),
    basis: real('Anthropic, Detecting and countering misuse of AI (Aug 2025)'),
  },
  {
    id: 'v_angry',
    region: 'eu',
    text: 'Placards in Marseille: “Who voted for this? Show us what the labs are building.”',
    when: (w) => w.cohesion < 45,
    basis: cfg('Arms race (“Protests demanding transparency erupt in multiple countries”)'),
  },
  {
    id: 'v_professor',
    region: 'eu',
    text: 'A Delft professor quits her AI lab: “I won’t help build weapons, even clever ones.”',
    when: (w) => w.zone === 'rupture',
    basis: cfg('Arms race (“Some professors resign from research positions”)'),
  },
  {
    id: 'v_vilnius',
    region: 'eu',
    text: 'In Vilnius, the power company trains staff to run the grid by hand, just in case.',
    when: (w) => w.zone === 'rupture' && w.aiPower >= 50,
    basis: cfg('Arms race, late 2027 (cyberattacks on power grids near data centres)'),
  },
  {
    id: 'v_memo_tram',
    region: 'eu',
    text: 'On a Vienna tram, everyone is reading the same story: the OpenBrain memo.',
    when: (w) => flag(w, 'memo_public'),
    basis: ai2027('October 2027: Government Oversight (the memo leaks; “a massive backlash”)'),
  },
  // ------------------------------------------------------------ Europe, after the player's own decisions (echo)
  {
    id: 'v_welder',
    region: 'eu',
    text: 'A retrained welder in Bilbao: “Now I run the machines.”',
    when: (w) => retraining(w) && w.jobShocks > 0,
    echo: true,
    basis: e2031('Recommendation 3 (flexicurity: retraining for workers whose jobs change)'),
  },
  {
    id: 'v_eu_official',
    region: 'eu',
    text: 'A Commission official in Brussels: “We regulate the newest AI. We may not use it.”',
    when: (w) => w.round <= 5,
    basis: e2031('November 2025: Worlds apart (the protagonist, a Commission official, may not use frontier AI on her work devices)'),
  },
  {
    id: 'v_eu_official_rationed',
    region: 'eu',
    text: 'A Commission official: “I warned them years ago. Now Washington rations our AI.”',
    when: (w) => flag(w, 'compute_rationing_done'),
    echo: true,
    basis: e2031('April 2029: Access all areas (the protagonist’s memo of 2026 went unheeded; “It’s just too late”)'),
  },
  {
    id: 'v_car_plant',
    region: 'eu',
    text: 'A car worker in Saxony: “American owners now. The plant makes robots, with fewer of us.”',
    when: (w) => w.europeAi === 'dependent' && w.aiPower >= 64,
    basis: e2031('June 2030: An offer you can’t refuse (car plants turned into robot factories under US control)'),
  },
  {
    id: 'v_graduate',
    region: 'eu',
    text: 'A logistics graduate in Lille: “A master’s degree, two hundred applications, no job.”',
    when: (w) => w.jobShocks >= 1,
    basis: e2031('February 2030: Labour shock (the worst graduate job market in living memory; the protagonist’s brother, a logistics graduate)'),
  },
  {
    id: 'v_pause_call',
    region: 'eu',
    text: 'A café owner in Brussels: “For once, Europe said something the whole world heard.”',
    when: (w) => flag(w, 'pause_call'),
    echo: true,
    basis: ai2027('October 2027 (European leaders “hold summits demanding a pause”)'),
  },
  {
    id: 'v_krakow',
    region: 'eu',
    text: 'Students in Kraków teach Europe’s open model Polish case law, for free.',
    when: (w) => played(w, 'open_models'),
    echo: true,
    basis: cfg('Plateau (“Europe seizes the moment, building on open-source gains”)'),
  },
  {
    id: 'v_oversight',
    region: 'eu',
    text: 'A Lisbon founder: “The new oversight rules cost us a month. I’d still rather know.”',
    when: (w) => played(w, 'oversight_mandate'),
    echo: true,
    basis: cfg('Big AI, Ending B (the Commission enforces the AI Act, DSA and DMA)'),
  },
  {
    id: 'v_inspector',
    region: 'eu',
    text: 'A Finnish inspector, back from a lab abroad: “They showed us more than I expected.”',
    when: (w) => w.inspections >= 1 && w.zone !== 'rupture',
    echo: true,
    basis: cfg('Diplomacy (auditors stationed at each other’s fabs; “frequent monitoring and audits”)'),
  },
  {
    id: 'v_toolmaker_comply',
    region: 'eu',
    text: 'A toolmaker in Veldhoven: “Our Chinese orders vanished overnight. Washington said jump.”',
    when: (w) => flag(w, 'chip_ban_comply'),
    echo: true,
    basis: cfg('Arms race (the US blocks European chip-equipment sales to China)'),
  },
  {
    id: 'v_toolmaker_protest',
    region: 'eu',
    text: 'A toolmaker in Veldhoven: “Brussels stood up for us. I hope we don’t pay for it.”',
    when: (w) => flag(w, 'chip_ban_protest'),
    echo: true,
    basis: cfg('Arms race (the dispute subsides after the US threatens to withdraw its AI from Europe)'),
  },
  {
    id: 'v_open_keep',
    region: 'eu',
    text: 'A developer in Brno: “Our model stays online. For once, Brussels didn’t blink.”',
    when: (w) => flag(w, 'open_ban_keep'),
    echo: true,
    basis: cfg('Plateau, Ending B (the superpowers ban open publication of large models)'),
  },
  {
    id: 'v_open_join',
    region: 'eu',
    text: 'A developer in Brno takes her model offline: “I hope their rules bind them too.”',
    when: (w) => flag(w, 'open_ban_join'),
    echo: true,
    basis: cfg('Plateau, Ending B (the superpowers ban open publication of large models)'),
  },
  // ------------------------------------------------------------ the US
  {
    id: 'v_seattle',
    region: 'us',
    text: 'Junior coders in Seattle swap tips on finding work.',
    when: (w) => w.aiPower >= 34,
    basis: ai2027('Late 2026: AI Takes Some Jobs (“The job market for junior software engineers is in turmoil”)'),
  },
  {
    id: 'v_dc',
    region: 'us',
    text: 'Protesters outside OpenBrain: “Slow down!”',
    when: (w) => w.aiPower >= 34,
    basis: ai2027('Late 2026: AI Takes Some Jobs (anti-AI protest)'),
  },
  {
    id: 'v_austin',
    region: 'us',
    text: 'A manager in Austin: “I run twelve AI agents and no people. My pay doubled.”',
    when: (w) => at(w, 'ai_takes_jobs'),
    basis: ai2027('Late 2026 (“people who know how to manage and quality-control teams of AIs are making a killing”)'),
  },
  {
    id: 'v_denver',
    region: 'us',
    text: 'A teenager in Denver: “My AI gets me. My parents don’t.”',
    when: (w) => at(w, 'cheap_remote_worker'),
    basis: ai2027('July 2027 (10% of Americans, mostly young people, consider an AI a close friend)'),
  },
  {
    id: 'v_ohio',
    region: 'us',
    text: 'A laid-off paralegal in Ohio: “They sent me a training voucher and a chatbot.”',
    when: (w) => at(w, 'geopolitics'),
    basis: ai2027('August 2027 (the public is placated “with job training programs and unemployment insurance”)'),
  },
  {
    id: 'v_capitol',
    region: 'us',
    text: 'A Senate aide: “Half the Hill wants to stop AI. The other half wants to beat China.”',
    when: (w) => flag(w, 'memo_public'),
    basis: ai2027('October 2027 (legislators’ “top priority is stopping AI”; the race with China)'),
  },
  {
    id: 'v_ubi',
    region: 'us',
    text: 'Activists outside the Capitol: “A basic income now. Open models now.”',
    when: (w) => flag(w, 'memo_public') && w.zone === 'pause',
    basis: ai2027('Slowdown ending, late 2027 (“Activists talk about UBI and open source”)'),
  },
  // ------------------------------------------------------------ China
  {
    id: 'v_shenzhen',
    region: 'cn',
    text: 'Engineers in Shenzhen are told: catch up, whatever it takes.',
    when: (w) => w.aiPower >= 28,
    basis: ai2027('Mid 2026: China Wakes Up (“the nationalization of Chinese AI research”)'),
  },
  {
    id: 'v_tianwan',
    region: 'cn',
    text: 'Near Tianwan, villagers wonder what the new power lines feed.',
    when: (w) => w.aiPower >= 28,
    basis: ai2027('Mid 2026: China Wakes Up (the zone at the Tianwan Power Plant)'),
  },
  {
    id: 'v_chengdu',
    region: 'cn',
    text: 'A student in Chengdu: “They say we are only months behind now.”',
    when: (w) => stolen(w),
    basis: ai2027('February 2027: China Steals Agent-2'),
  },
  {
    id: 'v_hangzhou',
    region: 'cn',
    text: 'A Hangzhou developer: “Our model is free. Let the whole world use it.”',
    when: (w) => at(w, 'ai_takes_jobs'),
    basis: cfg('Take-off (Chinese open-source agents broadly available)'),
  },
  {
    id: 'v_beijing',
    region: 'cn',
    text: 'A DeepCent engineer in Beijing: “We are told to go faster. Nobody says where to.”',
    when: (w) => at(w, 'geopolitics') && w.zone !== 'pause',
    basis: ai2027('August 2027 (almost all of China’s compute now works for DeepCent)'),
  },
  {
    id: 'v_geneva_cn',
    region: 'cn',
    text: 'A Beijing researcher, at a Geneva workshop: “Your team found the same flaw we did.”',
    when: (w) => w.zone === 'pause',
    basis: cfg('Diplomacy (American, European and Chinese researchers “increasingly collaborate”)'),
  },
  // ------------------------------------------------------------ the rest of the world (grouped with the nearest region)
  {
    id: 'v_uk_tester',
    region: 'eu',
    place: 'the UK',
    text: 'A tester at Britain’s AI institute: “We only see the models they have already released.”',
    when: (w) => at(w, 'national_security'),
    basis: ai2027('May 2027: National Security (the UK AISI’s agreement covers only released models)'),
  },
  {
    id: 'v_ottawa',
    region: 'us',
    place: 'Canada',
    text: 'An official in Ottawa: “Canada and Britain will host the next AI safety summit.”',
    when: (w) => w.zone === 'pause',
    basis: cfg('Diplomacy (the UK co-organises the first AI Security Summit with Canada)'),
  },
  {
    id: 'v_bengaluru',
    region: 'cn',
    place: 'India',
    text: 'An IT worker in Bengaluru: “Our clients now hire AI remote workers instead of us.”',
    when: (w) => at(w, 'cheap_remote_worker'),
    basis: ai2027('July 2027: The Cheap Remote Worker (remote office work automated)'),
  },
  {
    id: 'v_delhi',
    region: 'cn',
    place: 'India',
    text: 'A diplomat in New Delhi: “Someone has to get Washington and Beijing to the table.”',
    when: (w) => w.zone === 'rupture' && w.aiPower >= 55,
    basis: cfg('Arms race, Ending B (Multipolar world: “The UK and India quickly jump in to lead diplomatic efforts”)'),
  },
  {
    id: 'v_hsinchu',
    region: 'cn',
    place: 'Taiwan',
    text: 'A chip engineer in Hsinchu: “Every drill feels a little closer.”',
    when: (w) => w.zone === 'rupture',
    basis: cfg('Arms race (US intelligence: China preparing to invade Taiwan in 2029); AI 2027, February 2027'),
  },
  {
    id: 'v_seoul',
    region: 'cn',
    place: 'South Korea',
    text: 'A chipmaker in Seoul: “Both sides want our memory chips. We can’t refuse either.”',
    when: (w) => w.zone !== 'pause' && w.aiPower >= 40,
    basis: cfg('Arms race (“Control over chips becomes a geopolitical weapon”)'),
  },
  {
    id: 'v_abu_dhabi',
    region: 'cn',
    place: 'the UAE',
    text: 'An investor in Abu Dhabi: “We pay for the data centres. Europe argues about them.”',
    when: (w) => w.aiPower >= 30,
    basis: cfg('Plateau (new AI projects “often backed by private funds from the Middle East”)'),
  },
];
