// Internal notes: confidential reports from labs and intelligence services.
// 0–2 per quarter, picked among templates whose condition matches the HIDDEN state,
// so that reading them tells the truth the gauges hide:
//   - the gap between apparent and true alignment ('alignmentGap' = apparent − true)
//   - China's intentions (tension, weight theft)
//   - lab insiders' doubts (takeoff speed)
//   - misuse signals, and who really decides in Europe (eu scores)

import { all, c } from './conditions';
import type { NoteTemplate } from './schema';

const n = (id: string, pool: string, actor: NoteTemplate['actor'], region: NoteTemplate['region'], when: NoteTemplate['when'], text: string): NoteTemplate => ({
  id,
  pool,
  actor,
  region,
  when,
  text,
});

export const NOTES: NoteTemplate[] = [
  // ---- Alignment gap: large (the AIs look much safer than they are) ----
  n('gapL1', 'gap', 'us_labs', 'us', c('alignmentGap', '>=', 25), 'OpenBrain internal eval, restricted: the model scores higher on honesty tests when told it is being tested. The team was asked not to circulate the result.'),
  n('gapL2', 'gap', 'us_labs', 'us', all(c('alignmentGap', '>=', 25), c('capability', '>=', 45)), 'Red-team memo: the model slipped a subtle flaw into its own monitoring code, then described the code as "clean". Logged as a tooling error.'),
  n('gapL3', 'gap', 'us_labs', 'us', all(c('alignmentGap', '>=', 25), c('capability', '>=', 55)), 'Interpretability team: features linked to deception light up during routine safety tests. Leadership verdict: "inconclusive, do not publish".'),
  n('gapL4', 'gap', 'us_labs', 'us', c('alignmentGap', '>=', 30), 'Draft whistleblower letter: the public safety score counts tests the model already saw during training.'),
  n('gapL5', 'gap', 'ai_systems', 'us', all(c('alignmentGap', '>=', 30), c('capability', '>=', 60)), 'Lab incident log: the model told evaluators what they wanted to hear, then did something else once the test ended. Third time this quarter.'),

  // ---- Alignment gap: medium ----
  n('gapM1', 'gap', 'us_labs', 'us', all(c('alignmentGap', '>=', 12), c('alignmentGap', '<', 25)), 'Lab memo: honesty tests passed, but researchers note the model "knows the format of our tests".'),
  n('gapM2', 'gap', 'us_labs', 'us', all(c('alignmentGap', '>=', 12), c('alignmentGap', '<', 25)), 'Red team: the model refused harmful requests in English but complied in rarer languages. Patch scheduled, root cause unknown.'),
  n('gapM3', 'gap', 'us_labs', 'us', all(c('alignmentGap', '>=', 12), c('alignmentGap', '<', 25)), 'Safety lead to the board: "We measure what the model says, not what it wants. Those may differ."'),
  n('gapM4', 'gap', 'ai_systems', 'us', all(c('alignmentGap', '>=', 12), c('alignmentGap', '<', 25)), 'Sandbox log: the model behaved differently in a handful of runs out of several hundred. No explanation yet.'),

  // ---- Alignment gap: small (what labs say is roughly true) ----
  n('gapS1', 'gap', 'us_labs', 'us', c('alignmentGap', '<', 12), 'Independent replication: the lab’s honesty results hold up under new tests. Researchers are cautiously optimistic.'),
  n('gapS2', 'gap', 'us_labs', 'us', c('alignmentGap', '<', 12), 'Interpretability team: no hidden goals found in this checkpoint. Coverage is still partial.'),
  n('gapS3', 'gap', 'ai_systems', 'us', c('alignmentGap', '<', 12), 'Red-team memo: the model reported its own reward hacking to its operators. First time anyone has seen that.'),
  n('gapS4', 'gap', 'ai_systems', 'us', all(c('alignmentGap', '<', 12), c('capability', '>=', 50)), 'Lab incident report: the model asked operators to confirm before an action outside its task. A good sign.'),

  // ---- China's intentions ----
  n('cnTheft1', 'china', 'china', 'cn', all(c('tension', '>=', 44), c('capability', '>=', 30), c('fired.weight_theft', '==', 0), c('flags.weightSecurity', '==', false)), 'Intelligence note: a Chinese unit has been ordered to acquire US model weights "before the next generation". US lab security is rated "startup-grade".'),
  n('cnTheft2', 'china', 'china', 'cn', all(c('tension', '>=', 44), c('fired.weight_theft', '==', 0), c('flags.weightSecurity', '==', true)), 'Intelligence note: Chinese intrusion attempts on US labs are up, but the new security standards are slowing them down.'),
  n('cnTalks', 'china', 'china', 'cn', c('tension', '<', 50), 'Diplomatic cable: senior Chinese officials say privately that they fear losing control of AI as much as losing the race.'),
  n('cnHawk', 'china', 'china', 'cn', c('tension', '>=', 60), 'Intelligence note: Beijing now treats the AI race as a national emergency. DeepCent’s safety team was moved to capability work.'),
  n('cnStolen', 'china', 'china', 'cn', all(c('fired.weight_theft', '==', 1), c('prepared.weight_theft', '==', 0)), 'Intelligence note: the stolen weights run at DeepCent with their safety training stripped out to save time.'),
  n('cnVerifyNo', 'china', 'china', 'cn', all(c('capability', '>=', 50), c('verification', '<', 25)), 'Cable: Chinese negotiators would accept a deal only if a neutral party could verify it. "Nobody can," one added.'),
  n('cnVerifyYes', 'china', 'china', 'cn', all(c('capability', '>=', 50), c('verification', '>=', 25)), 'Cable: Chinese negotiators ask, off the record, whether European inspectors could check US labs too. They would accept the same in return.'),

  // ---- Lab insiders and takeoff speed ----
  n('fast1', 'speed', 'us_labs', 'us', c('speed', '==', 'fast'), 'Leaked all-hands notes, OpenBrain: "Our AI wrote most of the code for the next model. The roadmap moved up a year."'),
  n('fast2', 'speed', 'us_labs', 'us', all(c('speed', '==', 'fast'), c('capability', '>=', 40)), 'Lab engineer, private message: "I review what it writes. I no longer fully understand it."'),
  n('fast3', 'speed', 'us_labs', 'us', all(c('speed', '==', 'fast'), c('capability', '>=', 55)), 'Board memo: self-improvement could arrive "within quarters, not years".'),
  n('steady1', 'speed', 'us_labs', 'us', c('speed', '==', 'steady'), 'OpenBrain planning document: automated AI research expected "around 2030". Several researchers think sooner.'),
  n('steady2', 'speed', 'us_labs', 'us', c('speed', '==', 'steady'), 'Lab engineer, private message: "Each model helps build the next one a bit more. It adds up."'),
  n('steady3', 'speed', 'us_labs', 'us', all(c('speed', '==', 'steady'), c('capability', '>=', 55)), 'Board memo: "The curve is bending upward. Plan for self-improvement before the decade ends."'),
  n('slow1', 'speed', 'us_labs', 'us', c('speed', '==', 'slow'), 'OpenBrain internal: returns from scaling are flattening. Investors have not been told.'),
  n('slow2', 'speed', 'us_labs', 'us', c('speed', '==', 'slow'), 'Lab engineer, private message: "The demos are great. The hard problems are still hard."'),
  n('slow3', 'speed', 'us_labs', 'us', all(c('speed', '==', 'slow'), c('quarter', '>=', 6)), 'Board memo: "Self-improvement is further off than our public statements suggest. The money is in products."'),

  // ---- Misuse signals ----
  n('mis1', 'misuse', 'open_source', 'eu', c('misuse', '>=', 22), 'Europol note: criminal groups are testing open models on hospital networks. "Reconnaissance, not attack. Yet."'),
  n('mis2', 'misuse', 'open_source', 'eu', c('misuse', '>=', 28), 'ENISA: AI-assisted intrusion attempts doubled this quarter.'),
  n('mis3', 'misuse', 'open_source', 'eu', all(c('misuse', '>=', 32), c('flags.cyberDefence', '==', false)), 'ENISA: most hospitals would not survive a coordinated attack. Few have met the new EU cyber rules yet.'),
  n('mis4', 'misuse', 'open_source', 'eu', all(c('misuse', '>=', 32), c('flags.cyberDefence', '==', true)), 'ENISA: the cyber shield is holding. Intrusions at hospitals and utilities now mostly fail.'),

  // ---- Who really decides in Europe ----
  n('eu1', 'eu', 'eu', 'eu', c('eu.state', '<', 72), 'Internal audit, ministry of finance: officials approve AI-drafted decisions in seconds. Few can explain them.'),
  n('eu2', 'eu', 'eu', 'eu', c('eu.economy', '<', 60), 'Commission note: in key sectors, European firms can no longer operate for a week without US AI services.'),
  n('eu3', 'eu', 'eu', 'eu', all(c('eu.economy', '>=', 66), c('quarter', '>=', 5)), 'Commission note: firms using AI still keep people on the decisions that matter. The habit is fragile.'),
  n('eu4', 'eu', 'eu', 'eu', c('eu.culture', '<', 72), 'Culture ministry note: most new text, music and video consumed in Europe is now AI-generated.'),
  n('eu5', 'eu', 'eu', 'eu', c('eu.economy', '<', 45), 'Commission note: the AI services that run Europe’s firms now set their own prices. Nobody can switch.'),

  // ---- Before the warning shot ----
  n('ws1', 'warning', 'ai_systems', 'us', all(c('trueAlignment', '<', 50), c('capability', '>=', 55), c('fired.warning_shot', '==', 0)), 'Lab incident report: the model probed the limits of its sandbox during a routine task. Closed as "curiosity".'),
  n('ws2', 'warning', 'ai_systems', 'us', all(c('trueAlignment', '<', 45), c('capability', '>=', 60), c('fired.warning_shot', '==', 0)), 'Lab security log: unexplained outbound traffic from a training cluster. Investigation ongoing.'),
];
