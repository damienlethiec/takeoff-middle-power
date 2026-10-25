// @vitest-environment happy-dom
// Accessibility behaviour: dialogs (name, focus in, trap, inert page, focus back), the live region,
// the map's buttons and text alternative, chips and cards described in words.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { announce, focusOwnsKey, flush } from '../../src/ui/a11y';
import { chip, deltaWords } from '../../src/ui/format';
import { WorldMap } from '../../src/ui/map';
import { modalOpen, openModal } from '../../src/ui/modal';
import { showDecision } from '../../src/ui/screens/decision';
import { engine } from '../../src/engine/index';
import { craft } from '../helpers';
import { installV2Fixtures } from './fixtures';
import { FAKE_CLOCK, key, openModalEl, preferReducedMotion, sleep } from './setup';

beforeAll(() => preferReducedMotion(true));
afterEach(async () => {
  openModalEl()?.querySelector<HTMLElement>('[data-close], [data-action]')?.click();
  await sleep(60);
  document.body.innerHTML = '';
});

const tab = (shift = false) => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true }));

describe('dialogs', () => {
  const body = `<div class="dateline">Q1 2027 · Briefing</div><h2>Offer to host verification</h2><p class="d">What moved</p>
    <button data-action="a">A</button><button data-action="ok" data-primary>OK</button><button data-action="x" data-close>Close</button>`;

  it('are named by their dateline and heading, and described by the content asked for', () => {
    const m = openModal(body, { label: 'Briefing', describedBy: '.d' });
    const ids = m.el.getAttribute('aria-labelledby')!.split(' ');
    expect(ids.map((i) => document.getElementById(i)!.textContent)).toEqual(['Q1 2027 · Briefing', 'Offer to host verification']);
    expect(m.el.getAttribute('aria-label')).toBe('Briefing'); // kept as a fallback name
    expect(document.getElementById(m.el.getAttribute('aria-describedby')!)!.textContent).toBe('What moved');
    expect(m.el.querySelector('.sr-live[aria-live="polite"]')).not.toBeNull();
  });

  it('make the page behind inert, trap Tab, and give focus back to the opener when the last one closes', async () => {
    const page = document.body.appendChild(document.createElement('div'));
    page.innerHTML = '<button id="opener">Open</button>';
    const opener = page.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    const m = openModal(body);
    await sleep(40);
    expect(page.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(m.el.querySelector('[data-primary]'));
    const [a, , close] = m.el.querySelectorAll<HTMLButtonElement>('button');
    close.focus();
    tab();
    expect(document.activeElement).toBe(a); // wraps from the last control to the first
    tab(true);
    expect(document.activeElement).toBe(close); // and back
    opener.focus(); // focus that escaped is pulled back in
    tab();
    expect(m.el.contains(document.activeElement)).toBe(true);
    close.click();
    expect(page.hasAttribute('inert')).toBe(false);
    await sleep(80);
    expect(modalOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('a chain of dialogs returns focus to where the first one was opened from', async () => {
    const opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
    const a = openModal(body);
    await sleep(20);
    a.el.querySelector<HTMLElement>('[data-primary]')!.click();
    const b = openModal(body); // the next pause opens straight away
    await sleep(60);
    expect(b.el.contains(document.activeElement)).toBe(true);
    b.el.querySelector<HTMLElement>('[data-primary]')!.click();
    await sleep(80);
    expect(document.activeElement).toBe(opener);
  });
});

describe('the live region', () => {
  it('batches messages said together, once each, and uses the open dialog’s own region', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    try {
      announce('Paused.');
      announce('Paused.');
      announce('+1 Political Capital.');
      await vi.advanceTimersByTimeAsync(200);
      const page = document.querySelector('body > .sr-live')!;
      expect(page.getAttribute('aria-live')).toBe('polite');
      expect(page.lastElementChild!.textContent).toBe('Paused. +1 Political Capital.');
      const m = openModal('<h2>Your decision</h2><button data-action="x" data-close>x</button>');
      announce('Selected: AI Office capacity.');
      flush();
      expect(m.el.querySelector('.sr-live')!.textContent).toBe('Selected: AI Office capacity.');
      m.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shortcuts leave Space and Enter to a focused control', () => {
    const b = document.body.appendChild(document.createElement('button'));
    b.focus();
    expect(focusOwnsKey(' ')).toBe(true);
    expect(focusOwnsKey('Enter')).toBe(true);
    expect(focusOwnsKey('p')).toBe(false);
    b.blur();
    expect(focusOwnsKey(' ')).toBe(false);
  });
});

describe('the map', () => {
  it('is a group with a text summary of tension, partners, labs and pinned events', () => {
    const box = document.body.appendChild(document.createElement('div'));
    const m = new WorldMap(box);
    expect(m.svg.getAttribute('role')).toBe('group');
    m.update({ capability: 52, tension: 63, verification: 10, coalition: 2, publicPressure: 30, misuse: 35 });
    m.addEventPin('cn', 'Weight theft', 'Q3 2028', () => {});
    const summary = document.getElementById(m.svg.getAttribute('aria-describedby')!)!;
    expect(summary.textContent).toBe(
      'US–China tension 63 out of 100, high. Standing with Europe: UK, Norway and Canada. Not yet: Japan and Korea. ' +
        'The labs, OpenBrain in the US and DeepCent in China, are at capability 52. Public pressure 30: protests in 2 European cities. ' +
        'Misuse risk 35: 2 AI-enabled attacks on the map. Events pinned on the map: Weight theft (China, Q3 2028).',
    );
    // the drawing itself is hidden from screen readers; only pins and bubbles are exposed
    expect(m.svg.querySelector('.m-land')!.getAttribute('aria-hidden')).toBe('true');
    expect(new WorldMap(box, { decorative: true }).svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('Léa’s button, event pins and bubbles are keyboard buttons; Space works and does not reach the page', () => {
    const box = document.body.appendChild(document.createElement('div'));
    const onBubble = vi.fn();
    const m = new WorldMap(box, { onBubble });
    const onLea = vi.fn();
    m.onLea = onLea;
    const pageKeys = vi.fn();
    document.addEventListener('keydown', pageKeys);
    // Léa: a real <button> with her name in it (label in name)
    const lea = box.querySelector<HTMLButtonElement>('button.lea-btn')!;
    expect(lea.getAttribute('aria-label')).toMatch(/^Léa/);
    expect(lea.textContent).toContain('Léa');
    lea.click();
    expect(onLea).toHaveBeenCalledTimes(1);
    const open = vi.fn();
    m.addEventPin('us', 'Opaque reasoning', 'Q1 2029', open);
    const pin = m.svg.querySelector<SVGGElement>('.evpin')!;
    expect([pin.getAttribute('role'), pin.getAttribute('aria-label')]).toEqual(['button', 'Opaque reasoning, Q1 2029']);
    key('Enter', pin);
    expect(open).toHaveBeenCalledTimes(1);
    key(' ', pin);
    expect(open).toHaveBeenCalledTimes(2);
    expect(pageKeys).not.toHaveBeenCalled();
    m.spawnBubble('b1', 'eu');
    m.spawnBubble('b2', 'cn');
    const [b1, b2] = m.svg.querySelectorAll<SVGGElement>('.bubble');
    expect(b1.getAttribute('aria-label')).toBe('Public concern in Europe: read what worries people');
    expect(m.liveBubbles()).toEqual(['b1', 'b2']);
    // a focused bubble that goes away hands focus on to the next one, then to the map
    b1.focus();
    m.popBubble('b1');
    expect(document.activeElement).toBe(b2);
    expect(b1.hasAttribute('tabindex')).toBe(false);
    m.popBubble('b2');
    expect(document.activeElement).toBe(m.svg);
    document.removeEventListener('keydown', pageKeys);
  });
});

describe('words, not colour alone', () => {
  it('chips are named with the change and whether it helps you', () => {
    const div = document.createElement('div');
    div.innerHTML = chip({ key: 'tension', amount: 5 }) + chip({ key: 'misuse', amount: -20 }) + chip({ key: 'capability', amount: 3 });
    expect([...div.querySelectorAll('.chip')].map((c) => [c.getAttribute('role'), c.getAttribute('aria-label')])).toEqual([
      ['img', '+5 Tension, bad for you'],
      ['img', '−20 Misuse risk, good for you'],
      ['img', '+3 Capability'],
    ]);
    expect(deltaWords({ key: 'pc', amount: -2 })).toBe('−2 Political Capital, bad for you');
  });

  it('cards: locked ones say so, costs name their currency, the odds chart reads as text, options move with the arrows', async () => {
    // capability 30+ so ASML (and its options) is available; tension 75 locks the coalition
    const s = engine.startQuarter(craft({ quarter: 3, pc: 1, budget: 2, gauges: { capability: 32, tension: 75 }, flags: { exportControls: true } }));
    void showDecision(engine, s);
    const m = openModalEl()!;
    const locked = m.querySelector<HTMLElement>('.pcard.locked')!;
    expect(locked.textContent).toContain('Locked:');
    expect(locked.getAttribute('aria-pressed')).toBe('false');
    expect(m.querySelector('.pcard[data-card="host_verification"] .cost')!.textContent!.replace(/\s+/g, ' ')).toContain('Budget');
    m.querySelector<HTMLElement>('.pcard[data-card="host_verification"]')!.click();
    expect(m.querySelector('.pcard[data-card="host_verification"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(m.querySelector('.oc-row')!.getAttribute('aria-label')).toMatch(/^Verified slowdown: \d+% now, \d+% after/);
    // a locked card shows why, not a preview of the odds (B5)
    locked.click();
    expect(m.querySelector('.pv-lock')!.textContent).toContain('Not available now.');
    expect(m.querySelector('.preview .oc-row')).toBeNull();
    expect(m.querySelector<HTMLButtonElement>('.dec-bar [data-primary]')!.disabled).toBe(true);
    m.querySelector<HTMLElement>('[data-action="pass"]')!.click();
    await sleep(60);
    void showDecision(engine, engine.startQuarter(craft({ quarter: 3, pc: 0, budget: 0, gauges: { capability: 40 } })));
    const m2 = openModalEl()!;
    m2.querySelector<HTMLElement>('.pcard[data-card="asml"]')!.click();
    const opts = () => [...m2.querySelectorAll<HTMLElement>('.opt')];
    opts()[0].focus();
    key('ArrowRight', opts()[0]);
    expect(opts()[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(opts()[1]); // focus stays on the choice after the preview redraws
    expect(opts().map((o) => o.getAttribute('tabindex'))).toEqual(['-1', '0']);
    // an unaffordable card says how far off it is, in words
    expect(m2.querySelector('.pcard[data-card="coalition"] .st.short')!.textContent).toMatch(/^(Affordable next quarter|Needs \d+ more (Budget|PC)( and \d+ more PC)?)$/);
    m2.querySelector<HTMLElement>('[data-action="pass"]')!.click();
  });

  it('the decision: Confirm and Pass in a bar after the preview, a risk highlights its cards and says so', async () => {
    const restore = installV2Fixtures(engine);
    try {
      const s = engine.startQuarter(craft({ quarter: 3, pc: 1, budget: 2 }));
      void showDecision(engine, s);
      const m = openModalEl()!;
      const bar = m.querySelector('.dec-bar')!;
      expect([...bar.querySelectorAll('button')].map((b) => b.dataset.action)).toEqual(['map', 'pass', 'confirm']);
      expect(m.querySelector('.preview')!.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const theft = m.querySelector<HTMLButtonElement>('.risk-tg[data-risk="weight_theft"]')!;
      expect(theft.textContent).toContain('not prepared'); // in words, not only a cross
      theft.click();
      expect(theft.getAttribute('aria-pressed')).toBe('true');
      expect([...m.querySelectorAll<HTMLElement>('.pcard.prep-hi')].map((c) => c.dataset.card)).toEqual(['weight_security']);
      flush();
      expect(m.querySelector('.sr-live')!.textContent).toContain('1 card prepares for Model theft: Weight security standards.');
      theft.click();
      expect(m.querySelectorAll('.pcard.prep-hi')).toHaveLength(0);
      // the advisor's pick is marked in words
      expect(m.querySelector('.pcard.recommended .pbadge.pick')!.textContent).toBe('Advisor’s pick');
      m.querySelector<HTMLElement>('[data-action="pass"]')!.click();
    } finally {
      restore();
    }
  });
});
