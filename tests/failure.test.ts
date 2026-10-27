// Actions can fail (v4, playtests of 26 Oct): diplomatic and external cards work with a chance read from public
// values, shown in words only; a failure spends the Influence, changes nothing else, and the news says why.
import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, CARDS } from '../src/data/cards';
import { TUNING as T } from '../src/data/tuning';
import { advisor, endRound, feed, hand, playCard, preview } from '../src/engine/index';
import type { CardId, GameState } from '../src/engine/types';
import { fresh, nextRound } from './helpers';

const FAILABLE = Object.keys(T.failure.cards) as CardId[];
const odds = (s: GameState, id: CardId) => hand({ ...s, hand: s.hand.includes(id) ? s.hand : [...s.hand, id] }).find((c) => c.id === id)!.odds;

/** Play talks in a rupture until one fails (seeded: the same seeds give the same rolls). */
function failedTalks(): { before: GameState; after: GameState } {
  for (let seed = 1; seed <= 60; seed++) {
    const before = fresh(seed, { cooperation: 20 });
    const after = playCard(before, { id: 'talks' });
    if (after.played.at(-1)!.failed) return { before, after };
  }
  throw new Error('no failure in 60 seeds');
}

describe('cards that can fail', () => {
  it('only diplomatic and external cards; each has one plain sentence for the news, with a basis', () => {
    expect(FAILABLE.sort()).toEqual(['asml', 'biosecurity', 'coalition', 'inspections', 'licensing_treaty', 'pause_call', 'talks']);
    for (const id of FAILABLE) {
      const f = CARD_BY_ID[id].failure!;
      expect(f, id).toBeTruthy();
      expect(f.text.split(/\s+/).length, id).toBeLessThanOrEqual(20);
      expect(f.text, id).not.toMatch(/\d/);
      expect(['ai2027', 'cfg', 'e2031', 'real', 'game']).toContain(f.basis.kind);
    }
    for (const c of CARDS) if (!FAILABLE.includes(c.id)) expect(c.failure, c.id).toBeUndefined();
  });

  it('the odds read the visible world, in words: talks likelier in a pause, a long shot in a rupture', () => {
    const s = fresh(1);
    expect(odds({ ...s, cooperation: 65 }, 'talks')!.word).toBe('Likely to work');
    expect(odds({ ...s, cooperation: 65 }, 'talks')!.why).toContain('easier in a pause');
    expect(odds({ ...s, cooperation: 45 }, 'talks')!.word).toBe('Likely to work');
    expect(odds({ ...s, cooperation: 20 }, 'talks')!.word).toBe('Long shot');
    expect(odds({ ...s, cohesion: 40 }, 'coalition')!.word).toBe('Uncertain');
    expect(odds({ ...s, cohesion: 40 }, 'coalition')!.why).toContain('Europe looks divided');
    // Europe's own testing and the domestic cards always work
    expect(odds(s, 'inspections')).toBeNull();
    for (const id of ['ai_office', 'alignment', 'flexicurity', 'open_models', 'cern_ai'] as CardId[]) expect(odds(s, id), id).toBeNull();
  });

  it('never depend on the hidden truth or the pace, and carry no number', () => {
    const s = fresh(3);
    const a = hand({ ...s, confidence: { ...s.confidence, truth: 10 }, pace: 'slow' }).map((c) => c.odds);
    const b = hand({ ...s, confidence: { ...s.confidence, truth: 95 }, pace: 'fast' }).map((c) => c.odds);
    expect(a).toEqual(b);
    for (const o of a) if (o) expect(JSON.stringify(o)).not.toMatch(/\d/);
  });

  it('a failure spends the Influence and changes nothing else; the card can be tried again later', () => {
    const { before, after } = failedTalks();
    expect(after.influence).toBe(before.influence - T.cards.talks.cost);
    expect(after.cooperation).toBe(before.cooperation);
    expect(after.cohesion).toBe(before.cohesion);
    expect(after.uses.talks ?? 0).toBe(before.uses.talks ?? 0);
    expect(after.restUntil.talks).toBeUndefined();
    expect(after.rng).toBe(before.rng);
    // not twice in the same round; next round it is back
    expect(hand(after).find((c) => c.id === 'talks')!.reason).toMatch(/Already played/);
    const next = nextRound(endRound(after).state);
    expect(hand(next).find((c) => c.id === 'talks')!.playable).toBe(true);
  });

  it('the same seed and round give the same result (a reload cannot reroll)', () => {
    const { before, after } = failedTalks();
    expect(playCard(before, { id: 'talks' })).toEqual(after);
  });

  it('the news says why in one sentence, with its basis; the decision says it did not work', () => {
    const { after } = failedTalks();
    const items = feed(after).at(-1)!.items;
    const news = items.find((x) => x.text === CARD_BY_ID.talks.failure!.text)!;
    expect(news).toBeTruthy();
    expect(news.prov).toEqual(CARD_BY_ID.talks.failure!.basis);
    expect(items.find((x) => x.kind === 'decision')!.text).toMatch(/did not work/);
  });

  it('previews show the card working, without drawing, and warn in words when it may fail', () => {
    const s = fresh(1, { cooperation: 20 });
    const pv = preview(s, [{ id: 'talks' }]);
    expect(pv.impacts.find((i) => i.key === 'cooperation')).toBeTruthy();
    expect(pv.notes.join(' ')).toMatch(/long shot/);
    expect(pv.notes.join(' ')).not.toMatch(/\d+%/);
    expect(playCard(s, { id: 'talks' }, { assumeSuccess: true }).played.at(-1)!.failed).toBeUndefined();
    expect(advisor(s).text).not.toMatch(/\d/);
  });
});
