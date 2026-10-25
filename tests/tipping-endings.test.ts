// The tipping point (plan odds formula, draw, lab restraint, aftermath) and every ending boundary.

import { describe, expect, it } from 'vitest';
import { E, craft, nextQuarter, started, type CraftOptions } from './helpers';
import { nextRandom } from '../src/engine/rng';
import { ENDINGS, EPILOGUES } from '../src/data/endings';
import { LEA_END, LEA_ENDING_LINE } from '../src/data/lea';
import type { EndingId, GameState, PlanId } from '../src/engine/types';

const PLAN_IDS: PlanId[] = ['verified_slowdown', 'shut_down', 'fight_china', 'race'];

/**
 * The plan weights exactly as docs/DEVELOPER_NOTES.md states them (with rebalance 2: shut-down threshold 60;
 * v2: +10 after an emergency inspection summit). `withHidden` adds the term that reads hidden true alignment:
 * the real draw uses it, the odds shown to the player do not.
 */
function docWeights(s: GameState, withHidden = false): Record<PlanId, number> {
  const g = s.gauges;
  const slowdown =
    5 + 0.6 * g.verification + 0.3 * g.publicPressure + 10 * s.coalition + (s.flags.warningShotPrepared ? 15 : 0) + ((s.cardsPlayed.emergency_summit ?? 0) > 0 ? 10 : 0) - 0.2 * g.tension;
  const shut = 2 + (g.publicPressure >= 60 ? 0.3 * g.publicPressure : 0) + (withHidden && s.firedEvents.warning_shot && g.trueAlignment < 40 ? 10 : 0);
  const fight = 10 + 0.5 * g.tension;
  const race = Math.max(5, 25 - 0.2 * g.publicPressure - 0.1 * g.verification);
  return {
    verified_slowdown: Math.max(1, slowdown),
    shut_down: Math.max(1, shut),
    fight_china: Math.max(1, fight),
    race: Math.max(1, race),
  };
}
const docOdds = (s: GameState, withHidden = false) => {
  const w = docWeights(s, withHidden);
  const t = PLAN_IDS.reduce((a, p) => a + w[p], 0);
  return Object.fromEntries(PLAN_IDS.map((p) => [p, w[p] / t])) as Record<PlanId, number>;
};

/** A state at the tipping point. */
function atTipping(over: CraftOptions = {}): GameState {
  const s = craft({ ...over, gauges: { capability: 80, ...over.gauges } });
  return { ...s, phase: 'tipping', decidedThisQuarter: false };
}

