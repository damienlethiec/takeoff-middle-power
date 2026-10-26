// npm run i18n:extract   regenerate src/i18n/en.json from the English source (content, engine templates, UI strings)
// npm run i18n:check     per locale: coverage, missing keys, unknown keys and placeholder errors (these fail),
//                        warnings for translations much longer than English or with other numbers
// npm run i18n:missing -- fr   print the keys fr.json still lacks, with their English, as JSON (to fill in)

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { I18N_DIR, LOCALES, buildEnglish, checkLocale, readJson, stringify } from './i18n-lib';

const [cmd = 'check', arg] = process.argv.slice(2);

function english() {
  const { catalog, errors } = buildEnglish();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  return catalog;
}

if (cmd === 'extract') {
  const en = english();
  writeFileSync(join(I18N_DIR, 'en.json'), stringify(en));
  console.log(`src/i18n/en.json: ${Object.keys(en).length} keys`);
} else if (cmd === 'missing') {
  const en = english();
  const loc = readJson(join(I18N_DIR, `${arg}.json`));
  const r = checkLocale(arg, en, loc);
  console.log(stringify(Object.fromEntries(r.missing.map((k) => [k, en[k]]))));
} else {
  const en = english();
  const onDisk = readJson(join(I18N_DIR, 'en.json'));
  let failed = false;
  if (stringify(onDisk) !== stringify(en)) {
    console.error('src/i18n/en.json is out of date: run npm run i18n:extract');
    failed = true;
  }
  console.log(`English: ${Object.keys(en).length} keys`);
  for (const lang of (arg ? [arg] : LOCALES) as string[]) {
    const r = checkLocale(lang, en, readJson(join(I18N_DIR, `${lang}.json`)));
    console.log(`\n${lang}: ${r.coverage}% translated (${r.translated} of ${r.total}), ${r.missing.length} missing`);
    for (const x of r.unknown) console.log(`  ERROR unknown key: ${x}`);
    for (const x of r.placeholders) console.log(`  ERROR placeholders: ${x}`);
    for (const x of r.numbers) console.log(`  warning, numbers differ (English is shown until fixed): ${x}`);
    for (const x of r.long) console.log(`  warning, more than 1.6× the English: ${x}`);
    if (r.unknown.length || r.placeholders.length) failed = true;
  }
  if (failed) process.exit(1);
}
