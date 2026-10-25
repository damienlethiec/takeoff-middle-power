// Title screen, then the two-screen introduction from the copy (INTRO): the world in 2027 ("AI is grown,
// not built"), then your role, the two currencies and how a quarter works. Returning players skip straight
// to Q1; the "Tutorial tips" switch is on the title screen (and in the help dialog).

import { INTRO } from '../../data/copy';
import { focusOwnsKey, tabbables } from '../a11y';
import { ICON, esc, srcLink } from '../format';
import { WorldMap } from '../map';
import { bindTutorialToggles, introSeen, markIntroSeen, tutorialToggleHtml } from '../onboarding/settings';

/** Shown under the second screen's words: the two currencies, with the icons the header uses. */
const ROLE_EXTRA = `<div class="currencies">
    <div class="cur budget">${ICON.budget}<div><b>Budget</b><span>What Europe builds: experts, research, defences.</span></div></div>
    <div class="cur pc">${ICON.pc}<div><b>Political Capital</b><span>Deals and rules.</span></div></div>
  </div>`;

export function showOpening(): Promise<void> {
  return new Promise((resolve) => {
    const returning = introSeen();
    const root = document.createElement('div');
    root.className = 'opening';
    root.innerHTML = `<div class="op-map" aria-hidden="true"></div><div class="op-stage" role="dialog" aria-modal="true" aria-label="Introduction"></div>`;
    document.body.appendChild(root);
    new WorldMap(root.querySelector('.op-map')!, { decorative: true }).update({ capability: 60, tension: 62, verification: 20, coalition: 0, publicPressure: 20 });
    const stage = root.querySelector<HTMLElement>('.op-stage')!;
    let i = -1;

    const finish = () => {
      document.removeEventListener('keydown', onKey);
      markIntroSeen();
      root.classList.add('leaving');
      setTimeout(() => root.remove(), 400);
      resolve();
    };
    const go = (n: number) => {
      i = Math.max(-1, n);
      if (i >= INTRO.length) return finish();
      render();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Tab') {
        // the introduction is a modal dialog: keep Tab inside it
        const list = tabbables(stage);
        if (!list.length) return;
        const a = document.activeElement as HTMLElement | null;
        const first = list[0];
        const last = list[list.length - 1];
        if (!a || !stage.contains(a) || (ev.shiftKey ? a === first || !list.includes(a) : a === last)) {
          ev.preventDefault();
          (ev.shiftKey ? last : first).focus();
        }
        return;
      }
      if (ev.key === 'Enter' && !focusOwnsKey('Enter')) {
        ev.preventDefault();
        go(i + 1);
      } else if (ev.key === 'ArrowRight' && !focusOwnsKey('ArrowRight')) go(i + 1);
      else if (ev.key === 'ArrowLeft' && !focusOwnsKey('ArrowLeft')) go(i - 1);
      else if (ev.key === 'Escape') finish();
    };
    document.addEventListener('keydown', onKey);

    const render = () => {
      if (i < 0) {
        stage.className = 'op-stage title';
        // a returning player starts on "Skip to Q1"; a new one on "Begin"
        const begin = `<button class="${returning ? 'btn-quiet' : 'btn-primary big'}" data-go="next"${returning ? '' : ' data-first'}>${returning ? 'Read the introduction' : 'Begin <kbd>Enter</kbd>'}</button>`;
        const skip = `<button class="${returning ? 'btn-primary big' : 'btn-quiet'}" data-go="skip"${returning ? ' data-first' : ''}>Skip to Q1${returning ? ' <kbd>Esc</kbd>' : ''}</button>`;
        stage.innerHTML = `
          <h1 class="title-logo"><span>TAKE</span><span class="off">OFF</span></h1>
          <p class="title-sub">Middle Power</p>
          <p class="title-pitch">2027. AI is about to start improving itself. The US and China are racing. You speak for Europe.</p>
          ${returning ? '<p class="op-welcome">Welcome back.</p>' : ''}
          <div class="row-btns center">${returning ? skip + begin : begin + skip}</div>
          <div class="op-settings">${tutorialToggleHtml('op-tutorial')}</div>
          <p class="title-credit">A game about AI governance, built on the <a href="https://ai-2027.com" target="_blank" rel="noopener">AI 2027</a>, <a href="https://ai-2040.com" target="_blank" rel="noopener">AI 2040</a>, <a href="https://cfg.eu/advanced-ai-possible-futures/" target="_blank" rel="noopener">CFG <i>Advanced AI: Possible Futures</i></a> and <a href="https://europe2031.ai/summary" target="_blank" rel="noopener">Europe 2031</a> scenarios. About 15 minutes.</p>`;
        bindTutorialToggles(stage);
      } else {
        const s = INTRO[i];
        const last = i === INTRO.length - 1;
        stage.className = `op-stage slide s${i}`;
        stage.innerHTML = `
          <ol class="op-steps" aria-label="Step ${i + 1} of ${INTRO.length}">${INTRO.map((x, k) => `<li class="${k === i ? 'on' : k < i ? 'done' : ''}"${k === i ? ' aria-current="step"' : ''}>${esc(x.title)}</li>`).join('')}</ol>
          <h2 tabindex="-1">${esc(s.title)}</h2>
          ${s.paragraphs.map((p) => `<p class="op-body">${esc(p)}</p>`).join('')}
          ${last ? ROLE_EXTRA : ''}
          ${s.fact ? `<aside class="box real"><h3 class="op-real">Already real</h3><p>${esc(s.fact.text)}</p>${srcLink(s.fact.source)}</aside>` : ''}
          <div class="row-btns">
            <button class="btn-primary" data-go="next">${last ? 'Start the first quarter' : 'Next'} <kbd>Enter</kbd></button>
            <button class="btn-quiet" data-go="back">Back</button>
            <button class="btn-link" data-go="skip">Skip to Q1</button>
          </div>`;
      }
      stage.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
        b.addEventListener('click', () => {
          const g = b.dataset.go;
          if (g === 'next') go(i + 1);
          else if (g === 'back') go(i - 1);
          else finish();
        }),
      );
      // the title screen starts on its first button; each screen starts on its heading, so a screen reader reads
      // it from the top (Enter still goes on to the next screen while the heading has focus)
      (i < 0 ? stage.querySelector<HTMLElement>('[data-first]') : stage.querySelector<HTMLElement>('h2'))?.focus({ preventScroll: true });
    };
    render();
  });
}
