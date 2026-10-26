// Simulate seeded games per strategy and print the ending distribution, checked against the targets of
// docs/V3_SPEC.md ("Validation"). Run with: npm run sim   (100 games a strategy: the default and the cap, unless
// the owner asks for a long pass, e.g. npm run sim -- 2000)
// Only some strategies: npm run sim -- 100 thoughtful,home-first   (the targets that need a missing strategy are
// skipped). Same seeds, so a strategy's numbers match a longer run's first N games.

import { ENDINGS, ENDING_BY_ID } from '../src/data/endings';
import { TUNING } from '../src/data/tuning';
import type { CardId, EndingId, Pace } from '../src/engine/types';
import { STRATEGIES, playGame, type PlayedGame } from './strategies';

const N = Number(process.argv[2]) || 100;
const ONLY = process.argv[3]?.split(',').filter(Boolean);
const RUN = ONLY ? STRATEGIES.filter((st) => ONLY.includes(st.name)) : STRATEGIES;
const pct = (x: number, n: number) => `${((100 * x) / Math.max(1, n)).toFixed(1)}%`;
const isGood = (g: PlayedGame) => ENDING_BY_ID[g.final.ending!].good;
const best = new Map<EndingId, number>();
const share = new Map<string, number>();
const all = new Map<string, PlayedGame[]>();

