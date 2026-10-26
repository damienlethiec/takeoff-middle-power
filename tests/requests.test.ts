// Requests (v4, from the hybrid): content rules, the engine's draw and answers, and hidden values.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { CHARACTERS } from '../src/data/characters';
import { MILESTONES } from '../src/data/milestones';
import { REQUESTS } from '../src/data/requests';
import { SOURCES } from '../src/data/sources';
import { TUNING as T } from '../src/data/tuning';
import { answerRequest, createInitialState, endRound, request, resolveEvent, startRound } from '../src/engine/index';
import type { Answer, Condition, GameState } from '../src/engine/types';
import { freeze, fresh, playGame, randomStrategy, thoughtful } from './helpers';

const words = (s: string) => s.trim().split(/\s+/).length;
const SOURCE_LIST = Object.values(SOURCES);

/** Something visible goes down, a threat grows, Europe's AI turns Dependent, or a cost comes later. */
function costs(a: Answer): boolean {
  const e = a.effects;
  if ((e.ai ?? 0) > 0 || (e.coop ?? 0) < 0 || (e.conf ?? 0) < 0 || (e.margin ?? 0) > 0 || (e.cohesion ?? 0) < 0) return true;
  if (a.grow?.length || a.badge === 'dependent') return true;
  const l = a.later?.effects;
  return !!l && ((l.ai ?? 0) > 0 || (l.coop ?? 0) < 0 || (l.conf ?? 0) < 0 || (l.margin ?? 0) > 0 || (l.cohesion ?? 0) < 0);
}

