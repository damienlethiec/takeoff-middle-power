// Accessibility helpers: a polite live region, focus utilities, reduced motion, and keyboard-shortcut rules.

/** True when the player asked the system for less motion. */
export const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Elements Tab can reach inside `root`, in DOM order, skipping hidden ones. */
export function tabbables(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[hidden], [inert]') && (typeof el.checkVisibility === 'function' ? el.checkVisibility() : true),
  );
}

/** Focus `el` if it can take focus; returns whether it did. */
export function tryFocus(el: Element | null | undefined): boolean {
  if (!el || !(el as HTMLElement).isConnected) return false;
  (el as HTMLElement).focus?.({ preventScroll: true });
  return document.activeElement === el;
}

/**
 * Whether a key press belongs to the focused control rather than to a game shortcut:
 * Space and Enter activate buttons and links, and text fields take every key.
 */
export function focusOwnsKey(key: string): boolean {
  const a = document.activeElement as HTMLElement | null;
  if (!a || a === document.body) return false;
  if (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
  const control = a.matches('button, a[href], summary, [role="button"], [role="radio"], [role="checkbox"], [role="link"], [role="menuitem"], [role="tab"]');
  return control && (key === ' ' || key === 'Enter');
}

// ---------------------------------------------------------------- single-key shortcuts setting
// WCAG 2.1.4: single-character shortcuts (J, ?) can be turned off in Help. Space, Enter and Escape always work.

const SHORTCUTS_KEY = 'takeoff.singleKeyShortcuts';
export function singleKeyShortcuts(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_KEY) !== 'off';
  } catch {
    return true;
  }
}
export function setSingleKeyShortcuts(on: boolean) {
  try {
    localStorage.setItem(SHORTCUTS_KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked: the setting lasts for this page only */
  }
  shortcutsOverride = on;
}
let shortcutsOverride: boolean | null = null;
export const shortcutsOn = () => shortcutsOverride ?? singleKeyShortcuts();

// ---------------------------------------------------------------- live region

let pending: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** The polite live region in use: the open dialog's own (screen readers ignore content outside a modal), else the page's. */
function region(): HTMLElement {
  const inModal = [...document.querySelectorAll<HTMLElement>('.overlay:not(.leaving):not([inert]) .modal .sr-live')].at(-1);
  if (inModal) return inModal;
  let r = document.querySelector<HTMLElement>('body > .sr-live');
  if (!r) {
    r = liveRegion();
    document.body.appendChild(r);
  }
  return r;
}

/** An empty polite live region (it must exist before text is added to it, or it is not announced). */
export function liveRegion(): HTMLElement {
  const r = document.createElement('div');
  r.className = 'sr-live sr-only a11y-keep';
  r.setAttribute('aria-live', 'polite');
  r.setAttribute('aria-atomic', 'false');
  return r;
}

/**
 * Tell screen-reader users about a change they cannot see, politely. Messages sent within a moment of
 * each other are read as one, and a message repeated in the same batch is read once.
 */
export function announce(text: string) {
  const t = text.trim();
  if (!t) return;
  if (!pending.includes(t)) pending.push(t);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 150);
}

/** Write the queued messages now (used before a dialog opens or closes, so they land in the right region). */
export function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!pending.length) return;
  const r = region();
  const p = document.createElement('p');
  p.textContent = pending.join(' ');
  pending = [];
  r.appendChild(p);
  while (r.childElementCount > 4) r.firstElementChild!.remove();
}
