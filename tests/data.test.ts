// Integrity of the declarative content in src/data.

import { describe, expect, it } from 'vitest';
import { E, craft } from './helpers';
import { CARDS, CARD_BY_ID } from '../src/data/cards';
import { EVENTS } from '../src/data/events';
import { ENDINGS, ENDING_BY_ID, EPILOGUES } from '../src/data/endings';
import { GAUGES, GAUGE_INFO, EU_LABELS } from '../src/data/gauges';
import { LEA_ENDING_LINE, LEA_Q1 } from '../src/data/lea';
import { ACTOR_RULES, NEWS } from '../src/data/news';
import { NOTES } from '../src/data/notes';
import { LEVERS, PLANS, PLAN_BY_ID } from '../src/data/plans';
import { SOURCES } from '../src/data/sources';
import { PLAN_LIKELY, REGION_NAMES } from '../src/data/text';
import { TUNING } from '../src/data/tuning';
import type { Condition } from '../src/data/conditions';
import type { EffectSpec } from '../src/data/schema';
import type { Flags } from '../src/engine/types';

const GAUGE_KEYS = Object.keys(TUNING.start.gauges);
const FLAG_KEYS = Object.keys(E.createInitialState(1).flags) as (keyof Flags)[];
const CARD_IDS = CARDS.map((c) => c.id);
const EVENT_IDS = EVENTS.map((e) => e.id);
const ACTORS = ['eu', 'us', 'china', 'us_labs', 'open_source', 'ai_systems'];
const REGIONS = ['eu', 'us', 'cn'];
const STAT_KEYS = [...GAUGE_KEYS, 'coalition', 'pc', 'budget', 'eu.economy', 'eu.culture', 'eu.state'];

/** Every condition key the engine understands (src/data/conditions.ts), and the type of value it compares with. */
function keyType(key: string): 'number' | 'boolean' | 'speed' | 'string' | null {
  const [head, rest] = [key.split('.')[0], key.split('.').slice(1).join('.')];
  if (head === 'flags') return (FLAG_KEYS as string[]).includes(rest) ? 'boolean' : null;
  if (head === 'played') return (CARD_IDS as string[]).includes(rest) ? 'number' : null;
  if (head === 'fired' || head === 'prepared') return (EVENT_IDS as string[]).includes(rest) ? 'number' : null;
  if (head === 'choice') return (EVENT_IDS as string[]).includes(rest) ? 'string' : null;
  if (head === 'start') return [...GAUGE_KEYS, 'coalition'].includes(rest) ? 'number' : null;
  if (key === 'speed') return 'speed';
  if (['quarter', 'asmlTokens', 'revealUntil', 'alignmentGap', 'eu.average', ...STAT_KEYS].includes(key)) return 'number';
  return null;
}

function* leaves(c: Condition): Generator<{ key: string; op: string; value: unknown }> {
  if ('all' in c) for (const x of c.all) yield* leaves(x);
  else if ('any' in c) for (const x of c.any) yield* leaves(x);
  else if ('not' in c) yield* leaves(c.not);
  else yield c;
}

/** Every condition in the content, labelled by where it lives. */
function allConditions(): [string, Condition][] {
  const out: [string, Condition][] = [];
  const effects = (where: string, list: EffectSpec[]) => list.forEach((e, i) => e.when && out.push([`${where}.effect${i}`, e.when]));
  for (const c of CARDS) {
    c.requirements.forEach((r, i) => out.push([`card ${c.id} requirement ${i}`, r.when]));
    c.dependencies.forEach((d, i) => out.push([`card ${c.id} dependency ${i}`, d.met]));
    c.advisorNotes.forEach((n, i) => n.when && out.push([`card ${c.id} advisor ${i}`, n.when]));
    effects(`card ${c.id}`, [...c.effects, ...c.hiddenEffects, ...(c.pending ?? [])]);
    for (const o of c.options ?? []) effects(`card ${c.id} option ${o.id}`, [...o.effects, ...o.hiddenEffects]);
  }
  for (const e of EVENTS) {
    out.push([`event ${e.id} trigger`, e.trigger], [`event ${e.id} prepared`, e.preparedWhen]);
    for (const v of [e.prepared, e.unprepared]) {
      effects(`event ${e.id}`, [...v.effects, ...v.hiddenEffects]);
      for (const o of v.options) effects(`event ${e.id} option ${o.id}`, [...o.effects, ...o.hiddenEffects]);
    }
  }
  for (const n of NEWS) out.push([`news ${n.id}`, n.when]);
  for (const n of NOTES) out.push([`note ${n.id}`, n.when]);
  return out;
}