describe('plan odds', () => {
  it('match the developer notes formula on a grid of states', () => {
    for (const verification of [0, 30, 50, 100])
      for (const publicPressure of [0, 59, 60, 100])
        for (const tension of [0, 40, 100])
          for (const coalition of [0, 1, 3])
            for (const ws of [false, true])
              for (const trueAlignment of [39, 40])
                for (const summit of [0, 1]) {
                  const s = craft({ gauges: { verification, publicPressure, tension, trueAlignment }, coalition, flags: { warningShotPrepared: ws } });
                  const t = { ...(ws ? { ...s, firedEvents: { warning_shot: { quarter: 3, prepared: true } } } : s), cardsPlayed: { emergency_summit: summit } };
                  const odds = E.planOdds(t);
                  const expected = docOdds(t);
                  for (const p of PLAN_IDS) expect(odds[p]).toBeCloseTo(expected[p], 12);
                  // the real draw at the tipping point uses the hidden term too
                  const drawn = E.runTippingPoint({ ...t, phase: 'tipping' }).tipping!.odds;
                  const real = docOdds(t, true);
                  for (const p of PLAN_IDS) expect(drawn[p]).toBeCloseTo(real[p], 12);
                }
  });

  it('shut it all down gets the pressure term from 60 (not 59)', () => {
    const at = (pp: number) => craft({ gauges: { publicPressure: pp } });
    const w = (s: GameState) => E.planOdds(s).shut_down / E.planOdds(s).fight_china; // fight does not depend on pressure
    expect(w(at(59)) * (10 + 0.5 * 40)).toBeCloseTo(2, 10);
    expect(w(at(60)) * (10 + 0.5 * 40)).toBeCloseTo(2 + 18, 10);
  });

  it('race has a floor of 5, every weight a minimum of 1', () => {
    const s = craft({ gauges: { publicPressure: 100, verification: 100, tension: 100 } });
    const o = E.planOdds(s);
    expect(o.race / o.fight_china).toBeCloseTo(5 / 60, 10);
    const low = craft({ gauges: { verification: 0, publicPressure: 0, tension: 100 } });
    const ol = E.planOdds(low);
    // slowdown = 5 − 20 = −15 → 1
    expect(ol.verified_slowdown / ol.fight_china).toBeCloseTo(1 / 60, 10);
  });

  it('sum to 1 and are all positive', () => {
    const o = E.planOdds(craft({}));
    expect(Object.values(o).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    for (const v of Object.values(o)) expect(v).toBeGreaterThan(0);
  });
});

describe('runTippingPoint', () => {
  it('refuses before the tipping point and does nothing after the end', () => {
    expect(() => E.runTippingPoint(started({}))).toThrow(/not been reached/);
    const done = E.runTippingPoint(atTipping());
    expect(E.runTippingPoint(done)).toEqual(done);
  });

  it('draws the plan with the seeded generator, in plan order, and stores the odds of the moment', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = atTipping({ seed, gauges: { verification: (seed * 7) % 100, publicPressure: (seed * 13) % 100, tension: (seed * 3) % 100 }, coalition: seed % 4 });
      const done = E.runTippingPoint(s);
      const odds = E.planOdds(s);
      expect(done.tipping!.odds).toEqual(odds);
      const [r] = nextRandom(s.rng);
      let acc = r * PLAN_IDS.reduce((a, p) => a + odds[p], 0);
      let expected: PlanId = 'race';
      for (const p of PLAN_IDS) {
        acc -= odds[p];
        if (acc < 0) {
          expected = p;
          break;
        }
      }
      expect(done.tipping!.plan, `seed ${seed}`).toBe(expected);
      expect(done.phase).toBe('ended');
      expect(done.ending).toBe(E.resolveEnding(done));
    }
  });

  it('lab restraint: only in a race, with probability 20% + public pressure / 4 %, and +8 true alignment', () => {
    let races = 0;
    let restrained = 0;
    for (let seed = 0; seed < 600; seed++) {
      const pp = seed % 100;
      // race made likely: low verification, low pressure term, low tension
      const s = atTipping({ seed, gauges: { verification: 0, publicPressure: pp, tension: 0, trueAlignment: 50 } });
      const done = E.runTippingPoint(s);
      if (done.tipping!.plan !== 'race') {
        expect(done.tipping!.labRestraint).toBeNull();
        continue;
      }
      races++;
      const [, afterPlan] = nextRandom(s.rng);
      const [r2] = nextRandom(afterPlan);
      const expected = r2 < 0.2 + pp / 400;
      expect(done.tipping!.labRestraint, `seed ${seed}`).toBe(expected);
      expect(done.gauges.trueAlignment).toBe(expected ? 58 : 50);
      if (expected) restrained++;
      const entry = done.log.find((e) => e.id === 'plan.race')!;
      expect(entry.debrief).toContain(expected ? 'The leading lab held back a little on its own' : 'No lab held back.');
      if (expected) expect(entry.hiddenDeltas).toContainEqual({ key: 'trueAlignment', amount: 8, hidden: true });
    }
    expect(races).toBeGreaterThan(50);
    expect(restrained).toBeGreaterThan(0);
    expect(restrained).toBeLessThan(races);
  });

  it('restraint can turn a loss of control into a cognitive revolution', () => {
    for (let seed = 0; seed < 400; seed++) {
      const done = E.runTippingPoint(atTipping({ seed, gauges: { verification: 0, publicPressure: 0, tension: 0, trueAlignment: 55 } }));
      if (done.tipping!.plan !== 'race') continue;
      expect(done.ending).toBe(done.tipping!.labRestraint ? 'cognitive_revolution' : 'loss_of_control');
    }
  });

  it('aftermath: race −25, fight −10 on each organ, nothing after a deal; economy and state halved by the mandate', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      for (const mandate of [false, true]) {
        const s = atTipping({ seed, flags: { oversightMandate: mandate }, gauges: { tension: seed % 2 ? 90 : 10, publicPressure: (seed * 11) % 100, verification: (seed * 17) % 100 } });
        const done = E.runTippingPoint(s);
        const plan = done.tipping!.plan;
        seen.add(plan);
        const loss = plan === 'race' ? 25 : plan === 'fight_china' ? 10 : 0;
        const halved = mandate ? Math.trunc(loss / 2) : loss;
        expect(s.eu.economy - done.eu.economy, `${plan} ${mandate}`).toBe(halved);
        expect(s.eu.culture - done.eu.culture).toBe(loss);
        expect(s.eu.state - done.eu.state).toBe(halved);
        const entry = done.log.find((e) => e.id === `plan.${plan}`)!;
        expect(entry.visibleDeltas).toEqual([]);
        for (const d of entry.hiddenDeltas) expect(d.hidden).toBe(true);
        if (loss) {
          expect(entry.debrief).toContain('Afterwards, AI spread through Europe’s economy, culture and state faster than ever');
          expect(entry.debrief.includes('slowed in firms and ministries by the oversight mandate')).toBe(mandate);
        } else expect(entry.debrief).not.toContain('Afterwards');
        expect(entry.actor).toBe(plan === 'fight_china' ? 'us' : 'ai_systems');
        expect(entry.debrief).toMatch(/^Odds were: Verified slowdown \d+%, Shut it all down \d+%, Fight China \d+%, Race to superintelligence \d+%\./);
      }
    }
    expect(seen).toEqual(new Set(PLAN_IDS));
  });

  it('the aftermath is clamped at 0', () => {
    for (let seed = 0; seed < 200; seed++) {
      const done = E.runTippingPoint(atTipping({ seed, eu: { economy: 5, culture: 5, state: 5 }, gauges: { verification: 0, publicPressure: 0, tension: 0 } }));
      if (done.tipping!.plan === 'race') {
        expect(done.eu).toEqual({ economy: 0, culture: 0, state: 0 });
        return;
      }
    }
    throw new Error('no race drawn');
  });

  it('the full flow: capability 80 → free decision → plan → ending, with the decision counted in the odds', () => {
    const s = started({ speed: 'fast', gauges: { capability: 74, trueAlignment: 60 }, extra: { firedEvents: { opaque_reasoning: { quarter: 2, prepared: true } } } });
    const tip = E.endQuarter(E.pass(s)).state;
    expect(tip.phase).toBe('tipping');
    expect(E.situationReport(tip).why[0]).toBe('AI can now automate its own research. The US and China are about to choose a path.');
    expect(E.situationReport(tip).lea).toBeNull();
    const played = E.playCard(tip, 'host_verification').state;
    const done = E.runTippingPoint(played);
    expect(done.tipping!.odds).toEqual(E.planOdds(played));
    expect(done.tipping!.odds.verified_slowdown).toBeGreaterThan(E.planOdds(tip).verified_slowdown);
  });
});

