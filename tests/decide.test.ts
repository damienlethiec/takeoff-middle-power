// @vitest-environment happy-dom
// The decisions panel: the ASML lever's two asks show as two cards of their own; selecting one locks the other for
// the round and says why in words; Confirm plays the engine's one card with the chosen ask.

import { describe, expect, it } from 'vitest';
import { engine } from '../src/engine';
import { showDecision } from '../src/ui/screens/decide';
import { fresh } from './helpers';

describe('the ASML lever in the hand', () => {
  it('shows two cards; one of them a round; Confirm plays the chosen ask', async () => {
    const s = fresh(1, { hand: ['asml'], arrivals: {} });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const done = showDecision(engine, s, 'H1 2027', { host, onPreview: () => {} });
    const safety = () => host.querySelector<HTMLButtonElement>('.pcard[data-card="asml:safety"]')!;
    const access = () => host.querySelector<HTMLButtonElement>('.pcard[data-card="asml:access"]')!;
    expect(safety().textContent).toContain('Trade chip machines for safety tests');
    expect(access().textContent).toContain('Trade chip machines for AI access');
    expect(host.querySelector('[data-details="asml:access"]')!.getAttribute('aria-label')).toBe('Details: Trade chip machines for AI access');
    // no radio button left anywhere
    expect(host.querySelector('input[type="radio"]')).toBeNull();
    safety().click();
    await Promise.resolve();
    expect(safety().getAttribute('aria-pressed')).toBe('true');
    // the other ask is locked, and says why in words (named by its accessible description)
    const wrap = access().closest('.pc-wrap')!;
    expect(wrap.classList.contains('locked')).toBe(true);
    const why = host.querySelector(`#${access().getAttribute('aria-describedby')}`)!;
    expect(why.textContent).toBe('Uses the same ASML lever as “Trade chip machines for safety tests”: one of the two a round.');
    access().click();
    await Promise.resolve();
    expect(access().getAttribute('aria-pressed')).toBe('false');
    // removing the first frees the second
    safety().click();
    await Promise.resolve();
    expect(access().closest('.pc-wrap')!.classList.contains('locked')).toBe(false);
    access().click();
    await Promise.resolve();
    host.querySelector<HTMLButtonElement>('#dec-ok')!.click();
    const r = await done;
    expect(r).toEqual({ kind: 'play', picks: [{ id: 'asml', option: 'access' }] });
    host.remove();
  });
});
