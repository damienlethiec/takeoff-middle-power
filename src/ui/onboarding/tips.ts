// Tutorial tips: at most one per quarter (the engine picks it with tip(); markTipShown records it).
// A tip that explains something on screen is a non-blocking coach mark next to it; any other tip is a
// single-screen dialog. Both are announced and can be dismissed from the keyboard.

import type { Tip } from '../../engine/types';
import { announce, tryFocus } from '../a11y';
import { esc } from '../format';
import { openModal } from '../modal';
import { bindTutorialToggles, tutorialToggleHtml } from './settings';

/** Tips that point at something on screen, and where it is. A missing anchor falls back to a dialog. */
export const COACH_ANCHORS: Record<string, string> = {
  tip_clock: '.clockctl',
  tip_trajectory: '.trajectory, [data-ob-anchor="trajectory"]',
  tip_risks: '.risks, [data-ob-anchor="risks"]',
};

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="ob-tip-text">${esc(p)}</p>`)
    .join('');

/** The anchor a tip should sit next to, if it is on screen. */
export function coachAnchor(tip: Tip, root: ParentNode = document): HTMLElement | null {
  const sel = COACH_ANCHORS[tip.id];
  if (!sel) return null;
  const el = root.querySelector<HTMLElement>(sel);
  return el && el.isConnected && !el.closest('[hidden]') ? el : null;
}

export async function showTipDialog(tip: Tip): Promise<void> {
  const m = openModal(
    `<div class="dateline">Tip</div>
     <h2>${esc(tip.title)}</h2>
     ${paragraphs(tip.text)}
     <div class="row-btns"><button class="btn-primary" data-primary data-escape data-action="ok">Got it <kbd>Enter</kbd></button></div>
     ${tutorialToggleHtml('ob-tip-tutorial', 'Show tutorial tips')}`,
    { cls: 'ob-tip', label: `Tip: ${tip.title}`, describedBy: '.ob-tip-text' },
  );
  bindTutorialToggles(m.el);
  await m.result;
}

let coach: { el: HTMLElement; off: () => void } | null = null;

/** A coach mark next to `anchor`: not modal, the game goes on; "Got it" or the next pause closes it. */
export function showCoachMark(tip: Tip, anchor: HTMLElement) {
  hideCoachMark();
  const el = document.createElement('div');
  el.className = 'ob-coach';
  el.setAttribute('role', 'note');
  el.setAttribute('aria-labelledby', 'ob-coach-h');
  el.innerHTML = `<p class="ob-coach-h" id="ob-coach-h"><span class="ob-coach-k">Tip</span> ${esc(tip.title)}</p>
    ${paragraphs(tip.text)}
    <button type="button" class="btn-quiet ob-coach-ok">Got it</button>`;
  // right after its anchor, so Tab reaches it next and a screen reader reads it in context
  anchor.after(el);
  const place = () => {
    const r = anchor.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    el.style.width = `${w}px`;
    el.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
    el.style.top = `${r.bottom + 10}px`;
    el.style.setProperty('--arrow', `${Math.max(16, Math.min(w - 16, r.left + r.width / 2 - parseFloat(el.style.left)))}px`);
  };
  place();
  window.addEventListener('resize', place);
  el.querySelector('button')!.addEventListener('click', () => hideCoachMark(true));
  coach = { el, off: () => window.removeEventListener('resize', place) };
  announce(`Tip: ${tip.title}. ${tip.text.replace(/\s+/g, ' ')}`);
}

/** Remove the coach mark; when it had focus, focus goes back to what it points at. */
export function hideCoachMark(refocus = false) {
  if (!coach) return;
  const { el, off } = coach;
  coach = null;
  off();
  const hadFocus = el.contains(document.activeElement);
  const anchor = el.previousElementSibling as HTMLElement | null;
  el.remove();
  if ((hadFocus || refocus) && !tryFocus(anchor?.querySelector<HTMLElement>('button:not(:disabled)'))) tryFocus(document.querySelector<HTMLElement>('#game-title'));
}

export const coachMarkShown = () => coach !== null;
