// v2 rules: income view, acts and unlocks, employment shocks, the dashboard (4 → 5 → 6), context cards,
// the risk track, the advisor, the trajectory, the situation report v2, tips, concerns, the journal and
// Léa's letters. Spec: docs/V2_SPEC.md; shared ids: docs/V2_WORKSTREAMS.md.

import { describe, expect, it } from 'vitest';
import { E, craft, logged, nextQuarter, playGame, prepared, randomStrategy, started, type CraftOptions } from './helpers';
import { CONCERNS } from '../src/data/copy';
import { TUNING } from '../src/data/tuning';
import type { CardId, DashboardKey, GameState } from '../src/engine/types';

/** A real game from Q1 (only the act-1 hand), with a few overrides applied before the first quarter. */
function fresh(seed = 3, over: Partial<GameState> = {}, gauges: Partial<GameState['gauges']> = {}): GameState {
  const s = E.createInitialState(seed);
  return { ...s, ...over, gauges: { ...s.gauges, ...gauges } };
}

/** Run quarters with a fixed decision policy until `quarter` has started. */
function runTo(s: GameState, quarter: number, decide: (x: GameState) => CardId | null = () => null): GameState {
  let x = E.startQuarter(s);
  while (x.quarter < quarter && x.phase === 'quarter') {
    if (x.pendingEvent) x = E.resolveEvent(x, x.pendingEvent.options[0]?.id);
    const id = decide(x);
    const v = id && E.cardViews(x).find((c) => c.id === id);
    x = v && v.available && v.affordable ? E.playCard(x, id!, v.options[0]?.id).state : E.pass(x);
    const out = E.endQuarter(x);
    if (out.outcome !== 'next_quarter') return out.state;
    x = E.startQuarter(out.state);
  }
  return x;
}

const notices = (s: GameState, kind?: string) => s.notices.filter((n) => !kind || n.kind === kind).map((n) => `${n.kind}:${n.id}`);
const hand = (s: GameState) => E.cardViews(s).map((c) => c.id);
const slots = (s: GameState) => E.dashboard(s).primary.map((g) => g.key);

describe('next quarter’s income (IncomeView)', () => {
  it('says what arrives and why, including the pressure bonus, the approval penalty and delayed effects', () => {
    expect(E.nextIncome(craft({ pc: 0, budget: 0 }))).toEqual({
      pc: 2,
      budget: 2,
      reasons: ['+2 Budget per quarter', '+2 PC per quarter'],
      nextQuarterExists: true,
    });
    const high = E.nextIncome(craft({ pc: 0, budget: 0, gauges: { publicPressure: 50 } }));
    expect(high.pc).toBe(3);
    expect(high.reasons).toContain('+1 PC: public pressure is high');
    const low = E.nextIncome(craft({ pc: 0, budget: 0, gauges: { approval: 29 } }));
    expect(low.pc).toBe(1);
    expect(low.reasons).toContain('−1 PC: approval is below 30');
    const flex = E.nextIncome({ ...craft({ pc: 0, budget: 0 }), pending: [{ key: 'pc', amount: -1, hidden: false }] });
    expect(flex.pc).toBe(1);
    expect(flex.reasons).toContain('−1 PC: delayed effect of last decision');
    expect(E.nextIncome(craft({ pc: 7, budget: 0 })).reasons).toContain('PC and Budget are capped at 8: spend or lose the rest');
  });

  it('matches what startQuarter then pays', () => {
    for (const over of [{}, { gauges: { publicPressure: 55 } }, { gauges: { approval: 20 } }] as CraftOptions[]) {
      const s = craft({ ...over, pc: 0, budget: 0 });
      const inc = E.nextIncome(s);
      const t = E.startQuarter(s);
      expect([t.pc, t.budget]).toEqual([inc.pc, inc.budget]);
    }
  });

  it('knows when no quarter follows: the last quarter, the tipping point, capability 80+', () => {
    expect(E.nextIncome(started({ quarter: 16 })).nextQuarterExists).toBe(false);
    expect(E.nextIncome({ ...started({}), phase: 'tipping' }).nextQuarterExists).toBe(false);
    expect(E.nextIncome({ ...started({}), gauges: { ...started({}).gauges, capability: 80 } }).nextQuarterExists).toBe(false);
    expect(E.nextIncome(started({ quarter: 15 })).nextQuarterExists).toBe(true);
  });
});

