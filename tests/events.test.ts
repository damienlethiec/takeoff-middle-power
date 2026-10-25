// The five events: triggers and "prepared" conditions at their boundaries, both variants, choices, ordering.

import { describe, expect, it } from 'vitest';
import { E, craft, deltaMap, nextQuarter, started, type CraftOptions } from './helpers';
import { EVENTS, EVENT_BY_ID } from '../src/data/events';
import type { EventId, GameState } from '../src/engine/types';

const fired = (over: CraftOptions) => started(over).pendingEvent?.id ?? null;

/** States (before startQuarter) that fire each event, unprepared and prepared. Slow takeoff: capability +2, tension +1, misuse +1 (<40). */
const SETUPS: Record<EventId, { unprepared: CraftOptions; prepared: CraftOptions }> = {
  warning_shot: {
    unprepared: { speed: 'slow', gauges: { capability: 63, trueAlignment: 50 } },
    prepared: { speed: 'slow', gauges: { capability: 63, trueAlignment: 50, verification: 30 }, coalition: 1 },
  },
  weight_theft: {
    unprepared: { speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 } },
    prepared: { speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 }, flags: { weightSecurity: true } },
  },
  opaque_reasoning: {
    unprepared: { speed: 'slow', gauges: { capability: 68, trueAlignment: 60 } },
    prepared: { speed: 'slow', gauges: { capability: 68, trueAlignment: 60 }, flags: { aiOffice: true } },
  },
  silicon_blackmail: {
    unprepared: { gauges: { concentration: 59, gdp: 60 }, flags: { oversightMandate: true } },
    prepared: { gauges: { concentration: 59 }, flags: { oversightMandate: true, openModels: true } },
  },
  ransomware: {
    unprepared: { gauges: { misuse: 39, gdp: 60, approval: 60 } },
    prepared: { gauges: { misuse: 39 }, flags: { cyberDefence: true } },
  },
};

describe('triggers, at their boundaries (values after this quarter’s drift)', () => {
  it('warning shot: true alignment below 50 and capability 65+', () => {
    expect(fired({ speed: 'slow', gauges: { capability: 63, trueAlignment: 50 } })).toBe('warning_shot'); // → 65, 49
    expect(fired({ speed: 'slow', gauges: { capability: 62, trueAlignment: 50 } })).toBeNull(); // → 64
    expect(fired({ speed: 'slow', gauges: { capability: 63, trueAlignment: 51 } })).toBeNull(); // → 50
  });

  it('weight theft: tension 50+ and capability 40+', () => {
    expect(fired({ speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 } })).toBe('weight_theft');
    expect(fired({ speed: 'slow', gauges: { capability: 38, tension: 48, trueAlignment: 60 } })).toBeNull();
    expect(fired({ speed: 'slow', gauges: { capability: 37, tension: 49, trueAlignment: 60 } })).toBeNull();
  });

  it('opaque reasoning: capability 70+', () => {
    expect(fired({ speed: 'slow', gauges: { capability: 68, trueAlignment: 60 } })).toBe('opaque_reasoning');
    expect(fired({ speed: 'slow', gauges: { capability: 67, trueAlignment: 60 } })).toBeNull();
  });

  it('silicon blackmail: concentration 60+ with the oversight mandate', () => {
    expect(fired({ gauges: { concentration: 59 }, flags: { oversightMandate: true } })).toBe('silicon_blackmail'); // → 60
    expect(fired({ gauges: { concentration: 58 }, flags: { oversightMandate: true } })).toBeNull();
    expect(fired({ gauges: { concentration: 90 } })).toBeNull();
  });

  it('ransomware: misuse 40+', () => {
    expect(fired({ gauges: { misuse: 39 } })).toBe('ransomware');
    expect(fired({ gauges: { misuse: 38 } })).toBeNull();
  });

  it('every setup fires its event, in both variants', () => {
    for (const ev of EVENTS) {
      for (const variant of ['unprepared', 'prepared'] as const) {
        const s = started(SETUPS[ev.id][variant]);
        expect(s.pendingEvent?.id, `${ev.id} ${variant}`).toBe(ev.id);
        expect(s.pendingEvent?.prepared, `${ev.id} ${variant}`).toBe(variant === 'prepared');
      }
    }
  });
});

