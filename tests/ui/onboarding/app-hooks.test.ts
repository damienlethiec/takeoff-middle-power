// @vitest-environment happy-dom
// The onboarding wired into the game controller (the "v2-onboarding hooks" block of src/ui/app.ts),
// driven with the dev fixtures (?obfixtures): Q1 lasts 5 s, the next-decision cue, Skip to decision,
// tips (coach mark, dialog), act transitions and toasts, the journal and Léa's letters.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../../src/ui/app';
import { engine } from '../../../src/engine/index';
import { ACTS } from '../../../src/data/copy';
import { started } from '../../helpers';
import { resetOnboardingSettings } from '../../../src/ui/onboarding/settings';
import { BAD_TEXT, FAKE_CLOCK, key, openModalEl, preferReducedMotion } from '../setup';

let app: App;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const text = (sel: string) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const modal = () => openModalEl();
const phase = () => text('#phase');

/** Press the primary button of each dialog (passing at the decision) until `stop()`. */
async function until(stop: () => boolean, max = 200) {
  for (let i = 0; i < max; i++) {
    if (stop()) return;
    const m = modal();
    if (!m) await advance(250);
    else if (m.classList.contains('decision')) {
      m.querySelector<HTMLElement>('[data-action="pass"]')!.click();
      await advance(300);
    } else {
      expect(m.textContent).not.toMatch(BAD_TEXT);
      (m.querySelector<HTMLElement>('.choice') ?? m.querySelector<HTMLElement>('[data-primary]:not(:disabled)'))?.click();
      await advance(300);
    }
  }
  throw new Error(`condition never met: ${text('#date')} ${phase()} ${modal()?.className ?? 'no modal'}`);
}

