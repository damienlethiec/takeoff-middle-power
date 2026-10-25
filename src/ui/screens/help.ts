// The keyboard shortcuts, listed on screen (the "?" button in the header, or the ? key).

import { setSingleKeyShortcuts, shortcutsOn } from '../a11y';
import { openModal } from '../modal';

const KEYS: [string, string][] = [
  ['Tab / Shift+Tab', 'Move between buttons: the clock, your income, the risks, the map (Léa, event pins, concern bubbles), the indicators'],
  ['Enter or Space', 'Press the focused button'],
  ['Space', 'Pause or resume the clock (when no button has focus)'],
  ['Enter', "Confirm: the highlighted button of a report, decision or message (when no button has focus)"],
  ['Escape', 'Close a message, an indicator or a concern; from the report or your cards, back to the map'],
  ['Enter or D', 'Make my decision, once the report is read (the game waits for you)'],
  ['P', 'Pause or resume the clock'],
  ['C', 'Read the latest public concern on the map'],
  ['1 / 2', 'Normal or double speed'],
  ['?', 'Show these shortcuts'],
];

export async function showHelp(): Promise<void> {
  const m = openModal(
    `<h2>Keyboard shortcuts</h2>
     <dl class="keys">${KEYS.map(([k, what]) => `<div><dt>${k
       .split(' ')
       .map((w) => (/^(or|\/)$/.test(w) ? ` ${w} ` : `<kbd>${w}</kbd>`))
       .join('')}</dt><dd>${what}</dd></div>`).join('')}</dl>
     <p class="muted">Speech bubbles on the map show what worries people. They stay while the clock is paused: pause, then read them at your own pace.</p>
     <label class="toggle"><input type="checkbox" id="single-keys" ${shortcutsOn() ? 'checked' : ''}> Single-key shortcuts (P, C, D, 1, 2, ?)</label>
     <div class="row-btns"><button class="btn-primary" data-primary data-escape data-action="ok">Back to the game <kbd>Enter</kbd></button></div>`,
    { cls: 'help', label: 'Keyboard shortcuts' },
  );
  m.el.querySelector<HTMLInputElement>('#single-keys')!.addEventListener('change', (e) => setSingleKeyShortcuts((e.target as HTMLInputElement).checked));
  await m.result;
}
