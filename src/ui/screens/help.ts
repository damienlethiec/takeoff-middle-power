// Help: the rules in six lines, the keyboard shortcuts, the tutorial switch, every tip and a short privacy note.
// Resolves 'forget' when the player asks to forget their save and settings (the caller does it), else 'ok'.

import { AUTHORS, HELP } from '../../data/copy';
import { t, tc, tr } from '../../i18n';
import { tipHtml } from '../coach';
import { esc, kbd, link } from '../format';
import { glossaryListHtml } from '../glossary';
import { openModal } from '../modal';

export async function showHelp(opts: {
  tutorial: boolean;
  onTutorial: (on: boolean) => void;
  shortcuts: boolean;
  onShortcuts: (on: boolean) => void;
  tips?: { round: number; title: string; text: string }[];
}): Promise<string> {
  const m = openModal(
    `<div class="dateline">${esc(t('ui.help.dateline', 'Help'))}</div>
     <h2>${esc(t('ui.help.title', 'How to play'))}</h2>
     <ul class="rules">${HELP.rules.map((r, i) => `<li>${esc(tc(`help.rules.${i}`, r))}</li>`).join('')}</ul>
     <h3>${esc(t('ui.help.words', 'Words used in the game'))}</h3>
     <p class="muted small">${esc(t('ui.help.wordsHint', 'In requests, cards and news, an underlined word opens its meaning.'))}</p>
     ${glossaryListHtml()}
     <h3>${esc(t('ui.help.keyboard', 'Keyboard'))}</h3>
     <dl class="keys">${HELP.shortcuts.map(([k, v], i) => `<div><dt><kbd>${esc(tc(`help.shortcuts.${i}.key`, k))}</kbd></dt><dd>${esc(tc(`help.shortcuts.${i}.what`, v))}</dd></div>`).join('')}</dl>
     <p class="muted small">${esc(t('ui.help.keysNote', 'Space and Enter act on the focused button first. Shortcuts never fire while you type.'))}</p>
     <label class="switch"><input type="checkbox" id="keys-switch" ${opts.shortcuts ? 'checked' : ''}/> ${esc(t('ui.help.singleKeys', 'Single-key shortcuts (N and ?)'))}</label>
     <h3>${esc(t('ui.help.tutorial', 'Tutorial'))}</h3>
     <label class="switch"><input type="checkbox" id="tut-switch" aria-describedby="tut-hint" ${opts.tutorial ? 'checked' : ''}/> ${esc(t('ui.help.tutorialSwitch', 'Show tips the first time each part of the screen matters'))}</label>
     <p class="muted small" id="tut-hint">${esc(t('ui.help.tutorialHint', 'In a first game the gauges join the screen one at a time. With tips off, or once you have finished a game, everything shows from round 1.'))}</p>
     ${opts.tips?.length ? `<details class="older"><summary>${esc(t('ui.help.allTips', 'All tips ({n})', { n: opts.tips.length }))}</summary><ul class="rules">${opts.tips.map((x) => `<li><b>${esc(tr(x.title))}</b>${tipHtml(tr(x.text))}</li>`).join('')}</ul></details>` : ''}
     <h3>${esc(t('ui.help.privacy', 'Privacy'))}</h3>
     <p>${HELP.privacy.map((x, i) => esc(tc(`help.privacy.${i}`, x))).join(' ')} ${link(HELP.privacyLink, t('ui.help.privacyLink', 'GitHub’s privacy statement'))}.</p>
     <p class="row-btns"><button type="button" class="btn-quiet" data-action="forget" aria-describedby="forget-hint">${esc(t('ui.help.forget', 'Forget my save'))}</button></p>
     <p class="muted small" id="forget-hint">${esc(tc('help.forgetHint', HELP.forgetHint))}</p>
     <p class="muted small">${esc(t('ui.common.copyright', '© 2026 {authors}. All rights reserved.', { authors: AUTHORS }))}</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.common.close', 'Close'))} ${kbd('esc')}</button></div>`,
    { cls: 'help', label: t('ui.help.dateline', 'Help') },
  );
  m.el.querySelector<HTMLInputElement>('#tut-switch')!.addEventListener('change', (e) => opts.onTutorial((e.target as HTMLInputElement).checked));
  m.el.querySelector<HTMLInputElement>('#keys-switch')!.addEventListener('change', (e) => opts.onShortcuts((e.target as HTMLInputElement).checked));
  return m.result;
}
