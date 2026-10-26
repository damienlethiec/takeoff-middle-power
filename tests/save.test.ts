// Save and resume: a mid-game state round-trips through the save and continues identically; bad saves are ignored.

import { describe, expect, it } from 'vitest';
import { answerRequest, createInitialState, endRound, request, resolveEvent, startRound } from '../src/engine/index';
import type { GameState } from '../src/engine/types';
import { GAME_KEYS, RECENT_KEY, SAVE_KEY, SAVE_VERSION, clearSave, decodeSave, encodeSave, forgetAll, readRecent, readSave, rememberGame, resumeRound, saveLabel, writeSave } from '../src/ui/save';
import { readdirSync, readFileSync } from 'node:fs';
import { dateLabel } from '../src/engine/index';
import { answerAll, nextRound } from './helpers';

/** An in-memory Storage; `full` makes every write throw like a full quota. */
function memStore(full = false) {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (full) throw new DOMException('quota', 'QuotaExceededError');
      m.set(k, v);
    },
    removeItem: (k: string) => void m.delete(k),
  };
}

const fresh = () => createInitialState(1);

/** Play the rest of the game the same way from any state (answer right, hold firm, no cards). */
function finish(s: GameState): GameState {
  let n = s;
  for (;;) {
    if (n.phase === 'ended') return n;
    if (n.event) n = resolveEvent(n, n.event.options[n.event.options.length - 1]?.id);
    while (request(n)) n = answerRequest(n, 'right').state;
    const e = endRound(n);
    n = e.state;
    if (e.outcome === 'ended') return n;
    n = startRound(n);
  }
}

/** Mid-game: three rounds played, round 4 started, its event (if any) resolved but its requests not answered. */
function midGame(seed: number): GameState {
  let s = createInitialState(seed);
  for (let r = 1; r <= 3; r++) s = endRound(nextRound(s)).state;
  s = startRound(s);
  if (s.event) s = resolveEvent(s, s.event.options[s.event.options.length - 1]?.id);
  return s;
}

describe('save and resume', () => {
  it('round-trips a mid-game state exactly, and the game continues identically', () => {
    for (const seed of [3, 4, 9, 21]) {
      const s = midGame(seed);
      const st = memStore();
      expect(writeSave(s, 'round', ['capabilities'], st)).toBe(true);
      const env = readSave(fresh(), st)!;
      expect(env).not.toBeNull();
      expect(env.stage).toBe('round');
      expect(env.tips).toEqual(['capabilities']);
      // exactly the saved state (JSON's only change, −0 written as 0 in display tones, is equal for the engine)
      expect(JSON.stringify(env.state)).toBe(JSON.stringify(s));
      // same seed, same RNG position → the same next round and the same ending
      expect(JSON.stringify(startRound(endRound(answerAll(env.state)).state))).toBe(JSON.stringify(startRound(endRound(answerAll(s)).state)));
      expect(JSON.stringify(finish(env.state))).toBe(JSON.stringify(finish(s)));
    }
  });

  it('labels the round the player will resume in', () => {
    const s = midGame(4);
    const st = memStore();
    writeSave(s, 'round', [], st);
    expect(saveLabel(readSave(fresh(), st)!, dateLabel)).toBe(`${dateLabel(4)}, round 4`);
    // between rounds: the next round is the one to play
    writeSave(endRound(answerAll(s)).state, 'between', [], st);
    const env = readSave(fresh(), st)!;
    expect(resumeRound(env)).toBe(5);
    expect(saveLabel(env, dateLabel)).toBe(`${dateLabel(5)}, round 5`);
  });

  it('remembers the round whose postcard was shown (0 for a save made before postcards)', () => {
    const s = midGame(4);
    expect(decodeSave(encodeSave(s, 'round', [], 1, 4), fresh())?.postcard).toBe(4);
    const old = JSON.parse(encodeSave(s, 'round'));
    delete old.postcard;
    expect(decodeSave(JSON.stringify(old), fresh())?.postcard).toBe(0);
    const st = memStore();
    expect(writeSave(s, 'round', [], st, 4)).toBe(true);
    expect(readSave(fresh(), st)?.postcard).toBe(4);
  });

  it('ignores and removes corrupt, old or foreign saves', () => {
    const s = midGame(4);
    const good = encodeSave(s, 'round');
    const bad = [
      '{not json',
      'null',
      '42',
      JSON.stringify({ ...JSON.parse(good), v: SAVE_VERSION + 1 }),
      JSON.stringify({ ...JSON.parse(good), stage: 'later' }),
      JSON.stringify({ ...JSON.parse(good), state: { ...s, version: 2 } }),
      JSON.stringify({ ...JSON.parse(good), state: { ...s, history: 'x' } }),
      JSON.stringify({ ...JSON.parse(good), state: (({ requests: _r, ...rest }) => rest)(s) }),
      JSON.stringify({ ...JSON.parse(good), state: { ...s, extra: 1 } }),
      JSON.stringify({ ...JSON.parse(good), state: { ...s, round: 0 } }),
    ];
    for (const raw of bad) {
      expect(decodeSave(raw, fresh())).toBeNull();
      const st = memStore();
      st.m.set(SAVE_KEY, raw);
      expect(readSave(fresh(), st)).toBeNull();
      expect(st.m.has(SAVE_KEY)).toBe(false);
    }
    expect(decodeSave(good, fresh())).not.toBeNull();
  });

  it('works without storage: a full or blocked store saves nothing and never throws', () => {
    const s = midGame(4);
    expect(writeSave(s, 'round', [], memStore(true))).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(writeSave(s, 'round', [], blocked)).toBe(false);
    expect(readSave(fresh(), blocked)).toBeNull();
    expect(() => clearSave(blocked)).not.toThrow();
  });

  it('keeps a game whose ending is all that is left', () => {
    const end = finish(createInitialState(4));
    const st = memStore();
    writeSave(end, 'between', [], st);
    const env = readSave(fresh(), st)!;
    expect(env.state.phase).toBe('ended');
    expect(saveLabel(env, dateLabel)).toBe('see how it ends');
    clearSave(st);
    expect(readSave(fresh(), st)).toBeNull();
  });
});

