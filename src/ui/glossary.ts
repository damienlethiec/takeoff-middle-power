// Glossary terms inline (src/data/glossary.ts). In a request, an opened card, Breaking news or a threat, the first
// occurrence of a few glossary terms becomes a real button with a tooltip: hovering or focusing the word shows its
// definition next to it; a click or tap (or Enter / Space) pins it open and announces it; Escape closes it (before
// any dialog sees the key).
// Kept light: at most two terms a text, and each term once per screen (pass the same `seen` set).
// Everything reaching innerHTML is escaped.

import { GLOSSARY, GLOSSARY_BY_ID, type GlossaryEntry } from '../data/glossary';
import { has, lang, onLangChange, t, tc, tr } from '../i18n';
import { announce } from './a11y';
import { esc, link } from './format';

/** A term and its definition in the player's language. */
const term = (g: GlossaryEntry) => tc(`glossary.${g.id}.term`, g.term);
const def = (g: GlossaryEntry) => tc(`glossary.${g.id}.def`, g.def);

/** What marks a term inline: in English its pattern; in another language the words the translation gives
 *  ("alignement, aligné"); without them, the English pattern (the text may still be English); none in the
 *  pseudo-locale. */
const patterns = new Map<string, RegExp | null>();
function pattern(g: GlossaryEntry): RegExp | null {
  if (lang() === 'en') return g.match;
  const key = `${lang()}:${g.id}`;
  if (patterns.has(key)) return patterns.get(key)!;
  let re: RegExp | null = null;
  if (has(`glossary.${g.id}.words`)) {
    const words = tc(`glossary.${g.id}.words`, g.words)
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (words.length) re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join('|')})(?![\\p{L}\\p{N}])`, g.match.flags.includes('i') ? 'iu' : 'u');
  } else if (lang() !== 'xx') re = g.match;
  patterns.set(key, re);
  return re;
}

let next = 0;

interface Hit {
  start: number;
  end: number;
  g: GlossaryEntry;
}

/**
 * `text` as escaped HTML, with the first occurrence of up to `max` glossary terms (earliest first) as buttons.
 * `seen` holds the ids already marked on this screen: they are not marked again, and the new ones are added.
 */
export function glossed(english: string, seen: Set<string> = new Set(), max = 2): string {
  const text = tr(english);
  const found: Hit[] = [];
  for (const g of GLOSSARY) {
    if (seen.has(g.id)) continue;
    const p = pattern(g);
    if (!p) continue;
    const m = new RegExp(p.source, p.flags.replace('g', '')).exec(text);
    if (m) found.push({ start: m.index, end: m.index + m[0].length, g });
  }
  found.sort((a, b) => a.start - b.start);
  const hits: Hit[] = [];
  for (const h of found) {
    if (hits.length >= max) break;
    if (hits.some((x) => h.start < x.end && h.end > x.start)) continue;
    hits.push(h);
    seen.add(h.g.id);
  }
  let out = '';
  let at = 0;
  for (const h of hits) {
    const id = `gl-${++next}`;
    out += esc(text.slice(at, h.start));
    out += `<span class="gl"><button type="button" class="gl-term" data-gl="${esc(h.g.id)}" aria-expanded="false" aria-controls="${id}" aria-describedby="gl-hint">${esc(text.slice(h.start, h.end))}</button><span class="gl-def" id="${id}" role="tooltip" hidden><b>${esc(term(h.g))}:</b> ${esc(def(h.g))}</span></span>`;
    at = h.end;
  }
  return out + esc(text.slice(at));
}

/** The "Words used in the game" list for Help: every term, its definition and, for a fact, its source. */
export function glossaryListHtml(): string {
  return `<dl class="gloss">${GLOSSARY.map((g) => `<div><dt>${esc(term(g))}</dt><dd>${esc(def(g))}${g.source ? ` <span class="fact-src">${esc(t('ui.fact.source', 'Source:'))} ${link(g.source)}</span>` : ''}</dd></div>`).join('')}</dl>`;
}

/** The definition floats as a tooltip next to the word: placed in viewport coordinates (position: fixed) so no
 *  scrolling card or dialog clips it, above the word when there is room, else below, kept inside the screen. */
function place(b: HTMLButtonElement, box: HTMLElement) {
  const r = b.getBoundingClientRect();
  const m = 8;
  box.style.left = '0px';
  box.style.top = '0px';
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), window.innerWidth - w - m);
  const above = r.top - h - 6 >= m;
  box.style.left = `${Math.round(left)}px`;
  box.style.top = `${Math.round(above ? r.top - h - 6 : r.bottom + 6)}px`;
  box.dataset.side = above ? 'top' : 'bottom';
}

/** Open or close one term's tooltip. `pin`: opened by a click or a key (stays until clicked again, Escape, or
 *  focus leaves); hover and focus open it unpinned. Only a deliberate open is announced (hover would flood). */
function show(b: HTMLButtonElement, open: boolean, how: 'hover' | 'focus' | 'pin' = 'hover') {
  const box = document.getElementById(b.getAttribute('aria-controls') ?? '');
  if (!box) return;
  if (!open) {
    box.hidden = true;
    b.setAttribute('aria-expanded', 'false');
    delete b.dataset.pinned;
    return;
  }
  // one tooltip at a time
  document.querySelectorAll<HTMLButtonElement>('.gl-term[aria-expanded="true"]').forEach((x) => x !== b && show(x, false));
  box.hidden = false;
  b.setAttribute('aria-expanded', 'true');
  if (how === 'pin') b.dataset.pinned = '1';
  place(b, box);
  const g = GLOSSARY_BY_ID[b.dataset.gl ?? ''];
  if (how !== 'hover' && g) announce(`${term(g)}: ${def(g)}`);
}

const termOf = (el: EventTarget | null) => (el as HTMLElement | null)?.closest?.<HTMLButtonElement>('.gl-term') ?? null;
const boxOf = (el: EventTarget | null) => (el as HTMLElement | null)?.closest?.<HTMLElement>('.gl-def') ?? null;
const termOfBox = (box: HTMLElement) => document.querySelector<HTMLButtonElement>(`.gl-term[aria-controls="${box.id}"]`);

let installed = false;

/** Wire the buttons once for the whole page (event delegation), and the shared hint that describes them. */
export function installGlossary() {
  if (installed) return;
  installed = true;
  const hint = document.createElement('span');
  hint.id = 'gl-hint';
  hint.hidden = true;
  const say = () => (hint.textContent = t('ui.glossary.hint', 'Explains this word'));
  say();
  onLangChange(say);
  document.body.append(hint);
  // hover: the tooltip opens over the word and stays while the pointer is on the word or on the tooltip itself
  document.addEventListener('mouseover', (ev) => {
    const b = termOf(ev.target);
    if (b && b.getAttribute('aria-expanded') !== 'true') show(b, true, 'hover');
  });
  document.addEventListener('mouseout', (ev) => {
    const from = termOf(ev.target) ?? (boxOf(ev.target) ? termOfBox(boxOf(ev.target)!) : null);
    if (!from || from.dataset.pinned || from === document.activeElement) return;
    const to = ev.relatedTarget as Node | null;
    const box = document.getElementById(from.getAttribute('aria-controls') ?? '');
    if (to && (from.contains(to) || box?.contains(to))) return;
    show(from, false);
  });
  // keyboard focus opens it too; leaving closes it
  document.addEventListener('focusin', (ev) => {
    const b = termOf(ev.target);
    if (b && b.matches(':focus-visible')) show(b, true, 'focus');
  });
  document.addEventListener('focusout', (ev) => {
    const b = termOf(ev.target);
    if (b) show(b, false);
  });
  // click or tap (touch screens have no hover): pin it open, or close it
  document.addEventListener('click', (ev) => {
    const b = termOf(ev.target);
    if (!b) return;
    ev.preventDefault();
    show(b, !b.dataset.pinned, 'pin');
  });
  // a click or tap outside a pinned meaning closes it, like Escape (the dialog under it stays open: see modal.ts)
  document.addEventListener('pointerdown', (ev) => {
    const open = document.querySelector<HTMLButtonElement>('.gl-term[aria-expanded="true"][data-pinned]');
    if (!open || termOf(ev.target) === open || boxOf(ev.target)?.id === open.getAttribute('aria-controls')) return;
    show(open, false);
  });
  // the tooltip is placed in screen coordinates: a scroll or a resize closes it rather than leaving it adrift
  const closeAll = () => document.querySelectorAll<HTMLButtonElement>('.gl-term[aria-expanded="true"]').forEach((x) => show(x, false));
  window.addEventListener('scroll', closeAll, true);
  window.addEventListener('resize', closeAll);
  // capture: Escape closes an open definition before a dialog's own Escape (which would close the dialog)
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape') return;
      const open = document.querySelector<HTMLButtonElement>('.gl-term[aria-expanded="true"]');
      if (!open) return;
      ev.preventDefault();
      ev.stopPropagation();
      show(open, false);
    },
    true,
  );
}
