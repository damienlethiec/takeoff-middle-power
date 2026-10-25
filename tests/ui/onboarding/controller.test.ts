// @vitest-environment happy-dom
// The Onboarding controller against a fake host: the tutorial switch, one tip per quarter,
// one blocking screen per quarter, holding and releasing the clock.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { engine } from '../../../src/engine/index';
import type { GameState, Notice, Tip } from '../../../src/engine/types';
import { modalOpen } from '../../../src/ui/modal';
import { Onboarding, type OnboardingHost } from '../../../src/ui/onboarding';
import { engineReads } from '../../../src/ui/onboarding/reads';
import { resetOnboardingSettings, setTutorial } from '../../../src/ui/onboarding/settings';
import { openModalEl, preferReducedMotion, sleep } from '../setup';

beforeAll(() => preferReducedMotion(true));
beforeEach(() => {
  localStorage.clear();
  resetOnboardingSettings();
});
afterEach(async () => {
  for (let i = 0; i < 3 && modalOpen(); i++) {
    openModalEl()?.querySelector<HTMLElement>('[data-primary]')?.click();
    await sleep(1);
  }
  document.body.innerHTML = '';
});

const TIP: Tip = { id: 'tip_decision', title: 'One decision per quarter', text: 'Pick one card.' };

function setup(notices: Notice[] = [], tip: Tip | null = TIP) {
  let s: GameState = { ...engine.createInitialState(3), quarter: 2 };
  const reads = { ...engineReads(engine), notices: () => notices, tip: vi.fn(() => (s.tipsShown.includes(tip?.id ?? '') ? null : tip)) };
  const release = vi.fn();
  const host: OnboardingHost = {
    root: () => document.body,
    engine,
    state: () => s,
    setState: (n) => void (s = n),
    hold: vi.fn(() => release),
    clock: () => ({ active: true, running: true, eventBusy: false, skipping: false }),
    skip: () => false,
    leaShownThisQuarter: () => false,
    openFromMap: (show) => void show(),
    reads,
  };
  return { ob: new Onboarding(host), host, reads, release, state: () => s };
}

describe('the onboarding controller', () => {
  it('a dialog tip at the start of a quarter holds the clock, records the tip, then releases', async () => {
    const t = setup();
    const done = t.ob.quarterStart();
    await sleep(1);
    expect(t.host.hold).toHaveBeenCalledTimes(1);
    expect(openModalEl()!.classList.contains('ob-tip')).toBe(true);
    expect(t.state().tipsShown).toEqual(['tip_decision']);
    expect(t.release).not.toHaveBeenCalled();
    openModalEl()!.querySelector<HTMLElement>('[data-primary]')!.click();
    await done;
    expect(t.release).toHaveBeenCalledTimes(1);
    // one tip per quarter: nothing more at the decision, even if the engine offered one
    t.reads.tip.mockReturnValue({ id: 'tip_other', title: 'x', text: 'y' });
    await t.ob.beforeDecision();
    expect(modalOpen()).toBe(false);
  });

  it('tutorial off: no tip, and the engine is not even asked', async () => {
    setTutorial(false);
    const t = setup();
    await t.ob.quarterStart();
    await t.ob.beforeDecision();
    expect(t.reads.tip).not.toHaveBeenCalled();
    expect(t.host.hold).not.toHaveBeenCalled();
    expect(modalOpen()).toBe(false);
  });

  it('an employment shock is the blocking screen; the other notices become toasts; the tip waits', async () => {
    const shock: Notice = { kind: 'employment_shock', id: 'capability_40', title: 'A wave of AI layoffs', text: 'Jobs cut.' };
    const card: Notice = { kind: 'card_unlocked', id: 'flexicurity', title: 'Flexicurity reform', text: 'Unlocked because of layoffs.' };
    const t = setup([card, shock]);
    const done = t.ob.quarterStart();
    await sleep(1);
    expect(openModalEl()!.classList.contains('ob-notice')).toBe(true);
    expect(document.querySelector('.ob-toasts')).toBeNull(); // toasts come once the screen closes
    openModalEl()!.querySelector<HTMLElement>('[data-primary]')!.click();
    await done;
    expect(t.release).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.ob-toasts')!.textContent).toContain('Flexicurity reform');
    expect(modalOpen()).toBe(false);
    expect(t.state().tipsShown).toEqual([]);
    const tip = t.ob.beforeDecision();
    await sleep(1);
    expect(openModalEl()!.classList.contains('ob-tip')).toBe(true);
    openModalEl()!.querySelector<HTMLElement>('[data-primary]')!.click();
    await tip;
    expect(t.state().tipsShown).toEqual(['tip_decision']);
  });

  it('nothing new: no hold, no dialog', async () => {
    const t = setup([], null);
    await t.ob.quarterStart();
    expect(t.host.hold).not.toHaveBeenCalled();
    expect(modalOpen()).toBe(false);
  });
});
