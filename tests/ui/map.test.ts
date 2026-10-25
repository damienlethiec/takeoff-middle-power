// @vitest-environment happy-dom
// The world map (src/ui/map.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARTNERS, WorldMap, geo, glitchCount, protestCount } from '../../src/ui/map';
import { MAPDATA } from '../../src/ui/mapdata';
import { FAKE_CLOCK } from './setup';

let box: HTMLElement;
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  document.body.innerHTML = '';
  box = document.createElement('div');
  document.body.appendChild(box);
});

describe('WorldMap', () => {
  it('draws the land by zone, the tension arc, the labs, labels and Léa’s pin', () => {
    const m = new WorldMap(box);
    expect(box.querySelector('svg.worldmap')).toBe(m.svg);
    expect(m.svg.getAttribute('aria-label')).toMatch(/Map of the world/);
    const zones = [...m.svg.querySelectorAll('.m-land path')].map((p) => p.getAttribute('class'));
    expect(zones).toEqual(['zone z-us', 'zone z-eu', 'zone z-cn', 'zone z-uk', 'zone z-no', 'zone z-ca', 'zone z-jp', 'zone z-kr', 'zone z-other']);
    for (const p of m.svg.querySelectorAll('.m-land path')) expect(p.getAttribute('d')!.length).toBeGreaterThan(10);
    expect(m.svg.querySelectorAll('.lab')).toHaveLength(6);
    expect([...m.svg.querySelectorAll('.lab-name')].map((t) => t.textContent)).toEqual(['OpenBrain', 'DeepCent']);
    expect([...m.svg.querySelectorAll('.m-label')].map((t) => t.textContent)).toEqual(['UNITED STATES', 'EUROPE', 'CHINA', ...PARTNERS.map((p) => p.name)]);
    // Léa is a real button over the map, labelled with her name
    expect(m.leaButton!.tagName).toBe('BUTTON');
    expect(m.leaButton!.textContent).toContain('Léa');
    expect(m.leaButton!.getAttribute('aria-label')).toBe('Léa, in Lyon: her messages');
    m.setLeaUnread(true);
    expect(m.leaButton!.getAttribute('aria-label')).toBe('Léa, in Lyon: her messages (new message)');
    expect(m.leaButton!.querySelector<HTMLElement>('.lea-new')!.hidden).toBe(false);
    m.setLeaUnread(false);
    expect(m.leaButton!.querySelector<HTMLElement>('.lea-new')!.hidden).toBe(true);
  });

  it('a decorative map has no labels, lab names or Léa', () => {
    const m = new WorldMap(box, { decorative: true });
    expect(m.svg.querySelectorAll('.m-label, .lab-name')).toHaveLength(0);
    expect(box.querySelector('.lea-btn')).toBeNull();
  });

  it('maps longitude and latitude onto the grid', () => {
    expect(geo(MAPDATA.lon0, MAPDATA.lat0)).toEqual({ x: 0, y: 0 });
    expect(geo(MAPDATA.lon0 + 3, MAPDATA.lat0 - 1.5)).toEqual({ x: 2, y: 1 });
  });

  it('shows tension on the arc and coalition partners joining by level', () => {
    const m = new WorldMap(box);
    const label = m.svg.querySelector('.arc-label')!;
    m.update({ capability: 20, tension: 40, verification: 0, coalition: 0, publicPressure: 20 });
    expect(label.textContent).toBe('US–China tension 40');
    expect(label.classList.contains('hot')).toBe(false);
    expect(m.svg.querySelectorAll('.zone.joined')).toHaveLength(0);
    m.update({ capability: 60, tension: 60.4, verification: 30, coalition: 2, publicPressure: 50 });
    expect(label.textContent).toBe('US–China tension 60');
    expect(label.classList.contains('hot')).toBe(true);
    expect([...m.svg.querySelectorAll('.zone.joined')].map((z) => z.getAttribute('class'))).toEqual(['zone z-uk joined', 'zone z-no joined', 'zone z-ca joined']);
    expect([...m.svg.querySelectorAll('.m-label.joined')].map((t) => t.textContent)).toEqual(['UK', 'Norway', 'Canada']);
    m.update({ capability: 60, tension: 60, verification: 30, coalition: 3, publicPressure: 50 });
    expect(m.svg.querySelectorAll('.zone.joined')).toHaveLength(5);
    expect(Number(m.svg.style.getPropertyValue('--cap-glow'))).toBeCloseTo(0.85);
  });

  it('pressure you can feel: protests grow with public pressure, glitches appear with misuse, the arc heats up', () => {
    const m = new WorldMap(box);
    m.update({ capability: 20, tension: 30, verification: 0, coalition: 0, publicPressure: 15, misuse: 10 });
    expect(m.svg.querySelectorAll('.protest, .glitch')).toHaveLength(0);
    expect(m.svg.classList.contains('arc-hot')).toBe(false);
    const thin = Number(m.svg.querySelector<SVGPathElement>('.arc')!.style.strokeWidth);
    m.update({ capability: 20, tension: 70, verification: 0, coalition: 0, publicPressure: 55, misuse: 40 });
    expect(m.svg.querySelectorAll('.protest')).toHaveLength(protestCount(55));
    expect(protestCount(55)).toBe(4);
    expect(m.svg.querySelectorAll('.glitch')).toHaveLength(glitchCount(40));
    expect(glitchCount(40)).toBe(2);
    expect(m.svg.classList.contains('arc-hot')).toBe(true);
    expect(Number(m.svg.querySelector<SVGPathElement>('.arc')!.style.strokeWidth)).toBeGreaterThan(thin * 3);
    m.update({ capability: 20, tension: 70, verification: 0, coalition: 0, publicPressure: 100, misuse: 100 });
    expect(m.svg.querySelectorAll('.protest')).toHaveLength(8);
    expect(m.svg.querySelectorAll('.glitch')).toHaveLength(7);
    m.update({ capability: 20, tension: 70, verification: 0, coalition: 0, publicPressure: 31, misuse: 0 });
    expect(m.svg.querySelectorAll('.protest')).toHaveLength(2);
    expect(m.svg.querySelectorAll('.glitch')).toHaveLength(0);
  });

  it('concern bubbles: click or Enter reads them (they pay nothing), the concern shows beside them, clear fades the rest', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    const onBubble = vi.fn();
    const m = new WorldMap(box, { onBubble });
    m.spawnBubble('b1', 'eu');
    m.spawnBubble('b2', 'us');
    m.spawnBubble('b3', 'cn');
    expect(m.svg.querySelectorAll('.bubble')).toHaveLength(3);
    const b1 = m.svg.querySelector<SVGGElement>('.bubble')!;
    expect(b1.textContent).toBe('…');
    expect(b1.getAttribute('role')).toBe('button');
    expect(b1.getAttribute('aria-label')).toBe('Public concern in Europe: read what worries people');
    b1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onBubble).toHaveBeenCalledWith('b1', 'eu', b1);
    const b2 = m.svg.querySelectorAll<SVGGElement>('.bubble')[1];
    b2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    b2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    b2.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onBubble).toHaveBeenCalledTimes(3);
    m.readBubble('b1', 'eu', 'Teachers in Lyon worry AI tutors will replace them.');
    expect(b1.classList.contains('read')).toBe(true);
    expect(b1.textContent).toBe('✓');
    expect(b1.getAttribute('aria-label')).toBe('Public concern in Europe, read: Teachers in Lyon worry AI tutors will replace them.');
    expect(box.querySelector('.concern-pop')!.textContent).toBe('Teachers in Lyon worry AI tutors will replace them.');
    expect(m.liveBubbles()).toEqual(['b2', 'b3', 'b1']); // unread first
    expect(m.closeConcern()).toBe(true);
    expect(m.closeConcern()).toBe(false);
    m.popBubble('b1');
    expect(b1.classList.contains('faded')).toBe(true);
    m.popBubble('b1'); // already gone: no-op
    m.clearBubbles();
    expect(m.svg.querySelectorAll('.bubble:not(.faded)')).toHaveLength(0);
    expect(m.svg.querySelectorAll('.bubble.faded')).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(500);
    expect(m.svg.querySelectorAll('.bubble')).toHaveLength(0);
  });

  it('bubbles land inside their region', () => {
    const m = new WorldMap(box);
    for (const region of ['eu', 'us', 'cn'] as const) {
      for (let i = 0; i < 20; i++) m.spawnBubble(`${region}${i}`, region);
    }
    const xs = (region: string) =>
      [...m.svg.querySelectorAll<SVGGElement>('.bubble')]
        .filter((_, i) => Math.floor(i / 20) === ['eu', 'us', 'cn'].indexOf(region))
        .map((g) => Number(/translate\(([\d.]+)/.exec(g.getAttribute('transform')!)![1]));
    // longitude ranges: the US west of Europe, China east of it
    expect(Math.max(...xs('us'))).toBeLessThan(Math.min(...xs('eu')));
    expect(Math.max(...xs('eu'))).toBeLessThan(Math.min(...xs('cn')));
  });

  it('event pin labels are plain text (no HTML escaping in attributes)', () => {
    const m = new WorldMap(box);
    m.addEventPin('eu', 'Europe’s grid & hospitals', "Q1 '28");
    expect(m.svg.querySelector('.evpin')!.getAttribute('aria-label')).toBe("Europe’s grid & hospitals, Q1 '28");
  });

  it('pings, event pins and Léa’s pin', async () => {
    const m = new WorldMap(box);
    m.ping('cn', 'news');
    m.ping('eu', 'note');
    expect(m.svg.querySelectorAll('.ping')).toHaveLength(2);
    expect(m.svg.querySelector('.ping-note.ping-eu')).not.toBeNull();
    m.addEventPin('us', 'Weight theft', 'Q3 2028');
    m.addEventPin('us', 'Opaque reasoning', 'Q1 2029');
    const pins = m.svg.querySelectorAll('.evpin-us');
    expect(pins).toHaveLength(2);
    expect(pins[0].classList.contains('active')).toBe(false);
    expect(pins[1].classList.contains('active')).toBe(true);
    expect(pins[1].getAttribute('aria-label')).toBe('Opaque reasoning, Q1 2029');
    expect(pins[1].querySelector('.evpin-label')!.textContent).toBe('Opaque reasoning');
    m.settlePins();
    expect(m.svg.querySelectorAll('.evpin.active')).toHaveLength(0);
    const onLea = vi.fn();
    m.onLea = onLea;
    m.leaButton!.click();
    expect(onLea).toHaveBeenCalledTimes(1);
    expect(m.toPx(geo(4.85, 45.76))).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });
});
