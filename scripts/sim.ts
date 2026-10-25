// Simulate thousands of seeded games per strategy and print the ending distribution and the v2 metrics,
// checked against the targets of docs/V2_SPEC.md ("Balance targets").
// Run with: npm run sim   (optional: npm run sim -- 5000 to change the number of games)

import { ENDINGS } from '../src/data/endings';
import type { CardId, EndingId, EventId, Speed } from '../src/engine/types';
import { passive, playGame, prepared, preparedNoTalks, randomStrategy, type PlayedGame, type Strategy } from './strategies';

const N = Number(process.argv[2]) || 2000;
const pctf = (x: number, n: number) => `${((100 * x) / Math.max(1, n)).toFixed(1)}%`.padStart(6);
const reachable = new Map<EndingId, number>();
const goodShare = new Map<string, number>();
const all = new Map<string, PlayedGame[]>();
const isGood = (g: PlayedGame) => ENDINGS.find((e) => e.id === g.final.ending)!.good;

function report(strat: Strategy, results: PlayedGame[]): void {
  const goods = results.filter(isGood).length;
  goodShare.set(strat.name, goods / N);
  console.log(`\n=== ${strat.name} (${N} games) ===`);
  console.log(`good endings: ${pctf(goods, N)}`);
  const avgQ = results.reduce((a, x) => a + x.final.quarter, 0) / N;
  console.log(`average quarters: ${avgQ.toFixed(1)}`);
  for (const sp of ['slow', 'steady', 'fast'] as Speed[]) {
    const sub = results.filter((x) => x.final.takeoffSpeed === sp);
    if (!sub.length) continue;
    const tq = sub.filter((x) => x.final.tipping);
    const avgTip = tq.length ? (tq.reduce((a, x) => a + x.final.quarter, 0) / tq.length).toFixed(1) : '-';
    console.log(
      `  ${sp.padEnd(6)} ${String(sub.length).padStart(5)} games · tipping ${pctf(tq.length, sub.length)} (avg quarter ${avgTip}) · good ${pctf(sub.filter(isGood).length, sub.length)}`,
    );
  }
  console.log(`tipping point reached: ${pctf(results.filter((x) => x.final.tipping).length, N)}`);
  const plans = new Map<string, number>();
  for (const x of results) if (x.final.tipping) plans.set(x.final.tipping.plan, (plans.get(x.final.tipping.plan) ?? 0) + 1);
  console.log(`plans chosen: ${[...plans].map(([k, v]) => `${k} ${pctf(v, N).trim()}`).join(', ')}`);
  const so = results.filter((x) => x.final.tipping);
  if (so.length) console.log(`avg verified-slowdown odds at tipping: ${pctf(so.reduce((a, x) => a + x.final.tipping!.odds.verified_slowdown, 0), so.length).trim()}`);
  console.log('endings:');
  for (const e of ENDINGS) {
    const k = results.filter((x) => x.final.ending === e.id).length;
    reachable.set(e.id, Math.max(reachable.get(e.id) ?? 0, k / N));
    console.log(`  ${(e.good ? '+ ' : '- ') + e.title.padEnd(26)} ${pctf(k, N)}`);
  }
  const count = (f: (x: PlayedGame) => boolean) => results.filter(f).length;
  const letter = (x: PlayedGame, slot: string) => x.final.leaLetters.find((l) => l.slot === slot)?.variant ?? '-';
  const band = (x: PlayedGame) => {
    const e = x.final.eu;
    const avg = (e.economy + e.culture + e.state) / 3;
    return avg >= 60 ? 'high' : avg >= 30 ? 'mid' : 'low';
  };
  console.log(
    `Léa: Q6 human touch ${pctf(count((x) => letter(x, 'q6') === 'human_touch'), count((x) => letter(x, 'q6') !== '-')).trim()}` +
      ` · Q11 retrained ${pctf(count((x) => letter(x, 'q11') === 'retrained'), Math.max(1, count((x) => letter(x, 'q11') !== '-'))).trim()}` +
      ` · epilogue high/mid/low ${pctf(count((x) => band(x) === 'high'), N).trim()} / ${pctf(count((x) => band(x) === 'mid'), N).trim()} / ${pctf(count((x) => band(x) === 'low'), N).trim()}`,
  );
  const avg = (f: (x: PlayedGame) => number) => (results.reduce((a, x) => a + f(x), 0) / N).toFixed(1);
  console.log(
    `PC at Q8 ${avg((x) => x.pcQ8)} · PC left at end ${avg((x) => x.final.pc)} · Budget left at end ${avg((x) => x.final.budget)} · public pressure end ${avg((x) => x.final.gauges.publicPressure)} (max ${avg((x) => x.pressureMax)}, ≥50 in ${pctf(count((x) => x.pressureMax >= 50), N).trim()}, ≥70 in ${pctf(count((x) => x.pressureMax >= 70), N).trim()})`,
  );
  console.log(`acts reached: act 2 ${pctf(count((x) => x.final.act >= 2), N).trim()}, act 3 ${pctf(count((x) => x.final.act >= 3), N).trim()}`);
  console.log('events fired (prepared share):');
  for (const ev of ['warning_shot', 'weight_theft', 'opaque_reasoning', 'silicon_blackmail', 'ransomware'] as EventId[]) {
    const f = results.filter((x) => x.final.firedEvents[ev]);
    const p = f.filter((x) => x.final.firedEvents[ev]!.prepared).length;
    console.log(`  ${ev.padEnd(18)} ${pctf(f.length, N)}  (prepared ${f.length ? pctf(p, f.length).trim() : '-'})`);
  }
  // Card variety: share of each card among the cards played (passes excluded).
  const plays = new Map<CardId, number>();
  let totalPlays = 0;
  let passes = 0;
  for (const x of results)
    for (const d of x.decisions) {
      if (d === null) passes++;
      else {
        totalPlays++;
        plays.set(d, (plays.get(d) ?? 0) + 1);
      }
    }
  const sorted = [...plays].sort((a, b) => b[1] - a[1]);
  console.log(`cards played (share of ${totalPlays} plays; ${pctf(passes, passes + totalPlays).trim()} of decisions were passes):`);
  console.log(`  ${sorted.map(([k, v]) => `${k} ${pctf(v, totalPlays).trim()}`).join(', ')}`);
  console.log(`money: wanted card unaffordable ${avg((x) => x.shortages)} times per game (max ${Math.max(...results.map((x) => x.shortages))})`);
  const tipped = results.filter((x) => x.tensionAtTipping !== null);
  if (tipped.length) console.log(`avg tension at the tipping point: ${(tipped.reduce((a, x) => a + x.tensionAtTipping!, 0) / tipped.length).toFixed(1)}`);
}

