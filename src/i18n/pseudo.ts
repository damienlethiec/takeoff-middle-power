// The pseudo-locale (?lang=xx): English with accents and about 35% more length, between ⟦ ⟧, so a string that
// was not translated (plain English) or was cut (no closing ⟧) stands out on screen. Placeholders are kept.

const ACCENT: Record<string, string> = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ď', e: 'é', f: 'ƒ', g: 'ğ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ł', m: 'ḿ', n: 'ñ', o: 'ö', p: 'þ', q: 'ʠ', r: 'ř', s: 'š', t: 'ţ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ď', E: 'É', F: 'Ƒ', G: 'Ğ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ł', M: 'Ḿ', N: 'Ñ', O: 'Ö', P: 'Þ', R: 'Ř', S: 'Š', T: 'Ţ', U: 'Ü', V: 'Ṽ', W: 'Ŵ', Y: 'Ý', Z: 'Ž',
};

export function pseudo(en: string): string {
  if (!en) return en;
  const out = en
    .split(/(\{\w+\})/)
    .map((p, i) => (i % 2 ? p : p.replace(/[A-Za-z]/g, (c) => ACCENT[c] ?? c)))
    .join('');
  // lengthen by about a third (German and Polish run about 30% longer than English)
  const letters = en.replace(/\{\w+\}/g, '').length;
  // in words of up to six characters, as real text breaks (German compounds aside)
  const extra = letters > 3 ? Math.max(1, Math.round(letters * 0.35) - 1) : 0;
  const pad = extra ? ` ${'~'.repeat(extra).replace(/(.{6})(?=.)/g, '$1 ')}` : '';
  return `⟦${out}${pad}⟧`;
}
