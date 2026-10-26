// Small rendering helpers shared by the screens. Every string that reaches innerHTML goes through esc().

import { GAUGE_LABEL } from '../data/copy';
import type { Chip, Fact, Impact, Source } from '../engine/types';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

/** Only http(s) links are rendered as links; anything else becomes plain text. */
export function link(src: Source, text = src.label): string {
  if (!/^https?:\/\//i.test(src.url)) return esc(text);
  return `<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="sr-only"> (opens in a new tab)</span></a>`;
}

/** An "Already real" box: a sourced fact. */
export function factBox(f: Fact, label = 'Already real'): string {
  return `<aside class="fact"><span class="fact-k">${esc(label)}</span><p>${esc(f.text)}</p><p class="fact-src">Source: ${link(f.source)}</p></aside>`;
}

/** Green chips for what goes up, red for what goes down; the words say it too (never colour alone). */
export function chips(list: Chip[], hiddenLabel = true): string {
  return list
    .map((c) => `<span class="chip ${c.tone === 'up' ? 'good' : 'bad'}">${hiddenLabel ? `<span class="sr-only">${c.tone === 'up' ? 'Plus: ' : 'Minus: '}</span>` : ''}${esc(c.text)}</span>`)
    .join('');
}

/** "US–China cooperation 48 → 56", with a word for screen readers on whether it is good. */
export function impactLine(i: Impact): string {
  const tone = i.tone > 0 ? 'good' : i.tone < 0 ? 'bad' : 'flat';
  const word = i.tone > 0 ? 'better' : i.tone < 0 ? 'worse' : '';
  const v = (x: string) => (i.key === 'margin' ? `±${x}` : x);
  const label = i.key === 'margin' ? `${GAUGE_LABEL.confidence}: ${Number(i.after) > Number(i.before) ? 'less' : 'more'} certain` : i.label;
  return `<li class="imp ${tone}"><span class="imp-l">${esc(label)}</span> <span class="imp-v num">${esc(v(i.before))} → <b>${esc(v(i.after))}</b></span>${word ? `<span class="imp-w">${word}</span>` : ''}</li>`;
}

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export const ICON = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/></svg>',
  influence:
    '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 5.5v9M6.5 8.5L10 5.5l3.5 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  alert: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l8 14.5H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14.4" r="1.1" fill="currentColor"/></svg>',
  journal:
    '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="2.5" width="12" height="15" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 6.5h6M7 9.5h6M7 12.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  leak: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 5.5l7 5.5 7-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
};
