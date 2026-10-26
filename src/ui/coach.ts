// The tutorial: short coach marks, one at a time, each the first time its part of the screen matters.
// Each is a small dialog placed next to what it explains (focus moves in, Escape or Enter closes it).
// It can be switched off (here or in Help); every tip stays readable in Help.
// v4: its own storage key. The previews share one origin with v3 (and main), so a player who had turned v3's
// tips off never saw v4's: that is why the first-run tutorial seemed gone.

import { TIPS, type TipId } from '../data/copy';
import { esc } from './format';
import { modalOpen, openModal } from './modal';

const KEY = 'takeoff.v4.tutorial';

/** Is this element actually on screen (attached, not hidden, with a size)? */
function visible(el: HTMLElement | null): el is HTMLElement {
  if (!el || !el.isConnected || el.closest('[hidden], .leaving')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none') return false;
  return typeof el.checkVisibility === 'function' ? el.checkVisibility({ opacityProperty: false, visibilityProperty: true } as CheckVisibilityOptions) : true;
}

export class Coach {
  private seen = new Set<TipId>();
  readonly log: { round: number; title: string; text: string }[] = [];
  enabled: boolean;

  constructor(off = false) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* storage blocked: tips stay on for this page */
    }
    this.enabled = !off && stored !== 'off';
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* storage blocked */
    }
  }

  reset() {
    this.seen.clear();
    this.log.length = 0;
  }

  /** Has this tip been shown (or logged) already in this game? */
  has(id: TipId): boolean {
    return this.seen.has(id);
  }

  /** Show a tip once (if the tutorial is on), only when its anchor is on screen; records it for Help either way. */
  async show(id: TipId, round: number, root: ParentNode): Promise<void> {
    if (this.seen.has(id)) return;
    const tip = TIPS[id];
    // the anchor may sit in the page or in an open dialog (the decision screen, a request card)
    const anchor = root.querySelector<HTMLElement>(`[data-coach="${tip.anchor}"]`) ?? document.querySelector<HTMLElement>(`.overlay:not(.leaving) [data-coach="${tip.anchor}"]`);
    // never point at something that is not on screen yet: the tip waits for a later call
    if (this.enabled && !visible(anchor)) return;
    this.seen.add(id);
    this.log.push({ round, title: tip.title, text: tip.text });
    if (!this.enabled) return;
    anchor?.classList.add('coach-target');
    const m = openModal(
      `<div class="dateline">Tip</div>
       <h2>${esc(tip.title)}</h2>
       <p class="coach-text">${esc(tip.text)}</p>
       <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Got it <kbd>Enter</kbd></button><button type="button" class="btn-link" data-action="off">Turn off tips</button></div>`,
      // over a dialog already open (the decision screen), the tip stacks on it instead of closing it
      { cls: 'coach', overlayCls: 'coach-ov', describedBy: '.coach-text', stacked: modalOpen() },
    );
    this.position(m.el, anchor);
    const a = await m.result;
    anchor?.classList.remove('coach-target');
    if (a === 'off') this.setEnabled(false);
  }

  /** Next to the anchor when there is room, else centred (small screens). */
  private position(box: HTMLElement, anchor: HTMLElement | null) {
    if (!anchor || window.innerWidth < 700) return;
    const r = anchor.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    box.style.position = 'fixed';
    box.style.width = `${w}px`;
    box.style.margin = '0';
    const right = r.right + 14 + w < window.innerWidth;
    const left = r.left - 14 - w > 0;
    const top = Math.max(12, Math.min(window.innerHeight - 260, r.top));
    if (right) box.style.left = `${r.right + 14}px`;
    else if (left) box.style.left = `${r.left - 14 - w}px`;
    else {
      box.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left))}px`;
      box.style.top = `${Math.min(window.innerHeight - 240, r.bottom + 12)}px`;
      return;
    }
    box.style.top = `${top}px`;
  }
}
