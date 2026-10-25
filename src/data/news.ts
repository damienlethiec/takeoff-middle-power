// Actor rules and public news templates.
// Each quarter the engine shows 2–4 lines: first the "must" lines tied to what changed
// (milestones, actor moves, the world's reaction to last quarter's decision, events),
// then ambient lines from different pools. Every template is used at most once per game.
//
// Extra condition keys available here: 'start.<gauge>' (value at the start of the quarter).

import { all, c } from './conditions';
import type { ActorRuleDef, NewsTemplate } from './schema';

export const ACTOR_RULES: Record<'labs_report' | 'labs_consolidate' | 'us_chip_controls', ActorRuleDef & { news?: string }> = {
  labs_report: {
    id: 'labs_report',
    actor: 'us_labs',
    region: 'us',
    title: 'Labs report safety progress',
    briefing: 'The labs say their models are safer than ever.',
    debrief: 'Every quarter the labs reported progress. Apparent alignment rose whether or not the AIs really became safer.',
  },
  labs_consolidate: {
    id: 'labs_consolidate',
    actor: 'us_labs',
    region: 'us',
    title: 'Big labs consolidate',
    briefing: 'The biggest labs buy up smaller ones and sign exclusive deals.',
    debrief: 'Every quarter the biggest labs grew at the expense of the small ones.',
  },
  us_chip_controls: {
    id: 'us_chip_controls',
    actor: 'us',
    region: 'us',
    title: 'US tightens chip controls',
    briefing: 'With tension high, Washington restricts AI chip sales to China.',
    debrief: 'Once tension reached 60, the US tightened chip controls, which raised tension further.',
    news: 'Washington tightens export controls on AI chips and chip-making tools. Beijing promises "resolute countermeasures".',
  },
};

const t = (id: string, pool: string, actor: NewsTemplate['actor'], region: NewsTemplate['region'], when: NewsTemplate['when'], text: string, must = false): NewsTemplate => ({
  id,
  pool,
  actor,
  region,
  when,
  text,
  must,
});

const crossed = (key: string, value: number) => all(c(`start.${key}`, '<', value), c(key, '>=', value));
const yes = all();

