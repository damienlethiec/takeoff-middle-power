// The two intro screens: the world today, then you, your goal and the three friends back home (the people you are
// doing this for). Skip goes straight to round 1. The first screen carries the languages, and on a first visit the
// offer to play in the browser's language (src/ui/lang.ts).

import { BUILT_ON, INTRO } from '../../data/copy';
import { t, tc, type AnyLang } from '../../i18n';
import { esc, factBox, kbd, link, provLabel } from '../format';
import { friendPortrait } from '../friends';
import { chooseLang, langRowHtml, offerHtml, offeredLang } from '../lang';
import { openModal } from '../modal';

const brand = () => `<p class="intro-brand" aria-hidden="true"><span class="logo">TAKE<i>OFF</i></span><span class="sub">${esc(t('ui.brand.sub', 'Europe’s Next Move'))}</span></p>`;

/** The "Built on" block: the two scenarios with links, the calendar, and the tags the news carries (in words). */
function builtOn(): string {
  const B = BUILT_ON;
  const kinds = ['real', 'ai2027', 'cfg', 'game'] as const;
  return `<section class="built-on" aria-labelledby="built-on-h"><h3 id="built-on-h">${esc(tc('builtOn.title', B.title))}</h3><ul>${B.scenarios
    .map((x, i) => `<li><b>${link(x.source, x.name)}</b> (<span lang="en">${esc(x.by)}</span>): ${esc(tc(`builtOn.scenarios.${i}.what`, x.what))}</li>`)
    .join('')}</ul><p>${esc(tc('builtOn.calendar.text', B.calendar.text))} (${link(B.calendar.source, tc('builtOn.calendar.linkText', B.calendar.linkText))})</p><p>${esc(tc('builtOn.tagsText', B.tagsText))} ${kinds
    .map((k) => `<span class="tag prov p-${k}">${esc(provLabel(k))}</span>`)
    .join(' ')}</p></section>`;
}

function screenHtml(i: number, focusLang: AnyLang | null): string {
  const sc = INTRO[i];
  const last = i === INTRO.length - 1;
  const offer = i === 0 ? offeredLang() : null;
  const row = i === 0 ? langRowHtml() : '';
  return `<div class="intro-in">
        ${brand()}
        ${row}
        ${offer ? offerHtml(offer) : ''}
        <div class="dateline">${esc(t('ui.intro.nOf', '{n} of {count}', { n: i + 1, count: INTRO.length }))}</div>
        <h2 tabindex="-1" ${focusLang ? '' : 'data-autofocus'}>${esc(tc(`intro.${i}.title`, sc.title))}</h2>
        ${sc.paragraphs.map((p, j) => `<p>${esc(tc(`intro.${i}.paragraphs.${j}`, p))}</p>`).join('')}
        ${sc.stakes ? `<ul class="stakes">${sc.stakes.map((s, j) => `<li>${esc(tc(`intro.${i}.stakes.${j}`, s))}</li>`).join('')}</ul>` : ''}
        ${
          sc.friends?.length
            ? `<section class="intro-friends" aria-labelledby="intro-friends-h"><h3 id="intro-friends-h">${esc(t('ui.intro.friends', 'The people you’re doing this for'))}</h3><ul>${sc.friends
                .map((f) => `<li>${friendPortrait(f.friend, 'hopeful')}<p>${esc(tc(`intro.${i}.friends.${f.friend}`, f.line))}</p></li>`)
                .join('')}</ul></section>`
            : ''
        }
        ${sc.fact ? factBox(sc.fact) : ''}
        ${last ? builtOn() : ''}
        <div class="row-btns">
          ${i > 0 ? `<button type="button" class="btn-quiet" data-action="back">${esc(t('ui.common.back', 'Back'))}</button>` : ''}
          <button type="button" class="btn-primary" data-primary data-action="next">${esc(last ? t('ui.intro.start', 'Start round 1') : t('ui.common.next', 'Next'))} ${kbd('enter')}</button>
          ${last ? '' : `<button type="button" class="btn-link" data-action="skip" data-escape>${esc(t('ui.intro.skip', 'Skip to round 1'))}</button>`}
        </div>
      </div>`;
}

export async function showIntro(): Promise<void> {
  let focusLang: AnyLang | null = null;
  for (let i = 0; i < INTRO.length; ) {
    const m = openModal(screenHtml(i, focusLang), { cls: 'intro', overlayCls: 'intro-ov', label: t('ui.intro.label', 'Introduction') });
    m.el.setAttribute('aria-label', t('ui.intro.label', 'Introduction'));
    m.el.removeAttribute('aria-labelledby');
    // after a change of language, focus goes back to the language just chosen
    if (focusLang) {
      const l = focusLang;
      requestAnimationFrame(() => m.el.querySelector<HTMLElement>(`.lang-row [data-lang="${l}"]`)?.focus());
    }
    focusLang = null;
    // a language button re-opens the same screen in that language
    const picked = new Promise<string>((resolve) =>
      m.el.addEventListener('click', (ev) => {
        const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-lang]');
        if (b) resolve(`lang:${b.dataset.lang}`);
      }),
    );
    const a = await Promise.race([m.result, picked]);
    if (a.startsWith('lang:')) {
      m.close();
      focusLang = a.slice(5) as AnyLang;
      await chooseLang(focusLang);
      continue;
    }
    if (a === 'skip') return;
    i += a === 'back' ? -1 : 1;
  }
}

/**
 * A saved game exists: "Continue your game (H2 2028, round 4)" is the primary button (focus lands on it), with
 * "New game" beside it. New game asks first, in a dialog of its own; Cancel comes back here.
 */
export async function showContinue(label: string): Promise<'continue' | 'new'> {
  for (;;) {
    const m = openModal(
      `<div class="intro-in">
        ${brand()}
        <div class="dateline">${esc(t('ui.continue.dateline', 'Saved game'))}</div>
        <h2>${esc(t('ui.continue.title', 'Welcome back, Envoy'))}</h2>
        <p>${esc(t('ui.continue.text', 'Your game was saved where you left it. The current six months start again from their beginning, with every decision you made kept.'))}</p>
        <div class="row-btns">
          <button type="button" class="btn-primary" data-primary data-autofocus data-action="continue">${esc(t('ui.continue.button', 'Continue your game ({where})', { where: label }))} ${kbd('enter')}</button>
          <button type="button" class="btn-quiet" data-action="new">${esc(t('ui.continue.new', 'New game'))}</button>
        </div>
      </div>`,
      { cls: 'intro', overlayCls: 'intro-ov', label: t('ui.continue.dateline', 'Saved game') },
    );
    if ((await m.result) === 'continue') return 'continue';
    const c = openModal(
      `<div class="dateline">${esc(t('ui.continue.new', 'New game'))}</div>
       <h2>${esc(t('ui.continue.startOver', 'Start over?'))}</h2>
       <p class="confirm-text">${esc(t('ui.continue.lost', 'Your current game will be lost.'))}</p>
       <div class="row-btns">
         <button type="button" class="btn-primary" data-action="new">${esc(t('ui.continue.startOverButton', 'Start over'))}</button>
         <button type="button" class="btn-quiet" data-autofocus data-escape data-action="cancel">${esc(t('ui.common.cancel', 'Cancel'))}</button>
       </div>`,
      { cls: 'confirm', overlayCls: 'intro-ov', describedBy: '.confirm-text', label: t('ui.continue.startOver', 'Start over?') },
    );
    if ((await c.result) === 'new') return 'new';
  }
}