const words = (s: string) => s.trim().split(/\s+/).length;
const unique = (xs: string[]) => new Set(xs).size === xs.length;

describe('identifiers', () => {
  it('are unique in every table', () => {
    expect(unique(CARD_IDS)).toBe(true);
    expect(unique(EVENT_IDS)).toBe(true);
    expect(unique(ENDINGS.map((e) => e.id))).toBe(true);
    expect(unique(PLANS.map((p) => p.id))).toBe(true);
    expect(unique(NEWS.map((n) => n.id))).toBe(true);
    expect(unique(NOTES.map((n) => n.id))).toBe(true);
    expect(unique(GAUGES.map((g) => g.key))).toBe(true);
    for (const c of CARDS) expect(unique((c.options ?? []).map((o) => o.id))).toBe(true);
    for (const e of EVENTS) for (const v of [e.prepared, e.unprepared]) expect(unique(v.options.map((o) => o.id))).toBe(true);
  });

  it('lookup tables match their lists', () => {
    for (const c of CARDS) expect(CARD_BY_ID[c.id]).toBe(c);
    for (const e of ENDINGS) expect(ENDING_BY_ID[e.id]).toBe(e);
    for (const p of PLANS) expect(PLAN_BY_ID[p.id]).toBe(p);
    for (const g of GAUGES) expect(GAUGE_INFO[g.key]).toBe(g);
    expect(Object.keys(PLAN_LIKELY).sort()).toEqual(PLANS.map((p) => p.id).sort());
    expect(Object.keys(LEA_ENDING_LINE).sort()).toEqual(ENDINGS.map((e) => e.id).sort());
    expect(Object.keys(LEA_Q1).sort()).toEqual(Object.keys(TUNING.start.speedOdds).sort());
    expect(Object.keys(TUNING.plans.aftermath).sort()).toEqual(PLANS.map((p) => p.id).sort());
    expect(Object.keys(EPILOGUES).sort()).toEqual(['high', 'low', 'mid']);
    expect(Object.keys(EU_LABELS).sort()).toEqual(['culture', 'economy', 'state']);
    expect(Object.keys(REGION_NAMES).sort()).toEqual([...REGIONS].sort());
  });

  it('gauges cover every gauge and the coalition, with only true alignment hidden', () => {
    expect(GAUGES.map((g) => g.key).sort()).toEqual([...GAUGE_KEYS, 'coalition'].sort());
    expect(GAUGES.filter((g) => !g.visible).map((g) => g.key)).toEqual(['trueAlignment']);
  });

  it('actors and regions are known', () => {
    for (const x of [...CARDS.map(() => ({ actor: 'eu', region: 'eu' })), ...EVENTS, ...NEWS, ...NOTES, ...Object.values(ACTOR_RULES)]) {
      expect(ACTORS).toContain(x.actor);
      expect(REGIONS).toContain(x.region);
    }
  });
});

describe('sources', () => {
  it('every card, event, already-real fact, plan and ending cites a source with an https URL', () => {
    const all = [
      ...CARDS.map((c) => [`card ${c.id}`, c.source] as const),
      ...EVENTS.map((e) => [`event ${e.id}`, e.source] as const),
      ...EVENTS.map((e) => [`event ${e.id} already real`, e.alreadyReal.source] as const),
      ...PLANS.map((p) => [`plan ${p.id}`, p.source] as const),
      ...ENDINGS.map((e) => [`ending ${e.id}`, e.source] as const),
      ...Object.entries(SOURCES).map(([k, s]) => [`source ${k}`, s] as const),
    ];
    for (const [where, s] of all) {
      expect(s.label.length, where).toBeGreaterThan(2);
      expect(() => new URL(s.url), where).not.toThrow();
      expect(s.url, where).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/);
    }
  });
});