describe('acts and unlocks (spec phase 1)', () => {
  it('Q1 opens act 1 with four cards and four indicators', () => {
    const s = E.startQuarter(fresh());
    expect(s.act).toBe(1);
    expect(notices(s)).toEqual(['act:1']);
    expect(hand(s).sort()).toEqual(['ai_office', 'diplomatic_talks', 'fund_alignment', 'host_verification']);
    expect(slots(s)).toEqual(['capability', 'apparentAlignment', 'verification', 'tension']);
    expect(E.dashboard(s).cap).toBe(4);
  });

  it('Q2: partners call Brussels and the coalition unlocks, with a "New" badge, a reason and a news line', () => {
    const s = runTo(fresh(), 2);
    expect(notices(s, 'card_unlocked')).toEqual(['card_unlocked:coalition']);
    const v = E.cardViews(s).find((c) => c.id === 'coalition')!;
    expect(v.isNew).toBe(true);
    expect(v.unlockReason).toMatch(/^Unlocked because partners are calling Brussels/);
    expect(s.news.some((n) => n.id === 'beat.coalition' && n.quarter === 2)).toBe(true);
    // the badge is gone the quarter after
    expect(E.cardViews(nextQuarter(s)).find((c) => c.id === 'coalition')!.isNew).toBe(false);
  });

  it('weight security unlocks when the theft risk first appears (tension 45+ or capability 30+)', () => {
    const quiet = runTo(fresh(3, {}, { tension: 30, capability: 10 }), 2);
    expect(hand(quiet)).not.toContain('weight_security');
    const tense = E.startQuarter(fresh(3, {}, { tension: 44 }));
    expect(hand(tense)).toContain('weight_security');
    expect(notices(tense, 'card_unlocked')).toContain('card_unlocked:weight_security');
    expect(E.riskViews(tense).map((r) => r.id)).toEqual(['weight_theft']);
  });

  it('act 2 opens on the first wave of AI layoffs (capability 40): pressure indicator, flexicurity, ASML', () => {
    const s = E.startQuarter(fresh(3, { quarter: 3, takeoffSpeed: 'steady' }, { capability: 36 }));
    expect(s.act).toBe(2);
    expect(notices(s)).toEqual(
      expect.arrayContaining(['employment_shock:employment_shock_40', 'act:2', 'card_unlocked:flexicurity', 'card_unlocked:asml', 'indicator:publicPressure']),
    );
    expect(s.news.some((n) => n.id === 'actor.employment_shock_40')).toBe(true);
    expect(slots(s)).toContain('publicPressure');
  });

  it('slow worlds reach act 2 anyway at Q6, with their own news line', () => {
    const s = runTo(fresh(3, { takeoffSpeed: 'slow' }), 6);
    expect(s.gauges.capability).toBeLessThan(40);
    expect(s.act).toBe(2);
    expect(s.news.some((n) => n.id === 'beat.act2' && n.quarter === 6)).toBe(true);
    // act 3 (Léa's Q6 letter) waits for the next quarter: one act per quarter
    expect(s.unlockedCards).not.toContain('measure');
    const n = nextQuarter(s);
    expect(n.act).toBe(3);
    expect(n.unlockedCards).toEqual(expect.arrayContaining(['measure', 'oversight_mandate']));
  });

  it('act 3 opens at Léa’s Q6 letter once act 2 is open', () => {
    const s = runTo(fresh(4, { takeoffSpeed: 'fast' }), 6);
    expect(s.act).toBe(3);
    expect(s.leaLetters.map((l) => l.slot)).toEqual(['q1', 'q6']);
    expect(notices(s)).toEqual(expect.arrayContaining(['act:3', 'card_unlocked:measure', 'card_unlocked:oversight_mandate']));
  });

  it('the first AI-enabled cyberattack (misuse 25, act 2+) unlocks open models and the cyber shield, and the misuse indicator', () => {
    const act1 = E.startQuarter(fresh(3, { quarter: 3 }, { misuse: 30 }));
    expect(act1.act).toBe(1);
    expect(hand(act1)).not.toContain('cyber_defence');
    const s = E.startQuarter({ ...fresh(3, { quarter: 3, act: 2 }, { misuse: 30 }), dashboard: { cap: 5, slots: ['capability', 'apparentAlignment', 'verification', 'tension', 'publicPressure'], milestones: ['beat:act2', 'ind:publicPressure', 'beat:coalition'] } });
    expect(notices(s)).toEqual(expect.arrayContaining(['card_unlocked:open_models', 'card_unlocked:cyber_defence', 'indicator:misuse']));
    expect(s.news.some((n) => n.id === 'beat.misuse')).toBe(true);
  });

  it('every game reaches act 3 and unlocks the whole deck', () => {
    for (let seed = 0; seed < 30; seed++) {
      const { final } = playGame(seed, randomStrategy);
      expect(final.act).toBe(3);
      expect(final.unlockedCards.sort()).toEqual(
        ['ai_office', 'asml', 'coalition', 'cyber_defence', 'diplomatic_talks', 'flexicurity', 'fund_alignment', 'host_verification', 'measure', 'open_models', 'oversight_mandate', 'weight_security'].sort(),
      );
    }
  });
});

