// The tutorial: short coach marks, one at a time, each the first time its part of the screen matters.
// Each is a small dialog placed next to what it explains (focus moves in, Escape or Enter closes it).
// It can be switched off (here or in Help); every tip stays readable in Help.
// v4: its own storage key. The previews share one origin with v3 (and main), so a player who had turned v3's
// tips off never saw v4's: that is why the first-run tutorial seemed gone.
// Progressive dashboard (27 Oct): a first game shows the gauges one system at a time (see App.reveal). The same key
// remembers, without any new tracking, that the player has finished a game ('done', 'done-off'): from then on, like a
// player who turned the tips off, they see the whole dashboard from round 1. "Replay with the tutorial" (Help, the
// landing) sets it back to 'on' (Coach.replay): all previews share one origin, so a tester who finished a game once
// gets the first-game mode back this way.

import { TIPS, type TipId } from '../data/copy';
import { t, tc } from '../i18n';
import { esc, kbd } from './format';
import { modalOpen, openModal } from './modal';

const KEY = 'takeoff.v4.tutorial';

/** A tip's text as HTML: escaped first, then a new line starts a paragraph and **x** is bold (our own markup only). */
export function tipHtml(text: string): string {
  return text
    .split('\n')
    .map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`)
    .join('');
}

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
  /** The player has finished a game in this browser (kept in the same key). */
  finished: boolean;
  /** Called when the tips are switched on or off (the dashboard shows in full once they are off). */
  onChange?: () => void;

  constructor(off = false) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* storage blocked: tips stay on for this page */
    }
    this.enabled = !off && stored !== 'off' && stored !== 'done-off';
    this.finished = stored === 'done' || stored === 'done-off';
  }

  /** The whole dashboard from round 1: tips off (or ?notutorial), or a game already finished here. */
  get full(): boolean {
    return !this.enabled || this.finished;
  }

  private store() {
    try {
      localStorage.setItem(KEY, this.finished ? (this.enabled ? 'done' : 'done-off') : this.enabled ? 'on' : 'off');
    } catch {
      /* storage blocked */
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.store();
    this.onChange?.();
  }

  /** A game reached its ending: the next ones show the whole dashboard from round 1. */
  markFinished() {
    if (this.finished) return;
    this.finished = true;
    this.store();
  }

  /**
   * "Replay with the tutorial" (Help, the landing): the next game is a first game again, with the progressive
   * dashboard and every tip. Only this key changes: sound, language, shortcuts and the recently seen news stay.
   */
  replay() {
    this.enabled = true;
    this.finished = false;
    this.store();
    this.reset();
  }

  reset() {
    this.seen.clear();
    this.log.length = 0;
  }

  /** The tips shown so far in this game, and marking them shown again (save and resume). */
  seenIds(): string[] {
    return [...this.seen];
  }
  markSeen(ids: string[]) {
    for (const id of ids) if (id in TIPS) this.seen.add(id as TipId);
  }

  /** Has this tip been shown (or logged) already in this game? */
  has(id: TipId): boolean {
    return this.seen.has(id);
  }

  /** Show a tip once (if the tutorial is on), only when its anchor is on screen; records it for Help either way. */
  async show(id: TipId, round: number, root: ParentNode): Promise<void> {
    if (this.seen.has(id)) return;
    const tip = TIPS[id];
    // the anchors may sit in the page or in an open dialog (the decision screen, a request card)
    const find = (a: string) => root.querySelector<HTMLElement>(`[data-coach="${a}"]`) ?? document.querySelector<HTMLElement>(`.overlay:not(.leaving) [data-coach="${a}"]`);
    const anchors = tip.anchor.split(' ').map(find);
    // never point at something that is not on screen yet: the tip waits for a later call
    if (this.enabled && !anchors.every(visible)) return;
    const els = anchors.filter((x): x is HTMLElement => !!x);
    this.seen.add(id);
    this.log.push({ round, title: tip.title, text: tip.text });
    if (!this.enabled) return;
    for (const el of els) el.classList.add('coach-target');
    const m = openModal(
      `<div class="dateline">${esc(t('ui.tip.dateline', 'Tip'))}</div>
       <h2>${esc(tc(`tip.${id}.title`, tip.title))}</h2>
       <div class="coach-text">${tipHtml(tc(`tip.${id}.text`, tip.text))}</div>
       <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.tip.ok', 'Got it'))} ${kbd('enter')}</button><button type="button" class="btn-link" data-action="off">${esc(t('ui.tip.off', 'Turn off tips'))}</button></div>`,
      // over a dialog already open (the decision screen), the tip stacks on it instead of closing it
      { cls: 'coach', overlayCls: 'coach-ov', describedBy: '.coach-text', stacked: modalOpen() },
    );
    this.position(m.el, els);
    const a = await m.result;
    for (const el of els) el.classList.remove('coach-target');
    if (a === 'off') this.setEnabled(false);
  }

  /** Next to the anchor when there is room, else centred (small screens). */
  private position(box: HTMLElement, anchors: HTMLElement[]) {
    if (!anchors.length || window.innerWidth < 700) return;
    // the box around every anchor
    const rs = anchors.map((x) => x.getBoundingClientRect());
    const r = { left: Math.min(...rs.map((x) => x.left)), top: Math.min(...rs.map((x) => x.top)), right: Math.max(...rs.map((x) => x.right)), bottom: Math.max(...rs.map((x) => x.bottom)) };
    const w = Math.min(340, window.innerWidth - 24);
    box.style.position = 'fixed';
    box.style.width = `${w}px`;
    box.style.margin = '0';
    const right = r.right + 14 + w < window.innerWidth;
    const left = r.left - 14 - w > 0;
    const top = Math.max(12, Math.min(window.innerHeight - 260, r.top));
    if (right || left) {
      box.style.left = right ? `${r.right + 14}px` : `${r.left - 14 - w}px`;
      box.style.top = `${top}px`;
    } else {
      box.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left))}px`;
      box.style.top = `${Math.min(window.innerHeight - 240, r.bottom + 12)}px`;
    }
    // a longer tip (another language) never runs off the bottom of the window
    const h = box.offsetHeight;
    if (h && parseFloat(box.style.top) + h > window.innerHeight - 12) box.style.top = `${Math.max(12, window.innerHeight - h - 12)}px`;
  }
}
