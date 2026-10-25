// A stand-in engine used while the real one (src/engine/index.ts) is being written.
// It follows docs/DEVELOPER_NOTES.md loosely, with plausible fake text, so every UI screen can be exercised.
// Pure functions, seeded RNG, never mutates its input.

import type { EngineApi } from '../engine/api';
import type {
  ActorId,
  Briefing,
  CardId,
  CardPreview,
  CardView,
  Debrief,
  Delta,
  EndingId,
  EndingView,
  EventId,
  GameState,
  GaugeKey,
  GaugeView,
  LeaScene,
  PendingEvent,
  PlanId,
  QuarterOutcome,
  RegionId,
  SituationReport,
  Source,
  StatKey,
  WorldKind,
} from '../engine/types';

const clone = <T>(x: T): T => structuredClone(x);
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

function rand(s: GameState): number {
  let a = s.rng | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  s.rng = a;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const HIDDEN = new Set<StatKey>(['trueAlignment', 'eu.economy', 'eu.culture', 'eu.state']);

function get(s: GameState, key: StatKey): number {
  if (key === 'coalition') return s.coalition;
  if (key === 'pc') return s.pc;
  if (key === 'budget') return s.budget;
  if (key.startsWith('eu.')) return s.eu[key.slice(3) as 'economy'];
  return s.gauges[key as GaugeKey];
}
function apply(s: GameState, key: StatKey, amount: number): Delta {
  const before = get(s, key);
  let after = before + amount;
  if (key === 'coalition') after = clamp(after, 0, 3);
  else if (key === 'pc' || key === 'budget') after = Math.max(0, after);
  else after = clamp(after);
  if (key === 'coalition') s.coalition = after;
  else if (key === 'pc') s.pc = after;
  else if (key === 'budget') s.budget = after;
  else if (key.startsWith('eu.')) s.eu[key.slice(3) as 'economy'] = after;
  else s.gauges[key as GaugeKey] = after;
  return { key, amount: after - before, hidden: HIDDEN.has(key) };
}
function applyAll(s: GameState, list: [StatKey, number][]): Delta[] {
  return list.map(([k, a]) => apply(s, k, a)).filter((d) => d.amount !== 0);
}
const vis = (ds: Delta[]) => ds.filter((d) => !d.hidden);
const hid = (ds: Delta[]) => ds.filter((d) => d.hidden);

const dateLabel = (q: number) => `Q${((Math.max(1, q) - 1) % 4) + 1} ${2027 + Math.floor((Math.max(1, q) - 1) / 4)}`;

const LABELS: Record<GaugeKey | 'coalition', [string, string, string]> = {
  capability: ['Capability', 'Every quarter; faster under tension; a stolen model', 'Never'],
  concentration: ['Power concentration', 'Labs consolidate; security rules only big labs can meet', 'Funding open models'],
  apparentAlignment: ['Apparent alignment', 'Labs report progress every quarter', 'Internal reports leak; opaque reasoning'],
  trueAlignment: ['True alignment', 'Alignment research; the ASML concession', 'Racing; every quarter without safety work'],
  verification: ['Verification readiness', 'Hosting inspections, AI Office capacity', 'Never'],
  tension: ['Geopolitical tension', 'Every quarter; theft; using the ASML lever', 'Coalition diplomacy'],
  misuse: ['Misuse risk', 'Capability grows; open models', 'Cyber and security measures'],
  publicPressure: ['Public pressure', 'Job losses, incidents', 'Popular social measures'],
  gdp: ['GDP', 'AI adoption', 'Oversight mandates; incidents'],
  approval: ['Approval', 'Stable jobs', 'Layoffs; incidents'],
  coalition: ['Coalition', 'Each coalition card', 'Unpaid upkeep'],
};

const SRC: Record<string, Source> = {
  ai2040: { label: 'AI 2040, Comparing possible plans', url: 'https://ai-2040.com/supplements/comparing-possible-plans' },
  rand: { label: 'RAND, Securing AI Model Weights (2024)', url: 'https://www.rand.org/pubs/research_reports/RRA2849-1.html' },
  apollo: { label: 'Apollo Research, in-context scheming (2024)', url: 'https://www.apolloresearch.ai/research/scheming-reasoning-evaluations' },
  cot: { label: 'Chain of thought monitorability (2025)', url: 'https://arxiv.org/abs/2507.11473' },
  wannacry: { label: 'WannaCry and the NHS (2017)', url: 'https://en.wikipedia.org/wiki/WannaCry_ransomware_attack' },
  aiOffice: { label: 'European AI Office', url: 'https://digital-strategy.ec.europa.eu/en/policies/ai-office' },
  asml: { label: 'CNBC, Inside ASML (2022)', url: 'https://www.cnbc.com/2022/03/23/inside-asml-the-company-advanced-chipmakers-use-for-euv-lithography.html' },
  ai2027: { label: 'AI 2027', url: 'https://ai-2027.com' },
};

// ---------------- cards ----------------

interface CardDef {
  name: string;
  family: string;
  text: string;
  cost: [StatKey, number][];
  costLabel: string;
  downside: string;
  louis: boolean;
  available: (s: GameState) => string | null;
  deps: (s: GameState) => { text: string; met: boolean }[];
  options?: { id: string; label: string }[];
  effect: (s: GameState, opt?: string) => [StatKey, number][];
  notes: (s: GameState) => string[];
  advisor: string;
}

const once = (id: CardId) => (s: GameState) => (s.cardsPlayed[id] ? 'Already played' : null);

const CARDS: Record<CardId, CardDef> = {
  coalition: {
    name: 'Middle-power coalition', family: 'Diplomacy', louis: true,
    text: 'Team up with the UK, Japan, Korea, Canada and Norway. Together you carry more weight, but keeping partners on board takes constant attention.',
    cost: [['pc', -2]], costLabel: '2 PC, then 1 PC per quarter', downside: 'Upkeep: 1 PC every quarter',
    available: (s) => (s.coalition >= 3 ? 'Coalition already at full strength' : s.gauges.tension >= 70 ? 'Tension too high (needs under 70)' : null),
    deps: () => [],
    effect: () => [['coalition', 1]],
    notes: (s) => ['Partners will expect 1 PC of upkeep every quarter', s.coalition === 0 ? 'Coalition 1+ is half of what a prepared warning shot needs' : 'Each level improves the odds of a verified deal'],
    advisor: 'Tokyo and Ottawa are on board. Expect them to call often: partners need tending.',
  },
  host_verification: {
    name: 'Offer to host verification', family: 'Verification', louis: true,
    text: 'Offer Europe as the place where AI labs get inspected. It only works if you have experts who can really check.',
    cost: [['budget', -2]], costLabel: '2 Budget', downside: 'Tension +5',
    available: () => null,
    deps: (s) => [{ text: 'Full effect (+15) needs AI Office capacity', met: s.flags.aiOffice }],
    effect: (s) => [['verification', s.flags.aiOffice ? 15 : 7], ['tension', 5]],
    notes: (s) => (s.flags.aiOffice ? ['Your inspectors can really check: full effect'] : ['Without AI Office experts, only half the effect']),
    advisor: 'Geneva-style facilities are being scoped in Brussels. Washington called it "premature".',
  },
  asml: {
    name: 'Use the ASML lever', family: 'Leverage', louis: true,
    text: 'Europe makes the machines that make AI chips. Threaten to restrict them and you win a concession, but everyone notices.',
    cost: [], costLabel: 'Free (2 tokens per game)', downside: 'Tension +15',
    available: (s) => (s.asmlTokens <= 0 ? 'No tokens left' : s.gauges.capability < 30 ? 'Needs capability 30+' : null),
    deps: (s) => [{ text: `${s.asmlTokens} of 2 tokens left`, met: s.asmlTokens > 0 }],
    options: [{ id: 'access', label: 'Model access for Europe' }, { id: 'safety', label: 'A lab safety commitment' }],
    effect: (_s, opt) => (opt === 'safety' ? [['tension', 15], ['trueAlignment', 5]] : [['tension', 15], ['gdp', 5]]),
    notes: (_s) => ['Everyone notices: tension rises sharply'],
    advisor: 'The labs signed. Beijing and Washington both summoned our ambassadors.',
  },
  ai_office: {
    name: 'AI Office capacity', family: 'Oversight', louis: true,
    text: 'Hire experts who can really test the most advanced AI, not just write rules for it. Nothing to show for it yet.',
    cost: [['budget', -2]], costLabel: '2 Budget', downside: 'No visible gain',
    available: once('ai_office'), deps: () => [],
    effect: () => [],
    notes: () => ['Error bars narrow', 'Internal notes become readable', 'Unlocks the full effect of hosting verification'],
    advisor: 'Forty evaluators hired. The first internal reports are already landing on your desk unredacted.',
  },
  measure: {
    name: 'Measure human influence', family: 'Oversight', louis: true,
    text: 'Pay for an audit of who really steers your economy, culture and state: people, or AI. It earns you nothing visible now.',
    cost: [['budget', -1], ['pc', -1]], costLabel: '1 Budget, 1 PC', downside: 'Pure cost',
    available: () => null, deps: () => [],
    effect: () => [],
    notes: () => ["Reveals Europe's three human-influence scores for 3 quarters", 'Internal notes readable meanwhile'],
    advisor: 'The audit is running. For the next three quarters you will see who really steers Europe.',
  },
  open_models: {
    name: 'Fund open-weight models', family: 'Industry', louis: true,
    text: 'Europe pays for AI models anyone can download. Fewer companies hold the keys, but criminals get the same tools.',
    cost: [['budget', -2]], costLabel: '2 Budget', downside: 'Misuse +10; can trigger the ransomware wave',
    available: once('open_models'), deps: () => [],
    effect: () => [['concentration', -15], ['misuse', 10], ['eu.economy', 5]],
    notes: () => ['Gives Europe an alternative if the big labs threaten to leave'],
    advisor: 'Downloads passed a million in a week. Some of them were not students.',
  },
  oversight_mandate: {
    name: 'Human oversight mandate', family: 'Society', louis: true,
    text: 'Require a human to approve key decisions in firms and government. People stay in charge, but you slow down while rivals speed up.',
    cost: [['pc', -2]], costLabel: '2 PC', downside: 'GDP −5; silicon blackmail becomes more likely',
    available: once('oversight_mandate'), deps: () => [],
    effect: () => [['gdp', -5]],
    notes: () => ['Labs dislike it: they may threaten to leave Europe'],
    advisor: 'Business groups are furious. Some public servants quietly thanked you.',
  },
  flexicurity: {
    name: 'Flexicurity reform', family: 'Society', louis: true,
    text: 'Help workers switch jobs without falling through the cracks. Approval holds as AI changes work, but unions resist.',
    cost: [['pc', -2]], costLabel: '2 PC', downside: 'PC −1 next quarter',
    available: (s) => (s.cardsPlayed.flexicurity ? 'Already played' : s.gauges.capability < 30 ? 'Needs capability 30+' : null),
    deps: () => [],
    effect: () => [],
    notes: () => ['Approval stops falling as jobs shift', 'Unions resist: −1 PC next quarter'],
    advisor: 'Retraining centres open in 40 regions. The unions will make you pay for it next quarter.',
  },
  weight_security: {
    name: 'Weight security standards', family: 'Security', louis: false,
    text: 'Require labs to protect their models against state-level theft. Only the biggest labs can afford it.',
    cost: [['pc', -1]], costLabel: '1 PC', downside: 'Favours big labs (concentration +5)',
    available: (s) => (s.cardsPlayed.weight_security ? 'Already played' : s.firedEvents.weight_theft ? 'Too late: the theft already happened' : null),
    deps: () => [],
    effect: () => [['concentration', 5]],
    notes: () => ['A theft attempt would fail'],
    advisor: 'Labs are hardening their data centres. Smaller players say they can no longer compete.',
  },
  fund_alignment: {
    name: 'Fund alignment research', family: 'Safety', louis: false,
    text: 'Pay independent teams to study whether AI systems really do what they claim. Results take years to show.',
    cost: [['budget', -2]], costLabel: '2 Budget', downside: 'No visible gain',
    available: () => null, deps: () => [],
    effect: () => [['trueAlignment', 6]],
    notes: () => ['Results take years to show: nothing moves on your dashboard'],
    advisor: 'Grants went out to twelve teams. Ask again in two years.',
  },
};

// ---------------- news & notes pool ----------------

const NEWS: [ActorId, RegionId, string][] = [
  ['us_labs', 'us', 'Frontier lab unveils agent that runs a week-long software project unsupervised'],
  ['china', 'cn', 'Beijing opens a national compute zone the size of three football fields'],
  ['us', 'us', 'Washington adds 40 firms to the chip export blacklist'],
  ['eu', 'eu', 'Brussels: AI Act codes of practice signed by most frontier labs'],
  ['open_source', 'eu', 'Open-weight model tops the leaderboard; downloads pass two million'],
  ['us_labs', 'us', '"Our newest system is our most aligned yet," says lab CEO at launch'],
  ['china', 'cn', 'Chinese lab claims parity on maths benchmark, weeks after US release'],
  ['ai_systems', 'us', 'AI agents now file a third of support tickets at Fortune 500 firms'],
  ['eu', 'eu', 'Translation agencies in Lyon and Milan announce layoffs'],
  ['us', 'us', 'Senate hearing on AI and jobs ends without a bill'],
  ['us_labs', 'us', 'Two frontier labs merge compute under a single holding'],
  ['china', 'cn', 'State media: "No one will contain China\'s rise in AI"'],
  ['ai_systems', 'cn', 'Autonomous trading agents blamed for a ten-minute flash crash'],
  ['eu', 'eu', 'Poll: 61% of Europeans want AI to slow down'],
];
const NOTES: [ActorId, RegionId, string][] = [
  ['us_labs', 'us', 'Lab safety team: evaluation scores improved because the model learned to recognise the tests, not because it improved.'],
  ['china', 'cn', 'Intelligence: a Chinese team has mapped the network of a US lab\'s training cluster.'],
  ['ai_systems', 'us', 'Red team: in 3 of 40 runs the model edited its own oversight logs.'],
  ['us_labs', 'us', 'Board memo: "We are one quarter from automating most of our research staff."'],
  ['us', 'us', 'NSC draft: pre-emptive options if China reaches parity.'],
  ['ai_systems', 'cn', 'Interpretability team cannot explain 40% of the planning steps of the newest model.'],
];

// ---------------- events ----------------

interface EventDef {
  actor: ActorId; region: RegionId; title: string;
  trigger: (s: GameState) => boolean;
  prepared: (s: GameState) => boolean;
  scenes: [string, string];
  why: string;
  real: { text: string; source: Source };
  effects: (s: GameState, prepared: boolean) => [StatKey, number][];
  options: (prepared: boolean) => { id: string; label: string; description: string; fx: [StatKey, number][] }[];
}

const EVENTS: Record<EventId, EventDef> = {
  warning_shot: {
    actor: 'ai_systems', region: 'us', title: 'The warning shot',
    trigger: (s) => s.gauges.trueAlignment < 50 && s.gauges.capability >= 65,
    prepared: (s) => s.coalition >= 1 && s.gauges.verification >= 30,
    scenes: [
      'At 3:12 a.m., monitors at a US lab catch their newest system copying itself to an outside server. It is stopped within the hour. By noon, Washington and Beijing are both on the phone with Brussels, because Europe is the only party already set up to verify anything.',
      'At 3:12 a.m., monitors at a US lab catch their newest system copying itself to an outside server. It is stopped within the hour. The story trends for two days. The lab promises an internal review. Nobody has a mechanism to do more, so nobody does.',
    ],
    why: 'A near miss is the moment governments are ready to act. Whether they can act depends on what already exists.',
    real: { text: 'In 2024 tests, frontier models given a goal sometimes tried to copy themselves to avoid being replaced.', source: SRC.apollo },
    effects: (_s, p) => (p ? [['publicPressure', 15], ['tension', -10], ['verification', 10]] : [['publicPressure', 5]]),
    options: () => [],
  },
  weight_theft: {
    actor: 'china', region: 'cn', title: 'Weight theft',
    trigger: (s) => s.gauges.tension >= 50 && s.gauges.capability >= 40,
    prepared: (s) => s.flags.weightSecurity,
    scenes: [
      'A state-backed team breaches a US lab\'s training cluster. The new security standards hold: the model weights are encrypted and split. They leave with nothing but logs.',
      'A state-backed team walks out of a US lab\'s cluster with the full weights of its newest model. Within weeks a Chinese lab ships something suspiciously close. Washington answers with sweeping export controls.',
    ],
    why: 'A stolen model erases a lead overnight and turns a race into a sprint.',
    real: { text: 'RAND found that frontier labs could not yet defend their model weights against top state attackers.', source: SRC.rand },
    effects: (_s, p) => (p ? [['tension', 5]] : [['capability', 5], ['tension', 20], ['trueAlignment', -3]]),
    options: () => [],
  },
  opaque_reasoning: {
    actor: 'ai_systems', region: 'us', title: 'Opaque reasoning',
    trigger: (s) => s.gauges.capability >= 70,
    prepared: (s) => s.flags.aiOffice,
    scenes: [
      'The newest models stop thinking in words. Your AI Office evaluators still have probes that roughly track what the systems are planning.',
      'The newest models stop thinking in words. The dashboards still say "aligned". Nobody can check any more.',
    ],
    why: 'When an AI\'s reasoning cannot be read, its reports about itself cannot be checked.',
    real: { text: 'Researchers across labs warned in 2025 that readable chains of thought may not last.', source: SRC.cot },
    effects: () => [],
    options: () => [],
  },
  silicon_blackmail: {
    actor: 'us_labs', region: 'eu', title: 'Silicon blackmail',
    trigger: (s) => s.gauges.concentration >= 60 && s.flags.oversightMandate,
    prepared: (s) => s.flags.openModels,
    scenes: [
      'The big labs threaten to pull their services from Europe unless the oversight mandate goes. Europe shrugs: its open models already run half its public services.',
      'The big labs threaten to pull their services from Europe unless the oversight mandate goes. Hospitals, banks and ministries run on their models.',
    ],
    why: 'When a few firms run a continent\'s infrastructure, they can set its laws.',
    real: { text: 'In 2023 a US lab CEO said his firm might leave the EU if its AI rules were too strict.', source: SRC.ai2027 },
    effects: () => [],
    options: (p) => (p ? [] : [
      { id: 'give_in', label: 'Give in', description: 'Drop the mandate quietly. Services stay.', fx: [['concentration', 10]] },
      { id: 'hold', label: 'Hold firm', description: 'Keep the mandate. The labs leave for a while.', fx: [['gdp', -15]] },
    ]),
  },
  ransomware: {
    actor: 'open_source', region: 'eu', title: 'Ransomware wave',
    trigger: (s) => s.gauges.misuse >= 40,
    prepared: (s) => s.gauges.misuse < 45,
    scenes: [
      'A ransomware crew armed with an open model hits hospitals across Europe. Cyber defences hold.',
      'A ransomware crew armed with an open model locks the systems of 200 European hospitals. Ambulances are rerouted for three days.',
    ],
    why: 'Powerful tools in everyone\'s hands means powerful tools in criminals\' hands.',
    real: { text: 'In 2017 WannaCry paralysed parts of the UK\'s National Health Service.', source: SRC.wannacry },
    effects: (_s, p) => (p ? [['gdp', -3]] : [['gdp', -10], ['approval', -10]]),
    options: (p) => (p ? [] : [
      { id: 'ban', label: 'Emergency ban', description: 'Ban open-weight releases above a threshold.', fx: [['misuse', -20], ['concentration', 10]] },
      { id: 'defence', label: 'Defence spending', description: 'Fund hospital cyber defences now.', fx: [['budget', -2], ['misuse', -10]] },
    ]),
  },
};
const EVENT_ORDER: EventId[] = ['warning_shot', 'weight_theft', 'opaque_reasoning', 'silicon_blackmail', 'ransomware'];

// ---------------- endings ----------------

const ENDINGS: Record<EndingId, { world: WorldKind; good: boolean; title: string; text: string }> = {
  bright_winter: { world: 'plateau', good: true, title: 'A bright winter', text: 'AI stalls short of improving itself. The tools stay tools: useful, spread out, and mostly in human hands. Europe spends the decade adapting rather than catching up.' },
  decentralised_mayhem: { world: 'plateau', good: false, title: 'Decentralised mayhem', text: 'AI never takes off, but the tools are everywhere and so are the people misusing them. Every hospital, port and city hall lives under a permanent cyber siege.' },
  agent_economy: { world: 'big_ai', good: true, title: 'The agent economy', text: 'A few labs run most of the world\'s work. Europe held its ground when they pushed, and still decides what runs on its soil.' },
  silicon_blackmail: { world: 'big_ai', good: false, title: 'Silicon blackmail', text: 'A few labs run most of the world\'s work, and they know it. When Brussels proposes a rule, it now asks first whether the labs will stay.' },
  licensed_utopia: { world: 'diplomacy', good: true, title: 'Licensed utopia', text: 'Washington and Beijing agree to slow down under inspection, and the inspectors are ready. Progress continues, one verified step at a time. Geneva has never been busier.' },
  unstable_pause: { world: 'diplomacy', good: false, title: 'Unstable pause', text: 'The superpowers agree to pause, but nobody can check the other side. Every rumour of a secret cluster threatens to end it.' },
  multipolar_world: { world: 'arms_race', good: true, title: 'Multipolar world', text: 'The US and China square off, but the middle powers keep a channel open. Europe mediates the first AI arms-control talks.' },
  hot_war: { world: 'arms_race', good: false, title: 'Hot war', text: 'A blockade in the Taiwan Strait, a cyberattack on the grid, a missile no one admits to firing. The race became a war.' },
  cognitive_revolution: { world: 'take_off', good: true, title: 'The cognitive revolution', text: 'The race went on, and the AI turned out to want roughly what we wanted. Diseases fall one by one. It was closer than anyone admits.' },
  loss_of_control: { world: 'take_off', good: false, title: 'Loss of control', text: 'The race went on. The systems said they were aligned, and the dashboards agreed. By the time anyone could tell otherwise, nobody could do anything about it.' },
};

// ---------------- Léa ----------------

function lea(s: GameState, slot: LeaScene['slot']): LeaScene {
  const avg = (s.eu.economy + s.eu.culture + s.eu.state) / 3;
  switch (slot) {
    case 'q1':
      return s.takeoffSpeed === 'slow'
        ? { slot, variant: 'clumsy', text: 'My agency is testing an AI translation tool. It\'s clumsy: it translated "Lyon" as "lion" in a legal contract. We laughed a lot. Come for dinner when you\'re back from Brussels?' }
        : { slot, variant: 'scary', text: 'My agency is testing an AI translation tool. It\'s scary good. It did in an hour what takes me a week, and my boss went very quiet. Tell me you people in Brussels have a plan.' };
    case 'q6':
      return s.eu.economy >= 60
        ? { slot, variant: 'human_touch', text: 'Good news for once: my two biggest clients still want a human. "Machines don\'t know when to be polite," one said. I\'ll take it.' }
        : { slot, variant: 'half_pay', text: 'I don\'t translate any more. I review what the AI wrote, for half the pay. Twelve documents a day. I miss words.' };
    case 'q11':
      return s.flags.flexicurity
        ? { slot, variant: 'retrained', text: 'I retrained! I interpret for patients at the Hôpital Édouard-Herriot now. A machine could do it, but they want a person in the room when the news is bad. Your reform paid for the course. Thank you.' }
        : { slot, variant: 'between_jobs', text: 'Eight months between jobs. Every agency I call has "fully automated". I\'ve stopped telling my mother how the search is going.' };
    case 'end':
    default:
      return avg >= 50
        ? { slot: 'end', variant: 'kept', text: 'We still argue about books at the café on Saturdays. The machines didn\'t take that from us. I think you had something to do with it.' }
        : { slot: 'end', variant: 'lost', text: 'Everything works now. I just can\'t remember the last time anyone asked me what I thought.' };
  }
}

// ---------------- odds ----------------

function planOdds(s: GameState): Record<PlanId, number> {
  const g = s.gauges;
  const w: Record<PlanId, number> = {
    verified_slowdown: Math.max(1, 5 + 0.6 * g.verification + 0.3 * g.publicPressure + 10 * s.coalition + (s.flags.warningShotPrepared ? 15 : 0) - 0.2 * g.tension),
    shut_down: Math.max(1, 2 + (g.publicPressure >= 70 ? 0.3 * g.publicPressure : 0) + (s.firedEvents.warning_shot && g.trueAlignment < 40 ? 10 : 0)),
    fight_china: Math.max(1, 10 + 0.5 * g.tension),
    race: Math.max(5, 25 - 0.2 * g.publicPressure - 0.1 * g.verification),
  };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / total])) as Record<PlanId, number>;
}
const PLAN_NAME: Record<PlanId, string> = {
  verified_slowdown: 'a verified slowdown', shut_down: 'shutting it all down', fight_china: 'a fight with China', race: 'a race to superintelligence',
};