for (const strat of RUN) {
  const res: PlayedGame[] = [];
  for (let i = 0; i < N; i++) res.push(playGame(1000 + i, strat));
  all.set(strat.name, res);
  const goods = res.filter(isGood).length;
  share.set(strat.name, goods / N);
  console.log(`\n=== ${strat.name} (${N} games) ===`);
  console.log(`good endings: ${pct(goods, N)}`);
  for (const p of ['slow', 'steady', 'fast'] as Pace[]) {
    const sub = res.filter((x) => x.final.pace === p);
    const tipped = sub.filter((x) => x.final.tipping);
    const avg = tipped.length ? (tipped.reduce((a, x) => a + x.final.tipping!.round, 0) / tipped.length).toFixed(1) : '-';
    console.log(`  ${p.padEnd(6)} ${String(sub.length).padStart(5)} games · tipping ${pct(tipped.length, sub.length).padStart(6)} (avg round ${avg}) · good ${pct(sub.filter(isGood).length, sub.length)}`);
  }
  const minTip = Math.min(...res.filter((x) => x.final.tipping).map((x) => x.final.tipping!.round));
  console.log(`earliest tipping point: round ${Number.isFinite(minTip) ? minTip : '-'}`);
  console.log('endings:');
  for (const e of ENDINGS) {
    const k = res.filter((x) => x.final.ending === e.id).length;
    best.set(e.id, Math.max(best.get(e.id) ?? 0, k / N));
    console.log(`  ${(e.good ? '+ ' : '- ') + e.title.padEnd(26)} ${pct(k, N).padStart(6)}`);
  }
  const plays = new Map<CardId, number>();
  for (const x of res) for (const p of x.plays) plays.set(p, (plays.get(p) ?? 0) + 1);
  const total = [...plays.values()].reduce((a, b) => a + b, 0);
  console.log(`cards (${(total / N).toFixed(1)} per game): ${[...plays].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, total)}`).join(', ')}`);
  const avg = (f: (x: PlayedGame) => number) => (res.reduce((a, x) => a + f(x), 0) / N).toFixed(1);
  console.log(
    `at the end: Cooperation ${avg((x) => x.final.finalCooperation ?? x.final.cooperation)} · Confidence true ${avg((x) => x.final.confidence.truth)} / shown ${avg((x) => x.final.confidence.estimate)} ± ${avg((x) => x.final.confidence.margin)} · Cohesion ${avg((x) => x.final.cohesion)} · Influence left ${avg((x) => x.final.influence)} · short of Influence ${avg((x) => x.shortages)}×`,
  );
  const reqs = res.map((x) => x.requests);
  const margins = res.map((x) => x.final.confidence.margin).sort((a, b) => a - b);
  const q = (p: number) => margins[Math.floor(p * (N - 1))];
  console.log(
    `requests: ${avg((x) => x.requests)} a game (${Math.min(...reqs)}–${Math.max(...reqs)}) · AI safety uncertainty at the end p50 ${q(0.5)} / p90 ${q(0.9)}, at the cap (${TUNING.confidence.maxMargin}) ${pct(margins.filter((m) => m >= TUNING.confidence.maxMargin).length, N)}`,
  );
  const ev = (id: string) => res.filter((x) => x.final.threats[id as 'theft'].struck);
  const fl = (f: string) => pct(res.filter((x) => x.final.flags.includes(f)).length, N);
  console.log(`turning points: memo ${fl('memo_public')} · pause call ${fl('pause_call')} · committee slows down ${fl('committee_slowdown')} / races ${fl('committee_race')} · chip-tool ban ${fl('chip_ban_done')} · Taiwan ${fl('taiwan_done')} · open-model ban ${fl('open_ban_done')}`);
  console.log(
    `threats struck (prepared): ${['theft', 'opaque', 'incident', 'ransomware', 'blackmail', 'bio'].map((t) => `${t} ${pct(ev(t).length, N)} (${pct(ev(t).filter((x) => x.final.threats[t as 'theft'].prepared).length, Math.max(1, ev(t).length))})`).join(', ')}`,
  );
}

console.log('\n=== reachability (best share across strategies) ===');
for (const e of ENDINGS) console.log(`  ${e.title.padEnd(26)} ${pct(best.get(e.id) ?? 0, 1)}`);

const th = all.get('thoughtful') ?? [];
const plays = new Map<string, number>();
for (const x of th) for (const p of x.plays) plays.set(p, (plays.get(p) ?? 0) + 1);
const total = [...plays.values()].reduce((a, b) => a + b, 0);
const [topCard, topN] = [...plays].sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
const earliest = Math.min(...RUN.flatMap((st) => all.get(st.name)!.filter((x) => x.final.tipping).map((x) => x.final.tipping!.round)));
const g = (n: string) => share.get(n) ?? NaN;
const reqCounts = RUN.flatMap((st) => all.get(st.name)!.map((x) => x.requests));
const thMargins = th.map((x) => x.final.confidence.margin).sort((a, b) => a - b);
const thMedianMargin = thMargins[Math.floor((thMargins.length - 1) / 2)];
/** [target, passed, value, strategies it needs] */
const allChecks: [string, boolean, string, string[]][] = [
  ['passive good endings < 15%', g('passive') < 0.15, pct(g('passive'), 1), ['passive']],
  ['random good endings 15–30%', g('random') >= 0.15 && g('random') <= 0.3, pct(g('random'), 1), ['random']],
  ['thoughtful good endings 55–80%', g('thoughtful') >= 0.55 && g('thoughtful') <= 0.8, pct(g('thoughtful'), 1), ['thoughtful']],
  ['every ending ≥ 2% for some strategy', ENDINGS.every((e) => (best.get(e.id) ?? 0) >= 0.02), ENDINGS.filter((e) => (best.get(e.id) ?? 0) < 0.02).map((e) => e.id).join(', ') || 'all', ['*']],
  ['cooperation-only clearly worse than thoughtful (−20 pts)', g('thoughtful') - g('cooperation-only') >= 0.2, `${pct(g('cooperation-only'), 1)} vs ${pct(g('thoughtful'), 1)}`, ['cooperation-only', 'thoughtful']],
  ['home-first (no diplomacy) clearly worse than thoughtful (−15 pts)', g('thoughtful') - g('home-first') >= 0.15, `${pct(g('home-first'), 1)} vs ${pct(g('thoughtful'), 1)}`, ['home-first', 'thoughtful']],
  ['thoughtful: no card above 20% of its plays', topN / total <= 0.2, `${topCard} ${pct(topN, total)}`, ['thoughtful']],
  ['saver (Influence kept for bursts) clearly worse than thoughtful (−10 pts)', g('thoughtful') - g('saver') >= 0.1, `${pct(g('saver'), 1)} vs ${pct(g('thoughtful'), 1)}`, ['saver', 'thoughtful']],
  ['6–10 requests a game (≥ 99.5% of games)', reqCounts.filter((n) => n >= 6 && n <= 10).length >= 0.995 * reqCounts.length, `${pct(reqCounts.filter((n) => n >= 6 && n <= 10).length, reqCounts.length)} (${Math.min(...reqCounts)}–${Math.max(...reqCounts)})`, []],
  ['thoughtful: AI safety uncertainty at the end ≤ 30 (median)', thMedianMargin <= 30, `±${thMedianMargin}`, ['thoughtful']],
  [`tipping point never before round ${TUNING.earliestTipping}`, earliest >= TUNING.earliestTipping, `earliest round ${earliest}`, []],
];
const checks = allChecks.filter(([, , , need]) => need.every((n) => (n === '*' ? !ONLY : share.has(n))));
console.log(`\n=== targets ===${ONLY ? ` (quick run, ${allChecks.length - checks.length} skipped)` : ''}`);
for (const [name, ok, v] of checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} ${v}`);
