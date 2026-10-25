// Simulation guardrails: a fast version of `npm run sim` (scripts/sim.ts) that protects the balance
// from accidental regressions. Same strategies (scripts/strategies.ts) and seeds as the script, fewer games.
// Targets: docs/V2_SPEC.md, "Balance targets". If a deliberate rebalance moves these numbers, update the
// thresholds and docs/DEVELOPER_NOTES.md together.

import { beforeAll, describe, expect, it } from 'vitest';
import { playGame, passive, prepared, preparedNoTalks, randomStrategy, type PlayedGame, type Strategy } from './helpers';
import { ENDINGS } from '../src/data/endings';
import type { EndingId } from '../src/engine/types';

const N = 300;
const results = new Map<string, PlayedGame[]>();
const good = (g: PlayedGame) => ENDINGS.find((e) => e.id === g.final.ending)!.good;
const share = (xs: PlayedGame[], f: (g: PlayedGame) => boolean) => xs.filter(f).length / xs.length;

beforeAll(() => {
  for (const strat of [passive, randomStrategy, prepared, preparedNoTalks] as Strategy[]) {
    results.set(
      strat.name,
      Array.from({ length: N }, (_, i) => playGame(1000 + i, strat)),
    );
  }
}, 120_000);

describe(`balance over ${N} games per strategy`, () => {
  it('a passive player rarely gets a good ending (< 20%)', () => {
    expect(share(results.get('passive')!, good)).toBeLessThan(0.2);
  });

  it('a prepared player usually gets a good ending, but not always (60–90%)', () => {
    const p = share(results.get('prepared')!, good);
    expect(p).toBeGreaterThan(0.6);
    expect(p).toBeLessThan(0.9);
  });

  it('a random player sits in between (15–35%)', () => {
    const r = share(results.get('random')!, good);
    expect(r).toBeGreaterThanOrEqual(0.15);
    expect(r).toBeLessThanOrEqual(0.35);
  });

  it('every ending is reachable by some strategy', () => {
    const reached = new Set<EndingId>();
    for (const games of results.values()) for (const g of games) reached.add(g.final.ending!);
    expect([...reached].sort()).toEqual(ENDINGS.map((e) => e.id).sort());
  });

  it('card variety: no card above 25% of the prepared player’s plays', () => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const g of results.get('prepared')!) for (const d of g.decisions) if (d) (total++, counts.set(d, (counts.get(d) ?? 0) + 1));
    for (const [id, n] of counts) expect(n / total, id).toBeLessThanOrEqual(0.25);
  });

  it('talks: tension at the tipping point at least 10 lower than without, and "fight China" still possible', () => {
    const avg = (xs: PlayedGame[]) => {
      const t = xs.filter((g) => g.tensionAtTipping !== null);
      return t.reduce((a, g) => a + g.tensionAtTipping!, 0) / t.length;
    };
    expect(avg(results.get('prepared, no talks')!) - avg(results.get('prepared')!)).toBeGreaterThanOrEqual(10);
    expect(results.get('prepared')!.some((g) => g.final.tipping?.plan === 'fight_china')).toBe(true);
  });

  it('money: the prepared player is short of the card it wants at most twice per game on average', () => {
    const games = results.get('prepared')!;
    expect(games.reduce((a, g) => a + g.shortages, 0) / games.length).toBeLessThanOrEqual(2);
  });

  it('the story reaches act 2 and act 3 in every game', () => {
    for (const games of results.values()) for (const g of games) expect(g.final.act).toBe(3);
  });

  it('slow worlds never tip; steady and fast ones always do, fast ones earlier', () => {
    const all = results.get('passive')!.map((g) => g.final);
    const avgQ = (xs: typeof all) => xs.reduce((a, s) => a + s.quarter, 0) / xs.length;
    const slow = all.filter((s) => s.takeoffSpeed === 'slow');
    const steady = all.filter((s) => s.takeoffSpeed === 'steady');
    const fast = all.filter((s) => s.takeoffSpeed === 'fast');
    expect(slow.every((s) => !s.tipping)).toBe(true);
    expect(steady.every((s) => !!s.tipping)).toBe(true);
    expect(fast.every((s) => !!s.tipping)).toBe(true);
    expect(avgQ(fast)).toBeLessThan(avgQ(steady));
    // documented pace: fast around Q10, steady around Q13–14
    expect(avgQ(fast)).toBeGreaterThanOrEqual(8);
    expect(avgQ(fast)).toBeLessThanOrEqual(11);
    expect(avgQ(steady)).toBeGreaterThanOrEqual(12);
    expect(avgQ(steady)).toBeLessThanOrEqual(15);
  });

  it('public pressure matters: it reaches 50 in some random and prepared games', () => {
    for (const name of ['random', 'prepared']) {
      expect(share(results.get(name)!, (g) => g.pressureMax >= 50 || g.final.news.some((n) => n.id === 'news.pressure50'))).toBeGreaterThan(0.1);
    }
  });
});