beforeAll(() => {
  vi.useFakeTimers(FAKE_CLOCK);
  preferReducedMotion(true);
  localStorage.clear();
  resetOnboardingSettings();
  (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('http://localhost/takeoff-middle-power/?skipintro&seed=4&obfixtures');
  const root = document.createElement('div');
  root.id = 'app';
  document.body.appendChild(root);
  app = new App(root, engine);
  void app.boot();
});
afterAll(() => {
  vi.useRealTimers();
});

describe('onboarding in the game', () => {
  it('Q1: the cue, Skip and Journal in the header; the clock tip as a coach mark; act 1 as a toast', async () => {
    await advance(50);
    expect(text('#ob-next-l')).toBe('Next decision end of quarter');
    expect($('#ob-skip').getAttribute('aria-disabled')).toBe('false');
    expect(text('#ob-skip')).toBe('Skip to decision unclicked bubbles are skipped');
    expect($('#ob-journal').getAttribute('aria-label')).toBe('Journal');
    expect($('.lea-pin').getAttribute('aria-label')).toBe('Léa, in Lyon: read her letters');
    // the coach mark: next to the clock, not modal, the clock keeps running
    expect($('.clockctl').nextElementSibling!.classList.contains('ob-coach')).toBe(true);
    expect(modal()).toBeNull();
    expect(phase()).toBe('Clock running');
    expect(app.debug.state().tipsShown).toEqual(['tip_clock']);
    expect(text('.ob-toasts')).toContain(`Act 1: ${ACTS[0].title}`);
  });

  it('Q1 lasts 5 seconds: the situation report comes at the end of it, the coach mark goes before the decision', async () => {
    await advance(4000);
    expect(modal()).toBeNull();
    await advance(1500);
    expect(modal()).not.toBeNull(); // the report (or Léa's letter just before it)
    await until(() => /^Situation report/.test(modal()?.getAttribute('aria-label') ?? ''));
    expect(text('#ob-next-when')).toBe('now');
    expect($('#ob-skip').getAttribute('aria-disabled')).toBe('true');
    await until(() => !!modal()?.classList.contains('decision'));
    expect(document.querySelector('.ob-coach')).toBeNull();
  });

  it('Q2: a tip dialog at the start, with the clock paused; one tip per quarter', async () => {
    await until(() => !!modal()?.classList.contains('ob-tip'));
    expect(text('#date')).toBe('Q2 2027');
    expect(phase()).toBe('Paused');
    modal()!.querySelector<HTMLElement>('[data-primary]')!.click();
    await advance(50);
    expect(modal()).toBeNull();
    expect(phase()).toBe('Clock running');
    expect(app.debug.state().tipsShown).toContain('tip_decision');
    // the quarter's notices became toasts (no blocking screen)
    expect(text('.ob-toasts')).toContain('Middle-power coalition');
  });

  it('Skip to decision: fast-forwards this quarter once, ignores a second press, and announces the bubbles are skipped', async () => {
    const skip = $<HTMLButtonElement>('#ob-skip');
    skip.focus();
    skip.click();
    await advance(200); // announcements are batched for 150 ms
    expect(skip.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(skip); // keyboard focus stays on it
    expect(text('#ob-next-when')).toBe('skipping ahead…');
    expect(document.querySelector('.bubble:not(.popped):not(.faded)')).toBeNull();
    expect([...document.querySelectorAll('.sr-live')].map((r) => r.textContent).join(' ')).toContain('Concern bubbles you have not clicked are skipped.');
    const before = app.debug.state();
    skip.click(); // ignored while skipping
    await advance(1300);
    expect(modal()?.getAttribute('aria-label')).toMatch(/^Situation report Q2 2027/);
    // no extra rewards
    expect(app.debug.state().pc).toBe(before.pc);
  });

  it('Q3: the act transition is the one blocking screen, the tip waits for the decision', async () => {
    await until(() => !!modal()?.classList.contains('ob-act'));
    expect(text('#date')).toBe('Q3 2027');
    expect(text('.ob-act h2')).toBe(ACTS[1].title);
    expect(document.querySelectorAll('.ob-act .ob-news li').length).toBe(3);
    modal()!.querySelector<HTMLElement>('[data-primary]')!.click();
    await advance(50);
    expect(modal()).toBeNull();
    expect(phase()).toBe('Clock running');
    expect(document.querySelector('.ob-coach')).toBeNull();
    await until(() => !!modal()?.classList.contains('ob-tip') || !!modal()?.classList.contains('decision'));
    expect(modal()!.classList.contains('ob-tip')).toBe(true);
    expect(text('.ob-tip h2')).toBe('The public is watching');
    modal()!.querySelector<HTMLElement>('[data-primary]')!.click();
    await advance(100);
    expect(modal()!.classList.contains('decision')).toBe(true);
  });

  it('the journal and Léa’s letters keep the clock as it was: running stays running, paused stays paused', async () => {
    await until(() => text('#date') === 'Q4 2027' && !modal() && phase() === 'Clock running');
    $('#ob-journal').click();
    await advance(50);
    expect(modal()!.classList.contains('ob-journal')).toBe(true);
    expect([...modal()!.querySelectorAll('[role="tab"]')].map((t) => t.textContent)).toEqual(['Q1 2027', 'Q2 2027', 'Q3 2027', 'Tips']);
    expect(phase()).toBe('Paused');
    key('Escape');
    await advance(100);
    expect(phase()).toBe('Clock running');
    // paused first: still paused after
    $('#play').click();
    expect(phase()).toBe('Paused');
    (document.querySelector('.lea-pin') as Element).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await advance(50);
    const m = modal()!;
    expect(m.classList.contains('ob-lea-history')).toBe(true);
    expect([...m.querySelectorAll('.ob-letters small')].map((s) => s.textContent)).toEqual(['Lyon · Q1 2027']);
    key('Escape');
    await advance(100);
    expect(phase()).toBe('Paused');
    $('#play').click();
  });

  it('events still stop a skipped quarter', async () => {
    await until(() => text('#date') === 'Q1 2028' && !modal() && phase() === 'Clock running');
    const pe = started({ speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 } }).pendingEvent!;
    app.debug.set({ ...app.debug.state(), pendingEvent: { ...pe, at: 0.95 } });
    $<HTMLButtonElement>('#ob-skip').click();
    await until(() => !!modal());
    expect(modal()!.classList.contains('event')).toBe(true);
    expect($('#ob-skip').getAttribute('aria-disabled')).toBe('true');
  }, 20_000);
});
