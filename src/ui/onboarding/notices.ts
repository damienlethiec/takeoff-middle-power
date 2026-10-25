// What is new this quarter (GameState.notices after startQuarter): act transitions, new cards, new indicators,
// employment shocks, thresholds. At most ONE blocking screen per quarter (an act, else an employment shock);
// everything else becomes a toast. Everything is announced politely, in one message.

import type { Notice } from '../../engine/types';
import { ACTS } from '../../data/copy';
import { announce, reducedMotion } from '../a11y';
import { esc } from '../format';
import { openModal } from '../modal';

export interface NoticePlan {
  /** The one notice that gets a full screen this quarter, if any. */
  blocking: Notice | null;
  /** Shown inside the blocking screen ("What's new") instead of as toasts. */
  folded: Notice[];
  toasts: Notice[];
}

/** Act 1 opens the game: it gets a toast, not a screen, so the first decision comes fast. */
const isBlockingAct = (n: Notice) => n.kind === 'act' && Number(n.id) >= 2;

export function planNotices(notices: Notice[]): NoticePlan {
  const shown = notices.filter((n) => n.kind !== 'tip'); // tips come through engine.tip()
  const blocking = shown.find(isBlockingAct) ?? shown.find((n) => n.kind === 'employment_shock') ?? null;
  const rest = shown.filter((n) => n !== blocking);
  // an act screen lists the quarter's other news; a shock screen leaves them to toasts
  if (blocking?.kind === 'act') return { blocking, folded: rest, toasts: [] };
  return { blocking, folded: [], toasts: rest };
}

const KIND_LABEL: Record<Notice['kind'], string> = {
  act: 'New act',
  card_unlocked: 'New card',
  context_card: 'New opportunity',
  indicator: 'New indicator',
  threshold: 'Alert',
  employment_shock: 'Jobs',
  tip: 'Tip',
};

/** One plain sentence per notice, for toasts, lists and screen readers. */
export function noticeLine(n: Notice): string {
  if (n.kind === 'act') {
    const a = ACTS.find((x) => String(x.act) === n.id);
    return `Act ${n.id}: ${a?.title ?? n.title}.`;
  }
  const text = n.text.trim();
  return `${KIND_LABEL[n.kind]}: ${n.title}.${text ? ` ${text}` : ''}`;
}

const actCopy = (n: Notice) => {
  const a = ACTS.find((x) => String(x.act) === n.id);
  return { title: a?.title ?? n.title, beat: a?.beat ?? n.text };
};

/** A short full-screen story beat when an act opens, then Continue. */
export async function showActTransition(n: Notice, dateLabel: string, folded: Notice[] = []): Promise<void> {
  const { title, beat } = actCopy(n);
  const news = folded.length
    ? `<h3 class="label">What's new</h3><ul class="ob-news">${folded
        .map((f) => `<li><span class="ob-kind k-${esc(f.kind)}">${esc(KIND_LABEL[f.kind])}</span> <span><b>${esc(f.title)}</b>${f.text ? ` ${esc(f.text)}` : ''}</span></li>`)
        .join('')}</ul>`
    : '';
  const m = openModal(
    `<div class="dateline">${esc(dateLabel)} · Act ${esc(n.id)} of 3</div>
     <h2>${esc(title)}</h2>
     <p class="ob-beat">${esc(beat)}</p>
     ${news}
     <div class="row-btns"><button class="btn-primary" data-primary data-action="ok">Continue <kbd>Enter</kbd></button></div>`,
    { cls: 'ob-act', overlayCls: 'ov-act', label: `Act ${n.id}: ${title}`, describedBy: '.ob-beat, .ob-news' },
  );
  await m.result;
}

/** A blocking notice that is not an act (an employment shock). */
export async function showNoticeScreen(n: Notice, dateLabel: string): Promise<void> {
  const m = openModal(
    `<div class="dateline">${esc(dateLabel)} · ${esc(KIND_LABEL[n.kind])}</div>
     <h2>${esc(n.title)}</h2>
     <p class="ob-beat">${esc(n.text)}</p>
     <div class="row-btns"><button class="btn-primary" data-primary data-action="ok">Continue <kbd>Enter</kbd></button></div>`,
    { cls: 'ob-notice', label: n.title, describedBy: '.ob-beat' },
  );
  await m.result;
}

// ---------------------------------------------------------------- toasts

const TOAST_MS = 7000;

function toastHost(): HTMLElement {
  let host = document.querySelector<HTMLElement>('body > .ob-toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'ob-toasts';
    // visual only: the same words are announced through the live region
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
  }
  return host;
}

/** Show each notice as a toast (stacked), and announce them all in one polite message. */
export function showToasts(notices: Notice[], opts: { say?: boolean } = {}) {
  if (!notices.length) return;
  const host = toastHost();
  for (const n of notices) {
    const t = document.createElement('div');
    t.className = `ob-toast k-${n.kind}${n.kind === 'threshold' || n.kind === 'employment_shock' ? ' alert' : ''}`;
    const { title, text } = n.kind === 'act' ? { title: `Act ${n.id}: ${actCopy(n).title}`, text: actCopy(n).beat } : n;
    t.innerHTML = `<span class="ob-kind k-${esc(n.kind)}">${esc(KIND_LABEL[n.kind])}</span> <span><b>${esc(title)}</b>${text ? ` ${esc(text)}` : ''}</span>`;
    host.appendChild(t);
    const life = TOAST_MS + (n.kind === 'threshold' ? 2000 : 0);
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + (reducedMotion() ? 0 : 400));
  }
  while (host.childElementCount > 4) host.firstElementChild!.remove();
  if (opts.say !== false) announce(notices.map(noticeLine).join(' '));
}