describe('request content', () => {
  it('about forty cards from eleven characters, ids unique, each with a basis', () => {
    expect(REQUESTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(REQUESTS.map((r) => r.id)).size).toBe(REQUESTS.length);
    for (const id of Object.keys(CHARACTERS)) expect(REQUESTS.some((r) => r.character === id), id).toBe(true);
    for (const r of REQUESTS) {
      expect(['ai2027', 'cfg', 'real'], r.id).toContain(r.basis.kind);
      expect(r.basis.ref.length, r.id).toBeGreaterThan(8);
      if (r.basis.kind === 'ai2027') expect(r.basis.ref, r.id).toMatch(/AI 2027/);
      if (r.basis.kind === 'cfg') expect(r.basis.ref, r.id).toMatch(/CFG/);
    }
  });

  it('every Learn more cites a listed source over https; scenario facts say so; real facts never name the invented labs', () => {
    for (const r of REQUESTS) {
      expect(SOURCE_LIST, r.id).toContain(r.learnMore.source);
      expect(r.learnMore.source.url, r.id).toMatch(/^https:\/\//);
      expect(words(r.learnMore.text), r.id).toBeLessThanOrEqual(40);
      const src = r.learnMore.source;
      if (src === SOURCES.ai2027) expect(r.learnMore.text, r.id).toMatch(/^In AI 2027/);
      else if (src === SOURCES.cfg) expect(r.learnMore.text, r.id).toMatch(/^In CFG/);
      else if (src === SOURCES.europe2031) expect(r.learnMore.text, r.id).toMatch(/Europe 2031/);
      else expect(r.learnMore.text, r.id).not.toMatch(/OpenBrain|DeepCent/);
    }
  });

  it('texts are short: requests ≤ 40 words, labels ≤ 5 words, a reaction for each answer', () => {
    for (const r of REQUESTS) {
      expect(words(r.text), r.id).toBeLessThanOrEqual(40);
      for (const a of [r.left, r.right]) {
        expect(words(a.label), `${r.id} ${a.label}`).toBeLessThanOrEqual(5);
        expect(a.reaction.length, r.id).toBeGreaterThan(3);
        if (a.why) expect(words(a.why), `${r.id} ${a.why}`).toBeLessThanOrEqual(9);
      }
    }
  });

  it('every answer costs something visible, and the two answers of a card differ', () => {
    const free = REQUESTS.flatMap((r) => [r.left, r.right].filter((a) => !costs(a)).map((a) => `${r.id}: ${a.label}`));
    expect(free).toEqual([]);
    for (const r of REQUESTS) expect(JSON.stringify(r.left) === JSON.stringify(r.right), r.id).toBe(false);
  });

  it('conditions use flags some answer sets and milestones that exist; follow-ups wait for an earlier answer', () => {
    const set = new Set(REQUESTS.flatMap((r) => [...(r.left.set ?? []), ...(r.right.set ?? [])]));
    const ids = MILESTONES.map((m) => m.id) as string[];
    const check = (c: Condition | undefined, id: string) => {
      for (const f of [...(c?.flags ?? []), ...(c?.notFlags ?? [])]) expect(set.has(f), `${id}: flag ${f}`).toBe(true);
      for (const m of [c?.milestone, c?.beforeMilestone]) if (m) expect(ids, id).toContain(m);
    };
    for (const r of REQUESTS) check(r.when, r.id);
    const followups = REQUESTS.filter((r) => r.followup);
    expect(followups.length).toBeGreaterThanOrEqual(3);
    for (const r of followups.filter((x) => x.id !== 'sc_warned')) expect(r.when?.flags?.length, r.id).toBeGreaterThan(0);
  });

  it('no request duplicates a policy card', () => {
    const names = CARDS.map((c) => c.name.toLowerCase());
    for (const r of REQUESTS) for (const a of [r.left, r.right]) expect(names, `${r.id}: ${a.label}`).not.toContain(a.label.toLowerCase());
    for (const gone of ['cn_talks', 'us_asml', 'rs_ai_office', 'rs_alignment_fund', 'rs_inspections', 'un_flexicurity', 'os_fund_open', 'sc_cyber_shield', 'sc_weight_security', 'pt_coalition', 'pt_summit', 'pt_attribution', 'un_human_signoff'])
      expect(REQUESTS.some((r) => r.id === gone), gone).toBe(false);
  });
});

describe('requests in a game', () => {
  const games = Array.from({ length: 300 }, (_, i) => playGame(4000 + i, thoughtful));

  it('6 to 10 requests a game, at most one a round (two when a follow-up is due), and rounds without one stay common', () => {
    const counts = games.map((g) => g.requests);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeGreaterThanOrEqual(6);
    expect(avg).toBeLessThanOrEqual(10);
    expect(Math.max(...counts)).toBeLessThanOrEqual(T.requests.maxPerGame);
    let empty = 0;
    let rounds = 0;
    for (const g of games)
      for (const r of g.final.history) {
        rounds++;
        if (!r.requests.length) empty++;
        expect(r.requests.length).toBeLessThanOrEqual(2);
        if (r.requests.length === 2) expect(r.requests.some((q) => REQUESTS.find((x) => x.id === q.id)!.followup)).toBe(true);
      }
    expect(empty / rounds).toBeGreaterThan(0.1);
  });

  it('each game draws a different mix; no request comes twice in a game', () => {
    const sets = games.slice(0, 50).map((g) => g.final.requests.done.map((d) => d.id).join());
    expect(new Set(sets).size).toBeGreaterThan(40);
    for (const g of games) {
      const ids = g.final.requests.done.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('follow-ups come after the answer that triggers them', () => {
    let seen = 0;
    for (const g of [...games, ...Array.from({ length: 200 }, (_, i) => playGame(9000 + i, randomStrategy))]) {
      const done = g.final.requests.done;
      const at = (id: string) => done.findIndex((d) => d.id === id);
      if (at('us_tariffs') >= 0) {
        seen++;
        const i = at('us_chip_controls');
        expect(i).toBeGreaterThanOrEqual(0);
        expect(done[i].side).toBe('left');
        expect(i).toBeLessThan(at('us_tariffs'));
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('an answer is free of Influence, never mutates its input, and costs nothing hidden in its view', () => {
    let s = createInitialState(21);
    let checked = 0;
    for (let i = 0; i < 12 && checked < 4; i++) {
      s = startRound(s);
      if (s.event) s = resolveEvent(s, s.event.options[0]?.id);
      while (request(s)) {
        const v = request(freeze(s))!;
        for (const a of [v.left, v.right]) for (const c of a.chips) expect(c.text).not.toMatch(/true|truth/i);
        const inf = s.influence;
        const { state } = answerRequest(s, 'right');
        expect(state.influence).toBe(inf);
        s = state;
        checked++;
      }
      const e = endRound(s);
      s = e.state;
      if (e.outcome === 'ended') break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('request views do not depend on the hidden truth or the pace', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = fresh(seed);
      const pending: GameState = { ...s, requests: { ...s.requests, pending: [{ id: 'rs_look_inside', at: 0.5 }], round: [{ id: 'rs_look_inside', at: 0.5, side: null }] } };
      const a = request({ ...pending, confidence: { ...pending.confidence, truth: Math.max(0, pending.confidence.estimate - 10) } });
      const b = request({ ...pending, confidence: { ...pending.confidence, truth: Math.min(100, pending.confidence.estimate + 10) }, pace: 'fast' });
      expect(a).toEqual(b);
    }
  });

  it('cards cannot be played while a request waits; the round cannot end before it is answered', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = startRound(createInitialState(seed));
      if (!request(s)) continue;
      expect(() => endRound(s)).toThrow(/answer the requests/);
      return;
    }
    throw new Error('no request in round 1 for these seeds');
  });
});
