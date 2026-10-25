// The policy deck: costs, requirements and lock reasons, limits, options, dependencies, flags,
// hidden effects, previews and the free decision at the tipping point.

import { describe, expect, it } from 'vitest';
import { E, craft, deltaMap, nextQuarter, started } from './helpers';
import { CARDS, CARD_BY_ID } from '../src/data/cards';
import type { CardId, GameState } from '../src/engine/types';

/** A started quarter where every card is available and affordable. */
const rich = (over: Parameters<typeof craft>[0] = {}) => started({ gauges: { capability: 40, ...over.gauges }, pc: 20, budget: 20, ...over });
const view = (s: GameState, id: CardId) => E.cardViews(s).find((c) => c.id === id)!;
const optionsOf = (id: CardId) => CARD_BY_ID[id].options?.map((o) => o.id) ?? [undefined];

describe('costs', () => {
  const expected: Record<string, { pc: number; budget: number; label: string }> = {
    coalition: { pc: 3, budget: 0, label: '3 PC, then 1 PC per quarter' },
    host_verification: { pc: 1, budget: 2, label: '2 Budget, 1 PC' },
    asml: { pc: 2, budget: 0, label: '2 PC (1 of 2 tokens)' },
    ai_office: { pc: 0, budget: 2, label: '2 Budget' },
    measure: { pc: 1, budget: 1, label: '1 Budget, 1 PC' },
    open_models: { pc: 0, budget: 2, label: '2 Budget' },
    oversight_mandate: { pc: 3, budget: 0, label: '3 PC' },
    flexicurity: { pc: 3, budget: 0, label: '3 PC' },
    weight_security: { pc: 2, budget: 0, label: '2 PC' },
    fund_alignment: { pc: 0, budget: 2, label: '2 Budget' },
    cyber_defence: { pc: 0, budget: 2, label: '2 Budget' },
  };

  it('every card costs what the developer notes say, and the label says it', () => {
    expect(Object.keys(expected).sort()).toEqual(CARDS.map((c) => c.id).sort());
    const s = rich();
    for (const c of CARDS) {
      const e = expected[c.id];
      for (const o of optionsOf(c.id)) {
        const { state, briefing } = E.playCard(s, c.id, o);
        expect([s.pc - state.pc, s.budget - state.budget], c.id).toEqual([e.pc, e.budget]);
        const costs = briefing.visibleDeltas.filter((d) => d.key === 'pc' || d.key === 'budget');
        expect(deltaMap(costs), c.id).toEqual({ ...(e.pc ? { pc: -e.pc } : {}), ...(e.budget ? { budget: -e.budget } : {}) });
      }
      expect(view(s, c.id).costLabel).toBe(e.label);
    }
  });

  it('a card is unaffordable with one PC or one Budget short, affordable with exactly enough', () => {
    for (const c of CARDS) {
      const e = expected[c.id];
      const exact = rich({ pc: e.pc, budget: e.budget });
      // income adds +1 Budget during startQuarter, so set resources after starting
      const s = { ...exact, pc: e.pc, budget: e.budget };
      expect(view(s, c.id).affordable, c.id).toBe(true);
      expect(() => E.playCard(s, c.id, optionsOf(c.id)[0])).not.toThrow();
      if (e.pc) {
        const poor = { ...s, pc: e.pc - 1 };
        expect(view(poor, c.id).affordable, c.id).toBe(false);
        expect(() => E.playCard(poor, c.id, optionsOf(c.id)[0])).toThrow(/Not enough resources/);
      }
      if (e.budget) {
        const poor = { ...s, budget: e.budget - 1 };
        expect(view(poor, c.id).affordable, c.id).toBe(false);
      }
    }
  });

  it('the preview reports full costs even when unaffordable', () => {
    const s = { ...rich(), pc: 0, budget: 0 };
    for (const c of CARDS) {
      const e = expected[c.id];
      expect(deltaMap(E.previewCard(s, c.id, optionsOf(c.id)[0]).costs), c.id).toEqual({
        ...(e.pc ? { pc: -e.pc } : {}),
        ...(e.budget ? { budget: -e.budget } : {}),
      });
    }
  });
});

