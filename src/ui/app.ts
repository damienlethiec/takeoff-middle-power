// The game controller: builds the main screen, runs the clock, and walks through each quarter's pauses.
// It talks to the engine only through EngineApi.
//
// v2 main screen, top to bottom: the header (date, clock, Budget and PC with next quarter's income, GDP and
// approval), the trajectory bar ("Where the superpowers are heading"), the chief of staff's advice and the risk
// track, then the map with the indicators (4 → 5 → 6, the rest in "More indicators") and the two news feeds.

import type { EngineApi } from '../engine/api';
import type {
  Briefing,
  CardId,
  Concern,
  DashboardView,
  GameState,
  GaugeView,
  InternalNote,
  LeaScene,
  PendingEvent,
  QuarterOutcome,
  RegionId,
  RiskView,
  TrajectoryView,
} from '../engine/types';
import { TONE_WORDS, announce, focusOwnsKey, moveWords, reducedMotion, shortcutsOn, tryFocus } from './a11y';
import {
  $,
  ACTOR,
  ACTOR_SHORT,
  ACTOR_TONE,
  GAUGE_COLOR,
  HIDDEN_GAUGES,
  ICON,
  PLAN,
  PLAN_ORDER,
  PLAN_TONE,
  REGION,
  RISK_NAME,
  STAGE_ORDER,
  STAGE_WORD,
  THRESHOLDS,
  esc,
  pct,
  signed,
  tone,
  trajectoryChangeText,
} from './format';
import { WorldMap } from './map';
import { modalOpen, openModal, setFocusFallback, wait } from './modal';
import { showDecision, type DecisionResult } from './screens/decision';
import { showEnding } from './screens/ending';
import { showHelp } from './screens/help';
import { showBriefing, showEvent, showEventRecap, showLea, showReport, type Readiness } from './screens/moments';
import { showOpening } from './screens/opening';
import { showSuperpowersChoose, showTippingAlarm } from './screens/tipping';

const QUARTER_MS = 10_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** How many of this quarter's items each feed shows before "More". */
const FEED_FIRST = 3;
const GAUGE_HELP: Record<string, string> = {
  capability: 'How capable the leading AI systems are. At 80, AI starts improving itself: the tipping point.',
  apparentAlignment: 'How well-behaved the AI looks, according to the labs. The true value is hidden.',
  verification: 'How ready the world is to check a deal: inspectors, facilities, methods.',
  coalition: 'Middle powers standing with Europe: UK and Norway, then Canada, then Japan and Korea.',
  tension: 'How close the US and China are to confrontation. Shown as the arc on the map.',
  concentration: 'How few companies hold the most powerful AI.',
  misuse: 'How easily criminals can turn AI against hospitals, grids and banks. Shown as glitches on the map.',
  publicPressure: 'How loudly citizens demand AI safety. Shown as protests on the map; high pressure earns Political Capital.',
  gdp: "Europe's economy. It usually rises with AI adoption.",
  approval: 'How much Europeans approve of their governments.',
};
/** Shown in the header, not as tiles. */
const HOME_KEYS = ['gdp', 'approval'];
/** Concerns the map shows when the engine has none for the quarter (generic, no claim about the world). */
const FALLBACK_CONCERN: Record<RegionId, string> = {
  eu: 'People in Europe are asking who checks what AI systems can do.',
  us: 'Americans worry about jobs as AI agents spread through offices.',
  cn: 'In China, people debate how far AI should run public services.',
};
/** Cards that prepare for each crisis, when the risk track does not say (the engine's risk views win). */
const PREPARES_FALLBACK: Record<string, CardId[]> = {
  weight_theft: ['weight_security'],
  warning_shot: ['coalition', 'host_verification'],
  opaque_reasoning: ['ai_office'],
  silicon_blackmail: ['open_models'],
  ransomware: ['cyber_defence'],
};

interface FeedItem {
  id: string;
  kind: 'news' | 'event';
  quarter: number;
  actor: PendingEvent['actor'];
  text: string;
}

export class App {
  private s!: GameState;
  private map!: WorldMap;
  private t = 0;
  private running = false;
  private speed: 1 | 2 = 1;
  private clockActive = false;
  private lastTs = 0;
  private clockDone: (() => void) | null = null;
  private eventShown = false;
  private eventBusy = false;
  private drift: Record<string, number> = {};
  private seen = new Set<string>();
  private feed: FeedItem[] = [];
  private bubblePlan: { id: string; at: number; until: number; region: RegionId; text: string; state: 'wait' | 'live' | 'gone' }[] = [];
  private lastLea: { lea: LeaScene; date: string } | null = null;
  private shownRes = { pc: NaN, budget: NaN };
  private coached = new Set<string>();
  private viewsFor: GameState | null = null;
  private views: GaugeView[] = [];
  private lastGaugeSig = '';
  private dockResolve: (() => void) | null = null;
  private gameId = 0;
  /** Gauges announced as high this quarter (misuse), so each warning is said once. */
  private warned = new Set<string>();
  /** v2 state of the screen */
  private tileKeys = '';
  private thresholdSeen: Record<string, number> = {};
  private trajSig = '';
  private trajChangeSig = '';
  private riskStages: Record<string, string> = {};
  private introducedSaid = '';
  private unread = new Set<string>();
  private moreNews = false;
  private moreNotes = false;
  /** Readiness and card names of this quarter, for the event screen. */
  private cardNames: Partial<Record<CardId, string>> = {};

  // v2-onboarding hooks: the onboarding workstream (src/ui/onboarding/**) fills these in.
  /** Léa's full message history; when absent, her button shows the latest letter. */
  onboarding: { openLeaHistory?: () => Promise<void> } = {};
  // end v2-onboarding hooks

  constructor(
    private root: HTMLElement,
    private e: EngineApi,
  ) {}

  async boot() {
    requestAnimationFrame(this.tick);
    document.addEventListener('keydown', this.onKey);
    document.addEventListener('click', (ev) => {
      const t = ev.target as HTMLElement;
      if (!t.closest('[aria-controls="gpop"], .g-pop')) this.closePopover();
      if (!t.closest('#gmore, #gdrawer, .g-pop')) this.toggleDrawer(false);
      if (!t.closest('.bubble')) this.map?.closeConcern();
    });
    // when a dialog closes and what opened it is gone (a bubble, a dialog button), focus lands on the map
    setFocusFallback(() => this.root.querySelector<HTMLElement>('.worldmap') ?? this.root.querySelector<HTMLElement>('#game-title'));
    const params = new URLSearchParams(location.search);
    if (!params.has('skipintro')) await showOpening();
    const seed = params.has('seed') ? Number(params.get('seed')) : undefined;
    this.newGame(seed);
  }

  /** Dev hook for tests: lets a script inspect or replace the state. */
  get debug() {
    return { state: () => this.s, set: (s: GameState) => ((this.s = s), this.renderAll()), app: this };
  }

  private newGame(seed = (Date.now() % 2147483646) + 1) {
    this.gameId += 1;
    document.body.classList.remove('alarm', 'ended');
    this.s = this.e.createInitialState(seed);
    this.seen.clear();
    this.feed = [];
    this.coached.clear();
    this.lastLea = null;
    this.shownRes = { pc: NaN, budget: NaN };
    this.lastGaugeSig = '';
    this.warned.clear();
    this.tileKeys = '';
    this.thresholdSeen = {};
    this.trajSig = '';
    this.trajChangeSig = '';
    this.riskStages = {};
    this.introducedSaid = '';
    this.unread.clear();
    document.title = 'Takeoff: Middle Power';
    this.buildShell();
    this.renderAll();
    // a new game (after the introduction or "Play again"): start keyboard and screen-reader users at the top
    const a = document.activeElement;
    if (!a || a === document.body || !a.isConnected) tryFocus($('#game-title', this.root));
    void this.loop(this.gameId);
  }

  // ------------------------------------------------------------------ flow

