// Small rendering helpers shared by the screens. Every string that reaches innerHTML goes through esc().

import { provenanceOf, type Provenance } from '../data/basis';
import type { Basis, Chip, Fact, Impact, Source } from '../engine/types';
import { lang, t, tr } from '../i18n';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

/** Only http(s) links are rendered as links; anything else becomes plain text. Every source is in English: its own
 *  title stays in English, and in another language the link says so. */
export function link(src: Source, text?: string): string {
  const inner = text !== undefined ? esc(text) : lang() === 'en' ? esc(src.label) : `<span lang="en">${esc(src.label)}</span>`;
  const mark = lang() === 'en' ? '' : ` <span class="in-en">${esc(t('ui.source.inEnglish', '(in English)'))}</span>`;
  if (!/^https?:\/\//i.test(src.url)) return `${inner}${mark}`;
  return `<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer" hreflang="en">${inner}<span class="sr-only"> ${esc(t('ui.link.newTab', '(opens in a new tab)'))}</span></a>${mark}`;
}

/** An "Already real" box: a sourced fact. */
export function factBox(f: Fact, label = t('ui.fact.real', 'Already real')): string {
  return `<aside class="fact"><span class="fact-k">${esc(label)}</span><p>${esc(tr(f.text))}</p><p class="fact-src">${esc(t('ui.fact.source', 'Source:'))} ${link(f.source)}</p></aside>`;
}

/** Green chips for what goes up, red for what goes down; the words say it too (never colour alone). */
/** `later`: for a chip whose gauge is not on the dashboard yet (a first game), when it joins: the chip shows dimmed
 *  with a dashed outline and the sentence as its tooltip (the caller says it to screen readers). */
export function chips(list: Chip[], hiddenLabel = true, later?: (c: Chip) => string | undefined): string {
  return list
    .map((c) => {
      const join = later?.(c);
      return `<span class="chip ${c.tone === 'up' ? 'good' : 'bad'}${join ? ' hid' : ''}"${join ? ` title="${esc(join)}"` : ''}>${hiddenLabel ? `<span class="sr-only">${esc(c.tone === 'up' ? t('ui.chip.plus', 'Plus:') : t('ui.chip.minus', 'Minus:'))} </span>` : ''}${esc(tr(c.text))}</span>`;
    })
    .join('');
}

/** "US–China cooperation 48 → 56", with a word for screen readers on whether it is good. */
export function impactLine(i: Impact): string {
  const tone = i.tone > 0 ? 'good' : i.tone < 0 ? 'bad' : 'flat';
  const word = i.tone > 0 ? t('ui.impact.better', 'better') : i.tone < 0 ? t('ui.impact.worse', 'worse') : '';
  // the uncertainty line: its label says more or less certain, its values are how low AI safety could be
  return `<li class="imp ${tone}"><span class="imp-l">${esc(tr(i.label))}</span> <span class="imp-v num">${esc(tr(i.before))} → <b>${esc(tr(i.after))}</b></span>${word ? `<span class="imp-w">${esc(word)}</span>` : ''}</li>`;
}

/** The provenance tags in words, in the player's language. */
export const provLabel = (kind: Provenance): string =>
  ({
    real: t('ui.prov.real', 'Real'),
    ai2027: t('ui.prov.ai2027', 'From AI 2027'),
    cfg: t('ui.prov.cfg', 'From CFG'),
    e2031: t('ui.prov.e2031', 'From Europe 2031'),
    game: t('ui.prov.game', 'Invented'),
  })[kind];

/** The provenance tag (Real / From AI 2027 / From CFG / From Europe 2031 / Invented), from the content's basis. The visible word is the
 *  whole tag, so it reads the same for screen readers; the title gives the reference (in English). */
export function provTag(b: Basis): string {
  const p = provenanceOf(b);
  return `<span class="tag prov p-${p.kind}" title="${esc(b.ref)}">${esc(provLabel(p.kind))}</span>`;
}

/** "A", "A and B", "A, B and C", in the player's language. */
export function andList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  const last = items[items.length - 1];
  const head = items.slice(0, -1).join(t('ui.list.separator', ', '));
  return t('ui.list.and', '{list} and {last}', { list: head, last });
}

/** A key on the keyboard, named as it is printed in the player's language ("Entrée", "Leertaste"). */
export const keyName = (k: 'enter' | 'esc' | 'space'): string =>
  ({ enter: t('ui.key.enter', 'Enter'), esc: t('ui.key.esc', 'Esc'), space: t('ui.key.space', 'Space') })[k];
export const kbd = (k: 'enter' | 'esc' | 'space'): string => `<kbd>${esc(keyName(k))}</kbd>`;

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export const ICON = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/></svg>',
  influence:
    '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 5.5v9M6.5 8.5L10 5.5l3.5 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  alert: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l8 14.5H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14.4" r="1.1" fill="currentColor"/></svg>',
};
