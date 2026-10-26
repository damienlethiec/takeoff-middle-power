// The game controller (v3). It builds the main screen (header, map, gauges, heading line, dock), runs each
// round's six months on the map, stops for Breaking news, waits for the player ("See what changed",
// "Make my decisions"), shows the consequences once on the map, and ends with the end screen.
// It talks to the engine only through EngineApi.

import type { EngineApi } from '../engine/api';
import type { FeedItem, GameState, GaugeKey, LeaMood, MapItem, Pick, ThreatView } from '../engine/types';
import { CARD_BY_ID } from '../data/cards';
import { GAUGE_LABEL, GAUGE_SUB, TIPPING_LINE, marginText } from '../data/copy';
import { announce, focusOwnsKey, reducedMotion, setSingleKeyShortcuts, shortcutsOn, tryFocus } from './a11y';
import { Coach } from './coach';
import { $, ICON, esc, signed } from './format';
import { WorldMap } from './map';
import { modalOpen, setFocusFallback, wait } from './modal';
import { showBreaking } from './screens/breaking';
import { showDecision } from './screens/decision';
import { renderEnding } from './screens/ending';
import { showHelp } from './screens/help';
import { showBadge, showGaugeHelp, showLeak, showThreat } from './screens/info';
import { showIntro } from './screens/intro';
import { showLetters } from './screens/letters';
import { showWorlds } from './screens/worlds';
import { outlookHtml } from './outlook';
import { Feed } from './feed';

const ROUND_MS = 8000;
const KEYS: GaugeKey[] = ['aiPower', 'cooperation', 'confidence', 'cohesion'];
type Vals = { aiPower: number; cooperation: number; confidence: number; margin: number; cohesion: number };
type Live = { item: MapItem; kind: 'headline' | 'voice'; state: 'wait' | 'live' | 'gone'; until: number };

export class App {
  private s!: GameState;
  private map!: WorldMap;
  private feed!: Feed;
  /** The six months are over: the feed shows "What changed" on top. */
  private feedDone = false;
  private coach: Coach;
  private gameId = 0;
  // clock
  private t = 0;
  private running = false;
  private speed: 1 | 2 = 1;
  private clockActive = false;
  private lastTs = 0;
  private clockDone: (() => void) | null = null;
  private eventShown = false;
  private eventBusy = false;
  private items: Live[] = [];
  private leakShown = false;
  // gauges: what is drawn, what it is heading to
  private shown!: Vals;
  private from!: Vals;
  private to!: Vals;
  private follow: 'clock' | 'tween' = 'tween';
  private prevThreats: ThreatView[] = [];
  private dockResolve: (() => void) | null = null;
  private unreadLetter = false;
  private headingWhy = '';

  constructor(
    private root: HTMLElement,
    private e: EngineApi,
  ) {
    const p = new URLSearchParams(location.search);
    this.coach = new Coach(p.has('notutorial'));
  }

  async boot() {
    requestAnimationFrame(this.tick);
    document.addEventListener('keydown', this.onKey);
    setFocusFallback(() => this.root.querySelector<HTMLElement>('#map-h') ?? this.root.querySelector<HTMLElement>('h1'));
    const params = new URLSearchParams(location.search);
    if (!params.has('skipintro')) await showIntro();
    this.newGame(params.has('seed') ? Number(params.get('seed')) : undefined);
  }

  /** Dev hook for tests: inspect or replace the state. */
  get debug() {
    return { state: () => this.s, set: (s: GameState) => ((this.s = s), this.renderAll()), app: this };
  }

  private newGame(seed = (Date.now() % 2147483646) + 1) {
    this.gameId += 1;
    document.body.classList.remove('ended');
    this.s = this.e.createInitialState(seed);
    this.coach.reset();
    this.prevThreats = [];
    this.unreadLetter = false;
    this.headingWhy = '';
    this.buildShell();
    const v = this.vals();
    this.shown = { ...v };
    this.from = { ...v };
    this.to = { ...v };
    this.renderAll();
    tryFocus($('#game-title', this.root));
    void this.loop(this.gameId);
  }

  private vals(s = this.s): Vals {
    const g = this.e.gauges(s);
    const c = g.find((x) => x.key === 'confidence')!;
    return { aiPower: s.aiPower, cooperation: s.cooperation, confidence: c.value, margin: c.margin, cohesion: s.cohesion };
  }

  // ------------------------------------------------------------------ flow

  private async loop(id: number) {
    for (;;) {
      const outcome = await this.playRound();
      if (id !== this.gameId) return;
      if (outcome === 'ended') break;
    }
    this.clockActive = false;
    document.body.classList.add('ended');
    renderEnding(this.root, this.e.ending(this.s), () => this.newGame());
    announce(`The game is over: ${this.e.ending(this.s).title}.`);
  }

