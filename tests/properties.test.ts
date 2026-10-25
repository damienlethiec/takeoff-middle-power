// Properties that must hold in every game: hundreds of seeds, random legal play, every intermediate state checked.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E, allTexts, deepFreeze, playGame, prepared, passive, randomStrategy, STRATEGIES, type PlayedGame } from './helpers';
import type { GameState } from '../src/engine/types';

const SEEDS = 300;
const HIDDEN_KEYS = ['trueAlignment', 'eu.economy', 'eu.culture', 'eu.state'];

let games: PlayedGame[] = [];
const originalRandom = Math.random;

beforeAll(() => {
  // the engine must never use Math.random: make any call fail loudly
  Math.random = () => {
    throw new Error('Math.random used by the engine');
  };
  games = Array.from({ length: SEEDS }, (_, i) => playGame(5000 + i, i % 5 === 0 ? prepared : i % 7 === 0 ? passive : randomStrategy, true));
});
afterAll(() => {
  Math.random = originalRandom;
});

function checkState(s: GameState) {
  for (const [k, v] of Object.entries(s.gauges)) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) throw new Error(`gauge ${k} = ${v}`);
  }
  for (const [k, v] of Object.entries(s.eu)) {
    if (!(Number.isInteger(v) && v >= 0 && v <= 100)) throw new Error(`eu.${k} = ${v}`);
  }
  if (!(Number.isInteger(s.coalition) && s.coalition >= 0 && s.coalition <= 3)) throw new Error(`coalition ${s.coalition}`);
  if (!(Number.isInteger(s.pc) && s.pc >= 0)) throw new Error(`pc ${s.pc}`);
  if (!(Number.isInteger(s.budget) && s.budget >= 0)) throw new Error(`budget ${s.budget}`);
  if (!(s.asmlTokens >= 0 && s.asmlTokens <= 2)) throw new Error(`tokens ${s.asmlTokens}`);
  if (s.asmlTokens + (s.cardsPlayed.asml ?? 0) !== 2) throw new Error('ASML tokens and plays disagree');
  if (!(s.quarter >= 1 && s.quarter <= 16)) throw new Error(`quarter ${s.quarter}`);
  if (s.bubblesThisQuarter > 2) throw new Error('more than 2 bubbles');
  const odds = E.planOdds(s);
  const sum = Object.values(odds).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9 || Object.values(odds).some((p) => !(p > 0))) throw new Error(`odds ${JSON.stringify(odds)}`);
}

