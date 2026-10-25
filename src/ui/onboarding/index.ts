// Phase 1 onboarding UI (docs/V2_SPEC.md): first decision fast, tips, notices and act transitions,
// the journal and Léa's letters. The game controller (src/ui/app.ts) drives it through a small
// "v2-onboarding hooks" block; everything else lives here.

import './onboarding.css';
import type { EngineApi } from '../../engine/api';
import type { GameState, Tip } from '../../engine/types';
import { announceSkip, mountClockCue, updateClockCue, type ClockStatus } from './clock';
import { fixtureReads } from './fixtures';
import { openJournal } from './journal';
import { deliveredLetters, showLeaHistory } from './lea-history';
import { planNotices, showActTransition, showNoticeScreen, showToasts } from './notices';
import { engineReads, type OnboardingReads } from './reads';
import { tutorialOn } from './settings';
import { coachAnchor, hideCoachMark, showCoachMark, showTipDialog } from './tips';

export { clockMs } from './clock';
export type { ClockStatus } from './clock';

/** What the onboarding needs from the game controller. */
export interface OnboardingHost {
  root(): HTMLElement;
  engine: EngineApi;
  state(): GameState;
  /** Replace the game state (after markTipShown). */
  setState(s: GameState): void;
  /** Pause the clock if it is running; the returned function resumes it if it was. */
  hold(): () => void;
  clock(): ClockStatus;
  /** Fast-forward the current quarter; false when it cannot (no clock, already skipping, an event on screen). */
  skip(): boolean;
  /** Whether this quarter's letter from Léa has already popped up. */
  leaShownThisQuarter(): boolean;
  /** Open a dialog with the clock paused, then resume (does nothing while another dialog or an event shows). */
  openFromMap(show: () => Promise<unknown>): void;
  /** Override what is read from the engine (tests). */
  reads?: OnboardingReads;
}

/** Dev fixtures (?obfixtures on the dev server) stand in for engine features not implemented yet. */
function fixturesWanted(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(location.search).has('obfixtures');
  } catch {
    return false;
  }
}

export class Onboarding {
  readonly reads: OnboardingReads;
  /** The quarter of the last tip shown: one tip per quarter at most. */
  private tipQuarter = -1;
  private cue: HTMLElement | null = null;
  private polling = 0;

  constructor(private host: OnboardingHost) {
    this.reads = host.reads ?? (fixturesWanted() ? fixtureReads(host.engine) : engineReads(host.engine));
  }

  /** After the shell is built: the next-decision cue, Skip to decision and the Journal button. */
  mount() {
    const root = this.host.root();
    const clock = root.querySelector<HTMLElement>('.clockctl');
    if (!clock) return;
    this.reset();
    this.cue = mountClockCue(root.querySelector<HTMLElement>('.when') ?? clock, () => this.skip());
    const help = clock.querySelector('#help') ?? clock.lastElementChild;
    clock.querySelector('#ob-journal')?.remove();
    const j = document.createElement('button');
    j.type = 'button';
    j.id = 'ob-journal';
    j.className = 'ob-journal-btn';
    j.setAttribute('aria-haspopup', 'dialog');
    j.setAttribute('aria-label', 'Journal');
    j.innerHTML = `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3.5h9.5a2 2 0 0 1 2 2V17H6a2 2 0 0 1-2-2z M4 15a2 2 0 0 1 2-2h9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ob-journal-t">Journal</span>`;
    j.title = 'Journal: past reports, decisions, events, letters and tips';
    j.addEventListener('click', () => this.openJournal());
    if (help) help.after(j);
    else clock.appendChild(j);
    this.poll();
  }

  private poll() {
    const id = ++this.polling;
    const step = () => {
      if (id !== this.polling || !this.cue?.isConnected) return;
      updateClockCue(this.cue, this.host.clock());
      requestAnimationFrame(step);
    };
    step();
  }

  /** "Skip to decision": once per quarter, ignored while skipping or while an event is on screen. */
  skip() {
    if (!this.host.skip()) return;
    hideCoachMark();
    announceSkip();
    if (this.cue) updateClockCue(this.cue, this.host.clock());
  }

  /** The tip due now, if the tutorial is on and none was shown this quarter. */
  private dueTip(): Tip | null {
    if (!tutorialOn()) return null;
    const s = this.host.state();
    if (this.tipQuarter === s.quarter) return null;
    return this.reads.tip(s);
  }

  private record(tip: Tip) {
    const s = this.host.state();
    this.tipQuarter = s.quarter;
    this.host.setState(this.reads.markTipShown(s, tip.id));
  }

  /**
   * Right after startQuarter: one blocking screen at most (an act, else an employment shock), the
   * other notices as toasts, then the quarter's tip (a coach mark beside what it explains, or a dialog;
   * a dialog tip waits for the decision when an act screen already stopped this quarter).
   */
  async quarterStart(): Promise<void> {
    hideCoachMark();
    const s = this.host.state();
    const date = this.host.engine.dateLabel(s.quarter);
    const plan = planNotices(this.reads.notices(s));
    const tip = this.dueTip();
    const anchor = tip ? coachAnchor(tip, this.host.root()) : null;
    const dialogTip = tip && !anchor && !plan.blocking ? tip : null;
    if (plan.blocking || dialogTip) {
      const release = this.host.hold();
      try {
        if (plan.blocking?.kind === 'act') await showActTransition(plan.blocking, date, plan.folded);
        else if (plan.blocking) await showNoticeScreen(plan.blocking, date);
        else if (dialogTip) {
          this.record(dialogTip);
          await showTipDialog(dialogTip);
        }
      } finally {
        release();
      }
    }
    showToasts(plan.toasts);
    if (tip && anchor) {
      this.record(tip);
      showCoachMark(tip, anchor);
    }
  }

  /** Before the decision screen opens: the coach mark goes, and a tip still due this quarter shows. */
  async beforeDecision(): Promise<void> {
    hideCoachMark();
    const tip = this.dueTip();
    if (!tip) return;
    this.record(tip);
    await showTipDialog(tip);
  }

  openJournal() {
    this.host.openFromMap(() => {
      const s = this.host.state();
      return openJournal(this.reads.journal(s), { tipsShown: s.tipsShown, current: this.host.engine.dateLabel(s.quarter) });
    });
  }

  /** Léa's marker: every letter received so far, oldest first. */
  openLeaHistory() {
    this.host.openFromMap(() => {
      const s = this.host.state();
      const letters = deliveredLetters(this.reads.leaLetters(s), s.quarter, this.host.leaShownThisQuarter());
      return showLeaHistory(letters, (q) => this.host.engine.dateLabel(q));
    });
  }

  /** A new game: forget the per-game memory. */
  reset() {
    this.tipQuarter = -1;
    hideCoachMark();
  }
}