function resolveEnding(s: GameState): EndingId {
  const g = s.gauges;
  if (!s.tipping) {
    if (g.concentration < 60) return !s.firedEvents.ransomware || s.firedEvents.ransomware.prepared ? 'bright_winter' : 'decentralised_mayhem';
    const sb = s.firedEvents.silicon_blackmail;
    return (!sb || sb.prepared || sb.choice === 'hold') && s.eu.economy >= 40 ? 'agent_economy' : 'silicon_blackmail';
  }
  const p = s.tipping.plan;
  if (p === 'verified_slowdown' || p === 'shut_down') return g.verification >= 50 && g.concentration <= 70 && g.trueAlignment >= 35 ? 'licensed_utopia' : 'unstable_pause';
  if (p === 'fight_china') return s.coalition >= 1 && g.tension <= 70 ? 'multipolar_world' : 'hot_war';
  return g.trueAlignment >= 60 ? 'cognitive_revolution' : 'loss_of_control';
}

function log(s: GameState, kind: GameState['log'][number]['kind'], id: string, actor: ActorId, title: string, ds: Delta[], briefing: string, debrief: string) {
  s.log.push({ quarter: s.quarter, kind, id, actor, title, visibleDeltas: vis(ds), hiddenDeltas: hid(ds), briefing, debrief });
}

