// @vitest-environment happy-dom
// The controller from the keyboard: single-key shortcuts (and turning them off), the shortcut list,
// the indicator popover, announcements, and the event recap from a map pin.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app';
import { engine } from '../../src/engine/index';
import { FAKE_CLOCK, key, openModalEl, preferReducedMotion } from './setup';

let app: App;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const text = (sel: string) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const said = () => [...document.querySelectorAll('.sr-live')].map((r) => r.textContent).join(' ');

beforeAll(() => {
  vi.useFakeTimers(FAKE_CLOCK);
  preferReducedMotion(true);
  localStorage.clear();
  (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('http://localhost/takeoff-middle-power/?skipintro&seed=4');
  const root = document.body.appendChild(document.createElement('div'));
  app = new App(root, engine);
  void app.boot();
});
afterAll(() => vi.useRealTimers());

describe('the controller from the keyboard', () => {
  it('starts on the page heading and announces the quarter', async () => {
    await advance(300);
    expect(document.activeElement).toBe($('#game-title'));
    expect(said()).toContain('Q1 2027 begins. The clock is running.');
    expect(text('#qof')).toBe(', quarter 1 of 16');
  });

  it('P pauses and resumes even when a button has focus (Space is left to the button)', async () => {
    const fast = $<HTMLButtonElement>('.speed button[data-speed="2"]');
    fast.focus();
    key(' ');
    expect(text('#phase')).toBe('Clock running');
    key('p');
    expect(text('#phase')).toBe('Paused');
    key('p');
    expect(text('#phase')).toBe('Clock running');
    key('2');
    expect(fast.getAttribute('aria-pressed')).toBe('true');
    key('1');
    expect(fast.getAttribute('aria-pressed')).toBe('false');
  });

  it('C reads the latest public concern aloud; it pays nothing', async () => {
    for (let i = 0; i < 40 && !document.querySelector('.bubble:not(.faded)'); i++) await advance(100);
    await advance(160); // announcements said together are batched for 150 ms
    expect(said()).toMatch(/Public concern in (Europe|United States|China): press C to read it\./);
    const before = Number(text('#pc'));
    key('c');
    await advance(300);
    expect(Number(text('#pc'))).toBe(before);
    expect(said()).toMatch(/Public concern in (Europe|United States|China): [A-Z].+\./);
    expect(document.querySelector('.bubble.read')).not.toBeNull();
  });

  it('the income tooltip shows on focus and hides with Escape', () => {
    const btn = $<HTMLButtonElement>('#res-pc');
    expect(document.getElementById(btn.getAttribute('aria-describedby')!)!.textContent).toMatch(/^Next quarter: [+−]?\d+ Political Capital/);
    btn.focus();
    btn.click(); // pinned open for touch
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    key('Escape');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.closest('.res-wrap')!.classList.contains('dismissed')).toBe(true);
    btn.blur();
    expect(btn.closest('.res-wrap')!.classList.contains('dismissed')).toBe(false);
  });

  it('an indicator opens with its tile and closes with Escape, focus back on the tile', async () => {
    const tile = $<HTMLButtonElement>('.g-tile[data-key="tension"]');
    expect(document.getElementById(tile.getAttribute('aria-describedby')!)!.textContent).toMatch(/^Geopolitical tension: \d+ out of 100/);
    tile.focus();
    tile.click();
    const pop = $('#gpop');
    expect(pop.hidden).toBe(false);
    expect(tile.nextElementSibling).toBe(pop); // read right after its tile
    expect(pop.getAttribute('role')).toBe('region');
    expect(document.getElementById(pop.getAttribute('aria-labelledby')!)!.textContent).toMatch(/^Geopolitical tension/);
    key('Escape');
    expect(pop.hidden).toBe(true);
    expect(document.activeElement).toBe(tile);
  });

  it('? lists the shortcuts with the clock paused; turning single keys off disables them', async () => {
    key('?');
    const m = openModalEl()!;
    expect(m.classList.contains('help')).toBe(true);
    expect(text('#phase')).toBe('Paused');
    const box = m.querySelector<HTMLInputElement>('#single-keys')!;
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    key('Escape');
    await advance(100);
    expect(openModalEl()).toBeNull();
    expect(text('#phase')).toBe('Clock running');
    expect(document.activeElement).toBe($('.g-tile[data-key="tension"]')); // focus came back where it was
    key('p');
    expect(text('#phase')).toBe('Clock running');
    (document.activeElement as HTMLElement).blur();
    key(' '); // Space always works when no button has focus
    expect(text('#phase')).toBe('Paused');
    key(' ');
    $('#help').click(); // the on-screen button still works
    const h = openModalEl()!;
    h.querySelector<HTMLInputElement>('#single-keys')!.checked = true;
    h.querySelector<HTMLInputElement>('#single-keys')!.dispatchEvent(new Event('change'));
    h.querySelector<HTMLElement>('[data-primary]')!.click();
    await advance(100);
  });
});