describe('employment shocks', () => {
  it('the first time capability reaches 40 and 70: approval −5, public pressure +5, once each', () => {
    const s = started({ gauges: { capability: 36 } });
    expect(logged(s, 'employment_shock_40')[0].visibleDeltas).toEqual([
      { key: 'approval', amount: -5, hidden: false },
      { key: 'publicPressure', amount: 5, hidden: false },
    ]);
    expect(notices(s, 'employment_shock')).toEqual(['employment_shock:employment_shock_40']);
    const n = nextQuarter(s);
    expect(logged(n, 'employment_shock_40')).toEqual([]);
    const late = started({ gauges: { capability: 66 } });
    expect(logged(late, 'employment_shock_70')).toHaveLength(1);
    expect(logged(started({ gauges: { capability: 35 } }), 'employment_shock_40')).toEqual([]);
  });

  it('flexicurity softens them to approval −2', () => {
    const s = started({ gauges: { capability: 66 }, flags: { flexicurity: true } });
    expect(logged(s, 'employment_shock_70')[0].visibleDeltas).toEqual([
      { key: 'approval', amount: -2, hidden: false },
      { key: 'publicPressure', amount: 5, hidden: false },
    ]);
    expect(s.notices.find((x) => x.id === 'employment_shock_70')!.text).toMatch(/Flexicurity softened the blow/);
  });

  it('a stolen model can trigger one (capability +5 after drift)', () => {
    const s = started({ gauges: { capability: 62, tension: 55, trueAlignment: 60 } });
    expect(s.firedEvents.weight_theft?.prepared).toBe(false);
    expect(logged(s, 'employment_shock_70')).toHaveLength(1);
  });
});

describe('the dashboard: 4 → 5 → 6 indicators (handoff 06)', () => {
  it('the coalition indicator arrives the quarter after the first level: the dashboard is frozen during the decision', () => {
    let s = runTo(fresh(), 2);
    s = E.playCard(s, 'coalition').state;
    expect(slots(s)).toEqual(['capability', 'apparentAlignment', 'verification', 'tension']);
    s = nextQuarter(s);
    expect(slots(s)).toEqual(['capability', 'apparentAlignment', 'verification', 'tension', 'coalition']);
    expect(E.dashboard(s).cap).toBe(5);
    expect(E.dashboard(s).introduced).toEqual({ key: 'coalition', why: expect.any(String) });
    expect(E.dashboard(nextQuarter(s)).introduced).toBeNull();
  });

  it('GDP and approval stay in the secondary list; everything visible is primary or secondary, never both', () => {
    const d = E.dashboard(E.startQuarter(fresh()));
    const second = d.secondary.map((g) => g.key);
    expect(second).toEqual(expect.arrayContaining(['gdp', 'approval', 'coalition', 'publicPressure', 'misuse', 'concentration']));
    expect(second).not.toContain('trueAlignment');
    for (const g of d.primary) expect(second).not.toContain(g.key);
  });

  it('expands by at most one indicator per quarter when several become relevant at once', () => {
    // coalition played, act 2 opening and concentration 60 all at once
    const s = E.startQuarter(fresh(3, { quarter: 3, coalition: 1 }, { capability: 36, concentration: 62 }));
    expect(notices(s, 'indicator')).toHaveLength(1);
    const a = slots(s);
    const b = slots(nextQuarter(s));
    const c = slots(nextQuarter(nextQuarter(s)));
    expect(b.length).toBe(Math.min(6, a.length + 1));
    expect(c.length).toBe(6);
    // stable positions: what was there stays in place
    expect(b.slice(0, a.length)).toEqual(a);
  });

  it('never grows on the calendar alone', () => {
    // a slow world where the player never builds a coalition: nothing expands before act 2 opens at Q6
    let s = E.startQuarter(fresh(3, { takeoffSpeed: 'slow' }, { tension: 30 }));
    for (let q = 1; q < 6; q++) {
      expect(slots(s), `Q${q}`).toHaveLength(4);
      s = nextQuarter(s);
    }
    expect(s.quarter).toBe(6);
    expect(slots(s)).toContain('publicPressure');
  });

  it('at six, a newcomer replaces the least relevant one in its slot; the opening four never leave', () => {
    const base = fresh(3, {
      quarter: 8,
      act: 2,
      dashboard: { cap: 6, slots: ['capability', 'apparentAlignment', 'verification', 'tension', 'coalition', 'publicPressure'], milestones: ['ind:coalition', 'ind:publicPressure', 'beat:act2', 'beat:coalition', 'beat:theft_risk', 'beat:act3'] },
      coalition: 3,
    }, { misuse: 30 });
    const s = E.startQuarter(base);
    // the full coalition (relevance 30) makes way for misuse risk
    expect(slots(s)).toEqual(['capability', 'apparentAlignment', 'verification', 'tension', 'misuse', 'publicPressure']);
    expect(E.dashboard(s).cap).toBe(6);
    expect(E.dashboard(s).secondary.map((g) => g.key)).toContain('coalition');
  });

  it('in whole games: never more than six, opening four always first, one change per quarter at most', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { trail } = playGame(seed, prepared, true);
      let prev: DashboardKey[] | null = null;
      let prevQ = '';
      for (const s of trail) {
        const now = s.dashboard.slots;
        expect(now.length).toBeLessThanOrEqual(6);
        expect(now.slice(0, 4)).toEqual(['capability', 'apparentAlignment', 'verification', 'tension']);
        // a quarter runs from its startQuarter to the next one
        const q = `${s.quarter}|${s.log.some((e) => e.quarter === s.quarter && e.kind === 'drift')}`;
        if (prev && q === prevQ) expect(now).toEqual(prev); // frozen during the quarter, decision included
        else if (prev) expect(now.filter((k, i) => prev![i] !== k).length).toBeLessThanOrEqual(1);
        prev = now.slice();
        prevQ = q;
      }
    }
  });
});

