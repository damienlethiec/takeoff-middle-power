// @vitest-environment happy-dom
// UI behaviour that looks wrong, recorded without fixing it. Each `it.fails` states the expected behaviour
// and currently fails; when the issue is fixed, vitest reports it as passing unexpectedly: make it a normal `it`.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { engine } from '../../src/engine/index';
import { showEnding } from '../../src/ui/screens/ending';
import { WorldMap } from '../../src/ui/map';
import { App } from '../../src/ui/app';
import { playGame, passive } from '../helpers';
import { FAKE_CLOCK, key, preferReducedMotion } from './setup';

describe('known UI issues', () => {
  // ending.ts tags notes the player never read ("You never read this", class was-redacted), but engine.debrief()
  // returns every note with readable: true (types.ts: "all, unredacted"), so the tag can never show.
  it.fails('the debrief marks the internal notes the player never read', () => {
    const s = playGame(2, passive).final; // a passive player never reads a note
    expect(s.notes.some((n) => !n.readable)).toBe(true);
    const root = document.createElement('div');
    void showEnding(root, engine.debrief(s), 'Q4 2030');
    expect(root.querySelectorAll('.tag-redacted').length).toBe(s.notes.filter((n) => !n.readable).length);
  });

  // map.ts escapes the event pin's aria-label with esc() although setAttribute needs no escaping,
  // so a title with an apostrophe or ampersand would be read out as "&#39;" / "&amp;". No current title has one.
  it.fails('event pin labels are not HTML-escaped twice', () => {
    const m = new WorldMap(document.body.appendChild(document.createElement('div')));
    m.addEventPin('eu', 'Europe’s grid & hospitals', "Q1 '28");
    expect(m.svg.querySelector('.evpin')!.getAttribute('aria-label')).toBe("Europe’s grid & hospitals, Q1 '28");
  });
});

describe('known UI issues: the controller', () => {
  let app: App;
  beforeAll(() => {
    vi.useFakeTimers(FAKE_CLOCK);
    preferReducedMotion(true);
    (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('http://localhost/takeoff-middle-power/?skipintro&seed=4');
    const root = document.body.appendChild(document.createElement('div'));
    app = new App(root, engine);
    void app.boot();
  });
  afterAll(() => vi.useRealTimers());

  // The coach says "Press Space to pause", but app.ts ignores Space whenever a button has focus (to let the
  // browser click it). After clicking the ×2 speed button or a gauge tile, Space re-clicks that button
  // instead of pausing the clock.
  it.fails('Space pauses the clock even after the player clicked the ×2 speed button', async () => {
    await vi.advanceTimersByTimeAsync(500);
    const fast = document.querySelector<HTMLButtonElement>('.speed button[data-speed="2"]')!;
    fast.click();
    fast.focus();
    key(' ');
    expect(document.querySelector('#phase')!.textContent).toBe('Paused');
    expect(app.debug.state().quarter).toBe(1);
  });
});