  private async loop(id: number) {
    let outcome: QuarterOutcome = 'next_quarter';
    while (outcome === 'next_quarter') {
      outcome = await this.playQuarter();
      if (id !== this.gameId) return;
    }
    if (outcome === 'tipping_point') await this.tipping();
    else await this.clockStops();
    await this.ending();
  }

  /** Plays the chosen card (or passes) and returns its briefing; a refused card counts as a pass. */
  private applyDecision(result: DecisionResult): Briefing | null {
    if (result.kind === 'card') {
      try {
        const r = this.e.playCard(this.s, result.id, result.option);
        this.s = r.state;
        return r.briefing;
      } catch (err) {
        console.warn('playCard refused', err);
        this.toast('That decision is not possible right now. You passed instead.');
      }
    }
    this.s = this.e.pass(this.s);
    return null;
  }

  /** After a decision, the trajectory bar moves in view for a moment before the briefing. */
  private async showTrajectoryMove(): Promise<TrajectoryView['change']> {
    const before = `${this.trajSig}|${this.trajChangeSig}`;
    this.renderAll(true);
    const tr = this.e.trajectory(this.s);
    if (`${this.trajSig}|${this.trajChangeSig}` !== before) await wait(1300);
    return tr.change;
  }

  private async playQuarter(): Promise<QuarterOutcome> {
    this.s = this.e.startQuarter(this.s);
    const date = this.e.dateLabel(this.s.quarter);
    this.moreNews = false;
    this.moreNotes = false;
    this.beginClock();
    // income and partners lost, as the quarter opens
    const income = this.s.log.filter((l) => l.quarter === this.s.quarter && l.kind === 'income');
    const lost = income.filter((l) => l.visibleDeltas.some((d) => d.key === 'coalition' && d.amount < 0));
    if (lost.length) this.toast(lost.map((l) => l.briefing).join(' '), 'alert', false);
    else if (income.length) this.toast(`${date} begins. ${income.map((l) => l.briefing).join(' ')}`, 'info', false);
    // one announcement per quarter start: the date, what came in, what you hold
    const lostText = lost.length ? ` ${lost.map((l) => l.briefing).join(' ')}` : '';
    const incomeText = !lost.length && income.length ? ` ${income.map((l) => l.briefing).join(' ')}` : '';
    const hint = this.s.quarter === 1 ? ' Press question mark for the keyboard shortcuts.' : '';
    announce(`${date} begins. The clock is running.${lostText}${incomeText} You have ${this.s.budget} Budget and ${this.s.pc} Political Capital.${hint}`);
    await new Promise<void>((r) => (this.clockDone = r));
    this.clockActive = false;
    this.coachQueue = [];
    $('#coach', this.root).hidden = true;
    this.map.clearBubbles();
    this.map.settlePins();
    this.setPhase('Situation report');
    this.renderAll();
    await wait(350);

    const report = this.e.situationReport(this.s);
    if (report.lea) {
      this.lastLea = { lea: report.lea, date };
      this.map.setLeaUnread(true);
      await showLea(report.lea, date, 'Read the situation report');
      this.map.setLeaUnread(false);
    }

    let stage: 'report' | 'decision' = 'report';
    let result: DecisionResult | null = null;
    while (!result) {
      if (stage === 'report') {
        const a = await showReport(report, this.e.trajectory(this.s), { leaRead: true });
        if (a === 'lea' && report.lea) {
          await showLea(report.lea, date, 'Back to the report');
          continue;
        }
        if (a === 'map') await this.dock('The clock is stopped. Take your time to look at the map, the indicators, the risks and the notes.', 'Choose your decision');
        stage = 'decision';
        continue;
      }
      this.setPhase('Your decision');
      const d = await showDecision(this.e, this.s);
      if (d.kind === 'map') {
        await this.dock('The clock is stopped. Your cards are waiting.', 'Back to your cards');
        continue;
      }
      result = d;
    }

    const briefing = this.applyDecision(result);
    this.setPhase('Briefing');
    const change = await this.showTrajectoryMove();

    const end = this.e.endQuarter(this.s);
    const next =
      end.outcome === 'next_quarter' ? `Start ${this.e.dateLabel(this.s.quarter + 1)}` : end.outcome === 'tipping_point' ? 'Continue' : 'See how it ends';
    await showBriefing(briefing, date, next, { change });
    this.s = end.state;
    this.renderAll();
    return end.outcome;
  }

  private async tipping() {
    const date = this.e.dateLabel(this.s.quarter);
    this.setPhase('The tipping point');
    await showTippingAlarm(date, this.e.gaugeViews(this.s), this.e.planOdds(this.s));
    let result: DecisionResult | null = null;
    while (!result) {
      const d = await showDecision(this.e, this.s, { tipping: true });
      if (d.kind === 'map') {
        await this.dock('The world is holding its breath. Look as long as you need.', 'Back to your last decision');
        continue;
      }
      result = d;
    }
    const briefing = this.applyDecision(result);
    const change = await this.showTrajectoryMove();
    await showBriefing(briefing, date, 'Washington and Beijing decide', { change });
    this.s = this.e.runTippingPoint(this.s);
    this.renderAll();
    await showSuperpowersChoose(this.s.tipping!);
  }

  private async clockStops() {
    const m = openModal(
      `<div class="dateline">${esc(this.e.dateLabel(this.s.quarter))} · The clock stops</div>
       <h2>Four years have passed</h2>
       <p>AI never learned to improve itself before the end of 2030. The superpowers never had to make their decisive choice. The world you prepared is the world you get.</p>
       <div class="row-btns"><button class="btn-primary" data-primary data-action="ok">See how it ends <kbd>Enter</kbd></button></div>`,
      { cls: 'report', label: 'The clock stops', describedBy: 'p' },
    );
    await m.result;
  }

  private async ending() {
    this.clockActive = false;
    document.body.classList.add('ended');
    const d = this.e.debrief(this.s);
    const date = this.e.dateLabel(this.s.quarter);
    await showEnding(this.root, d, date);
    this.newGame();
  }

  // ------------------------------------------------------------------ clock

  private beginClock() {
    this.t = 0;
    this.eventShown = false;
    this.eventBusy = false;
    this.clockActive = true;
    this.running = true;
    const pe = this.s.pendingEvent;
    const qs = this.s.quarterStart;
    this.drift = {};
    for (const g of this.gaugeViews()) {
      const start = g.key === 'coalition' ? qs.coalition : qs.gauges[g.key] ?? g.value;
      const evOff = pe?.appliedDeltas.filter((d) => d.key === g.key).reduce((a, d) => a + d.amount, 0) ?? 0;
      this.drift[g.key] = g.value - start - evOff;
    }
    this.bubblePlan = this.concerns().map((c, i) => ({
      id: `b${this.s.quarter}-${i}-${c.id}`,
      at: c.at,
      until: Math.min(1.01, c.at + 0.4),
      region: c.region,
      text: c.text,
      state: 'wait' as const,
    }));
    this.setPhase('Clock running');
    this.renderAll();
    if (this.s.quarter === 1) this.coach('clock', 'The clock is running. News arrives on the right and pings the map. Press Space to pause.');
  }

  /** The quarter's public concerns (the engine's, or a generic one or two while it has none). */
  private concerns(): Concern[] {
    if (this.s.concerns?.length) return this.s.concerns;
    const n = 1 + (this.s.gauges.publicPressure >= 40 ? 1 : 0);
    const regions: RegionId[] = ['eu', this.s.quarter % 2 ? 'us' : 'cn'];
    return regions.slice(0, n).map((region, i) => ({ id: `generic-${region}`, region, text: FALLBACK_CONCERN[region], at: 0.12 + i * 0.4 }));
  }

  private tick = (ts: number) => {
    requestAnimationFrame(this.tick);
    const dt = this.lastTs ? Math.min(100, ts - this.lastTs) : 0;
    this.lastTs = ts;
    if (!this.clockActive || !this.running || this.eventBusy) return;
    this.t = Math.min(1, this.t + (dt * this.speed) / QUARTER_MS);
    this.onTime();
  };