  private async playRound(): Promise<'next' | 'ended'> {
    const before = this.s;
    this.s = this.e.startRound(this.s);
    const s = this.s;
    const date = this.e.dateLabel(s.round);
    // gauges travel from where they were to where six months take them
    this.from = this.vals(before);
    this.to = this.vals();
    this.follow = 'clock';
    this.items = [
      ...s.headlines.map((item) => ({ item, kind: 'headline' as const, state: 'wait' as const, until: Math.min(1.05, item.at + 0.42) })),
      ...s.voices.map((item) => ({ item, kind: 'voice' as const, state: 'wait' as const, until: Math.min(1.05, item.at + 0.32) })),
    ];
    this.leakShown = false;
    this.feedDone = false;
    this.feed.clearMark();
    this.map.setLeak(null);
    this.map.clearItems();
    this.map.setThreats(this.prevThreats);
    const letter = this.e.letters(s).find((l) => l.round === s.round && l.slot !== 'end');
    if (letter) {
      this.unreadLetter = true;
      this.map.setLea(letter.mood, true);
    }
    this.renderAll();
    const inc = s.influence - before.influence;
    announce(
      `${date} begins, round ${s.round} of 12. Influence ${signed(inc)}: you have ${s.influence}. The clock is running.${letter ? ' Léa wrote to you: her portrait is over Lyon on the map.' : ''}${s.round === 1 ? ' Press question mark for help.' : ''}`,
    );
    // the tutorial, at first use
    if (s.round === 1) {
      await this.coach.show('clock', 1, this.root);
      await this.coach.show('influence', 1, this.root);
    }
    if (s.round === 2) await this.coach.show('zones', 2, this.root);
    if (s.round === 3 || s.europeAi === 'open') await this.coach.show('badge', s.round, this.root);

    this.beginClock();
    await new Promise<void>((r) => (this.clockDone = r));
    this.clockActive = false;
    this.items.forEach((x) => x.state !== 'gone' && this.map.hideItem(x.item.id));
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.feedDone = true;
    this.renderAll();
    if (this.s.round === 1) await this.coach.show('heading', 1, this.root);
    if (this.s.round === 2) await this.coach.show('margin', 2, this.root);

    // the clock stops: the player takes the lead
    let picks: Pick[] | null = null;
    const lastWords = this.s.tipping
      ? 'AI has reached the tipping point. This is your last round of decisions.'
      : this.s.round === 12
        ? 'The last six months. This is your last round of decisions.'
        : 'Six months have passed: what changed is at the top of the news. The clock is stopped: take your time.';
    const decideLabel = this.s.tipping || this.s.round === 12 ? 'Make my last decisions' : 'Make my decisions';
    while (!picks) {
      await this.dock(lastWords, [{ id: 'decide', label: decideLabel, primary: true }]);
      this.setPhase('Your decisions');
      await this.coach.show('firstCard', this.s.round, this.root);
      if (this.s.round >= 2) await this.coach.show('twoCards', this.s.round, this.root);
      const d = await showDecision(this.e, this.s, date);
      if (d.kind === 'map') continue;
      picks = d.picks;
    }
    await this.consequences(picks);

    const end = this.e.endRound(this.s);
    const label = end.outcome === 'ended' ? 'See how it ends' : `Start ${this.e.dateLabel(this.s.round + 1)}`;
    await this.dock(picks.length ? 'The world takes note.' : 'You held your cards this round.', [{ id: 'next', label, primary: true }]);
    this.s = end.state;
    return end.outcome;
  }

  /** Play the cards, then show what they changed once, on the map: gauges move, the heading line updates. */
  private async consequences(picks: Pick[]) {
    const before = this.s;
    const headBefore = this.e.heading(before).text;
    for (const p of picks) {
      try {
        this.s = this.e.playCard(this.s, p);
      } catch (err) {
        console.warn('playCard refused', err);
      }
    }
    this.from = { ...this.shown };
    this.to = this.vals();
    this.follow = 'tween';
    const played = this.s.played.map((p) => {
      const d = CARD_BY_ID[p.id];
      const n = (before.uses[p.id] ?? 0);
      return d.levels ? d.levels[Math.min(n, d.levels.length - 1)] : d.name;
    });
    const a = this.vals(before);
    const b = this.vals();
    const moved: string[] = [];
    const line = (label: string, x: number, y: number, pre = '') => x !== y && moved.push(`${label} ${pre}${x} → ${pre}${y}`);
    line(GAUGE_LABEL.aiPower, a.aiPower, b.aiPower);
    line(GAUGE_LABEL.cooperation, a.cooperation, b.cooperation);
    line(GAUGE_LABEL.confidence, a.confidence, b.confidence);
    if (a.margin !== b.margin) moved.push(marginText(a.margin, b.margin));
    line(GAUGE_LABEL.cohesion, a.cohesion, b.cohesion);
    if (before.europeAi !== this.s.europeAi) moved.push(`Europe’s AI → ${this.s.europeAi === 'open' ? 'Open' : 'Dependent'}`);
    this.headingWhy = played.length ? `${played.join(' and ')}: ${moved.join(', ') || 'no gauge moved yet'}.` : '';
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.setPhase(played.length ? 'Consequences' : 'Paused');
    this.renderAll(true);
    const headAfter = this.e.heading(this.s).text;
    if (played.length) announce(`${this.headingWhy} ${headAfter !== headBefore ? headAfter : ''}`);
    await wait(reducedMotion() ? 100 : 1200);
  }

