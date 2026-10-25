// @vitest-environment happy-dom
// Onboarding screens on their own: notices (act transitions, toasts), tips (dialog and coach mark),
// the journal and Léa's letters.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { JournalEntry, Notice, SituationReport } from '../../../src/engine/types';
import { ACTS } from '../../../src/data/copy';
import { flush } from '../../../src/ui/a11y';
import { modalOpen } from '../../../src/ui/modal';
import { openJournal } from '../../../src/ui/onboarding/journal';
import { deliveredLetters, showLeaHistory } from '../../../src/ui/onboarding/lea-history';
import { noticeLine, planNotices, showActTransition, showToasts } from '../../../src/ui/onboarding/notices';
import type { DeliveredLetter } from '../../../src/ui/onboarding/reads';
import { coachMarkShown, hideCoachMark, showCoachMark, showTipDialog } from '../../../src/ui/onboarding/tips';
import { BAD_TEXT, key, openModalEl, preferReducedMotion, sleep } from '../setup';

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const live = () => [...document.querySelectorAll('.sr-live')].map((r) => r.textContent).join(' ');

beforeAll(() => preferReducedMotion(true));
afterEach(async () => {
  for (let i = 0; i < 3 && modalOpen(); i++) {
    openModalEl()?.querySelector<HTMLElement>('[data-escape], [data-action]')?.click();
    await sleep(1);
  }
  hideCoachMark();
  document.body.innerHTML = '';
});

const N = {
  act2: { kind: 'act', id: '2', title: 'The race goes public', text: 'x' },
  act1: { kind: 'act', id: '1', title: 'A seat at the table', text: 'x' },
  card: { kind: 'card_unlocked', id: 'coalition', title: 'Middle-power coalition', text: 'Unlocked because partners are calling Brussels.' },
  ind: { kind: 'indicator', id: 'publicPressure', title: 'Public pressure', text: 'Layoffs made safety political.' },
  shock: { kind: 'employment_shock', id: 'capability_40', title: 'A wave of AI layoffs', text: 'Jobs are cut.' },
  thr: { kind: 'threshold', id: 'tension_60', title: 'Tension passed 60', text: 'The race speeds up.' },
  tip: { kind: 'tip', id: 'tip_clock', title: 'x', text: 'x' },
} satisfies Record<string, Notice>;

describe('notices', () => {
  it('at most one blocking screen per quarter: an act (from act 2), else an employment shock', () => {
    expect(planNotices([N.card, N.act2, N.ind, N.shock])).toEqual({ blocking: N.act2, folded: [N.card, N.ind, N.shock], toasts: [] });
    expect(planNotices([N.card, N.shock, N.thr])).toEqual({ blocking: N.shock, folded: [], toasts: [N.card, N.thr] });
    // act 1 opens the game with a toast, not a screen: the first decision comes fast
    expect(planNotices([N.act1, N.card])).toEqual({ blocking: null, folded: [], toasts: [N.act1, N.card] });
    // tips come through engine.tip(), not as notices
    expect(planNotices([N.tip])).toEqual({ blocking: null, folded: [], toasts: [] });
  });

  it('an act transition: the act title and beat from the copy, what is new, then Continue', async () => {
    const done = showActTransition(N.act2, 'Q3 2027', [N.ind, N.card]);
    const m = openModalEl()!;
    expect(m.classList.contains('ob-act')).toBe(true);
    expect(text(m.querySelector('.dateline'))).toBe('Q3 2027 · Act 2 of 3');
    expect(text(m.querySelector('h2'))).toBe(ACTS[1].title);
    expect(text(m.querySelector('.ob-beat'))).toBe(ACTS[1].beat);
    expect([...m.querySelectorAll('.ob-news li')].map(text)).toEqual([
      'New indicator Public pressure Layoffs made safety political.',
      'New card Middle-power coalition Unlocked because partners are calling Brussels.',
    ]);
    expect(m.getAttribute('aria-labelledby')).toBeTruthy();
    key('Enter');
    await done;
    expect(modalOpen()).toBe(false);
  });

  it('toasts are visual only, and all of them are announced once, politely, in one message', async () => {
    showToasts([N.card, N.ind, N.thr]);
    const host = document.querySelector('.ob-toasts')!;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.children).toHaveLength(3);
    expect(host.lastElementChild!.classList.contains('alert')).toBe(true);
    flush();
    const said = live();
    expect(said).toBe([N.card, N.ind, N.thr].map(noticeLine).join(' '));
    expect(said).toContain('New card: Middle-power coalition. Unlocked because partners are calling Brussels.');
    expect(said).toContain('New indicator: Public pressure.');
    expect(document.querySelector('.sr-live')!.getAttribute('aria-live')).toBe('polite');
  });
});

