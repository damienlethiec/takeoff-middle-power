// The game controller (v4). It builds the main screen (header, gauges with their targets, the line on where the world is heading, map, feed, dock), runs each
// round's six months on the map, stops for Breaking news and requests, waits for the player ("Make my
// decisions"), shows the consequences on the gauges and in the feed, then starts the next six months
// directly (the player can pause), and ends with the end screen.
// It talks to the engine only through EngineApi.

import type { EngineApi } from '../engine/api';
import type { FeedItem, GameState, GaugeKey, MapItem, Pick, PreviewView, RequestView, ThreatView } from '../engine/types';
import { CARD_BY_ID } from '../data/cards';
import { GAUGE_LABEL, GAUGE_SUB, TIPPING_LINE, TIPS, marginText } from '../data/copy';
import { announce, focusOwnsKey, reducedMotion, setSingleKeyShortcuts, shortcutsOn, tryFocus } from './a11y';
import { Coach } from './coach';
import { $, ICON, esc, signed } from './format';
import { WorldMap, type MapEntry } from './map';
import { modalOpen, setFocusFallback, wait } from './modal';
import { showBreaking } from './screens/breaking';
import { showDecision } from './screens/decide';
import { renderEnding } from './screens/ending';
import { showHelp } from './screens/help';
import { showBadge, showGaugeHelp, showLeak, showThreat } from './screens/info';
import { showIntro } from './screens/intro';
import { showWorlds } from './screens/worlds';
import { showRequest } from './screens/request';
import { badgeHtml, headingLineHtml, statusOf } from './outlook';
import { Feed } from './feed';