describe('prepared conditions, at their boundaries', () => {
  it('warning shot: coalition 1+ and verification 30+, read when it fires', () => {
    const base = SETUPS.warning_shot.prepared;
    expect(started(base).pendingEvent!.prepared).toBe(true);
    expect(started({ ...base, gauges: { ...base.gauges, verification: 29 } }).pendingEvent!.prepared).toBe(false);
    expect(started({ ...base, coalition: 0, gauges: { ...base.gauges, verification: 80 } }).pendingEvent!.prepared).toBe(false);
    // a partner lost to unpaid upkeep this quarter means unprepared
    expect(started({ ...base, pc: 0 }).pendingEvent!.prepared).toBe(false);
  });

  it('the other events: one flag each', () => {
    const flag: Record<Exclude<EventId, 'warning_shot'>, keyof GameState['flags']> = {
      weight_theft: 'weightSecurity',
      opaque_reasoning: 'aiOffice',
      silicon_blackmail: 'openModels',
      ransomware: 'cyberDefence',
    };
    for (const [id, f] of Object.entries(flag)) {
      const u = SETUPS[id as EventId].unprepared;
      expect(started(u).pendingEvent!.prepared, id).toBe(false);
      expect(started({ ...u, flags: { ...u.flags, [f]: true } }).pendingEvent!.prepared, id).toBe(true);
    }
  });
});

describe('effects of each variant', () => {
  const effects = (id: EventId, variant: 'prepared' | 'unprepared') => {
    const s = started(SETUPS[id][variant]);
    const entry = s.log.find((e) => e.kind === 'event' && e.id === id)!;
    return { s, visible: deltaMap(s.pendingEvent!.appliedDeltas), hidden: deltaMap(entry.hiddenDeltas), entry };
  };

  it('warning shot', () => {
    const p = effects('warning_shot', 'prepared');
    expect(p.visible).toEqual({ publicPressure: 15, tension: -10, verification: 10, apparentAlignment: -10 });
    expect(p.s.flags.warningShotPrepared).toBe(true);
    const u = effects('warning_shot', 'unprepared');
    expect(u.visible).toEqual({ publicPressure: 10 });
    expect(u.s.flags.warningShotPrepared).toBe(false);
  });

  it('weight theft', () => {
    expect(effects('weight_theft', 'prepared').visible).toEqual({ tension: 5 });
    expect(effects('weight_theft', 'prepared').s.flags.exportControls).toBe(false);
    const u = effects('weight_theft', 'unprepared');
    expect(u.visible).toEqual({ capability: 5, tension: 20, publicPressure: 5 });
    expect(u.hidden).toEqual({ trueAlignment: -3 });
    expect(u.s.flags.exportControls).toBe(true);
  });

  it('opaque reasoning', () => {
    const p = effects('opaque_reasoning', 'prepared');
    expect(p.visible).toEqual({ apparentAlignment: -5 });
    expect(p.s.flags.alignmentErrorDoubled).toBe(false);
    const u = effects('opaque_reasoning', 'unprepared');
    expect(u.visible).toEqual({});
    expect(u.s.flags.alignmentErrorDoubled).toBe(true);
  });

  it('silicon blackmail', () => {
    expect(effects('silicon_blackmail', 'prepared').visible).toEqual({});
    expect(effects('silicon_blackmail', 'unprepared').visible).toEqual({});
  });

  it('ransomware', () => {
    expect(effects('ransomware', 'prepared').visible).toEqual({ gdp: -3 });
    expect(effects('ransomware', 'unprepared').visible).toEqual({ gdp: -10, approval: -10, publicPressure: 10 });
  });

  it('every variant: the pending event carries the scene, why it matters, an already-real fact and its moment; a news line and a log entry', () => {
    for (const ev of EVENTS) {
      for (const variant of ['prepared', 'unprepared'] as const) {
        const { s, entry } = effects(ev.id, variant);
        const v = ev[variant];
        const pe = s.pendingEvent!;
        expect(pe).toMatchObject({ id: ev.id, actor: ev.actor, region: ev.region, title: ev.title, scene: v.scene, whyItMatters: ev.whyItMatters, at: ev.at });
        expect(pe.alreadyReal).toEqual(ev.alreadyReal);
        expect(pe.options.map((o) => o.id)).toEqual(v.options.map((o) => o.id));
        expect(s.firedEvents[ev.id]).toEqual({ quarter: s.quarter, prepared: variant === 'prepared' });
        const news = s.news.find((n) => n.id === `event.${ev.id}`)!;
        expect(news).toEqual({ id: `event.${ev.id}`, quarter: s.quarter, actor: ev.actor, region: ev.region, text: v.news, at: ev.at });
        expect(entry.briefing).toBe(`${ev.title}: ${v.short} (${variant === 'prepared' ? 'prepared' : 'unprepared'}).`);
        expect(entry.debrief).toBe(`${v.debrief} You were ${variant === 'prepared' ? 'prepared' : 'not prepared'}: ${v.cause}.`);
        expect(entry.title.charAt(0)).toBe(entry.title.charAt(0).toUpperCase());
        expect(E.situationReport(s).why).toContain(`${v.short.charAt(0).toUpperCase()}${v.short.slice(1)}: ${v.cause}.`);
        // the event's visible effects explain the changes they caused
        for (const d of pe.appliedDeltas) {
          const change = E.situationReport(s).changes.find((c) => c.key === d.key);
          if (change && Math.abs(d.amount) >= Math.abs(change.delta) / 2) expect(change.cause.toLowerCase()).toContain(v.short.toLowerCase().slice(0, 10));
        }
      }
    }
  });
});

