// Finding the catalog key of an English string the engine or the data hands the UI, and filling it in another
// language. The engine stays English (it compares and parses its own strings); the UI translates what it shows.
//
// An English string is either a catalog entry as it stands ("Diplomatic talks") or a template filled with parts
// ("Social cohesion 58 → 55" from "{label} {before} → {after}"). The matcher tries the entry first, then each
// template, the most specific first (the most literal characters); a template matches only when every text part is
// itself known (a gauge's name, a card, another template), so a stray colon never splits an unknown sentence.
// Parts are tried at every place their next literal occurs (backtracking), so "47 verified, 62 claimed, …" finds
// the right comma. A name placeholder takes only a catalog entry as it stands, a composed one any known text, so a
// gauge's name never swallows a list.

import { COMPOSED_PLACEHOLDERS, NUMBER_OR_TEXT_PLACEHOLDERS, NUMERIC_PLACEHOLDERS } from './templates';

export type Lookup = (key: string) => string | undefined;

interface Template {
  key: string;
  parts: string[]; // literal, var, literal, var, …, literal (odd indices are placeholder names)
  literal: number;
  plural: string | null; // the group key ("engine.eta") for .one / .other forms
}

const PH = /\{(\w+)\}/g;
const NUM = /^[+−-]?\d+(?:[.,]\d+)?$/;
const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

export const placeholders = (s: string) => [...s.matchAll(PH)].map((m) => m[1]).sort();

