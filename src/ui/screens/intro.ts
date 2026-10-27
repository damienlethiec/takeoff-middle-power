// The intro: a landing that says in one sentence what you do and why, with the three stakes and Play (it fits one
// phone screen); then the world today, and what you can do with the three friends back home (the people you are
// doing this for). Skip goes straight to round 1. The landing carries the languages, and on a first visit the
// offer to play in the browser's language (src/ui/lang.ts).

import { BUILT_ON, GAUGE_LABEL, INTRO } from '../../data/copy';
import type { GaugeKey } from '../../engine/types';
import { t, tc, type AnyLang } from '../../i18n';
import { esc, factBox, kbd, link, provLabel } from '../format';
import { friendPortrait } from '../friends';
import { chooseLang, langRowHtml, offerHtml, offeredLang } from '../lang';
import { announce } from '../a11y';
import { openModal } from '../modal';

const brand = () => `<p class="intro-brand" aria-hidden="true"><span class="logo">TAKE<i>OFF</i></span><span class="sub">${esc(t('ui.brand.sub', 'Europe’s Next Move'))}</span></p>`;

/** The "Built on" block: the three scenarios with links, the calendar, and the tags the news carries (in words). */
function builtOn(): string {
  const B = BUILT_ON;
  const kinds = ['real', 'ai2027', 'cfg', 'e2031', 'game'] as const;
  return `<section class="built-on" aria-labelledby="built-on-h"><h3 id="built-on-h">${esc(tc('builtOn.title', B.title))}</h3><ul>${B.scenarios
    .map((x, i) => `<li><b>${link(x.source, x.name)}</b> (<span lang="en">${esc(x.by)}</span>): ${esc(tc(`builtOn.scenarios.${i}.what`, x.what))}</li>`)
    .join('')}</ul><p>${esc(tc('builtOn.calendar.text', B.calendar.text))} (${link(B.calendar.source, tc('builtOn.calendar.linkText', B.calendar.linkText))})</p><p>${esc(tc('builtOn.tagsText', B.tagsText))} ${kinds
    .map((k) => `<span class="tag prov p-${k}">${esc(provLabel(k))}</span>`)
    .join(' ')}</p></section>`;
}

/** The landing's stakes, in order: each names the gauge that measures it (and takes its colour). */
const STAKE_GAUGES: GaugeKey[] = ['confidence', 'cooperation', 'cohesion'];

function screenHtml(i: number, focusLang: AnyLang | null, replay = false): string {
  const sc = INTRO[i];
  const last = i === INTRO.length - 1;
  const landing = i === 0;
  const offer = landing ? offeredLang() : null;
  const row = landing ? langRowHtml() : '';
  const primary = landing
    ? `<button type="button" class="btn-primary big" data-primary data-action="next">${esc(t('ui.intro.play', 'Play (about 15 min)'))} ${kbd('enter')}</button>`
    : `<button type="button" class="btn-primary" data-primary data-action="next">${esc(last ? t('ui.intro.start', 'Start round 1') : t('ui.common.next', 'Next'))} ${kbd('enter')}</button>`;
  return `<div class="intro-in${landing ? ' landing' : ''}">
        ${brand()}
        ${row}
        ${offer ? offerHtml(offer) : ''}
        ${landing ? '' : `<div class="dateline">${esc(t('ui.intro.nOf', '{n} of {count}', { n: i, count: INTRO.length - 1 }))}</div>`}
        <h2 tabindex="-1" ${focusLang ? '' : 'data-autofocus'}>${esc(tc(`intro.${i}.title`, sc.title))}</h2>
        ${sc.paragraphs.map((p, j) => `<p${landing ? ' class="lead"' : ''}>${esc(tc(`intro.${i}.paragraphs.${j}`, p))}</p>`).join('')}
        ${
          sc.stakes
            ? `<ul class="stakes">${sc.stakes
                .map((s, j) => {
                  const g = STAKE_GAUGES[j];
                  return `<li>${esc(tc(`intro.${i}.stakes.${j}`, s))}${g ? `<span class="stake-g">${esc(tc(`gauge.${g}.label`, GAUGE_LABEL[g]))}</span>` : ''}</li>`;
                })
                .join('')}</ul>`
            : ''
        }
        ${sc.after ? `<p class="intro-after">${esc(tc(`intro.${i}.after`, sc.after))}</p>` : ''}
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
          ${primary}
          ${last ? '' : `<button type="button" class="btn-link" data-action="skip" data-escape>${esc(t('ui.intro.skip', 'Skip to round 1'))}</button>`}
        </div>
        ${
          landing && replay
            ? `<p class="intro-replay"><button type="button" class="btn-link small" data-action="replay" aria-describedby="intro-replay-hint">${esc(t('ui.tutorial.replay', 'Replay with the tutorial'))}</button> <span class="muted small" id="intro-replay-hint">${esc(t('ui.tutorial.landingHint', 'Played before? See the gauges one at a time and every tip again.'))}</span></p>`
            : ''
        }
        ${sc.credit ? `<p class="intro-credit">${esc(tc(`intro.${i}.credit`, sc.credit))}</p>` : ''}
      </div>`;
}

/**
 * `onReplay`: offered on the landing to a player who has finished a game here or turned the tips off ("Replay with
 * the tutorial", secondary): it turns the first-game mode back on and goes on like Play.
 */
export async function showIntro(onReplay?: () => void): Promise<void> {
  let focusLang: AnyLang | null = null;
  let replayed = false;
  for (let i = 0; i < INTRO.length; ) {
    const m = openModal(screenHtml(i, focusLang, !!onReplay && !replayed), { cls: 'intro', overlayCls: 'intro-ov', label: t('ui.intro.label', 'Introduction'), outside: false });
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
    if (a === 'replay') {
      onReplay?.();
      replayed = true;
      // said in the next screen's own live region, once it is open
      setTimeout(() => announce(t('ui.tutorial.on', 'Tutorial on: a new game as a first game, with every tip.')), 60);
    }
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
        <h2>${esc(t('ui.continue.title', 'Welcome back'))}</h2>
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
