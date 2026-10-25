// @vitest-environment happy-dom
// The game controller (src/ui/app.ts) driven in happy-dom with fake timers: boot, the shell,
// the clock, pause, popovers, bubbles, and whole games to the ending (both the tipping point and the slow world).

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app';
import { engine } from '../../src/engine/index';
import { craft } from '../helpers';
import { BAD_TEXT, FAKE_CLOCK, key, openModalEl, preferReducedMotion } from './setup';
import type { GameState } from '../../src/engine/types';

let app: App;
let root: HTMLElement;
const errors: unknown[] = [];
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const text = (sel: string) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeAll(() => {
  vi.useFakeTimers(FAKE_CLOCK);
  vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a));
  preferReducedMotion(true);
  (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('http://localhost/takeoff-middle-power/?skipintro&seed=9');
  root = document.createElement('div');
  root.id = 'app';
  document.body.appendChild(root);
  app = new App(root, engine);
  void app.boot();
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Click through modals (first playable card, first choice, primary buttons) until the ending page shows. */
async function playToEnding(maxSteps = 600) {
  const played: string[] = [];
  for (let step = 0; step < maxSteps; step++) {
    if (document.querySelector('.ending-page')) return played;
    expect(document.body.textContent).not.toMatch(BAD_TEXT);
    const m = openModalEl();
    if (!m) {
      document.querySelector('.dock:not([hidden]) button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await advance(1000);
      continue;
    }
    if (m.classList.contains('decision')) {
      const card = m.querySelector<HTMLElement>('.pcard:not(.locked):not(.short)');
      if (card) {
        card.click();
        played.push(card.querySelector('.pname')!.textContent!);
        m.querySelector<HTMLElement>('.preview [data-primary]')!.click();
      } else m.querySelector<HTMLElement>('[data-action="pass"]')!.click();
    } else if (m.querySelector('.choice')) m.querySelector<HTMLElement>('.choice')!.click();
    else m.querySelector<HTMLElement>('[data-primary]:not(:disabled)')?.click();
    await advance(300);
  }
  throw new Error('no ending');
}

describe('the game controller', () => {
  it('boots straight into Q1 with the seed from the URL, the shell rendered', async () => {
    await advance(50);
    expect(app.debug.state().seed).toBe(9);
    expect(text('#date')).toBe('Q1 2027');
    expect(text('#month')).toBe('Jan');
    expect(text('#phase')).toBe('Clock running');
    expect(text('#pc')).toBe('6');
    expect(text('#budget')).toBe('3');
    expect(text('#goal')).toBe('when AI starts improving itself, the world must be able to verify a deal.');
    expect(text('#forecast')).toMatch(/^On current course: .+ \(\d+%\)\. What would help: .+\.$/);
    expect(document.querySelectorAll('#quarters li')).toHaveLength(16);
    expect(document.querySelector('#quarters li.now')!.getAttribute('data-q')).toBe('1');
    // ten visible indicators plus three hidden ones
    expect(document.querySelectorAll('.g-tile[data-key]')).toHaveLength(10);
    expect([...document.querySelectorAll<HTMLElement>('.g-tile.hidden-slot')].map((t) => t.dataset.hidden)).toEqual(['takeoff', 'trueAlignment', 'eu']);
    expect(text('.g-tile[data-key="coalition"] .g-val b')).toBe('0/3');
    expect(text('#news')).toBe('Headlines will arrive while the clock runs.');
  });

  it('runs the clock: news arrives in the feed and the ticker, the month advances', async () => {
    await advance(6000);
    expect(document.querySelectorAll('#news li.ni').length).toBeGreaterThan(0);
    expect(text('#tickText')).toBe(text('#news li.ni p'));
    expect(['Feb', 'Mar']).toContain(text('#month'));
  });

  it('Space pauses and resumes the clock; the play button says so', async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const fill = () => $<HTMLElement>('#quarters li.now i').style.width;
    key(' ');
    expect(text('#phase')).toBe('Paused');
    expect($('#play').getAttribute('aria-label')).toBe('Resume the clock (Space)');
    const w = fill();
    await advance(3000);
    expect(fill()).toBe(w);
    key(' ');
    expect(text('#phase')).toBe('Clock running');
    expect($('#play').getAttribute('aria-label')).toBe('Pause the clock (Space)');
  });

  it('Space is left to a focused button (house rule: shortcuts never fire while another button has focus)', () => {
    const fast = $<HTMLButtonElement>('.speed button[data-speed="1"]');
    fast.focus();
    key(' ');
    expect(text('#phase')).toBe('Clock running');
    fast.blur();
  });

  it('a gauge tile opens its popover with what moves it; Escape closes it', () => {
    $('.g-tile[data-key="tension"]').click();
    const pop = $('#gpop');
    expect(pop.hidden).toBe(false);
    expect(text('#gpop h3')).toMatch(/^Geopolitical tension \d+$/);
    expect(text('#gpop')).toContain('Rises when');
    expect(text('#gpop')).toContain('Falls when');
    $('.g-tile[data-key="capability"]').click();
    expect(text('#gpop h3')).toMatch(/^Capability \d+ ±10$/);
    $('.g-tile[data-hidden="trueAlignment"]').click();
    expect(text('#gpop h3')).toBe('True alignment ?');
    key('Escape');
    expect(pop.hidden).toBe(true);
  });

  it('a concern bubble gives +1 PC (at most 2 per quarter)', async () => {
    // inject a bubble, as the clock would
    const s = app.debug.state();
    const map = (app as unknown as { map: { spawnBubble(id: string, r: string): void } }).map;
    map.spawnBubble('t1', 'eu');
    $('.bubble').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(app.debug.state().pc).toBe(s.pc + 1);
    await advance(700);
    expect(text('#pc')).toBe(String(s.pc + 1));
  });

  it('plays on to the tipping point, the superpowers’ draw, the ending and the debrief', async () => {
    $('.speed button[data-speed="2"]').click();
    expect($('.speed button[data-speed="2"]').getAttribute('aria-pressed')).toBe('true');
    // jump ahead to a fast world two quarters from the tipping point (the end-to-end test plays whole games)
    const cards = app.debug.state().cardsPlayed;
    app.debug.set(engine.startQuarter({ ...craft({ quarter: 9, speed: 'fast', gauges: { capability: 66, trueAlignment: 45 }, coalition: 1 }), seed: 9, cardsPlayed: cards }));
    const played = await playToEnding();
    const s = app.debug.state();
    expect(s.phase).toBe('ended');
    expect(s.tipping).not.toBeNull();
    expect(document.body.classList.contains('ended')).toBe(true);
    expect(text('.ending-page h1')).toBe(engine.debrief(s).ending.title);
    // repeated plays of a card are one entry (B3)
    expect(document.querySelectorAll('.ending-page .deb-list')[0].querySelectorAll('h4')).toHaveLength(new Set(played).size);
    expect(document.body.textContent).not.toMatch(BAD_TEXT);
  });

  it('play again starts a new game', async () => {
    $('.ending-page [data-again]').click();
    await advance(100);
    expect(text('#date')).toBe('Q1 2027');
    expect(document.body.classList.contains('ended')).toBe(false);
    expect(app.debug.state().quarter).toBe(1);
  });

  it('a slow world: the clock stops after Q4 2030 and the game ends without a tipping point', async () => {
    // jump to the last quarter of a slow world (the dev hook replaces the state; the controller carries on)
    const late: GameState = engine.startQuarter({ ...craft({ quarter: 16, speed: 'slow', gauges: { capability: 50 } }), seed: 3 });
    app.debug.set(late);
    let sawClockStops = false;
    for (let i = 0; i < 200 && !document.querySelector('.ending-page'); i++) {
      const m = openModalEl();
      if (m?.getAttribute('aria-label') === 'The clock stops') {
        sawClockStops = true;
        expect(text('.modal h2')).toBe('Four years have passed');
      }
      if (m?.classList.contains('decision')) m.querySelector<HTMLElement>('[data-action="pass"]')!.click();
      else m?.querySelector<HTMLElement>('[data-primary]:not(:disabled)')?.click();
      await advance(m ? 300 : 1000);
    }
    expect(sawClockStops).toBe(true);
    expect(app.debug.state().tipping).toBeNull();
    expect(text('.ending-page .dateline')).toMatch(/^Q4 2030 · (Plateau|Big AI) world$/);
    expect(errors).toEqual([]);
  });
});