const ROUND_MS = 8000;
/** The start of Léa's letter, for her line in the map's list (the feed has it in full). */
const firstSentence = (t: string) => {
  const m = /^.+?[.!?](?=\s|$)/.exec(t);
  return m && m[0].length < t.length ? `${m[0]} …` : t;
};
const KEYS: GaugeKey[] = ['aiPower', 'cooperation', 'confidence', 'cohesion'];
/** US–China cooperation's zone (Pause 60+, Race 30–59, Rupture below 30). */
const zoneOf = (v: number) =>
  v >= 60 ? { id: 'p', name: 'Pause', range: '60+' } : v >= 30 ? { id: 'a', name: 'Race', range: '30–59' } : { id: 'r', name: 'Rupture', range: 'under 30' };
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
  /** A tutorial tip has paused the clock and is open. */
  private tipBusy = false;
  // gauges: what is drawn, what it is heading to
  private shown!: Vals;
  private from!: Vals;
  private to!: Vals;
  private follow: 'clock' | 'tween' = 'tween';
  private prevThreats: ThreatView[] = [];
  private dockResolve: (() => void) | null = null;
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
    this.map.setThreats(this.prevThreats);
    // Léa's letter is a feed item (in full, with her portrait) and an envelope in Europe's group on the map
    const letter = this.e.letters(s).find((l) => l.round === s.round && l.slot !== 'end');
    this.renderAll();
    const inc = s.influence - before.influence;
    announce(
      `${date} begins, round ${s.round} of 12. Influence ${signed(inc)}: you have ${s.influence}. The clock is running.${letter ? ' Léa wrote to you: her letter is in the news.' : ''}${s.round === 1 ? ' Press question mark for help.' : ''}`,
    );
    // the tutorial: at most four tips before the first decision (the race, the world, where it is heading, then
    // Influence on the decision view); later, only what does not explain itself, the first time it appears.
    // A tip whose part of the screen is not visible waits (it is tried again next round).
    for (const id of ['race', 'world', 'outlook'] as const) await this.coach.show(id, s.round, this.root);
    // Europe's AI is always on the line now: its tip comes once the first decisions are made
    if (s.round >= 2) await this.coach.show('badge', s.round, this.root);

    this.beginClock();
    await new Promise<void>((r) => (this.clockDone = r));
    this.clockActive = false;
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.feedDone = true;
    this.renderAll();

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
      // the cards take the map's place; Influence and the cards are explained the first time they show
      const game = this.root.querySelector('.game');
      game?.classList.add('deciding');
      const d = await showDecision(this.e, this.s, date, {
        host: $('#decide', this.root),
        onPreview: (pv) => this.setPreview(pv),
        onOpen: async () => {
          await this.coach.show('influence', this.s.round, this.root);
        },
      });
      game?.classList.remove('deciding');
      if (!this.root.contains(document.activeElement)) tryFocus($('#map-h', this.root));
      if (d.kind === 'map') continue;
      picks = d.picks;
    }
    await this.consequences(picks);

    // no stop between rounds: the gauges have moved, the decisions are in the feed, the next six months begin
    // (the player can pause). Only the end waits for the player.
    const end = this.e.endRound(this.s);
    if (end.outcome === 'ended') await this.dock(picks.length ? 'Your last decisions are made.' : 'You held your cards this round.', [{ id: 'next', label: 'See how it ends', primary: true }]);
    else if (!picks.length) announce('You held your cards this round.');
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
    // AI safety: what the labs claim, then what is verified
    line(this.safety().audited ? GAUGE_LABEL.confidence : `${GAUGE_LABEL.confidence} claimed`, a.confidence, b.confidence);
    const low = (x: Vals) => Math.max(0, Math.round(x.confidence - x.margin));
    if (a.margin !== b.margin) moved.push(marginText(low(a), low(b), a.margin, b.margin));
    line(GAUGE_LABEL.cohesion, a.cohesion, b.cohesion);
    if (before.europeAi !== this.s.europeAi) moved.push(`Europe’s AI → ${this.s.europeAi === 'open' ? 'Open' : 'Dependent'}`);
    this.headingWhy = played.length ? `${played.join(' and ')}: ${moved.join(', ') || 'no gauge moved yet'}.` : '';
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.setPhase(played.length ? 'Consequences' : 'Paused');
    this.renderAll(true);
    const headAfter = this.e.heading(this.s).text;
    if (played.length) announce(`${this.headingWhy} ${headAfter !== headBefore ? headAfter : ''}`);
    // long enough to see the gauges move before the next six months begin
    await wait(reducedMotion() ? 600 : 1600);
  }

  // ------------------------------------------------------------------ clock

  private beginClock() {
    this.t = 0;
    this.eventShown = false;
    this.eventBusy = false;
    this.tipBusy = false;
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
        // only the newest headline shows as a banner, briefly; then its icon stays in the region's cluster
        if (x.kind === 'headline') this.map.flashBanner(x.item.region, x.item.text, 'headline');
        announce(`${x.kind === 'voice' ? 'Heard in ' + (x.item.region === 'eu' ? 'Europe' : x.item.region === 'us' ? 'the US' : 'China') : 'Headline'}: ${x.item.text}`);
        if (x.item.id.startsWith('t_')) this.revealThreats();
      }
    }
    if (this.t >= 0.5) this.revealThreats();
    if (s.leak && !this.leakShown && this.t >= s.leak.at) {
      this.leakShown = true;
      announce(s.leak.readable ? 'A leak from inside the labs: it is in the news, and with the US items on the map.' : 'A leak from inside the labs, but you cannot read it: it is redacted.');
      void this.tipWhilePaused('leak');
    }
    // a tip just paused the clock: a request or an event due now waits until it is closed (two dialogs at once
    // would replace each other, and the tip's promise would never settle, leaving the clock stopped for good)
    if (this.tipBusy) {
      this.renderClock();
      this.renderFeed();
      return;
    }
    const ev = s.event;
    const q = this.e.request(s);
    if (q && this.t >= q.at && (!ev || this.eventShown || q.at < ev.at)) {
      void this.fireRequest(q);
      return;
    }
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
    if (modalOpen() || this.eventBusy || this.tipBusy) return;
    const was = this.running;
    this.tipBusy = true;
    this.running = false;
    try {
      await this.coach.show(id, this.s.round, this.root);
    } finally {
      this.tipBusy = false;
    }
    if (was && this.clockActive) this.running = true;
    this.renderClock();
  }

  private async fireEvent() {
    const ev = this.s.event!;
    this.eventShown = true;
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.round);
    this.setPhase('Breaking news');
    this.map.burst(ev.region);
    this.map.flashBanner(ev.region, ev.headline.replace(/^BREAKING: /, ''), 'breaking', 5000);
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
    this.follow = 'clock';
    this.from = { ...this.to };
    this.setPhase('Clock running');
    this.eventBusy = false;
    // the clock was running when this fired: always resume, and redraw the pause button (enabled again)
    if (this.clockActive) this.running = true;
    this.renderClock();
  }

  /** A character arrives with a request: the clock stops until the player answers (free of Influence). */
  private async fireRequest(v: RequestView) {
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.round);
    this.setPhase('A request');
    this.shown = { ...this.to };
    this.renderGauges();
    // the character's region calls for attention while the request is open; its icon stays for the round
    this.map.setCalling(v.character.region);
    this.renderClock();
    await showRequest(v, date, (side) => {
      const r = this.e.answerRequest(this.s, side);
      this.s = r.state;
      this.from = { ...this.shown };
      this.to = this.vals();
      this.follow = 'tween';
      this.prevThreats = this.e.threats(this.s);
      this.map.setThreats(this.prevThreats);
      this.renderAll(true);
      return r.outcome;
    }, () => this.coach.show('request', this.s.round, this.root)); // the tip waits until the card is on screen
    this.map.setCalling(null);
    this.renderAll();
    this.follow = 'clock';
    this.from = { ...this.to };
    this.setPhase('Clock running');
    this.eventBusy = false;
    // the clock was running when this fired: always resume, and redraw the pause button (enabled again)
    if (this.clockActive) this.running = true;
    this.renderClock();
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
      showHelp({ tutorial: this.coach.enabled, onTutorial: (on) => this.coach.setEnabled(on), shortcuts: shortcutsOn(), onShortcuts: (on) => setSingleKeyShortcuts(on), tips: Object.values(TIPS).map((t) => ({ round: 0, title: t.title, text: t.text })) }),
    );
  }
  /** A feed item shown on the map: its threat icon lights up, or its region's group opens with it highlighted. */
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
    // this round's items: their region's list opens with the item highlighted
    if (this.map.showEntry(it.id)) return;
    if (it.region) this.map.burst(it.region, true);
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
    const t = this.clockActive ? this.t : 2;
    this.feed.render(this.feedCache, t, this.feedDone);
    // the round's items, as icons clustered per region on the map (they leave with the round)
    const cur = this.feedCache.at(-1);
    const onMap = new Set(['headline', 'milestone', 'voice', 'lea', 'leak', 'event', 'request']);
    this.map.setItems(
      cur && cur.round === this.s.round
        ? cur.items
            .filter((x) => onMap.has(x.kind) && x.region && (x.at <= t || (this.feedDone && x.at <= 1)))
            .map((x) => ({ id: x.id, kind: x.kind as MapEntry['kind'], region: x.region!, label: x.label, text: x.kind === 'lea' ? firstSentence(x.text) : x.text }))
        : [],
    );
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
    // narrow screens: the bar sits between the map and the news, so it never covers the top of the feed
    const feed = this.root.querySelector('#feed');
    if (feed && matchMedia('(max-width: 860px), (max-height: 640px)').matches) feed.before(d);
    else this.root.querySelector('.stage')?.after(d);
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
    // every gauge has the same four rows, aligned across the cards: name and "?"; the value, its change and a
    // status chip; the bar with its marks; one caption. The subtitle is behind "?" (and in the description).
    const gauge = (k: GaugeKey, coach: string) => `
      <section class="gauge g-${k}" data-key="${k}" data-coach="${coach}" aria-labelledby="gn-${k}">
        <div class="g-head"><h3 class="g-name" id="gn-${k}">${esc(GAUGE_LABEL[k])}</h3><span class="g-alerts" aria-hidden="true"></span>
          <button type="button" class="g-info" data-info="${k}" aria-label="About ${esc(GAUGE_LABEL[k])}" aria-describedby="gd-${k}" title="${esc(GAUGE_SUB[k])}">?</button></div>
        <div class="g-line" aria-hidden="true"><span class="g-val num"></span><span class="g-delta"></span><span class="g-after num"></span><span class="g-chip"></span></div>
        <div class="g-bar" aria-hidden="true">${k === 'cooperation' ? '<i class="zone-r"></i><i class="zone-a"></i><i class="zone-p"></i>' : ''}${k === 'aiPower' ? '<i class="g-tipzone"></i>' : ''}<i class="g-fill"></i><i class="g-band"></i><i class="g-ghost g-ghost-low" hidden></i><i class="g-ghost" hidden></i><i class="g-target"></i></div>
        <p class="g-cap" aria-hidden="true">${k === 'aiPower' ? `<span class="long">${esc(TIPPING_LINE(tip))}</span><span class="short">${tip} = the tipping point</span>` : ''}</p>
        <p class="sr-only" id="gd-${k}"></p>
      </section>`;
    this.root.innerHTML = `
    <div class="game">
      <header class="top">
        <h1 class="brand" id="game-title" tabindex="-1"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Europe’s Next Move</span></h1>
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
          ${gauge('aiPower', 'clock')}${gauge('confidence', 'confidence')}${gauge('cooperation', 'cooperation')}${gauge('cohesion', 'cohesion')}
        </section>
        <section class="heading-line" id="heading-line" data-coach="heading" aria-labelledby="hl-h">
          <h2 class="sr-only" id="hl-h">Where the world is heading</h2>
          <p class="hl-text" id="hl-text" aria-hidden="true"></p>
          <p class="sr-only" id="hl-words"></p>
          <span class="hl-badge" id="hl-badge"></span>
          <span class="hl-sep" aria-hidden="true">·</span><button type="button" class="btn-link hl-why" data-worlds aria-label="Why? What this world means, the five worlds, and how to change course">Why?</button>
          <p class="heading-why" id="heading-why"></p>
        </section>
        <section class="theatre" aria-labelledby="map-h">
          <h2 class="sr-only" id="map-h" tabindex="-1">World map</h2>
          <div class="mapwrap" id="mapwrap" data-coach="map"></div>
          <aside class="feed" id="feed" aria-labelledby="feed-h" data-coach="feed"></aside>
          <div class="decide" id="decide" hidden></div>
        </section>
      </main>
      <section class="dock" aria-label="Your move" hidden></section>
      <p class="keys-hint" aria-hidden="true"><kbd>Space</kbd> pause · <kbd>Enter</kbd> continue · <kbd>N</kbd> news · <kbd>?</kbd> help</p>
    </div>`;
    this.map = new WorldMap($('#mapwrap', this.root));
    $('#mapwrap', this.root).setAttribute('aria-describedby', this.map.summaryId);
    this.map.onItem = (entry) => {
      this.feed.mark(entry.id);
      if (entry.kind === 'leak' && this.s.leak) this.openFromMap(() => showLeak(this.s.leak!, this.e.dateLabel(this.s.round)));
    };
    this.map.onThreat = (id) => {
      this.markFeed((x) => x.threat === id);
      const t = this.prevThreats.find((x) => x.id === id) ?? this.e.threats(this.s).find((x) => x.id === id);
      if (t) this.openFromMap(() => showThreat(t, this.e.hand(this.s)));
    };
    $('#play', this.root).addEventListener('click', () => this.setRunning(!this.running));
    $('#help-btn', this.root).addEventListener('click', () => this.openHelp());
    $('#heading-line', this.root).addEventListener('click', (ev) => {
      const h = this.e.heading(this.s);
      if ((ev.target as HTMLElement).closest('[data-worlds]')) this.openFromMap(() => showWorlds(h.world, h, this.s.europeAi));
      if ((ev.target as HTMLElement).closest('[data-badge]')) this.openFromMap(() => showBadge(this.s.europeAi, this.s.europeAiLocked));
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
    this.map.setUnrest(this.s.cohesion < 40 ? 2 : this.s.cohesion < 52 ? 1 : 0);
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

  /** AI safety as drawn: what is verified (the low end; the truth is never lower) and what the labs claim. */
  private safety(): { low: number; claim: number; audited: boolean } {
    const audited = this.e.gauges(this.s).find((x) => x.key === 'confidence')!.audited;
    const claim = Math.round(this.shown.confidence);
    return { low: audited ? claim : Math.max(0, Math.round(this.shown.confidence - this.shown.margin)), claim, audited };
  }

  /** AI safety's two parts if the selected cards were confirmed (public values only); null without a change or once audited. */
  private safetyAfter(): { low: number; claim: number; tone: number } | null {
    const imp = this.pv?.ok ? this.pv.impacts : [];
    const i = imp.find((x) => x.key === 'confidence');
    const m = imp.find((x) => x.key === 'margin');
    const c = this.safety();
    if ((!i && !m) || c.audited) return null;
    const claim = i ? Number(i.after) : c.claim;
    const low = m ? Number(m.after) : Math.max(0, claim - Math.round(this.shown.margin));
    return { low, claim, tone: Math.sign(low - c.low) || Math.sign(claim - c.claim) };
  }

  /** The value as written on the gauge: AI safety reads as a range, verified–claimed ("40–57"). */
  private valueText(k: GaugeKey): string {
    if (k !== 'confidence') return String(Math.round(this.shown[k]));
    const c = this.safety();
    return c.audited || c.low === c.claim ? String(c.claim) : `${c.low}–${c.claim}`;
  }

  private gaugeText(k: GaugeKey): string {
    return k === 'confidence' && this.safety().audited ? `${this.valueText(k)} audited` : this.valueText(k);
  }

  private lastSig = '';
  private renderGauges(flash = false) {
    if (!this.s) return;
    const views = this.e.gauges(this.s);
    const hd = this.e.heading(this.s);
    const start = this.s.roundStart;
    const sig = KEYS.map((k) => Math.round(this.shown[k])).join() + Math.round(this.shown.margin) + views.map((g) => `${g.target}${g.targetKind}${g.eta}${g.markers.map((m) => m.text).join()}`).join();
    if (sig === this.lastSig && !flash) return;
    this.lastSig = sig;
    const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
    for (const g of views) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${g.key}"]`);
      if (!box) continue;
      const v = Math.round(this.shown[g.key]);
      const safety = g.key === 'confidence' ? this.safety() : null;
      // the change since the round began; for AI safety, of the verified part (the part that counts)
      const base = g.key === 'confidence' ? Math.max(0, start.estimate - start.margin) : start[g.key];
      const delta = this.s.round > 0 ? (safety ? safety.low : v) - Math.round(base) : 0;
      const val = box.querySelector('.g-val')!;
      const vt = this.valueText(g.key);
      if (val.textContent !== vt) val.textContent = vt;
      const dEl = box.querySelector<HTMLElement>('.g-delta')!;
      const good = g.key === 'aiPower' ? 0 : Math.sign(delta);
      dEl.textContent = delta ? signed(delta) : '';
      dEl.className = `g-delta ${good > 0 ? 'good' : good < 0 ? 'bad' : 'flat'}`;
      // AI safety: solid up to what is verified, hatched from there to what the labs claim
      const fill = box.querySelector<HTMLElement>('.g-fill')!;
      const band = box.querySelector<HTMLElement>('.g-band')!;
      if (safety && !safety.audited) {
        const lo = Math.max(0, this.shown.confidence - this.shown.margin);
        fill.style.width = pct(lo);
        band.style.left = pct(lo);
        band.style.width = pct(Math.min(100, this.shown.confidence) - lo);
        band.hidden = false;
      } else {
        fill.style.width = pct(this.shown[g.key]);
        band.hidden = true;
      }
      if (g.key === 'aiPower') {
        const tg = box.querySelector<HTMLElement>('.g-target')!;
        tg.hidden = g.target === null;
        if (g.target !== null) {
          tg.style.left = pct(g.target);
          tg.className = 'g-target tipping';
        }
        box.classList.toggle('near', v >= 70);
      }
      // US–China cooperation: the current zone is highlighted on the bar and named in the caption
      if (g.key === 'cooperation') for (const x of ['r', 'a', 'p']) box.querySelector(`.zone-${x}`)?.classList.toggle('on', x === zoneOf(v).id);
      // threats aimed at this gauge: a small mark by its name (in full in "?", on the map and in the description)
      const alerts = g.markers
        .map((m) => `<span class="g-alert ${m.prepared ? 'yes' : 'no'}" title="${esc(m.text)}">${m.prepared ? ICON.check : ICON.alert}${esc(m.prepared ? 'ready' : (/[−-]\d+/.exec(m.text)?.[0] ?? 'risk'))}</span>`)
        .join('');
      const al = box.querySelector<HTMLElement>('.g-alerts')!;
      if (al.innerHTML !== alerts) al.innerHTML = alerts;
      const words =
        g.key === 'aiPower'
          ? `${v} out of 100. At 80, AI starts improving itself: the tipping point, where the world’s ending is decided.${g.eta ? ` ${g.eta}` : ''}`
          : safety
            ? safety.audited
              ? `${v}, audited: the true value.`
              : `${safety.low} verified; the labs claim ${safety.claim}. Only the verified part counts toward your goal; the truth lies between ${safety.low} and ${safety.claim}.`
            : `${v} out of 100.`;
      const zone = g.key === 'cooperation' ? ` Zone: ${zoneOf(v).name}.` : '';
      const sub = ` ${g.sub}.`;
      const og = g.key === hd.decides.key ? hd.decides : g.key === hd.net.key ? hd.net : null;
      const tgt = og ? ` ${og === hd.decides ? 'Goal' : 'Floor'} for the world you are heading to: ${og.bar}, ${statusOf(og)}.` : '';
      const dir = delta > 0 ? 'up' : 'down';
      const ch = delta ? ` ${safety ? `Verified part ${dir}` : `${dir.charAt(0).toUpperCase()}${dir.slice(1)}`} ${Math.abs(delta)} this round.` : '';
      const desc = `${words}${g.key === 'aiPower' ? '' : sub}${zone}${tgt}${ch}${g.markers.length ? ` ${g.markers.map((m) => m.text).join('. ')}.` : ''}`;
      const d = box.querySelector<HTMLElement>(`#gd-${g.key}`)!;
      if (d.textContent !== desc) d.textContent = desc;
      if (flash && delta) {
        box.classList.remove('flash');
        void box.offsetWidth;
        box.classList.add('flash');
      }
    }
    this.renderTargets();
    this.map?.update({ aiPower: this.shown.aiPower, cooperation: this.shown.cooperation, coalition: this.s.coalition, europeAi: this.s.europeAi });
  }

  /**
   * Each gauge's status chip and caption: on the gauge that decides the world a tick and "goal 75" with "short" or
   * "on track"; on the safety net "floor 55" (AI safety's status uses what is verified). AI capabilities: the
   * tipping point, and a chip when it looks close. Cooperation: its zone. While cards are selected, the chips,
   * ticks and captions show where the selection would take them, dashed.
   */
  private renderTargets() {
    const now = this.e.heading(this.s);
    const pv = this.pv?.ok ? this.pv : null;
    const h = pv ? pv.outlookAfter : now;
    const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
    const both = (long: string, short = long) => (long === short ? long : `<span class="long">${long}</span><span class="short">${short}</span>`);
    const arrow = (a: number | string, b: number | string) => (a === b ? `${a}` : `<b class="pv">${a} → ${b}</b>`);
    for (const k of KEYS) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      const chip = box.querySelector<HTMLElement>('.g-chip')!;
      const cap = box.querySelector<HTMLElement>('.g-cap')!;
      let chipHtml = '';
      let chipCls = 'g-chip';
      const setCap = (html: string) => cap.innerHTML !== html && (cap.innerHTML = html);
      if (k === 'aiPower') {
        // the caption (tipping point at 80) never changes; the chip says when it looks close
        const eta = this.e.gauges(this.s).find((g) => g.key === 'aiPower')?.eta ?? null;
        if (eta) {
          const m = /in (~[\d–]+ rounds?)/.exec(eta);
          chipHtml = both(m ? `tipping in ${m[1]}` : 'tipped', m ? m[1] : 'tipped');
          chipCls += ' eta';
        }
      } else {
        const tg = box.querySelector<HTMLElement>('.g-target')!;
        const role = h.decides.key === k ? 'goal' : h.net.key === k ? 'floor' : null;
        const og = role === 'goal' ? h.decides : role === 'floor' ? h.net : null;
        const was = pv ? (now.decides.key === k ? now.decides : now.net.key === k ? now.net : null) : null;
        let tgt = '';
        let barHtml = '';
        tg.hidden = !og;
        if (og) {
          const st = statusOf(og);
          const stWas = was ? statusOf(was) : null;
          const moved = !!pv && (!was || was.bar !== og.bar || stWas !== st);
          tg.style.left = pct(og.bar);
          tg.className = `g-target ${role}${moved ? ' pv' : ''}`;
          barHtml = was ? arrow(was.bar, og.bar) : `${og.bar}`;
          tgt = `${role} ${barHtml}`;
          chipHtml = stWas && stWas !== st ? both(`${stWas} → ${st}`, st) : st;
          chipCls += ` ${st === 'on track' ? 'yes' : 'no'}${moved ? ' pv' : ''}`;
        }
        if (k === 'confidence') {
          const c = this.safety();
          const a = this.safetyAfter() ?? c;
          const plain = (x: string) => x.replace(/<[^>]+>/g, '');
          if (c.audited) setCap(both(`Audited: the true value${tgt ? ` · ${tgt}` : ''}`, `audited${tgt ? ` · ${tgt}` : ''}`));
          else {
            const long = `Verified ${arrow(c.low, a.low)} · labs claim ${arrow(c.claim, a.claim)}`;
            const short = `${arrow(c.low, a.low)} verified`;
            // the target joins the line when it fits on one line (it is always drawn on the bar)
            setCap(both(plain(long + tgt).length <= 48 && tgt ? `${long} · ${tgt}` : long, plain(short + tgt).length <= 28 && tgt ? `${short} · ${tgt}` : short));
          }
        } else if (k === 'cooperation') {
          const z = zoneOf(Math.round(this.shown.cooperation));
          const i = pv?.impacts.find((x) => x.key === 'cooperation');
          const za = i ? zoneOf(Number(i.after)) : z;
          setCap(za.id !== z.id ? both(`<b class="pv">${z.name} → ${za.name}</b> zone`, `<b class="pv">${z.name} → ${za.name}</b>`) : both(`${z.name} zone · ${z.range}`, `${z.name} zone`));
        } else setCap(og ? both(role === 'goal' ? `Goal ${barHtml}: reach it to end well` : `Floor ${barHtml}: never fall below`, tgt) : '');
      }
      if (chip.innerHTML !== chipHtml) chip.innerHTML = chipHtml;
      chip.className = chipCls;
    }
  }

  /** The decisions' preview: the selected cards' effect on the real gauges, their targets and the heading line (public values). */
  private pv: PreviewView | null = null;
  private setPreview(pv: PreviewView | null) {
    this.pv = pv;
    this.renderGaugePreview();
    this.renderTargets();
    this.renderHeading();
  }

  /** Each gauge the selection moves shows where it would go: "→ 55" by its value (AI safety: "→ 52–60") and ghost marks on its bar. */
  private renderGaugePreview() {
    const imp = this.pv?.ok ? this.pv.impacts : [];
    const tone = (t: number) => (t > 0 ? 'good' : t < 0 ? 'bad' : 'flat');
    for (const k of KEYS) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      const i = imp.find((x) => x.key === k);
      const sa = k === 'confidence' ? this.safetyAfter() : null;
      let text = '';
      let t = 0;
      let at = NaN;
      let atLow = NaN;
      if (sa) {
        const c = this.safety();
        text = `→ ${sa.low === sa.claim ? sa.claim : `${sa.low}–${sa.claim}`}`;
        t = sa.tone;
        if (sa.claim !== c.claim) at = sa.claim;
        if (sa.low !== c.low) atLow = sa.low;
      } else if (i) {
        text = `→ ${i.after}`;
        t = i.tone;
        at = Number.parseFloat(i.after);
      }
      const after = box.querySelector<HTMLElement>('.g-after')!;
      after.innerHTML = text ? `<span class="${tone(t)}">${esc(text)}</span>` : '';
      box.classList.toggle('previewing', !!text);
      const ghost = (el: HTMLElement, x: number) => {
        el.hidden = !Number.isFinite(x);
        if (Number.isFinite(x)) el.style.left = `${Math.max(0, Math.min(100, x))}%`;
        el.classList.toggle('good', t > 0);
        el.classList.toggle('bad', t < 0);
      };
      ghost(box.querySelector<HTMLElement>('.g-ghost:not(.g-ghost-low)')!, at);
      ghost(box.querySelector<HTMLElement>('.g-ghost-low')!, atLow);
    }
  }

  private renderHeading() {
    const now = this.e.heading(this.s);
    // while the player selects cards, the line shows where they would take the world
    const pv = this.pv?.ok ? this.pv : null;
    const h = pv ? pv.outlookAfter : now;
    const line = headingLineHtml(h, pv ? now : undefined);
    const text = $('#hl-text', this.root);
    if (text.dataset.sig !== line.html) {
      const changed = !pv && !!text.dataset.sig && text.dataset.world !== h.world;
      text.dataset.sig = line.html;
      text.dataset.world = h.world;
      text.innerHTML = line.html;
      $('#hl-words', this.root).textContent = line.words;
      if (changed) {
        const sec = $('#heading-line', this.root);
        sec.classList.remove('flash');
        void sec.offsetWidth;
        sec.classList.add('flash');
      }
    }
    $('#heading-why', this.root).textContent = this.headingWhy;
    // Europe's AI picks the world if AI never tips: its badge always ends the line (and previews a selection)
    const badge = $('#hl-badge', this.root);
    const ai = pv?.impacts.some((i) => i.key === 'europeAi') ? (this.s.europeAi === 'open' ? 'dependent' : 'open') : this.s.europeAi;
    const plateau = h.plateau && now.plateau;
    const bsig = `${this.s.europeAi}>${ai}${plateau ? ':plateau' : ''}`;
    if (badge.dataset.v !== bsig) {
      const hadFocus = badge.contains(document.activeElement);
      badge.dataset.v = bsig;
      badge.innerHTML = badgeHtml(ai, this.s.europeAi, plateau);
      if (hadFocus) badge.querySelector<HTMLElement>('[data-badge]')?.focus({ preventScroll: true });
    }
  }
}
