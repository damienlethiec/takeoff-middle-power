// @vitest-environment happy-dom
// The world map (src/ui/map.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARTNERS, WorldMap, geo } from '../../src/ui/map';
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
    expect(m.svg.querySelector('.lea-pin')).not.toBeNull();
  });

  it('a decorative map has no labels, lab names or Léa', () => {
    const m = new WorldMap(box, { decorative: true });
    expect(m.svg.querySelectorAll('.m-label, .lab-name, .lea-pin')).toHaveLength(0);
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

  it('concern bubbles: click or Enter collects, pop shows the gain, clear fades the rest', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    const onBubble = vi.fn();
    const m = new WorldMap(box, { onBubble });
    m.spawnBubble('b1', 'eu');
    m.spawnBubble('b2', 'us');
    m.spawnBubble('b3', 'cn');
    expect(m.svg.querySelectorAll('.bubble')).toHaveLength(3);
    const b1 = m.svg.querySelector<SVGGElement>('.bubble')!;
    expect(b1.textContent).toBe('+1');
    expect(b1.getAttribute('role')).toBe('button');
    b1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onBubble).toHaveBeenCalledWith('b1', 'eu', b1);
    const b2 = m.svg.querySelectorAll<SVGGElement>('.bubble')[1];
    b2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    b2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    b2.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onBubble).toHaveBeenCalledTimes(3);
    m.popBubble('b1', true);
    expect(b1.classList.contains('popped')).toBe(true);
    expect(m.svg.querySelector('.gain')!.textContent).toBe('+1 PC');
    m.popBubble('b1', true); // already gone: no-op
    m.clearBubbles();
    expect(m.svg.querySelectorAll('.bubble:not(.popped):not(.faded)')).toHaveLength(0);
    expect(m.svg.querySelectorAll('.bubble.faded')).toHaveLength(2);
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
    const lea = m.svg.querySelector('.lea-pin')!;
    lea.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    lea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onLea).toHaveBeenCalledTimes(2);
    expect(m.screenPos(lea)).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  // B11: Léa's pin was a tiny "L" dot
  it('Léa’s marker is a labelled button with a 44 px target, drawn at a constant pixel size', () => {
    const box = document.createElement('div');
    Object.defineProperty(box, 'clientWidth', { value: 1000 });
    Object.defineProperty(box, 'clientHeight', { value: 400 });
    const m = new WorldMap(box);
    const lea = m.svg.querySelector('.lea-pin')!;
    expect(lea.getAttribute('role')).toBe('button');
    expect(lea.getAttribute('aria-label')).toBe('Léa, in Lyon: reread her last message');
    expect(lea.querySelector('.lea-name')!.textContent).toBe('Léa');
    const hit = lea.querySelector('.pin-hit')!;
    expect(Number(hit.getAttribute('height'))).toBeGreaterThanOrEqual(44);
    expect(Number(hit.getAttribute('width'))).toBeGreaterThanOrEqual(44);
    // scaled by map units per pixel (viewBox width / box width), so 1 unit of the marker is 1 px on screen
    const vw = Number(m.svg.getAttribute('viewBox')!.split(' ')[2]);
    const scale = Number(/scale\(([\d.]+)\)/.exec(lea.getAttribute('transform')!)![1]);
    expect(scale).toBeCloseTo(vw / 1000, 3);
  });
});
