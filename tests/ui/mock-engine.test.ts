// The stand-in engine used while building the UI (src/ui/mockEngine.ts, switched on in src/engine-source.ts).
// A smoke test: it implements the same API as the real engine and plays a game to its debrief.

import { describe, expect, it } from 'vitest';
import { engine as mock } from '../../src/ui/mockEngine';
import { engine as real } from '../../src/engine/index';
import type { GameState } from '../../src/engine/types';

describe('the mock engine', () => {
  it('implements every function of the real engine', () => {
    expect(Object.keys(mock).sort()).toEqual(Object.keys(real).sort());
  });

  it('plays seeded games to a debrief, without mutating its input', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let s: GameState = mock.createInitialState(seed);
      for (let i = 0; i < 20 && s.phase !== 'ended'; i++) {
        const frozen = JSON.stringify(s);
        const next = mock.startQuarter(s);
        expect(JSON.stringify(s)).toBe(frozen);
        s = mock.collectBubble(next, 'eu');
        if (s.pendingEvent) s = mock.resolveEvent(s, s.pendingEvent.options[0]?.id);
        expect(mock.situationReport(s).dateLabel).toBe(mock.dateLabel(s.quarter));
        expect(mock.gaugeViews(s).length).toBeGreaterThan(5);
        const card = mock.cardViews(s).find((c) => c.available && c.affordable);
        if (card) {
          mock.previewCard(s, card.id, card.options[0]?.id);
          s = mock.playCard(s, card.id, card.options[0]?.id).state;
        } else s = mock.pass(s);
        const out = mock.endQuarter(s);
        s = out.state;
        if (out.outcome === 'tipping_point') s = mock.runTippingPoint(s);
      }
      expect(s.phase).toBe('ended');
      const d = mock.debrief(s);
      expect(d.ending.title.length).toBeGreaterThan(0);
      expect(JSON.stringify(d)).not.toMatch(/undefined|NaN/);
      expect(mock.forecastLine(s).length).toBeGreaterThan(10);
      expect(mock.goalLine()).toBe(real.goalLine());
    }
  });
});
