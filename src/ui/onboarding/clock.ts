// First decision fast: Q1's clock is shorter, a permanent cue says when the next decision comes, and
// "Skip to decision" fast-forwards the current quarter through the same steps (events still stop it,
// no extra rewards, uncollected concern bubbles are skipped).

import { announce } from '../a11y';

/** Q1 lasts 5 seconds instead of 10, so the first decision comes within a minute of pressing Start. */
export const FIRST_QUARTER_MS = 5_000;
/** A skipped quarter runs its remaining clock in at most this long (same steps, just faster). */
export const SKIP_MS = 1_200;

/** How long a full quarter's clock lasts right now. */
export function clockMs(quarter: number, skipping: boolean, baseMs: number): number {
  if (skipping) return SKIP_MS;
  return quarter === 1 ? FIRST_QUARTER_MS : baseMs;
}

export interface ClockStatus {
  /** The quarter's clock is on (between startQuarter and the situation report). */
  active: boolean;
  running: boolean;
  /** An event is on screen: the clock waits for it. */
  eventBusy: boolean;
  skipping: boolean;
}

export const SKIP_NOTE = 'Concern bubbles you have not clicked are skipped.';

/** The cue and the button, as a second line inside `host` (the date and quarter strip, next to the clock). */
export function mountClockCue(host: HTMLElement, onSkip: () => void): HTMLElement {
  host.querySelector('.ob-next')?.remove();
  const el = document.createElement('div');
  el.className = 'ob-next';
  el.innerHTML = `<p class="ob-next-l" id="ob-next-l"><span class="ob-next-k">Next decision</span> <b id="ob-next-when">end of quarter</b></p>
    <button type="button" class="btn-quiet ob-skip" id="ob-skip"><span class="ob-skip-t">Skip to decision</span> <small class="ob-skip-n">unclicked bubbles are skipped</small></button>`;
  host.appendChild(el);
  el.querySelector('button')!.addEventListener('click', onSkip);
  return el;
}

/** Keep the cue in step with the clock (cheap: writes only when something changed). */
export function updateClockCue(el: HTMLElement, st: ClockStatus) {
  const when = !st.active ? 'now' : st.skipping ? 'skipping ahead…' : 'end of quarter';
  const w = el.querySelector<HTMLElement>('#ob-next-when')!;
  if (w.textContent !== when) w.textContent = when;
  const btn = el.querySelector<HTMLButtonElement>('#ob-skip')!;
  const off = !st.active || st.skipping || st.eventBusy;
  if (btn.disabled !== off) btn.disabled = off;
  const title = st.skipping ? 'Skipping to the decision' : `Fast-forward to the end of this quarter. ${SKIP_NOTE}`;
  if (btn.title !== title) btn.title = title;
  el.classList.toggle('skipping', st.skipping);
}

/** Say what skipping does, once per press. */
export const announceSkip = () => announce(`Skipping to the decision. ${SKIP_NOTE} Events still stop the clock.`);