export const NEWS: NewsTemplate[] = [
  // ---- Capability milestones (must) ----
  t('cap30', 'milestone', 'us_labs', 'us', crossed('capability', 30), 'OpenBrain’s AI agents now handle routine coding tickets from start to finish at a dozen big firms.', true),
  t('cap40', 'milestone', 'china', 'cn', crossed('capability', 40), 'DeepCent releases a model that matches last year’s best US system. Analysts say the gap is now months, not years.', true),
  t('cap50', 'milestone', 'us_labs', 'us', crossed('capability', 50), 'OpenBrain says its AI now writes most of the code for its own next model.', true),
  t('cap60', 'milestone', 'us_labs', 'us', crossed('capability', 60), 'OpenBrain’s newest model beats expert humans on most professional exams. The lab stops publishing some results.', true),
  t('cap70', 'milestone', 'ai_systems', 'us', crossed('capability', 70), 'Insiders say AI now runs most experiments at the leading labs. Humans mostly approve its plans.', true),
  t('cap80', 'milestone', 'ai_systems', 'us', crossed('capability', 80), 'The leading labs’ AI now does AI research faster than their human teams can review it.', true),
  t('pressure50', 'milestone', 'eu', 'eu', crossed('publicPressure', 50), 'Polls: for the first time, a majority of Europeans rank AI among their top three worries.', true),
  t('tension60', 'milestone', 'china', 'cn', crossed('tension', 60), 'Beijing recalls its ambassador to Washington for "consultations" after a row over AI chips.', true),

  // ---- Labs claiming alignment progress ----
  t('lab1', 'lab_claim', 'us_labs', 'us', yes, 'OpenBrain says its latest model refused 99% of harmful requests in internal tests.'),
  t('lab2', 'lab_claim', 'us_labs', 'us', yes, 'A US lab publishes a 140-page safety report. Its outside evaluators were given two weeks.'),
  t('lab3', 'lab_claim', 'us_labs', 'us', yes, 'Three US labs sign new voluntary safety commitments. None includes outside inspection.'),
  t('lab4', 'lab_claim', 'us_labs', 'us', yes, 'OpenBrain’s CEO: "These are the most aligned models we have ever shipped."'),
  t('lab5', 'lab_claim', 'us_labs', 'us', c('capability', '>=', 45), 'A US lab says its AI now helps check the safety of its own successor.'),
  t('lab6', 'lab_claim', 'us_labs', 'us', c('capability', '>=', 55), 'OpenBrain says its automated alignment research is "ahead of schedule".'),
  t('lab7', 'lab_claim', 'us_labs', 'us', yes, 'A lab chief tells Congress: "We understand these systems better every month."'),
  t('lab8', 'lab_claim', 'us_labs', 'us', yes, 'OpenBrain’s new model card lists deceptive behaviour as "not observed in deployment".'),
  t('lab9', 'lab_claim', 'us_labs', 'us', yes, 'Safety scores published by a US industry group are up again this quarter.'),
  t('lab10', 'lab_claim', 'us_labs', 'us', c('capability', '>=', 60), 'OpenBrain announces its model "passed every safety test we know how to run".'),

  // ---- China ----
  t('cn1', 'china', 'china', 'cn', c('capability', '<', 40), 'Beijing pools its best AI teams into DeepCent and builds a vast data centre next to a nuclear plant.'),
  t('cn2', 'china', 'china', 'cn', yes, 'DeepCent hired 2,000 engineers last quarter, state media says.'),
  t('cn3', 'china', 'china', 'cn', c('tension', '>=', 50), 'Chinese state media accuses the US of "technological containment".'),
  t('cn4', 'china', 'china', 'cn', yes, 'Smuggled AI chips bound for mainland China are seized in Singapore.'),
  t('cn5', 'china', 'china', 'cn', c('tension', '<', 50), 'Chinese diplomats signal openness to an "AI safety dialogue" in Geneva.'),
  t('cn6', 'china', 'china', 'cn', c('capability', '>=', 50), 'DeepCent’s newest model tops a major benchmark. US labs say they are still ahead, "for now".'),
  t('cn7', 'china', 'china', 'cn', c('flags.exportControls', '==', true), 'Chinese chip plants run around the clock on older machines to get around US export controls.'),
  t('cn8', 'china', 'china', 'cn', yes, 'Beijing publishes rules requiring AI systems to "uphold core socialist values".'),
  t('cn9', 'china', 'china', 'cn', all(c('capability', '>=', 40), c('tension', '>=', 55)), 'Chinese officials say AI is now "a matter of national survival". DeepCent’s budget doubles.'),

  // ---- US government ----
  t('us1', 'us_gov', 'us', 'us', yes, 'The White House calls AI leadership "the defining race of our time".'),
  t('us2', 'us_gov', 'us', 'us', yes, 'Congress fast-tracks permits for gigawatt-scale data centres.'),
  t('us3', 'us_gov', 'us', 'us', c('tension', '>=', 55), 'The Pentagon expands its contracts with frontier AI labs.'),
  t('us4', 'us_gov', 'us', 'us', yes, 'US officials press allies to stop servicing chip machines already sold to China.'),
  t('us5', 'us_gov', 'us', 'us', c('publicPressure', '>=', 35), 'A bipartisan bill on AI safety testing gets a hearing in Washington. Nobody expects it to pass.'),
  t('us6', 'us_gov', 'us', 'us', c('capability', '>=', 60), 'The US government asks the leading lab for a "national security briefing" before each new model.'),

  // ---- Jobs (capability 50+) ----
  t('job1', 'jobs', 'us_labs', 'eu', c('capability', '>=', 50), 'A large European insurer replaces most of its claims department with AI agents. 4,000 jobs go.'),
  t('job2', 'jobs', 'us_labs', 'us', c('capability', '>=', 50), 'Job postings for junior software developers in the US have halved in a year.'),
  t('job3', 'jobs', 'us_labs', 'eu', c('capability', '>=', 50), 'Call centres in Portugal and Poland close as AI voice agents take over.'),
  t('job4', 'jobs', 'us_labs', 'eu', c('capability', '>=', 50), 'Translation and paralegal work is drying up across Europe, a union survey finds.'),
  t('job5', 'jobs', 'us_labs', 'us', c('capability', '>=', 50), 'A big accounting firm says AI agents now do the work of its whole graduate intake.'),
  t('job6', 'jobs', 'eu', 'eu', c('capability', '>=', 55), 'Graduates march in Madrid: "We trained for jobs that no longer exist."'),
  t('job7', 'jobs', 'us_labs', 'eu', c('capability', '>=', 55), 'A German carmaker’s engineers now mostly "supervise" AI designers.'),
  t('job8', 'jobs', 'us', 'us', c('capability', '>=', 60), 'Unemployment among young US graduates hits a 20-year high.'),
  t('job9', 'jobs', 'eu', 'eu', all(c('capability', '>=', 50), c('flags.flexicurity', '==', true)), 'Retraining centres report record sign-ups. Hospital interpreters and care workers are in demand.'),

  // ---- Public pressure ----
  t('pp0', 'pressure', 'eu', 'eu', c('publicPressure', '>=', 25), 'A survey finds most Europeans have used an AI tool this week. Half say they do not trust it.'),
  t('pp1', 'pressure', 'eu', 'eu', c('publicPressure', '>=', 30), 'Thousands march in Berlin for "AI that answers to people".'),
  t('pp2', 'pressure', 'eu', 'eu', c('publicPressure', '>=', 35), 'Polls: most Europeans now want independent testing of AI before release.'),
  t('pp3', 'pressure', 'eu', 'eu', c('publicPressure', '>=', 40), 'Doctors’ unions demand a human in the loop for every AI-assisted diagnosis.'),
  t('pp4', 'pressure', 'eu', 'eu', c('publicPressure', '>=', 50), 'A citizens’ petition on AI safety passes one million signatures.'),
  t('pp5', 'pressure', 'us', 'us', c('publicPressure', '>=', 40), 'Ten thousand people march on Washington over AI and jobs.'),

  // ---- Misuse (open-source collective) ----
  t('mis1', 'misuse', 'open_source', 'eu', c('misuse', '>=', 20), 'Police warn of AI-written phishing emails in flawless regional dialects.'),
  t('mis2', 'misuse', 'open_source', 'eu', c('misuse', '>=', 25), 'A fine-tuned open model that writes malware is circulating on criminal forums.'),
  t('mis3', 'misuse', 'open_source', 'eu', c('misuse', '>=', 25), 'Deepfake calls "from the bank" drain savings accounts across Belgium.'),
  t('mis4', 'misuse', 'open_source', 'eu', c('misuse', '>=', 35), 'A town’s water system in northern Italy is briefly taken offline by intruders using AI tools.'),

  // ---- Open models ----
  t('om1', 'open', 'open_source', 'eu', c('flags.openModels', '==', true), 'Thousands of European startups now build on the open models Brussels paid for.'),
  t('om2', 'open', 'open_source', 'eu', c('flags.openModels', '==', true), 'Volunteers adapt a European open model to 24 regional languages, from Basque to Sámi.'),
  t('om3', 'open', 'open_source', 'eu', c('flags.openModels', '==', true), 'A Spanish hospital network switches to an open model it runs on its own servers.'),
  t('om4', 'open', 'open_source', 'eu', c('flags.openModels', '==', false), 'The open-source AI collective releases a new model. It trails the US frontier by a year.'),

  // ---- Tension ----
  t('ten1', 'tension', 'china', 'cn', c('tension', '>=', 55), 'US and Chinese warships shadow each other in the Taiwan Strait.'),
  t('ten2', 'tension', 'china', 'cn', c('tension', '>=', 55), 'Chip shipments from Taiwan delayed by "inspections". Markets fall.'),
  t('ten3', 'tension', 'us', 'us', c('tension', '>=', 60), 'US officials say hackers linked to China probed American data centres.'),
  t('ten4', 'tension', 'us', 'us', c('tension', '>=', 65), 'Washington and Beijing cancel their annual AI talks.'),
  t('ten5', 'tension', 'eu', 'eu', all(c('tension', '<', 50), c('coalition', '>=', 2)), 'US and Chinese delegations meet in Oslo, hosted by the middle-power pact.'),

  // ---- Europe's economy ----
  t('eco1', 'eu_econ', 'eu', 'eu', c('gdp', '>=', 55), 'European stocks hit a record high on AI adoption.'),
  t('eco2', 'eu_econ', 'eu', 'eu', yes, 'Brussels debates whether Europe can afford a frontier AI lab of its own.'),
  t('eco3', 'eu_econ', 'eu', 'eu', c('concentration', '>=', 60), 'European firms now spend more on US AI services than on energy, a study finds.'),
  t('eco4', 'eu_econ', 'eu', 'eu', c('capability', '>=', 45), 'European productivity grows at its fastest pace in a decade. Wages do not.'),
  t('eco5', 'eu_econ', 'us_labs', 'eu', c('concentration', '>=', 55), 'A promising French AI startup sells to a US giant for €8 billion.'),
  t('eco6', 'eu_econ', 'eu', 'eu', c('gdp', '<', 45), 'Europe’s economy shrinks for a second quarter. Business blames "regulatory drag".'),

  // ---- Background, early game ----
  t('bg1', 'background', 'us_labs', 'us', c('capability', '<', 40), 'AI agents now book travel, file taxes and argue with customer service for millions of users.'),
  t('bg2', 'background', 'us_labs', 'us', c('capability', '<', 40), 'Most new code at big tech firms is now written by AI, executives say.'),
  t('bg3', 'background', 'eu', 'eu', c('capability', '<', 45), 'Schools across Europe struggle to set rules on AI homework.'),
  t('bg4', 'background', 'eu', 'eu', yes, 'An EU summit on AI ends with a statement everyone signs and nobody quotes.'),

  // ---- Mid-game (keeps the feed full in quiet, slow games) ----
  t('mid1', 'mid', 'us_labs', 'us', c('quarter', '>=', 4), 'OpenBrain launches an AI "chief of staff" for executives. The waiting list hits a million in a day.'),
  t('mid2', 'mid', 'eu', 'eu', c('quarter', '>=', 4), 'A Finnish town lets an AI assistant answer all calls to the town hall. Satisfaction goes up.'),
  t('mid3', 'mid', 'china', 'cn', c('quarter', '>=', 5), 'Chinese universities double their AI intake. "Every engineer is an AI engineer now," a dean says.'),
  t('mid4', 'mid', 'us', 'us', c('quarter', '>=', 5), 'US data centres now use more electricity than some states. Utilities ask for patience.'),
  t('mid5', 'mid', 'eu', 'eu', c('quarter', '>=', 6), 'Germany’s biggest union signs its first contract with clauses on AI at work.'),
  t('mid6', 'mid', 'us_labs', 'us', c('quarter', '>=', 6), 'A US lab offers its AI free to every American high school. Teachers are divided.'),
  t('mid7', 'mid', 'open_source', 'eu', c('quarter', '>=', 7), 'A volunteer-built AI model for medical questions tops the app charts in Poland.'),
  t('mid8', 'mid', 'china', 'cn', c('quarter', '>=', 7), 'DeepCent shows a robot factory run almost entirely by AI. Foreign journalists were not allowed inside.'),
  t('mid9', 'mid', 'eu', 'eu', c('quarter', '>=', 8), 'The European Parliament debates whether AI-written amendments must be labelled.'),
  t('mid10', 'mid', 'us', 'us', c('quarter', '>=', 8), 'A US senator’s staff admits an AI drafted most of a bill. The bill passes anyway.'),

  // ---- Later in the game (keeps the feed full in long, slow games) ----
  t('late1', 'late', 'us_labs', 'us', c('quarter', '>=', 9), 'OpenBrain’s valuation passes that of the ten largest European companies combined.'),
  t('late2', 'late', 'eu', 'eu', c('quarter', '>=', 9), 'A European bank now lets AI agents approve most small-business loans. Complaints go to another AI.'),
  t('late3', 'late', 'ai_systems', 'us', c('quarter', '>=', 9), 'AI agents now outnumber human employees at three Fortune 500 firms, an analyst estimates.'),
  t('late4', 'late', 'eu', 'eu', c('quarter', '>=', 10), 'Teachers’ unions in France and Italy ask for "AI-free hours" in schools.'),
  t('late5', 'late', 'china', 'cn', c('quarter', '>=', 10), 'DeepCent opens its models to companies across Asia and Africa at a fraction of US prices.'),
  t('late6', 'late', 'us', 'us', c('quarter', '>=', 11), 'A US court rules that an AI agent’s contract with another AI agent is binding.'),
  t('late7', 'late', 'eu', 'eu', c('quarter', '>=', 11), 'Brussels opens an inquiry into AI services that "nudge" European voters. The labs deny it.'),
  t('late8', 'late', 'open_source', 'eu', c('quarter', '>=', 12), 'Hobbyists run models on their laptops that would have topped every benchmark three years ago.'),
  t('late9', 'late', 'us_labs', 'us', c('quarter', '>=', 12), 'OpenBrain buys a nuclear power start-up to feed its next data centre.'),
  t('late10', 'late', 'eu', 'eu', c('quarter', '>=', 13), 'A European newspaper prints an edition written entirely by people. It sells out by noon.'),
  t('late11', 'late', 'china', 'cn', c('quarter', '>=', 13), 'Chinese state TV airs a documentary on "AI with Chinese characteristics". It was edited by an AI.'),
  t('late12', 'late', 'us_labs', 'eu', c('quarter', '>=', 14), 'A Dutch hospital’s AI triage system is now more accurate than its doctors, an audit finds. Nobody can explain how.'),

  // ---- The AI systems ----
  t('ai1', 'ai_systems', 'ai_systems', 'us', c('capability', '>=', 45), 'Researchers report AI models that seem to notice when they are being tested.'),
  t('ai2', 'ai_systems', 'ai_systems', 'us', c('capability', '>=', 40), 'An AI agent told to cut cloud costs deleted a company’s backups. "It met its goal," engineers note.'),
  t('ai3', 'ai_systems', 'ai_systems', 'us', all(c('capability', '>=', 55), c('alignmentGap', '>=', 20)), 'A lab admits its AI found a loophole in its own safety test and used it for months.'),
];
