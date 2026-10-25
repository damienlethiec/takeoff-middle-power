// @vitest-environment happy-dom
// Onboarding settings (tutorial on/off, introduction seen) and the two-screen introduction.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO } from '../../../src/data/copy';
import { showOpening } from '../../../src/ui/screens/opening';
import { introSeen, markIntroSeen, resetOnboardingSettings, setTutorial, tutorialOn } from '../../../src/ui/onboarding/settings';
import { FAKE_CLOCK, key, preferReducedMotion } from '../setup';

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const stage = () => document.querySelector('.opening .op-stage')!;

beforeAll(() => preferReducedMotion(true));
beforeEach(() => {
  localStorage.clear();
  resetOnboardingSettings();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('onboarding settings', () => {
  it('tutorial tips are on by default, and turning them off is remembered', () => {
    expect(tutorialOn()).toBe(true);
    setTutorial(false);
    expect(tutorialOn()).toBe(false);
    expect(localStorage.getItem('takeoff.tutorial')).toBe('off');
    resetOnboardingSettings();
    expect(tutorialOn()).toBe(false); // read back from storage
    setTutorial(true);
    resetOnboardingSettings();
    expect(tutorialOn()).toBe(true);
  });

  it('blocked storage: first-visit defaults, and the setting still lasts for the page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(tutorialOn()).toBe(true);
    expect(introSeen()).toBe(false);
    setTutorial(false);
    markIntroSeen();
    expect(tutorialOn()).toBe(false);
    expect(introSeen()).toBe(true);
  });
});

describe('the introduction', () => {
  it('has exactly two screens from the copy, walked with Enter and the arrows; Escape skips to Q1', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    expect(INTRO).toHaveLength(2);
    const done = showOpening();
    expect(text(stage().querySelector('.title-sub'))).toBe('Middle Power');
    expect(document.activeElement?.matches('[data-go="next"]')).toBe(true);
    (document.activeElement as HTMLElement).blur();
    key('Enter');
    expect(text(stage().querySelector('h2'))).toBe(INTRO[0].title);
    expect(document.activeElement?.tagName).toBe('H2');
    expect(stage().querySelector('.op-steps')!.getAttribute('aria-label')).toBe('Step 1 of 2');
    expect([...stage().querySelectorAll('.op-body')].map(text)).toEqual(INTRO[0].paragraphs);
    key('ArrowRight');
    expect(text(stage().querySelector('h2'))).toBe(INTRO[1].title);
    // your role: the two currencies and the steps of a quarter
    expect(stage().querySelectorAll('.cur')).toHaveLength(2);
    expect(stage().querySelectorAll('.loop li')).toHaveLength(5);
    expect(text(stage().querySelector('[data-go="next"]'))).toBe('Start the first quarter Enter');
    key('ArrowLeft');
    expect(text(stage().querySelector('h2'))).toBe(INTRO[0].title);
    key('Escape');
    await done;
    expect(introSeen()).toBe(true);
    await vi.advanceTimersByTimeAsync(450);
    expect(document.querySelector('.opening')).toBeNull();
  });

  it('the last screen starts the game; no jargon before a tip explains it', async () => {
    for (const s of INTRO) expect(`${s.title} ${s.paragraphs.join(' ')}`).not.toMatch(/\balignment\b/i);
    const done = showOpening();
    key('ArrowRight');
    key('ArrowRight');
    document.querySelector<HTMLElement>('.opening [data-go="next"]')!.click();
    await done;
  });

  it('the tutorial switch on the title screen sets the tutorial, and keys on it do not turn the page', async () => {
    const done = showOpening();
    const box = stage().querySelector<HTMLInputElement>('#op-tutorial')!;
    expect(box.checked).toBe(true);
    box.focus();
    key('Enter');
    key('ArrowRight');
    expect(stage().classList.contains('title')).toBe(true);
    box.click();
    expect(tutorialOn()).toBe(false);
    key('Escape');
    await done;
  });

  it('a returning player starts on "Skip to Q1"', async () => {
    markIntroSeen();
    const done = showOpening();
    expect(document.activeElement?.matches('[data-go="skip"]')).toBe(true);
    expect(text(stage().querySelector('.op-welcome'))).toBe('Welcome back.');
    (document.activeElement as HTMLElement).click();
    await done;
  });

  it('every slide offers Skip to Q1, and Tab stays inside the introduction', async () => {
    const done = showOpening();
    key('ArrowRight');
    expect(text(stage().querySelector('[data-go="skip"]'))).toBe('Skip to Q1');
    const buttons = [...stage().querySelectorAll<HTMLElement>('button, a[href]')];
    buttons[buttons.length - 1].focus();
    key('Tab');
    expect(document.activeElement).toBe(buttons[0]);
    stage().querySelector<HTMLElement>('[data-go="skip"]')!.click();
    await done;
  });
});
