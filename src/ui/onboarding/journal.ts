// The journal: every finished quarter, re-readable (situation report, decision, events, Léa's letter, tips),
// plus every tip seen so far. One tab per quarter (arrow keys, Home and End move between them), Escape closes.

import type { JournalEntry, Tip } from '../../engine/types';
import { TIPS } from '../../data/copy';
import { esc, signed } from '../format';
import { openModal } from '../modal';
import { tipFactHtml } from './tips';

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

function reportHtml(e: JournalEntry) {
  const r = e.report;
  const lines = r.headline?.length
    ? `<ul class="ob-lines">${r.headline
        .map((l) => `<li><b>${esc(l.label)} ${esc(l.value)}</b> <span class="num">(${esc(sign(l.delta))})</span>: ${esc(l.cause)}</li>`)
        .join('')}</ul>`
    : r.changes.length
      ? `<ul class="ob-lines">${r.changes.map((c) => `<li><b>${esc(c.label)} <span class="num">${esc(signed(c.delta))}</span></b>: ${esc(c.cause)}</li>`).join('')}</ul>`
      : '<p class="muted">A quiet quarter: nothing you could see moved.</p>';
  const background = r.background ? `<p class="muted">${esc(r.background)}</p>` : '';
  const why = r.why?.length ? `<ul class="ob-why">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  return `${lines}${background}${why}`;
}

function entryHtml(e: JournalEntry) {
  const d = e.decision;
  const decision = d.cardId ? `<p><b>${esc(d.title)}</b>${d.option ? ` (${esc(d.option)})` : ''}</p>` : `<p>${esc(d.title || 'You passed')}</p>`;
  const events = e.events.length
    ? `<h3 class="label">Events</h3><ul class="ob-lines">${e.events
        .map((v) => `<li><b>${esc(v.title)}</b>: ${v.prepared ? 'you were prepared' : 'you were not prepared'}</li>`)
        .join('')}</ul>`
    : '';
  const lea = e.lea
    ? `<h3 class="label">Léa wrote</h3><div class="paper letter ob-letter"><p>${esc(e.lea.text)}</p></div>`
    : '';
  const tips = e.tips.length ? `<h3 class="label">Tips</h3>${e.tips.map(tipHtml).join('')}` : '';
  return `<h3 class="label">Situation report</h3>${reportHtml(e)}<h3 class="label">Your decision</h3>${decision}${events}${lea}${tips}`;
}

const tipHtml = (t: Tip) => `<div class="ob-tip-item"><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p>${tipFactHtml(t)}</div>`;

/** Every tip seen (by id, in the order shown), with its words from the entries or the copy. */
export function tipsSeen(entries: JournalEntry[], shownIds: string[]): Tip[] {
  const known = new Map<string, Tip>();
  for (const e of entries) for (const t of e.tips) known.set(t.id, t);
  for (const c of TIPS) if (!known.has(c.id)) known.set(c.id, { id: c.id, title: c.title, text: c.text });
  const ids = [...new Set([...shownIds, ...entries.flatMap((e) => e.tips.map((t) => t.id))])];
  return ids.map((id) => known.get(id)).filter((t): t is Tip => !!t);
}

export async function openJournal(entries: JournalEntry[], opts: { tipsShown?: string[]; current?: string } = {}): Promise<void> {
  const tips = tipsSeen(entries, opts.tipsShown ?? []);
  const tabs: { id: string; label: string; html: string }[] = entries.map((e) => ({ id: `q${e.quarter}`, label: e.dateLabel, html: entryHtml(e) }));
  if (tips.length) tabs.push({ id: 'tips', label: 'Tips', html: `<h3 class="label">Every tip so far</h3>${tips.map(tipHtml).join('')}` });
  const selected = Math.max(0, entries.length - 1);
  const body = tabs.length
    ? `<div class="ob-tabs" role="tablist" aria-label="Quarters">${tabs
        .map(
          (t, i) =>
            `<button type="button" role="tab" id="obj-tab-${t.id}" aria-controls="obj-panel" aria-selected="${i === selected}" tabindex="${i === selected ? 0 : -1}" data-tab="${i}">${esc(t.label)}</button>`,
        )
        .join('')}</div>
       <div class="ob-panel" id="obj-panel" role="tabpanel" tabindex="0" aria-labelledby="obj-tab-${tabs[selected].id}"></div>`
    : `<p class="ob-empty">Your journal fills in as quarters end: each situation report, your decision, the events and Léa's letters.</p>`;
  const m = openModal(
    `<div class="dateline">${esc(opts.current ?? '')}${opts.current ? ' · ' : ''}Journal</div>
     <h2>Your journal</h2>
     ${body}
     <div class="row-btns"><button class="btn-primary" data-primary data-escape data-action="ok">Back to the game <kbd>Esc</kbd></button></div>`,
    { cls: 'ob-journal', label: 'Journal' },
  );
  const list = [...m.el.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panel = m.el.querySelector<HTMLElement>('#obj-panel');
  const select = (i: number, focus = false) => {
    if (!panel) return;
    list.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === i));
      b.tabIndex = k === i ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', list[i].id);
    panel.innerHTML = tabs[i].html;
    if (focus) list[i].focus();
  };
  if (panel) select(selected);
  list.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    b.addEventListener('keydown', (ev) => {
      const n = list.length;
      const to = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? (i + 1) % n : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? (i - 1 + n) % n : ev.key === 'Home' ? 0 : ev.key === 'End' ? n - 1 : -1;
      if (to < 0) return;
      ev.preventDefault();
      select(to, true);
    });
  });
  // start on the latest quarter's tab, so a keyboard user can move back through time with the arrows
  requestAnimationFrame(() => list[selected]?.focus({ preventScroll: true }));
  await m.result;
}