describe(`${SEEDS} seeded games with random legal play`, () => {
  it('keep every gauge in 0–100, coalition in 0–3, PC and Budget ≥ 0, odds summing to 1, in every intermediate state', () => {
    let states = 0;
    for (const g of games) {
      for (const s of g.trail) {
        checkState(s);
        states++;
      }
    }
    expect(states).toBeGreaterThan(SEEDS * 30);
  });

  it('always end: by Q16 without a tipping point, or right after the tipping point', () => {
    for (const { final, trail } of games) {
      expect(final.phase).toBe('ended');
      expect(final.ending).not.toBeNull();
      const tipped = trail.some((s) => s.phase === 'tipping');
      expect(!!final.tipping).toBe(tipped);
      if (!final.tipping) expect(final.quarter).toBe(16);
      else {
        // the tipping point came the first quarter capability was 80+ at the end of a quarter
        const firstTipping = trail.find((s) => s.phase === 'tipping')!;
        expect(firstTipping.gauges.capability).toBeGreaterThanOrEqual(80);
        expect(final.quarter).toBe(firstTipping.quarter);
      }
      if (final.takeoffSpeed === 'slow') expect(final.tipping).toBeNull();
    }
  });

  it('fire each event at most once and at most one per quarter', () => {
    for (const { final } of games) {
      const fired = final.log.filter((e) => e.kind === 'event' && !e.id.includes(':'));
      expect(new Set(fired.map((e) => e.id)).size).toBe(fired.length);
      expect(new Set(fired.map((e) => e.quarter)).size).toBe(fired.length);
      expect(fired.length).toBe(Object.keys(final.firedEvents).length);
    }
  });

  it('play at most one card per quarter, plus the free one at the tipping point', () => {
    for (const { final } of games) {
      const perQuarter = new Map<number, number>();
      for (const e of final.log.filter((x) => x.kind === 'card')) perQuarter.set(e.quarter, (perQuarter.get(e.quarter) ?? 0) + 1);
      for (const [q, n] of perQuarter) expect(n, `Q${q}`).toBeLessThanOrEqual(q === final.quarter && final.tipping ? 2 : 1);
    }
  });

  it('never show a hidden stat in visible deltas, anywhere in the log', () => {
    const bad: string[] = [];
    for (const { final } of games) {
      for (const e of final.log) {
        for (const d of e.visibleDeltas) if (d.hidden || HIDDEN_KEYS.includes(d.key)) bad.push(`${final.seed} ${e.id} ${d.key}`);
        for (const d of e.hiddenDeltas) if (!d.hidden) bad.push(`${final.seed} ${e.id} ${d.key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('show 2–4 news lines per quarter (at most 4) and 0–2 notes, never reusing a template, every moment in 0..1', () => {
    const bad: string[] = [];
    for (const { final } of games) {
      const tag = `seed ${final.seed}`;
      if (new Set(final.news.map((n) => n.id)).size !== final.news.length) bad.push(`${tag}: news id reused`);
      if (new Set(final.news.map((n) => n.text)).size !== final.news.length) bad.push(`${tag}: news text reused`);
      if (new Set(final.notes.map((n) => n.id)).size !== final.notes.length) bad.push(`${tag}: note id reused`);
      if (new Set(final.notes.map((n) => n.text)).size !== final.notes.length) bad.push(`${tag}: note text reused`);
      for (let q = 1; q <= final.quarter; q++) {
        const n = final.news.filter((x) => x.quarter === q).length;
        if (n < 2 || n > 4) bad.push(`${tag} Q${q}: ${n} news lines`);
        const m = final.notes.filter((x) => x.quarter === q).length;
        if (m > 2) bad.push(`${tag} Q${q}: ${m} notes`);
      }
      for (const x of [...final.news, ...final.notes]) if (!(x.at >= 0 && x.at <= 1)) bad.push(`${tag} ${x.id}: at ${x.at}`);
    }
    expect(bad).toEqual([]);
  });

  it('make notes readable exactly when the AI Office is funded or an audit runs', () => {
    const bad: string[] = [];
    for (const { trail } of games) {
      for (const s of trail) {
        const open = s.flags.aiOffice || s.quarter <= s.revealUntil;
        for (const n of s.notes) {
          // this quarter's notes follow the current access; older ones keep theirs unless the AI Office opened everything
          if (n.quarter === s.quarter && n.readable !== open) bad.push(`seed ${s.seed} Q${s.quarter} ${n.id}`);
          if (s.flags.aiOffice && !n.readable) bad.push(`seed ${s.seed} Q${s.quarter} ${n.id} (AI Office)`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('produce no "undefined", "NaN" or "[object Object]" in any text the player can see', () => {
    const bad: string[] = [];
    for (const { trail } of games.slice(0, 120)) {
      const seen = new Set<GameState>();
      for (const s of trail) {
        // check each quarter once after it starts, at the tipping point, and at the end
        const key = s.phase === 'ended' || s.phase === 'tipping' || (s.log.at(-1)?.kind !== 'bubble' && !s.decidedThisQuarter);
        if (!key || seen.has(s)) continue;
        seen.add(s);
        for (const t of allTexts(s)) if (/undefined|NaN|\[object Object\]/.test(t)) bad.push(`seed ${s.seed} Q${s.quarter}: ${t.slice(0, 120)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('reach every ending at least once', () => {
    const endings = new Set(games.map((g) => g.final.ending));
    expect(endings.size).toBeGreaterThanOrEqual(8);
  });
});

describe('determinism and purity', () => {
  it('the same seed and the same decisions give the same game, for every strategy', () => {
    for (const strat of STRATEGIES) {
      for (const seed of [1, 77, 4242]) {
        expect(playGame(seed, strat).final).toEqual(playGame(seed, strat).final);
      }
    }
  });

  it('the takeoff speed and the whole game depend only on the seed', () => {
    for (let seed = 0; seed < 20; seed++) expect(E.createInitialState(seed)).toEqual(E.createInitialState(seed));
    const finals = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(playGame(seed, passive).final.news)));
    expect(finals.size).toBe(8);
  });

  it('no engine function mutates its input (every intermediate state deep-frozen)', () => {
    for (let i = 0; i < 10; i++) {
      const seed = 9000 + i;
      const { trail } = playGame(seed, i % 2 ? randomStrategy : prepared, true);
      for (const raw of trail) {
        const s = deepFreeze(structuredClone(raw));
        const snapshot = JSON.stringify(s);
        // every read-only view and every transition, on a frozen input
        E.gaugeViews(s);
        E.cardViews(s);
        E.planOdds(s);
        E.forecastLine(s);
        E.leaScene(s, 'q1');
        E.leaScene(s, 'end');
        if (s.phase === 'ended') E.debrief(s);
        else {
          E.situationReport(s);
          for (const c of E.cardViews(s)) {
            E.previewCard(s, c.id, c.options[0]?.id);
            if (c.available && c.affordable && !s.decidedThisQuarter && !s.pendingEvent) E.playCard(s, c.id, c.options[0]?.id);
          }
          E.startQuarter(s);
          E.collectBubble(s, 'eu');
          E.pass(s);
          if (s.pendingEvent) E.resolveEvent(s, s.pendingEvent.options[0]?.id);
          else E.endQuarter(s);
          if (s.phase === 'tipping') E.runTippingPoint(s);
        }
        expect(JSON.stringify(s)).toBe(snapshot);
      }
    }
  });
});
