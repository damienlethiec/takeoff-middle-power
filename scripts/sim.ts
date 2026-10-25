// Simulate thousands of seeded games per strategy and print the ending distribution.
// Run with: npm run sim   (optional: npm run sim -- 5000 to change the number of games)

import {
  createInitialState,
  startQuarter,
  collectBubble,
  resolveEvent,
  cardViews,
  playCard,
  pass,
  endQuarter,
  runTippingPoint,
  leaScene,
} from '../src/engine/index';
import { randomInt, pick, seedToRng, type RngHolder } from '../src/engine/rng';
import type { CardId, EndingId, EventId, GameState, PlanId, RegionId, Speed } from '../src/engine/types';
import { ENDINGS } from '../src/data/endings';

type Strategy = {
  name: string;
  bubbles: (s: GameState, r: RngHolder) => number;
  decide: (s: GameState, r: RngHolder) => { id: CardId; option?: string } | null;
  choose: (s: GameState, r: RngHolder) => string | undefined;
};

const REGIONS: RegionId[] = ['eu', 'us', 'cn'];

function playable(s: GameState): Set<CardId> {
  return new Set(cardViews(s).filter((c) => c.available && c.affordable).map((c) => c.id));
}

const passive: Strategy = {
  name: 'passive',
  bubbles: () => 0,
  decide: () => null,
  choose: (s) => s.pendingEvent?.options[0]?.id,
};

const randomStrategy: Strategy = {
  name: 'random',
  bubbles: (_s, r) => randomInt(r, 0, 2),
  decide: (s, r) => {
    const ok = [...playable(s)];
    if (!ok.length) return null;
    const id = pick(r, ok);
    const option = id === 'asml' ? pick(r, ['model_access', 'safety_commitment']) : undefined;
    return { id, option };
  },
  choose: (s, r) => (s.pendingEvent?.options.length ? pick(r, s.pendingEvent.options).id : undefined),
};

/** A sensible player: oversight first, then coalition, inspections, security, alignment, social measures. */
const prepared: Strategy = {
  name: 'prepared',
  // Concern bubbles spawn 1–3 per quarter; an attentive player clicks the ones that appear (max 2 count).
  bubbles: (_s, r) => Math.min(2, randomInt(r, 1, 3)),
  decide: (s) => {
    const ok = playable(s);
    const g = s.gauges;
    const played = (id: CardId) => (s.cardsPlayed[id] ?? 0) > 0;
    const want = (id: CardId, cond = true) => cond && ok.has(id);
    if (s.phase === 'tipping') {
      if (want('host_verification', g.verification < 60)) return { id: 'host_verification' };
      if (want('coalition')) return { id: 'coalition' };
      return want('fund_alignment') ? { id: 'fund_alignment' } : null;
    }
    // A slow world shows on the capability gauge: then the economy, not the tipping point, matters.
    const slowWorld = s.quarter >= 6 && g.capability <= 20 + 2.5 * s.quarter;
    if (want('ai_office')) return { id: 'ai_office' };
    if (want('coalition', s.coalition === 0)) return { id: 'coalition' };
    if (want('weight_security')) return { id: 'weight_security' };
    if (want('host_verification', g.verification < 30)) return { id: 'host_verification' };
    if (slowWorld && want('open_models')) return { id: 'open_models' };
    if (slowWorld && want('oversight_mandate', played('open_models'))) return { id: 'oversight_mandate' };
    if (want('coalition', s.coalition < 2)) return { id: 'coalition' };
    if (want('fund_alignment', (s.cardsPlayed.fund_alignment ?? 0) < 2)) return { id: 'fund_alignment' };
    if (want('host_verification', g.verification < 50)) return { id: 'host_verification' };
    if (want('flexicurity')) return { id: 'flexicurity' };
    if (want('fund_alignment')) return { id: 'fund_alignment' };
    return null;
  },
  choose: (s) => {
    const pe = s.pendingEvent;
    if (!pe || !pe.options.length) return undefined;
    if (pe.id === 'silicon_blackmail') return 'hold_firm';
    if (pe.id === 'ransomware') return s.budget >= 2 ? 'defence_spending' : 'emergency_ban';
    return pe.options[0].id;
  },
};

interface GameResult {
  ending: EndingId;
  good: boolean;
  quarters: number;
  tipping: boolean;
  plan: PlanId | null;
  speed: Speed;
  events: Partial<Record<EventId, { prepared: boolean }>>;
  slowdownOdds: number | null;
  leaQ6: string;
  leaQ11: string;
  band: 'high' | 'mid' | 'low';
}