describe('context cards', () => {
  const warningShot = (prepared: boolean) =>
    started({ quarter: 9, gauges: { capability: 64, trueAlignment: 40, verification: prepared ? 30 : 0 }, coalition: 1, pc: 8, budget: 8 });

  it('an emergency inspection summit is offered for two quarters after a prepared warning shot', () => {
    const s = warningShot(true);
    expect(s.firedEvents.warning_shot?.prepared).toBe(true);
    expect(s.contextCards).toEqual([{ id: 'emergency_summit', until: 10, reason: expect.stringMatching(/^Offered because/) }]);
    expect(notices(s, 'context_card')).toEqual(['context_card:emergency_summit']);
    const v = E.cardViews(s).find((c) => c.id === 'emergency_summit')!;
    expect(v.context).toEqual({ until: 10, reason: s.contextCards[0].reason });
    expect(v.available).toBe(true);
    const q10 = nextQuarter(E.resolveEvent(s));
    expect(hand(q10)).toContain('emergency_summit');
    const q11 = nextQuarter(q10);
    expect(hand(q11)).not.toContain('emergency_summit');
    expect(() => E.playCard(q11, 'emergency_summit')).toThrow(/Not on offer now/);
    // never after an unprepared warning shot
    expect(warningShot(false).contextCards).toEqual([]);
  });

  it('the summit raises verification by 10 and pushes the superpowers towards a verified slowdown', () => {
    const s = E.resolveEvent(warningShot(true));
    const { state, briefing } = E.playCard(s, 'emergency_summit');
    expect(state.gauges.verification - s.gauges.verification).toBe(10);
    const odds = E.planOdds(state);
    const withoutBonus = E.planOdds({ ...state, cardsPlayed: { ...state.cardsPlayed, emergency_summit: 0 } });
    expect(odds.verified_slowdown).toBeGreaterThan(withoutBonus.verified_slowdown);
    expect(briefing.consequence).toMatch(/slow down under inspection/);
    expect(state.contextCards).toEqual([]);
    expect(hand({ ...state, decidedThisQuarter: false })).not.toContain('emergency_summit');
  });

  it('joint attribution is offered after a theft, needs a coalition partner, and stops the next US escalation', () => {
    const theft = (coalition: number) => E.resolveEvent(started({ quarter: 6, gauges: { capability: 45, tension: 55 }, coalition, pc: 8, budget: 8 }));
    const alone = theft(0);
    expect(alone.firedEvents.weight_theft?.prepared).toBe(false);
    const v = E.cardViews(alone).find((c) => c.id === 'joint_attribution')!;
    expect(v.lockedReason).toBe('Needs at least one coalition partner to attribute together');
    // without it, Washington widens export controls two quarters later
    let x = nextQuarter(nextQuarter(alone));
    expect(logged(x, 'us_escalation')[0].visibleDeltas).toEqual([{ key: 'tension', amount: 5, hidden: false }]);
    expect(x.news.some((n) => n.id === 'actor.us_escalation')).toBe(true);
    // with it, the escalation is averted
    const allied = theft(1);
    const played = E.playCard(allied, 'joint_attribution');
    expect(played.state.gauges.tension - allied.gauges.tension).toBe(-5);
    x = nextQuarter(nextQuarter(played.state));
    expect(logged(x, 'us_escalation')).toEqual([]);
    expect(logged(x, 'us_escalation_averted:theft')).toHaveLength(1);
    expect(E.situationReport(x).why).toContain('Because you attributed the theft with your partners, Washington held back new export controls.');
  });

  it('the attribution shield is used once: it averts the chip controls if they come first', () => {
    const s = { ...craft({ gauges: { tension: 62 } }), cardsPlayed: { joint_attribution: 1 } };
    const t = E.startQuarter(s);
    expect(logged(t, 'us_chip_controls')).toEqual([]);
    expect(logged(t, 'us_escalation_averted:chips')).toHaveLength(1);
    expect(t.flags.exportControls).toBe(true);
  });
});