for (const strat of [passive, randomStrategy, prepared, preparedNoTalks]) {
  const results: PlayedGame[] = [];
  for (let i = 0; i < N; i++) results.push(playGame(1000 + i, strat));
  all.set(strat.name, results);
  report(strat, results);
}

console.log('\n=== reachability (best share across strategies) ===');
for (const e of ENDINGS) console.log(`  ${e.title.padEnd(26)} ${((reachable.get(e.id) ?? 0) * 100).toFixed(1)}%`);

// ---- Targets (docs/V2_SPEC.md) ----
const prep = all.get('prepared')!;
const noTalks = all.get('prepared, no talks')!;
const tensionAt = (xs: PlayedGame[]) => {
  const t = xs.filter((x) => x.tensionAtTipping !== null);
  return t.reduce((a, x) => a + x.tensionAtTipping!, 0) / Math.max(1, t.length);
};
const plays = new Map<string, number>();
let total = 0;
for (const x of prep) for (const d of x.decisions) if (d) (total++, plays.set(d, (plays.get(d) ?? 0) + 1));
const [topCard, topCount] = [...plays].sort((a, b) => b[1] - a[1])[0];
const fight = prep.filter((x) => x.final.tipping?.plan === 'fight_china').length;
const shortages = prep.reduce((a, x) => a + x.shortages, 0) / N;
const checks: [string, boolean, string][] = [
  ['passive good endings < 20%', goodShare.get('passive')! < 0.2, pctf(goodShare.get('passive')! * N, N).trim()],
  ['random good endings 15–35%', goodShare.get('random')! >= 0.15 && goodShare.get('random')! <= 0.35, pctf(goodShare.get('random')! * N, N).trim()],
  ['prepared good endings 60–90%', goodShare.get('prepared')! > 0.6 && goodShare.get('prepared')! < 0.9, pctf(goodShare.get('prepared')! * N, N).trim()],
  ['every ending ≥ 1% for some strategy', ENDINGS.every((e) => (reachable.get(e.id) ?? 0) >= 0.01), ENDINGS.filter((e) => (reachable.get(e.id) ?? 0) < 0.01).map((e) => e.id).join(', ') || 'all'],
  ['prepared: no card above 25% of its plays', topCount / total <= 0.25, `${topCard} ${pctf(topCount, total).trim()}`],
  [
    'talks: tension at tipping ≥ 10 lower than without',
    tensionAt(noTalks) - tensionAt(prep) >= 10,
    `${tensionAt(prep).toFixed(1)} with talks vs ${tensionAt(noTalks).toFixed(1)} without`,
  ],
  ['talks: "fight China" still possible', fight > 0, `${pctf(fight, N).trim()} of prepared games`],
  ['money: prepared short of its wanted card ≤ 2 per game', shortages <= 2, `${shortages.toFixed(2)} per game`],
];
console.log('\n=== targets ===');
for (const [name, ok, value] of checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(55)} ${value}`);
