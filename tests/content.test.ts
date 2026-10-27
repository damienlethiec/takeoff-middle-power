// Player text: short and plain, real facts sourced, fiction never presented as real.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { BUILT_ON, HELP, INTRO, TIPS } from '../src/data/copy';
import { ENDINGS } from '../src/data/endings';
import { ALL_LETTERS, EPILOGUES, EPILOGUES_GAVE_IN, SIGNATURE } from '../src/data/letters';
import { FRIEND_IDS } from '../src/data/friends';
import { LEAK_REDACTED_ADVICE, LEAKS } from '../src/data/leaks';
import { VOICES, WORLD_HEADLINES } from '../src/data/mapcontent';
import { SOURCES } from '../src/data/sources';
import { EVENTS, THREATS } from '../src/data/threats';
import type { Fact } from '../src/engine/types';

const words = (s: string) => s.trim().split(/\s+/).length;
const BAD = /undefined|NaN|\[object Object\]|TODO/;

describe('card texts', () => {
  it('card faces are 25 words or fewer, opened cards 60 or fewer', () => {
    for (const c of CARDS) {
      expect(words(c.text), `${c.id} text`).toBeLessThanOrEqual(25);
      expect(words(c.proposal), `${c.id} proposal`).toBeLessThanOrEqual(60);
    }
  });
  it('a compact card says its purpose in 12 words or fewer, and shows at least one effect', () => {
    for (const c of CARDS) {
      expect(words(c.short), `${c.id} short`).toBeLessThanOrEqual(12);
      expect(c.face.length + (c.options?.[0]?.face.length ?? 0), `${c.id} face`).toBeGreaterThan(0);
      for (const f of [...c.face, ...(c.options ?? []).flatMap((o) => o.face)]) if (f.kind === 'move') expect(Math.abs(f.size), `${c.id} arrows`).toBeGreaterThanOrEqual(1);
    }
  });
  it('names are unique and chips are short', () => {
    expect(new Set(CARDS.map((c) => c.name)).size).toBe(CARDS.length);
    for (const c of CARDS) for (const chip of [...c.ups, ...c.downs]) expect(chip.text.length, chip.text).toBeLessThanOrEqual(52);
  });
});

describe('real facts', () => {
  const facts: [string, Fact][] = [
    ...INTRO.flatMap((i) => (i.fact ? [[`intro ${i.title}`, i.fact] as [string, Fact]] : [])),
    ...CARDS.flatMap((c) => [c.example, c.costLine].filter((f): f is Fact => !!f).map((f) => [`card ${c.id}`, f] as [string, Fact])),
    ...Object.values(EVENTS).flatMap((e) => (e.fact ? [[`event ${e.id}`, e.fact] as [string, Fact]] : [])),
  ];
  it('every fact cites a listed source with an https link', () => {
    const listed = new Set(Object.values(SOURCES).map((s) => s.url));
    for (const [where, f] of facts) {
      expect(listed.has(f.source.url), `${where}: source not in SOURCES`).toBe(true);
      expect(f.source.url, where).toMatch(/^https:\/\//);
    }
  });
  it('facts never mention the game’s fictional labs', () => {
    for (const [where, f] of facts) expect(f.text, where).not.toMatch(/OpenBrain|DeepCent/);
  });
  it('the intro says the labs come from AI 2027 and the future is fiction', () => {
    expect(INTRO[0].paragraphs.join(' ')).toMatch(/AI 2027 scenario and are fictional/);
    expect(INTRO[0].paragraphs.join(' ')).not.toMatch(/invented for this game/);
  });
  it('the Built on block is short (it fits a phone), links the three scenarios and names the five tags', () => {
    const all = [BUILT_ON.title, ...BUILT_ON.scenarios.flatMap((x) => [x.name, x.by, x.what]), BUILT_ON.calendar.text, BUILT_ON.tagsText, ...BUILT_ON.tags].join(' ');
    expect(words(all)).toBeLessThanOrEqual(95);
    expect(BUILT_ON.scenarios.map((s) => s.name)).toEqual(['AI 2027', 'Advanced AI: Possible Futures', 'Europe 2031']);
    for (const x of [...BUILT_ON.scenarios.map((s) => s.source), BUILT_ON.calendar.source]) expect(Object.values(SOURCES)).toContain(x);
    expect(BUILT_ON.tags).toEqual(['Real', 'From AI 2027', 'From CFG', 'From Europe 2031', 'Invented']);
  });
  it('the intro has two screens with one or two facts', () => {
    expect(INTRO).toHaveLength(2);
    expect(INTRO.filter((i) => i.fact).length).toBeGreaterThanOrEqual(1);
  });
});

describe('no broken text anywhere', () => {
  it('content strings are clean', () => {
    const all = JSON.stringify([CARDS, INTRO, TIPS, HELP, ENDINGS, ALL_LETTERS, EPILOGUES, LEAKS, VOICES, WORLD_HEADLINES, EVENTS, THREATS]);
    expect(all).not.toMatch(BAD);
  });
  it('each friend signs every letter, never uses numbers and keeps it short', () => {
    for (const l of ALL_LETTERS) {
      expect(l.text, l.id).toMatch(SIGNATURE[l.friend]);
      expect(l.text, l.id).not.toMatch(/\d/);
      expect(words(l.text), l.id).toBeLessThanOrEqual(60);
    }
  });
  it('every ending has one short epilogue per friend, without numbers', () => {
    for (const e of ENDINGS)
      for (const f of FRIEND_IDS) {
        const t = EPILOGUES[e.id][f].text;
        expect(t, `${e.id} ${f}`).not.toMatch(/\d/);
        expect(words(t), `${e.id} ${f}`).toBeLessThanOrEqual(35);
      }
    for (const f of FRIEND_IDS) {
      expect(EPILOGUES_GAVE_IN[f].text, `gave in ${f}`).not.toMatch(/\d/);
      expect(words(EPILOGUES_GAVE_IN[f].text), `gave in ${f}`).toBeLessThanOrEqual(35);
    }
  });
  it('headlines and voices fit on a map banner', () => {
    for (const h of [...WORLD_HEADLINES, ...VOICES]) expect(h.text.length, h.id).toBeLessThanOrEqual(90);
    for (const t of THREATS) for (const h of t.stageHeadlines) expect(h.length).toBeLessThanOrEqual(90);
  });

  it('every leak says what to do about it, in one short line without numbers', () => {
    for (const l of LEAKS)
      for (const a of [l.advice.overconfident, l.advice.honest, LEAK_REDACTED_ADVICE]) {
        expect(a.split(/\s+/).length, l.id).toBeLessThanOrEqual(20);
        expect(a, l.id).not.toMatch(/\d/);
      }
  });
});
