// The quarter loop, rule by rule (docs/DEVELOPER_NOTES.md, "Quarter loop"), with every threshold tested on both sides.

import { describe, expect, it } from 'vitest';
import { E, craft, deltaMap, logged, nextQuarter, started, type CraftOptions } from './helpers';
import type { GameState, StatKey } from '../src/engine/types';

/** How much `key` moved during startQuarter. */
function moved(over: CraftOptions, key: StatKey): number {
  const before = craft(over);
  const after = E.startQuarter(before);
  const get = (s: GameState) =>
    key === 'coalition' ? s.coalition : key === 'pc' ? s.pc : key === 'budget' ? s.budget : key.startsWith('eu.') ? s.eu[key.slice(3) as 'economy'] : s.gauges[key as 'gdp'];
  return get(after) - get(before);
}

describe('income (from Q2)', () => {
  it('gives nothing in Q1 and logs no income entry', () => {
    const s = E.startQuarter(E.createInitialState(1));
    expect(s.pc).toBe(6);
    expect(s.budget).toBe(3);
    expect(s.log.filter((e) => e.kind === 'income')).toEqual([]);
  });

  it('gives +1 Budget and no base PC every quarter from Q2', () => {
    for (const q of [2, 9, 16]) {
      expect(moved({ quarter: q }, 'budget')).toBe(1);
      expect(moved({ quarter: q }, 'pc')).toBe(0);
    }
    const s = started({ quarter: 2 });
    const [inc] = logged(s, 'income');
    expect(inc.title).toBe('Income');
    expect(inc.visibleDeltas).toEqual([{ key: 'budget', amount: 1, hidden: false }]);
    expect(inc.briefing).toBe('New quarter: +0 PC, +1 Budget.');
  });

  it('gives +1 PC when public pressure is 50 or more at the start of the quarter (49 does not)', () => {
    expect(moved({ gauges: { publicPressure: 49 } }, 'pc')).toBe(0);
    expect(moved({ gauges: { publicPressure: 50 } }, 'pc')).toBe(1);
    const [inc] = logged(started({ gauges: { publicPressure: 50 } }), 'income');
    expect(inc.title).toMatch(/public pressure is high/);
    expect(deltaMap(inc.visibleDeltas)).toEqual({ pc: 1, budget: 1 });
  });

  it('reads pressure before this quarter’s drift raises it', () => {
    // 49 + drift would be 50, but income is computed first
    const s = started({ gauges: { publicPressure: 49 } });
    expect(s.gauges.publicPressure).toBe(50);
    expect(s.pc).toBe(20);
  });
});

describe('coalition upkeep', () => {
  it('charges nothing with no coalition', () => {
    const s = started({ coalition: 0, pc: 3 });
    expect(s.pc).toBe(3);
    expect(logged(s, 'upkeep')).toEqual([]);
  });

  it('charges 1 PC per level and logs it', () => {
    for (const level of [1, 2, 3]) {
      const s = started({ coalition: level, pc: 10 });
      expect(s.pc).toBe(10 - level);
      expect(s.coalition).toBe(level);
      const [u] = logged(s, 'upkeep');
      expect(u.visibleDeltas).toEqual([{ key: 'pc', amount: -level, hidden: false }]);
      expect(u.briefing).toBe(`Keeping partners on board cost ${level} PC.`);
      expect(logged(s, 'upkeep_unpaid')).toEqual([]);
    }
  });

  it('pays exactly when PC equals the upkeep', () => {
    const s = started({ coalition: 2, pc: 2 });
    expect(s.coalition).toBe(2);
    expect(s.pc).toBe(0);
  });

  it('counts the high-pressure PC bonus before paying upkeep', () => {
    const s = started({ coalition: 1, pc: 0, gauges: { publicPressure: 60 } });
    expect(s.coalition).toBe(1);
    expect(s.pc).toBe(0);
  });

  it('lets partners drift away one level at a time until the upkeep is payable', () => {
    const cases: [number, number, number, number][] = [
      // [coalition, pc, coalition after, pc after]
      [3, 2, 2, 0],
      [3, 1, 1, 0],
      [3, 0, 0, 0],
      [2, 1, 1, 0],
      [1, 0, 0, 0],
    ];
    for (const [c, pc, cAfter, pcAfter] of cases) {
      const s = started({ coalition: c, pc });
      expect([s.coalition, s.pc]).toEqual([cAfter, pcAfter]);
      const [lost] = logged(s, 'upkeep_unpaid');
      expect(lost.visibleDeltas).toEqual([{ key: 'coalition', amount: cAfter - c, hidden: false }]);
      expect(logged(s, 'upkeep')).toHaveLength(cAfter > 0 ? 1 : 0);
      expect(E.situationReport(s).why).toContain('You could not pay the coalition upkeep, so a partner drifted away.');
    }
  });
});