describe('player-facing text', () => {
  it('card texts are at most 25 words', () => {
    for (const c of CARDS) expect(words(c.playerText), c.id).toBeLessThanOrEqual(25);
  });

  it('advisor notes hint in words: no digits, in every variant and option', () => {
    for (const c of CARDS) {
      for (const n of c.advisorNotes) expect(n.text, c.id).not.toMatch(/\d/);
      for (const o of c.options ?? []) expect(o.advisorNote, `${c.id} ${o.id}`).not.toMatch(/\d/);
      // the last advisor variant is the fallback: it has no condition
      expect(c.advisorNotes.at(-1)!.when, c.id).toBeUndefined();
    }
  });

  it('no text is empty, and none carries an unfilled placeholder', () => {
    const texts: [string, string][] = [];
    const add = (where: string, x: unknown) => {
      if (typeof x === 'string') texts.push([where, x]);
      else if (Array.isArray(x)) x.forEach((v, i) => add(`${where}[${i}]`, v));
      else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!['when', 'met', 'trigger', 'preparedWhen'].includes(k)) add(`${where}.${k}`, v);
    };
    add('cards', CARDS);
    add('events', EVENTS);
    add('endings', ENDINGS);
    add('epilogues', EPILOGUES);
    add('plans', PLANS);
    add('levers', LEVERS);
    add('gauges', GAUGES);
    add('news', NEWS);
    add('notes', NOTES);
    add('actors', ACTOR_RULES);
    add('lea', LEA_ENDING_LINE);
    for (const [where, t] of texts) {
      expect(t.trim().length, where).toBeGreaterThan(0);
      expect(t, where).not.toMatch(/undefined|NaN|\[object Object\]|\$\{|TODO|TBD/);
    }
  });

  it('event clauses read inside a sentence: short labels and causes have no final period', () => {
    for (const e of EVENTS) {
      for (const v of [e.prepared, e.unprepared]) {
        expect(v.short, e.id).not.toMatch(/\.$/);
        expect(v.cause, e.id).not.toMatch(/\.$/);
        expect(v.scene.length).toBeGreaterThan(40);
        expect(v.debrief).toMatch(/\.$/);
      }
      expect(e.preparedLabel).not.toMatch(/\.$/);
    }
  });

  it('every card has a downside, a debrief and at least one echo line; cost labels name the costs', () => {
    for (const c of CARDS) {
      expect(c.downside.length, c.id).toBeGreaterThan(5);
      expect(c.debrief.length, c.id).toBeGreaterThan(5);
      expect(c.echoNews.length, c.id).toBeGreaterThanOrEqual(1);
      if (c.cost.pc) expect(c.costLabel, c.id).toContain(`${c.cost.pc} PC`);
      if (c.cost.budget) expect(c.costLabel, c.id).toContain(`${c.cost.budget} Budget`);
      if (!c.cost.pc) expect(c.costLabel, c.id).not.toMatch(/PC/);
      if (!c.cost.budget) expect(c.costLabel, c.id).not.toMatch(/Budget/);
    }
  });

  it('cards with hidden stat effects say they have hidden effects', () => {
    for (const c of CARDS) if (c.hiddenEffects.length) expect(c.hasHiddenEffects, c.id).toBe(true);
  });

  it('hidden effects only touch hidden stats; visible effects only visible ones', () => {
    const hidden = ['trueAlignment', 'eu.economy', 'eu.culture', 'eu.state'];
    const check = (where: string, vis: EffectSpec[], hid: EffectSpec[]) => {
      for (const e of vis) expect(hidden, where).not.toContain(e.key);
      for (const e of hid) expect(hidden, where).toContain(e.key);
    };
    for (const c of CARDS) {
      check(c.id, c.effects, c.hiddenEffects);
      for (const o of c.options ?? []) check(`${c.id} ${o.id}`, o.effects, o.hiddenEffects);
    }
    for (const e of EVENTS) for (const v of [e.prepared, e.unprepared]) check(e.id, v.effects, v.hiddenEffects);
  });
});

