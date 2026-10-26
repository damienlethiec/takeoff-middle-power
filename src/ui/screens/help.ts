// Help: the rules in six lines, the keyboard shortcuts, the tutorial switch and every tip.

import { HELP } from '../../data/copy';
import { tipHtml } from '../coach';
import { esc } from '../format';
import { openModal } from '../modal';

export async function showHelp(opts: {
  tutorial: boolean;
  onTutorial: (on: boolean) => void;
  shortcuts: boolean;
  onShortcuts: (on: boolean) => void;
  tips?: { round: number; title: string; text: string }[];
}): Promise<void> {
  const m = openModal(
    `<div class="dateline">Help</div>
     <h2>How to play</h2>
     <ul class="rules">${HELP.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
     <h3>Keyboard</h3>
     <dl class="keys">${HELP.shortcuts.map(([k, v]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
     <p class="muted small">Space and Enter act on the focused button first. Shortcuts never fire while you type.</p>
     <label class="switch"><input type="checkbox" id="keys-switch" ${opts.shortcuts ? 'checked' : ''}/> Single-key shortcuts (N and ?)</label>
     <h3>Tutorial</h3>
     <label class="switch"><input type="checkbox" id="tut-switch" ${opts.tutorial ? 'checked' : ''}/> Show tips the first time each part of the screen matters</label>
     ${opts.tips?.length ? `<details class="older"><summary>All tips (${opts.tips.length})</summary><ul class="rules">${opts.tips.map((t) => `<li><b>${esc(t.title)}</b>${tipHtml(t.text)}</li>`).join('')}</ul></details>` : ''}
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Close <kbd>Esc</kbd></button></div>`,
    { cls: 'help', label: 'Help' },
  );
  m.el.querySelector<HTMLInputElement>('#tut-switch')!.addEventListener('change', (e) => opts.onTutorial((e.target as HTMLInputElement).checked));
  m.el.querySelector<HTMLInputElement>('#keys-switch')!.addEventListener('change', (e) => opts.onShortcuts((e.target as HTMLInputElement).checked));
  await m.result;
}