describe('tips', () => {
  it('a tip dialog: one screen, labelled, Got it (Enter or Escape) closes it', async () => {
    const done = showTipDialog({ id: 'tip_decision', title: 'One decision per quarter', text: 'Pick one card.\n\nOr pass.' });
    const m = openModalEl()!;
    expect(m.classList.contains('ob-tip')).toBe(true);
    expect(text(m.querySelector('h2'))).toBe('One decision per quarter');
    expect(m.querySelectorAll('.ob-tip-text')).toHaveLength(2);
    expect(m.querySelector('#ob-tip-tutorial')).not.toBeNull();
    key('Escape');
    await done;
  });

  it('a coach mark sits after what it explains, is announced, and Got it gives focus back', () => {
    const anchor = document.createElement('div');
    anchor.className = 'clockctl';
    anchor.innerHTML = '<button id="play">Pause</button>';
    document.body.appendChild(anchor);
    showCoachMark({ id: 'tip_clock', title: 'The clock', text: 'Press Space to pause.' }, anchor);
    const c = document.querySelector<HTMLElement>('.ob-coach')!;
    expect(anchor.nextElementSibling).toBe(c);
    expect(c.getAttribute('role')).toBe('note');
    expect(document.querySelector('.overlay')).toBeNull(); // not modal
    flush();
    expect(live()).toContain('Tip: The clock. Press Space to pause.');
    c.querySelector<HTMLButtonElement>('button')!.focus();
    c.querySelector<HTMLButtonElement>('button')!.click();
    expect(coachMarkShown()).toBe(false);
    expect(document.activeElement?.id).toBe('play');
  });
});

const report = (q: number): SituationReport => ({
  quarter: q,
  dateLabel: `Q${q} 2027`,
  changes: [{ key: 'tension', label: 'Tension', delta: 3, cause: 'China accused OpenBrain' }],
  why: ['The race heats up.'],
  forecast: { mostLikely: 'race', probability: 0.5, sentence: '', whatWouldHelp: '' },
  newNews: 1,
  newNotes: { total: 0, readable: 0 },
  lea: null,
  headline: q === 2 ? [{ key: 'tension', label: 'Tension', value: 58, delta: 4, cause: 'China accused OpenBrain of espionage', kind: 'actor' }] : [],
  background: q === 2 ? 'Background: capability +4.' : '',
  risksMoved: [],
  trajectoryChange: null,
});
const entry = (q: number, over: Partial<JournalEntry> = {}): JournalEntry => ({
  quarter: q,
  dateLabel: `Q${q} 2027`,
  report: report(q),
  decision: q === 1 ? { cardId: 'ai_office', title: 'AI Office capacity' } : { cardId: null, title: 'You passed' },
  events: q === 2 ? [{ id: 'weight_theft', title: 'Weight theft', prepared: false }] : [],
  lea: q === 1 ? { slot: 'q1', variant: 'a', text: 'Hey you, congrats on the new job!', quarter: 1 } : null,
  tips: q === 1 ? [{ id: 'tip_clock', title: 'The clock', text: 'It runs.' }] : [],
  ...over,
});