describe('conditions', () => {
  it('every condition key used in the content is a key the engine understands, compared with a value of the right type', () => {
    const conds = allConditions();
    expect(conds.length).toBeGreaterThan(150);
    for (const [where, c] of conds) {
      for (const leaf of leaves(c)) {
        const t = keyType(leaf.key);
        expect(t, `${where}: ${leaf.key}`).not.toBeNull();
        if (t === 'boolean') expect(typeof leaf.value, where).toBe('boolean');
        if (t === 'number') expect(typeof leaf.value, where).toBe('number');
        if (t === 'speed') expect(['slow', 'steady', 'fast'], where).toContain(leaf.value);
        if (t === 'string') expect(typeof leaf.value, where).toBe('string');
        if (t === 'boolean' || t === 'speed' || t === 'string') expect(['==', '!='], where).toContain(leaf.op);
      }
      // and the engine can evaluate it
      expect(() => E.evalCondition(craft({}), c), where).not.toThrow();
    }
  });

  it('every effect key is a stat the engine can change', () => {
    const effects: [string, EffectSpec][] = [];
    for (const c of CARDS) {
      for (const e of [...c.effects, ...c.hiddenEffects, ...(c.pending ?? [])]) effects.push([c.id, e]);
      for (const o of c.options ?? []) for (const e of [...o.effects, ...o.hiddenEffects]) effects.push([`${c.id}.${o.id}`, e]);
    }
    for (const ev of EVENTS) for (const v of [ev.prepared, ev.unprepared]) {
      for (const e of [...v.effects, ...v.hiddenEffects]) effects.push([ev.id, e]);
      for (const o of v.options) for (const e of [...o.effects, ...o.hiddenEffects]) effects.push([`${ev.id}.${o.id}`, e]);
    }
    for (const [where, e] of effects) {
      expect(STAT_KEYS, where).toContain(e.key);
      expect(Number.isInteger(e.amount) && e.amount !== 0, where).toBe(true);
    }
  });

  it('flags set by content are known flags', () => {
    for (const c of CARDS) for (const k of Object.keys(c.setFlags ?? {})) expect(FLAG_KEYS, c.id).toContain(k);
    for (const e of EVENTS) for (const v of [e.prepared, e.unprepared]) for (const k of Object.keys(v.setFlags ?? {})) expect(FLAG_KEYS, e.id).toContain(k);
  });

  it('the condition evaluator handles every operator and combinator', () => {
    const s = craft({ gauges: { tension: 50 } });
    const ev = (c: Condition) => E.evalCondition(s, c);
    expect([ev({ key: 'tension', op: '<', value: 50 }), ev({ key: 'tension', op: '<=', value: 50 })]).toEqual([false, true]);
    expect([ev({ key: 'tension', op: '>', value: 50 }), ev({ key: 'tension', op: '>=', value: 50 })]).toEqual([false, true]);
    expect([ev({ key: 'tension', op: '==', value: 50 }), ev({ key: 'tension', op: '!=', value: 50 })]).toEqual([true, false]);
    expect(ev({ all: [] })).toBe(true);
    expect(ev({ any: [] })).toBe(false);
    expect(ev({ not: { key: 'speed', op: '==', value: 'steady' } })).toBe(false);
    expect(ev({ key: 'choice.ransomware', op: '==', value: '' })).toBe(true);
    expect(ev({ key: 'played.coalition', op: '==', value: 0 })).toBe(true);
    expect(ev({ key: 'start.coalition', op: '==', value: 0 })).toBe(true);
    expect(ev({ key: 'eu.average', op: '==', value: 80 })).toBe(true);
    expect(() => ev({ key: 'nonsense', op: '==', value: 1 })).toThrow(/Unknown condition key/);
  });
});