describe('pending effects', () => {
  it('apply at the start of next quarter with the card name in the log, then clear', () => {
    const s = started({ gauges: { capability: 35 }, pc: 5 });
    const t = E.playCard(s, 'flexicurity').state;
    expect(t.pending).toEqual([{ key: 'pc', amount: -1, hidden: false }]);
    const n = nextQuarter(t);
    expect(n.pending).toEqual([]);
    const [p] = logged(n, 'pending');
    expect(p.title).toBe('Flexicurity reform: delayed effect');
    expect(p.visibleDeltas).toEqual([{ key: 'pc', amount: -1, hidden: false }]);
    expect(p.briefing).toBe('PC −1');
  });

  it('are titled generically when no card from last quarter explains them, and split hidden from visible', () => {
    const s = craft({ extra: { pending: [{ key: 'gdp', amount: 2, hidden: false }, { key: 'trueAlignment', amount: 3, hidden: true }] } });
    const n = E.startQuarter(s);
    const [p] = logged(n, 'pending');
    expect(p.title).toBe('Delayed effects');
    expect(p.visibleDeltas).toEqual([{ key: 'gdp', amount: 2, hidden: false }]);
    expect(p.hiddenDeltas).toEqual([{ key: 'trueAlignment', amount: 3, hidden: true }]);
  });

  it('are not applied in Q1 (no income step)', () => {
    const s = { ...E.createInitialState(1), pending: [{ key: 'pc' as const, amount: -1, hidden: false }] };
    const n = E.startQuarter(s);
    expect(n.pc).toBe(6);
    expect(n.pending).toHaveLength(1);
  });
});

describe('concern bubbles', () => {
  it('give +1 PC each, at most 2 per quarter, logged per region', () => {
    let s = started({ pc: 0 });
    s = E.collectBubble(s, 'eu');
    expect(s.pc).toBe(1);
    s = E.collectBubble(s, 'cn');
    expect(s.pc).toBe(2);
    const third = E.collectBubble(s, 'us');
    expect(third.pc).toBe(2);
    expect(third).toEqual(s);
    expect(s.log.filter((e) => e.kind === 'bubble').map((e) => e.id)).toEqual(['bubble.eu', 'bubble.cn']);
    expect(s.log.find((e) => e.id === 'bubble.cn')!.title).toBe('Public concern in China');
  });

  it('reset every quarter', () => {
    let s = E.collectBubble(E.collectBubble(started({}), 'eu'), 'eu');
    expect(s.bubblesThisQuarter).toBe(2);
    s = nextQuarter(s);
    expect(s.bubblesThisQuarter).toBe(0);
    expect(E.collectBubble(s, 'us').pc).toBe(s.pc + 1);
  });

  it('do nothing at the tipping point or after the end', () => {
    const tipping = { ...started({}), phase: 'tipping' as const };
    expect(E.collectBubble(tipping, 'eu').pc).toBe(tipping.pc);
    const ended = { ...started({}), phase: 'ended' as const };
    expect(E.collectBubble(ended, 'eu').pc).toBe(ended.pc);
  });
});

