// The game's languages (English by default; French, German, Spanish, Polish) and a pseudo-locale for testing.
//
//   t('ui.feed.title', 'News')                  a UI string: its key, its English (authored here, in the code),
//                                               and {placeholders} filled from `vars`
//   tn('ui.x', n, { one: '…', other: '…' })     the same with plural forms (keys ui.x.one, ui.x.other; a locale may
//                                               add .few and .many)
//   th('ui.x', 'Press {key}', { key: '<kbd>…' }) the same as HTML: the text is escaped, the vars are HTML
//   tr(english)                                 a string the engine or the data hands the UI (a card's name, a
//                                               change in the feed): its catalog entry or template, in the
//                                               player's language (src/i18n/match.ts)
//
// The catalogs are src/i18n/<lang>.json, flat { key: text }. en.json is generated (npm run i18n:extract) and is not
// loaded at run time: English is in the code and the data. A missing translation falls back to English. The engine
// never sees any of this: it stays English and seeded, so the simulation is unchanged.

import { collectContent } from './content';
import { fill, makeMatcher, type Matcher } from './match';
import { pseudo } from './pseudo';
import { TEMPLATES } from './templates';

export type Lang = 'en' | 'fr' | 'de' | 'es' | 'pl';
/** 'xx': the pseudo-locale (accented, lengthened English) to spot untranslated or cut strings. */
export type AnyLang = Lang | 'xx';
export type Vars = Record<string, string | number>;

/** The languages offered, each named in itself. */
export const LANGS: { id: Lang; name: string; short: string }[] = [
  { id: 'en', name: 'English', short: 'EN' },
  { id: 'fr', name: 'Français', short: 'FR' },
  { id: 'de', name: 'Deutsch', short: 'DE' },
  { id: 'es', name: 'Español', short: 'ES' },
  { id: 'pl', name: 'Polski', short: 'PL' },
];
export const LANG_IDS = LANGS.map((l) => l.id);
export const isLang = (x: unknown): x is AnyLang => x === 'xx' || LANG_IDS.includes(x as Lang);

type Catalog = Record<string, string>;
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<{ default: Catalog }>> = {
  fr: () => import('./fr.json'),
  de: () => import('./de.json'),
  es: () => import('./es.json'),
  pl: () => import('./pl.json'),
};

let current: AnyLang = 'en';
let catalog: Catalog = {};
let matcher: Matcher | null = null;
let plurals = new Intl.PluralRules('en');
const listeners = new Set<(l: AnyLang) => void>();

export const lang = (): AnyLang => current;
/** The language tag for <html lang> and Intl (the pseudo-locale reads as English). */
export const langTag = (l: AnyLang = current) => (l === 'xx' ? 'en' : l);

/** Load a catalog (for tests and tools; the game uses setLang). */
export async function loadCatalog(l: AnyLang): Promise<Catalog> {
  if (l === 'en' || l === 'xx') return {};
  const m = await LOADERS[l]();
  return m.default ?? (m as unknown as Catalog);
}

/** Switch language: load its catalog, then tell every listener (the UI re-renders, keeping the game as it is). */
export async function setLang(l: AnyLang): Promise<void> {
  const cat = await loadCatalog(l);
  useCatalog(l, cat);
  if (typeof document !== 'undefined') document.documentElement.lang = langTag(l);
  for (const fn of listeners) fn(l);
}

/** Use a catalog already loaded (tests). */
export function useCatalog(l: AnyLang, cat: Catalog) {
  current = l;
  catalog = cat;
  matcher = null;
  plurals = new Intl.PluralRules(langTag(l));
}

export function onLangChange(fn: (l: AnyLang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const translated = (key: string): string | undefined => {
  const v = catalog[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
};
const untranslated = (en: string) => (current === 'xx' ? pseudo(en) : en);

/** Does the current language translate this key? */
export const has = (key: string): boolean => translated(key) !== undefined;

/** A UI string in the current language. */
export function t(key: string, en: string, vars?: Vars): string {
  return fill(translated(key) ?? untranslated(en), vars);
}

/** A UI string with plural forms, chosen by `n` (also available as {n}). */
export function tn(key: string, n: number, forms: { one: string; other: string }, vars: Vars = {}): string {
  const all = { n, ...vars };
  if (current === 'en' || current === 'xx') return fill(untranslated(n === 1 ? forms.one : forms.other), all);
  const cat = plurals.select(n);
  const tr = translated(`${key}.${cat}`) ?? translated(`${key}.other`);
  return fill(tr ?? (n === 1 ? forms.one : forms.other), all);
}

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A UI string as HTML: the text is escaped, the vars are inserted as given (they must be safe HTML). */
export function th(key: string, en: string, vars: Vars = {}): string {
  return fill(escHtml(translated(key) ?? untranslated(en)), vars);
}

const isTemplate = (key: string) => key in TEMPLATES;

/** Every English entry the matcher knows: the content and the engine's templates. */
let entries: Record<string, string> | null = null;
export function englishEntries(): Record<string, string> {
  return (entries ??= { ...collectContent(), ...TEMPLATES });
}

/** A string the engine or the data hands the UI, in the current language (English when it has no entry). */
export function tr(en: string | null | undefined): string {
  if (en === null || en === undefined) return '';
  if (current === 'en') return en;
  matcher ??= makeMatcher(englishEntries(), translated, { untranslated, plural: (n) => plurals.select(n), lowerFirst: current !== 'de', isTemplate });
  return matcher.resolve(en) ?? untranslated(en);
}

let english: Matcher | null = null;
const englishMatcher = () => (english ??= makeMatcher(englishEntries(), () => undefined, { untranslated: (x) => x, plural: () => 'other', lowerFirst: true, isTemplate }));

/** Is this English string known to the catalog (an entry, or a template whose parts are known)? For tests. */
export function known(en: string): boolean {
  return englishMatcher().resolve(en) !== null;
}

/** The effect chips a template already builds (a gauge, a colon and a move): left out of the catalog, so
 *  translators translate "Social cohesion: down a little" once, as its parts. */
export function derivableKeys(): Set<string> {
  const m = englishMatcher();
  const content = collectContent();
  // only the effect chips: a name equal to a template's word ("Protest", a social event's kind) keeps its own entry
  return new Set(Object.keys(content).filter((k) => /\.(ups|downs)\.\d+$/.test(k) && m.derivable(content[k])));
}

/** The catalog key of a content field, for the UI when it has the id at hand (falls back to tr of the English). */
export function tc(key: string, en: string): string {
  if (current === 'en') return en;
  return translated(key) ?? tr(en);
}

/** A word lowered for the middle of a sentence ("Watch" → "watch"); German keeps its capitals (nouns). */
export const lcFirst = (s: string) => (current === 'de' ? s : s.replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase()));

/** A number in the current language (integers stay as they are; decimals get the local separator). */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString(langTag());
}