describe('endings', () => {
  it('each world has one good and one bad ending, and both are reachable through resolveEnding', () => {
    const reached = new Set<string>();
    const base = craft({});
    const variants = [
      { gauges: { concentration: 30 } },
      { gauges: { concentration: 30 }, firedEvents: { ransomware: { quarter: 3, prepared: false } } },
      { gauges: { concentration: 80 } },
      { gauges: { concentration: 80 }, eu: { economy: 10, culture: 80, state: 80 } },
    ];
    for (const v of variants) reached.add(E.resolveEnding({ ...base, ...v, gauges: { ...base.gauges, ...v.gauges } } as never));
    for (const plan of PLANS) {
      for (const g of [
        { verification: 80, concentration: 40, trueAlignment: 80, tension: 10 },
        { verification: 0, concentration: 90, trueAlignment: 10, tension: 90 },
      ]) {
        for (const coalition of [0, 2]) {
          const s = { ...base, coalition, gauges: { ...base.gauges, ...g } };
          reached.add(E.resolveEnding({ ...s, tipping: { odds: E.planOdds(s), plan: plan.id, labRestraint: null } }));
        }
      }
    }
    expect([...reached].sort()).toEqual(ENDINGS.map((e) => e.id).sort());
  });

  it('the ending a state resolves to belongs to the world of its plan', () => {
    const world = { verified_slowdown: 'diplomacy', shut_down: 'diplomacy', fight_china: 'arms_race', race: 'take_off' } as const;
    const base = craft({});
    for (const plan of PLANS) {
      const id = E.resolveEnding({ ...base, tipping: { odds: E.planOdds(base), plan: plan.id, labRestraint: null } });
      expect(ENDING_BY_ID[id].world).toBe(world[plan.id]);
    }
  });
});

describe('tuning', () => {
  it('the starting odds of the takeoff speed sum to 1', () => {
    expect(Object.values(TUNING.start.speedOdds).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('the starting values are the documented ones', () => {
    const s = E.createInitialState(1);
    expect([45, 55, 65]).toContain(s.gauges.trueAlignment);
    expect(s.gauges).toEqual({
      capability: 20,
      concentration: 50,
      apparentAlignment: 60,
      trueAlignment: s.gauges.trueAlignment,
      verification: 0,
      tension: 40,
      misuse: 10,
      publicPressure: 20,
      gdp: 50,
      approval: 50,
    });
    expect([s.pc, s.budget, s.asmlTokens, s.coalition, s.quarter, s.phase]).toEqual([4, 5, 2, 0, 1, 'quarter']);
    expect(s.eu).toEqual({ economy: 80, culture: 80, state: 80 });
    expect(Object.values(s.flags).every((f) => f === false)).toBe(true);
  });

  it('hidden true alignment starts at 45, 55 or 65, equally likely and seeded', () => {
    const n = 3000;
    const counts: Record<number, number> = {};
    for (let seed = 0; seed < n; seed++) {
      const t = E.createInitialState(seed).gauges.trueAlignment;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    expect(Object.keys(counts).map(Number).sort()).toEqual([45, 55, 65]);
    for (const k of [45, 55, 65]) expect(counts[k] / n).toBeCloseTo(1 / 3, 1);
    expect(E.createInitialState(7).gauges.trueAlignment).toBe(E.createInitialState(7).gauges.trueAlignment);
  });

  it('the takeoff speed is drawn 25% slow, 50% steady, 25% fast', () => {
    const n = 4000;
    const counts = { slow: 0, steady: 0, fast: 0 };
    for (let seed = 0; seed < n; seed++) counts[E.createInitialState(seed).takeoffSpeed]++;
    expect(counts.slow / n).toBeCloseTo(0.25, 1);
    expect(counts.steady / n).toBeCloseTo(0.5, 1);
    expect(counts.fast / n).toBeCloseTo(0.25, 1);
  });
});
