// Breaking news: the headline, a two-line scene, the impact on each gauge (before → after), whether Europe
// was prepared and by which card, and an "Already real" fact with its source.

import type { PendingEvent } from '../../engine/types';
import { ICON, esc, factBox, impactLine } from '../format';
import { openModal } from '../modal';

export async function showBreaking(ev: PendingEvent, date: string, cardNames: string[]): Promise<string | undefined> {
  const prep =
    ev.prepared === null
      ? ''
      : `<p class="prep ${ev.prepared ? 'yes' : 'no'}">${ev.prepared ? ICON.check : ICON.cross}<span><b>${ev.prepared ? 'Prepared.' : 'Not prepared.'}</b> ${esc(ev.preparedText)}${
          !ev.prepared && cardNames.length ? ` What would have helped: ${esc(cardNames.join(' and '))}.` : ''
        }</span></p>`;
  const choose = ev.options.length > 0;
  const m = openModal(
    `<div class="dateline"><span class="tag-breaking">Breaking news</span> ${esc(date)}</div>
     <h2>${esc(ev.title)}</h2>
     <p class="scene">${esc(ev.scene)}</p>
     ${prep}
     ${
       choose
         ? `<p class="label" id="bk-choose">Your answer</p><div class="choices" role="group" aria-labelledby="bk-choose">${ev.options
             .map((o) => `<button type="button" class="choice" data-action="${esc(o.id)}"><b>${esc(o.label)}</b><span>${esc(o.detail)}</span></button>`)
             .join('')}</div>`
         : `<p class="label">What it did</p><ul class="imps">${ev.impacts.length ? ev.impacts.map(impactLine).join('') : '<li class="imp flat">No gauge moved.</li>'}</ul>`
     }
     ${ev.fact ? factBox(ev.fact) : ''}
     ${choose ? '' : '<div class="row-btns"><button type="button" class="btn-primary" data-primary data-action="ok">Continue <kbd>Enter</kbd></button></div>'}`,
    { cls: 'breaking', label: 'Breaking news', describedBy: '.scene' },
  );
  const a = await m.result;
  return choose ? a : undefined;
}