// ---------------------------------------------------------------------------

/** resolveEnding on a crafted state, with a plan (tipping world) or none (no tipping point). */
function ending(over: CraftOptions, plan: PlanId | null, extra: Partial<GameState> = {}): EndingId {
  const s = { ...craft(over), ...extra };
  s.tipping = plan ? { odds: E.planOdds(s), plan, labRestraint: plan === 'race' ? false : null } : null;
  return E.resolveEnding(s);
}

describe('endings, at every boundary', () => {
  const rw = (prepared: boolean, choice?: string) => ({ firedEvents: { ransomware: { quarter: 5, prepared, choice } } });
  const sb = (prepared: boolean, choice?: string) => ({ firedEvents: { silicon_blackmail: { quarter: 5, prepared, choice } } });

  it('no tipping point: concentration 59 is a plateau, 60 is Big AI', () => {
    expect(ending({ gauges: { concentration: 59 } }, null)).toBe('bright_winter');
    expect(ending({ gauges: { concentration: 60 } }, null)).toBe('agent_economy');
  });

  it('plateau: a bright winter unless the ransomware wave hit unprepared (whatever the response)', () => {
    const p = { gauges: { concentration: 30 } };
    expect(ending(p, null)).toBe('bright_winter');
    expect(ending(p, null, rw(true))).toBe('bright_winter');
    expect(ending(p, null, rw(false, 'emergency_ban'))).toBe('decentralised_mayhem');
    expect(ending(p, null, rw(false, 'defence_spending'))).toBe('decentralised_mayhem');
  });

  it('Big AI: the agent economy needs economy 40+ (39 is not enough) and standing firm', () => {
    const b = (economy: number) => ({ gauges: { concentration: 75 }, eu: { economy } });
    expect(ending(b(40), null)).toBe('agent_economy');
    expect(ending(b(39), null)).toBe('silicon_blackmail');
    expect(ending(b(40), null, sb(true))).toBe('agent_economy');
    expect(ending(b(40), null, sb(false, 'hold_firm'))).toBe('agent_economy');
    expect(ending(b(40), null, sb(false, 'give_in'))).toBe('silicon_blackmail');
    expect(ending(b(39), null, sb(false, 'hold_firm'))).toBe('silicon_blackmail');
    // the ransomware wave does not matter in a Big AI world
    expect(ending(b(40), null, rw(false))).toBe('agent_economy');
  });

  it('diplomacy (both plans): verification 45+, concentration 70 or less, true alignment 45+ (v2 tuning)', () => {
    for (const plan of ['verified_slowdown', 'shut_down'] as PlanId[]) {
      const d = (verification: number, concentration: number, trueAlignment: number) => ending({ gauges: { verification, concentration, trueAlignment } }, plan);
      expect(d(45, 70, 45)).toBe('licensed_utopia');
      expect(d(44, 70, 45)).toBe('unstable_pause');
      expect(d(45, 71, 45)).toBe('unstable_pause');
      expect(d(45, 70, 44)).toBe('unstable_pause');
    }
  });

  it('arms race: a coalition (1+) and tension 70 or less', () => {
    const a = (coalition: number, tension: number) => ending({ coalition, gauges: { tension } }, 'fight_china');
    expect(a(1, 70)).toBe('multipolar_world');
    expect(a(3, 0)).toBe('multipolar_world');
    expect(a(0, 70)).toBe('hot_war');
    expect(a(1, 71)).toBe('hot_war');
  });

  it('take-off: true alignment 60+', () => {
    expect(ending({ gauges: { trueAlignment: 60 } }, 'race')).toBe('cognitive_revolution');
    expect(ending({ gauges: { trueAlignment: 59 } }, 'race')).toBe('loss_of_control');
  });

  it('a tipping-point world ignores the no-tipping-point rules', () => {
    expect(ending({ gauges: { concentration: 90, trueAlignment: 60 } }, 'race', rw(false))).toBe('cognitive_revolution');
  });

  it('every ending has a world, a twin of the other polarity and a why line', () => {
    expect(ENDINGS).toHaveLength(10);
    const worlds = new Map<string, boolean[]>();
    for (const e of ENDINGS) worlds.set(e.world, [...(worlds.get(e.world) ?? []), e.good]);
    expect([...worlds.keys()].sort()).toEqual(['arms_race', 'big_ai', 'diplomacy', 'plateau', 'take_off']);
    for (const goods of worlds.values()) expect(goods.sort()).toEqual([false, true]);
    for (const e of ENDINGS) expect(E.endingWhy(e.id)).toBe(e.why);
  });
});