  // ------------------------------------------------------------------ clock

  private beginClock() {
    this.t = 0;
    this.eventShown = false;
    this.eventBusy = false;
    this.clockActive = true;
    this.running = true;
    this.setPhase('Clock running');
    this.renderClock();
  }

  private tick = (ts: number) => {
    requestAnimationFrame(this.tick);
    const dt = this.lastTs ? Math.min(100, ts - this.lastTs) : 0;
    this.lastTs = ts;
    if (this.clockActive && this.running && !this.eventBusy) {
      this.t = Math.min(1, this.t + (dt * this.speed) / ROUND_MS);
      this.onTime();
    }
    this.animateGauges(dt);
  };

  private onTime() {
    const s = this.s;
    for (const x of this.items) {
      if (x.state === 'wait' && this.t >= x.item.at) {
        x.state = 'live';
        this.map.showItem(x.item.id, x.item.region, x.item.text, x.kind);
        announce(`${x.kind === 'voice' ? 'Heard in ' + (x.item.region === 'eu' ? 'Europe' : x.item.region === 'us' ? 'the US' : 'China') : 'Headline'}: ${x.item.text}`);
        if (x.item.id.startsWith('t_')) this.revealThreats();
      } else if (x.state === 'live' && this.t >= x.until) {
        x.state = 'gone';
        this.map.hideItem(x.item.id);
      }
    }
    if (this.t >= 0.5) this.revealThreats();
    if (s.leak && !this.leakShown && this.t >= s.leak.at) {
      this.leakShown = true;
      this.map.setLeak(s.leak);
      announce(s.leak.readable ? 'A leak from inside the labs: find the envelope on the map to read it.' : 'A leak from inside the labs, but you cannot read it: it is redacted.');
      void this.tipWhilePaused('leak');
    }
    const ev = s.event;
    if (ev && !this.eventShown && this.t >= ev.at) {
      void this.fireEvent();
      return;
    }
    this.renderClock();
    this.renderFeed();
    if (this.t >= 1 && !this.eventBusy) {
      const done = this.clockDone;
      this.clockDone = null;
      done?.();
    }
  }

  /** Threat icons switch to this round's stages (when their headline shows, or halfway through). */
  private revealThreats() {
    const now = this.e.threats(this.s);
    const sig = (v: ThreatView[]) => v.map((x) => `${x.id}${x.stage}${x.prepared}`).join();
    if (sig(now) === sig(this.prevThreats)) return;
    const fresh = now.filter((x) => x.stage > 0 && !x.struck && !this.prevThreats.some((p) => p.id === x.id));
    this.prevThreats = now;
    this.map.setThreats(now);
    this.renderGauges();
    if (fresh.length) {
      announce(`New threat on the map: ${fresh.map((f) => `${f.name}, ${f.stageWord.toLowerCase()}`).join('; ')}.`);
      void this.tipWhilePaused('threat');
    }
  }

  /** A tip during the clock: pause, show it, resume. */
  private async tipWhilePaused(id: 'leak' | 'threat') {
    if (modalOpen() || this.eventBusy) return;
    const was = this.running;
    this.running = false;
    await this.coach.show(id, this.s.round, this.root);
    if (was && this.clockActive) this.running = true;
  }

