// The policy deck: costs, requirements and lock reasons, limits, levels, cooldowns, options, dependencies,
// flags, hidden effects, card faces, previews and the free decision at the tipping point.

import { describe, expect, it } from 'vitest';
import { E, craft, deltaMap, nextQuarter, started } from './helpers';
import { CARDS as ALL_CARDS, CARD_BY_ID } from '../src/data/cards';
import type { CardId, GameState } from '../src/engine/types';

/** The deck the story unlocks (context cards are offered by events and tested on their own). */
const CARDS = ALL_CARDS.filter((c) => !c.context);
/** Play again in the same quarter (tests of repeated plays). */
const again = (s: GameState): GameState => ({ ...s, decidedThisQuarter: false });

/** A started quarter where every card is available and affordable. */
const rich = (over: Parameters<typeof craft>[0] = {}) => started({ gauges: { capability: 40, ...over.gauges }, pc: 20, budget: 20, ...over });
const view = (s: GameState, id: CardId) => E.cardViews(s).find((c) => c.id === id)!;
const optionsOf = (id: CardId) => CARD_BY_ID[id].options?.map((o) => o.id) ?? [undefined];

describe('costs', () => {
  const expected: Record<string, { pc: number; budget: number; label: string }> = {
    coalition: { pc: 3, budget: 0, label: '3 PC' },
    diplomatic_talks: { pc: 2, budget: 1, label: '2 PC, 1 Budget' },
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
      // income adds PC and Budget during startQuarter, so set resources after starting
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
  it('a fresh game holds the four act-1 cards, all available', () => {
    const s = E.startQuarter(E.createInitialState(3));
    const views = E.cardViews(s);
    expect(views.map((c) => c.id)).toEqual(['host_verification', 'ai_office', 'fund_alignment', 'diplomatic_talks']);
    expect(views.every((c) => c.available && c.affordable)).toBe(true);
  });

  it('cards not yet unlocked cannot be played or previewed as if they were', () => {
    const s = E.startQuarter(E.createInitialState(3));
    expect(() => E.playCard(s, 'oversight_mandate')).toThrow(/not available: Not unlocked yet/);
    const p = E.previewCard(s, 'oversight_mandate');
    expect(p.visibleDeltas).toEqual([]);
    expect(p.notes).toEqual(['Not unlocked yet.']);
    expect(p.oddsAfter).toEqual(p.oddsBefore);
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
    // three levels, then locked
    let x = s;
    for (let i = 0; i < 3; i++) x = again(E.playCard(x, 'coalition').state);
    expect(x.coalition).toBe(3);
    expect(x.cardsPlayed.coalition).toBe(3);
    expect(view(x, 'coalition').available).toBe(false);
    expect(view(x, 'coalition').lockedReason).toBe('All levels reached');
  });

  it('host verification: locked at verification 100', () => {
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
    expect(ALL_CARDS.filter((c) => c.context).every((c) => c.limit === 1)).toBe(true);
    for (const id of once) {
      const t = E.playCard(rich(), id).state;
      const v = view(t, id);
      expect(v.available, id).toBe(false);
      expect(v.lockedReason, id).toBe('Already played');
      expect(() => E.playCard({ ...t, decidedThisQuarter: false }, id)).toThrow(/not available: Already played/);
    }
  });

  it('every card has a use limit (v2: no endless repeats)', () => {
    const limits = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c.steps?.length ?? c.limit]));
    expect(limits).toEqual({
      coalition: 3,
      host_verification: 3,
      asml: 2,
      ai_office: 1,
      measure: 2,
      open_models: 1,
      oversight_mandate: 1,
      flexicurity: 1,
      weight_security: 1,
      fund_alignment: 3,
      cyber_defence: 1,
      diplomatic_talks: 3,
      emergency_summit: 1,
      joint_attribution: 1,
    });
    let s = rich();
    for (let i = 0; i < 3; i++) s = again(E.playCard(s, 'fund_alignment').state);
    expect(s.cardsPlayed.fund_alignment).toBe(3);
    expect(view(s, 'fund_alignment').lockedReason).toBe('No uses left');
    expect(view(s, 'fund_alignment').usesLeft).toBe(0);
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
    expect(() => E.playCard(s, 'emergency_summit')).toThrow(/not available: Not on offer now/);
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
      expect(v.name).toBe(def.steps?.[0].name ?? def.name);
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
        const hiddenSpecs = [...c.hiddenEffects, ...(c.steps?.[0].hiddenEffects ?? []), ...(opt?.hiddenEffects ?? [])];
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
    expect(diff('coalition')).toEqual({ coalition: 1, tension: -4 });
    expect(diff('diplomatic_talks')).toEqual({ tension: -6 });
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
  });

  it('the audit keeps notes readable until revealUntil, then they are redacted again', () => {
    let s = E.playCard(started({ quarter: 3, seed: 5, pc: 5, budget: 5 }), 'measure').state;
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
        const expectWarning = c.hasHiddenEffects || (opt?.hiddenEffects.length ?? 0) > 0 || (c.steps?.[0].hiddenEffects?.length ?? 0) > 0;
        expect(p(c.id, s, o).includes(warning), `${c.id} ${o}`).toBe(expectWarning);
        for (const n of [...c.previewNotes, ...(c.futureNotes ?? [])]) expect(p(c.id, s, o)).toContain(n);
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
    // hidden true alignment never moves the shown odds, even when it changes the real shut-down weight
    const unsafe = { ...s, firedEvents: { warning_shot: { quarter: 3, prepared: false } }, gauges: { ...s.gauges, trueAlignment: 35 } };
    const p = E.previewCard(unsafe, 'fund_alignment');
    expect(p.oddsAfter).toEqual(p.oddsBefore);
    const played = E.playCard(unsafe, 'fund_alignment').state;
    expect(E.planOdds(played)).toEqual(p.oddsBefore);
    expect(E.planOdds({ ...unsafe, gauges: { ...unsafe.gauges, trueAlignment: 90 } })).toEqual(E.planOdds(unsafe));
  });

  it('never changes the state it previews, locked cards included', () => {
    const s = rich();
    const snap = JSON.stringify(s);
    for (const c of ALL_CARDS) for (const o of optionsOf(c.id)) E.previewCard(s, c.id, o);
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('a locked card claims nothing: its lock reason, no deltas, no odds shift, no info gains (B5)', () => {
    const s = { ...rich(), gauges: { ...rich().gauges, tension: 75 } };
    const p = E.previewCard(s, 'coalition');
    expect(p.notes).toEqual(['Tension is too high: partners will not join a bloc now (needs tension below 70).']);
    expect(p.visibleDeltas).toEqual([]);
    expect(p.oddsAfter).toEqual(p.oddsBefore);
    expect(p.infoGains).toEqual([]);
  });

  it('says what is missing when a card is not affordable', () => {
    const s = { ...rich(), pc: 1, budget: 0 };
    expect(E.previewCard(s, 'coalition').notes[0]).toBe('Not affordable yet: 2 PC short.');
    expect(E.previewCard(s, 'diplomatic_talks').notes[0]).toBe('Not affordable yet: 1 PC and 1 Budget short.');
  });

  it('hides notes about later quarters when no quarter follows (B6)', () => {
    const last = started({ quarter: 16, gauges: { capability: 40 } });
    const notes = E.previewCard(last, 'flexicurity').notes;
    expect(notes).not.toContain('Next quarter: PC −1.');
    expect(E.previewCard(last, 'coalition').notes).not.toContain(CARD_BY_ID.coalition.futureNotes![0]);
    // and at the tipping point
    const tip = { ...rich(), phase: 'tipping' as const };
    expect(E.previewCard(tip, 'flexicurity').notes).not.toContain('Next quarter: PC −1.');
    expect(E.previewCard(rich(), 'flexicurity').notes).toContain('Next quarter: PC −1.');
  });

  it('lists information gains from the real before/after (B7, handoff 01)', () => {
    const s = E.startQuarter(craft({ seed: 11, quarter: 4 }));
    const withNotes = { ...s, notes: [{ id: 'n1', quarter: 4, actor: 'us_labs' as const, region: 'us' as const, text: 'x', readable: false, at: 0.5 }] };
    const office = E.previewCard(withNotes, 'ai_office').infoGains;
    expect(office).toEqual([
      { label: 'Capability uncertainty', from: '±10', to: '±5', text: 'Capability uncertainty narrows from ±10 to ±5.' },
      { label: 'Alignment uncertainty', from: '±15', to: '±5', text: 'Alignment uncertainty narrows from ±15 to ±5.' },
      { label: 'Confidential reports', text: '1 confidential report becomes readable now, and every future one too.' },
    ]);
    const audit = E.previewCard(withNotes, 'measure').infoGains;
    expect(audit.map((g) => g.label)).toEqual(['Confidential reports', 'Human influence in Europe']);
    expect(audit[1].text).toContain(E.dateLabel(7));
    expect(E.previewCard(s, 'host_verification').infoGains).toEqual([]);
    // the briefing carries the same gains
    expect(E.playCard(withNotes, 'ai_office').briefing.infoGains).toEqual(office);
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
      expect(v.context).toBeNull();
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

describe('levels, rising costs and cooldowns (v2)', () => {
  it('coalition: three named levels at 3 / 4 / 5 PC, each lowering tension by 4', () => {
    let s = rich({ gauges: { capability: 40, tension: 46 } });
    const seen: [string, string, number][] = [];
    for (let i = 0; i < 3; i++) {
      const v = view(s, 'coalition');
      seen.push([v.name, v.costLabel, v.level!.next]);
      const { state, briefing } = E.playCard(s, 'coalition');
      expect(deltaMap(briefing.visibleDeltas)).toEqual({ pc: -(3 + i), coalition: 1, tension: -4 });
      expect(briefing.title).toBe(v.name);
      s = again(state);
    }
    expect(seen).toEqual([
      ['Middle-power coalition', '3 PC', 1],
      ['Wider coalition', '4 PC', 2],
      ['Middle-power pact', '5 PC', 3],
    ]);
    expect(view(rich(), 'coalition').level).toEqual({ next: 1, max: 3, name: 'Middle-power coalition' });
  });

  it('host verification: Offer → Inspection accord → Joint inspectorate, with their costs', () => {
    let s = rich();
    const costs: [string, number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const v = view(s, 'host_verification');
      const t = E.playCard(s, 'host_verification').state;
      costs.push([v.name, s.budget - t.budget, s.pc - t.pc]);
      expect(t.gauges.verification - s.gauges.verification).toBe(7);
      s = again(t);
    }
    expect(costs).toEqual([
      ['Offer to host verification', 2, 1],
      ['Inspection accord', 3, 0],
      ['Joint inspectorate', 3, 1],
    ]);
    expect(view(s, 'host_verification').available).toBe(false);
  });

  it('fund alignment: 2 / 3 / 4 Budget with diminishing hidden returns +6 / +5 / +4', () => {
    let s = rich();
    const out: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const t = E.playCard(s, 'fund_alignment').state;
      out.push([s.budget - t.budget, t.gauges.trueAlignment - s.gauges.trueAlignment]);
      expect(t.log.at(-1)!.visibleDeltas).toEqual([{ key: 'budget', amount: -(2 + i), hidden: false }]);
      s = again(t);
    }
    expect(out).toEqual([
      [2, 6],
      [3, 5],
      [4, 4],
    ]);
    expect(view(rich(), 'fund_alignment').level).toBeNull();
    expect(view(rich(), 'fund_alignment').usesLeft).toBe(3);
  });

  it('diplomatic talks: needs tension 35+, three rounds, two quarters of rest between rounds', () => {
    const at = (tension: number) => ({ ...rich(), gauges: { ...rich().gauges, tension } });
    expect(view(at(34), 'diplomatic_talks').lockedReason).toBe('Tension is low: nobody needs talks yet (needs tension 35+)');
    expect(view(at(35), 'diplomatic_talks').available).toBe(true);
    let s = started({ quarter: 3, pc: 8, budget: 8, gauges: { tension: 60 } });
    s = E.playCard(s, 'diplomatic_talks').state;
    expect(s.cardLastPlayed.diplomatic_talks).toBe(3);
    s = nextQuarter(s); // Q4
    expect(view(s, 'diplomatic_talks').cooldownUntil).toBe(6);
    expect(view(s, 'diplomatic_talks').lockedReason).toBe('Needs rest after the last round: available again in Q2 2028');
    s = nextQuarter(s); // Q5
    expect(view(s, 'diplomatic_talks').available).toBe(false);
    s = nextQuarter(s); // Q6
    expect(view(s, 'diplomatic_talks').cooldownUntil).toBeNull();
    expect(view(s, 'diplomatic_talks').available).toBe(true);
    expect(view(s, 'diplomatic_talks').usesLeft).toBe(2);
  });

  it('measure: two audits, one at a time (cannot stack), each lasting three quarters', () => {
    let s = started({ quarter: 3, pc: 8, budget: 8 });
    s = E.playCard(s, 'measure').state;
    expect(s.revealUntil).toBe(6);
    for (const q of [4, 5, 6]) {
      s = nextQuarter(s);
      expect(s.quarter).toBe(q);
      expect(view(s, 'measure').lockedReason).toBe('An audit is already running (until Q2 2028)');
    }
    s = nextQuarter(s); // Q7
    expect(view(s, 'measure').available).toBe(true);
    s = again(E.playCard(s, 'measure').state);
    expect(view(s, 'measure').usesLeft).toBe(0);
  });
});

describe('card faces (v2)', () => {
  it('show up to three chips: visible effects, information gains, "+ hidden effect"', () => {
    const s = rich();
    const face = (id: CardId, base = s) => view(base, id).face.map((c) => c.text);
    expect(face('diplomatic_talks')).toEqual(['Tension −6']);
    expect(face('coalition')).toEqual(['Tension −4', 'Coalition +1']);
    expect(face('host_verification')).toEqual(['Verification +7', 'Tension +5']);
    expect(face('host_verification', { ...s, flags: { ...s.flags, aiOffice: true } })).toEqual(['Verification +15', 'Tension +5']);
    expect(face('ai_office')).toEqual(['Narrows uncertainty', '+ hidden effect']);
    expect(face('fund_alignment')).toEqual(['+ hidden effect']);
    expect(face('flexicurity')).toEqual(['PC −1 next quarter', '+ hidden effect']);
    expect(face('open_models')).toEqual(['Concentration −15', 'Misuse risk +10', '+ hidden effect']);
    for (const c of ALL_CARDS) expect(E.cardViews(s).find((v) => v.id === c.id)?.face.length ?? 0).toBeLessThanOrEqual(3);
    const tones = Object.fromEntries(view(s, 'host_verification').face.map((c) => [c.key, c.tone]));
    expect(tones).toEqual({ verification: 'good', tension: 'bad' });
  });

  it('name the crises a card prepares for, its unlock reason and whether it is new', () => {
    const s = rich();
    expect(view(s, 'weight_security').prepares).toEqual(['weight_theft']);
    expect(view(s, 'cyber_defence').prepares).toEqual(['ransomware']);
    expect(view(s, 'coalition').prepares).toEqual(['warning_shot']);
    expect(view(s, 'fund_alignment').prepares).toEqual([]);
    expect(view(s, 'fund_alignment').unlockReason).toBeNull();
    expect(view(s, 'coalition').unlockReason).toMatch(/^Unlocked because partners are calling Brussels/);
    expect(view(s, 'coalition').isNew).toBe(false);
  });

  it('carry a sourced real-world cost where the content has one, null otherwise', () => {
    const s = rich();
    for (const v of E.cardViews(s)) {
      if (v.realCost) {
        expect(v.realCost.source.url).toMatch(/^https:\/\//);
        expect(E.previewCard(s, v.id, v.options[0]?.id).realCost).toEqual(v.realCost);
      }
    }
    expect(view(s, 'diplomatic_talks').realCost).toBeNull();
  });
});

describe('briefings say what the decision will matter for (v2)', () => {
  it('weight security: ready if a theft is attempted; coalition depends on verification', () => {
    const s = rich();
    expect(E.playCard(s, 'weight_security').briefing.consequence).toBe('Ready if a theft is attempted');
    expect(E.playCard(s, 'coalition').briefing.consequence).toMatch(/With verification 30\+/);
    expect(E.playCard({ ...s, gauges: { ...s.gauges, verification: 30 } }, 'coalition').briefing.consequence).toBe('Ready to lead the response if an AI incident happens');
    expect(E.playCard(s, 'asml', 'model_access').briefing.consequence).toBeNull();
  });
});
