import { describe, expect, it } from 'vitest';
import * as E from '../src/engine/index';
import { engine, resolveEnding } from '../src/engine/index';
import type { CardId, EndingId, GameState, PlanId } from '../src/engine/types';
import { CARDS } from '../src/data/cards';
import { EVENTS } from '../src/data/events';
import { ENDINGS } from '../src/data/endings';
import { NEWS } from '../src/data/news';
import { NOTES } from '../src/data/notes';

// ---------- helpers ----------

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

/** A state at the start of `quarter`, before startQuarter ran, with overrides applied. */
function craft(over: {
  quarter?: number;
  gauges?: Partial<GameState['gauges']>;
  flags?: Partial<GameState['flags']>;
  eu?: Partial<GameState['eu']>;
  coalition?: number;
  pc?: number;
  budget?: number;
  speed?: GameState['takeoffSpeed'];
  seed?: number;
}): GameState {
  const s = E.createInitialState(over.seed ?? 42);
  return {
    ...s,
    quarter: over.quarter ?? 5,
    gauges: { ...s.gauges, ...over.gauges },
    flags: { ...s.flags, ...over.flags },
    eu: { ...s.eu, ...over.eu },
    coalition: over.coalition ?? s.coalition,
    pc: over.pc ?? 20,
    budget: over.budget ?? 20,
    takeoffSpeed: over.speed ?? 'steady',
  };
}

/** Play a whole game with a fixed policy; returns the final state and the trail of states. */
function playThrough(seed: number, policy: (s: GameState) => CardId | null): GameState {
  let s = E.createInitialState(seed);
  for (let i = 0; i < 20; i++) {
    s = E.startQuarter(s);
    s = E.collectBubble(s, 'eu');
    if (s.pendingEvent) s = E.resolveEvent(s, s.pendingEvent.options[0]?.id);
    const id = policy(s);
    const view = id && E.cardViews(s).find((c) => c.id === id);
    s = view && view.available && view.affordable ? E.playCard(s, id!, view.options[0]?.id).state : E.pass(s);
    const out = E.endQuarter(s);
    s = out.state;
    if (out.outcome === 'tipping_point') return E.runTippingPoint(s);
    if (out.outcome === 'game_over') return s;
  }
  throw new Error('game did not end');
}

const visible = (deltas: { key: string; amount: number }[]) => Object.fromEntries(deltas.map((d) => [d.key, d.amount]));

// ---------- API shape ----------

describe('API', () => {
  it('exposes every EngineApi function by name and on `engine`', () => {
    const names = [
      'createInitialState',
      'startQuarter',
      'collectBubble',
      'resolveEvent',
      'situationReport',
      'gaugeViews',
      'cardViews',
      'previewCard',
      'playCard',
      'pass',
      'endQuarter',
      'planOdds',
      'runTippingPoint',
      'debrief',
      'leaScene',
      'dateLabel',
      'goalLine',
      'forecastLine',
    ];
    for (const n of names) {
      expect(typeof (engine as unknown as Record<string, unknown>)[n]).toBe('function');
      expect(typeof (E as unknown as Record<string, unknown>)[n]).toBe('function');
    }
  });

  it('labels dates and lines', () => {
    expect(E.dateLabel(1)).toBe('Q1 2027');
    expect(E.dateLabel(3)).toBe('Q3 2027');
    expect(E.dateLabel(16)).toBe('Q4 2030');
    expect(E.goalLine()).toBe('Goal: when AI starts improving itself, the world must be able to verify a deal.');
    expect(E.forecastLine(E.createInitialState(1))).toMatch(/^On current course: .+ \(\d+%\)\. What would help: .+\.$/);
  });
});

// ---------- determinism and purity ----------

describe('determinism and immutability', () => {
  const policy = (s: GameState): CardId | null => (['ai_office', 'coalition', 'host_verification', 'fund_alignment'] as CardId[])[s.quarter % 4];

  it('same seed and same decisions give the same game', () => {
    expect(playThrough(123, policy)).toEqual(playThrough(123, policy));
  });

  it('different seeds give different games', () => {
    const a = [1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(E.startQuarter(E.createInitialState(seed)).news));
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('never mutates its input', () => {
    let s = E.createInitialState(9);
    for (let q = 0; q < 6; q++) {
      const frozen = deepFreeze(structuredClone(s));
      const snapshot = JSON.stringify(frozen);
      const next = E.startQuarter(frozen);
      expect(JSON.stringify(frozen)).toBe(snapshot);
      const n2 = deepFreeze(next.pendingEvent ? E.resolveEvent(next, next.pendingEvent.options[0]?.id) : next);
      const snap2 = JSON.stringify(n2);
      E.collectBubble(n2, 'eu');
      E.situationReport(n2);
      E.gaugeViews(n2);
      E.cardViews(n2);
      E.previewCard(n2, 'host_verification');
      E.previewCard(n2, 'asml', 'safety_commitment');
      E.planOdds(n2);
      E.forecastLine(n2);
      E.leaScene(n2, 'q6');
      const choice = E.cardViews(n2).find((c) => c.available && c.affordable && c.options.length === 0)!;
      const played = E.playCard(n2, choice.id);
      E.pass(n2);
      expect(JSON.stringify(n2)).toBe(snap2);
      const ended = E.endQuarter(deepFreeze(played.state));
      s = ended.state;
    }
  });

  it('uses no Math.random', () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error('Math.random used');
    };
    try {
      playThrough(5, () => 'fund_alignment');
    } finally {
      Math.random = original;
    }
  });
});