describe('the risk track', () => {
  it('a risk appears, then rises and becomes imminent as public values approach its thresholds', () => {
    const at = (g: Partial<GameState['gauges']>) => E.riskViews(craft({ gauges: g })).find((r) => r.id === 'weight_theft');
    expect(at({ tension: 40, capability: 20 })).toBeUndefined();
    expect(at({ tension: 45, capability: 20 })!.stage).toBe('watch');
    expect(at({ tension: 45, capability: 30 })!.stage).toBe('rising');
    expect(at({ tension: 47, capability: 35 })!.stage).toBe('imminent');
    expect(at({ tension: 47, capability: 35 })!.why).toBe('Geopolitical tension 47 (danger at 50), Capability 35 (danger at 40).');
  });

  it('shows prepared, what prepares it and which cards, then "happened" with the outcome', () => {
    const r = E.riskViews(craft({ gauges: { tension: 48 }, flags: { weightSecurity: true } })).find((x) => x.id === 'weight_theft')!;
    expect(r).toMatchObject({ prepared: true, preparingCards: ['weight_security'], certainty: 'likely' });
    expect(r.preparedBy.length).toBeGreaterThan(10);
    const done = E.riskViews({ ...craft({}), firedEvents: { weight_theft: { quarter: 4, prepared: false } } }).find((x) => x.id === 'weight_theft')!;
    expect(done).toMatchObject({ stage: 'happened', prepared: false, why: 'Q4 2027: Europe was not prepared.' });
  });

  it('the warning shot is only ever "possible"', () => {
    for (const capability of [50, 58, 64, 70]) {
      const r = E.riskViews(craft({ gauges: { capability } })).find((x) => x.id === 'warning_shot')!;
      expect(r.certainty).toBe('possible');
    }
    expect(E.riskViews(craft({ gauges: { capability: 49 } })).some((x) => x.id === 'warning_shot')).toBe(false);
  });

  it('silicon blackmail appears with the oversight mandate; the ransomware wave at misuse 25', () => {
    expect(E.riskViews(craft({ flags: { oversightMandate: true } })).map((r) => r.id)).toContain('silicon_blackmail');
    expect(E.riskViews(craft({ gauges: { misuse: 24 } })).map((r) => r.id)).not.toContain('ransomware');
    expect(E.riskViews(craft({ gauges: { misuse: 25 } })).find((r) => r.id === 'ransomware')!.stage).toBe('watch');
  });

  it('a risk that appeared stays on the track even if its trigger falls back', () => {
    let s = E.startQuarter(craft({ gauges: { tension: 46 } }));
    expect(E.riskViews(s).map((r) => r.id)).toContain('weight_theft');
    s = { ...s, gauges: { ...s.gauges, tension: 30 } };
    expect(E.riskViews(s).map((r) => r.id)).toContain('weight_theft');
  });

  it('never reads hidden values: true alignment, human influence and takeoff speed change nothing', () => {
    for (let seed = 0; seed < 15; seed++) {
      const { trail } = playGame(seed, randomStrategy, true);
      for (const s of trail.filter((_, i) => i % 3 === 0)) {
        const other: GameState = { ...s, takeoffSpeed: s.takeoffSpeed === 'fast' ? 'slow' : 'fast', gauges: { ...s.gauges, trueAlignment: 100 - s.gauges.trueAlignment }, eu: { economy: 1, culture: 99, state: 3 } };
        expect(E.riskViews(other)).toEqual(E.riskViews(s));
        expect(E.advisor(other)).toEqual(E.advisor(s));
        expect(E.trajectory(other).odds).toEqual(E.trajectory(s).odds);
        if (s.phase !== 'ended') expect(E.situationReport(other).headline).toEqual(E.situationReport(s).headline);
      }
    }
  });
});

describe('the advisor', () => {
  it('recommends preparing for the most urgent unprepared risk, with its reason and an alternative', () => {
    const s = started({ gauges: { tension: 47, capability: 35 } });
    const a = E.advisor(s);
    expect(a.recommend).toBe('weight_security');
    expect(a.reason).toMatch(/^Model theft: /);
    expect(a.text).toMatch(/Weight security standards/);
    expect(a.alternative).not.toBeNull();
    expect(a.alternative!.card).not.toBe('weight_security');
  });

  it('when the answer is not affordable yet, says so instead of recommending it', () => {
    const s = { ...started({ gauges: { tension: 47, capability: 35 } }), pc: 1, budget: 0 };
    const a = E.advisor(s);
    expect(a.recommend).toBeNull();
    expect(a.text).toMatch(/cannot afford Weight security standards yet/);
  });

  it('takes a context card while it lasts', () => {
    const s = { ...started({}), contextCards: [{ id: 'emergency_summit' as const, until: 6, reason: 'Offered because the world is listening' }] };
    expect(E.advisor(s).recommend).toBe('emergency_summit');
  });

  it('never recommends a card that is locked, not in hand or unaffordable, in any state of real games', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { trail } = playGame(seed, seed % 2 ? randomStrategy : prepared, true);
      for (const s of trail) {
        const a = E.advisor(s);
        for (const id of [a.recommend, a.alternative?.card].filter(Boolean) as CardId[]) {
          const v = E.cardViews(s).find((c) => c.id === id);
          expect(v, `${id} Q${s.quarter}`).toBeDefined();
          expect(v!.available && v!.affordable).toBe(true);
        }
        expect(a.text).not.toMatch(/\d/);
        expect(a.reason).not.toMatch(/\d/);
      }
    }
  });
});

describe('the trajectory', () => {
  it('starts with no change, then names the decision that moved the odds', () => {
    const s0 = E.startQuarter(E.createInitialState(3));
    expect(E.trajectory(E.createInitialState(3)).change).toBeNull();
    const s = { ...s0, gauges: { ...s0.gauges, tension: 50 } };
    const t = E.playCard(s, 'host_verification').state;
    const change = E.trajectory(t).change!;
    expect(change.because).toBe('you hosted inspections');
    expect(change.plan).toBeDefined();
    expect(Math.abs(change.delta)).toBeGreaterThan(0.01);
    expect(t.oddsHistory.at(-1)).toEqual({ quarter: 1, odds: E.planOdds(t), cause: 'you hosted inspections' });
  });

  it('records events with their cause, and a hidden effect never moves it', () => {
    const s = started({ gauges: { tension: 55, capability: 45, trueAlignment: 60 } });
    expect(s.oddsHistory.some((h) => h.quarter === s.quarter && h.cause === 'China stole a model')).toBe(true);
    const t = E.playCard(s.pendingEvent ? E.resolveEvent(s) : s, 'fund_alignment').state;
    expect(t.oddsHistory.at(-1)!.odds).toEqual(t.oddsHistory.at(-2)!.odds);
    expect(E.trajectory(t).change!.because).not.toBe('you funded alignment research');
  });
});

