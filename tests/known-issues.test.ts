// Behaviour that looks wrong, recorded without fixing it (the tests describe current behaviour).
// Each `it.fails` states the expected behaviour and currently fails; when the issue is fixed,
// vitest reports it as "passing unexpectedly": turn it into a normal `it` then.

import { describe, expect, it } from 'vitest';
import { E, craft } from './helpers';
import { CARDS } from '../src/data/cards';
import { EVENTS } from '../src/data/events';
import { GAUGES } from '../src/data/gauges';
import type { EffectSpec } from '../src/data/schema';

describe('known issues', () => {
  // startQuarter detects "already ran" by looking for a drift entry in the log. When every drift is clamped
  // to zero, no drift entry is written and a second call runs income, upkeep, actors and events again.
  // Not reachable in normal play (capability is below 80 at the start of every quarter, so it always drifts),
  // but the guard depends on a side effect.
  it.fails('startQuarter is idempotent even when nothing drifts (all gauges clamped)', () => {
    const s0 = craft({
      gauges: { capability: 100, trueAlignment: 0, tension: 100, misuse: 100, gdp: 100, approval: 0, publicPressure: 100, apparentAlignment: 100, concentration: 100 },
      eu: { economy: 0, culture: 0, state: 0 },
      flags: { exportControls: true },
    });
    const once = E.startQuarter(s0);
    expect(E.startQuarter(once)).toEqual(once);
  });

  // The gauge popovers (src/data/gauges.ts) promise ways to move a gauge that no rule implements:
  // public pressure "falls when: popular social measures" and approval "rises when: stable jobs".
  // No card, event, choice or drift ever lowers public pressure or raises approval.
  it.fails('every gauge the help says can fall (or rise) has a rule that moves it that way', () => {
    const specs: EffectSpec[] = [];
    for (const c of CARDS) specs.push(...c.effects, ...(c.options ?? []).flatMap((o) => o.effects));
    for (const e of EVENTS) for (const v of [e.prepared, e.unprepared]) specs.push(...v.effects, ...v.options.flatMap((o) => o.effects));
    // per-quarter drift and actor moves (docs/DEVELOPER_NOTES.md, quarter loop), plus coalition upkeep
    const drift: Record<string, [boolean, boolean]> = {
      capability: [true, false],
      concentration: [true, false],
      apparentAlignment: [true, false],
      tension: [true, true],
      misuse: [true, false],
      publicPressure: [true, false],
      gdp: [true, false],
      approval: [false, true],
      coalition: [false, true],
    };
    const missing: string[] = [];
    for (const g of GAUGES.filter((x) => x.visible)) {
      const [driftUp, driftDown] = drift[g.key] ?? [false, false];
      const up = driftUp || specs.some((s) => s.key === g.key && s.amount > 0);
      const down = driftDown || specs.some((s) => s.key === g.key && s.amount < 0);
      if (!/^never/i.test(g.fallsWhen) && !down) missing.push(`${g.key} never falls but the help says: ${g.fallsWhen}`);
      if (!/^never/i.test(g.risesWhen) && !up) missing.push(`${g.key} never rises but the help says: ${g.risesWhen}`);
    }
    expect(missing).toEqual([]);
  });
});