  private onTime() {
    const s = this.s;
    const q = s.quarter;
    for (const n of s.news) {
      if (n.quarter === q && n.at <= this.t && !this.seen.has(n.id)) {
        this.seen.add(n.id);
        this.unread.add(n.id);
        this.feed.push({ id: n.id, kind: 'news', quarter: n.quarter, actor: n.actor, text: n.text });
        this.renderNews(n.id);
        this.map.ping(n.region, 'news');
      }
    }
    for (const n of s.notes) {
      if (n.quarter === q && n.at <= this.t && !this.seen.has(n.id)) {
        this.seen.add(n.id);
        this.unread.add(n.id);
        this.renderNotes(n.id);
        this.map.ping(n.region, 'note');
        if (!n.readable) this.coach('note', 'A confidential note arrived, redacted. Invest in oversight (AI Office capacity) to read these.');
        else announce(`Confidential note from ${ACTOR[n.actor]}.`);
      }
    }
    for (const b of this.bubblePlan) {
      if (b.state === 'wait' && this.t >= b.at) {
        b.state = 'live';
        this.map.spawnBubble(b.id, b.region);
        announce(`Public concern in ${REGION[b.region]}: ${shortcutsOn() ? 'press C' : 'find the speech bubble on the map'} to read it.`);
        this.coach('bubble', 'Speech bubbles show what worries people. Click one to read it: public concern is where pressure comes from.');
      } else if (b.state === 'live' && this.t >= b.until) {
        b.state = 'gone';
        this.map.popBubble(b.id);
      }
    }
    const pe = s.pendingEvent;
    if (pe && !this.eventShown && this.t >= pe.at) {
      void this.fireEvent(pe);
      return;
    }
    this.renderClock();
    this.renderGauges();
    if (this.t >= 1 && !this.eventBusy) {
      if (pe && !this.eventShown) {
        void this.fireEvent(pe);
        return;
      }
      const done = this.clockDone;
      this.clockDone = null;
      done?.();
    }
  }

  /** What prepared Europe for this crisis, or what was missing, in plain words. */
  private readiness(pe: PendingEvent): Readiness {
    const risk = this.e.riskViews(this.s).find((r) => r.id === pe.id);
    const ids = risk?.preparingCards.length ? risk.preparingCards : PREPARES_FALLBACK[pe.id] ?? [];
    const names = this.namesOf(ids);
    const played = this.s.log
      .filter((l) => l.kind === 'card' && ids.includes(l.id as CardId))
      .map((l) => ({ title: l.title, date: this.e.dateLabel(l.quarter) }));
    return { prepared: pe.prepared, preparedBy: risk?.preparedBy ?? null, cards: names, played };
  }

  private namesOf(ids: CardId[]) {
    if (!Object.keys(this.cardNames).length) for (const c of this.e.cardViews(this.s)) this.cardNames[c.id] = c.name;
    return ids.map((id) => this.cardNames[id] ?? id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
  }

  private async fireEvent(pe: PendingEvent) {
    this.eventShown = true;
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.quarter);
    const ready = this.readiness(pe);
    this.setPhase('Event');
    this.map.addEventPin(pe.region, pe.title, date, () => this.openFromMap(() => showEventRecap(pe, date, ready)));
    this.feed.push({ id: `ev-${pe.id}-${this.s.quarter}`, kind: 'event', quarter: this.s.quarter, actor: pe.actor, text: pe.title });
    this.renderNews(`ev-${pe.id}-${this.s.quarter}`);
    if (!reducedMotion()) {
      document.body.classList.add('jolt');
      setTimeout(() => document.body.classList.remove('jolt'), 700);
    }
    this.renderGauges(true);
    await wait(900);
    const opt = await showEvent(pe, date, ready);
    try {
      this.s = this.e.resolveEvent(this.s, opt ?? pe.options[0]?.id);
    } catch (err) {
      console.warn('resolveEvent failed', err);
      this.s = this.e.resolveEvent(this.s, pe.options[0]?.id);
    }
    this.renderAll(true);
    this.setPhase('Clock running');
    this.eventBusy = false;
  }

  /** A concern bubble: it explains what worries people (team decision: it pays nothing). */
  private onBubble = (id: string) => {
    const b = this.bubblePlan.find((x) => x.id === id);
    if (!b) return;
    this.map.readBubble(id, b.region, b.text);
    announce(`Public concern in ${REGION[b.region]}: ${b.text}`);
  };

  private setRunning(on: boolean, say = true) {
    if (!this.clockActive) return;
    if (say && on !== this.running) announce(on ? 'Clock running.' : 'Paused.');
    this.running = on;
    this.setPhase(on ? 'Clock running' : 'Paused');
    this.renderClock();
  }

  private setSpeed(n: 1 | 2) {
    this.speed = n;
    this.root.querySelectorAll('.speed button').forEach((x) => x.setAttribute('aria-pressed', String(Number((x as HTMLElement).dataset.speed) === n)));
  }

  /** Open a dialog from the map (Léa, an event pin, the shortcuts) with the clock paused, and resume after. */
  private openFromMap(show: () => Promise<unknown>) {
    if (modalOpen() || this.eventBusy) return;
    const was = this.clockActive && this.running;
    if (was) this.setRunning(false, false);
    void show().then(() => {
      if (was && !modalOpen()) this.setRunning(true, false);
    });
  }

  private openLea() {
    const history = this.onboarding.openLeaHistory;
    if (history) return this.openFromMap(history);
    const l = this.lastLea;
    if (l) this.openFromMap(() => showLea(l.lea, l.date, 'Back to the map'));
    else this.toast('Léa lives in Lyon. She will write to you soon.');
  }

