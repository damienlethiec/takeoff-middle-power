// Player text: short and plain, real facts sourced, fiction never presented as real.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { HELP, INTRO, TIPS } from '../src/data/copy';
import { ENDINGS } from '../src/data/endings';
import { ALL_LETTERS, EPILOGUES, SIGNATURE } from '../src/data/letters';
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
  it('the intro says the labs and the future are invented', () => {
    expect(INTRO[0].paragraphs.join(' ')).toMatch(/invented/);
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
