// Onboarding settings kept in the browser: the "Tutorial on/off" switch and whether the introduction was seen.
// Every storage access is wrapped: storage can be blocked (private mode, sandboxed iframe), and the game must
// then behave as for a first visit (tutorial on, introduction shown), with the setting lasting for the page only.

const TUTORIAL_KEY = 'takeoff.tutorial';
const INTRO_KEY = 'takeoff.introSeen';

let tutorialOverride: boolean | null = null;
let introOverride: boolean | null = null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the setting lasts for this page only */
  }
}

/** Tutorial tips are on unless the player turned them off (default on). */
export function tutorialOn(): boolean {
  return tutorialOverride ?? read(TUTORIAL_KEY) !== 'off';
}
export function setTutorial(on: boolean) {
  tutorialOverride = on;
  write(TUTORIAL_KEY, on ? 'on' : 'off');
}

/** A returning player has finished (or skipped) the introduction before. */
export function introSeen(): boolean {
  return introOverride ?? read(INTRO_KEY) === 'yes';
}
export function markIntroSeen() {
  introOverride = true;
  write(INTRO_KEY, 'yes');
}

/** Forget the in-page overrides (tests). */
export function resetOnboardingSettings() {
  tutorialOverride = null;
  introOverride = null;
}

/** The "Tutorial tips" checkbox, shared by the title screen, the help dialog and each tip. */
export function tutorialToggleHtml(id: string, label = 'Tutorial tips (one short tip per quarter)') {
  return `<label class="toggle ob-tutorial"><input type="checkbox" id="${id}" data-ob-tutorial ${tutorialOn() ? 'checked' : ''}> ${label}</label>`;
}

/** Wire every tutorial checkbox inside `root` to the setting. */
export function bindTutorialToggles(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement>('input[data-ob-tutorial]').forEach((box) =>
    box.addEventListener('change', () => setTutorial(box.checked)),
  );
}

/** Keys of the onboarding screens, listed with the other shortcuts in the help dialog. */
export const ONBOARDING_KEYS: [string, string][] = [
  ['← / →', 'In the journal: move between quarters (Home and End jump to the first and last)'],
];