// ---------- quarter loop ----------

describe('income, upkeep, pending effects', () => {
  it('gives no income in Q1 and +1 PC +1 Budget afterwards', () => {
    const s1 = E.startQuarter(E.createInitialState(1));
    expect(s1.pc).toBe(4);
    expect(s1.budget).toBe(3);
    const s2 = E.startQuarter(E.endQuarter(E.pass(s1)).state);
    expect(s2.pc).toBe(5);
    expect(s2.budget).toBe(4);
  });

  it('gives +1 PC more when public pressure is 50+', () => {
    const s = E.startQuarter(craft({ gauges: { publicPressure: 55 }, pc: 0, budget: 0 }));
    expect(s.pc).toBe(2);
    expect(s.budget).toBe(1);
  });

  it('charges 1 PC of upkeep per coalition level', () => {
    const s = E.startQuarter(craft({ coalition: 2, pc: 5 }));
    expect(s.pc).toBe(5 + 1 - 2);
    expect(s.coalition).toBe(2);
  });

  it('loses partners it cannot pay for', () => {
    const s = E.startQuarter(craft({ coalition: 3, pc: 0 }));
    // income 1 PC: can pay for one partner only
    expect(s.coalition).toBe(1);
    expect(s.pc).toBe(0);
    expect(s.log.some((e) => e.id === 'upkeep_unpaid')).toBe(true);
  });

  it('applies pending effects at the start of next quarter', () => {
    const s = craft({ gauges: { capability: 35 }, pc: 5 });
    const played = E.playCard(E.startQuarter(s), 'flexicurity').state;
    expect(played.pending).toEqual([{ key: 'pc', amount: -1, hidden: false }]);
    const pcBefore = played.pc;
    const next = E.startQuarter(E.endQuarter(played).state);
    expect(next.pc).toBe(pcBefore + 1 - 1);
    expect(next.pending).toEqual([]);
  });

  it('caps concern bubbles at 2 PC per quarter', () => {
    let s = E.startQuarter(E.createInitialState(3));
    const pc = s.pc;
    for (let i = 0; i < 4; i++) s = E.collectBubble(s, 'us');
    expect(s.pc).toBe(pc + 2);
    expect(s.bubblesThisQuarter).toBe(2);
  });

  it('runs actors and drift every quarter', () => {
    const s0 = craft({ gauges: { tension: 59, capability: 30 }, speed: 'fast' });
    const s = E.startQuarter(s0);
    expect(s.gauges.apparentAlignment).toBe(s0.gauges.apparentAlignment + 1);
    expect(s.gauges.concentration).toBe(s0.gauges.concentration + 1);
    expect(s.gauges.capability).toBe(36);
    expect(s.gauges.tension).toBe(60);
    expect(s.gauges.trueAlignment).toBe(49);
    // chip controls fire once tension is 60+ at the start of a quarter
    const s2 = E.startQuarter(E.endQuarter(E.pass(s)).state);
    expect(s2.flags.exportControls).toBe(true);
    expect(s2.log.some((e) => e.id === 'us_chip_controls' && e.quarter === s2.quarter)).toBe(true);
  });

  it('does not run a quarter twice', () => {
    const s = E.startQuarter(E.createInitialState(2));
    expect(E.startQuarter(s)).toEqual(s);
  });

  it('clamps gauges to 0–100', () => {
    const s = E.startQuarter(craft({ gauges: { capability: 99, gdp: 100, tension: 100 } }));
    for (const v of Object.values(s.gauges)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('produces 2–4 news lines per quarter, 0–2 notes, all timed in 0..1, never repeated', () => {
    for (const seed of [1, 2, 3, 4]) {
      const s = playThrough(seed, () => 'fund_alignment');
      const quarters = new Set(s.news.map((n) => n.quarter));
      for (const q of quarters) {
        const n = s.news.filter((x) => x.quarter === q).length;
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(4);
        expect(s.notes.filter((x) => x.quarter === q).length).toBeLessThanOrEqual(2);
      }
      for (const n of [...s.news, ...s.notes]) {
        expect(n.at).toBeGreaterThanOrEqual(0);
        expect(n.at).toBeLessThanOrEqual(1);
      }
      expect(new Set(s.news.map((n) => n.text)).size).toBe(s.news.length);
      expect(new Set(s.news.map((n) => n.id)).size).toBe(s.news.length);
    }
  });

  it('makes notes readable with the AI Office or during an audit', () => {
    const s = E.startQuarter(craft({ flags: { aiOffice: true } }));
    expect(s.notes.every((n) => n.readable)).toBe(true);
    const locked = E.startQuarter(craft({ seed: 11 }));
    expect(locked.notes.every((n) => !n.readable)).toBe(true);
    const audited = E.playCard(locked, 'measure').state;
    expect(audited.revealUntil).toBe(locked.quarter + 3);
    expect(audited.notes.filter((n) => n.quarter === locked.quarter).every((n) => n.readable)).toBe(true);
    const later = E.startQuarter(E.endQuarter(audited).state);
    expect(later.notes.filter((n) => n.quarter === later.quarter).every((n) => n.readable)).toBe(true);
  });

  it('writes notes consistent with the hidden alignment gap', () => {
    const lying = E.startQuarter(craft({ gauges: { apparentAlignment: 80, trueAlignment: 40 } }));
    const honest = E.startQuarter(craft({ gauges: { apparentAlignment: 55, trueAlignment: 55 } }));
    const large = new Set(NOTES.filter((n) => n.id.startsWith('gapL')).map((n) => `note.${n.id}`));
    const small = new Set(NOTES.filter((n) => n.id.startsWith('gapS')).map((n) => `note.${n.id}`));
    expect(lying.notes.some((n) => small.has(n.id))).toBe(false);
    expect(honest.notes.some((n) => large.has(n.id))).toBe(false);
  });
});

// ---------- cards ----------

describe('cards', () => {
  const base = () => E.startQuarter(craft({ gauges: { capability: 35 } }));

  it('has 10 cards with short player texts, a downside and a source', () => {
    expect(CARDS).toHaveLength(10);
    for (const c of CARDS) {
      expect(c.playerText.split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(c.downside.length).toBeGreaterThan(0);
      expect(c.source.url).toMatch(/^https:\/\//);
    }
    expect(CARDS.filter((c) => !c.isLouis).map((c) => c.id).sort()).toEqual(['fund_alignment', 'weight_security']);
  });

  it('coalition: +1, costs 2 PC, locked at 3 or tension 70+', () => {
    const s = base();
    const { state, briefing } = E.playCard(s, 'coalition');
    expect(state.coalition).toBe(1);
    expect(state.pc).toBe(s.pc - 2);
    expect(visible(briefing.visibleDeltas)).toMatchObject({ coalition: 1, pc: -2 });
    expect(E.cardViews({ ...s, coalition: 3 }).find((c) => c.id === 'coalition')!.available).toBe(false);
    const tense = E.cardViews({ ...s, gauges: { ...s.gauges, tension: 70 } }).find((c) => c.id === 'coalition')!;
    expect(tense.available).toBe(false);
    expect(tense.lockedReason).toMatch(/tension/i);
  });

  it('host verification: +15 with AI Office, +7 without; tension +5', () => {
    const s = base();
    const without = E.playCard(s, 'host_verification').state;
    expect(without.gauges.verification - s.gauges.verification).toBe(7);
    expect(without.gauges.tension - s.gauges.tension).toBe(5);
    expect(without.budget).toBe(s.budget - 2);
    const withOffice = E.playCard({ ...s, flags: { ...s.flags, aiOffice: true } }, 'host_verification').state;
    expect(withOffice.gauges.verification - s.gauges.verification).toBe(15);
  });

  it('ASML: tension +15, model access gdp +5 or hidden alignment +5, two tokens, needs capability 30', () => {
    const s = base();
    const a = E.playCard(s, 'asml', 'model_access');
    expect(a.state.gauges.tension - s.gauges.tension).toBe(15);
    expect(a.state.gauges.gdp - s.gauges.gdp).toBe(5);
    expect(a.state.asmlTokens).toBe(1);
    const b = E.playCard(s, 'asml', 'safety_commitment');
    expect(b.state.gauges.trueAlignment - s.gauges.trueAlignment).toBe(5);
    expect(b.briefing.visibleDeltas.some((d) => d.key === 'trueAlignment')).toBe(false);
    expect(b.state.log.at(-1)!.hiddenDeltas).toEqual([{ key: 'trueAlignment', amount: 5, hidden: true }]);
    expect(() => E.playCard(s, 'asml')).toThrow();
    const early = { ...s, gauges: { ...s.gauges, capability: 25 } };
    expect(E.cardViews(early).find((c) => c.id === 'asml')!.available).toBe(false);
    const noTokens = { ...s, asmlTokens: 0, cardsPlayed: { asml: 2 } };
    expect(E.cardViews(noTokens).find((c) => c.id === 'asml')!.available).toBe(false);
  });

  it('AI Office: narrows error bars, makes notes readable, once', () => {
    const s = base();
    const bars = (x: GameState) => Object.fromEntries(E.gaugeViews(x).map((g) => [g.key, g.errorBar]));
    expect(bars(s)).toMatchObject({ capability: 10, apparentAlignment: 15 });
    const t = E.playCard(s, 'ai_office').state;
    expect(bars(t)).toMatchObject({ capability: 5, apparentAlignment: 5 });
    expect(t.notes.every((n) => n.readable)).toBe(true);
    expect(E.cardViews(t).find((c) => c.id === 'ai_office')!.lockedReason).toBe('Already played');
  });

  it('measure: costs 1 Budget and 1 PC and reveals scores for 3 quarters', () => {
    const s = base();
    const t = E.playCard(s, 'measure').state;
    expect(t.pc).toBe(s.pc - 1);
    expect(t.budget).toBe(s.budget - 1);
    expect(t.revealUntil).toBe(s.quarter + 3);
  });

  it('open models: concentration −15, misuse +10, hidden economy +5', () => {
    const s = base();
    const { state, briefing } = E.playCard(s, 'open_models');
    expect(visible(briefing.visibleDeltas)).toMatchObject({ concentration: -15, misuse: 10, budget: -2 });
    expect(state.eu.economy - s.eu.economy).toBe(5);
    expect(state.flags.openModels).toBe(true);
  });

  it('oversight mandate: gdp −5 and halves the loss of human influence', () => {
    const s = base();
    const t = E.playCard(s, 'oversight_mandate').state;
    expect(t.gauges.gdp - s.gauges.gdp).toBe(-5);
    const next = (x: GameState) => E.startQuarter(E.endQuarter(x).state);
    const without = next(E.pass(s));
    const withMandate = next(t);
    expect(s.eu.economy - without.eu.economy).toBe(4);
    expect(s.eu.economy - withMandate.eu.economy).toBe(2);
  });

  it('flexicurity: stops approval drift, PC −1 next quarter', () => {
    const s = E.startQuarter(craft({ gauges: { capability: 60 } }));
    const t = E.playCard(s, 'flexicurity').state;
    const nextWith = E.startQuarter(E.endQuarter(t).state);
    const nextWithout = E.startQuarter(E.endQuarter(E.pass(s)).state);
    expect(nextWith.gauges.approval - t.gauges.approval).toBe(0);
    expect(nextWithout.gauges.approval - s.gauges.approval).toBe(-1);
    expect(E.cardViews(E.startQuarter(craft({ gauges: { capability: 20 } }))).find((c) => c.id === 'flexicurity')!.available).toBe(false);
  });

  it('weight security: concentration +5, locked after a theft', () => {
    const s = base();
    const t = E.playCard(s, 'weight_security').state;
    expect(t.gauges.concentration - s.gauges.concentration).toBe(5);
    expect(t.flags.weightSecurity).toBe(true);
    expect(t.pc).toBe(s.pc - 1);
    const stolen = { ...s, firedEvents: { weight_theft: { quarter: 3, prepared: false } } };
    expect(E.cardViews(stolen).find((c) => c.id === 'weight_security')!.available).toBe(false);
  });

  it('fund alignment: hidden true alignment +6, nothing visible but the cost', () => {
    const s = base();
    const { state, briefing } = E.playCard(s, 'fund_alignment');
    expect(state.gauges.trueAlignment - s.gauges.trueAlignment).toBe(6);
    expect(briefing.visibleDeltas).toEqual([{ key: 'budget', amount: -2, hidden: false }]);
  });

  it('refuses a second decision, unaffordable cards and decisions during an event', () => {
    const s = base();
    const t = E.playCard(s, 'fund_alignment').state;
    expect(() => E.playCard(t, 'measure')).toThrow();
    expect(() => E.playCard({ ...s, budget: 1 }, 'fund_alignment')).toThrow();
    expect(E.cardViews({ ...s, budget: 1 }).find((c) => c.id === 'fund_alignment')!.affordable).toBe(false);
  });

  it('every briefing has an advisor note in words, without numbers', () => {
    const s = E.startQuarter(craft({ gauges: { capability: 40 } }));
    for (const c of CARDS) {
      const opts = c.options?.map((o) => o.id) ?? [undefined];
      for (const o of opts) {
        const { briefing } = E.playCard(s, c.id, o);
        expect(briefing.advisorNote.length).toBeGreaterThan(20);
        expect(briefing.advisorNote).not.toMatch(/\d/);
      }
    }
  });

  it('preview shows visible deltas, costs, odds and a hidden-effects warning without revealing them', () => {
    const s = base();
    const p = E.previewCard(s, 'fund_alignment');
    expect(p.visibleDeltas).toEqual([]);
    expect(p.costs).toEqual([{ key: 'budget', amount: -2, hidden: false }]);
    expect(p.notes.some((n) => /hidden effects/i.test(n))).toBe(true);
    expect(p.notes.join(' ')).not.toMatch(/alignment \+|\+6/);
    const h = E.previewCard(s, 'host_verification');
    expect(visible(h.visibleDeltas)).toEqual({ verification: 7, tension: 5 });
    expect(h.notes.some((n) => /AI Office/.test(n) && /not yet/.test(n))).toBe(true);
    expect(h.oddsAfter.verified_slowdown).toBeGreaterThan(h.oddsBefore.verified_slowdown);
    const a = E.previewCard(s, 'asml', 'safety_commitment');
    expect(a.visibleDeltas.some((d) => d.hidden)).toBe(false);
    expect(a.notes.some((n) => /hidden effects/i.test(n))).toBe(true);
    // preview works even when the card cannot be afforded, and reports full costs
    const poor = E.previewCard({ ...s, budget: 0 }, 'host_verification');
    expect(poor.costs).toEqual([{ key: 'budget', amount: -2, hidden: false }]);
  });
});

// ---------- events ----------

describe('events', () => {
  const fire = (over: Parameters<typeof craft>[0]) => E.startQuarter(craft(over));

  it('has five events with scenes, why it matters and a real source', () => {
    expect(EVENTS).toHaveLength(5);
    for (const e of EVENTS) {
      expect(e.alreadyReal.source.url).toMatch(/^https:\/\//);
      expect(e.whyItMatters.length).toBeGreaterThan(10);
      expect(e.prepared.scene).not.toBe('');
      expect(e.unprepared.scene).not.toBe('');
    }
  });

  it('warning shot, prepared: pressure +15, tension −10, verification +10', () => {
    const s0 = craft({ gauges: { trueAlignment: 40, capability: 64, verification: 35, tension: 40 }, coalition: 1 });
    const s = E.startQuarter(s0);
    expect(s.pendingEvent?.id).toBe('warning_shot');
    expect(s.pendingEvent?.prepared).toBe(true);
    expect(s.flags.warningShotPrepared).toBe(true);
    expect(visible(s.pendingEvent!.appliedDeltas)).toMatchObject({ publicPressure: 15, tension: -10, verification: 10 });
    expect(s.pendingEvent!.scene).toMatch(/^At 3:12 a\.m\./);
    expect(s.pendingEvent!.options).toEqual([]);
  });

  it('warning shot, unprepared: pressure +5 only', () => {
    const s = fire({ gauges: { trueAlignment: 40, capability: 64 } });
    expect(s.pendingEvent?.id).toBe('warning_shot');
    expect(s.pendingEvent?.prepared).toBe(false);
    expect(visible(s.pendingEvent!.appliedDeltas)).toEqual({ publicPressure: 5 });
    expect(s.pendingEvent!.scene).toMatch(/Nobody has a mechanism to do more, so nobody does\.$/);
  });

  it('weight theft, prepared: tension +5', () => {
    const s = fire({ gauges: { tension: 55, capability: 45, trueAlignment: 60 }, flags: { weightSecurity: true } });
    expect(s.pendingEvent?.id).toBe('weight_theft');
    expect(s.pendingEvent?.prepared).toBe(true);
    expect(visible(s.pendingEvent!.appliedDeltas)).toEqual({ tension: 5 });
  });

  it('weight theft, unprepared: capability +5, tension +20, pressure +5, hidden alignment −3, export controls', () => {
    const s0 = craft({ gauges: { tension: 55, capability: 45, trueAlignment: 60 } });
    const s = E.startQuarter(s0);
    expect(s.pendingEvent?.id).toBe('weight_theft');
    expect(s.pendingEvent?.prepared).toBe(false);
    expect(visible(s.pendingEvent!.appliedDeltas)).toEqual({ capability: 5, tension: 20, publicPressure: 5 });
    expect(s.flags.exportControls).toBe(true);
    const entry = s.log.find((e) => e.id === 'weight_theft')!;
    expect(entry.hiddenDeltas).toEqual([{ key: 'trueAlignment', amount: -3, hidden: true }]);
    expect(E.situationReport(s).why.join(' ')).toMatch(/no weight security standards were in place/);
  });

  it('opaque reasoning: error bar unchanged with the AI Office, doubled without', () => {
    const prepared = fire({ gauges: { capability: 70, trueAlignment: 60 }, flags: { aiOffice: true } });
    expect(prepared.pendingEvent?.id).toBe('opaque_reasoning');
    expect(prepared.pendingEvent?.prepared).toBe(true);
    expect(E.gaugeViews(prepared).find((g) => g.key === 'apparentAlignment')!.errorBar).toBe(5);
    const unprepared = fire({ gauges: { capability: 70, trueAlignment: 60 } });
    expect(unprepared.pendingEvent?.prepared).toBe(false);
    expect(unprepared.flags.alignmentErrorDoubled).toBe(true);
    expect(E.gaugeViews(unprepared).find((g) => g.key === 'apparentAlignment')!.errorBar).toBe(30);
  });

  it('silicon blackmail, prepared: Europe stands firm at no cost', () => {
    const s = fire({ gauges: { concentration: 65, trueAlignment: 60 }, flags: { oversightMandate: true, openModels: true } });
    expect(s.pendingEvent?.id).toBe('silicon_blackmail');
    expect(s.pendingEvent?.prepared).toBe(true);
    expect(s.pendingEvent!.options).toEqual([]);
    expect(s.pendingEvent!.appliedDeltas).toEqual([]);
  });

  it('silicon blackmail, unprepared: give in (concentration +10) or hold firm (gdp −15)', () => {
    const s = fire({ gauges: { concentration: 65, trueAlignment: 60, gdp: 60 }, flags: { oversightMandate: true } });
    expect(s.pendingEvent?.prepared).toBe(false);
    expect(s.pendingEvent!.options.map((o) => o.id)).toEqual(['give_in', 'hold_firm']);
    expect(() => E.resolveEvent(s)).toThrow();
    const giveIn = E.resolveEvent(s, 'give_in');
    expect(giveIn.gauges.concentration - s.gauges.concentration).toBe(10);
    expect(giveIn.firedEvents.silicon_blackmail?.choice).toBe('give_in');
    expect(giveIn.pendingEvent).toBeNull();
    const hold = E.resolveEvent(s, 'hold_firm');
    expect(hold.gauges.gdp - s.gauges.gdp).toBe(-15);
  });

  it('ransomware, prepared: gdp −3', () => {
    const s = fire({ gauges: { misuse: 45, trueAlignment: 60 }, flags: { weightSecurity: true } });
    expect(s.pendingEvent?.id).toBe('ransomware');
    expect(s.pendingEvent?.prepared).toBe(true);
    expect(visible(s.pendingEvent!.appliedDeltas)).toEqual({ gdp: -3 });
  });

  it('ransomware, unprepared: gdp −10, approval −10, pressure +10, then emergency ban or defence spending', () => {
    const s = fire({ gauges: { misuse: 45, trueAlignment: 60, gdp: 60, approval: 60 }, budget: 5 });
    expect(s.pendingEvent?.prepared).toBe(false);
    expect(visible(s.pendingEvent!.appliedDeltas)).toEqual({ gdp: -10, approval: -10, publicPressure: 10 });
    const ban = E.resolveEvent(s, 'emergency_ban');
    expect(ban.gauges.misuse - s.gauges.misuse).toBe(-20);
    expect(ban.gauges.concentration - s.gauges.concentration).toBe(10);
    const defence = E.resolveEvent(s, 'defence_spending');
    expect(defence.budget - s.budget).toBe(-2);
    expect(defence.gauges.misuse - s.gauges.misuse).toBe(-10);
  });

  it('fires at most one event per quarter, in list order, each once', () => {
    // warning shot, weight theft, opaque reasoning and ransomware are all due
    const s0 = craft({ gauges: { trueAlignment: 40, capability: 72, tension: 55, misuse: 50 } });
    let s = E.startQuarter(s0);
    expect(s.pendingEvent?.id).toBe('warning_shot');
    expect(Object.keys(s.firedEvents)).toEqual(['warning_shot']);
    const order: string[] = ['warning_shot'];
    for (let i = 0; i < 4; i++) {
      s = E.resolveEvent(s, s.pendingEvent?.options[0]?.id);
      // keep capability below the tipping point so the sequence can continue
      s = E.startQuarter(E.endQuarter(E.pass({ ...s, gauges: { ...s.gauges, capability: 70 } })).state);
      if (s.pendingEvent) order.push(s.pendingEvent.id);
    }
    expect(order.slice(0, 4)).toEqual(['warning_shot', 'weight_theft', 'opaque_reasoning', 'ransomware']);
    expect(new Set(order).size).toBe(order.length);
  });

  it('blocks ending the quarter until the event is resolved', () => {
    const s = fire({ gauges: { misuse: 45, trueAlignment: 60 } });
    expect(() => E.endQuarter(s)).toThrow();
  });
});

// ---------- tipping point ----------

describe('tipping point', () => {
  it('triggers at capability 80, gives a free last decision, then picks a plan', () => {
    const s0 = { ...craft({ gauges: { capability: 76, trueAlignment: 60 }, pc: 0, budget: 0 }), firedEvents: { opaque_reasoning: { quarter: 2, prepared: true } } };
    const s = E.startQuarter(s0);
    expect(s.gauges.capability).toBeGreaterThanOrEqual(80);
    const { state, outcome } = E.endQuarter(E.pass(s));
    expect(outcome).toBe('tipping_point');
    expect(state.phase).toBe('tipping');
    expect(state.decidedThisQuarter).toBe(false);
    const views = E.cardViews(state);
    expect(views.find((c) => c.id === 'host_verification')!.affordable).toBe(true);
    const played = E.playCard(state, 'host_verification').state;
    expect(played.budget).toBe(state.budget);
    expect(played.gauges.verification).toBe(7);
    expect(E.endQuarter(played).outcome).toBe('tipping_point');
    const done = E.runTippingPoint(played);
    expect(done.phase).toBe('ended');
    expect(done.tipping).not.toBeNull();
    const sum = Object.values(done.tipping!.odds).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(done.ending).not.toBeNull();
    expect(done.tipping!.labRestraint === null).toBe(done.tipping!.plan !== 'race');
  });

  it('ends after Q16 without a tipping point in a slow world', () => {
    const s = E.startQuarter(craft({ quarter: 16, speed: 'slow', gauges: { capability: 50 } }));
    const { state, outcome } = E.endQuarter(E.pass(s));
    expect(outcome).toBe('game_over');
    expect(state.phase).toBe('ended');
    expect(state.tipping).toBeNull();
    expect(['bright_winter', 'decentralised_mayhem', 'agent_economy', 'silicon_blackmail']).toContain(state.ending);
  });

  it('a slow world never reaches the tipping point', () => {
    for (let seed = 0; seed < 60; seed++) {
      const s = playThrough(seed, () => null);
      if (s.takeoffSpeed === 'slow') expect(s.tipping).toBeNull();
      else expect(s.tipping).not.toBeNull();
    }
  });
});

// ---------- odds and endings ----------

describe('plan odds', () => {
  it('always sum to 1 and stay positive', () => {
    for (let seed = 0; seed < 40; seed++) {
      let s = E.createInitialState(seed);
      for (let q = 0; q < 10; q++) {
        s = E.startQuarter(s);
        if (s.pendingEvent) s = E.resolveEvent(s, s.pendingEvent.options[0]?.id);
        const odds = E.planOdds(s);
        const sum = Object.values(odds).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
        for (const v of Object.values(odds)) expect(v).toBeGreaterThan(0);
        const out = E.endQuarter(E.pass(s));
        if (out.outcome !== 'next_quarter') break;
        s = out.state;
      }
    }
  });

  it('verification, coalition and a prepared warning shot raise the slowdown odds; tension raises the fight odds', () => {
    const s = craft({});
    const better = craft({ gauges: { verification: 50 }, coalition: 2, flags: { warningShotPrepared: true } });
    expect(E.planOdds(better).verified_slowdown).toBeGreaterThan(E.planOdds(s).verified_slowdown);
    const tense = craft({ gauges: { tension: 90 } });
    expect(E.planOdds(tense).fight_china).toBeGreaterThan(E.planOdds(s).fight_china);
  });
});

describe('endings', () => {
  const ended = (over: Parameters<typeof craft>[0], plan: PlanId | null, extra: Partial<GameState> = {}): EndingId => {
    const s = { ...craft(over), ...extra };
    s.tipping = plan ? { odds: E.planOdds(s), plan, labRestraint: plan === 'race' ? false : null } : null;
    return resolveEnding(s);
  };

  it('reaches all ten endings from crafted states', () => {
    const got: EndingId[] = [
      ended({ gauges: { concentration: 50 } }, null),
      ended({ gauges: { concentration: 50 } }, null, { firedEvents: { ransomware: { quarter: 9, prepared: false, choice: 'emergency_ban' } } }),
      ended({ gauges: { concentration: 70 }, eu: { economy: 50 } }, null),
      ended({ gauges: { concentration: 70 }, eu: { economy: 50 } }, null, {
        firedEvents: { silicon_blackmail: { quarter: 9, prepared: false, choice: 'give_in' } },
      }),
      ended({ gauges: { verification: 60, concentration: 65, trueAlignment: 40 } }, 'verified_slowdown'),
      ended({ gauges: { verification: 20, concentration: 65, trueAlignment: 40 } }, 'shut_down'),
      ended({ gauges: { tension: 65 }, coalition: 1 }, 'fight_china'),
      ended({ gauges: { tension: 80 }, coalition: 1 }, 'fight_china'),
      ended({ gauges: { trueAlignment: 65 } }, 'race'),
      ended({ gauges: { trueAlignment: 30 } }, 'race'),
    ];
    expect(new Set(got)).toEqual(new Set(ENDINGS.map((e) => e.id)));
  });

  it('decides Big AI by holding firm and keeping a grip on the economy', () => {
    expect(ended({ gauges: { concentration: 70 }, eu: { economy: 30 } }, null)).toBe('silicon_blackmail');
    expect(
      ended({ gauges: { concentration: 70 }, eu: { economy: 50 } }, null, {
        firedEvents: { silicon_blackmail: { quarter: 9, prepared: false, choice: 'hold_firm' } },
      }),
    ).toBe('agent_economy');
  });

  it('builds a full debrief once the game has ended', () => {
    const s = playThrough(77, (x) => (['ai_office', 'coalition', 'weight_security', 'host_verification', 'fund_alignment'] as CardId[])[Math.min(4, x.quarter - 1)]);
    expect(() => E.debrief(E.createInitialState(1))).toThrow();
    const d = E.debrief(s);
    expect(d.ending.id).toBe(s.ending);
    expect(d.ending.text.length).toBeGreaterThan(100);
    expect(d.ending.epilogue.length).toBeGreaterThan(20);
    expect(d.ending.lea.slot).toBe('end');
    expect(d.notes.every((n) => n.readable)).toBe(true);
    expect(d.decisions.length).toBeGreaterThan(0);
    expect(d.decisions.every((x) => x.explanation.length > 0)).toBe(true);
    expect(d.decisions.find((x) => x.title === 'Fund alignment research')?.hiddenDeltas).toEqual([
      { key: 'trueAlignment', amount: 6, hidden: true },
    ]);
    for (const e of d.events) {
      expect(e.source.url).toMatch(/^https:\/\//);
      expect(e.explanation).toMatch(/prepared/i);
    }
    expect(d.reveal.trueAlignment).toBe(s.gauges.trueAlignment);
  });
});

// ---------- Léa and the situation report ----------

describe('Léa and the situation report', () => {
  it('picks Léa’s variants from the hidden state', () => {
    expect(E.leaScene(craft({ speed: 'fast' }), 'q1').variant).toBe('fast');
    expect(E.leaScene(craft({ speed: 'slow' }), 'q1').text).toMatch(/clumsy/);
    expect(E.leaScene(craft({ eu: { economy: 70 } }), 'q6').variant).toBe('human_touch');
    expect(E.leaScene(craft({ eu: { economy: 50 } }), 'q6').variant).toBe('post_editor');
    expect(E.leaScene(craft({ flags: { flexicurity: true } }), 'q11').variant).toBe('retrained');
    expect(E.leaScene(craft({}), 'q11').variant).toBe('between_jobs');
    const end = { ...craft({ eu: { economy: 20, culture: 20, state: 20 } }), phase: 'ended' as const, ending: 'hot_war' as const };
    const scene = E.leaScene(end, 'end');
    expect(scene.variant).toBe('low:hot_war');
    expect(scene.text).toMatch(/cyberattack/);
  });

  it('shows Léa in the report at quarters 1, 6 and 11 only', () => {
    for (const q of [1, 2, 6, 7, 11, 12]) {
      const r = E.situationReport(E.startQuarter(craft({ quarter: q })));
      expect(r.lea !== null).toBe([1, 6, 11].includes(q));
      expect(r.dateLabel).toBe(E.dateLabel(q));
    }
  });

  it('reports changes since the start of the quarter with their causes, and a forecast', () => {
    const s = E.startQuarter(craft({ gauges: { tension: 55, capability: 45, trueAlignment: 60 } }));
    const r = E.situationReport(s);
    const tension = r.changes.find((c) => c.key === 'tension')!;
    expect(tension.delta).toBe(21);
    expect(r.changes.find((c) => c.key === 'publicPressure')!.cause).toMatch(/China stole a model/);
    expect(tension.cause).toMatch(/^China stole a model/);
    expect(r.changes.find((c) => c.key === 'trueAlignment' as never)).toBeUndefined();
    const sum = Object.values(E.planOdds(s)).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
    expect(r.forecast.probability).toBe(Math.max(...Object.values(E.planOdds(s))));
    expect(r.newNews).toBe(s.news.filter((n) => n.quarter === s.quarter).length);
  });

  it('every news and note template condition can be evaluated', () => {
    const s = E.startQuarter(craft({}));
    for (const t of [...NEWS, ...NOTES]) expect(() => E.evalCondition(s, t.when)).not.toThrow();
  });
});