describe('actors', () => {
  it('labs report progress (apparent alignment +1) and consolidate (concentration +1) every quarter', () => {
    const s = started({});
    expect(logged(s, 'labs_report')[0].visibleDeltas).toEqual([{ key: 'apparentAlignment', amount: 1, hidden: false }]);
    expect(logged(s, 'labs_consolidate')[0].visibleDeltas).toEqual([{ key: 'concentration', amount: 1, hidden: false }]);
    expect(moved({}, 'apparentAlignment')).toBe(1);
    expect(moved({}, 'concentration')).toBe(1);
  });

  it('log the labs even when the gauge is already at 100 (no delta)', () => {
    const s = started({ gauges: { apparentAlignment: 100, concentration: 100 } });
    expect(logged(s, 'labs_report')[0].visibleDeltas).toEqual([]);
    expect(logged(s, 'labs_consolidate')[0].visibleDeltas).toEqual([]);
  });

  it('the US tightens chip controls once tension is 60+ (not at 59): tension +3, a news line, a why line', () => {
    const quiet = started({ gauges: { tension: 59 } });
    expect(logged(quiet, 'us_chip_controls')).toEqual([]);
    expect(quiet.flags.exportControls).toBe(false);

    const s = started({ gauges: { tension: 60 } });
    expect(s.flags.exportControls).toBe(true);
    expect(logged(s, 'us_chip_controls')[0].visibleDeltas).toEqual([{ key: 'tension', amount: 3, hidden: false }]);
    expect(s.news.some((n) => n.id === 'actor.us_chip_controls' && n.quarter === s.quarter)).toBe(true);
    expect(E.situationReport(s).why).toContain('Tension reached 60, so the US tightened chip controls.');
    // 60 + 3 (chips) + 1 (drift)
    expect(s.gauges.tension).toBe(64);
  });

  it('chip controls fire only once per game', () => {
    let s = started({ gauges: { tension: 70 } });
    for (let i = 0; i < 3; i++) s = nextQuarter(s);
    expect(s.log.filter((e) => e.id === 'us_chip_controls')).toHaveLength(1);
  });

  it('chip controls never fire after an unprepared weight theft already set export controls', () => {
    const s = started({ gauges: { tension: 65 }, flags: { exportControls: true } });
    expect(logged(s, 'us_chip_controls')).toEqual([]);
  });

  it('chip controls read tension after income and pending effects', () => {
    const s = started({ gauges: { tension: 58 }, extra: { pending: [{ key: 'tension', amount: 2, hidden: false }] } });
    expect(logged(s, 'us_chip_controls')).toHaveLength(1);
  });
});