describe('the situation report v2', () => {
  it('opens with 1–3 headline lines, each with its absolute level, its delta and its own real cause', () => {
    const s = started({ gauges: { tension: 55, capability: 45, trueAlignment: 60 } });
    const r = E.situationReport(s);
    expect(r.headline.length).toBeGreaterThanOrEqual(1);
    expect(r.headline.length).toBeLessThanOrEqual(3);
    const tension = r.headline.find((h) => h.key === 'tension')!;
    expect(tension).toMatchObject({ label: 'Geopolitical tension', value: s.gauges.tension, delta: s.gauges.tension - 55, cause: 'China stole a model', kind: 'event' });
    for (const h of r.headline) expect(h.value).toBe(h.key === 'coalition' ? s.coalition : s.gauges[h.key]);
  });

  it('gives each indicator its own cause (B1): GDP is never caused by public concern', () => {
    const s = nextQuarter(nextQuarter(started({})));
    const r = E.situationReport(s);
    const gdp = r.changes.find((c) => c.key === 'gdp')!;
    const pressure = r.changes.find((c) => c.key === 'publicPressure')!;
    expect(gdp.cause).toBe('AI adoption lifts growth');
    expect(pressure.cause).toBe('Growing public concern about AI');
  });

  it('folds routine drift into one background line whose wording changes from one quarter to the next (B2)', () => {
    let s = E.startQuarter(E.createInitialState(3));
    const lines: string[] = [];
    for (let i = 0; i < 4; i++) {
      lines.push(E.situationReport(s).background);
      s = nextQuarter(s);
    }
    for (const l of lines) expect(l).toMatch(/^[A-Z][^:]+: [a-z].* \d+ \([+−]\d+\)/);
    for (let i = 1; i < lines.length; i++) expect(lines[i].split(':')[0]).not.toBe(lines[i - 1].split(':')[0]);
  });

  it('lists the risks that moved this quarter and the trajectory’s last change', () => {
    const s = started({ gauges: { tension: 44 } });
    expect(E.situationReport(s).risksMoved.map((r) => r.id)).toEqual(['weight_theft']);
    const n = nextQuarter(s);
    const stage = (x: GameState) => E.riskViews(x).find((r) => r.id === 'weight_theft')!.stage;
    expect(E.situationReport(n).risksMoved.map((r) => r.id).includes('weight_theft')).toBe(stage(n) !== stage(s));
    expect(E.situationReport(s).trajectoryChange).toEqual(E.trajectory(s).change);
  });

  it('labels each headline line with what kind of cause it is', () => {
    const shock = E.situationReport(started({ gauges: { capability: 36 } }));
    expect(shock.headline.find((h) => h.key === 'approval')).toMatchObject({ kind: 'threshold', cause: 'First wave of AI layoffs' });
  });
});

