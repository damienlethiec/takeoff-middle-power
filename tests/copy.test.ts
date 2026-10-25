// v2 copy (content workstream): shape, ids shared with the engine, and house rules on player text.
import { describe, expect, it } from 'vitest';
import { ACTS, ADVISOR, CAUSES, CONCERNS, INDICATOR_INTROS, INTRO, REAL_COSTS, RISKS, TIPS, UNLOCKS } from '../src/data/copy';
import { EVENTS } from '../src/data/events';
import { SOURCES } from '../src/data/sources';
import type { Source } from '../src/engine/types';

const words = (s: string) => s.trim().split(/\s+/).length;
const httpsSource = (s: Source) => {
  expect(s.label.length).toBeGreaterThan(2);
  expect(s.url).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/);
};

describe('v2 copy', () => {
  it('intro: exactly two screens, each with a sourced real fact, no jargon before its tip', () => {
    expect(INTRO).toHaveLength(2);
    for (const s of INTRO) {
      expect(s.paragraphs.length).toBeGreaterThan(0);
      expect(s.fact).toBeDefined();
      httpsSource(s.fact!.source);
      expect(s.paragraphs.join(' ')).not.toMatch(/alignment/i);
    }
  });

  it('acts: three, in order, each with a story beat', () => {
    expect(ACTS.map((a) => a.act)).toEqual([1, 2, 3]);
    for (const a of ACTS) expect(words(a.beat)).toBeGreaterThan(15);
  });

  it('tips: one per shared id, one screen each (at most 60 words)', () => {
    const ids = ['tip_clock', 'tip_decision', 'tip_hidden', 'tip_trajectory', 'tip_risks', 'tip_coalition', 'tip_pressure', 'tip_misuse', 'tip_context', 'tip_human_influence', 'tip_tipping'];
    expect(TIPS.map((t) => t.id).sort()).toEqual([...ids].sort());
    for (const t of TIPS) {
      expect(t.title.length, t.id).toBeGreaterThan(0);
      expect(words(t.text), t.id).toBeLessThanOrEqual(60);
      if (t.fact) httpsSource(t.fact.source);
    }
  });

  it('concerns: at least 24, every theme, mostly European, unique ids, one line each', () => {
    expect(CONCERNS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(CONCERNS.map((c) => c.id)).size).toBe(CONCERNS.length);
    expect(new Set(CONCERNS.map((c) => c.theme))).toEqual(new Set(['jobs', 'safety', 'misuse', 'power', 'war', 'general']));
    const eu = CONCERNS.filter((c) => c.region === 'eu').length;
    expect(eu).toBeGreaterThan(CONCERNS.length / 2);
    expect(CONCERNS.some((c) => c.region === 'us')).toBe(true);
    expect(CONCERNS.some((c) => c.region === 'cn')).toBe(true);
    for (const c of CONCERNS) {
      expect(words(c.text), c.id).toBeLessThanOrEqual(20);
      expect(c.text, c.id).not.toMatch(/\d|%/); // illustrative worries, never statistics
    }
  });

  it('risks: one per event; the warning shot stays uncertain', () => {
    expect(RISKS.map((r) => r.id).sort()).toEqual(EVENTS.map((e) => e.id).sort());
    for (const r of RISKS) {
      for (const line of Object.values(r.stages)) expect(words(line), r.id).toBeLessThanOrEqual(20);
      expect(r.preparedBy.length).toBeGreaterThan(0);
    }
    const ws = RISKS.find((r) => r.id === 'warning_shot')!;
    for (const stage of [ws.stages.watch, ws.stages.rising, ws.stages.imminent]) {
      expect(stage).toMatch(/^Possible/);
      expect(stage).not.toMatch(/certain|will happen/i);
    }
  });

  it('unlock reasons and indicator intros cover the shared ids', () => {
    expect(UNLOCKS.map((u) => u.card).sort()).toEqual(
      ['coalition', 'weight_security', 'flexicurity', 'asml', 'open_models', 'cyber_defence', 'measure', 'oversight_mandate', 'emergency_summit', 'joint_attribution'].sort(),
    );
    expect(INDICATOR_INTROS.map((i) => i.key).sort()).toEqual(['approval', 'coalition', 'concentration', 'gdp', 'misuse', 'publicPressure'].sort());
  });

  it('real costs: sourced, dated figures, at most one per card', () => {
    expect(new Set(REAL_COSTS.map((r) => r.card)).size).toBe(REAL_COSTS.length);
    for (const r of REAL_COSTS) {
      httpsSource(r.source);
      expect(r.text, r.card).toMatch(/\d/);
      expect(r.text, r.card).toMatch(/20\d\d/);
    }
  });

  it('advisor templates contain no numbers; causes are short', () => {
    for (const a of ADVISOR) expect(a.text, a.id).not.toMatch(/\d/);
    for (const c of CAUSES) expect(words(c.text)).toBeLessThanOrEqual(8);
  });

  it('every source has an https URL', () => {
    for (const s of Object.values(SOURCES)) httpsSource(s);
  });
});