describe('choices', () => {
  it('silicon blackmail, unprepared: give in or hold firm, with visible previews', () => {
    const s = started(SETUPS.silicon_blackmail.unprepared);
    const pe = s.pendingEvent!;
    expect(pe.options.map((o) => [o.id, deltaMap(o.preview)])).toEqual([
      ['give_in', { concentration: 10 }],
      ['hold_firm', { gdp: -15 }],
    ]);
    const give = E.resolveEvent(s, 'give_in');
    expect(give.gauges.concentration - s.gauges.concentration).toBe(10);
    expect(give.firedEvents.silicon_blackmail!.choice).toBe('give_in');
    const entry = give.log.at(-1)!;
    expect(entry.id).toBe('silicon_blackmail:give_in');
    expect(entry.title).toBe('Silicon blackmail: give in');
    expect(entry.actor).toBe('eu');
    const hold = E.resolveEvent(s, 'hold_firm');
    expect(hold.gauges.gdp - s.gauges.gdp).toBe(-15);
    expect(hold.firedEvents.silicon_blackmail!.choice).toBe('hold_firm');
  });

  it('ransomware, unprepared: emergency ban or defence spending', () => {
    const s = started({ ...SETUPS.ransomware.unprepared, budget: 5 });
    expect(s.pendingEvent!.options.map((o) => [o.id, deltaMap(o.preview)])).toEqual([
      ['emergency_ban', { misuse: -20, concentration: 10 }],
      ['defence_spending', { budget: -2, misuse: -10 }],
    ]);
    const ban = E.resolveEvent(s, 'emergency_ban');
    expect([ban.gauges.misuse - s.gauges.misuse, ban.gauges.concentration - s.gauges.concentration]).toEqual([-20, 10]);
    const def = E.resolveEvent(s, 'defence_spending');
    expect([def.budget - s.budget, def.gauges.misuse - s.gauges.misuse]).toEqual([-2, -10]);
    // defence spending with too little Budget is clamped at 0, not refused
    const broke = E.resolveEvent({ ...s, budget: 1 }, 'defence_spending');
    expect(broke.budget).toBe(0);
    expect(broke.log.at(-1)!.visibleDeltas).toContainEqual({ key: 'budget', amount: -1, hidden: false });
  });

  it('a choice is required when there are options, and must be one of them', () => {
    const s = started(SETUPS.ransomware.unprepared);
    expect(() => E.resolveEvent(s)).toThrow(/needs a choice: emergency_ban or defence_spending/);
    expect(() => E.resolveEvent(s, 'nope')).toThrow(/needs a choice/);
  });

  it('events without options resolve with no choice and no extra log entry; resolving nothing is a no-op', () => {
    const s = started(SETUPS.warning_shot.unprepared);
    const r = E.resolveEvent(s, 'whatever');
    expect(r.pendingEvent).toBeNull();
    expect(r.log).toHaveLength(s.log.length);
    expect(r.firedEvents.warning_shot!.choice).toBeUndefined();
    expect(E.resolveEvent(r)).toEqual(r);
  });

  it('the choice appears in the situation report', () => {
    const s = E.resolveEvent(started(SETUPS.silicon_blackmail.unprepared), 'hold_firm');
    expect(E.situationReport(s).why).toContain('Silicon blackmail: hold firm.');
  });

  it('prepared variants never offer a choice', () => {
    for (const ev of EVENTS) expect(ev.prepared.options).toEqual([]);
    expect(EVENTS.filter((e) => e.unprepared.options.length).map((e) => e.id)).toEqual(['silicon_blackmail', 'ransomware']);
  });
});

