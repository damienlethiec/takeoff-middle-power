// The seeded generator (src/engine/rng.ts).

import { describe, expect, it } from 'vitest';
import { nextRandom, pick, random, randomInt, seedToRng, shuffle, weightedPick } from '../src/engine/rng';
import { E, craft } from './helpers';

describe('rng', () => {
  it('turns any seed into a 32-bit state, nearby seeds into unrelated ones', () => {
    for (const seed of [0, 1, 2, -5, 1.7, 2 ** 40, Number.MAX_SAFE_INTEGER]) {
      const r = seedToRng(seed);
      expect(Number.isInteger(r) && r >= 0 && r < 2 ** 32).toBe(true);
    }
    expect(seedToRng(1.7)).toBe(seedToRng(1));
    expect(Math.abs(seedToRng(1) - seedToRng(2))).toBeGreaterThan(1000);
  });

  it('is a pure step returning a value in [0, 1) and the next state', () => {
    let r = seedToRng(3);
    const values: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const [v, next] = nextRandom(r);
      expect(nextRandom(r)).toEqual([v, next]);
      expect(v >= 0 && v < 1).toBe(true);
      values.push(v);
      r = next;
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('randomInt covers its inclusive bounds; pick covers the list', () => {
    const h = { rng: seedToRng(9) };
    const ints = new Set<number>();
    const picks = new Set<string>();
    for (let i = 0; i < 500; i++) {
      ints.add(randomInt(h, 2, 4));
      picks.add(pick(h, ['a', 'b', 'c']));
    }
    expect([...ints].sort()).toEqual([2, 3, 4]);
    expect([...picks].sort()).toEqual(['a', 'b', 'c']);
  });

  it('weightedPick follows the weights, and falls back to the last key when every weight is 0', () => {
    const h = { rng: seedToRng(4) };
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 4000; i++) counts[weightedPick(h, { a: 1, b: 3, c: 0 })]++;
    expect(counts.c).toBe(0);
    expect(counts.b / 4000).toBeCloseTo(0.75, 1);
    expect(weightedPick({ rng: 1 }, { x: 0, y: 0 })).toBe('y');
  });

  it('shuffle returns a new permutation and leaves its input alone', () => {
    const h = { rng: seedToRng(5) };
    const input = Object.freeze([1, 2, 3, 4, 5, 6]);
    const out = shuffle(h, input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([...input]);
    const orders = new Set<string>();
    for (let i = 0; i < 50; i++) orders.add(shuffle(h, input).join());
    expect(orders.size).toBeGreaterThan(10);
  });

  it('the mutable helper advances the holder', () => {
    const h = { rng: seedToRng(1) };
    const before = h.rng;
    random(h);
    expect(h.rng).not.toBe(before);
  });

  it('the engine also understands revealUntil in conditions', () => {
    expect(E.evalCondition({ ...craft({}), revealUntil: 7 }, { key: 'revealUntil', op: '==', value: 7 })).toBe(true);
  });
});