describe('the ending view', () => {
  const ended = (eu: GameState['eu'], id: EndingId = 'bright_winter'): GameState => ({ ...craft({ eu }), phase: 'ended', ending: id });

  it('epilogue bands: 60+ high, 30–59 mid, below 30 low (on the average of the three scores)', () => {
    const epi = (eu: GameState['eu']) => E.debrief(ended(eu)).ending.epilogue;
    expect(epi({ economy: 60, culture: 60, state: 60 })).toBe(EPILOGUES.high);
    expect(epi({ economy: 60, culture: 60, state: 59 })).toBe(EPILOGUES.mid);
    expect(epi({ economy: 90, culture: 60, state: 30 })).toBe(EPILOGUES.high);
    expect(epi({ economy: 30, culture: 30, state: 30 })).toBe(EPILOGUES.mid);
    expect(epi({ economy: 30, culture: 30, state: 29 })).toBe(EPILOGUES.low);
  });

  it('shows the ending’s text, source, world, polarity and Léa’s last message', () => {
    for (const e of ENDINGS) {
      const v = E.debrief(ended({ economy: 50, culture: 50, state: 50 }, e.id)).ending;
      expect(v).toMatchObject({ id: e.id, world: e.world, good: e.good, title: e.title, source: e.source });
      // the text tells what happened in this run: no placeholder, no hedged alternatives (B4)
      expect(v.text).not.toMatch(/\{cause\}|, or the| or a few companies/);
      if (!e.causes) expect(v.text).toBe(e.text);
      expect(v.lea).toEqual({ slot: 'end', variant: `high:${e.id}`, text: `${LEA_ENDING_LINE[e.id]} ${LEA_END.high}` });
    }
  });
});