  private async fireEvent() {
    const ev = this.s.event!;
    this.eventShown = true;
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.round);
    this.setPhase('Breaking news');
    this.map.burst(ev.region);
    this.map.showItem(`ev_${ev.id}`, ev.region, ev.headline.replace(/^BREAKING: /, ''), 'breaking');
    // the gauges catch up with the six months so far, so "before" on the screen is what the map shows
    this.shown = { ...this.to };
    this.renderGauges();
    if (!reducedMotion()) {
      document.body.classList.add('jolt');
      setTimeout(() => document.body.classList.remove('jolt'), 600);
    }
    announce(`Breaking news: ${ev.title}.`);
    await wait(800);
    const names = ev.preparedBy.map((c) => (c === 'inspections' ? 'the inspection accord' : CARD_BY_ID[c].name));
    const choice = await showBreaking(ev, date, names);
    try {
      this.s = this.e.resolveEvent(this.s, choice ?? ev.options[0]?.id);
    } catch (err) {
      console.warn('resolveEvent failed', err);
      this.s = this.e.resolveEvent(this.s, ev.options[0]?.id);
    }
    this.from = { ...this.shown };
    this.to = this.vals();
    this.follow = 'tween';
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.renderAll(true);
    await this.coach.show('breaking', this.s.round, this.root);
    this.follow = 'clock';
    this.from = { ...this.to };
    this.setPhase('Clock running');
    this.eventBusy = false;
  }

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

  /** Open a dialog from the main screen with the clock paused, and resume after. */
  private openFromMap(show: () => Promise<unknown>) {
    if (modalOpen() || this.eventBusy) return;
    const was = this.clockActive && this.running;
    if (was) this.setRunning(false, false);
    void show().then(() => {
      if (was && !modalOpen()) this.setRunning(true, false);
    });
  }

  private onKey = (ev: KeyboardEvent) => {
    if (ev.defaultPrevented || modalOpen() || document.body.classList.contains('ended') && ev.key !== 'Enter') return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (focusOwnsKey(k)) return;
    if (document.body.classList.contains('ended')) {
      if (k === 'Enter') {
        ev.preventDefault();
        this.root.querySelector<HTMLButtonElement>('[data-again]')?.click();
      }
      return;
    }
    if (k === ' ' && this.clockActive) {
      ev.preventDefault();
      this.setRunning(!this.running);
    } else if (k === 'Enter' && this.dockResolve) {
      ev.preventDefault();
      this.dockResolve();
    } else if (!shortcutsOn()) {
      return;
    } else if (k === '?') {
      ev.preventDefault();
      this.openHelp();
    } else if (k === 'n' || k === 'N') {
      ev.preventDefault();
      this.feed.focusTab();
    }
  };

  private openHelp() {
    this.openFromMap(() =>
      showHelp({ tutorial: this.coach.enabled, onTutorial: (on) => this.coach.setEnabled(on), shortcuts: shortcutsOn(), onShortcuts: (on) => setSingleKeyShortcuts(on), tips: this.coach.log }),
    );
  }
  /** A feed item shown on the map: its threat icon, Léa or the leak lights up, or its banner comes back where it happened. */
  private showOnMap(it: FeedItem) {
    const glow = (b: HTMLElement | null) => {
      if (!b) return false;
      b.classList.remove('hl');
      void b.offsetWidth;
      b.classList.add('hl');
      setTimeout(() => b.classList.remove('hl'), 2600);
      return true;
    };
    if (it.threat && glow(this.map.threatButton(it.threat))) return;
    if (it.kind === 'lea' && glow(this.map.leaButton)) return;
    if (it.kind === 'leak' && this.map.leakButton && !this.map.leakButton.hidden && glow(this.map.leakButton)) return;
    if (!it.region) return;
    this.map.burst(it.region, true);
    const id = `re_${it.id}`;
    this.map.hideItem(id);
    this.map.showItem(id, it.region, it.text, it.kind === 'voice' ? 'voice' : it.kind === 'event' ? 'breaking' : 'headline');
    setTimeout(() => this.map.hideItem(id), 4000);
  }

  private markFeed(pred: (x: FeedItem) => boolean) {
    const it = this.feed.latest(pred);
    if (it) this.feed.mark(it.id);
  }

  private feedOf: GameState | null = null;
  private feedCache: ReturnType<EngineApi['feed']> = [];
  private renderFeed() {
    if (!this.feed) return;
    if (this.feedOf !== this.s) {
      this.feedOf = this.s;
      this.feedCache = this.e.feed(this.s);
    }
    this.feed.render(this.feedCache, this.clockActive ? this.t : 2, this.feedDone);
  }
  private openLea() {
    this.openFromMap(async () => {
      await showLetters(
        this.e.letters(this.s).filter((l) => l.slot !== 'end'),
        (r) => this.e.dateLabel(r),
      );
      this.unreadLetter = false;
      this.map.setLea(this.leaMood(), false);
    });
  }

  /**
   * The game waits on the main screen for the player: a bar with one or two buttons. Enter presses the
   * primary one. Nothing opens by itself.
   */
  private dock<T extends string>(text: string, buttons: { id: T; label: string; primary?: boolean }[]): Promise<T> {
    const d = $('.dock', this.root);
    d.innerHTML = `<p id="dock-text">${esc(text)}</p><div class="dock-btns">${buttons
      .map((b) => `<button type="button" class="${b.primary ? 'btn-primary' : 'btn-quiet'}" data-go="${esc(b.id)}" ${b.primary ? 'aria-keyshortcuts="Enter"' : ''}>${esc(b.label)}${b.primary ? ' <kbd>Enter</kbd>' : ''}</button>`)
      .join('')}</div>`;
    d.hidden = false;
    this.root.querySelector('.game')?.classList.add('docked');
    this.setPhase('Your move');
    const primary = buttons.find((b) => b.primary) ?? buttons[0];
    tryFocus(d.querySelector(`[data-go="${primary.id}"]`));
    announce(`${text} ${buttons.map((b) => b.label).join(', or ')}${buttons.length > 1 ? `. Enter: ${primary.label}` : ''}.`);
    return new Promise((resolve) => {
      const go = (id: T) => {
        d.hidden = true;
        this.root.querySelector('.game')?.classList.remove('docked');
        this.dockResolve = null;
        resolve(id);
      };
      this.dockResolve = () => go(primary.id);
      d.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go as T)));
    });
  }

  // ------------------------------------------------------------------ shell

  private buildShell() {
    const tip = this.e.gauges(this.s).find((g) => g.key === 'aiPower')?.target ?? 80;
    const gauge = (k: GaugeKey, coach: string) => `
      <section class="gauge g-${k}" data-key="${k}" data-coach="${coach}" aria-labelledby="gn-${k}">
        <div class="g-top"><h3 class="g-name" id="gn-${k}">${esc(GAUGE_LABEL[k])}</h3><span class="g-val num" aria-hidden="true"></span><span class="g-delta" aria-hidden="true"></span>
          <button type="button" class="g-info" data-info="${k}" aria-label="About ${esc(GAUGE_LABEL[k])}" aria-describedby="gd-${k}">?</button></div>
        <div class="g-subrow" aria-hidden="true"><p class="g-sub">${esc(GAUGE_SUB[k])}</p><svg class="spark" viewBox="0 0 48 16" preserveAspectRatio="none"><title>History since 2027</title><polyline points=""/></svg></div>
        <div class="g-bar" aria-hidden="true">${k === 'cooperation' ? '<i class="zone-r"></i><i class="zone-a"></i><i class="zone-p"></i>' : ''}${k === 'aiPower' ? '<i class="g-tipzone"></i>' : ''}<i class="g-band"></i><i class="g-fill"></i><i class="g-target"></i><span class="g-target-l"></span></div>
        ${k === 'cooperation' ? '<div class="g-zones" aria-hidden="true"><span>Rupture</span><span>Race</span><span>Pause</span></div>' : ''}
        ${k === 'aiPower' ? `<p class="g-tipline" aria-hidden="true"><span class="long">${esc(TIPPING_LINE(tip))}</span><span class="short">${tip} = the tipping point</span></p><p class="g-eta" aria-hidden="true"></p>` : ''}
        <ul class="g-markers"></ul>
        <p class="sr-only" id="gd-${k}"></p>
      </section>`;
    this.root.innerHTML = `
    <div class="game">
      <header class="top">
        <h1 class="brand" id="game-title" tabindex="-1"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Middle Power</span></h1>
        <div class="when"><span class="date"><span id="date" class="num"></span><span class="round-of" id="round-of"></span></span>
          <ol class="rounds" id="rounds" aria-label="Progress through the 12 rounds">${Array.from({ length: 12 }, (_, i) => `<li data-r="${i + 1}"><i></i></li>`).join('')}</ol></div>
        <div class="clockctl">
          <button class="iconbtn" id="play" aria-keyshortcuts="Space"></button>
          <div class="speed" role="group" aria-label="Clock speed"><button type="button" data-speed="1" aria-pressed="true">×1</button><button type="button" data-speed="2" aria-pressed="false">×2</button></div>
          <span class="phase" id="phase" aria-hidden="true"></span>
        </div>
        <div class="inf" data-coach="influence">
          <span class="inf-ico">${ICON.influence}</span><span class="inf-v num" id="inf-v"></span>
          <span class="inf-l">Influence <small id="inf-next"></small></span>
          <span class="inf-why" id="inf-why"></span>
        </div>
        <div class="top-btns">
          <button type="button" class="iconbtn help-btn" id="help-btn" aria-label="Help and keyboard shortcuts" aria-keyshortcuts="?">?</button>
        </div>
      </header>
      <main class="stage">
        <section class="panel" aria-labelledby="gauges-h">
          <h2 class="sr-only" id="gauges-h">Gauges</h2>
          <div class="g-pair" role="group" aria-label="The race: ${esc(GAUGE_LABEL.aiPower)} against ${esc(GAUGE_LABEL.confidence)}">
            ${gauge('aiPower', 'clock')}<span class="g-vs" aria-hidden="true">vs</span>${gauge('confidence', 'confidence')}
          </div>
          ${gauge('cooperation', 'cooperation')}${gauge('cohesion', 'cohesion')}
        </section>
        <section class="outlook collapsed" data-coach="heading" aria-labelledby="ol-h" id="outlook">
          <div class="ol-body" id="ol-body"></div>
          <button type="button" class="ol-toggle btn-quiet small" aria-expanded="false" aria-controls="outlook">More<span class="sr-only"> about where the world is heading</span></button>
          <p class="heading-why" id="heading-why"></p>
        </section>
        <section class="theatre" aria-labelledby="map-h">
          <h2 class="sr-only" id="map-h" tabindex="-1">World map</h2>
          <div class="mapwrap" id="mapwrap" data-coach="map"></div>
          <aside class="feed" id="feed" aria-labelledby="feed-h" data-coach="feed"></aside>
        </section>
      </main>
      <section class="dock" aria-label="Your move" hidden></section>
      <p class="keys-hint" aria-hidden="true"><kbd>Space</kbd> pause · <kbd>Enter</kbd> continue · <kbd>N</kbd> news · <kbd>?</kbd> help</p>
    </div>`;
    this.map = new WorldMap($('#mapwrap', this.root));
    $('#mapwrap', this.root).setAttribute('aria-describedby', this.map.summaryId);
    this.map.onLea = () => {
      this.markFeed((x) => x.kind === 'lea');
      this.openLea();
    };
    this.map.onBadge = () => this.openFromMap(() => showBadge(this.s.europeAi, this.s.europeAiLocked));
    this.map.onLeak = () => {
      this.markFeed((x) => x.kind === 'leak');
      if (this.s.leak) this.openFromMap(() => showLeak(this.s.leak!, this.e.dateLabel(this.s.round)));
    };
    this.map.onThreat = (id) => {
      this.markFeed((x) => x.threat === id);
      const t = this.prevThreats.find((x) => x.id === id) ?? this.e.threats(this.s).find((x) => x.id === id);
      if (t) this.openFromMap(() => showThreat(t, this.e.hand(this.s)));
    };
    $('#play', this.root).addEventListener('click', () => this.setRunning(!this.running));
    $('#help-btn', this.root).addEventListener('click', () => this.openHelp());
    $('#outlook', this.root).addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-worlds]')) this.openFromMap(() => showWorlds(this.e.heading(this.s).world));
    });
    const tog = $<HTMLButtonElement>('.ol-toggle', this.root);
    tog.addEventListener('click', () => {
      const sec = $('#outlook', this.root);
      const open = sec.classList.toggle('collapsed') === false;
      tog.setAttribute('aria-expanded', String(open));
      tog.firstChild!.textContent = open ? 'Less' : 'More';
    });
    this.feed = new Feed($('#feed', this.root), { onSelect: (it) => this.showOnMap(it) });
    this.root.querySelectorAll<HTMLButtonElement>('.speed button').forEach((b) => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed) as 1 | 2)));
    this.root.querySelectorAll<HTMLButtonElement>('.g-info').forEach((b) =>
      b.addEventListener('click', () => {
        const g = this.e.gauges(this.s).find((x) => x.key === b.dataset.info)!;
        this.openFromMap(() => showGaugeHelp(g, this.gaugeText(g.key)));
      }),
    );
    this.setSpeed(this.speed);
  }

  // ------------------------------------------------------------------ rendering

  private renderAll(flash = false) {
    this.renderTop();
    this.renderFeed();
    this.renderClock();
    this.renderGauges(flash);
    this.renderHeading();
    this.map.update({ aiPower: this.shown.aiPower, cooperation: this.shown.cooperation, coalition: this.s.coalition, europeAi: this.s.europeAi });
    if (!this.unreadLetter) this.map.setLea(this.leaMood(), false);
    this.map.setUnrest(this.s.cohesion < 40 ? 2 : this.s.cohesion < 52 ? 1 : 0);
    this.renderSparks();
  }

  /** Léa's face follows the world between letters: relieved after a crisis Europe was ready for, worried or sad as Europe frays. */
  private leaMood(): LeaMood {
    const s = this.s;
    if (s.roundEvent?.prepared) return 'relieved';
    if (s.cohesion < 45) return 'sad';
    if (s.cohesion < 58 || s.roundEvent?.prepared === false) return 'worried';
    return 'hopeful';
  }

  /** Each gauge's history since 2027, as a small line (public values only). */
  private renderSparks() {
    const tr = this.e.trends(this.s);
    for (const k of KEYS) {
      const pl = this.root.querySelector<SVGPolylineElement>(`.gauge[data-key="${k}"] .spark polyline`);
      if (!pl) continue;
      const pts = tr[k].map((v, i) => `${((i * 48) / 12).toFixed(1)},${(15 - (Math.max(0, Math.min(100, v)) * 14) / 100).toFixed(1)}`).join(' ');
      if (pl.getAttribute('points') !== pts) pl.setAttribute('points', pts);
    }
  }

  private setPhase(text: string) {
    const p = this.root.querySelector('#phase');
    if (p) p.textContent = text;
  }

  private renderTop() {
    const s = this.s;
    const inc = this.e.nextIncome(s);
    $('#inf-v', this.root).textContent = String(s.influence);
    $('#inf-next', this.root).textContent = inc.nextRoundExists ? `${signed(inc.next)} next round` : 'no next round';
    $('#inf-why', this.root).textContent = inc.nextRoundExists ? inc.reasons.join(' · ') : '';
    $('.inf', this.root).setAttribute('aria-label', `Influence ${s.influence}. ${inc.nextRoundExists ? `Next round ${signed(inc.next)}: ${inc.reasons.join(', ')}.` : 'No income will follow.'}`);
    $('.inf', this.root).setAttribute('role', 'group');
  }

  private renderClock() {
    const s = this.s;
    const r = Math.max(1, s.round);
    $('#date', this.root).textContent = this.e.dateLabel(r);
    $('#round-of', this.root).textContent = ` · Round ${r} of 12`;
    this.root.querySelectorAll<HTMLElement>('#rounds li').forEach((li) => {
      const n = Number(li.dataset.r);
      li.className = n < s.round ? 'done' : n === s.round ? 'now' : '';
      const fill = n < s.round ? 1 : n === s.round ? (this.clockActive ? this.t : 1) : 0;
      (li.firstElementChild as HTMLElement).style.width = `${(fill * 100).toFixed(1)}%`;
    });
    const play = $<HTMLButtonElement>('#play', this.root);
    play.disabled = !this.clockActive || this.eventBusy;
    play.innerHTML = this.running && this.clockActive ? ICON.pause : ICON.play;
    play.setAttribute('aria-label', this.running && this.clockActive ? 'Pause the clock (Space)' : 'Resume the clock (Space)');
    this.root.querySelector('.game')?.classList.toggle('paused', this.clockActive && !this.running);
  }

  private animateGauges(dt: number) {
    if (!this.shown || !this.to) return;
    let target: Vals = this.to;
    if (this.follow === 'clock' && this.clockActive) {
      const k = Math.min(1, this.t / 0.9);
      const ease = 1 - Math.pow(1 - k, 2);
      target = Object.fromEntries((Object.keys(this.to) as (keyof Vals)[]).map((x) => [x, this.from[x] + (this.to[x] - this.from[x]) * ease])) as Vals;
    }
    const a = reducedMotion() ? 1 : Math.min(1, dt / 180);
    let changed = false;
    for (const x of Object.keys(target) as (keyof Vals)[]) {
      const d = target[x] - this.shown[x];
      if (Math.abs(d) < 0.05) {
        if (this.shown[x] !== target[x]) changed = true;
        this.shown[x] = target[x];
      } else {
        this.shown[x] += d * a;
        changed = true;
      }
    }
    if (changed) this.renderGauges();
  }

  private gaugeText(k: GaugeKey): string {
    const g = this.e.gauges(this.s).find((x) => x.key === k)!;
    const v = Math.round(k === 'confidence' ? this.shown.confidence : this.shown[k]);
    if (k === 'confidence') return g.audited ? `${v} audited` : `${v} ± ${Math.round(this.shown.margin)}`;
    return String(v);
  }

  private lastSig = '';
  private renderGauges(flash = false) {
    if (!this.s) return;
    const views = this.e.gauges(this.s);
    const start = this.s.roundStart;
    const sig = KEYS.map((k) => Math.round(this.shown[k])).join() + Math.round(this.shown.margin) + views.map((g) => `${g.target}${g.targetKind}${g.eta}${g.markers.map((m) => m.text).join()}`).join();
    if (sig === this.lastSig && !flash) return;
    this.lastSig = sig;
    for (const g of views) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${g.key}"]`);
      if (!box) continue;
      const v = Math.round(this.shown[g.key]);
      const base = g.key === 'confidence' ? start.estimate : start[g.key];
      const delta = this.s.round > 0 ? v - Math.round(base) : 0;
      box.querySelector('.g-val')!.textContent = g.key === 'confidence' && !g.audited ? `${v} ±${Math.round(this.shown.margin)}` : g.audited ? `${v}` : String(v);
      const dEl = box.querySelector<HTMLElement>('.g-delta')!;
      const good = g.key === 'aiPower' ? 0 : Math.sign(delta);
      dEl.textContent = delta ? signed(delta) : '';
      dEl.className = `g-delta ${good > 0 ? 'good' : good < 0 ? 'bad' : 'flat'}`;
      const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
      (box.querySelector('.g-fill') as HTMLElement).style.width = pct(this.shown[g.key]);
      const band = box.querySelector<HTMLElement>('.g-band')!;
      if (g.key === 'confidence' && !g.audited) {
        band.style.left = pct(this.shown.confidence - this.shown.margin);
        band.style.width = `${Math.min(100, this.shown.confidence + this.shown.margin) - Math.max(0, this.shown.confidence - this.shown.margin)}%`;
        band.hidden = false;
      } else band.hidden = true;
      const tg = box.querySelector<HTMLElement>('.g-target')!;
      const tl = box.querySelector<HTMLElement>('.g-target-l')!;
      tg.hidden = tl.hidden = g.target === null;
      if (g.target !== null) {
        tg.style.left = pct(g.target);
        tl.style.left = pct(g.target);
        tg.className = `g-target ${g.targetKind}`;
        tl.textContent = g.targetKind === 'tipping' ? '' : `${g.targetKind === 'goal' ? 'goal' : 'floor'} ${g.target}`;
        tl.hidden = g.targetKind === 'tipping';
      }
      if (g.key === 'aiPower') {
        box.classList.toggle('near', v >= 70);
        const eta = box.querySelector<HTMLElement>('.g-eta')!;
        if (eta.textContent !== (g.eta ?? '')) eta.textContent = g.eta ?? '';
      }
      box.querySelector('.g-markers')!.innerHTML = g.markers
        .map((m) => `<li class="${m.prepared ? 'yes' : 'no'}">${m.prepared ? ICON.check : ICON.alert}<span>${esc(m.text)}</span></li>`)
        .join('');
      const words =
        g.key === 'aiPower'
          ? `${v} out of 100. At 80, AI improves itself: the tipping point, and the game ends.${g.eta ? ` ${g.eta}` : ''}`
          : g.key === 'confidence'
            ? g.audited
              ? `${v}, audited: the true value.`
              : `${v}, plus or minus ${Math.round(this.shown.margin)}: the truth lies between ${Math.max(0, v - Math.round(this.shown.margin))} and ${Math.min(100, v + Math.round(this.shown.margin))}.`
            : `${v} out of 100.`;
      const zone = g.key === 'cooperation' ? ` Zone: ${v >= 60 ? 'Pause' : v >= 30 ? 'Race' : 'Rupture'}.` : '';
      const sub = ` ${g.sub}.`;
      const tgt = g.target !== null && g.key !== 'aiPower' ? ` ${g.targetKind === 'goal' ? 'Goal' : 'Floor'} for the world you are heading to: ${g.target}.` : '';
      const ch = delta ? ` ${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} this round.` : '';
      const desc = `${words}${g.key === 'aiPower' ? '' : sub}${zone}${tgt}${ch}${g.markers.length ? ` ${g.markers.map((m) => m.text).join('. ')}.` : ''}`;
      const d = box.querySelector<HTMLElement>(`#gd-${g.key}`)!;
      if (d.textContent !== desc) d.textContent = desc;
      if (flash && delta) {
        box.classList.remove('flash');
        void box.offsetWidth;
        box.classList.add('flash');
      }
    }
    this.map?.update({ aiPower: this.shown.aiPower, cooperation: this.shown.cooperation, coalition: this.s.coalition, europeAi: this.s.europeAi });
  }

  private renderHeading() {
    const h = this.e.heading(this.s);
    const body = $('#ol-body', this.root);
    const html = outlookHtml(h);
    if (body.dataset.sig !== html) {
      const changed = !!body.dataset.sig && body.dataset.sig2 !== h.text;
      body.dataset.sig = html;
      body.dataset.sig2 = h.text;
      // keep focus on the "What is…" button across re-renders
      const hadFocus = body.contains(document.activeElement);
      body.innerHTML = html;
      if (hadFocus) body.querySelector<HTMLElement>('[data-worlds]')?.focus({ preventScroll: true });
      if (changed) {
        const sec = $('#outlook', this.root);
        sec.classList.remove('flash');
        void sec.offsetWidth;
        sec.classList.add('flash');
      }
    }
    $('#heading-why', this.root).textContent = this.headingWhy;
  }
}
