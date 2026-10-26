import { describe, expect, it } from 'vitest';
import { nextRandom, pick, randomInt, seedToRng, shuffle, weightedPick } from '../src/engine/rng';

describe('seeded RNG', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = nextRandom(seedToRng(42));
    expect(nextRandom(seedToRng(42))).toEqual(a);
    let r = seedToRng(1);
    for (let i = 0; i < 1000; i++) {
      const [v, n] = nextRandom(r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      r = n;
    }
  });
  it('helpers stay in range', () => {
    const h = { rng: seedToRng(9) };
    for (let i = 0; i < 200; i++) {
      const x = randomInt(h, -2, 2);
      expect(x).toBeGreaterThanOrEqual(-2);
      expect(x).toBeLessThanOrEqual(2);
    }
    expect(['a', 'b']).toContain(pick(h, ['a', 'b']));
    expect(shuffle(h, [1, 2, 3]).sort()).toEqual([1, 2, 3]);
    expect(['x', 'y']).toContain(weightedPick(h, { x: 1, y: 1 }));
  });
});
