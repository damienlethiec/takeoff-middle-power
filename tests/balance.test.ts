// A quick balance check on a few hundred games (the full check is npm run sim).

import { describe, expect, it } from 'vitest';
import { ENDING_BY_ID } from '../src/data/endings';
import { cooperationOnly, passive, playGame, randomStrategy, thoughtful } from '../scripts/strategies';

const N = 200;
const good = (st: typeof passive) => {
  let g = 0;
  for (let i = 0; i < N; i++) if (ENDING_BY_ID[playGame(3000 + i, st).final.ending!].good) g++;
  return g / N;
};

describe('balance (small sample)', () => {
  it('passive rarely wins, random sometimes, a thoughtful player usually', () => {
    expect(good(passive)).toBeLessThan(0.15);
    const r = good(randomStrategy);
    expect(r).toBeGreaterThan(0.08);
    expect(r).toBeLessThan(0.38);
    const t = good(thoughtful);
    // restored after the rebalancing of 26 Oct (0.56 on these seeds; the sim's target is 55–80% on its own seeds)
    expect(t).toBeGreaterThan(0.45);
    expect(t).toBeLessThan(0.9);
    expect(good(cooperationOnly)).toBeLessThan(t - 0.2);
  }, 120_000);
});
