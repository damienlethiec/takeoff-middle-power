// The keyboard shortcuts, listed on screen (the "?" button in the header, or the ? key).

import { setSingleKeyShortcuts, shortcutsOn } from '../a11y';
import { openModal } from '../modal';
import { ONBOARDING_KEYS, bindTutorialToggles, tutorialToggleHtml } from '../onboarding/settings'; // v2-onboarding

const KEYS: [string, string][] = [
  ['Tab / Shift+Tab', 'Move between buttons: the clock, the map (Léa, event pins, concern bubbles), the indicators'],
  ['Enter or Space', 'Press the focused button'],
  ['Space', 'Pause or resume the clock (when no button has focus)'],
  ['Enter', "Confirm: the highlighted button of a report, decision or message (when no button has focus)"],
  ['Escape', 'Close a message or an indicator; from the report or your cards, look at the map'],
  ['P', 'Pause or resume the clock'],
  ['C', 'Collect a public-concern bubble (+1 Political Capital)'],
  ['1 / 2', 'Normal or double speed'],
  ['?', 'Show these shortcuts'],
  ...ONBOARDING_KEYS, // v2-onboarding
];

export async function showHelp(): Promise<void> {
  const m = openModal(
    `<h2>Keyboard shortcuts</h2>
     <dl class="keys">${KEYS.map(([k, what]) => `<div><dt>${k
       .split(' ')
       .map((w) => (/^(or|\/)$/.test(w) ? ` ${w} ` : `<kbd>${w}</kbd>`))
       .join('')}</dt><dd>${what}</dd></div>`).join('')}</dl>
     <p class="muted">Bubbles stay while the clock is paused: pause, then collect them at your own pace.</p>
     <label class="toggle"><input type="checkbox" id="single-keys" ${shortcutsOn() ? 'checked' : ''}> Single-key shortcuts (P, C, 1, 2, ?)</label>
     ${tutorialToggleHtml('help-tutorial')}
     <div class="row-btns"><button class="btn-primary" data-primary data-escape data-action="ok">Back to the game <kbd>Enter</kbd></button></div>`,
    { cls: 'help', label: 'Keyboard shortcuts' },
  );
  m.el.querySelector<HTMLInputElement>('#single-keys')!.addEventListener('change', (e) => setSingleKeyShortcuts((e.target as HTMLInputElement).checked));
  bindTutorialToggles(m.el); // v2-onboarding
  await m.result;
}