describe('what each level means for winning (ReportLine.meaning)', () => {
  const meaning = (key: DashboardKey, over: CraftOptions = {}, extra: Partial<GameState> = {}) => E.levelMeaning({ ...craft(over), ...extra }, key);
  const V = TUNING.endings.utopiaVerification;

  it('verification: how many points a verified deal still needs', () => {
    expect(meaning('verification', { gauges: { verification: 37 } })).toBe(`Verification readiness 37: ${V - 37} more needed for a verified deal (${V})`);
    expect(meaning('verification', { gauges: { verification: V } })).toBe(`Verification readiness ${V}: enough inspectors to verify a deal (${V}+)`);
  });

  it('tension: the race speeds up at 60; above 70 a fight turns hot', () => {
    expect(meaning('tension', { gauges: { tension: 52 } })).toBe('Geopolitical tension 52: 8 below the level where the race speeds up (60)');
    expect(meaning('tension', { gauges: { tension: 62 } })).toBe('Geopolitical tension 62: above 60 the race speeds up and a fight becomes likelier');
    expect(meaning('tension', { gauges: { tension: 75 } })).toMatch(/^Geopolitical tension 75: above 70, partners stay away/);
  });

  it('capability: AI improves itself at 80', () => {
    expect(meaning('capability', { gauges: { capability: 72 } })).toBe('Capability 72: at 80 AI starts improving itself');
    expect(meaning('capability', { gauges: { capability: 80 } })).toBe('Capability 80: AI now improves itself');
  });

  it('coalition: mediation from one partner, cooling from two', () => {
    expect(meaning('coalition', { coalition: 0 })).toMatch(/^Coalition 0 of 3: one partner lets Europe mediate/);
    expect(meaning('coalition', { coalition: 1 })).toMatch(/from level 2, coalition diplomacy cools tension/);
    expect(meaning('coalition', { coalition: 2 })).toBe('Coalition 2 of 3: coalition diplomacy cools tension every quarter');
  });

  it('public pressure: +1 PC from 50, a shutdown possible from 60', () => {
    expect(meaning('publicPressure', { gauges: { publicPressure: 40 } })).toBe('Public pressure 40: at 50, you get 1 more PC every quarter');
    expect(meaning('publicPressure', { gauges: { publicPressure: 55 } })).toBe('Public pressure 55: +1 PC every quarter while it stays at 50+');
    expect(meaning('publicPressure', { gauges: { publicPressure: 61 } })).toMatch(/a full shutdown becomes possible \(60\+\)/);
  });

  it('misuse risk: a ransomware wave at 40, nothing to add once it hit', () => {
    expect(meaning('misuse', { gauges: { misuse: 33 } })).toBe('Misuse risk 33: at 40 a ransomware wave hits Europe');
    expect(meaning('misuse', { gauges: { misuse: 20 } }, { firedEvents: { ransomware: { quarter: 3, prepared: true } } })).toBe('');
  });

  it('concentration: labs bend rules at 60; a deal cannot hold above 70', () => {
    expect(meaning('concentration', { gauges: { concentration: 55 } })).toBe('Power concentration 55: at 60 a few labs can bend Europe’s rules');
    expect(meaning('concentration', { gauges: { concentration: 75 } })).toBe('Power concentration 75: above 70, a verified deal would not hold');
  });

  it('approval: 1 PC less below 30', () => {
    expect(meaning('approval', { gauges: { approval: 29 } })).toBe('Approval 29: below 30, you get 1 PC less every quarter');
    expect(meaning('approval', { gauges: { approval: 45 } })).toBe('Approval 45: below 30, you would get 1 PC less every quarter');
  });

  it('apparent alignment says it is a claim; GDP has nothing to add', () => {
    expect(meaning('apparentAlignment', { gauges: { apparentAlignment: 70 } })).toBe('Apparent alignment 70: what the labs claim, not necessarily what is true');
    expect(meaning('gdp')).toBe('');
  });

  it('never depends on hidden values, and every headline line carries one', () => {
    const keys: DashboardKey[] = ['capability', 'concentration', 'apparentAlignment', 'verification', 'tension', 'misuse', 'publicPressure', 'gdp', 'approval', 'coalition'];
    for (const ta of [0, 30, 60, 100])
      for (const eu of [0, 50, 100])
        for (const k of keys) expect(meaning(k, { gauges: { trueAlignment: ta }, eu: { economy: eu, culture: eu, state: eu } })).toBe(meaning(k));
    const r = E.situationReport(started({ gauges: { tension: 55, capability: 45 } }));
    for (const h of r.headline) expect(h.meaning).toBe(E.levelMeaning(started({ gauges: { tension: 55, capability: 45 } }), h.key));
  });
});

describe('tips', () => {
  it('Q1 shows the clock tip, then the decision tip; then one per quarter, in priority order', () => {
    let s = E.startQuarter(E.createInitialState(3));
    expect(E.tip(s)!.id).toBe('tip_clock');
    s = E.markTipShown(s, 'tip_clock');
    expect(E.tip(s)!.id).toBe('tip_decision');
    s = E.markTipShown(s, 'tip_decision');
    expect(E.tip(s)).toBeNull();
    s = nextQuarter(s);
    const t = E.tip(s)!;
    expect(t.title.length).toBeGreaterThan(3);
    s = E.markTipShown(s, t.id);
    expect(E.tip(s)).toBeNull();
    expect(s.tipLog).toEqual([
      { id: 'tip_clock', quarter: 1 },
      { id: 'tip_decision', quarter: 1 },
      { id: t.id, quarter: 2 },
    ]);
  });

  it('each tip shows once; marking is idempotent; no tip after the end', () => {
    let s = E.startQuarter(E.createInitialState(3));
    s = E.markTipShown(E.markTipShown(s, 'tip_clock'), 'tip_clock');
    expect(s.tipsShown).toEqual(['tip_clock']);
    expect(E.tip({ ...s, phase: 'ended' })).toBeNull();
  });

  it('a tip waits for its trigger: risks, context cards, the tipping zone', () => {
    const all = ['tip_clock', 'tip_decision', 'tip_hidden', 'tip_trajectory', 'tip_coalition'];
    const base = { ...started({}), tipsShown: all, tipLog: [] };
    expect(E.tip(base)).toBeNull();
    expect(E.tip({ ...base, gauges: { ...base.gauges, tension: 50 } })!.id).toBe('tip_risks');
    const seen = { ...base, tipsShown: [...all, 'tip_risks'] };
    expect(E.tip({ ...seen, gauges: { ...seen.gauges, capability: 70 } })!.id).toBe('tip_tipping');
    expect(E.tip({ ...seen, contextCards: [{ id: 'emergency_summit' as const, until: 9, reason: 'r' }] })!.id).toBe('tip_context');
  });

  it('in whole games: at most one tip per quarter, except the two of Q1', () => {
    let s = E.createInitialState(8);
    for (let i = 0; i < 16 && s.phase === 'quarter'; i++) {
      s = E.startQuarter(s);
      for (let k = 0; k < 4; k++) {
        const t = E.tip(s);
        if (t) s = E.markTipShown(s, t.id);
      }
      expect(s.tipLog.filter((t) => t.quarter === s.quarter).length).toBeLessThanOrEqual(s.quarter === 1 ? 2 : 1);
      s = E.endQuarter(E.pass(s.pendingEvent ? E.resolveEvent(s, s.pendingEvent.options[0]?.id) : s)).state;
    }
  });
});