function playGame(seed: number, strat: Strategy): GameResult {
  let s = createInitialState(seed);
  const r: RngHolder = { rng: seedToRng(seed * 7919 + 17) };
  let leaQ6 = '-';
  let leaQ11 = '-';
  for (let guard = 0; guard < 40; guard++) {
    s = startQuarter(s);
    if (s.quarter === 6) leaQ6 = leaScene(s, 'q6').variant;
    if (s.quarter === 11) leaQ11 = leaScene(s, 'q11').variant;
    const n = strat.bubbles(s, r);
    for (let i = 0; i < n; i++) s = collectBubble(s, pick(r, REGIONS));
    if (s.pendingEvent) s = resolveEvent(s, strat.choose(s, r));
    const d = strat.decide(s, r);
    s = d ? playCard(s, d.id, d.option).state : pass(s);
    const out = endQuarter(s);
    s = out.state;
    if (out.outcome === 'tipping_point') {
      const last = strat.decide(s, r);
      if (last) s = playCard(s, last.id, last.option).state;
      s = runTippingPoint(s);
      break;
    }
    if (out.outcome === 'game_over') break;
  }
  const def = ENDINGS.find((e) => e.id === s.ending)!;
  return {
    ending: s.ending!,
    good: def.good,
    quarters: s.quarter,
    tipping: !!s.tipping,
    plan: s.tipping?.plan ?? null,
    speed: s.takeoffSpeed,
    events: Object.fromEntries(Object.entries(s.firedEvents).map(([k, v]) => [k, { prepared: v!.prepared }])),
    slowdownOdds: s.tipping ? s.tipping.odds.verified_slowdown : null,
    leaQ6,
    leaQ11,
    band: ((s.eu.economy + s.eu.culture + s.eu.state) / 3 >= 60 ? 'high' : (s.eu.economy + s.eu.culture + s.eu.state) / 3 >= 30 ? 'mid' : 'low'),
  };
}

const N = Number(process.argv[2]) || 2000;
const strategies = [passive, randomStrategy, prepared];
const pctf = (x: number, n: number) => `${((100 * x) / n).toFixed(1)}%`.padStart(6);
const reachable = new Map<EndingId, number>();

for (const strat of strategies) {
  const results: GameResult[] = [];
  for (let i = 0; i < N; i++) results.push(playGame(1000 + i, strat));
  const goods = results.filter((x) => x.good).length;
  console.log(`\n=== ${strat.name} (${N} games) ===`);
  console.log(`good endings: ${pctf(goods, N)}`);
  const avgQ = results.reduce((a, x) => a + x.quarters, 0) / N;
  console.log(`average quarters: ${avgQ.toFixed(1)}`);
  for (const sp of ['slow', 'steady', 'fast'] as Speed[]) {
    const sub = results.filter((x) => x.speed === sp);
    if (!sub.length) continue;
    const tq = sub.filter((x) => x.tipping);
    const avgTip = tq.length ? (tq.reduce((a, x) => a + x.quarters, 0) / tq.length).toFixed(1) : '-';
    console.log(
      `  ${sp.padEnd(6)} ${String(sub.length).padStart(5)} games · tipping ${pctf(tq.length, sub.length)} (avg quarter ${avgTip}) · good ${pctf(sub.filter((x) => x.good).length, sub.length)}`,
    );
  }
  console.log(`tipping point reached: ${pctf(results.filter((x) => x.tipping).length, N)}`);
  const plans = new Map<string, number>();
  for (const x of results) if (x.plan) plans.set(x.plan, (plans.get(x.plan) ?? 0) + 1);
  console.log(`plans chosen: ${[...plans].map(([k, v]) => `${k} ${pctf(v, N).trim()}`).join(', ')}`);
  const so = results.filter((x) => x.slowdownOdds !== null);
  if (so.length) console.log(`avg verified-slowdown odds at tipping: ${pctf(so.reduce((a, x) => a + x.slowdownOdds!, 0), so.length).trim()}`);
  console.log('endings:');
  for (const e of ENDINGS) {
    const k = results.filter((x) => x.ending === e.id).length;
    reachable.set(e.id, Math.max(reachable.get(e.id) ?? 0, k / N));
    console.log(`  ${(e.good ? '+ ' : '- ') + e.title.padEnd(26)} ${pctf(k, N)}`);
  }
  const count = (f: (x: GameResult) => boolean) => results.filter(f).length;
  console.log(
    `Léa: Q6 human touch ${pctf(count((x) => x.leaQ6 === 'human_touch'), count((x) => x.leaQ6 !== '-')).trim()}` +
      ` · Q11 retrained ${pctf(count((x) => x.leaQ11 === 'retrained'), Math.max(1, count((x) => x.leaQ11 !== '-'))).trim()}` +
      ` · epilogue high/mid/low ${pctf(count((x) => x.band === 'high'), N).trim()} / ${pctf(count((x) => x.band === 'mid'), N).trim()} / ${pctf(count((x) => x.band === 'low'), N).trim()}`,
  );
  console.log('events fired (prepared share):');
  for (const ev of ['warning_shot', 'weight_theft', 'opaque_reasoning', 'silicon_blackmail', 'ransomware'] as EventId[]) {
    const f = results.filter((x) => x.events[ev]);
    const p = f.filter((x) => x.events[ev]!.prepared).length;
    console.log(`  ${ev.padEnd(18)} ${pctf(f.length, N)}  (prepared ${f.length ? pctf(p, f.length).trim() : '-'})`);
  }
}

console.log('\n=== reachability (best share across strategies) ===');
for (const e of ENDINGS) console.log(`  ${e.title.padEnd(26)} ${((reachable.get(e.id) ?? 0) * 100).toFixed(1)}%`);