  /**
   * Keyboard shortcuts. Space and Enter are left to a focused button or link (they activate it);
   * the single-key shortcuts (P, C, 1, 2, ?) can be turned off in the shortcuts dialog (WCAG 2.1.4).
   */
  private onKey = (ev: KeyboardEvent) => {
    if (ev.defaultPrevented || modalOpen() || document.querySelector('.opening')) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'Escape') {
      if (this.map.closeConcern()) return;
      if (!$('#gpop', this.root).hidden) return this.closePopover(true);
      if (!$('#gdrawer', this.root).hidden) return this.toggleDrawer(false, true);
      return this.dismissIncome();
    }
    if (focusOwnsKey(k)) return;
    if (k === ' ' && this.clockActive) {
      ev.preventDefault();
      this.setRunning(!this.running);
    } else if (k === 'Enter' && this.dockResolve) {
      ev.preventDefault();
      this.dockResolve();
    } else if (!shortcutsOn() || (!this.clockActive && !this.dockResolve)) return;
    else if (k === 'p' || k === 'P') {
      if (!this.clockActive) return;
      ev.preventDefault();
      this.setRunning(!this.running);
    } else if (k === 'c' || k === 'C') {
      const id = this.map.liveBubbles()[0];
      if (id) this.onBubble(id);
      else announce('No public concern on the map right now.');
    } else if (k === '1' || k === '2') {
      this.setSpeed(Number(k) as 1 | 2);
      announce(k === '2' ? 'Double speed.' : 'Normal speed.');
    } else if (k === '?') {
      ev.preventDefault();
      this.openHelp();
    }
  };

  private openHelp() {
    this.openFromMap(() => showHelp());
  }

  private dock(text: string, label: string): Promise<void> {
    const d = $('.dock', this.root);
    d.innerHTML = `<p id="dock-text">${esc(text)}</p><button class="btn-primary" type="button" aria-describedby="dock-text">${esc(label)} <kbd>Enter</kbd></button>`;
    d.hidden = false;
    this.setPhase('Paused to assess');
    const btn = d.querySelector('button')!;
    // keyboard players land on the way back; the map, indicators and notes are a Tab away
    tryFocus(btn);
    return new Promise((resolve) => {
      const go = () => {
        d.hidden = true;
        this.dockResolve = null;
        resolve();
      };
      this.dockResolve = go;
      btn.addEventListener('click', go);
    });
  }

  // ------------------------------------------------------------------ shell

  private buildShell() {
    const purse = (k: 'budget' | 'pc', label: string) => `
      <div class="res-wrap" data-res="${k}">
        <button type="button" class="res ${k}" id="res-${k}" aria-describedby="inc-${k}" aria-expanded="false">
          ${ICON[k]}<span class="res-v num" id="${k}"></span><span class="res-l">${label}<small class="res-next" id="next-${k}"></small></span>
        </button>
        <div class="inc-tip" id="inc-${k}" role="tooltip"></div>
      </div>`;
    this.root.innerHTML = `
    <div class="game">
      <h1 class="sr-only" id="game-title" tabindex="-1">Takeoff: Middle Power</h1>
      <header class="top">
        <div class="brand"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Middle Power</span></div>
        <div class="when">
          <div class="date"><span id="date" class="num"></span><span id="month" class="month num"></span><span class="sr-only" id="qof"></span></div>
          <ol class="quarters" id="quarters" aria-label="Progress through the 16 quarters">${Array.from({ length: 16 }, (_, i) => `<li data-q="${i + 1}"><i></i></li>`).join('')}</ol>
        </div>
        <div class="clockctl">
          <button class="iconbtn" id="play" aria-label="Pause the clock (Space)" aria-keyshortcuts="Space"></button>
          <div class="speed" role="group" aria-label="Clock speed"><button data-speed="1" aria-pressed="true">×1</button><button data-speed="2" aria-pressed="false">×2</button></div>
          <button class="iconbtn help-btn" id="help" aria-label="Keyboard shortcuts (?)" aria-haspopup="dialog">?</button>
          <span class="phase" id="phase"></span>
        </div>
        <div class="purse">
          <div class="res-row">${purse('budget', 'Budget')}${purse('pc', 'Political<br>Capital')}</div>
          <p class="home-line" aria-label="Europe at home">
            <button type="button" class="home-ind" data-key="gdp" aria-expanded="false" aria-controls="gpop" aria-describedby="gdesc-gdp">GDP <b class="num"></b><span class="g-delta"></span></button>
            <button type="button" class="home-ind" data-key="approval" aria-expanded="false" aria-controls="gpop" aria-describedby="gdesc-approval">Approval <b class="num"></b><span class="g-delta"></span></button>
          </p>
        </div>
      </header>
      <section class="trajectory" aria-labelledby="traj-h">
        <h2 class="traj-k" id="traj-h">Where the superpowers are heading</h2>
        <div class="traj-bar" id="trajbar" role="img"></div>
        <p class="traj-change" id="trajchange"></p>
      </section>
      <section class="brief-row">
        <section class="advisor-panel" aria-labelledby="adv-h">
          <span class="ava adv" aria-hidden="true">CS</span>
          <div><h2 id="adv-h">Your chief of staff</h2><p id="adv-text"></p><p class="adv-more" id="adv-more"></p></div>
        </section>
        <section class="risks" aria-labelledby="risks-h">
          <h2 id="risks-h">Risks <small>crises you can see coming</small></h2>
          <ul class="risk-list" id="risks"></ul>
        </section>
      </section>
      <main class="stage">
        <div class="theatre">
          <h2 class="sr-only">World map</h2>
          <div class="mapwrap" id="mapwrap">
            <div class="ticker" aria-hidden="true"><span class="ticker-tag" id="tickTag">LIVE</span><span class="ticker-text" id="tickText">The clock starts in a moment.</span></div>
            <div class="coach" id="coach" hidden></div>
            <div class="dock" hidden></div>
          </div>
          <section class="indicators" aria-label="Indicators: click one to see what moves it">
            <h2 class="sr-only">Indicators</h2>
            <p class="g-intro" id="gintro" hidden></p>
            <div class="g-grid" id="gauges"></div>
            <div class="g-row2">
              <button type="button" class="g-more" id="gmore" aria-expanded="false" aria-controls="gdrawer">More indicators <span id="gmore-n"></span></button>
              <span class="g-hidden-k" aria-hidden="true">Hidden until the end</span>
              <div class="g-hidden" id="ghidden"></div>
            </div>
            <div class="g-drawer" id="gdrawer" role="region" aria-labelledby="gdrawer-h" hidden><h3 id="gdrawer-h">More indicators</h3><div class="g-grid sec" id="gsec"></div></div>
            <div class="g-descs" id="gdescs" hidden></div>
          </section>
        </div>
        <aside class="feeds">
          <section class="feed news-feed" aria-labelledby="news-h">
            <h2 id="news-h">Public news <small>what everyone sees</small></h2>
            <div class="feed-body" id="news-body" role="region" aria-labelledby="news-h" tabindex="0">
              <h3 class="feed-q">This quarter</h3>
              <ol id="news"></ol>
              <button type="button" class="feed-more" id="news-more" aria-expanded="false" aria-controls="news" hidden></button>
              <div class="feed-past" id="news-past"></div>
            </div>
          </section>
          <section class="feed notes-feed" aria-labelledby="notes-h">
            <h2 id="notes-h">Internal notes <small>labs and intelligence</small> <span class="unread-n" id="notes-unread" hidden></span></h2>
            <p class="notes-hint" id="notesHint" hidden>Redacted notes: invest in oversight to read them (AI Office capacity, or measuring human influence).</p>
            <div class="feed-body" id="notes-body" role="region" aria-labelledby="notes-h" tabindex="0">
              <h3 class="feed-q">This quarter</h3>
              <ol id="notes"></ol>
              <button type="button" class="feed-more" id="notes-more" aria-expanded="false" aria-controls="notes" hidden></button>
              <div class="feed-past" id="notes-past"></div>
            </div>
          </section>
        </aside>
      </main>
      <div class="g-pop" id="gpop" role="region" aria-labelledby="gpop-h" hidden></div>
    </div>`;
    this.map = new WorldMap($('#mapwrap', this.root), { onBubble: (id) => this.onBubble(id) });
    this.map.svg.parentElement!.insertBefore(this.map.svg, this.map.svg.parentElement!.firstChild);
    this.map.onLea = () => this.openLea();
    $('#play', this.root).addEventListener('click', () => this.setRunning(!this.running));
    $('#help', this.root).addEventListener('click', () => this.openHelp());
    this.root.querySelectorAll<HTMLButtonElement>('.speed button').forEach((b) => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed) as 1 | 2)));
    this.root.querySelectorAll<HTMLButtonElement>('.home-ind').forEach((b) => b.addEventListener('click', () => this.togglePopover(b)));
    $('#gmore', this.root).addEventListener('click', () => this.toggleDrawer($('#gdrawer', this.root).hidden));
    for (const k of ['budget', 'pc'] as const) {
      const wrap = $(`.res-wrap[data-res="${k}"]`, this.root);
      const btn = $<HTMLButtonElement>(`#res-${k}`, this.root);
      // the income tooltip shows on hover and focus; a click (or tap) pins it open; Escape hides it
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        this.root.querySelectorAll('.res').forEach((r) => r.setAttribute('aria-expanded', 'false'));
        btn.setAttribute('aria-expanded', String(open));
        wrap.classList.remove('dismissed');
      });
      wrap.addEventListener('mouseleave', () => wrap.classList.remove('dismissed'));
      btn.addEventListener('blur', () => {
        wrap.classList.remove('dismissed');
        btn.setAttribute('aria-expanded', 'false');
      });
    }
    // the feeds: looking at one (pointer or keyboard) marks its items as read
    for (const [sel, kind] of [
      ['.news-feed', 'news'],
      ['.notes-feed', 'notes'],
    ] as const) {
      const f = $(sel, this.root);
      const mark = () => this.markRead(kind);
      f.addEventListener('pointerenter', mark);
      f.addEventListener('focusin', mark);
    }
    $('#news-more', this.root).addEventListener('click', () => {
      this.moreNews = !this.moreNews;
      this.renderNews();
    });
    $('#notes-more', this.root).addEventListener('click', () => {
      this.moreNotes = !this.moreNotes;
      this.renderNotes();
    });
    $('#ghidden', this.root).innerHTML = HIDDEN_GAUGES.map(
      (h) =>
        `<button type="button" class="g-tile hidden-slot" data-hidden="${esc(h.key)}" aria-expanded="false" aria-controls="gpop" aria-describedby="gdesc-hidden"><span class="g-name">${esc(h.label)}</span><span class="g-val q"><b>?</b></span><span class="g-tease"></span></button>`,
    ).join('');
    this.root.querySelectorAll<HTMLButtonElement>('.g-tile.hidden-slot').forEach((b) => b.addEventListener('click', () => this.togglePopover(b)));
  }

  /** The indicator tiles: primary ones in stable slots, the rest in the drawer. Rebuilt only when the set changes. */
  private buildTiles(dash: DashboardView) {
    const primary = dash.primary.filter((g) => g.visible && !HOME_KEYS.includes(g.key));
    const secondary = dash.secondary.filter((g) => g.visible && !HOME_KEYS.includes(g.key) && !primary.some((p) => p.key === g.key));
    const sig = `${primary.map((g) => g.key).join(',')}|${secondary.map((g) => g.key).join(',')}`;
    if (sig === this.tileKeys) return;
    this.tileKeys = sig;
    const tile = (g: GaugeView) => {
      const th = THRESHOLDS[g.key];
      return `<button type="button" class="g-tile" data-key="${esc(g.key)}" style="--c:${GAUGE_COLOR[g.key] ?? 'var(--mute)'}" aria-expanded="false" aria-controls="gpop" aria-describedby="gdesc-${esc(g.key)}">
          <span class="g-name">${esc(g.label)}</span>
          <span class="g-delta"></span>
          <span class="g-val num"><b></b><small></small></span>
          ${
            g.key === 'coalition'
              ? '<span class="g-pips"><i></i><i></i><i></i></span>'
              : `<span class="g-bar"><i class="g-err"></i><i class="g-fill"></i>${th ? `<i class="g-tick" style="left:${th.at}%"></i>` : ''}</span>`
          }
          ${th ? `<span class="g-th" aria-hidden="true">${th.at}: ${esc(th.meaning)}</span>` : ''}
          <span class="g-new" hidden>New</span>
        </button>`;
    };
    const grid = $('#gauges', this.root);
    grid.style.setProperty('--cols', String(Math.max(4, primary.length)));
    grid.innerHTML = primary.map(tile).join('');
    $('#gsec', this.root).innerHTML = secondary.map(tile).join('');
    $('#gmore-n', this.root).textContent = `(${secondary.length})`;
    $<HTMLButtonElement>('#gmore', this.root).hidden = !secondary.length;
    // each tile's value, error bar, threshold and change in words (read after the tile's name)
    const keys = [...primary, ...secondary].map((g) => g.key).concat(HOME_KEYS as GaugeView['key'][]);
    $('#gdescs', this.root).innerHTML =
      keys.map((k) => `<span id="gdesc-${esc(k)}"></span>`).join('') + '<span id="gdesc-hidden">Hidden from you, as from a real envoy. Revealed in the final debrief.</span>';
    this.root.querySelectorAll<HTMLButtonElement>('#gauges .g-tile, #gsec .g-tile').forEach((b) => b.addEventListener('click', () => this.togglePopover(b)));
    this.lastGaugeSig = '';
  }

  private toggleDrawer(open: boolean, refocus = false) {
    const d = this.root.querySelector<HTMLElement>('#gdrawer');
    if (!d || d.hidden === !open) return;
    d.hidden = !open;
    $('#gmore', this.root).setAttribute('aria-expanded', String(open));
    if (!open) {
      if (d.contains(document.activeElement) || refocus) tryFocus($('#gmore', this.root));
      if ($('#gpop', this.root).dataset.in === 'drawer') this.closePopover();
    }
  }

  /** The popover of an indicator, a hidden value or a risk: what it is, what moves it. */
  private togglePopover(anchor: HTMLElement) {
    const pop = $('#gpop', this.root);
    const id = anchor.dataset.key ?? anchor.dataset.hidden ?? `risk:${anchor.dataset.risk}`;
    if (!pop.hidden && pop.dataset.for === id) return this.closePopover();
    let html: string;
    if (anchor.dataset.risk) {
      const r = this.e.riskViews(this.s).find((x) => x.id === anchor.dataset.risk);
      if (!r) return;
      html = this.riskPopHtml(r);
    } else if (anchor.dataset.key) {
      const key = anchor.dataset.key;
      const g = this.gaugeViews().find((x) => x.key === key);
      if (!g) return;
      const th = THRESHOLDS[key];
      html = `<h3 id="gpop-h">${esc(g.label)} <b class="num">${g.value}${g.errorBar ? ` ±${g.errorBar}` : ''}</b></h3>
        <p class="pop-help">${esc(GAUGE_HELP[key] ?? '')}</p>
        ${th ? `<p class="pop-th"><span class="pop-k">Threshold ${th.at}</span>${esc(th.meaning.replace(/^./, (c) => c.toUpperCase()))}.</p>` : ''}
        <p><span class="pop-k up">Rises when</span>${esc(g.risesWhen)}</p>
        <p><span class="pop-k down">Falls when</span>${esc(g.fallsWhen)}</p>
        ${g.errorBar ? '<p class="pop-err">The ± band is your uncertainty. Your experts can narrow it (AI Office capacity).</p>' : ''}`;
    } else {
      const h = HIDDEN_GAUGES.find((x) => x.key === anchor.dataset.hidden)!;
      html = `<h3 id="gpop-h">${esc(h.label)} <b>?</b></h3><p class="pop-help">${esc(h.teaser)}</p><p class="pop-err">Hidden from you, as it would be from a real envoy. Revealed in the final debrief.</p>`;
    }
    pop.innerHTML = html;
    pop.dataset.for = id;
    pop.dataset.in = anchor.closest('#gdrawer') ? 'drawer' : '';
    // right after its anchor in the page, so a screen reader reads it next (it is positioned absolutely)
    const host = anchor.closest('li') ?? anchor;
    if (host.nextElementSibling !== pop) host.after(pop);
    pop.hidden = false;
    this.root.querySelectorAll('[aria-controls="gpop"]').forEach((t) => t.setAttribute('aria-expanded', String(t === anchor)));
    const r = anchor.getBoundingClientRect();
    const pw = Math.min(320, window.innerWidth - 24);
    pop.style.width = `${pw}px`;
    const left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left + r.width / 2 - pw / 2));
    pop.style.left = `${left + window.scrollX}px`;
    const ph = pop.offsetHeight;
    const above = r.top - ph - 10 > 8 && !anchor.closest('.top, .brief-row');
    pop.style.top = `${(above ? r.top - ph - 10 : r.bottom + 10) + window.scrollY}px`;
    pop.classList.toggle('below', !above);
  }

  private riskPopHtml(r: RiskView) {
    const names = this.namesOf(r.preparingCards);
    return `<h3 id="gpop-h">${esc(r.title || RISK_NAME[r.id])} <b>${esc(STAGE_WORD[r.stage])}</b></h3>
      <p class="pop-help">${esc(r.why)}</p>
      <p><span class="pop-k">${r.certainty === 'possible' ? 'Possible' : 'Likely'}</span>${
        r.certainty === 'possible' ? 'It also depends on something you cannot see, so it may never happen.' : 'If nothing changes, expect it.'
      }</p>
      <p class="pop-prep ${r.prepared ? 'yes' : 'no'}">${r.prepared ? ICON.check : ICON.cross}<span><b>${r.prepared ? 'Prepared.' : 'Not prepared.'}</b> ${esc(r.preparedBy)}</span></p>
      ${names.length ? `<p><span class="pop-k">Cards that prepare</span>${esc(names.join(', '))}</p>` : ''}`;
  }

  /** Close the popover; with `refocus`, focus goes back to what opened it (Escape). */
  private closePopover(refocus = false) {
    const pop = this.root.querySelector<HTMLElement>('#gpop');
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    this.root.querySelectorAll('[aria-controls="gpop"]').forEach((t) => t.setAttribute('aria-expanded', 'false'));
    if (refocus) {
      const f = pop.dataset.for ?? '';
      const sel = f.startsWith('risk:') ? `[data-risk="${f.slice(5)}"]` : `[data-key="${f}"][aria-controls="gpop"], [data-hidden="${f}"]`;
      tryFocus(this.root.querySelector(sel));
    }
  }

  private dismissIncome() {
    this.root.querySelectorAll('.res-wrap').forEach((w) => {
      if (w.matches(':hover, :focus-within') || w.querySelector('[aria-expanded="true"]')) w.classList.add('dismissed');
      w.querySelector('.res')?.setAttribute('aria-expanded', 'false');
    });
  }

  // ------------------------------------------------------------------ rendering

  private gaugeViews() {
    if (this.viewsFor !== this.s) {
      this.views = this.e.gaugeViews(this.s);
      this.viewsFor = this.s;
      this.cardNames = {};
    }
    return this.views;
  }

  private renderAll(flash = false) {
    this.buildTiles(this.e.dashboard(this.s));
    this.renderTop();
    this.renderClock();
    this.renderGauges(flash);
    this.renderTrajectory();
    this.renderAdvisor();
    this.renderRisks();
    this.renderIntro();
    this.renderNews();
    this.renderNotes();
  }

  private setPhase(text: string) {
    const p = this.root.querySelector('#phase');
    if (p) p.textContent = text;
  }

  private renderTop() {
    const s = this.s;
    const bump = (id: 'pc' | 'budget', v: number) => {
      const el = $(`#${id}`, this.root);
      const prev = this.shownRes[id];
      el.textContent = String(v);
      if (!Number.isNaN(prev) && prev !== v) {
        const box = el.closest('.res') as HTMLElement;
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
        const f = document.createElement('span');
        f.className = `res-float ${v > prev ? 'up' : 'down'}`;
        f.textContent = signed(v - prev);
        f.setAttribute('aria-hidden', 'true');
        box.appendChild(f);
        setTimeout(() => f.remove(), 1300);
      }
      this.shownRes[id] = v;
    };
    bump('pc', s.pc);
    bump('budget', s.budget);
    // next quarter's income, and why
    const inc = this.e.nextIncome(s);
    for (const k of ['budget', 'pc'] as const) {
      const n = inc[k];
      $(`#next-${k}`, this.root).textContent = inc.nextQuarterExists ? `${signed(n)} next` : 'no next quarter';
      const mine = inc.reasons.filter((r) => (k === 'pc' ? /\bPC\b|Political/.test(r) : /Budget/.test(r)));
      $(`#inc-${k}`, this.root).innerHTML = inc.nextQuarterExists
        ? `<b>Next quarter: ${esc(signed(n))} ${k === 'pc' ? 'Political Capital' : 'Budget'}</b>${mine.length ? `<span>${mine.map(esc).join(' · ')}</span>` : ''}`
        : '<b>No income: this is the last decision.</b>';
    }
  }

  private renderClock() {
    const s = this.s;
    const q = Math.max(1, s.quarter);
    $('#date', this.root).textContent = this.e.dateLabel(q);
    const qof = `, quarter ${q} of 16`;
    if ($('#qof', this.root).textContent !== qof) $('#qof', this.root).textContent = qof;
    const m0 = ((q - 1) % 4) * 3;
    const mi = this.clockActive ? Math.min(2, Math.floor(this.t * 3)) : 2;
    $('#month', this.root).textContent = s.quarter ? MONTHS[m0 + mi] : '';
    this.root.querySelectorAll<HTMLElement>('#quarters li').forEach((li) => {
      const n = Number(li.dataset.q);
      li.className = n < s.quarter ? 'done' : n === s.quarter ? 'now' : '';
      const fill = n < s.quarter ? 1 : n === s.quarter ? (this.clockActive ? this.t : 1) : 0;
      (li.firstElementChild as HTMLElement).style.width = `${(fill * 100).toFixed(1)}%`;
    });
    const play = $('#play', this.root) as HTMLButtonElement;
    play.disabled = !this.clockActive || this.eventBusy;
    play.innerHTML = this.running && this.clockActive ? ICON.pause : ICON.play;
    play.setAttribute('aria-label', this.running ? 'Pause the clock (Space)' : 'Resume the clock (Space)');
    this.root.querySelector('.game')?.classList.toggle('paused', this.clockActive && !this.running);
    this.root.querySelector('.game')?.classList.toggle('stopped', !this.clockActive);
  }

  private displayed(g: GaugeView) {
    const qs = this.s.quarterStart;
    const start = g.key === 'coalition' ? qs.coalition : qs.gauges[g.key] ?? g.value;
    if (!this.clockActive) return { value: g.value, delta: g.delta };
    const drift = this.drift[g.key] ?? 0;
    const ease = this.t < 1 ? 1 - Math.pow(1 - this.t, 2) : 1;
    const extra = this.eventShown ? g.value - start - drift : 0;
    const value = start + drift * ease + extra;
    return { value, delta: g.delta - (g.value - value) };
  }

  private renderGauges(flash = false) {
    const views = this.gaugeViews();
    const out: string[] = [];
    for (const g of views) {
      if (!g.visible) continue;
      const d = this.displayed(g);
      out.push(`${g.key}:${Math.round(d.value)}:${Math.round(d.delta)}:${g.errorBar}`);
    }
    const reveal = this.s.quarter > 0 && this.s.quarter <= this.s.revealUntil;
    const sig = out.join('|') + (reveal ? `|eu${this.s.eu.economy},${this.s.eu.culture},${this.s.eu.state}` : '');
    if (sig === this.lastGaugeSig && !flash) return;
    this.lastGaugeSig = sig;
    const crossed: string[] = [];
    for (const g of views) {
      const d = this.displayed(g);
      const v = Math.round(d.value);
      const dl = Math.round(d.delta);
      const tw = TONE_WORDS[tone(g.key, dl)];
      const th = THRESHOLDS[g.key];
      // a threshold crossed upwards during play: a short alert, once
      if (th) {
        const prev = this.thresholdSeen[g.key];
        if (prev !== undefined && prev < th.at && v >= th.at && this.s.quarter > 0) crossed.push(`${g.label} reached ${th.at}: ${th.meaning}.`);
        this.thresholdSeen[g.key] = v;
      }
      const hot = (g.key === 'misuse' && v >= 60) || (!!th && v >= th.at && g.key !== 'publicPressure');
      const desc = this.root.querySelector<HTMLElement>(`#gdesc-${g.key}`);
      if (desc) {
        const label =
          `${g.label}: ${v}${g.key === 'coalition' ? ' of 3 partners' : ' out of 100'}${g.errorBar ? `, plus or minus ${g.errorBar}` : ''}` +
          `${hot ? ', high' : ''}. ${dl ? `${moveWords(dl)} this quarter${tw ? `, ${tw}` : ''}` : 'No change this quarter'}.` +
          (th ? ` At ${th.at}: ${th.meaning}.` : '');
        // a description, not the name: the name stays the tile's visible text (WCAG 2.5.3, label in name)
        if (desc.textContent !== label) desc.textContent = label;
      }
      if (g.key === 'misuse' && hot && !this.warned.has(g.key) && this.clockActive) {
        this.warned.add(g.key);
        announce(`Warning: ${g.label} is high, at ${v}.`);
      } else if (!hot) this.warned.delete(g.key);
      // the header's GDP and approval
      const home = this.root.querySelector<HTMLElement>(`.home-ind[data-key="${g.key}"]`);
      if (home) {
        home.querySelector('b')!.textContent = String(v);
        const hd = home.querySelector<HTMLElement>('.g-delta')!;
        hd.textContent = dl ? signed(dl) : '';
        hd.className = `g-delta ${tone(g.key, dl)}`;
      }
      const tile = this.root.querySelector<HTMLElement>(`.g-tile[data-key="${g.key}"]`);
      if (!tile) continue;
      tile.querySelector('.g-val b')!.textContent = g.key === 'coalition' ? `${v}/3` : String(v);
      tile.querySelector('.g-val small')!.textContent = g.errorBar ? `±${g.errorBar}` : '';
      const dEl = tile.querySelector<HTMLElement>('.g-delta')!;
      const prev = dEl.dataset.v;
      dEl.textContent = dl ? signed(dl) : '';
      dEl.className = `g-delta ${tone(g.key, dl)}`;
      dEl.dataset.v = String(dl);
      if (g.key === 'coalition') {
        tile.querySelectorAll('.g-pips i').forEach((p, i) => p.classList.toggle('on', i < v));
      } else {
        (tile.querySelector('.g-fill') as HTMLElement).style.width = `${Math.max(0, Math.min(100, d.value))}%`;
        const err = tile.querySelector('.g-err') as HTMLElement;
        err.style.left = `${Math.max(0, d.value - g.errorBar)}%`;
        err.style.width = `${Math.min(100, d.value + g.errorBar) - Math.max(0, d.value - g.errorBar)}%`;
        err.style.opacity = g.errorBar ? '1' : '0';
        tile.classList.toggle('past-th', !!th && v >= th.at);
      }
      tile.classList.toggle('hot', hot);
      if (flash && prev !== undefined && prev !== String(dl)) {
        tile.classList.remove('flash');
        void tile.offsetWidth;
        tile.classList.add('flash');
      }
    }
    if (crossed.length) this.toast(`Threshold crossed. ${crossed.join(' ')}`, 'alert');
    const eu = this.root.querySelector<HTMLElement>('.g-tile[data-hidden="eu"]');
    if (eu) {
      eu.classList.toggle('revealed', reveal);
      eu.querySelector('.g-val')!.innerHTML = reveal
        ? `<span class="eu3"><span>Econ <b>${this.s.eu.economy}</b></span><span>Culture <b>${this.s.eu.culture}</b></span><span>State <b>${this.s.eu.state}</b></span></span>`
        : '<b>?</b>';
      eu.querySelector('.g-tease')!.textContent = reveal ? `Audit visible until ${this.e.dateLabel(this.s.revealUntil)}` : '';
    }
    const gv = (k: string) => views.find((x) => x.key === k);
    const disp = (k: string) => {
      const g = gv(k);
      return g ? this.displayed(g).value : 0;
    };
    this.map.update({
      capability: disp('capability'),
      tension: disp('tension'),
      verification: disp('verification'),
      coalition: gv('coalition')?.value ?? 0,
      publicPressure: disp('publicPressure'),
      misuse: disp('misuse'),
    });
  }

  /** The trajectory bar: the four plans' odds, and the last movement with its cause. */
  private renderTrajectory() {
    const tr = this.e.trajectory(this.s);
    const sig = PLAN_ORDER.map((p) => Math.round(tr.odds[p] * 100)).join(',');
    const bar = $('#trajbar', this.root);
    if (sig !== this.trajSig) {
      const first = !bar.childElementCount;
      if (first) {
        bar.innerHTML = PLAN_ORDER.map((p) => `<span class="tseg s-${PLAN_TONE[p]}" data-plan="${p}"><i></i></span>`).join('');
      }
      for (const p of PLAN_ORDER) {
        const seg = bar.querySelector<HTMLElement>(`[data-plan="${p}"]`)!;
        seg.style.flexGrow = String(Math.max(0.0001, tr.odds[p]));
        seg.classList.toggle('hi', p === tr.mostLikely);
        seg.querySelector('i')!.textContent = tr.odds[p] >= 0.12 ? `${PLAN[p].short} ${pct(tr.odds[p])}` : tr.odds[p] >= 0.06 ? pct(tr.odds[p]) : '';
      }
      bar.setAttribute('aria-label', `Most likely: ${PLAN[tr.mostLikely].name}. ${PLAN_ORDER.map((p) => `${PLAN[p].name} ${pct(tr.odds[p])}`).join(', ')}.`);
      this.trajSig = sig;
    }
    const c = tr.change;
    const csig = c ? `${c.plan}:${c.delta}:${c.because}` : '';
    const out = $('#trajchange', this.root);
    if (csig !== this.trajChangeSig) {
      this.trajChangeSig = csig;
      if (c) {
        const t = trajectoryChangeText(c);
        out.innerHTML = `<span class="tc-head ${t.tone}">${esc(t.head)}</span><span class="tc-why">${esc(t.because)}</span>`;
        out.className = 'traj-change moved';
        const seg = bar.querySelector<HTMLElement>(`[data-plan="${c.plan}"]`);
        seg?.classList.remove('pulse');
        if (seg && !reducedMotion()) {
          void seg.offsetWidth;
          seg.classList.add('pulse');
        }
        announce(`Where the superpowers are heading: ${t.said}. ${t.because}`);
      } else {
        out.innerHTML = `<span class="tc-why">Most likely if AI starts improving itself: <b>${esc(PLAN[tr.mostLikely].name)}</b>.</span>`;
        out.className = 'traj-change';
      }
    } else if (!c) {
      const b = out.querySelector('b');
      if (b && b.textContent !== PLAN[tr.mostLikely].name) b.textContent = PLAN[tr.mostLikely].name;
    }
  }

  private renderAdvisor() {
    const a = this.e.advisor(this.s);
    $('#adv-text', this.root).textContent = a.text;
    const parts: string[] = [];
    if (a.recommend) parts.push(`<span class="adv-k">Recommended</span><b>${esc(this.namesOf([a.recommend])[0])}</b>${a.reason ? ` · ${esc(a.reason)}` : ''}`);
    else if (a.reason) parts.push(esc(a.reason));
    if (a.alternative) parts.push(`<span class="adv-k">Alternative</span>${esc(a.alternative.text)}`);
    $('#adv-more', this.root).innerHTML = parts.join('<br>');
  }

  private renderRisks() {
    const risks = this.e.riskViews(this.s);
    const ul = $('#risks', this.root);
    const moved: string[] = [];
    for (const r of risks) {
      const before = this.riskStages[r.id];
      const name = r.title || RISK_NAME[r.id];
      if (before !== r.stage && r.stage !== 'happened') {
        if (!before) moved.push(`New risk: ${name}, ${STAGE_WORD[r.stage].toLowerCase()}, ${r.prepared ? 'you are prepared' : 'you are not prepared'}.`);
        else if (STAGE_ORDER.indexOf(r.stage) > STAGE_ORDER.indexOf(before as RiskView['stage']))
          moved.push(`${name} is now ${STAGE_WORD[r.stage].toLowerCase()}${r.prepared ? '' : ', and you are not prepared'}.`);
      }
    }
    const sig = risks.map((r) => `${r.id}:${r.stage}:${r.prepared}:${r.certainty}`).join('|');
    if (ul.dataset.sig !== sig) {
      ul.dataset.sig = sig;
      const focusedRisk = (document.activeElement as HTMLElement | null)?.dataset?.risk;
      ul.innerHTML = risks.length
        ? risks
            .map((r) => {
              const stageN = STAGE_ORDER.indexOf(r.stage);
              const isNew = this.riskStages[r.id] !== undefined && this.riskStages[r.id] !== r.stage;
              return `<li><button type="button" class="risk st-${r.stage}${r.prepared ? ' prepared' : ''}${isNew || this.riskStages[r.id] === undefined ? ' moved' : ''}" data-risk="${esc(r.id)}" aria-expanded="false" aria-controls="gpop">
                <span class="rk-name">${esc(r.title || RISK_NAME[r.id])}</span>
                <span class="rk-meter" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= stageN ? 'on' : ''}"></i>`).join('')}</span>
                <span class="rk-stage">${esc(STAGE_WORD[r.stage])}${r.stage !== 'happened' ? ` · ${r.certainty === 'possible' ? 'Possible' : 'Likely'}` : ''}</span>
                <span class="rk-prep">${r.prepared ? `${ICON.check}Prepared` : `${ICON.cross}Not prepared`}</span>
              </button></li>`;
            })
            .join('')
        : '<li class="risk-none">No crisis on the horizon yet.</li>';
      ul.querySelectorAll<HTMLButtonElement>('.risk').forEach((b) => b.addEventListener('click', () => this.togglePopover(b)));
      if (focusedRisk) tryFocus(ul.querySelector(`[data-risk="${focusedRisk}"]`));
    }
    for (const r of risks) this.riskStages[r.id] = r.stage;
    if (moved.length) announce(`Risks: ${moved.join(' ')}`);
  }

  /** The indicator introduced this quarter: a "New" tag on its tile and one line on why it matters now. */
  private renderIntro() {
    const intro = this.e.dashboard(this.s).introduced;
    const p = $('#gintro', this.root);
    this.root.querySelectorAll<HTMLElement>('.g-tile .g-new').forEach((n) => (n.hidden = n.closest<HTMLElement>('.g-tile')!.dataset.key !== intro?.key));
    if (!intro) {
      p.hidden = true;
      return;
    }
    const g = this.gaugeViews().find((x) => x.key === intro.key);
    const name = g?.label ?? intro.key;
    p.innerHTML = `<span class="g-intro-k">New indicator</span><b>${esc(name)}</b> ${esc(intro.why)}`;
    p.hidden = false;
    const said = `${this.s.quarter}:${intro.key}`;
    if (this.introducedSaid !== said) {
      this.introducedSaid = said;
      announce(`New indicator: ${name}. ${intro.why}`);
    }
  }

  private markRead(kind: 'news' | 'notes') {
    const ids = kind === 'news' ? this.feed.map((f) => f.id) : this.s.notes.map((n) => n.id);
    let changed = false;
    for (const id of ids) if (this.unread.delete(id)) changed = true;
    if (changed && kind === 'notes') this.renderUnreadCount();
  }

  private renderUnreadCount() {
    const n = this.s.notes.filter((x) => this.unread.has(x.id)).length;
    const el = $('#notes-unread', this.root);
    el.textContent = `${n} unread`;
    el.hidden = !n;
  }

  /** Earlier quarters, folded under their date (newest first). */
  private past<T extends { quarter: number }>(items: T[], li: (x: T) => string, kind: string) {
    const qs = [...new Set(items.map((x) => x.quarter))].sort((a, b) => b - a);
    return qs
      .map((q) => {
        const xs = items.filter((x) => x.quarter === q).reverse();
        return `<details class="feed-fold"><summary>${esc(this.e.dateLabel(q))} <small>${xs.length} ${kind}${xs.length > 1 ? 's' : ''}</small></summary><ol>${xs.map(li).join('')}</ol></details>`;
      })
      .join('');
  }

  private renderFolds(container: HTMLElement, html: string) {
    // keep open folds open across redraws
    const open = new Set([...container.querySelectorAll('details[open] summary')].map((s) => s.firstChild?.textContent?.trim()));
    container.innerHTML = html;
    container.querySelectorAll('details').forEach((d) => {
      if (open.has(d.querySelector('summary')?.firstChild?.textContent?.trim())) d.open = true;
    });
  }

  private renderNews(fresh?: string) {
    const q = this.s.quarter;
    const li = (n: FeedItem) => `<li class="ni ${n.kind === 'event' ? 'ni-event' : ''}${n.id === fresh ? ' new' : ''}${this.unread.has(n.id) ? ' unread' : ''}">
        <span class="ni-meta"><span class="actor t-${ACTOR_TONE[n.actor]}">${esc(n.kind === 'event' ? 'Breaking' : ACTOR_SHORT[n.actor])}</span><time class="num">${esc(this.e.dateLabel(n.quarter))}</time>${this.unread.has(n.id) ? '<span class="new-tag">New</span>' : ''}</span>
        <p>${esc(n.text)}</p></li>`;
    const now = this.feed.filter((n) => n.quarter === q).reverse();
    const shown = this.moreNews ? now : now.slice(0, FEED_FIRST);
    $('#news', this.root).innerHTML = now.length ? shown.map(li).join('') : '<li class="empty">Headlines will arrive while the clock runs.</li>';
    const more = $<HTMLButtonElement>('#news-more', this.root);
    more.hidden = now.length <= FEED_FIRST;
    more.textContent = this.moreNews ? 'Show fewer' : `More this quarter (${now.length - FEED_FIRST})`;
    more.setAttribute('aria-expanded', String(this.moreNews));
    this.renderFolds($('#news-past', this.root), this.past(this.feed.filter((n) => n.quarter < q), li, 'item'));
    const last = this.feed[this.feed.length - 1];
    if (last) {
      $('#tickTag', this.root).textContent = last.kind === 'event' ? 'BREAKING' : ACTOR_SHORT[last.actor].toUpperCase();
      $('#tickTag', this.root).className = `ticker-tag t-${last.kind === 'event' ? 'alarm' : ACTOR_TONE[last.actor]}`;
      const tt = $('#tickText', this.root);
      if (tt.textContent !== last.text) {
        tt.textContent = last.text;
        tt.classList.remove('roll');
        void tt.offsetWidth;
        tt.classList.add('roll');
      }
    }
  }

  private renderNotes(fresh?: string) {
    const q = this.s.quarter;
    const all = this.s.notes.filter((n) => this.seen.has(n.id) || n.quarter < q);
    all.forEach((n) => this.seen.add(n.id));
    const li = (n: InternalNote) => {
      const lines = Math.max(1, Math.min(3, Math.round(n.text.length / 60)));
      return `<li class="note ${n.readable ? 'readable' : 'redacted'}${n.id === fresh ? ' new' : ''}${this.unread.has(n.id) ? ' unread' : ''}">
        <span class="ni-meta"><span class="actor t-${ACTOR_TONE[n.actor]}">${esc(ACTOR[n.actor])}</span><time class="num">${esc(this.e.dateLabel(n.quarter))}</time>${this.unread.has(n.id) ? '<span class="new-tag">New</span>' : ''}<span class="stamp">${n.readable ? 'Confidential' : 'Redacted'}</span></span>
        ${
          n.readable
            ? `<p>${esc(n.text)}</p>`
            : `<p class="redacted-body"><span class="sr-only">Redacted note: invest in oversight to read it.</span>${Array.from({ length: lines }, (_, i) => `<span class="rl" style="width:${i === lines - 1 ? 45 + ((n.text.length * 7) % 40) : 100}%" aria-hidden="true"></span>`).join('')}</p>`
        }</li>`;
    };
    const now = all.filter((n) => n.quarter === q).reverse();
    const shown = this.moreNotes ? now : now.slice(0, FEED_FIRST);
    $('#notes', this.root).innerHTML = now.length ? shown.map(li).join('') : '<li class="empty">No confidential report this quarter yet.</li>';
    const more = $<HTMLButtonElement>('#notes-more', this.root);
    more.hidden = now.length <= FEED_FIRST;
    more.textContent = this.moreNotes ? 'Show fewer' : `More this quarter (${now.length - FEED_FIRST})`;
    more.setAttribute('aria-expanded', String(this.moreNotes));
    this.renderFolds($('#notes-past', this.root), this.past(all.filter((n) => n.quarter < q), li, 'note'));
    $('#notesHint', this.root).hidden = !all.some((n) => !n.readable);
    this.renderUnreadCount();
  }

  // ------------------------------------------------------------------ juice

  private coachQueue: string[] = [];
  private coachBusy = false;
  private coach(key: string, text: string) {
    if (this.coached.has(key) || this.s.quarter > 2) return;
    this.coached.add(key);
    this.coachQueue.push(text);
    void this.runCoach();
  }
  private async runCoach() {
    if (this.coachBusy) return;
    this.coachBusy = true;
    const el = $('#coach', this.root);
    while (this.coachQueue.length) {
      el.textContent = this.coachQueue.shift()!;
      el.hidden = false;
      announce(el.textContent);
      await wait(5200);
      el.hidden = true;
      await wait(250);
    }
    this.coachBusy = false;
  }

  /** A short message at the bottom of the screen, also announced to screen readers unless `say` is false. */
  private toast(text: string, kind: 'info' | 'alert' = 'info', say = true) {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    if (say) announce(text);
    document.body.appendChild(t);
    const life = kind === 'alert' ? 5200 : 2600;
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + 400);
  }
}

