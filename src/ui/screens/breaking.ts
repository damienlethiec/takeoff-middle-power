// Breaking news: the headline, a two-line scene, the impact on each gauge (before → after), whether Europe
// was prepared and by which card, and an "Already real" fact with its source.

import type { PendingEvent } from '../../engine/types';
import { t, tr } from '../../i18n';
import { ICON, andList, esc, factBox, impactLine, provTag } from '../format';
import { glossed } from '../glossary';
import { openModal } from '../modal';

export async function showBreaking(ev: PendingEvent, date: string, cardNames: string[]): Promise<string | undefined> {
  const prep =
    ev.prepared === null
      ? ''
      : `<p class="prep ${ev.prepared ? 'yes' : 'no'}">${ev.prepared ? ICON.check : ICON.cross}<span><b>${esc(ev.prepared ? t('ui.prep.yes', 'Prepared.') : t('ui.prep.no', 'Not prepared.'))}</b> ${esc(tr(ev.preparedText))}${
          !ev.prepared && cardNames.length ? ` ${esc(t('ui.breaking.wouldHave', 'What would have helped: {names}.', { names: andList(cardNames) }))}` : ''
        }</span></p>`;
  const choose = ev.options.length > 0;
  const m = openModal(
    `<div class="dateline"><span class="tag-breaking">${esc(t('ui.breaking.tag', 'Breaking news'))}</span> ${esc(date)} ${provTag(ev.basis)}</div>
     <h2>${esc(tr(ev.title))}</h2>
     <p class="scene">${glossed(ev.scene)}</p>
     ${prep}
     ${
       choose
         ? `<p class="label" id="bk-choose">${esc(t('ui.breaking.yourAnswer', 'Your answer'))}</p><div class="choices" role="group" aria-labelledby="bk-choose">${ev.options
             .map((o) => `<button type="button" class="choice" data-action="${esc(o.id)}"><b>${esc(tr(o.label))}</b><span>${esc(tr(o.detail))}</span></button>`)
             .join('')}</div>`
         : `<p class="label">${esc(t('ui.breaking.whatItDid', 'What it did'))}</p><ul class="imps">${ev.impacts.length ? ev.impacts.map(impactLine).join('') : `<li class="imp flat">${esc(t('ui.breaking.noMove', 'No gauge moved.'))}</li>`}</ul>`
     }
     ${ev.fact ? factBox(ev.fact) : ''}
     <p class="muted small">${esc(t('ui.basis.basedOn', 'Based on:'))} <span lang="en">${esc(ev.basis.ref)}</span>.</p>
     ${choose ? '' : `<div class="row-btns"><button type="button" class="btn-primary" data-primary data-action="ok">${esc(t('ui.common.continue', 'Continue'))} <kbd>Enter</kbd></button></div>`}`,
    { cls: 'breaking', label: t('ui.breaking.tag', 'Breaking news'), describedBy: '.scene' },
  );
  const a = await m.result;
  return choose ? a : undefined;
}