export function fill(tpl: string, vars: Record<string, string | number> = {}): string {
  return tpl.replace(PH, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

function parse(key: string, en: string): Template {
  const parts = en.split(PH);
  const literal = parts.filter((_, i) => i % 2 === 0).join('').length;
  const m = /^(.*)\.(zero|one|two|few|many|other)$/.exec(key);
  return { key, parts, literal, plural: m ? m[1] : null };
}

export interface Matcher {
  /** The text in the current language, or null when the English string is not in the catalog. */
  resolve(en: string): string | null;
  /** Can a template build this English string (not counting an entry equal to it)? Such content needs no entry of
   *  its own in the catalog: "Social cohesion: down a little" is a gauge, a colon and a move. */
  derivable(en: string): boolean;
}

/**
 * `entries`: every English catalog entry by key (content, templates; the UI's own strings are looked up by key).
 * `lookup(key)`: the translation in the current language, if any. `untranslated`: how to show an English string that
 * has no translation (the pseudo-locale lengthens it; otherwise it stays English). `plural(n)`: the plural category.
 * `isTemplate(key)`: an entry of the templates (src/i18n/templates.ts).
 */
export function makeMatcher(
  entries: Record<string, string>,
  lookup: Lookup,
  opts: { untranslated: (en: string) => string; plural: (n: number) => string; lowerFirst: boolean; isTemplate?: (key: string) => boolean },
): Matcher {
  const exact = new Map<string, string[]>();
  const lower = new Map<string, string[]>();
  const templates: Template[] = [];
  for (const [key, en] of Object.entries(entries)) {
    if (/\{\w+\}/.test(en)) templates.push(parse(key, en));
    else {
      (exact.get(en) ?? exact.set(en, []).get(en)!).push(key);
      const lc = en.toLowerCase();
      (lower.get(lc) ?? lower.set(lc, []).get(lc)!).push(key);
    }
  }
  templates.sort((a, b) => b.literal - a.literal || a.parts.length - b.parts.length);
  const memo = new Map<string, string | null>();

  /** A translation keeps the English numbers: a stale one (numbers changed since) falls back to English. */
  const digits = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((d) => d.replace(',', '.')).sort().join('|');
  const lcFirst = (s: string) => (opts.lowerFirst ? s.replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase()) : s);

  /** An entry equal to the string: its translation (`done`), or the English shown untranslated. */
  function exactHit(s: string): { text: string; done: boolean } | null {
    const hit = (keys: string[], en: string, lower: boolean) => {
      for (const k of keys) {
        const tr = lookup(k);
        if (tr !== undefined && digits(tr) === digits(en)) return { text: lower ? lcFirst(tr) : tr, done: true };
      }
      return { text: lower ? lcFirst(opts.untranslated(en)) : opts.untranslated(en), done: false };
    };
    const k = exact.get(s);
    if (k) return hit(k, s, false);
    // "model theft" in "Protects against model theft.": the engine lowers the first letter of a name in a sentence
    if (/^\p{Ll}/u.test(s)) {
      const up = s.charAt(0).toUpperCase() + s.slice(1);
      const k2 = exact.get(up);
      if (k2) return hit(k2, up, true);
      const k3 = lower.get(s);
      if (k3) return hit(k3, entries[k3[0]], true);
    }
    return null;
  }
  const exactOf = (s: string) => exactHit(s)?.text ?? null;

  /** A placeholder's part: a number, a catalog entry as it stands (a name), or composed text (src/i18n/templates.ts). */
  function part(name: string, x: string): string | null {
    if (NUMERIC_PLACEHOLDERS.has(name)) return NUM.test(x) ? x : null;
    if (NUM.test(x)) return NUMBER_OR_TEXT_PLACEHOLDERS.has(name) ? x : null;
    return COMPOSED_PLACEHOLDERS.has(name) ? resolve(x) : exactOf(x);
  }

  function tryTemplate(t: Template, s: string): Record<string, string> | null {
    const p = t.parts;
    // cheap filter: every literal must be in the string, the first at its start, the last at its end
    if (!s.startsWith(p[0]) || !s.endsWith(p[p.length - 1])) return null;
    for (let i = 2; i < p.length - 1; i += 2) if (p[i] && !s.includes(p[i])) return null;
    const vars: Record<string, string> = {};
    const go = (pi: number, at: number): boolean => {
      // p[pi] is a placeholder; p[pi + 1] the literal after it
      const name = p[pi];
      const next = p[pi + 1];
      const last = pi + 1 === p.length - 1;
      if (last) {
        const end = s.length - next.length;
        if (end <= at) return false;
        const v = part(name, s.slice(at, end));
        if (v === null) return false;
        vars[name] = v;
        return true;
      }
      if (!next) return false; // two placeholders side by side: not supported
      for (let j = s.indexOf(next, at + 1); j >= 0; j = s.indexOf(next, j + 1)) {
        const v = part(name, s.slice(at, j));
        if (v === null) continue;
        vars[name] = v;
        if (go(pi + 2, j + next.length)) return true;
      }
      return false;
    };
    if (p.length === 1) return s === p[0] ? vars : null;
    return go(1, p[0].length) ? vars : null;
  }

  function render(t: Template, vars: Record<string, string>, enVars: Record<string, string>): string {
    let tpl: string | undefined;
    if (t.plural) {
      const n = Number(String(Object.entries(enVars).find(([k]) => NUMERIC_PLACEHOLDERS.has(k))?.[1] ?? '').replace('−', '-'));
      const cat = Number.isFinite(n) ? opts.plural(Math.abs(n)) : 'other';
      tpl = lookup(`${t.plural}.${cat}`) ?? lookup(`${t.plural}.other`);
      if (tpl === undefined) return fill(opts.untranslated(entries[t.key]), vars);
    } else tpl = lookup(t.key);
    if (tpl === undefined) return fill(opts.untranslated(entries[t.key]), vars);
    return fill(tpl, vars);
  }

  function viaTemplate(s: string): string | null {
    for (const t of templates) {
      const vars = tryTemplate(t, s);
      if (vars) return render(t, vars, vars);
    }
    return null;
  }

  function resolve(s: string): string | null {
    const hit = memo.get(s);
    if (hit !== undefined) return hit;
    memo.set(s, null); // a string never contains itself: guards against loops
    // an entry's translation first; an entry left untranslated may still be built from translated parts
    const e = exactHit(s);
    const out = e?.done ? e.text : (viaTemplate(s) ?? e?.text ?? null);
    memo.set(s, out);
    return out;
  }

  function derivable(s: string): boolean {
    if ((exact.get(s) ?? []).some((k) => opts.isTemplate?.(k))) return true;
    return templates.some((t) => tryTemplate(t, s) !== null);
  }

  return { resolve, derivable };
}

export const isPluralKey = (key: string) => PLURAL_FORMS.some((f) => key.endsWith(`.${f}`));