describe('ordering', () => {
  it('fires at most one event per quarter, the first eligible in list order, each only once', () => {
    // everything is due at once
    const all: CraftOptions = {
      speed: 'slow',
      gauges: { capability: 70, trueAlignment: 40, tension: 55, misuse: 50, concentration: 70 },
      flags: { oversightMandate: true },
    };
    let s = started(all);
    const order: EventId[] = [];
    for (let i = 0; i < 7; i++) {
      if (s.pendingEvent) order.push(s.pendingEvent.id);
      expect(s.log.filter((e) => e.kind === 'event' && e.quarter === s.quarter && !e.id.includes(':')).length).toBeLessThanOrEqual(1);
      s = E.resolveEvent(s, s.pendingEvent?.options[0]?.id);
      // hold capability under the tipping point
      s = E.startQuarter(E.endQuarter(E.pass({ ...s, gauges: { ...s.gauges, capability: 70 } })).state);
    }
    expect(order).toEqual(['warning_shot', 'weight_theft', 'opaque_reasoning', 'silicon_blackmail', 'ransomware']);
    expect(Object.keys(s.firedEvents).sort()).toEqual(EVENTS.map((e) => e.id).sort());
  });

  it('an event never fires again, even if its trigger still holds', () => {
    let s = started(SETUPS.ransomware.unprepared);
    s = E.resolveEvent(s, 'defence_spending');
    for (let i = 0; i < 4; i++) {
      s = nextQuarter({ ...s, gauges: { ...s.gauges, misuse: 80 } });
      expect(s.pendingEvent).toBeNull();
    }
    expect(s.log.filter((e) => e.id === 'ransomware')).toHaveLength(1);
  });

  it('a later event waits for a quarter when an earlier one fires', () => {
    // ransomware and weight theft both due: theft first, ransomware next quarter
    const s = started({ speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60, misuse: 45 } });
    expect(s.pendingEvent!.id).toBe('weight_theft');
    const n = nextQuarter(s);
    expect(n.pendingEvent!.id).toBe('ransomware');
  });

  it('the event table keeps its documented order and moments', () => {
    expect(EVENTS.map((e) => [e.id, e.actor, e.at])).toEqual([
      ['warning_shot', 'ai_systems', 0.65],
      ['weight_theft', 'china', 0.45],
      ['opaque_reasoning', 'ai_systems', 0.55],
      ['silicon_blackmail', 'us_labs', 0.5],
      ['ransomware', 'open_source', 0.4],
    ]);
    for (const e of EVENTS) expect(EVENT_BY_ID[e.id]).toBe(e);
  });
});

describe('the warning shot shapes the tipping point', () => {
  it('prepared: +15 weight on the verified slowdown; fired with true alignment below 40: +10 on shut it all down', () => {
    const base = craft({});
    const prep = { ...base, flags: { ...base.flags, warningShotPrepared: true } };
    const w = (s: GameState) => {
      const o = E.planOdds(s);
      return o.verified_slowdown / o.race;
    };
    expect(w(prep)).toBeGreaterThan(w(base));
    const unsafe = (trueAlignment: number) => ({ ...base, gauges: { ...base.gauges, trueAlignment }, firedEvents: { warning_shot: { quarter: 3, prepared: false } } });
    expect(E.planOdds(unsafe(39)).shut_down).toBeGreaterThan(E.planOdds(unsafe(40)).shut_down);
  });
});
