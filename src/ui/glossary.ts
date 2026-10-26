// Glossary terms inline (src/data/glossary.ts). In a request, an opened card, Breaking news or a threat, the first
// occurrence of a few glossary terms becomes a real button (a toggletip): it shows the definition right after the
// word and announces it. Click, Enter or Space toggles it; Escape closes it (before any dialog sees the key).
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
    out += `<span class="gl"><button type="button" class="gl-term" data-gl="${esc(h.g.id)}" aria-expanded="false" aria-controls="${id}" aria-describedby="gl-hint">${esc(text.slice(h.start, h.end))}</button><span class="gl-def" id="${id}" hidden><b>${esc(term(h.g))}:</b> ${esc(def(h.g))}</span></span>`;
    at = h.end;
  }
  return out + esc(text.slice(at));
}

/** The "Words used in the game" list for Help: every term, its definition and, for a fact, its source. */
export function glossaryListHtml(): string {
  return `<dl class="gloss">${GLOSSARY.map((g) => `<div><dt>${esc(term(g))}</dt><dd>${esc(def(g))}${g.source ? ` <span class="fact-src">${esc(t('ui.fact.source', 'Source:'))} ${link(g.source)}</span>` : ''}</dd></div>`).join('')}</dl>`;
}

function toggle(b: HTMLButtonElement, open: boolean) {
  const box = document.getElementById(b.getAttribute('aria-controls') ?? '');
  if (!box) return;
  box.hidden = !open;
  b.setAttribute('aria-expanded', String(open));
  const g = GLOSSARY_BY_ID[b.dataset.gl ?? ''];
  if (open && g) announce(`${term(g)}: ${def(g)}`);
}

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