describe('notices and concerns', () => {
  it('notices are rebuilt every quarter', () => {
    const s = runTo(fresh(), 2);
    expect(s.notices.length).toBeGreaterThan(0);
    const n = nextQuarter(s);
    expect(n.notices.some((x) => x.id === 'coalition' && x.kind === 'card_unlocked')).toBe(false);
  });

  it('announce thresholds crossed: high pressure, high tension, capability 70, low approval', () => {
    expect(notices(started({ gauges: { publicPressure: 49 } }), 'threshold')).toContain('threshold:pressure_high');
    expect(notices(started({ gauges: { tension: 59 } }), 'threshold')).toContain('threshold:tension_high');
  });

  it('1–3 concerns per quarter, timed in the clock, more when public pressure is high', () => {
    const calm = started({ gauges: { publicPressure: 20 } });
    expect(calm.concerns).toHaveLength(1);
    const loud = started({ gauges: { publicPressure: 60 } });
    expect(loud.concerns).toHaveLength(3);
    for (const c of [...calm.concerns, ...loud.concerns]) {
      expect(c.at).toBeGreaterThan(0);
      expect(c.at).toBeLessThan(1);
      expect(c.text.length).toBeGreaterThan(10);
    }
  });

  it('pick their theme from what the public can see: safety when calm, jobs once capability passes 40', () => {
    const theme = (s: GameState) => s.concerns.map((c) => CONCERNS.find((x) => c.id.endsWith(`.${x.id}`))!.theme);
    expect(theme(started({}))).toEqual(['safety']);
    const themes = new Set<string>();
    for (let seed = 0; seed < 10; seed++) for (const t of theme(started({ seed, gauges: { capability: 60, publicPressure: 60 } }))) themes.add(t);
    expect(themes.has('jobs')).toBe(true);
  });
});

describe('Léa’s letters, history and the journal', () => {
  it('each letter is delivered exactly once, in order, with its quarter', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { final } = playGame(seed, seed % 2 ? prepared : randomStrategy);
      const slots = final.leaLetters.map((l) => l.slot);
      expect(new Set(slots).size).toBe(slots.length);
      expect(slots[0]).toBe('q1');
      expect(slots.at(-1)).toBe('end');
      expect(final.leaLetters[0].quarter).toBe(1);
      if (final.quarter >= 11) expect(slots).toEqual(['q1', 'q6', 'q11', 'end']);
      expect(final.leaLetters.at(-1)!.text).toBe(E.debrief(final).ending.lea.text);
    }
    const s = E.startQuarter(E.createInitialState(1));
    expect(E.startQuarter(s).leaLetters).toHaveLength(1);
  });

  it('the report shows the letter that was delivered, even if the hidden state moved since', () => {
    const s = runTo(fresh(5), 6);
    const letter = s.leaLetters.find((l) => l.slot === 'q6')!;
    const moved = { ...s, eu: { economy: letter.variant === 'human_touch' ? 10 : 99, culture: 50, state: 50 } };
    expect(E.situationReport(moved).lea!.text).toBe(letter.text);
  });

  it('one history record per decision, with the report the player saw and what was decided', () => {
    const s = runTo(fresh(), 3, (x) => (x.quarter === 1 ? 'ai_office' : null));
    expect(s.history.map((h) => [h.quarter, h.decision.cardId])).toEqual([
      [1, 'ai_office'],
      [2, null],
    ]);
    expect(s.history[0].decision.title).toBe('AI Office capacity');
    expect(s.history[1].decision.title).toBe('No decision (saved resources)');
    expect(s.history[0].report.quarter).toBe(1);
  });

  it('the journal lists past quarters with reports, decisions, events, Léa and tips', () => {
    let s = E.startQuarter(E.createInitialState(3));
    s = E.markTipShown(s, 'tip_clock');
    s = E.endQuarter(E.playCard(s, 'ai_office').state).state;
    const j = E.journal(s);
    expect(j).toHaveLength(1);
    expect(j[0]).toMatchObject({ quarter: 1, dateLabel: 'Q1 2027', decision: { cardId: 'ai_office' }, events: [] });
    expect(j[0].lea!.slot).toBe('q1');
    expect(j[0].tips.map((t) => t.id)).toEqual(['tip_clock']);
    const ev = started({ gauges: { tension: 55, capability: 45 } });
    const done = E.endQuarter(E.pass(E.resolveEvent(ev))).state;
    expect(E.journal(done).at(-1)!.events).toEqual([{ id: 'weight_theft', title: 'Weight theft', prepared: false }]);
  });
});