describe('requirements, lock reasons and limits', () => {
  it('a fresh game: only ASML and flexicurity are locked (capability below 30)', () => {
    const s = E.startQuarter(E.createInitialState(3));
    const locked = E.cardViews(s).filter((c) => !c.available);
    expect(Object.fromEntries(locked.map((c) => [c.id, c.lockedReason]))).toEqual({
      asml: 'Needs capability 30+: chips only become leverage once the race is on',
      flexicurity: 'Needs capability 30+: jobs have not started to shift yet',
    });
  });

  it('capability 29 locks ASML and flexicurity, 30 unlocks them', () => {
    const at = (capability: number) => ({ ...rich(), gauges: { ...rich().gauges, capability } });
    for (const id of ['asml', 'flexicurity'] as CardId[]) {
      expect(view(at(29), id).available).toBe(false);
      expect(view(at(30), id).available).toBe(true);
    }
  });

  it('coalition: locked at level 3 and at tension 70 (69 is fine)', () => {
    const s = rich();
    expect(view({ ...s, coalition: 3 }, 'coalition').lockedReason).toBe('The coalition is already at full strength (3 of 3)');
    expect(view({ ...s, coalition: 2 }, 'coalition').available).toBe(true);
    const t = (tension: number) => ({ ...s, gauges: { ...s.gauges, tension } });
    expect(view(t(69), 'coalition').available).toBe(true);
    expect(view(t(70), 'coalition').lockedReason).toBe('Tension is too high: partners will not join a bloc now (needs tension below 70)');
    // repeatable up to 3, then locked by the requirement, not by a limit
    let x = s;
    for (let i = 0; i < 3; i++) x = { ...E.playCard(x, 'coalition').state, decidedThisQuarter: false };
    expect(x.coalition).toBe(3);
    expect(x.cardsPlayed.coalition).toBe(3);
    expect(view(x, 'coalition').available).toBe(false);
  });

  it('host verification: repeatable until verification reaches 100', () => {
    const s = rich();
    expect(view({ ...s, gauges: { ...s.gauges, verification: 99 } }, 'host_verification').available).toBe(true);
    expect(view({ ...s, gauges: { ...s.gauges, verification: 100 } }, 'host_verification').lockedReason).toBe('Verification is already at its maximum');
  });

  it('ASML: two uses, then "No uses left"; tokens and uses go together', () => {
    let s = rich();
    s = { ...E.playCard(s, 'asml', 'model_access').state, decidedThisQuarter: false };
    expect(s.asmlTokens).toBe(1);
    expect(view(s, 'asml').available).toBe(true);
    s = { ...E.playCard(s, 'asml', 'safety_commitment').state, decidedThisQuarter: false };
    expect(s.asmlTokens).toBe(0);
    expect(view(s, 'asml').lockedReason).toBe('No uses left');
    // with no tokens but no recorded play, the token requirement speaks
    expect(view({ ...rich(), asmlTokens: 0 }, 'asml').lockedReason).toBe('Both tokens used');
  });

  it('once-only cards say "Already played"', () => {
    const once: CardId[] = ['ai_office', 'open_models', 'oversight_mandate', 'flexicurity', 'weight_security', 'cyber_defence'];
    expect(CARDS.filter((c) => c.limit === 1).map((c) => c.id).sort()).toEqual([...once].sort());
    for (const id of once) {
      const t = E.playCard(rich(), id).state;
      const v = view(t, id);
      expect(v.available, id).toBe(false);
      expect(v.lockedReason, id).toBe('Already played');
      expect(() => E.playCard({ ...t, decidedThisQuarter: false }, id)).toThrow(/not available: Already played/);
    }
  });

  it('repeatable cards have no limit', () => {
    expect(CARDS.filter((c) => c.limit === null).map((c) => c.id).sort()).toEqual(['coalition', 'fund_alignment', 'host_verification', 'measure']);
    let s = rich({ budget: 50 });
    s = { ...s, budget: 50 };
    for (let i = 0; i < 5; i++) s = { ...E.playCard(s, 'fund_alignment').state, decidedThisQuarter: false };
    expect(s.cardsPlayed.fund_alignment).toBe(5);
    expect(view(s, 'fund_alignment').available).toBe(true);
  });

  it('weight security: locked once a theft has fired (prepared or not)', () => {
    const s = rich();
    for (const prepared of [true, false]) {
      const v = view({ ...s, firedEvents: { weight_theft: { quarter: 2, prepared } } }, 'weight_security');
      expect(v.lockedReason).toBe('Too late: a model has already been stolen');
    }
  });

  it('every card is locked once the game is over', () => {
    const s = { ...rich(), phase: 'ended' as const };
    for (const v of E.cardViews(s)) expect(v.lockedReason).toBe('The game is over');
    expect(() => E.playCard(s, 'fund_alignment')).toThrow(/game is over/);
  });

  it('refuses unknown cards, a second decision, a decision during an event and a missing option', () => {
    const s = rich();
    expect(() => E.playCard(s, 'nope' as CardId)).toThrow(/Unknown card/);
    expect(() => E.playCard(E.pass(s), 'fund_alignment')).toThrow(/already took a decision/);
    expect(() => E.playCard(E.playCard(s, 'measure').state, 'fund_alignment')).toThrow(/already took a decision/);
    const ev = started({ gauges: { misuse: 45 }, pc: 20, budget: 20 });
    expect(() => E.playCard(ev, 'fund_alignment')).toThrow(/Resolve the current event/);
    expect(() => E.playCard(s, 'asml')).toThrow(/needs an option: model_access or safety_commitment/);
    expect(() => E.playCard(s, 'asml', 'bogus')).toThrow(/needs an option/);
  });

  it('the requirement reasons and card views stay consistent', () => {
    for (const v of E.cardViews(rich())) {
      expect(v.available).toBe(v.lockedReason === null);
      const def = CARD_BY_ID[v.id];
      expect(v.options).toEqual((def.options ?? []).map((o) => ({ id: o.id, label: o.label })));
      expect(v.name).toBe(def.name);
      expect(v.family).toBe(def.family);
      expect(v.downside).toBe(def.downside);
      expect(v.isLouis).toBe(def.isLouis);
      expect(v.source).toEqual(def.source);
    }
  });
});

