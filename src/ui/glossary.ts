// Glossary terms inline (src/data/glossary.ts). In a request, an opened card, Breaking news or a threat, the first
// occurrence of a few glossary terms becomes a real button (a toggletip): it shows the definition right after the
// word and announces it. Click, Enter or Space toggles it; Escape closes it (before any dialog sees the key).
// Kept light: at most two terms a text, and each term once per screen (pass the same `seen` set).
// Everything reaching innerHTML is escaped.

import { GLOSSARY, GLOSSARY_BY_ID, type GlossaryEntry } from '../data/glossary';
import { announce } from './a11y';
import { esc, link } from './format';

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
export function glossed(text: string, seen: Set<string> = new Set(), max = 2): string {
  const found: Hit[] = [];
  for (const g of GLOSSARY) {
    if (seen.has(g.id)) continue;
    const m = new RegExp(g.match.source, g.match.flags.replace('g', '')).exec(text);
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
    out += `<span class="gl"><button type="button" class="gl-term" data-gl="${esc(h.g.id)}" aria-expanded="false" aria-controls="${id}" aria-describedby="gl-hint">${esc(text.slice(h.start, h.end))}</button><span class="gl-def" id="${id}" hidden><b>${esc(h.g.term)}:</b> ${esc(h.g.def)}</span></span>`;
    at = h.end;
  }
  return out + esc(text.slice(at));
}

/** The "Words used in the game" list for Help: every term, its definition and, for a fact, its source. */
export function glossaryListHtml(): string {
  return `<dl class="gloss">${GLOSSARY.map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.def)}${g.source ? ` <span class="fact-src">Source: ${link(g.source)}</span>` : ''}</dd></div>`).join('')}</dl>`;
}

function toggle(b: HTMLButtonElement, open: boolean) {
  const def = document.getElementById(b.getAttribute('aria-controls') ?? '');
  if (!def) return;
  def.hidden = !open;
  b.setAttribute('aria-expanded', String(open));
  const g = GLOSSARY_BY_ID[b.dataset.gl ?? ''];
  if (open && g) announce(`${g.term}: ${g.def}`);
}

let installed = false;

/** Wire the buttons once for the whole page (event delegation), and the shared hint that describes them. */
export function installGlossary() {
  if (installed) return;
  installed = true;
  const hint = document.createElement('span');
  hint.id = 'gl-hint';
  hint.hidden = true;
  hint.textContent = 'Explains this word';
  document.body.append(hint);
  document.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement | null)?.closest?.<HTMLButtonElement>('.gl-term');
    if (!b) return;
    ev.preventDefault();
    toggle(b, b.getAttribute('aria-expanded') !== 'true');
  });
  // capture: Escape closes an open definition before a dialog's own Escape (which would close the dialog)
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape') return;
      const a = document.activeElement as HTMLElement | null;
      const b = a?.closest?.<HTMLButtonElement>('.gl-term');
      if (!b || b.getAttribute('aria-expanded') !== 'true') return;
      ev.preventDefault();
      ev.stopPropagation();
      toggle(b, false);
    },
    true,
  );
}
