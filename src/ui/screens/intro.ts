// The two intro screens: the world today, then you and your goal. Skip goes straight to round 1.

import { CREDITS, INTRO } from '../../data/copy';
import { esc, factBox } from '../format';
import { openModal } from '../modal';

export async function showIntro(): Promise<void> {
  for (let i = 0; i < INTRO.length; ) {
    const sc = INTRO[i];
    const last = i === INTRO.length - 1;
    const m = openModal(
      `<div class="intro-in">
        <p class="intro-brand" aria-hidden="true"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Europe’s Next Move</span></p>
        <div class="dateline">${i + 1} of ${INTRO.length}</div>
        <h2 tabindex="-1" data-autofocus>${esc(sc.title)}</h2>
        ${sc.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${sc.stakes ? `<ul class="stakes">${sc.stakes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
        ${sc.fact ? factBox(sc.fact) : ''}
        ${last ? `<p class="credits">${esc(CREDITS)}</p>` : ''}
        <div class="row-btns">
          ${i > 0 ? '<button type="button" class="btn-quiet" data-action="back">Back</button>' : ''}
          <button type="button" class="btn-primary" data-primary data-action="next">${last ? 'Start round 1' : 'Next'} <kbd>Enter</kbd></button>
          ${last ? '' : '<button type="button" class="btn-link" data-action="skip" data-escape>Skip to round 1</button>'}
        </div>
      </div>`,
      { cls: 'intro', overlayCls: 'intro-ov', label: 'Introduction' },
    );
    m.el.setAttribute('aria-label', 'Introduction');
    m.el.removeAttribute('aria-labelledby');
    const a = await m.result;
    if (a === 'skip') return;
    i += a === 'back' ? -1 : 1;
  }
}