describe('the journal', () => {
  it('one tab per finished quarter (latest selected), with the report, decision, events, letter and tips', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const done = openJournal([entry(1), entry(2)], { tipsShown: ['tip_clock', 'tip_decision'], current: 'Q3 2027' });
    await sleep(20);
    const m = openModalEl()!;
    expect(m.classList.contains('ob-journal')).toBe(true);
    const tabs = [...m.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map(text)).toEqual(['Q1 2027', 'Q2 2027', 'Tips']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(tabs[1]);
    const panel = m.querySelector<HTMLElement>('[role="tabpanel"]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[1].id);
    // the v2 report: absolute levels with their cause, background folded
    expect(text(panel)).toContain('Tension 58 (+4): China accused OpenBrain of espionage');
    expect(text(panel)).toContain('Background: capability +4.');
    expect(text(panel)).toContain('You passed');
    expect(text(panel)).toContain('Weight theft: you were not prepared');
    // arrows move between quarters, Home and End jump
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(tabs[0]);
    expect(text(panel)).toContain('Tension +3: China accused OpenBrain');
    expect(text(panel)).toContain('AI Office capacity');
    expect(text(panel)).toContain('Hey you, congrats on the new job!');
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(tabs[2]);
    expect(text(panel)).toContain('The clock');
    tabs[2].click();
    expect(m.textContent).not.toMatch(BAD_TEXT);
    key('Escape');
    await done;
    await sleep(60);
    expect(document.activeElement).toBe(opener);
  });

  it('before the first quarter ends: an empty state, and Close', async () => {
    const done = openJournal([], { tipsShown: [] });
    const m = openModalEl()!;
    expect(m.querySelector('[role="tablist"]')).toBeNull();
    expect(text(m.querySelector('.ob-empty'))).toMatch(/fills in as quarters end/);
    m.querySelector<HTMLElement>('[data-primary]')!.click();
    await done;
  });
});

describe("Léa's letters", () => {
  const L = (quarter: number, slot: DeliveredLetter['slot'], t = `letter ${quarter}`): DeliveredLetter => ({ quarter, slot, variant: 'a', text: t });

  it('only delivered letters, oldest first, each once; the current quarter once its pop-up showed', () => {
    const all = [L(6, 'q6'), L(1, 'q1'), L(6, 'q6'), L(11, 'q11')];
    expect(deliveredLetters(all, 6, false).map((l) => l.quarter)).toEqual([1]);
    expect(deliveredLetters(all, 6, true).map((l) => l.quarter)).toEqual([1, 6]);
    expect(deliveredLetters(all, 12, false).map((l) => l.quarter)).toEqual([1, 6, 11]);
    expect(deliveredLetters([], 3, true)).toEqual([]);
  });

  it('the history: every letter labelled by its quarter; an empty state before the first', async () => {
    let done = showLeaHistory([L(1, 'q1', 'Congrats!'), L(6, 'q6', 'Post-editors.')], (q) => `Q${q}`);
    let m = openModalEl()!;
    expect(m.classList.contains('lea')).toBe(true);
    const letters = [...m.querySelectorAll('.ob-letters article')];
    expect(letters.map((a) => text(a.querySelector('small')))).toEqual(['Lyon · Q1', 'Lyon · Q6']);
    expect(letters.map((a) => text(a.querySelector('p')))).toEqual(['Congrats!', 'Post-editors.']);
    expect(letters[0].getAttribute('aria-labelledby')).toBeTruthy();
    key('Escape');
    await done;
    done = showLeaHistory([], (q) => `Q${q}`);
    m = openModalEl()!;
    expect(text(m.querySelector('.ob-lea-empty'))).toBe('Léa lives in Lyon. She will write to you soon.');
    key('Enter');
    await done;
  });
});
