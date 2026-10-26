// News variety (v4.1): headlines and voices never repeat inside a game; the "recently seen" memory makes the next
// game differ; the seeded simulation (no memory) is unaffected by it.

import { describe, expect, it } from 'vitest';
import { seen } from '../src/engine/index';
import { VOICES, WORLD_HEADLINES } from '../src/data/mapcontent';
import { SOCIAL_EVENTS } from '../src/data/social';
import { REQUESTS } from '../src/data/requests';
import { ALL_LETTERS } from '../src/data/letters';
import { playGame, randomStrategy, thoughtful } from './helpers';

describe('news variety', () => {
  it('ids are unique across headlines, voices, social events, requests and letters (the memory stores plain ids)', () => {
    const ids = [...WORLD_HEADLINES, ...VOICES, ...SOCIAL_EVENTS, ...REQUESTS, ...ALL_LETTERS].map((x) => x.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('never shows the same headline or voice twice in a game', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = playGame(seed, seed % 2 ? thoughtful : randomStrategy).final;
      const heads = g.history.flatMap((r) => r.headlines.map((h) => h.id));
      const voices = g.history.flatMap((r) => r.voices.map((v) => v.id));
      expect(heads.length, `seed ${seed}`).toBe(new Set(heads).size);
      expect(voices.length, `seed ${seed}`).toBe(new Set(voices).size);
    }
  });

  it('seen() lists the variable items of a game, not the scenario spine', () => {
    const g = playGame(3, thoughtful).final;
    const ids = seen(g);
    expect(ids.length).toBeGreaterThan(20);
    expect(ids.some((x) => /^(m|t)_/.test(x))).toBe(false);
    expect(ids).toContain(g.history[0].voices[0].id);
  });

  it('an empty memory plays exactly like no memory', () => {
    expect(playGame(5, thoughtful, []).final).toEqual(playGame(5, thoughtful).final);
  });

  it('the memory makes the next game repeat less of the last two', () => {
    let withMem = 0;
    let without = 0;
    for (let i = 0; i < 6; i++) {
      const recent = [...seen(playGame(100 + i, randomStrategy).final), ...seen(playGame(200 + i, randomStrategy).final)];
      const share = (ids: string[]) => ids.filter((x) => recent.includes(x)).length / ids.length;
      without += share(seen(playGame(300 + i, randomStrategy).final));
      withMem += share(seen(playGame(300 + i, randomStrategy, recent).final));
    }
    expect(withMem).toBeLessThan(without);
  });
});
