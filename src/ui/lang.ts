// Choosing the language. English is the default; French, German, Spanish and Polish are offered, each named in
// itself. Three ways in:
//   - ?lang=fr in the address forces a language for that page (shareable links); ?lang=xx is the pseudo-locale;
//   - the player's choice (the header's language button, or the row on the first intro screen) is kept in
//     localStorage, key takeoff.lang (wrapped in try/catch; "Forget my save" removes it);
//   - on a first visit, when the browser prefers one of the four, the intro offers it in one line, in that
//     language ("Jouer en français ?"); English stays until the player accepts.
// Switching keeps the game as it is: the UI re-renders (onLangChange), nothing is reset.

import { LANGS, isLang, lang, setLang, t, type AnyLang, type Lang } from '../i18n';
import { esc } from './format';

export const LANG_KEY = 'takeoff.lang';

/** Opened with ?lang=xx: the header's menu also offers the pseudo-locale, to switch back and forth while testing. */
let pseudoOffered = false;

function stored(): AnyLang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v && isLang(v) && v !== 'xx' ? v : null;
  } catch {
    return null;
  }
}

function store(l: AnyLang) {
  try {
    if (l === 'xx') return;
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* storage blocked: the choice lasts for this page */
  }
}

/** The language a page starts in: ?lang= first, then the player's saved choice, else English. */
export function initialLang(search = typeof location === 'undefined' ? '' : location.search): AnyLang {
  const q = new URLSearchParams(search).get('lang');
  if (q === 'xx') pseudoOffered = true;
  if (q && isLang(q)) return q;
  return stored() ?? 'en';
}

/** The player picks a language: load it, keep the choice, and keep the address in step when it names one. */
export async function chooseLang(l: AnyLang): Promise<void> {
  store(l);
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', l);
      history.replaceState(history.state, '', url.toString());
    }
  } catch {
    /* no address to update (tests) */
  }
  await setLang(l);
}

/** What the intro offers on a first visit: a language the browser prefers, written in itself. */
const OFFER: Record<Exclude<Lang, 'en'>, { ask: string; yes: string }> = {
  fr: { ask: 'Jouer en français ?', yes: 'Oui, en français' },
  de: { ask: 'Auf Deutsch spielen?', yes: 'Ja, auf Deutsch' },
  es: { ask: '¿Jugar en español?', yes: 'Sí, en español' },
  pl: { ask: 'Grać po polsku?', yes: 'Tak, po polsku' },
};

/** The language to offer, if any: none once the player has chosen, or when the address names one. */
export function offeredLang(languages: readonly string[] = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])): Exclude<Lang, 'en'> | null {
  if (lang() !== 'en' || stored() || new URLSearchParams(typeof location === 'undefined' ? '' : location.search).has('lang')) return null;
  for (const x of languages) {
    const p = String(x).toLowerCase().split('-')[0];
    if (p === 'en') return null;
    if (p in OFFER) return p as Exclude<Lang, 'en'>;
  }
  return null;
}

/** The one-line offer, in the offered language. */
export function offerHtml(l: Exclude<Lang, 'en'>): string {
  const o = OFFER[l];
  return `<p class="lang-offer" lang="${l}"><span>${esc(o.ask)}</span> <button type="button" class="btn-quiet" data-lang="${l}">${esc(o.yes)}</button></p>`;
}

/** The row of languages on the first intro screen: one button each, the current one pressed. */
export function langRowHtml(): string {
  return `<div class="lang-row" role="group" aria-label="${esc(t('ui.lang.label', 'Language'))}">${LANGS.map(
    (l) => `<button type="button" class="lang-opt" data-lang="${l.id}" lang="${l.id}" aria-pressed="${lang() === l.id}">${esc(l.name)}</button>`,
  ).join('')}</div>`;
}

/** The header's language button: "EN", with a small menu of the five languages. A disclosure: Enter or Space opens
 *  it, the arrows move in the list, Escape closes it and returns to the button. */
export function langMenuHtml(): string {
  const all: { id: AnyLang; name: string; short: string }[] = pseudoOffered || lang() === 'xx' ? [...LANGS, { id: 'xx', name: 'Pseudo', short: 'XX' }] : LANGS;
  const cur = all.find((l) => l.id === lang());
  const label = t('ui.lang.button', 'Language: {name}. Change language', { name: cur?.name ?? 'English' });
  return `<div class="lang-menu">
    <button type="button" class="iconbtn lang-btn" id="lang-btn" aria-expanded="false" aria-controls="lang-list" aria-label="${esc(label)}" title="${esc(t('ui.lang.label', 'Language'))}"><span aria-hidden="true">${esc(cur?.short ?? lang().toUpperCase())}</span></button>
    <ul class="lang-list" id="lang-list" hidden>${all.map(
      (l) => `<li><button type="button" class="lang-opt" data-lang="${l.id}" lang="${l.id === 'xx' ? 'en' : l.id}" ${lang() === l.id ? 'aria-current="true"' : ''}><span class="lang-short" aria-hidden="true">${l.short}</span> ${esc(l.name)}</button></li>`,
    ).join('')}</ul>
  </div>`;
}

/** Wire a header menu built by langMenuHtml (inside `root`). `pick` runs with the chosen language. */
export function bindLangMenu(root: ParentNode, pick: (l: AnyLang) => void) {
  const btn = root.querySelector<HTMLButtonElement>('#lang-btn');
  const list = root.querySelector<HTMLElement>('#lang-list');
  if (!btn || !list) return;
  const opts = () => [...list.querySelectorAll<HTMLButtonElement>('.lang-opt')];
  const open = (on: boolean, focus = true) => {
    list.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on && focus) (opts().find((o) => o.hasAttribute('aria-current')) ?? opts()[0])?.focus();
  };
  btn.addEventListener('click', () => open(list.hidden));
  list.addEventListener('click', (ev) => {
    const o = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-lang]');
    if (!o) return;
    open(false, false);
    btn.focus();
    if (o.dataset.lang !== lang()) pick(o.dataset.lang as AnyLang);
  });
  list.addEventListener('keydown', (ev) => {
    const all = opts();
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      open(false, false);
      btn.focus();
    } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      all[(i + (ev.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus();
    } else if (ev.key === 'Home' || ev.key === 'End') {
      ev.preventDefault();
      all[ev.key === 'Home' ? 0 : all.length - 1]?.focus();
    }
  });
  // a click elsewhere, or focus leaving the menu, closes it
  document.addEventListener('pointerdown', (ev) => {
    if (list.isConnected && !list.hidden && !(ev.target as HTMLElement).closest?.('.lang-menu')) open(false, false);
  });
  list.addEventListener('focusout', (ev) => {
    const to = ev.relatedTarget as Node | null;
    if (to && !list.contains(to) && to !== btn) open(false, false);
  });
}
