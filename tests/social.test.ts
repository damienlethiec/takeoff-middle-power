// v4: Social cohesion and the world feel alive. AI weighs on jobs every round (softened by flexicurity and the
// answers that protect workers), and small social events happen in European cities: their content rules
// (basis, sources, short texts), how often they come, and that they read public values only.

import { describe, expect, it } from 'vitest';
import { SOCIAL_EVENTS, WORKER_ANSWERS } from '../src/data/social';
import { SOURCES } from '../src/data/sources';
import { REQUEST_BY_ID } from '../src/data/requests';
import { TUNING as T } from '../src/data/tuning';
import { createInitialState, endRound, feed, jobDriftLoss, startRound } from '../src/engine/index';
import type { GameState } from '../src/engine/types';
import { nextRound, playGame, randomStrategy } from './helpers';

const words = (t: string) => t.trim().split(/\s+/).length;

describe('social events: content', () => {
  it('ids are unique, and each has a city in Europe, a short headline and one line on why it matters', () => {
    expect(new Set(SOCIAL_EVENTS.map((e) => e.id)).size).toBe(SOCIAL_EVENTS.length);
    expect(SOCIAL_EVENTS.length).toBeGreaterThanOrEqual(20);
    for (const e of SOCIAL_EVENTS) {
      expect(words(e.headline), e.id).toBeLessThanOrEqual(15);
      expect(words(e.why), e.id).toBeLessThanOrEqual(25);
      expect(e.city.length, e.id).toBeGreaterThan(2);
      expect(e.lon, e.id).toBeGreaterThan(-25);
      expect(e.lon, e.id).toBeLessThan(40);
      expect(e.lat, e.id).toBeGreaterThan(34);
      expect(e.lat, e.id).toBeLessThan(71);
      expect(e.effects.length, e.id).toBeGreaterThan(0);
    }
  });

  it('every event has a basis; a real precedent names its checked source, and only real ones say "Real precedent"', () => {
    for (const e of SOCIAL_EVENTS) {
      expect(['ai2027', 'cfg', 'real'], e.id).toContain(e.basis.kind);
      if (e.basis.kind === 'ai2027') expect(e.basis.ref).toMatch(/^AI 2027, /);
      if (e.basis.kind === 'cfg') expect(e.basis.ref).toMatch(/^CFG, /);
      if (e.basis.kind === 'real') {
        expect(e.source, `${e.id} needs a source`).toBeTruthy();
        expect(SOURCES[e.source!], e.id).toBeTruthy();
        expect(e.why, e.id).toMatch(/Real precedent: /);
      } else expect(e.why, e.id).not.toMatch(/Real precedent/);
    }
  });

  it('there is good news as well as bad, and every kind appears', () => {
    const kinds = new Set(SOCIAL_EVENTS.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['breakthrough', 'protest', 'scandal', 'strike']);
    expect(SOCIAL_EVENTS.filter((e) => e.effects.every((x) => x.dir > 0)).length).toBeGreaterThanOrEqual(8);
  });

  it('the answers that protect workers exist', () => {
    for (const w of WORKER_ANSWERS) expect(REQUEST_BY_ID[w.id], w.id).toBeTruthy();
  });
});

describe('social events: in a game', () => {
  it('one or two a round, never the same twice a game, each in the feed as a story event', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = playGame(seed, randomStrategy).final;
      const ids = g.history.flatMap((r) => (r.social ?? []).map((x) => x.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const r of g.history) expect((r.social ?? []).length).toBeLessThanOrEqual(2);
      const items = feed(g).flatMap((r) => r.items.filter((x) => x.kind === 'social'));
      expect(items.length).toBe(ids.length);
      for (const it of items) {
        expect(it.label).toMatch(/in this story/);
        expect(it.social?.city).toBeTruthy();
        expect(it.region).toBe('eu');
      }
    }
  });

  it('they come in every round before the tipping point', () => {
    let s = createInitialState(7);
    for (let r = 1; r <= 5; r++) {
      s = nextRound(s);
      expect(s.social.round.length).toBeGreaterThanOrEqual(1);
      s = endRound(s).state;
    }
  });

  it('they read public values only: the hidden truth and pace never change which events come', () => {
    for (let seed = 1; seed <= 15; seed++) {
      let s = createInitialState(seed);
      for (let r = 0; r < 4; r++) s = endRound(nextRound(s)).state;
      const twin = (truth: number): GameState => ({ ...s, confidence: { ...s.confidence, truth } });
      const a = startRound(twin(Math.max(0, s.confidence.estimate - s.confidence.margin)));
      const b = startRound(twin(s.confidence.estimate));
      expect(a.social.round.map((x) => x.id)).toEqual(b.social.round.map((x) => x.id));
    }
  });
});

describe('AI weighs on jobs', () => {
  const at = (aiPower: number, extra: Partial<GameState> = {}): GameState => ({ ...createInitialState(3), aiPower, ...extra });

  it('nothing before AI takes jobs, more as capabilities rise, never more than the cap', () => {
    expect(jobDriftLoss(at(T.jobDrift.from))).toBe(0);
    const mid = jobDriftLoss(at(60));
    const high = jobDriftLoss(at(79));
    expect(mid).toBeGreaterThan(0);
    expect(high).toBeGreaterThanOrEqual(mid);
    expect(high).toBeLessThanOrEqual(T.jobDrift.max);
  });

  it('flexicurity and the answers that protect workers soften it', () => {
    const base = jobDriftLoss(at(79));
    const flex = jobDriftLoss(at(79, { uses: { flexicurity: 1 } }));
    const done = WORKER_ANSWERS.map((w) => ({ id: w.id, round: 1, side: w.side }));
    const s0 = createInitialState(3);
    const all = jobDriftLoss(at(79, { uses: { flexicurity: 1 }, requests: { ...s0.requests, done } }));
    expect(flex).toBeLessThan(base);
    expect(all).toBeLessThanOrEqual(flex);
  });
});
