// The two intro screens: the world today, then you, your goal and your friend Léa. Skip goes straight to round 1.

import { CREDITS, INTRO } from '../../data/copy';
import { esc, factBox } from '../format';
import { leaPortrait } from '../friends';
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
        ${sc.lea ? `<div class="intro-lea">${leaPortrait('hopeful', 'Léa')}<div>${sc.lea.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div>` : ''}
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

/**
 * A saved game exists: "Continue your game (H2 2028, round 4)" is the primary button (focus lands on it), with
 * "New game" beside it. New game asks first, in a dialog of its own; Cancel comes back here.
 */
export async function showContinue(label: string): Promise<'continue' | 'new'> {
  for (;;) {
    const m = openModal(
      `<div class="intro-in">
        <p class="intro-brand" aria-hidden="true"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Europe’s Next Move</span></p>
        <div class="dateline">Saved game</div>
        <h2>Welcome back, Envoy</h2>
        <p>Your game was saved where you left it. The current six months start again from their beginning, with every decision you made kept.</p>
        <div class="row-btns">
          <button type="button" class="btn-primary" data-primary data-autofocus data-action="continue">Continue your game (${esc(label)}) <kbd>Enter</kbd></button>
          <button type="button" class="btn-quiet" data-action="new">New game</button>
        </div>
      </div>`,
      { cls: 'intro', overlayCls: 'intro-ov', label: 'Saved game' },
    );
    if ((await m.result) === 'continue') return 'continue';
    const c = openModal(
      `<div class="dateline">New game</div>
       <h2>Start over?</h2>
       <p class="confirm-text">Your current game will be lost.</p>
       <div class="row-btns">
         <button type="button" class="btn-primary" data-action="new">Start over</button>
         <button type="button" class="btn-quiet" data-autofocus data-escape data-action="cancel">Cancel</button>
       </div>`,
      { cls: 'confirm', overlayCls: 'intro-ov', describedBy: '.confirm-text', label: 'Start over?' },
    );
    if ((await c.result) === 'new') return 'new';
  }
}