describe('drift', () => {
  it('capability +2 / +4 / +6 by takeoff speed', () => {
    expect(moved({ speed: 'slow' }, 'capability')).toBe(2);
    expect(moved({ speed: 'steady' }, 'capability')).toBe(4);
    expect(moved({ speed: 'fast' }, 'capability')).toBe(6);
  });

  it('capability +1 more under high tension (60+, after chip controls), with its own title', () => {
    // 59: no chip controls (they need 60), so the drift sees 59
    expect(moved({ speed: 'slow', gauges: { tension: 59 } }, 'capability')).toBe(2);
    expect(moved({ speed: 'slow', gauges: { tension: 60 } }, 'capability')).toBe(3);
    expect(moved({ speed: 'fast', gauges: { tension: 80 }, flags: { exportControls: true } }, 'capability')).toBe(7);
    expect(logged(started({ gauges: { tension: 60 } }), 'capability')[0].title).toBe('AI keeps improving, faster under high tension');
    expect(logged(started({}), 'capability')[0].title).toBe('AI keeps improving');
  });

  it('true alignment −1, or −2 under high tension; hidden', () => {
    expect(moved({ gauges: { tension: 59 } }, 'trueAlignment')).toBe(-1);
    expect(moved({ gauges: { tension: 60 } }, 'trueAlignment')).toBe(-2);
    const [d] = logged(started({}), 'safety_corners');
    expect(d.visibleDeltas).toEqual([]);
    expect(d.hiddenDeltas).toEqual([{ key: 'trueAlignment', amount: -1, hidden: true }]);
    expect(logged(started({ gauges: { tension: 60 } }), 'safety_corners')[0].title).toBe('Labs cut safety corners to win the race');
  });

  it('tension +1 per quarter, or −1 once the coalition has two partners (coalition diplomacy)', () => {
    expect(moved({ coalition: 0 }, 'tension')).toBe(1);
    expect(moved({ coalition: 1 }, 'tension')).toBe(1);
    expect(moved({ coalition: 2 }, 'tension')).toBe(-1);
    expect(moved({ coalition: 3 }, 'tension')).toBe(-1);
    const cools = logged(started({ coalition: 2 }), 'tension')[0];
    expect(cools.actor).toBe('eu');
    expect(cools.title).toBe('Coalition diplomacy cools tension');
    const heats = logged(started({ coalition: 1 }), 'tension')[0];
    expect(heats.actor).toBe('china');
    expect(heats.title).toBe('The race heats up');
  });

  it('the coalition-cools rule reads the coalition after upkeep (unpaid partners do not cool tension)', () => {
    expect(moved({ coalition: 2, pc: 1 }, 'tension')).toBe(1);
  });

  it('explains coalition diplomacy in the report the first quarter only', () => {
    const s = started({ coalition: 2 });
    const line = 'With two coalition partners, diplomacy now cools tension every quarter.';
    expect(E.situationReport(s).why).toContain(line);
    expect(E.situationReport(nextQuarter(s)).why).not.toContain(line);
  });

  it('human influence: economy −2 → −4 from capability 35, culture −1 → −2 from 35, state −1 → −2 from 50', () => {
    const at = (capability: number) => ({
      economy: moved({ gauges: { capability } }, 'eu.economy'),
      culture: moved({ gauges: { capability } }, 'eu.culture'),
      state: moved({ gauges: { capability } }, 'eu.state'),
    });
    expect(at(34)).toEqual({ economy: -2, culture: -1, state: -1 });
    expect(at(35)).toEqual({ economy: -4, culture: -2, state: -1 });
    expect(at(49)).toEqual({ economy: -4, culture: -2, state: -1 });
    expect(at(50)).toEqual({ economy: -4, culture: -2, state: -2 });
    const [d] = logged(started({}), 'eu_influence');
    expect(d.visibleDeltas).toEqual([]);
    expect(d.hiddenDeltas.every((x) => x.hidden)).toBe(true);
  });

  it('the oversight mandate halves economy and state losses, alternating rounding by quarter; culture is untouched', () => {
    const m = (quarter: number, capability: number) => ({
      economy: moved({ quarter, gauges: { capability }, flags: { oversightMandate: true } }, 'eu.economy'),
      culture: moved({ quarter, gauges: { capability }, flags: { oversightMandate: true } }, 'eu.culture'),
      state: moved({ quarter, gauges: { capability }, flags: { oversightMandate: true } }, 'eu.state'),
    });
    // low capability: economy −2 → −1, state −1 → 0 (even quarter) or −1 (odd quarter)
    expect(m(4, 20)).toEqual({ economy: -1, culture: -1, state: 0 });
    expect(m(5, 20)).toEqual({ economy: -1, culture: -1, state: -1 });
    // high capability: economy −4 → −2, state −2 → −1, culture −2
    expect(m(4, 60)).toEqual({ economy: -2, culture: -2, state: -1 });
    expect(m(5, 60)).toEqual({ economy: -2, culture: -2, state: -1 });
    // over two quarters the state loss averages exactly half
    expect(m(4, 20).state + m(5, 20).state).toBe(-1);
    expect(logged(started({ flags: { oversightMandate: true } }), 'eu_influence')[0].title).toMatch(/slowed by the oversight mandate/);
  });

  it('misuse +1 below capability 40, +2 from 40, +1 more with open models', () => {
    expect(moved({ gauges: { capability: 39 } }, 'misuse')).toBe(1);
    expect(moved({ gauges: { capability: 40 } }, 'misuse')).toBe(2);
    expect(moved({ gauges: { capability: 39 }, flags: { openModels: true } }, 'misuse')).toBe(2);
    expect(moved({ gauges: { capability: 40 }, flags: { openModels: true } }, 'misuse')).toBe(3);
    expect(logged(started({ gauges: { capability: 39 } }), 'misuse')[0].title).toBe('AI tools spread');
    expect(logged(started({ gauges: { capability: 40 } }), 'misuse')[0].title).toBe('Capable AI is easier to misuse');
    expect(logged(started({ flags: { openModels: true } }), 'misuse')[0].title).toBe('Open models spread, criminals included');
  });

  it('economy: gdp +1 (+2 from capability 50), approval −1 from 50 unless flexicurity, pressure +1 (+2 from 50)', () => {
    const at = (capability: number, flexicurity = false) => ({
      gdp: moved({ gauges: { capability }, flags: { flexicurity } }, 'gdp'),
      approval: moved({ gauges: { capability }, flags: { flexicurity } }, 'approval'),
      publicPressure: moved({ gauges: { capability }, flags: { flexicurity } }, 'publicPressure'),
    });
    expect(at(49)).toEqual({ gdp: 1, approval: 0, publicPressure: 1 });
    expect(at(50)).toEqual({ gdp: 2, approval: -1, publicPressure: 2 });
    expect(at(50, true)).toEqual({ gdp: 2, approval: 0, publicPressure: 2 });
    expect(at(30, true)).toEqual({ gdp: 1, approval: 0, publicPressure: 1 });
    const jobs = logged(started({ gauges: { capability: 50 } }), 'economy')[0];
    expect(jobs.title).toBe('AI adoption reshapes jobs');
    expect(jobs.actor).toBe('us_labs');
    expect(logged(started({}), 'economy')[0].title).toBe('AI adoption lifts GDP');
  });

  it('reads every threshold on the values before drift', () => {
    // capability 48 + 4 = 52 after drift, but the jobs rule saw 48
    const s = started({ gauges: { capability: 48 } });
    expect(s.gauges.capability).toBe(52);
    expect(s.gauges.approval).toBe(50);
    // capability 33 → 37: the eu thresholds saw 33
    expect(moved({ gauges: { capability: 33 } }, 'eu.economy')).toBe(-2);
  });

  it('skips a drift log entry when nothing actually moved (everything clamped)', () => {
    const s = started({ gauges: { capability: 100 } });
    expect(logged(s, 'capability')).toEqual([]);
    const z = started({ eu: { economy: 0, culture: 0, state: 0 } });
    expect(logged(z, 'eu_influence')).toEqual([]);
  });

  it('clamps every gauge to 0–100 and records only what was applied', () => {
    const s = started({ gauges: { capability: 99, gdp: 100, misuse: 100, publicPressure: 100, trueAlignment: 0 } });
    expect(s.gauges.capability).toBe(100);
    expect(logged(s, 'capability')[0].visibleDeltas).toEqual([{ key: 'capability', amount: 1, hidden: false }]);
    expect(s.gauges.gdp).toBe(100);
    expect(s.gauges.trueAlignment).toBe(0);
    expect(logged(s, 'safety_corners')).toEqual([]);
  });
});

