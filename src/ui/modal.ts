// One overlay at a time. Buttons carrying data-action resolve the modal's promise.
// Enter clicks [data-primary] (unless a control already has focus), Escape clicks [data-escape].
// Accessibility: each modal is a dialog labelled by its dateline and heading, focus moves in when it opens,
// Tab is trapped inside, the page behind is inert, and focus returns where it was once the last dialog closes.

import { flush, liveRegion, reducedMotion, tabbables, tryFocus } from './a11y';

export interface ModalHandle {
  el: HTMLElement;
  overlay: HTMLElement;
  result: Promise<string>;
  close(): void;
}

let current: ModalHandle | null = null;
export const modalOpen = () => current !== null;

/** Where focus was before the first dialog of a chain opened (report → decision → briefing...). */
let opener: HTMLElement | null = null;
let fallback: (() => HTMLElement | null) | null = null;
let ids = 0;
const inerted = new Set<Element>();

/** Where focus goes when a dialog closes and the element that opened it is gone. */
export function setFocusFallback(fn: () => HTMLElement | null) {
  fallback = fn;
}

document.addEventListener('keydown', (ev) => {
  if (!current) return;
  const active = document.activeElement as HTMLElement | null;
  if (ev.key === 'Enter') {
    if (active && (active.tagName === 'BUTTON' || active.tagName === 'A' || active.tagName === 'INPUT') && current.el.contains(active)) return;
    const p = current.el.querySelector<HTMLButtonElement>('[data-primary]:not(:disabled)');
    if (p) {
      ev.preventDefault();
      p.click();
    }
  } else if (ev.key === 'Escape') {
    const x = current.el.querySelector<HTMLButtonElement>('[data-escape]');
    if (x) {
      ev.preventDefault();
      x.click();
    }
  } else if (ev.key === 'Tab') {
    // keep Tab inside the dialog
    const list = tabbables(current.el);
    const first = list[0];
    const last = list[list.length - 1];
    if (!first) {
      ev.preventDefault();
      current.el.focus({ preventScroll: true });
    } else if (!active || !current.el.contains(active)) {
      ev.preventDefault();
      (ev.shiftKey ? last : first).focus();
    } else if (ev.shiftKey && (active === first || active === current.el)) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && active === last) {
      ev.preventDefault();
      first.focus();
    }
  }
});

function makeInert(keep: Element) {
  for (const c of document.body.children) {
    if (c === keep || c.classList.contains('a11y-keep') || c.hasAttribute('inert')) continue;
    c.setAttribute('inert', '');
    inerted.add(c);
  }
}
function releaseInert() {
  for (const c of inerted) c.removeAttribute('inert');
  inerted.clear();
}

/** Once no dialog has reopened, give focus back to where it was (or to the fallback). */
function restoreFocus() {
  setTimeout(() => {
    if (current) return;
    const a = document.activeElement as HTMLElement | null;
    const lost = !a || a === document.body || !!a.closest('.overlay') || !a.isConnected;
    if (lost && !tryFocus(opener)) tryFocus(fallback?.());
    opener = null;
  }, 40);
}

/** Label the dialog by its dateline and heading when it has them; `label` stays as a fallback name. */
function labelFromHeading(el: HTMLElement) {
  const parts = [el.querySelector<HTMLElement>('.dateline'), el.querySelector<HTMLElement>('h1, h2')].filter((x): x is HTMLElement => !!x);
  if (!parts.some((p) => p.matches('h1, h2'))) return;
  const n = ++ids;
  const refs = parts.map((p, i) => (p.id ||= `dlg${n}-${i}`));
  el.setAttribute('aria-labelledby', refs.join(' '));
}

export function openModal(
  html: string,
  opts: { cls?: string; overlayCls?: string; label?: string; keep?: boolean; describedBy?: string } = {},
): ModalHandle {
  flush();
  const prev = document.activeElement as HTMLElement | null;
  if (!current && prev && prev !== document.body && !prev.closest('.overlay')) opener = prev;
  current?.close();
  const overlay = document.createElement('div');
  overlay.className = `overlay ${opts.overlayCls ?? ''}`;
  const el = document.createElement('div');
  el.className = `modal ${opts.cls ?? ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (opts.label) el.setAttribute('aria-label', opts.label);
  el.tabIndex = -1;
  el.innerHTML = html;
  labelFromHeading(el);
  if (opts.describedBy) {
    // what a screen reader reads after the dialog's name when it opens
    const refs = [...el.querySelectorAll<HTMLElement>(opts.describedBy)].map((d) => (d.id ||= `dlg${++ids}-d`));
    if (refs.length) el.setAttribute('aria-describedby', refs.join(' '));
  }
  // screen readers ignore live regions outside an open modal, so each dialog has its own
  el.appendChild(liveRegion());
  overlay.appendChild(el);
  document.body.appendChild(overlay);
  makeInert(overlay);
  let resolve!: (v: string) => void;
  const result = new Promise<string>((r) => (resolve = r));
  const handle: ModalHandle = {
    el,
    overlay,
    result,
    close() {
      if (overlay.classList.contains('leaving')) return;
      overlay.classList.add('leaving');
      overlay.setAttribute('inert', '');
      setTimeout(() => overlay.remove(), 180);
      if (current === handle) {
        current = null;
        // the page is usable again at once: what follows (the dock, the ending) may move focus into it
        releaseInert();
        restoreFocus();
      }
    },
  };
  el.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!b || !el.contains(b) || (b as HTMLButtonElement).disabled) return;
    const action = b.dataset.action!;
    if (!opts.keep && !b.hasAttribute('data-keep')) handle.close();
    resolve(action);
  });
  current = handle;
  requestAnimationFrame(() => {
    if (current !== handle) return;
    if (el.contains(document.activeElement) && document.activeElement !== el) return;
    // the autofocus or primary button when it can take focus (it may be disabled or not shown yet), else the dialog
    if (!tryFocus(el.querySelector('[data-autofocus]')) && !tryFocus(el.querySelector('[data-primary]'))) tryFocus(el);
  });
  return handle;
}

/** Resolve after ms, for staged animations. Respects reduced motion by shortening waits. */
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 120) : ms));
