// Effects in words before deciding (playtests of 26 Oct): the word scale, and no number on what a player sees before
// choosing (card faces, card details, request answers).
import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { impactWords, moveText, sizeWord } from '../src/data/effects';
import { TUNING } from '../src/data/tuning';

describe('effects in words', () => {
  it('sizes: a little up to TUNING.effectWords.little, some up to .some, a lot beyond, whatever the sign', () => {
    const { little, some } = TUNING.effectWords;
    expect(sizeWord(1)).toBe('a little');
    expect(sizeWord(little)).toBe('a little');
    expect(sizeWord(-little)).toBe('a little');
    expect(sizeWord(little + 1)).toBe('some');
    expect(sizeWord(some)).toBe('some');
    expect(sizeWord(-(some + 1))).toBe('a lot');
    expect(sizeWord(40)).toBe('a lot');
  });

  it('moves read as a direction and a size', () => {
    expect(moveText('Social cohesion', -2)).toBe('Social cohesion: down a little');
    expect(moveText('US–China cooperation', 10)).toBe('US–China cooperation: up a lot');
    expect(impactWords({ key: 'cooperation', label: 'US–China cooperation', before: '44', after: '50', tone: 1 })).toBe('US–China cooperation: up some');
    expect(impactWords({ key: 'margin', label: 'AI safety: more verified', before: '40', after: '48', tone: 1 })).toBe('AI safety: verified part up a lot');
  });

  it('card faces show no gauge number (Influence, a resource, may stay a number)', () => {
    for (const c of CARDS)
      for (const chip of [...c.ups, ...c.downs, ...(c.options ?? []).flatMap((o) => o.ups)]) {
        const t = chip.text.replace(/Influence [+−]\d+/g, '').replace(/Level \d/g, '').replace(/\d+ rounds?/g, '');
        expect(t, `${c.id}: ${chip.text}`).not.toMatch(/\d/);
      }
  });
});

describe('request answers before answering', () => {
  it('say gauge moves in words; the outcome after answering shows numbers', async () => {
    const { answerRequest, createInitialState, endRound, request, resolveEvent, startRound } = await import('../src/engine/index');
    let seen = 0;
    let numeric = 0;
    for (let seed = 1; seed <= 6; seed++) {
      let s = createInitialState(seed);
      for (let r = 0; r < 10 && s.phase === 'play'; r++) {
        s = startRound(s);
        for (let g = 0; g < 6; g++) {
          while (s.event) s = resolveEvent(s, s.event.options[0]?.id);
          const v = request(s);
          if (!v) break;
          for (const a of [v.left, v.right]) {
            // Influence stays a number (a resource, like a card's cost); every gauge move is in words
            const noInfluence = (t: string) => t.replace(/Influence [+−]\d+/g, '');
            for (const c of a.chips) expect(noInfluence(c.text), `${v.id}: ${c.text}`).not.toMatch(/\d/);
            expect(noInfluence(a.words), v.id).not.toMatch(/\d/);
            seen++;
          }
          const out = answerRequest(s, seed % 2 ? 'left' : 'right');
          numeric += out.outcome.chips.filter((c) => /\d/.test(c.text)).length;
          s = out.state;
        }
        while (s.event) s = resolveEvent(s, s.event.options[0]?.id);
        s = endRound(s).state;
      }
    }
    expect(seen).toBeGreaterThan(20);
    expect(numeric).toBeGreaterThan(0);
  });
});