describe('effects', () => {
  it('visible effects show in the briefing, hidden effects only in the log’s hidden deltas, for every card and option', () => {
    const s = rich();
    for (const c of CARDS) {
      for (const o of optionsOf(c.id)) {
        const { state, briefing } = E.playCard(s, c.id, o);
        const entry = state.log.at(-1)!;
        expect(entry.kind).toBe('card');
        expect(entry.id).toBe(c.id);
        expect(briefing.visibleDeltas).toEqual(entry.visibleDeltas);
        for (const d of briefing.visibleDeltas) expect(d.hidden, `${c.id} ${d.key}`).toBe(false);
        for (const d of entry.hiddenDeltas) expect(d.hidden, `${c.id} ${d.key}`).toBe(true);
        for (const d of briefing.visibleDeltas) expect(['trueAlignment', 'eu.economy', 'eu.culture', 'eu.state']).not.toContain(d.key);
        const preview = E.previewCard(s, c.id, o);
        expect(preview.visibleDeltas.some((d) => d.hidden)).toBe(false);
        expect(preview.visibleDeltas).toEqual(briefing.visibleDeltas.filter((d) => d.key !== 'pc' && d.key !== 'budget'));
        // the hidden part is what the card def says
        const opt = c.options?.find((x) => x.id === o);
        const hiddenSpecs = [...c.hiddenEffects, ...(opt?.hiddenEffects ?? [])];
        expect(deltaMap(entry.hiddenDeltas)).toEqual(deltaMap(hiddenSpecs));
      }
    }
  });

  it('each card does what the developer notes say', () => {
    const s = rich({ gauges: { capability: 40, tension: 40 } });
    const diff = (id: CardId, option?: string, base = s) => {
      const t = E.playCard(base, id, option).state;
      const out: Record<string, number> = {};
      for (const k of Object.keys(t.gauges) as (keyof GameState['gauges'])[]) if (t.gauges[k] !== base.gauges[k]) out[k] = t.gauges[k] - base.gauges[k];
      for (const k of ['economy', 'culture', 'state'] as const) if (t.eu[k] !== base.eu[k]) out[`eu.${k}`] = t.eu[k] - base.eu[k];
      if (t.coalition !== base.coalition) out.coalition = t.coalition - base.coalition;
      return out;
    };
    expect(diff('coalition')).toEqual({ coalition: 1 });
    expect(diff('host_verification')).toEqual({ verification: 7, tension: 5 });
    expect(diff('host_verification', undefined, { ...s, flags: { ...s.flags, aiOffice: true } })).toEqual({ verification: 15, tension: 5 });
    expect(diff('asml', 'model_access')).toEqual({ tension: 15, gdp: 5 });
    expect(diff('asml', 'safety_commitment')).toEqual({ tension: 15, trueAlignment: 5 });
    expect(diff('ai_office')).toEqual({});
    expect(diff('measure')).toEqual({});
    expect(diff('open_models')).toEqual({ concentration: -15, misuse: 10, 'eu.economy': 5 });
    expect(diff('oversight_mandate')).toEqual({ gdp: -5 });
    expect(diff('flexicurity')).toEqual({});
    expect(diff('weight_security')).toEqual({ concentration: 5 });
    expect(diff('fund_alignment')).toEqual({ trueAlignment: 6 });
    expect(diff('cyber_defence')).toEqual({ misuse: -10, gdp: -2 });
  });

  it('cards set their flags', () => {
    const flags: Partial<Record<CardId, keyof GameState['flags']>> = {
      ai_office: 'aiOffice',
      open_models: 'openModels',
      oversight_mandate: 'oversightMandate',
      flexicurity: 'flexicurity',
      weight_security: 'weightSecurity',
      cyber_defence: 'cyberDefence',
    };
    for (const c of CARDS) {
      const t = E.playCard(rich(), c.id, optionsOf(c.id)[0]).state;
      const changed = Object.keys(t.flags).filter((k) => t.flags[k as keyof GameState['flags']] !== rich().flags[k as keyof GameState['flags']]);
      expect(changed, c.id).toEqual(flags[c.id] ? [flags[c.id]] : []);
    }
  });

  it('effects are clamped and the recorded deltas say what was applied', () => {
    const s = { ...rich(), gauges: { ...rich().gauges, verification: 97, concentration: 5 } };
    expect(deltaMap(E.playCard(s, 'host_verification').briefing.visibleDeltas)).toMatchObject({ verification: 3 });
    expect(deltaMap(E.playCard(s, 'open_models').briefing.visibleDeltas)).toMatchObject({ concentration: -5 });
  });

  it('host verification’s two conditional effects are evaluated before either applies', () => {
    // with the AI Office: exactly +15, never +15 and +7
    const s = { ...rich(), flags: { ...rich().flags, aiOffice: true } };
    expect(E.playCard(s, 'host_verification').state.gauges.verification - s.gauges.verification).toBe(15);
  });

  it('AI Office makes every past note readable; measure makes only this quarter’s notes readable and reveals 3 quarters', () => {
    let s = E.createInitialState(11);
    for (let i = 0; i < 6; i++) s = nextQuarter(i === 0 ? E.startQuarter(s) : s);
    expect(s.notes.length).toBeGreaterThan(2);
    expect(s.notes.every((n) => !n.readable)).toBe(true);
    const office = E.playCard(s, 'ai_office').state;
    expect(office.notes.every((n) => n.readable)).toBe(true);
    const measured = E.playCard(s, 'measure').state;
    expect(measured.revealUntil).toBe(s.quarter + 3);
    for (const n of measured.notes) expect(n.readable).toBe(n.quarter === s.quarter);
    // measuring again never shortens the window
    const again = E.playCard({ ...measured, decidedThisQuarter: false, revealUntil: 20 }, 'measure').state;
    expect(again.revealUntil).toBe(20);
  });

  it('the audit keeps notes readable until revealUntil, then they are redacted again', () => {
    let s = E.playCard(started({ quarter: 3, seed: 5 }), 'measure').state;
    expect(s.revealUntil).toBe(6);
    const readable: Record<number, boolean[]> = {};
    for (let i = 0; i < 6; i++) {
      s = nextQuarter(s);
      readable[s.quarter] = s.notes.filter((n) => n.quarter === s.quarter).map((n) => n.readable);
    }
    for (const q of [4, 5, 6]) expect(readable[q].every(Boolean)).toBe(true);
    for (const q of [7, 8, 9]) expect(readable[q].every((r) => !r)).toBe(true);
    expect([4, 5, 6].flatMap((q) => readable[q]).length).toBeGreaterThan(0);
    expect([7, 8, 9].flatMap((q) => readable[q]).length).toBeGreaterThan(0);
  });

  it('flexicurity queues PC −1 for next quarter', () => {
    const t = E.playCard(rich(), 'flexicurity').state;
    expect(t.pending).toEqual([{ key: 'pc', amount: -1, hidden: false }]);
  });
});