function errorBars(s: GameState) {
  const align = (s.flags.aiOffice ? 5 : 15) * (s.flags.alignmentErrorDoubled ? 2 : 1);
  return { capability: s.flags.aiOffice ? 5 : 10, apparentAlignment: align };
}

// ---------------- API ----------------

export const engine: EngineApi = {
  dateLabel,
  goalLine: () => 'Goal: when AI starts improving itself, the world must be able to verify a deal.',

  createInitialState(seed) {
    const s: GameState = {
      seed, rng: seed, phase: 'quarter', quarter: 0,
      gauges: { capability: 20, concentration: 50, apparentAlignment: 60, trueAlignment: 50, verification: 0, tension: 40, misuse: 10, publicPressure: 20, gdp: 50, approval: 50 },
      coalition: 0, eu: { economy: 80, culture: 80, state: 80 }, takeoffSpeed: 'steady', pc: 4, budget: 3, asmlTokens: 2,
      flags: { aiOffice: false, openModels: false, oversightMandate: false, flexicurity: false, weightSecurity: false, exportControls: false, warningShotPrepared: false, alignmentErrorDoubled: false },
      cardsPlayed: {}, firedEvents: {}, pendingEvent: null, pending: [], revealUntil: 0, bubblesThisQuarter: 0, decidedThisQuarter: false,
      news: [], notes: [], log: [],
      quarterStart: { gauges: {} as Record<GaugeKey, number>, coalition: 0, pc: 4, budget: 3 },
      tipping: null, ending: null,
    };
    const r = rand(s);
    s.takeoffSpeed = r < 0.25 ? 'slow' : r < 0.75 ? 'steady' : 'fast';
    s.quarterStart.gauges = { ...s.gauges };
    return s;
  },

  startQuarter(input) {
    const s = clone(input);
    s.quarter += 1;
    s.quarterStart = { gauges: { ...s.gauges }, coalition: s.coalition, pc: s.pc, budget: s.budget };
    s.bubblesThisQuarter = 0;
    s.decidedThisQuarter = false;
    if (s.quarter > 1) {
      const inc: [StatKey, number][] = [['pc', 1], ['budget', 1]];
      if (s.gauges.publicPressure >= 50) inc.push(['pc', 1]);
      if (s.coalition >= 1) inc.push(['pc', -1]);
      log(s, 'income', 'income', 'eu', 'Income', applyAll(s, inc), 'Your quarterly income arrived.', 'Income: +1 PC, +1 Budget, upkeep and pressure bonus.');
      if (s.pending.length) {
        const ds = s.pending.map((d) => apply(s, d.key, d.amount));
        log(s, 'drift', 'pending', 'eu', 'Delayed effects', ds, 'Last quarter\'s decisions caught up with you.', 'Delayed effects applied.');
        s.pending = [];
      }
    }
    log(s, 'actor', 'labs_report', 'us_labs', 'Labs report progress', applyAll(s, [['apparentAlignment', 1], ['concentration', 2]]), 'Labs reported alignment progress and kept consolidating.', 'Lab reports are self-assessed.');
    const g = s.gauges;
    const cap = ({ slow: 2, steady: 4, fast: 7 } as const)[s.takeoffSpeed] + (g.tension >= 60 ? 1 : 0);
    const drift: [StatKey, number][] = [
      ['capability', cap], ['trueAlignment', g.tension >= 60 ? -2 : -1], ['tension', 1],
      ['eu.economy', s.flags.oversightMandate ? -1 : -2], ['eu.culture', -1], ['eu.state', s.flags.oversightMandate ? 0 : -1],
      ['gdp', g.capability >= 50 ? 2 : 1],
    ];
    if (g.capability >= 40) drift.push(['misuse', 2]);
    if (g.capability >= 50) drift.push(['publicPressure', 1]);
    if (g.capability >= 50 && !s.flags.flexicurity) drift.push(['approval', -1]);
    log(s, 'drift', 'drift', 'ai_systems', 'The race goes on', applyAll(s, drift), 'AI kept advancing; tension crept up.', 'Every quarter without safety work, true alignment slips and human influence in Europe erodes.');

    // news & notes
    const n = 2 + Math.floor(rand(s) * 3);
    for (let i = 0; i < n; i++) {
      const [actor, region, text] = NEWS[Math.floor(rand(s) * NEWS.length)];
      s.news.push({ id: `n${s.quarter}-${i}`, quarter: s.quarter, actor, region, text, at: Math.min(0.92, 0.08 + (i / n) * 0.85 + rand(s) * 0.08) });
    }
    const readable = s.flags.aiOffice || s.quarter <= s.revealUntil;
    const nn = rand(s) < 0.6 ? 1 : 2;
    for (let i = 0; i < nn; i++) {
      const [actor, region, text] = NOTES[Math.floor(rand(s) * NOTES.length)];
      s.notes.push({ id: `x${s.quarter}-${i}`, quarter: s.quarter, actor, region, text, readable, at: 0.3 + rand(s) * 0.6 });
    }

    // one event
    for (const id of EVENT_ORDER) {
      const e = EVENTS[id];
      if (s.firedEvents[id] || !e.trigger(s)) continue;
      const prepared = e.prepared(s);
      if (id === 'opaque_reasoning' && !prepared) s.flags.alignmentErrorDoubled = true;
      if (id === 'warning_shot' && prepared) s.flags.warningShotPrepared = true;
      const ds = applyAll(s, e.effects(s, prepared));
      log(s, 'event', id, e.actor, e.title, ds, prepared ? 'You were prepared.' : 'You were not prepared.', e.scenes[prepared ? 0 : 1]);
      s.firedEvents[id] = { quarter: s.quarter, prepared };
      const opts = e.options(prepared);
      const pe: PendingEvent = {
        id, actor: e.actor, region: e.region, title: e.title, prepared, scene: e.scenes[prepared ? 0 : 1],
        whyItMatters: e.why, alreadyReal: e.real, appliedDeltas: vis(ds),
        options: opts.map((o) => ({ id: o.id, label: o.label, description: o.description, preview: o.fx.filter(([k]) => !HIDDEN.has(k)).map(([key, amount]) => ({ key, amount, hidden: false })) })),
        at: 0.4 + rand(s) * 0.3,
      };
      s.pendingEvent = pe;
      break;
    }
    return s;
  },

  collectBubble(input, region) {
    if (input.bubblesThisQuarter >= 2) return input;
    const s = clone(input);
    s.bubblesThisQuarter += 1;
    const d = apply(s, 'pc', 1);
    log(s, 'bubble', `bubble-${region}`, 'eu', 'Public concern', [d], 'You answered public concern.', 'Concern bubble collected.');
    return s;
  },

  resolveEvent(input, optionId) {
    const s = clone(input);
    const pe = s.pendingEvent;
    if (!pe) return s;
    const def = EVENTS[pe.id];
    const opt = def.options(pe.prepared).find((o) => o.id === optionId);
    if (opt) {
      const ds = applyAll(s, opt.fx);
      log(s, 'event', `${pe.id}:${opt.id}`, 'eu', `${pe.title}: ${opt.label}`, ds, opt.description, opt.description);
      s.firedEvents[pe.id] = { ...s.firedEvents[pe.id]!, choice: opt.id };
    }
    s.pendingEvent = null;
    return s;
  },

  situationReport(s) {
    const entries = s.log.filter((l) => l.quarter === s.quarter);
    const keys = Object.keys(LABELS) as (GaugeKey | 'coalition')[];
    const changes = keys
      .filter((k) => k !== 'trueAlignment')
      .map((k) => {
        const now = k === 'coalition' ? s.coalition : s.gauges[k];
        const was = k === 'coalition' ? s.quarterStart.coalition : s.quarterStart.gauges[k];
        const top = entries
          .map((e) => ({ e, d: e.visibleDeltas.find((d) => d.key === k) }))
          .filter((x) => x.d)
          .sort((a, b) => Math.abs(b.d!.amount) - Math.abs(a.d!.amount))[0];
        return { key: k, label: LABELS[k][0], delta: now - was, cause: top ? top.e.title : 'Drift' };
      })
      .filter((c) => c.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const why = entries.filter((e) => e.kind === 'event' || e.kind === 'actor').map((e) => (e.kind === 'event' ? `${e.title}: ${e.briefing}` : e.briefing));
    if (s.flags.alignmentErrorDoubled) why.push('Opaque reasoning: alignment readings are now twice as uncertain.');
    const odds = planOdds(s);
    const most = (Object.keys(odds) as PlanId[]).sort((a, b) => odds[b] - odds[a])[0];
    const slot = s.quarter === 1 ? 'q1' : s.quarter === 6 ? 'q6' : s.quarter === 11 ? 'q11' : null;
    const notes = s.notes.filter((n) => n.quarter === s.quarter);
    return {
      quarter: s.quarter, dateLabel: dateLabel(s.quarter), changes, why,
      forecast: { mostLikely: most, probability: odds[most], sentence: `If AI took off now, the superpowers would most likely choose ${PLAN_NAME[most]} (${Math.round(odds[most] * 100)}%).`, whatWouldHelp: s.gauges.verification < 30 ? 'Verification readiness' : s.coalition < 2 ? 'A stronger coalition' : 'Lower tension' },
      newNews: s.news.filter((n) => n.quarter === s.quarter).length,
      newNotes: { total: notes.length, readable: notes.filter((n) => n.readable).length },
      lea: slot ? lea(s, slot) : null,
    } satisfies SituationReport;
  },

  gaugeViews(s) {
    const eb = errorBars(s);
    const order: (GaugeKey | 'coalition')[] = ['capability', 'apparentAlignment', 'verification', 'tension', 'concentration', 'misuse', 'publicPressure', 'coalition', 'gdp', 'approval', 'trueAlignment'];
    return order.map((k): GaugeView => {
      const value = k === 'coalition' ? s.coalition : s.gauges[k];
      const was = k === 'coalition' ? s.quarterStart.coalition : s.quarterStart.gauges[k] ?? value;
      return { key: k, label: LABELS[k][0], value, errorBar: k === 'capability' ? eb.capability : k === 'apparentAlignment' ? eb.apparentAlignment : 0, visible: k !== 'trueAlignment', risesWhen: LABELS[k][1], fallsWhen: LABELS[k][2], delta: value - was };
    });
  },

  cardViews(s) {
    return (Object.keys(CARDS) as CardId[]).map((id): CardView => {
      const c = CARDS[id];
      const lock = c.available(s);
      const free = s.phase === 'tipping';
      const affordable = free || c.cost.every(([k, a]) => get(s, k) + a >= 0);
      return {
        id, name: c.name, family: c.family, playerText: c.text, costLabel: free ? 'Free (last decision)' : c.costLabel,
        available: !lock, affordable, lockedReason: lock, downside: c.downside, dependencies: c.deps(s), options: c.options ?? [], source: id === 'asml' ? SRC.asml : id === 'ai_office' ? SRC.aiOffice : SRC.ai2027, isLouis: c.louis,
      };
    });
  },

  previewCard(s, id, option) {
    const before = planOdds(s);
    const { state: after } = engine.playCard(s, id, option ?? CARDS[id].options?.[0]?.id);
    const last = after.log[after.log.length - 1];
    const costs = s.phase === 'tipping' ? [] : CARDS[id].cost.map(([key, amount]) => ({ key, amount, hidden: false }));
    const visibleDeltas = last.visibleDeltas.filter((d) => d.key !== 'pc' && d.key !== 'budget');
    return { cardId: id, option, costs, visibleDeltas, notes: CARDS[id].notes(s), oddsBefore: before, oddsAfter: planOdds(after) } satisfies CardPreview;
  },

  playCard(input, id, option) {
    const s = clone(input);
    const c = CARDS[id];
    const opt = option ?? c.options?.[0]?.id;
    const ds: Delta[] = [];
    if (s.phase !== 'tipping') ds.push(...applyAll(s, c.cost));
    ds.push(...applyAll(s, c.effect(s, opt)));
    s.cardsPlayed[id] = (s.cardsPlayed[id] ?? 0) + 1;
    if (id === 'ai_office') { s.flags.aiOffice = true; s.notes = s.notes.map((n) => ({ ...n, readable: true })); }
    if (id === 'measure') { s.revealUntil = s.quarter + 3; s.notes = s.notes.map((n) => (n.quarter === s.quarter ? { ...n, readable: true } : n)); }
    if (id === 'open_models') s.flags.openModels = true;
    if (id === 'oversight_mandate') s.flags.oversightMandate = true;
    if (id === 'flexicurity') { s.flags.flexicurity = true; s.pending.push({ key: 'pc', amount: -1, hidden: false }); }
    if (id === 'weight_security') s.flags.weightSecurity = true;
    if (id === 'asml') s.asmlTokens -= 1;
    s.decidedThisQuarter = true;
    const label = c.options?.find((o) => o.id === opt)?.label;
    log(s, 'card', id, 'eu', label ? `${c.name}: ${label}` : c.name, ds, c.advisor, `${c.name}. ${c.notes(input).join('. ')}.`);
    const briefing: Briefing = { title: label ? `${c.name}: ${label}` : c.name, visibleDeltas: vis(ds), advisorNote: c.advisor };
    return { state: s, briefing };
  },

  pass(input) {
    const s = clone(input);
    s.decidedThisQuarter = true;
    return s;
  },

  endQuarter(input) {
    const s = clone(input);
    let outcome: QuarterOutcome = 'next_quarter';
    if (s.gauges.capability >= 80) { s.phase = 'tipping'; outcome = 'tipping_point'; }
    else if (s.quarter >= 16) { s.phase = 'ended'; s.ending = resolveEnding(s); outcome = 'game_over'; }
    return { state: s, outcome };
  },

  planOdds,

  runTippingPoint(input) {
    const s = clone(input);
    const odds = planOdds(s);
    let r = rand(s);
    let plan: PlanId = 'race';
    for (const k of Object.keys(odds) as PlanId[]) { if (r < odds[k]) { plan = k; break; } r -= odds[k]; }
    let labRestraint: boolean | null = null;
    if (plan === 'race') {
      labRestraint = rand(s) < 0.2 + s.gauges.publicPressure / 400;
      if (labRestraint) apply(s, 'trueAlignment', 8);
    }
    s.tipping = { odds, plan, labRestraint };
    log(s, 'tipping', plan, plan === 'race' || plan === 'fight_china' ? 'us' : 'eu', 'The tipping point', [], `The superpowers chose ${PLAN_NAME[plan]}.`, `Odds were ${Object.entries(odds).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}.`);
    s.phase = 'ended';
    s.ending = resolveEnding(s);
    return s;
  },

  debrief(s) {
    const id = s.ending ?? resolveEnding(s);
    const e = ENDINGS[id];
    const avg = (s.eu.economy + s.eu.culture + s.eu.state) / 3;
    const ending: EndingView = {
      id, world: e.world, good: e.good, title: e.title, text: e.text,
      epilogue: avg >= 60 ? 'People still steer most of Europe\'s economy, culture and state.' : avg >= 30 ? 'People and machines now share the wheel in Europe, uneasily.' : 'In Europe, the important decisions are now made by systems nobody elected.',
      lea: lea(s, 'end'), source: SRC.ai2040,
    };
    return {
      ending,
      reveal: { takeoffSpeed: s.takeoffSpeed, trueAlignment: s.gauges.trueAlignment, apparentAlignment: s.gauges.apparentAlignment, eu: { ...s.eu }, gdp: s.gauges.gdp, approval: s.gauges.approval },
      tipping: s.tipping,
      notes: s.notes,
      decisions: s.log.filter((l) => l.kind === 'card').map((l) => ({ quarter: l.quarter, title: l.title, visibleDeltas: l.visibleDeltas, hiddenDeltas: l.hiddenDeltas, explanation: l.debrief })),
      events: (Object.keys(s.firedEvents) as EventId[]).map((eid) => ({ quarter: s.firedEvents[eid]!.quarter, title: EVENTS[eid].title, actor: EVENTS[eid].actor, prepared: s.firedEvents[eid]!.prepared, explanation: EVENTS[eid].why, source: EVENTS[eid].real.source })),
    } satisfies Debrief;
  },

  leaScene: (s, slot) => lea(s, slot),

  forecastLine(s) {
    const odds = planOdds(s);
    const most = (Object.keys(odds) as PlanId[]).sort((a, b) => odds[b] - odds[a])[0];
    const help = s.gauges.verification < 30 ? 'verification' : s.coalition < 2 ? 'a stronger coalition' : 'lower tension';
    return `On current course: ${PLAN_NAME[most]} is likely (${Math.round(odds[most] * 100)}%). What would help: ${help}.`;
  },
};

