// The soundtrack's pure part: the world's state → musical parameters. The music grows tenser with AI power
// and as cooperation falls, darkens at the tipping point and resolves on the ending.

import { describe, expect, it } from 'vitest';
import { musicFor, type MusicWorld } from '../src/ui/sound';

const w = (aiPower: number, cooperation: number, extra: Partial<MusicWorld> = {}): MusicWorld => ({ aiPower, cooperation, tipping: false, ...extra });

describe('soundtrack: world → music', () => {
  it('is pure and bounded, even for odd input', () => {
    expect(musicFor(w(40, 55))).toEqual(musicFor(w(40, 55)));
    for (const x of [w(-50, 500), w(500, -50), w(NaN, NaN), w(0, 100), w(100, 0)]) {
      const p = musicFor(x);
      expect(p.tension).toBeGreaterThanOrEqual(0);
      expect(p.tension).toBeLessThanOrEqual(1);
      expect(p.shadow).toBeGreaterThanOrEqual(0);
      expect(p.shadow).toBeLessThanOrEqual(1);
      for (const v of [p.bpm, p.pulse, p.cutoff, p.detune, p.chordSecs]) expect(Number.isFinite(v)).toBe(true);
      expect(p.chords.every((c) => c.length === 4)).toBe(true);
    }
  });

  it('grows tenser with AI power', () => {
    const lo = musicFor(w(20, 60));
    const hi = musicFor(w(75, 60));
    expect(hi.tension).toBeGreaterThan(lo.tension);
    expect(hi.bpm).toBeGreaterThan(lo.bpm);
    expect(hi.cutoff).toBeGreaterThan(lo.cutoff);
    expect(hi.detune).toBeGreaterThan(lo.detune);
    expect(hi.chordSecs).toBeLessThan(lo.chordSecs);
  });

  it('grows tenser as cooperation falls', () => {
    const pause = musicFor(w(50, 75));
    const rupture = musicFor(w(50, 15));
    expect(rupture.tension).toBeGreaterThan(pause.tension);
    expect(rupture.bpm).toBeGreaterThan(pause.bpm);
    expect(rupture.shadow).toBeGreaterThanOrEqual(pause.shadow);
  });

  it('starts calm and changes gently: a small move in the world is a small move in the music', () => {
    expect(musicFor(w(20, 60)).mood).toBe('calm');
    expect(musicFor(w(20, 60)).shadow).toBe(0);
    const a = musicFor(w(50, 50));
    const b = musicFor(w(51, 49));
    expect(Math.abs(a.bpm - b.bpm)).toBeLessThanOrEqual(2);
    expect(Math.abs(a.cutoff - b.cutoff)).toBeLessThan(80);
  });

  it('changes mood at the tipping point and on the ending', () => {
    const tipped = musicFor(w(82, 60, { tipping: true }));
    expect(tipped.mood).toBe('tipped');
    expect(tipped.tension).toBeGreaterThanOrEqual(0.75);
    const good = musicFor(w(82, 60, { tipping: true, ending: 'good' }));
    const bad = musicFor(w(82, 60, { tipping: true, ending: 'bad' }));
    expect(good.mood).toBe('hope');
    expect(bad.mood).toBe('sombre');
    // hopeful: no heartbeat, no dissonance, a major chord (major third above the root)
    expect(good.bpm).toBe(0);
    expect(good.shadow).toBe(0);
    expect(good.chords[0]).toContain(4);
    // sombre: slow, dark, minor
    expect(bad.bpm).toBeLessThan(musicFor(w(20, 60)).bpm);
    expect(bad.cutoff).toBeLessThan(tipped.cutoff);
    expect(bad.chords[0]).toContain(3);
  });
});