describe('advisor notes', () => {
  it('pick the first matching variant: coalition at 2+, AI Office by alignment gap, measure by human influence', () => {
    const s = rich();
    const note = (id: CardId, base: GameState) => E.playCard(base, id).briefing.advisorNote;
    expect(note('coalition', s)).toMatch(/^Partners will want attention/);
    expect(note('coalition', { ...s, coalition: 1 })).toMatch(/^Partners now meet without us asking/); // read after the card: 2
    expect(note('host_verification', s)).toMatch(/Without our own experts/);
    expect(note('host_verification', { ...s, flags: { ...s.flags, aiOffice: true } })).toMatch(/Our own experts ran the first inspection/);
    const gap = (apparent: number, trueA: number) => ({ ...s, gauges: { ...s.gauges, apparentAlignment: apparent, trueAlignment: trueA } });
    expect(note('ai_office', gap(70, 55))).toMatch(/rosier/);
    expect(note('ai_office', gap(69, 55))).toMatch(/measure what is easy/);
    const eu = (v: number) => ({ ...s, eu: { economy: v, culture: v, state: v } });
    expect(note('measure', eu(65))).toMatch(/reassuring/);
    expect(note('measure', eu(64))).toMatch(/sobering/);
    expect(note('measure', eu(45))).toMatch(/sobering/);
    expect(note('measure', eu(44))).toMatch(/alarming/);
  });

  it('option cards use the option’s note and title', () => {
    const { briefing } = E.playCard(rich(), 'asml', 'safety_commitment');
    expect(briefing.title).toBe('Use the ASML lever: lab safety commitment');
    expect(briefing.advisorNote).toBe(CARD_BY_ID.asml.options![1].advisorNote);
  });
});