describe('ending texts state what actually happened (B4)', () => {
  const view = (over: CraftOptions, plan: PlanId, extra: Partial<GameState> = {}) => {
    const s = { ...craft(over), ...extra };
    const t = { ...s, tipping: { odds: E.planOdds(s), plan, labRestraint: null }, phase: 'ended' as const };
    return E.debrief({ ...t, ending: null }).ending;
  };

  it('an unstable pause names only the conditions that failed', () => {
    const noInspectors = view({ gauges: { verification: 20, concentration: 50, trueAlignment: 60 } }, 'verified_slowdown');
    expect(noInspectors.id).toBe('unstable_pause');
    expect(noInspectors.text).toContain('But nobody was ready to check the other side.');
    expect(noInspectors.text).not.toMatch(/less trustworthy|held all the cards/);
    const both = view({ gauges: { verification: 20, concentration: 80, trueAlignment: 60 } }, 'verified_slowdown');
    expect(both.text).toContain('nobody was ready to check');
    expect(both.text).toContain('a few companies held all the cards');
    expect(both.text).not.toMatch(/less trustworthy/);
  });

  it('a hot war says whether Europe stood alone or tension was too high', () => {
    const alone = view({ coalition: 0, gauges: { tension: 50 } }, 'fight_china');
    expect(alone.text).toContain('Europe stood alone');
    expect(alone.text).not.toContain('too far for talks');
    const tense = view({ coalition: 2, gauges: { tension: 90 } }, 'fight_china');
    expect(tense.text).toContain('Tension had gone too far for talks.');
    expect(tense.text).not.toContain('stood alone');
  });

  it('silicon blackmail and the agent economy follow what the labs did', () => {
    const big = (extra: Partial<GameState>, economy: number) => {
      const s = { ...craft({ gauges: { concentration: 70 }, eu: { economy } }), ...extra, phase: 'ended' as const, ending: null };
      return E.debrief(s).ending;
    };
    const gaveIn = big({ firedEvents: { silicon_blackmail: { quarter: 9, prepared: false, choice: 'give_in' } } }, 60);
    expect(gaveIn.id).toBe('silicon_blackmail');
    expect(gaveIn.text).toContain('Europe gave in');
    expect(gaveIn.text).not.toContain('Quietly, firm by firm');
    const quiet = big({}, 20);
    expect(quiet.text).toContain('Quietly, firm by firm');
    expect(big({}, 60).text).toContain('never dared to threaten it');
  });
});

describe('the game always ends', () => {
  it('a slow world ends after Q16 with no tipping point; others tip once capability reaches 80', () => {
    let s = E.startQuarter(craft({ quarter: 1, speed: 'slow' }));
    while (s.phase === 'quarter') {
      s = E.pass(s.pendingEvent ? E.resolveEvent(s, s.pendingEvent.options[0]?.id) : s);
      const out = E.endQuarter(s);
      s = out.outcome === 'next_quarter' ? E.startQuarter(out.state) : out.state;
    }
    expect(s.phase).toBe('ended');
    expect(s.quarter).toBe(16);
    expect(s.tipping).toBeNull();

    let f = E.startQuarter(craft({ quarter: 1, speed: 'fast' }));
    for (let i = 0; i < 16 && f.phase === 'quarter'; i++) {
      if (f.gauges.capability >= 80) break;
      f = nextQuarter(f);
    }
    expect(f.gauges.capability).toBeGreaterThanOrEqual(80);
    expect(f.quarter).toBeLessThan(16);
  });
});
