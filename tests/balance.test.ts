// Simulation guardrails: a fast version of `npm run sim` (scripts/sim.ts) that protects the balance
// from accidental regressions. Same strategies and seeds as the script, fewer games.
// If a deliberate rebalance moves these numbers, update the thresholds and docs/DEVELOPER_NOTES.md together.

import { beforeAll, describe, expect, it } from 'vitest';
import { playGame, passive, prepared, randomStrategy, type Strategy } from './helpers';
import { ENDINGS } from '../src/data/endings';
import type { EndingId, GameState } from '../src/engine/types';

const N = 300;
const results = new Map<string, GameState[]>();
const good = (s: GameState) => ENDINGS.find((e) => e.id === s.ending)!.good;
const share = (xs: GameState[], f: (s: GameState) => boolean) => xs.filter(f).length / xs.length;

beforeAll(() => {
  for (const strat of [passive, randomStrategy, prepared] as Strategy[]) {
    results.set(
      strat.name,
      Array.from({ length: N }, (_, i) => playGame(1000 + i, strat).final),
    );
  }
});

describe(`balance over ${N} games per strategy`, () => {
  it('a passive player almost never gets a good ending (< 10%)', () => {
    expect(share(results.get('passive')!, good)).toBeLessThan(0.1);
  });

  it('a prepared player usually gets a good ending (> 60%)', () => {
    expect(share(results.get('prepared')!, good)).toBeGreaterThan(0.6);
  });

  it('a random player sits in between', () => {
    const r = share(results.get('random')!, good);
    expect(r).toBeGreaterThan(share(results.get('passive')!, good));
    expect(r).toBeLessThan(share(results.get('prepared')!, good));
  });

  it('every ending is reachable by some strategy', () => {
    const reached = new Set<EndingId>();
    for (const games of results.values()) for (const s of games) reached.add(s.ending!);
    expect([...reached].sort()).toEqual(ENDINGS.map((e) => e.id).sort());
  });

  it('slow worlds never tip; steady and fast ones always do, fast ones earlier', () => {
    const all = results.get('passive')!;
    const avgQ = (xs: GameState[]) => xs.reduce((a, s) => a + s.quarter, 0) / xs.length;
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
      expect(share(results.get(name)!, (s) => s.gauges.publicPressure >= 50 || s.news.some((n) => n.id === 'news.pressure50'))).toBeGreaterThan(0.1);
    }
  });
});
