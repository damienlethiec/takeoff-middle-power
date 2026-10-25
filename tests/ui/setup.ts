import type { vi } from 'vitest';

// Shared set-up for the UI tests (happy-dom): reduced motion, so staged animations wait at most 120 ms.

export function preferReducedMotion(on = true) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('prefers-reduced-motion: reduce'),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

export const key = (k: string, target: EventTarget = document) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The modal currently open (not the one leaving). */
export const openModalEl = () => document.querySelector<HTMLElement>('.overlay:not(.leaving) .modal');

export const BAD_TEXT = /undefined|NaN|\[object Object\]/;

/** Fake every clock the UI uses (timers, animation frames, performance.now, Date). Undo with vi.useRealTimers(). */
export const FAKE_CLOCK: NonNullable<Parameters<typeof vi.useFakeTimers>[0]> = {
  toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
};