describe('order inside startQuarter', () => {
  it('snapshots the start of the quarter before income, then income → actors → drift → event', () => {
    const s0 = craft({ coalition: 1, pc: 5, gauges: { misuse: 39 } });
    const s = E.startQuarter(s0);
    expect(s.quarterStart).toEqual({ gauges: s0.gauges, coalition: 1, pc: 5, budget: 20 });
    const kinds = s.log.filter((e) => e.quarter === s.quarter).map((e) => `${e.kind}:${e.id}`);
    expect(kinds).toEqual([
      'income:income',
      'income:upkeep',
      'actor:labs_report',
      'actor:labs_consolidate',
      'drift:capability',
      'drift:safety_corners',
      'drift:tension',
      'drift:eu_influence',
      'drift:misuse',
      'drift:economy',
      'event:ransomware',
    ]);
  });

  it('resets the bubble count, the decision and the pending event', () => {
    const s = E.startQuarter(craft({ extra: { bubblesThisQuarter: 2, decidedThisQuarter: true } }));
    expect(s.bubblesThisQuarter).toBe(0);
    expect(s.decidedThisQuarter).toBe(false);
  });

  it('does nothing outside the quarter phase or if the quarter already ran', () => {
    const s = started({});
    expect(E.startQuarter(s)).toEqual(s);
    const t = { ...craft({}), phase: 'tipping' as const };
    expect(E.startQuarter(t)).toEqual(t);
    const ended = { ...craft({}), phase: 'ended' as const };
    expect(E.startQuarter(ended)).toEqual(ended);
  });
});

