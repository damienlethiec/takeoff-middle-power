// Realism: every piece of content says where it comes from (docs/SCENARIO_BASIS.md).
// Game devices (thresholds, costs) are not content and need no basis.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { ENDINGS } from '../src/data/endings';
import { LEA_END, LEA_END_BASIS, LEA_R1, LEA_R4, LEA_R8 } from '../src/data/lea';
import { LEAKS } from '../src/data/leaks';
import { VOICES, WORLD_HEADLINES } from '../src/data/mapcontent';
import { MILESTONES } from '../src/data/milestones';
import { EVENTS, THREATS } from '../src/data/threats';
import type { Basis, EndingId } from '../src/engine/types';

const KINDS = ['ai2027', 'cfg', 'real'];
function check(what: string, b: Basis | undefined) {
  expect(b, `${what} has no basis`).toBeTruthy();
  expect(KINDS, `${what}: unknown basis kind`).toContain(b!.kind);
  expect(b!.ref.trim().length, `${what}: empty basis ref`).toBeGreaterThan(8);
  if (b!.kind === 'ai2027') expect(b!.ref).toMatch(/^AI 2027, /);
  if (b!.kind === 'cfg') expect(b!.ref).toMatch(/^CFG, /);
}

describe('every piece of content has a basis', () => {
  it('cards', () => CARDS.forEach((c) => check(`card ${c.id}`, c.basis)));
  it('milestones', () => MILESTONES.forEach((m) => check(`milestone ${m.id}`, m.basis)));
  it('threats', () => THREATS.forEach((t) => check(`threat ${t.id}`, t.basis)));
  it('events (Breaking news)', () => Object.values(EVENTS).forEach((e) => check(`event ${e.id}`, e.basis)));
  it('headlines', () => WORLD_HEADLINES.forEach((h) => check(`headline ${h.id}`, h.basis)));
  it('public voices', () => VOICES.forEach((v) => check(`voice ${v.id}`, v.basis)));
  it('leaks', () => LEAKS.forEach((l) => check(`leak ${l.id}`, l.basis)));
  it('Léa letters', () => {
    [...LEA_R1, ...LEA_R4.hard, ...LEA_R4.calm, ...LEA_R8.retrained, ...LEA_R8.holding, ...LEA_R8.breaking].forEach((l) => check(`letter ${l.id}`, l.basis));
    (Object.keys(LEA_END) as EndingId[]).forEach((id) => check(`end letter ${id}`, LEA_END_BASIS(id)));
  });
  it('endings', () => ENDINGS.forEach((e) => check(`ending ${e.id}`, e.basis)));

  it('the test itself fails on content without a basis', () => {
    expect(() => check('broken', undefined)).toThrow();
    expect(() => check('broken', { kind: 'ai2027', ref: '' })).toThrow();
  });
});

describe('scenario structure', () => {
  it('milestones follow AI 2027’s order, with rising thresholds', () => {
    const order = ['coding_automation', 'china_wakes_up', 'ai_takes_jobs', 'agent2_internal', 'weight_theft', 'superhuman_coder', 'alignment_inconclusive', 'national_security', 'self_improving', 'cheap_remote_worker', 'geopolitics', 'tipping_point'];
    expect(MILESTONES.map((m) => m.id)).toEqual(order);
    const thresholds = MILESTONES.filter((m) => !m.via).map((m) => m.at);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
    expect(MILESTONES.at(-1)!.at).toBe(80);
  });

  it('every milestone basis names its AI 2027 section', () => {
    for (const m of MILESTONES) expect(m.basis.kind).toBe('ai2027');
  });

  it('the ten endings are CFG’s', () => {
    expect(ENDINGS.map((e) => e.cfgName).sort()).toEqual(
      ['A bright winter', 'Decentralised mayhem', 'Hot war', 'Licensed utopia', 'Loss of control', 'Multipolar world', 'Silicon blackmail', 'The agent economy', 'The cognitive revolution', 'Unstable pause'].sort(),
    );
  });
});
