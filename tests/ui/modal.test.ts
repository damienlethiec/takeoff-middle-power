// @vitest-environment happy-dom
// The overlay system (src/ui/modal.ts): one modal at a time, actions resolve, Enter and Escape shortcuts.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { modalOpen, openModal, wait } from '../../src/ui/modal';
import { FAKE_CLOCK, key, openModalEl, preferReducedMotion, sleep } from './setup';

beforeAll(() => preferReducedMotion(false));
afterEach(() => {
  openModalEl()?.querySelector<HTMLElement>('[data-close]')?.click();
  document.body.innerHTML = '';
});

const body = `<p>Hello</p>
  <button data-action="ok" data-primary>OK</button>
  <button data-action="no" data-escape>No</button>
  <button data-action="off" disabled>Off</button>
  <button data-action="stay" data-keep>Stay</button>
  <button data-action="x" data-close>Close</button>`;

describe('openModal', () => {
  it('opens an accessible dialog inside an overlay', () => {
    const m = openModal(body, { cls: 'report', overlayCls: 'ov-x', label: 'A report' });
    expect(modalOpen()).toBe(true);
    expect(m.overlay.className).toBe('overlay ov-x');
    expect(m.el.className).toBe('modal report');
    expect(m.el.getAttribute('role')).toBe('dialog');
    expect(m.el.getAttribute('aria-modal')).toBe('true');
    expect(m.el.getAttribute('aria-label')).toBe('A report');
    expect(document.body.contains(m.overlay)).toBe(true);
    m.close();
  });

  it('resolves with the clicked action and closes (the overlay leaves, then is removed)', async () => {
    const m = openModal(body);
    m.el.querySelector<HTMLElement>('[data-action="ok"]')!.click();
    await expect(m.result).resolves.toBe('ok');
    expect(modalOpen()).toBe(false);
    expect(m.overlay.classList.contains('leaving')).toBe(true);
    await sleep(200);
    expect(document.body.contains(m.overlay)).toBe(false);
  });

  it('ignores disabled buttons and clicks outside an action', async () => {
    const m = openModal(body);
    m.el.querySelector<HTMLElement>('[data-action="off"]')!.click();
    m.el.querySelector<HTMLElement>('p')!.click();
    expect(modalOpen()).toBe(true);
    m.el.querySelector<HTMLElement>('[data-action="x"]')!.click();
    await expect(m.result).resolves.toBe('x');
  });

  it('stays open for data-keep buttons or with the keep option', async () => {
    const m = openModal(body);
    m.el.querySelector<HTMLElement>('[data-action="stay"]')!.click();
    await expect(m.result).resolves.toBe('stay');
    expect(modalOpen()).toBe(true);
    m.close();
    const k = openModal(body, { keep: true });
    k.el.querySelector<HTMLElement>('[data-action="ok"]')!.click();
    await expect(k.result).resolves.toBe('ok');
    expect(modalOpen()).toBe(true);
    k.close();
    expect(modalOpen()).toBe(false);
  });

  it('Enter clicks the primary button, Escape the escape button', async () => {
    const a = openModal(body);
    key('Enter');
    await expect(a.result).resolves.toBe('ok');
    const b = openModal(body);
    key('Escape');
    await expect(b.result).resolves.toBe('no');
  });

  it('Enter leaves a focused button inside the modal alone (the browser clicks that one)', async () => {
    const m = openModal(body);
    const no = m.el.querySelector<HTMLButtonElement>('[data-action="no"]')!;
    no.focus();
    key('Enter');
    await sleep(10);
    expect(modalOpen()).toBe(true);
    m.close();
  });

  it('Enter does nothing when the primary button is disabled', async () => {
    const m = openModal('<button data-action="go" data-primary disabled>Go</button>');
    key('Enter');
    await sleep(10);
    expect(modalOpen()).toBe(true);
    m.close();
  });

  it('keys do nothing when no modal is open', () => {
    expect(modalOpen()).toBe(false);
    expect(() => key('Enter')).not.toThrow();
  });

  it('opening a modal closes the previous one', () => {
    const a = openModal(body);
    const b = openModal(body);
    expect(a.overlay.classList.contains('leaving')).toBe(true);
    expect(modalOpen()).toBe(true);
    expect(openModalEl()).toBe(b.el);
    b.close();
  });

  it('focuses [data-autofocus], else the primary button, on the next frame', async () => {
    const a = openModal('<button data-action="a">A</button><button data-action="b" data-autofocus>B</button>');
    await sleep(40);
    expect(document.activeElement).toBe(a.el.querySelector('[data-action="b"]'));
    a.close();
    const b = openModal(body);
    await sleep(40);
    expect(document.activeElement).toBe(b.el.querySelector('[data-primary]'));
    b.close();
  });
});

describe('wait', () => {
  it('waits the full time normally, at most 120 ms with reduced motion', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    try {
      let done = false;
      preferReducedMotion(false);
      void wait(250).then(() => (done = true));
      await vi.advanceTimersByTimeAsync(240);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(10);
      expect(done).toBe(true);
      preferReducedMotion(true);
      done = false;
      void wait(2000).then(() => (done = true));
      await vi.advanceTimersByTimeAsync(120);
      expect(done).toBe(true);
    } finally {
      preferReducedMotion(false);
      vi.useRealTimers();
    }
  });
});