describe('recently seen (takeoff.recent)', () => {
  it('keeps the ids of the last two finished games only, once per game', () => {
    const st = memStore();
    expect(readRecent(st)).toEqual([]);
    rememberGame(1, ['a', 'b'], st);
    rememberGame(1, ['a', 'b', 'c'], st);
    rememberGame(2, ['c'], st);
    expect(readRecent(st).sort()).toEqual(['a', 'b', 'c']);
    rememberGame(3, ['d'], st);
    expect(readRecent(st).sort()).toEqual(['c', 'd']);
    expect(JSON.parse(st.getItem(RECENT_KEY)!).games).toHaveLength(2);
  });

  it('survives a corrupt value or no storage at all', () => {
    const st = memStore();
    st.setItem(RECENT_KEY, '{oops');
    expect(readRecent(st)).toEqual([]);
    st.setItem(RECENT_KEY, JSON.stringify({ games: [{ seed: 'x', ids: [1] }] }));
    expect(readRecent(st)).toEqual([]);
    const blocked = { getItem: () => { throw new DOMException('blocked', 'SecurityError'); }, setItem: () => { throw new DOMException('blocked', 'SecurityError'); }, removeItem: () => {} };
    expect(readRecent(blocked)).toEqual([]);
    expect(() => rememberGame(1, ['a'], blocked)).not.toThrow();
  });
});

describe('forget my save (Help)', () => {
  it('removes every key the game keeps, and only those', () => {
    const st = memStore();
    writeSave(fresh(), 'between', [], st);
    for (const k of GAME_KEYS) if (k !== SAVE_KEY) st.setItem(k, 'off');
    st.setItem('takeoff.reign.save', 'another game on the same origin');
    expect(forgetAll(st)).toBe(true);
    expect([...st.m.keys()]).toEqual(['takeoff.reign.save']);
    expect(readSave(fresh(), st)).toBeNull();
  });

  it('lists every storage key used in src/ui', () => {
    const dir = new URL('../src/ui/', import.meta.url);
    const used = new Set<string>();
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue;
      for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/'(takeoff\.[\w.]+)'/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(3);
    expect([...used].sort()).toEqual([...GAME_KEYS].sort());
  });

  it('never throws without storage', () => {
    const blocked = { getItem: () => null, setItem: () => {}, removeItem: () => { throw new DOMException('blocked', 'SecurityError'); } };
    expect(forgetAll(blocked)).toBe(false);
  });
});