describe('previews', () => {
  it('list dependencies (met or not), preview notes, delayed effects and the hidden-effects warning', () => {
    const s = rich();
    const p = (id: CardId, base = s, o?: string) => E.previewCard(base, id, o).notes;
    expect(p('coalition')[0]).toBe('With verification 30+, Europe can lead the response to an AI incident (not yet).');
    expect(p('coalition', { ...s, gauges: { ...s.gauges, verification: 30 } })[0]).toMatch(/\(met\)\.$/);
    expect(p('flexicurity')).toContain('Next quarter: PC −1.');
    expect(p('open_models')).toContain('Pairs with a human oversight mandate: Europe can stand firm if big labs threaten to leave (not yet).');
    expect(p('oversight_mandate', { ...s, flags: { ...s.flags, openModels: true } })[0]).toMatch(/\(met\)\.$/);
    const warning = 'This decision has hidden effects. They will be revealed at the end.';
    for (const c of CARDS) {
      for (const o of optionsOf(c.id)) {
        const opt = c.options?.find((x) => x.id === o);
        const expectWarning = c.hasHiddenEffects || (opt?.hiddenEffects.length ?? 0) > 0;
        expect(p(c.id, s, o).includes(warning), `${c.id} ${o}`).toBe(expectWarning);
        for (const n of c.previewNotes) expect(p(c.id, s, o)).toContain(n);
      }
    }
    // a card with hidden numbers never shows them
    expect(p('fund_alignment').join(' ')).not.toMatch(/\d/);
  });

  it('defaults to the first option and reports which one it previewed', () => {
    const s = rich();
    expect(E.previewCard(s, 'asml').option).toBe('model_access');
    expect(E.previewCard(s, 'asml', 'safety_commitment').option).toBe('safety_commitment');
    expect(E.previewCard(s, 'fund_alignment').option).toBeUndefined();
  });

  it('computes the odds before and after from visible effects only', () => {
    const s = rich();
    for (const c of CARDS) {
      for (const o of optionsOf(c.id)) {
        const p = E.previewCard(s, c.id, o);
        expect(p.oddsBefore).toEqual(E.planOdds(s));
        for (const odds of [p.oddsBefore, p.oddsAfter]) expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      }
    }
    // hidden true alignment never moves the shown odds, even when it would change the shut-down weight
    const unsafe = { ...s, firedEvents: { warning_shot: { quarter: 3, prepared: false } }, gauges: { ...s.gauges, trueAlignment: 35 } };
    const p = E.previewCard(unsafe, 'fund_alignment');
    expect(p.oddsAfter).toEqual(p.oddsBefore);
    // ... while the real play does move them (trueAlignment 35 → 41 crosses 40)
    const played = E.playCard(unsafe, 'fund_alignment').state;
    expect(E.planOdds(played)).not.toEqual(p.oddsBefore);
  });

  it('never changes the state it previews', () => {
    const s = rich();
    const snap = JSON.stringify(s);
    for (const c of CARDS) for (const o of optionsOf(c.id)) E.previewCard(s, c.id, o);
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('the debrief line of a card', () => {
  it('ends with how the odds moved, or says they did not move', () => {
    const s = rich();
    expect(E.playCard(s, 'host_verification').state.log.at(-1)!.debrief).toMatch(/Odds at the tipping point: Verified slowdown \d+% → \d+%/);
    expect(E.playCard(s, 'fund_alignment').state.log.at(-1)!.debrief).toMatch(/It did not move the superpowers’ odds directly\.$/);
    expect(E.playCard(s, 'asml', 'model_access').state.log.at(-1)!.debrief).toContain(CARD_BY_ID.asml.options![0].debrief);
  });
});

describe('the tipping point decision', () => {
  const tipping = () => {
    const s = started({ gauges: { capability: 78, trueAlignment: 60 }, pc: 0, budget: 0, extra: { firedEvents: { opaque_reasoning: { quarter: 2, prepared: true } } } });
    return E.endQuarter(E.pass(s)).state;
  };

  it('is free: every available card is affordable, costs nothing and says so', () => {
    const t = tipping();
    expect(t.phase).toBe('tipping');
    for (const v of E.cardViews(t)) {
      expect(v.affordable).toBe(true);
      expect(v.costLabel).toBe(v.id === 'asml' ? 'Free (tipping point), uses a token' : 'Free (tipping point)');
    }
    for (const c of CARDS.filter((x) => view(t, x.id).available)) {
      const o = optionsOf(c.id)[0];
      const { state } = E.playCard(t, c.id, o);
      expect([state.pc, state.budget]).toEqual([t.pc, t.budget]);
      const p = E.previewCard(t, c.id, o);
      expect(p.costs).toEqual([]);
      expect(p.notes[0]).toBe('Tipping point: this last decision is free.');
    }
  });

  it('still uses an ASML token', () => {
    const t = tipping();
    expect(E.playCard(t, 'asml', 'model_access').state.asmlTokens).toBe(t.asmlTokens - 1);
  });

  it('allows exactly one decision', () => {
    const t = E.playCard(tipping(), 'fund_alignment').state;
    expect(() => E.playCard(t, 'measure')).toThrow(/already took a decision/);
  });
});
