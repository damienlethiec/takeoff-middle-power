// Translations (src/i18n, docs/I18N.md). The English catalog is generated from the source and must be up to date; a
// locale may be partly translated (missing keys fall back to English), but it must not hold keys English does not
// have, nor change a placeholder. Every string the engine hands the UI must be known to the catalog, as an entry or
// a template, so it can be translated. The runtime falls back to English, picks plural forms, keeps numbers right.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { I18N_DIR, LOCALES, buildEnglish, checkLocale, readJson, stringify } from '../scripts/i18n-lib';
import { engineStrings } from '../scripts/i18n-coverage';
import { englishEntries, known, t, th, tn, tr, useCatalog } from '../src/i18n';
import { pseudo } from '../src/i18n/pseudo';

const en = buildEnglish();

afterEach(() => useCatalog('en', {}));

describe('the catalogs', () => {
  it('the UI strings are all extracted (string literal keys and English)', () => {
    expect(en.errors).toEqual([]);
  });

  it('src/i18n/en.json is up to date (npm run i18n:extract)', () => {
    expect(readFileSync(join(I18N_DIR, 'en.json'), 'utf8')).toBe(stringify(en.catalog));
  });

  for (const lang of LOCALES) {
    it(`${lang}.json: no unknown key, no placeholder changed (coverage printed)`, () => {
      const r = checkLocale(lang, en.catalog, readJson(join(I18N_DIR, `${lang}.json`)));
      console.log(`${lang}: ${r.coverage}% translated (${r.translated} of ${r.total})`);
      // soft checks: much longer than English (layout), numbers that differ (English is shown until fixed)
      if (r.long.length) console.warn(`${lang}: ${r.long.length} translations more than 1.6× the English`, r.long.slice(0, 5));
      if (r.numbers.length) console.warn(`${lang}: ${r.numbers.length} translations whose numbers differ from English`, r.numbers.slice(0, 5));
      expect(r.unknown).toEqual([]);
      expect(r.placeholders).toEqual([]);
    });

    it(`${lang}.json: only characters the game's fonts carry (Latin and Latin Extended)`, () => {
      const englishChars = new Set([...Object.values(en.catalog).join('')]);
      const loc = readJson(join(I18N_DIR, `${lang}.json`));
      const odd = [...new Set([...Object.values(loc).join('')])].filter((c) => !englishChars.has(c) && !/[\u00a0-\u024f\u1e00-\u1eff\u2000-\u206f\u20ac]/.test(c));
      expect(odd).toEqual([]);
    });
  }
});

describe('the fonts carry Polish, German, Spanish and French letters', () => {
  it('every Fontsource face imported in fonts.css includes its latin-ext subset; Newsreader has its own', () => {
    const css = readFileSync(join(I18N_DIR, '../ui/fonts.css'), 'utf8');
    const imports = [...css.matchAll(/@import '(@fontsource\/[^']+)'/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(3);
    for (const i of imports) expect(readFileSync(join(I18N_DIR, '../../node_modules', `${i}.css`), 'utf8'), i).toContain('latin-ext');
    expect(css).toContain('newsreader-latin-ext-opsz-normal');
    expect(css).toContain('newsreader-latin-ext-opsz-italic');
  });
});

describe('every string the engine shows is in the catalog', () => {
  it('over seeded games: gauges, heading, hand, previews, advisor, requests, Breaking news, feed, ending', () => {
    const missing = [...engineStrings(6)].filter((s) => !known(s));
    expect(missing).toEqual([]);
  });
});

describe('the runtime', () => {
  it('English: UI strings as written, engine strings untouched', () => {
    expect(t('ui.x', 'Round {n} of {m}', { n: 2, m: 10 })).toBe('Round 2 of 10');
    expect(tr('Social cohesion 58 → 55')).toBe('Social cohesion 58 → 55');
  });

  it('a missing translation falls back to English; a present one is used', () => {
    useCatalog('fr', { 'ui.a': 'Bonjour {name}' });
    expect(t('ui.a', 'Hello {name}', { name: 'Léa' })).toBe('Bonjour Léa');
    expect(t('ui.b', 'Goodbye')).toBe('Goodbye');
  });

  it('th escapes the text and keeps the HTML vars', () => {
    useCatalog('fr', { 'ui.k': 'Appuyez <ici> sur {key}' });
    expect(th('ui.k', 'Press {key}', { key: '<kbd>←</kbd>' })).toBe('Appuyez &lt;ici&gt; sur <kbd>←</kbd>');
  });

  it('plural forms by the language’s rules (Polish few and many)', () => {
    useCatalog('pl', { 'ui.r.one': '{n} runda', 'ui.r.few': '{n} rundy', 'ui.r.many': '{n} rund', 'ui.r.other': '{n} rundy' });
    const f = { one: '{n} round', other: '{n} rounds' };
    expect(tn('ui.r', 1, f)).toBe('1 runda');
    expect(tn('ui.r', 3, f)).toBe('3 rundy');
    expect(tn('ui.r', 5, f)).toBe('5 rund');
  });

  it('translates what the engine composes, part by part', () => {
    const E = englishEntries();
    const key = (en: string) => Object.keys(E).find((k) => E[k] === en)!;
    useCatalog('fr', {
      [key('Social cohesion')]: 'Cohésion sociale',
      [key('US–China cooperation')]: 'Coopération États-Unis–Chine',
      'engine.change': '{label} : {before} → {after}',
      'engine.list.comma': '{a} ; {b}',
      'engine.date.h1': 'S1 {year}',
      'engine.eta.one': 'Point de bascule dans ~{n} tour',
      'engine.eta.other': 'Point de bascule dans ~{n} tours',
    });
    expect(tr('Social cohesion 58 → 55')).toBe('Cohésion sociale : 58 → 55');
    expect(tr('US–China cooperation 53 → 56, Social cohesion 67 → 65')).toBe('Coopération États-Unis–Chine : 53 → 56 ; Cohésion sociale : 67 → 65');
    expect(tr('H1 2029')).toBe('S1 2029');
    expect(tr('Tipping point in ~3 rounds')).toBe('Point de bascule dans ~3 tours');
    // unknown text stays English
    expect(tr('Something the catalog never heard of')).toBe('Something the catalog never heard of');
  });

  it('a translation whose numbers no longer match the English (the English changed since) is not shown', () => {
    const E = englishEntries();
    const k = Object.keys(E).find((x) => x === 'threat.theft.ifUnprepared')!;
    useCatalog('fr', { [k]: 'Le vol réussit : +99, −99.' });
    expect(tr(E[k])).toBe(E[k]);
  });

  it('the pseudo-locale marks and lengthens every string, keeping placeholders', () => {
    useCatalog('xx', {});
    const p = t('ui.x', 'Round {n}', { n: 3 });
    expect(p.startsWith('⟦') && p.endsWith('⟧')).toBe(true);
    expect(p).toContain('3');
    expect(pseudo('Hello {name}')).toContain('{name}');
    expect(pseudo('Hello world, how are you').length).toBeGreaterThan('Hello world, how are you'.length * 1.25);
  });
});