describe('endQuarter', () => {
  it('advances the quarter and refuses while an event is pending', () => {
    const s = started({});
    const out = E.endQuarter(E.pass(s));
    expect(out.outcome).toBe('next_quarter');
    expect(out.state.quarter).toBe(s.quarter + 1);
    const ev = started({ gauges: { misuse: 45 } });
    expect(ev.pendingEvent).not.toBeNull();
    expect(() => E.endQuarter(ev)).toThrow(/Resolve the current event/);
  });

  it('goes to the tipping point at capability 80 (79 is not enough), logging the moment', () => {
    const s79 = { ...started({}), gauges: { ...started({}).gauges, capability: 79 } };
    expect(E.endQuarter(s79).outcome).toBe('next_quarter');
    const s80 = { ...s79, gauges: { ...s79.gauges, capability: 80 } };
    const { state, outcome } = E.endQuarter(s80);
    expect(outcome).toBe('tipping_point');
    expect(state.quarter).toBe(s80.quarter);
    const entry = state.log.at(-1)!;
    expect(entry.id).toBe('tipping_point');
    expect(entry.debrief).toBe(`In ${E.dateLabel(s80.quarter)}, AI became able to automate its own research.`);
    // asking again is harmless
    expect(E.endQuarter(state).outcome).toBe('tipping_point');
  });

  it('prefers the tipping point to the end of the game in Q16', () => {
    const s = { ...started({ quarter: 16 }), gauges: { ...started({ quarter: 16 }).gauges, capability: 85 } };
    expect(E.endQuarter(s).outcome).toBe('tipping_point');
  });

  it('ends the game after Q16 (not Q15) without a tipping point, resolving the ending', () => {
    expect(E.endQuarter(E.pass(started({ quarter: 15, speed: 'slow' }))).outcome).toBe('next_quarter');
    const { state, outcome } = E.endQuarter(E.pass(started({ quarter: 16, speed: 'slow' })));
    expect(outcome).toBe('game_over');
    expect(state.phase).toBe('ended');
    expect(state.quarter).toBe(16);
    expect(state.ending).toBe('bright_winter');
    expect(state.log.at(-1)!.id).toBe('no_tipping_point');
    expect(E.endQuarter(state).outcome).toBe('game_over');
  });
});

describe('error bars', () => {
  const bars = (s: GameState) => Object.fromEntries(E.gaugeViews(s).map((g) => [g.key, g.errorBar]));

  it('capability ±10 (±5 with AI Office); apparent alignment ±15 (±5), doubled by opaque reasoning; none elsewhere', () => {
    expect(bars(craft({}))).toEqual({
      capability: 10,
      concentration: 0,
      apparentAlignment: 15,
      trueAlignment: 0,
      verification: 0,
      tension: 0,
      misuse: 0,
      publicPressure: 0,
      coalition: 0,
      gdp: 0,
      approval: 0,
    });
    expect(bars(craft({ flags: { aiOffice: true } }))).toMatchObject({ capability: 5, apparentAlignment: 5 });
    expect(bars(craft({ flags: { alignmentErrorDoubled: true } }))).toMatchObject({ capability: 10, apparentAlignment: 30 });
    expect(bars(craft({ flags: { alignmentErrorDoubled: true, aiOffice: true } }))).toMatchObject({ capability: 5, apparentAlignment: 10 });
  });
});

describe('gauge views', () => {
  it('list every indicator with its help text, true alignment hidden, delta since the start of the quarter', () => {
    const s = started({ coalition: 2, pc: 10 });
    const views = E.gaugeViews(s);
    expect(views.map((v) => v.key)).toEqual([
      'capability',
      'concentration',
      'apparentAlignment',
      'trueAlignment',
      'verification',
      'tension',
      'misuse',
      'publicPressure',
      'coalition',
      'gdp',
      'approval',
    ]);
    expect(views.filter((v) => !v.visible).map((v) => v.key)).toEqual(['trueAlignment']);
    for (const v of views) {
      expect(v.risesWhen.length).toBeGreaterThan(3);
      expect(v.fallsWhen.length).toBeGreaterThan(3);
    }
    const byKey = Object.fromEntries(views.map((v) => [v.key, v]));
    expect(byKey.capability.delta).toBe(4);
    expect(byKey.tension.delta).toBe(-1);
    expect(byKey.coalition.value).toBe(2);
    expect(byKey.coalition.delta).toBe(0);
  });
});
