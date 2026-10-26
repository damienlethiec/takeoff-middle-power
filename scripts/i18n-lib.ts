// The translation tooling (npm run i18n:extract, npm run i18n:check; tests/i18n.test.ts uses the same functions).
//
// The English catalog, src/i18n/en.json, is generated from three sources:
//   - the content (src/data), walked by src/i18n/content.ts: "card.talks.text", "request.un_strike.left.label"…
//   - the templates of the strings the engine composes (src/i18n/templates.ts): "engine.change"…
//   - the UI's own strings, read from the code: every t('ui.key', 'English'), th(…) and tn('ui.key', n, { one, other })
//     call under src/ (the TypeScript parser finds them; the key and the English must be plain string literals).
// A locale file (fr.json…) holds the same keys, translated; missing keys fall back to English at run time.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { collectContent } from '../src/i18n/content';
import { isPluralKey, numberKey, placeholders } from '../src/i18n/match';
import { TEMPLATES } from '../src/i18n/templates';
import { derivableKeys } from '../src/i18n/index';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const I18N_DIR = join(ROOT, 'src/i18n');
export const LOCALES = ['fr', 'de', 'es', 'pl'] as const;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(f) ? [p] : [];
  });
}

const literal = (n: ts.Node | undefined): string | null => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

export interface UiExtract {
  strings: Record<string, string>;
  errors: string[];
}

/** Every t / th / tn call under src/ (outside src/i18n), with its key and English. */
export function extractUi(): UiExtract {
  const strings: Record<string, string> = {};
  const where: Record<string, string> = {};
  const errors: string[] = [];
  const add = (key: string, en: string, at: string) => {
    if (!/^ui\.[\w.-]+$/.test(key)) errors.push(`${at}: UI keys start with "ui." and use letters, digits, dots: ${key}`);
    if (key in strings && strings[key] !== en) errors.push(`${at}: key ${key} has two English texts ("${strings[key]}" at ${where[key]}, "${en}")`);
    strings[key] = en;
    where[key] ??= at;
  };
  for (const file of files(join(ROOT, 'src')).filter((f) => !f.includes(`${join('src', 'i18n')}`))) {
    const src = readFileSync(file, 'utf8');
    if (!/\b(t|th|tn)\(/.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['t', 'th', 'tn'].includes(n.expression.text)) {
        const name = n.expression.text;
        const at = `${relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
        const key = literal(n.arguments[0]);
        if (key === null) errors.push(`${at}: ${name}() needs a string literal key`);
        else if (name === 'tn') {
          const forms = n.arguments[2];
          if (!forms || !ts.isObjectLiteralExpression(forms)) errors.push(`${at}: tn() needs { one: '…', other: '…' }`);
          else
            for (const p of forms.properties) {
              if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
              const en = literal(p.initializer);
              if (en === null) errors.push(`${at}: tn() forms must be string literals`);
              else add(`${key}.${p.name.text}`, en, at);
            }
        } else {
          const en = literal(n.arguments[1]);
          if (en === null) errors.push(`${at}: ${name}('${key}', …) needs its English as a string literal`);
          else add(key, en, at);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return { strings, errors };
}

/** The whole English catalog, sorted by key. */
export function buildEnglish(): { catalog: Record<string, string>; errors: string[] } {
  const ui = extractUi();
  // content a template already builds ("Social cohesion: down a little") is translated once, as its parts
  const derived = derivableKeys();
  const content = Object.fromEntries(Object.entries(collectContent()).filter(([k]) => !derived.has(k)));
  const errors = [...ui.errors];
  const all: Record<string, string> = {};
  for (const src of [content, TEMPLATES, ui.strings])
    for (const [k, v] of Object.entries(src)) {
      if (k in all && all[k] !== v) errors.push(`duplicate key ${k}`);
      all[k] = v;
    }
  const catalog = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
  return { catalog, errors };
}

export const stringify = (o: Record<string, string>) => `${JSON.stringify(o, null, 2)}\n`;

export function readJson(file: string): Record<string, string> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
}

export interface LocaleReport {
  lang: string;
  total: number;
  translated: number;
  coverage: number;
  missing: string[];
  /** Errors: keys that do not exist in English, placeholders that differ, values that are not strings. */
  unknown: string[];
  placeholders: string[];
  /** Warnings: much longer than English, numbers that differ (the English changed since: English is shown). */
  long: string[];
  numbers: string[];
}

const PLURAL_SUFFIX = /\.(zero|one|two|few|many|other)$/;
const digits = numberKey;

/** Check one locale against English. */
export function checkLocale(lang: string, en: Record<string, string>, loc: Record<string, unknown>): LocaleReport {
  const r: LocaleReport = { lang, total: Object.keys(en).length, translated: 0, coverage: 0, missing: [], unknown: [], placeholders: [], long: [], numbers: [] };
  for (const [k, v] of Object.entries(loc)) {
    if (typeof v !== 'string') {
      r.unknown.push(`${k} (not a string)`);
      continue;
    }
    // a plural form English does not have (Polish "few", "many") is fine when its ".other" exists
    const base = k.replace(PLURAL_SUFFIX, '');
    const ref = k in en ? en[k] : isPluralKey(k) && `${base}.other` in en ? en[`${base}.other`] : undefined;
    if (ref === undefined) {
      r.unknown.push(k);
      continue;
    }
    if (!v.trim()) continue;
    if (k in en) r.translated += 1;
    if (placeholders(v).join() !== placeholders(ref).join()) r.placeholders.push(`${k}: expected {${placeholders(ref).join('}, {')}} in "${v}"`);
    if (ref.length >= 12 && v.length > ref.length * 1.6) r.long.push(`${k} (${v.length} vs ${ref.length} characters)`);
    if (digits(v) !== digits(ref)) r.numbers.push(`${k}: "${v}" (English: "${ref}")`);
  }
  r.missing = Object.keys(en).filter((k) => typeof loc[k] !== 'string' || !(loc[k] as string).trim());
  r.coverage = r.total ? Math.round((1000 * r.translated) / r.total) / 10 : 100;
  return r;
}
